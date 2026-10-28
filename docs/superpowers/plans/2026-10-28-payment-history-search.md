# Payment History Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the existing top-bar search to Payments and filter payment history by payment and linked-booking details.

**Architecture:** Introduce a small pure filtering helper in `lib/payment-search.ts`, cover it with Node tests, then call it from the existing client dashboard with `useMemo`. The existing topbar and table components remain responsible for rendering.

**Tech Stack:** Next.js 16 client component, React 19, TypeScript, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-28-payment-history-search-design.md`

## Global Constraints

- Filter only Payment history.
- Search is case-insensitive and includes linked booking details.
- No Supabase schema or data changes.

## Review Focus

- Blank search returns every payment.
- Team and captain searches use the linked booking.
- Payment reference, method, type, notes, amount, and booking date match.
- Missing linked bookings do not crash filtering.
- Non-matches return an empty list and activate the existing empty state.

---

### Task 1: Payment history search

**Files:**
- Create: `lib/payment-search.ts`
- Create: `tests/payment-search.test.ts`
- Modify: `package.json`
- Modify: `app/dashboard/dashboard-client.tsx`

**Interfaces:**
- Produces: `filterPayments(payments: SearchRow[], bookings: SearchRow[], query: string): SearchRow[]`

- [ ] **Step 1: Write failing tests** for blank, booking-linked, payment-field, numeric/date, missing-booking, and no-match searches.
- [ ] **Step 2: Run `pnpm test`** and verify failure because `lib/payment-search.ts` does not exist.
- [ ] **Step 3: Implement the pure helper** and update the test script to run all `tests/*.test.ts` files.
- [ ] **Step 4: Run `pnpm test`** and verify all tests pass.
- [ ] **Step 5: Enable the Payments top search and pass filtered rows to `PaymentTable`.**
- [ ] **Step 6: Run tests, typecheck, production build, and `git diff --check`.**
- [ ] **Step 7: Commit, push, open and merge a PR, then verify the READY production deployment and live `/login`.**

