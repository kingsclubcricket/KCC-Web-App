-- The advance is part of the total amount collected, not a separate receipt.
-- Normalize current operational bookings and derive their balance/payment state.
update public.bookings
set
  collected_amount = greatest(collected_amount, advance_amount),
  balance_amount = greatest(total_amount - greatest(collected_amount, advance_amount), 0),
  discount_amount = 0,
  payment_status = case
    when greatest(collected_amount, advance_amount) >= total_amount then 'Settled'
    else 'Open'
  end
where booking_date >= date '2026-10-01';
