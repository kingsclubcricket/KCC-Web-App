# Slot Calendar Quick View and All-Day Booking Design

## Intent

Make the slot calendar the fastest place to understand and manage a booking. An administrator should be able to inspect a booked slot without searching the Bookings page, and should be able to reserve the whole ground for a full day.

## Goals

- Clicking a booked calendar slot opens a compact booking summary first.
- The summary shows the booking identity, contact details, financial status, booking status, and notes, with an explicit **Edit booking** action.
- Available timed slots continue to open the new-booking form with the date and time prefilled.
- The booking form supports **All day** alongside 07:00, 10:30, and 14:00.
- An active all-day booking occupies the whole date; active timed bookings prevent an all-day booking on the same date.
- Cancelled bookings do not reserve calendar capacity.
- The behavior remains usable on phone-sized screens and by keyboard.

## Non-goals

- Changing prices automatically for all-day bookings.
- Adding new public/customer booking flows.
- Changing the three existing timed slots or historical booking data.
- Adding hover-only controls; hover may reinforce affordance, but click/tap is the complete interaction.

## Constraints

- Existing `bookings.slot` remains a PostgreSQL `time` value for compatibility with receipts, payment requests, and imported records.
- Add `bookings.is_all_day boolean not null default false` as the explicit all-day marker.
- Replace the existing date-and-slot uniqueness rule with a database overlap constraint covering active bookings only.
- Existing rows remain timed bookings (`is_all_day = false`).
- The current authenticated-only admin access and RLS model remain unchanged.

## Approaches considered

1. **Dedicated summary-first interaction plus a real all-day field and database overlap constraint — selected.** This is clear in the UI, preserves current time data, and makes overlapping bookings impossible at the database boundary.
2. Reuse the edit form as the first view and encode all day as `00:00`. This requires fewer UI elements but makes inspection feel risky and leaks a fake time into emails, receipts, filters, and reports.
3. Navigate from the calendar to a filtered Bookings page. This avoids another modal but keeps the administrator in a multi-step lookup flow, which is the problem being removed.

## Interaction design

- Each day card presents an **All day** availability row followed by the three timed rows.
- If the date has an active all-day booking, the all-day row and all timed rows show that booking as booked and open the same summary.
- If the date has one or more active timed bookings, the all-day row shows that the day is partially booked and cannot start an all-day booking; each timed row independently shows its booking, block, or availability.
- A booked row is a button, not a disabled control. Its label includes the team and booked state; selecting it opens the summary.
- A blocked row remains unavailable and displays the block reason.
- The summary has **Close** and **Edit booking** actions. Edit opens the existing booking form for that record.
- Slot labels throughout the dashboard, filters, emails, payment pages, and receipts display **All day** when `is_all_day` is true.

## Data integrity

- Enable `btree_gist` if needed and replace `UNIQUE (booking_date, slot)` with a GiST exclusion constraint for non-cancelled rows.
- The constraint compares the booking date for equality and a three-position occupancy range for overlap: all-day occupies all positions, while each timed slot occupies only its own position.
- Creation and update actions translate exclusion violations into a clear administrator-facing message.
- Database verification must prove: all-day blocks every timed slot, timed bookings block all-day, distinct timed slots can coexist, cancelled rows do not block replacements, and editing a row does not conflict with itself.

## Verification

- Test the pure slot/label/calendar-state rules first and observe the tests fail before implementation.
- Verify the migration against the connected Supabase project with controlled transaction tests and re-run security/performance advisors.
- Run the complete test suite, TypeScript check, production build, and browser checks at desktop and phone widths.
- Test the live calendar after deployment: summary-first access, edit handoff, timed booking creation, and all-day display.
