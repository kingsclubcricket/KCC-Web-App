(() => {
const test = require("node:test");
const assert = require("node:assert/strict");


const {
  ALL_DAY_SLOT,
  TIMED_BOOKING_SLOTS,
  blockedDateConflicts,
  formatBookingSlot,
  getCalendarSlotState,
  isBookingConflictCode,
  parseBookingSlot,
} = require("../lib/booking-slots.ts");

test("normalizes an all-day booking to the compatible backing time", () => {
  assert.deepEqual(parseBookingSlot(ALL_DAY_SLOT), {
    slot: "07:00",
    is_all_day: true,
  });
});

test("preserves each supported timed booking slot", () => {
  for (const slot of ["07:00", "10:30", "14:00"]) {
    assert.deepEqual(parseBookingSlot(slot), {
      slot,
      is_all_day: false,
    });
  }
  assert.deepEqual(TIMED_BOOKING_SLOTS, ["07:00", "10:30", "14:00"]);
});

test("rejects an unsupported booking slot", () => {
  assert.throws(() => parseBookingSlot("18:00"), /Unsupported booking slot/);
});

test("formats all-day bookings without leaking the backing time", () => {
  assert.equal(
    formatBookingSlot({ slot: "07:00:00", is_all_day: true }),
    "All day",
  );
  assert.equal(
    formatBookingSlot({ slot: "10:30:00", is_all_day: false }),
    "10:30",
  );
});

const booking = {
  id: "booking-1",
  booking_date: "2026-11-07",
  slot: "10:30:00",
  is_all_day: false,
  status: "Confirmed",
  team_name: "KCC XI",
};

test("returns the exact timed booking for a booked calendar slot", () => {
  const state = getCalendarSlotState({
    day: "2026-11-07",
    slot: "10:30",
    bookings: [booking],
    blocked: [],
  });

  assert.equal(state.kind, "booked");
  assert.equal(state.booking.id, "booking-1");
});

test("uses one all-day booking for the all-day row and every timed row", () => {
  const allDayBooking = {
    ...booking,
    id: "all-day-1",
    slot: "07:00:00",
    is_all_day: true,
  };

  for (const slot of [ALL_DAY_SLOT, ...TIMED_BOOKING_SLOTS]) {
    const state = getCalendarSlotState({
      day: "2026-11-07",
      slot,
      bookings: [allDayBooking],
      blocked: [],
    });
    assert.equal(state.kind, "booked");
    assert.equal(state.booking.id, "all-day-1");
  }
});

test("ignores cancelled bookings when deriving availability", () => {
  const state = getCalendarSlotState({
    day: "2026-11-07",
    slot: "10:30",
    bookings: [{ ...booking, status: "Cancelled" }],
    blocked: [],
  });

  assert.deepEqual(state, { kind: "open" });
});

test("returns blocked for exact and all-day closures", () => {
  const exact = getCalendarSlotState({
    day: "2026-11-07",
    slot: "10:30",
    bookings: [],
    blocked: [{ blocked_date: "2026-11-07", slot: "10:30", reason: "Pitch work" }],
  });
  const allDay = getCalendarSlotState({
    day: "2026-11-07",
    slot: "14:00",
    bookings: [],
    blocked: [{ blocked_date: "2026-11-07", slot: "All day", reason: "Tournament" }],
  });

  assert.deepEqual(exact, { kind: "blocked", reason: "Pitch work" });
  assert.deepEqual(allDay, { kind: "blocked", reason: "Tournament" });
});

test("marks the all-day row partial when any timed capacity is occupied", () => {
  const booked = getCalendarSlotState({
    day: "2026-11-07",
    slot: ALL_DAY_SLOT,
    bookings: [booking],
    blocked: [],
  });
  const blocked = getCalendarSlotState({
    day: "2026-11-07",
    slot: ALL_DAY_SLOT,
    bookings: [],
    blocked: [{ blocked_date: "2026-11-07", slot: "14:00", reason: "Cleaning" }],
  });

  assert.equal(booked.kind, "partial");
  assert.equal(blocked.kind, "partial");
});

test("returns open for unoccupied timed and all-day rows", () => {
  for (const slot of [ALL_DAY_SLOT, "07:00"]) {
    assert.deepEqual(
      getCalendarSlotState({ day: "2026-11-08", slot, bookings: [booking], blocked: [] }),
      { kind: "open" },
    );
  }
});

test("detects blocked-date conflicts for timed and all-day booking inputs", () => {
  const timedBlock = { blocked_date: "2026-11-07", slot: "10:30", reason: "Pitch work" };
  const allDayBlock = { blocked_date: "2026-11-07", slot: ALL_DAY_SLOT, reason: "Tournament" };

  assert.equal(
    blockedDateConflicts(
      { booking_date: "2026-11-07", slot: "07:00", is_all_day: true },
      [timedBlock],
    ),
    true,
  );
  assert.equal(
    blockedDateConflicts(
      { booking_date: "2026-11-07", slot: "10:30", is_all_day: false },
      [allDayBlock, timedBlock],
    ),
    true,
  );
  assert.equal(
    blockedDateConflicts(
      { booking_date: "2026-11-07", slot: "07:00", is_all_day: false },
      [timedBlock],
    ),
    false,
  );
  assert.equal(
    blockedDateConflicts(
      { booking_date: "2026-11-07", slot: "10:30", is_all_day: false, status: "Cancelled" },
      [allDayBlock],
    ),
    false,
  );
});

test("recognizes unique and exclusion violations as booking conflicts", () => {
  assert.equal(isBookingConflictCode("23P01"), true);
  assert.equal(isBookingConflictCode("23505"), true);
  assert.equal(isBookingConflictCode("42501"), false);
});
})();
