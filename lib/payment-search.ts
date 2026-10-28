export type SearchRow = Record<string, unknown>;

const PAYMENT_FIELDS = [
  "reference",
  "method",
  "payment_type",
  "notes",
  "amount",
] as const;

const BOOKING_FIELDS = [
  "team_name",
  "captain_name",
  "booking_date",
] as const;

export function filterPayments(
  payments: SearchRow[],
  bookings: SearchRow[],
  query: string,
): SearchRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return payments;

  const bookingsById = new Map(
    bookings.map((booking) => [String(booking.id), booking]),
  );

  return payments.filter((payment) => {
    const booking = bookingsById.get(String(payment.booking_id));
    const values = PAYMENT_FIELDS.map((field) => payment[field]);
    if (booking) {
      values.push(...BOOKING_FIELDS.map((field) => booking[field]));
    }
    return values.some((value) => String(value ?? "").toLowerCase().includes(needle));
  });
}
