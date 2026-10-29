# Oldest Payment Bookings Design

## Intent

Make manual payment entry easier by showing the oldest outstanding booking first, followed by newer outstanding bookings in chronological order.

## Scope

- Change only the booking queue inside “Manual payment entry.”
- Keep only active bookings with a remaining balance.
- Sort by `booking_date` ascending before the five-row display limit.
- Keep payment history ordering unchanged.

## Approach

Use a tested client-side selector for eligibility and chronological sorting. Sorting in the component without a helper was rejected because the ordering and slice boundary would be easier to regress.

