(() => {
const test = require("node:test");
const assert = require("node:assert/strict");


const { filterPayments, getOutstandingBookingsOldestFirst } = require("../lib/payment-search.ts");

const bookings = [
  { id: "booking-1", team_name: "Royal Strikers", captain_name: "Arjun Rao", booking_date: "2026-10-22" },
  { id: "booking-2", team_name: "Kings Eleven", captain_name: "Maya Patel", booking_date: "2026-10-25" },
];

const payments = [
  { id: "payment-1", booking_id: "booking-1", payment_type: "Advance", method: "UPI", reference: "UTR-ABC-123", notes: "Evening match deposit", amount: 2000 },
  { id: "payment-2", booking_id: "booking-2", payment_type: "Balance", method: "Cash", reference: "", notes: "Paid at ground", amount: 3500 },
  { id: "payment-3", booking_id: "missing-booking", payment_type: "Adjustment", method: "Bank transfer", reference: "BANK-77", notes: "Standalone correction", amount: 500 },
];

test("blank payment search returns every payment", () => {
  assert.deepEqual(filterPayments(payments, bookings, "   "), payments);
});

test("payment search matches linked booking team and captain case-insensitively", () => {
  assert.deepEqual(filterPayments(payments, bookings, "royal"), [payments[0]]);
  assert.deepEqual(filterPayments(payments, bookings, "MAYA PATEL"), [payments[1]]);
});

test("payment search matches reference, method, type, and notes", () => {
  assert.deepEqual(filterPayments(payments, bookings, "abc-123"), [payments[0]]);
  assert.deepEqual(filterPayments(payments, bookings, "cash"), [payments[1]]);
  assert.deepEqual(filterPayments(payments, bookings, "adjustment"), [payments[2]]);
  assert.deepEqual(filterPayments(payments, bookings, "standalone correction"), [payments[2]]);
});

test("payment search matches amount and linked booking date", () => {
  assert.deepEqual(filterPayments(payments, bookings, "3500"), [payments[1]]);
  assert.deepEqual(filterPayments(payments, bookings, "2026-10-22"), [payments[0]]);
});

test("payment search tolerates a missing linked booking", () => {
  assert.deepEqual(filterPayments(payments, bookings, "bank-77"), [payments[2]]);
});

test("payment search returns no rows when nothing matches", () => {
  assert.deepEqual(filterPayments(payments, bookings, "not-a-payment"), []);
});

test("manual payment bookings are ordered oldest first", () => {
  const input = [
    { id: "newest", booking_date: "2026-11-22", status: "Confirmed", balance_amount: 5000 },
    { id: "oldest", booking_date: "2026-11-02", status: "Confirmed", balance_amount: 2500 },
    { id: "middle", booking_date: "2026-11-15", status: "Confirmed", balance_amount: 5500 },
  ];

  assert.deepEqual(
    getOutstandingBookingsOldestFirst(input).map((booking: { id: string }) => booking.id),
    ["oldest", "middle", "newest"],
  );
});

test("manual payment bookings exclude cancelled and fully paid bookings", () => {
  const input = [
    { id: "open", booking_date: "2026-11-02", status: "Confirmed", balance_amount: 2500 },
    { id: "cancelled", booking_date: "2026-11-01", status: "Cancelled", balance_amount: 3000 },
    { id: "paid", booking_date: "2026-10-31", status: "Confirmed", balance_amount: 0 },
  ];

  assert.deepEqual(getOutstandingBookingsOldestFirst(input), [input[0]]);
});

test("manual payment booking sorting is stable and does not mutate its input", () => {
  const input = [
    { id: "second", booking_date: "2026-11-02", status: "Confirmed", balance_amount: 1000 },
    { id: "first", booking_date: "2026-11-01", status: "Confirmed", balance_amount: 1000 },
    { id: "third", booking_date: "2026-11-02", status: "Confirmed", balance_amount: 1000 },
  ];
  const originalOrder = input.map((booking) => booking.id);

  const result = getOutstandingBookingsOldestFirst(input);

  assert.deepEqual(result.map((booking: { id: string }) => booking.id), ["first", "second", "third"]);
  assert.deepEqual(input.map((booking) => booking.id), originalOrder);
});
})();
