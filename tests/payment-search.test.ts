(() => {
const test = require("node:test");
const assert = require("node:assert/strict");


const { filterPayments } = require("../lib/payment-search.ts");

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
})();
