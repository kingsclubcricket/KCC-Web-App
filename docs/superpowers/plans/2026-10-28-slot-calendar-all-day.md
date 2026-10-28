# Slot Calendar Quick View and All-Day Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let KCC administrators inspect a booked slot directly from the calendar and create conflict-safe all-day ground bookings.

**Architecture:** Add a small shared slot-domain module that normalizes form input, formats labels, and derives calendar cell state. Persist all-day intent in `bookings.is_all_day`; enforce active booking overlap with a PostgreSQL GiST exclusion constraint, while the server action also rejects conflicts with `blocked_dates`. Keep the existing booking edit modal, add a separate read-only summary modal, and route its Edit action into the existing form.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node.js 24 test runner, Supabase/PostgreSQL 17, CSS.

**Spec:** `docs/superpowers/specs/2026-10-28-slot-calendar-all-day-design.md`

## Global Constraints

- Preserve the existing three timed slots: `07:00`, `10:30`, and `14:00`.
- Existing booking rows remain timed bookings through `is_all_day boolean not null default false`.
- Active all-day and timed bookings must never overlap on the same date; cancelled bookings release capacity.
- Hover may improve affordance, but click/tap and keyboard must provide the complete flow.
- Keep `bookings.slot` as PostgreSQL `time` for compatibility with imported records and public payment/receipt RPCs.
- Do not introduce automatic all-day pricing.
- Keep the current authenticated KCC administrator and RLS model unchanged.

## Review Focus

- A cancelled all-day or timed booking must not block a replacement; pin this in the slot-state tests and database verification in Tasks 1 and 2.
- Editing a booking without changing its date/slot must not conflict with itself; pin this in the database verification in Task 2.
- A timed blocked date must prevent an all-day booking even though `blocked_dates` is a separate table; pin this in helper tests and the server validation in Tasks 1 and 3.
- An existing all-day booking must make all three timed calendar rows open the same summary; pin this in slot-state tests and browser verification in Tasks 1, 4, and 5.
- Public payment and receipt pages must never display the backing `07:00` value for an all-day booking; pin this through formatter tests and route/browser verification in Tasks 1, 3, and 5.

---

### Task 1: Slot domain rules and test harness

**Files:**
- Create: `lib/booking-slots.ts`
- Create: `tests/booking-slots.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `TIMED_BOOKING_SLOTS`, `ALL_DAY_SLOT`, `BookingSlotInput`, `parseBookingSlot(value: string)`, `formatBookingSlot(record)`, `getCalendarSlotState(input)`, `blockedDateConflicts(input)`, and `isBookingConflictCode(code: string)`.
- `getCalendarSlotState` returns a discriminated union with `kind: "open" | "booked" | "blocked" | "partial"`; booked state carries the booking record used by the summary.
- Later tasks consume these helpers in both client and server modules, so this file must contain no browser-only or server-only imports.

- [ ] **Step 1: Add the Node test command**

Add `"test": "node --test"` to `package.json` so Node 24 discovers `tests/*.test.ts` without adding a dependency.

- [ ] **Step 2: Write failing normalization and formatting tests**

Test that `parseBookingSlot("All day")` returns `{ slot: "07:00", is_all_day: true }`, each timed value returns itself with `is_all_day: false`, unsupported input throws, and `formatBookingSlot({ slot: "07:00:00", is_all_day: true })` returns the literal `All day`.

- [ ] **Step 3: Run the tests and verify RED**

Run: `pnpm test`

Expected: FAIL because `lib/booking-slots.ts` and its exports do not exist.

- [ ] **Step 4: Implement the minimal normalization and formatting helpers**

Create the constants/types and implement `parseBookingSlot` plus `formatBookingSlot` with the approved backing time of `07:00` for all-day rows.

- [ ] **Step 5: Run the tests and verify GREEN**

Run: `pnpm test`

Expected: PASS for normalization and formatting.

- [ ] **Step 6: Write failing calendar-state and blocked-date conflict tests**

Use literal fixtures to cover: exact timed booking, all-day booking occupying every timed row, cancelled rows ignored, exact/all-day blocks, a partially occupied all-day row, open timed/all-day rows, timed block versus all-day booking input, and unrelated timed blocks.

- [ ] **Step 7: Run the tests and verify RED**

Run: `pnpm test`

Expected: FAIL because `getCalendarSlotState` and `blockedDateConflicts` are not implemented.

- [ ] **Step 8: Implement the minimal state and conflict helpers**

Implement the two pure functions using date equality, active status (`status !== "Cancelled"`), `is_all_day`, exact timed-slot matching, and `blocked_dates.slot === "All day"` semantics.

- [ ] **Step 9: Run the complete test suite and commit**

Run: `pnpm test`

Expected: all tests PASS with no warnings.

Commit: `git commit -m "Add all-day booking slot rules"`

---

### Task 2: Conflict-safe Supabase schema

**Files:**
- Create via `supabase migration new all_day_bookings`: `supabase/migrations/<CLI-generated timestamp>_all_day_bookings.sql`

**Interfaces:**
- Produces: `public.bookings.is_all_day boolean not null default false` and `bookings_active_slot_no_overlap`.
- The exclusion constraint maps all-day to occupancy range `[0,3)` and timed slots to `[0,1)`, `[1,2)`, or `[2,3)` on the same `booking_date`, with predicate `status <> 'Cancelled'`.
- Recreates `get_kcc_payment_request(uuid)` and `get_kcc_invoice(uuid)` with `is_all_day boolean` in their returned rows, preserving their explicit grants and existing token filters.

- [ ] **Step 1: Generate the migration file through the Supabase CLI**

Run: `supabase migration new all_day_bookings` using the available project CLI; do not hand-invent the timestamp.

Expected: one new migration path ending in `_all_day_bookings.sql`.

- [ ] **Step 2: Write the migration**

The migration must: enable `btree_gist` without a pinned extension version; add `is_all_day`; drop `bookings_booking_date_slot_key`; add a check limiting `slot` to the three supported times; add the active-row GiST exclusion constraint; and transactionally drop/recreate both public token RPCs with the new boolean return field and the same `revoke`/`grant` boundary.

- [ ] **Step 3: Apply the migration to the connected KCC Supabase project**

Apply it once to project `ngejvrtozxenlitqsily` through the Supabase migration tool.

Expected: migration succeeds and appears once in migration history.

- [ ] **Step 4: Verify schema and overlap behavior with read-only/rolled-back SQL**

Run controlled SQL inside a transaction that rolls back fixtures. Assert: distinct timed slots coexist; duplicate timed slots fail; timed then all-day fails; all-day then timed fails; cancelled rows do not block; and an update of the same row to its current values succeeds.

Expected: every expected conflict is `exclusion_violation`; no fixture remains after rollback.

- [ ] **Step 5: Re-run Supabase advisors**

Run security and performance advisors. Confirm the migration introduces no new warnings; separately note the pre-existing anonymous receipt/payment RPC and leaked-password warnings without expanding this feature's scope.

- [ ] **Step 6: Commit**

Commit: `git commit -m "Add conflict-safe all-day bookings"`

---

### Task 3: Persist and communicate all-day bookings

**Files:**
- Modify: `app/dashboard/actions.ts`
- Modify: `lib/invoice-pdf.ts`
- Modify: `app/api/invoices/[token]/route.ts`

**Interfaces:**
- Consumes: `parseBookingSlot`, `formatBookingSlot`, and `blockedDateConflicts` from Task 1; `bookings.is_all_day` and updated RPC rows from Task 2.
- Produces: booking create/update payloads with both `slot` and `is_all_day`; administrator-facing conflict errors for PostgreSQL codes `23P01` and `23505`.

- [ ] **Step 1: Write a failing database-conflict mapping test**

Extend `tests/booking-slots.test.ts` to assert that `isBookingConflictCode("23P01")` and `isBookingConflictCode("23505")` are true while an unrelated Postgres code is false. This catches loss of the exclusion-constraint error path in administrator-facing validation.

- [ ] **Step 2: Run the tests and verify RED**

Run: `pnpm test`

Expected: FAIL because `isBookingConflictCode` does not exist.

- [ ] **Step 3: Implement the minimal conflict-code helper**

Add `isBookingConflictCode(code: string): boolean` to `lib/booking-slots.ts`, then rerun `pnpm test` and verify PASS.

- [ ] **Step 4: Update booking persistence and block validation**

Change `bookingPayload` to normalize the form value through `parseBookingSlot`. Before insert/update, query same-date `blocked_dates`, reject `blockedDateConflicts`, and use `isBookingConflictCode` to translate database conflicts into `That date or slot is already booked.`

- [ ] **Step 5: Update booking email and receipt formatting**

Use `formatBookingSlot` in booking confirmation subjects/bodies and invoice PDF details. Add `is_all_day` to `InvoiceDetails` and to the invoice API's demo fixture.

- [ ] **Step 6: Verify tests and type checking**

Run: `pnpm test` and `pnpm run typecheck`

Expected: both PASS.

- [ ] **Step 7: Commit**

Commit: `git commit -m "Persist all-day booking details"`

---

### Task 4: Calendar summary and all-day controls

**Files:**
- Modify: `app/dashboard/dashboard-client.tsx`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `TIMED_BOOKING_SLOTS`, `ALL_DAY_SLOT`, `formatBookingSlot`, and `getCalendarSlotState` from Task 1.
- Produces: summary-first booked-slot flow; all-day option in booking form/filter/calendar; `BookingSummaryModal` that hands the selected record to the existing edit modal.

- [ ] **Step 1: Replace local slot constants and raw time labels with the shared domain helpers**

Use timed constants for existing timed-only loops, include `All day` in the booking form and booking filter, and display `formatBookingSlot` in schedules and booking tables.

- [ ] **Step 2: Refactor `AvailabilityCalendar` around `getCalendarSlotState`**

Render the all-day row first. Open rows call `onBook(date, slot)`; booked rows remain enabled and call `onView(booking)`; blocked/partial rows remain unavailable and explain why. An all-day booking must make all four rows reference the same booking.

- [ ] **Step 3: Add `BookingSummaryModal` and state transitions**

Show date/slot, team/captain, phone/email, total/collected/balance, booking/payment status, and notes. Close returns to the calendar; Edit closes the summary and opens the existing booking record form.

- [ ] **Step 4: Add focused responsive styles**

Style booked slots as clearly clickable with hover/focus-visible affordances, keep blocked/partial rows non-interactive, and make the summary use the existing bottom-sheet behavior on phone widths.

- [ ] **Step 5: Run tests and static verification**

Run: `pnpm test`, `pnpm run typecheck`, and `pnpm run build`.

Expected: all PASS with no TypeScript or Next.js build errors.

- [ ] **Step 6: Commit**

Commit: `git commit -m "Add calendar booking quick view"`

---

### Task 5: Public-page consistency and end-to-end verification

**Files:**
- Modify: `app/pay/[token]/page.tsx`
- Modify if generated by build: `next-env.d.ts`

**Interfaces:**
- Consumes: `formatBookingSlot` and the `is_all_day` field returned by both updated public RPCs.
- Produces: no public or admin surface displays the backing `07:00` for an all-day booking.

- [ ] **Step 1: Update the payment page and demo fixture**

Add `is_all_day` to the demo row and render its Slot value through `formatBookingSlot`.

- [ ] **Step 2: Run the full automated verification**

Run: `pnpm test`, `pnpm run typecheck`, `pnpm run build`, and `git diff --check`.

Expected: every command exits 0; generated `next-env.d.ts` changes are included if Next.js updates them.

- [ ] **Step 3: Verify in a local browser**

At desktop and 390px widths, confirm: no overflow/error overlay; open timed/all-day rows open prefilled booking forms; booked rows open summaries; Edit opens the correct record; all-day occupancy visually covers every timed row; keyboard activation works.

- [ ] **Step 4: Push a feature branch and open a PR**

Push the completed branch, attach the PR, and wait for GitHub/Vercel checks.

- [ ] **Step 5: Merge and verify production**

After checks pass, merge the PR, wait for the production deployment to become READY, fetch `https://kcc-ground-admin.vercel.app/login` for HTTP 200, check production error/fatal logs, and verify the authenticated live calendar flow without modifying real booking data.

- [ ] **Step 6: Final commit if verification produced only generated-file changes**

Commit any legitimate Next-generated file update before opening or updating the PR; do not commit local runtime artifacts.
