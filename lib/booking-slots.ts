export const ALL_DAY_SLOT = "All day" as const;
export const TIMED_BOOKING_SLOTS = ["07:00", "10:30", "14:00"] as const;

export type TimedBookingSlot = (typeof TIMED_BOOKING_SLOTS)[number];
export type BookingSlotInput = TimedBookingSlot | typeof ALL_DAY_SLOT;

type SlotRecord = {
  slot?: string | null;
  is_all_day?: boolean | null;
};

export type CalendarBooking = SlotRecord & {
  id: string;
  booking_date: string;
  status?: string | null;
  team_name?: string | null;
  [key: string]: unknown;
};

export type CalendarBlock = {
  blocked_date: string;
  slot: string;
  reason: string;
  [key: string]: unknown;
};

export type CalendarSlotState =
  | { kind: "open" }
  | { kind: "booked"; booking: CalendarBooking }
  | { kind: "blocked"; reason: string }
  | { kind: "partial"; reason: string };

export function parseBookingSlot(value: string): {
  slot: TimedBookingSlot;
  is_all_day: boolean;
} {
  if (value === ALL_DAY_SLOT) {
    return { slot: "07:00", is_all_day: true };
  }

  if (TIMED_BOOKING_SLOTS.includes(value as TimedBookingSlot)) {
    return { slot: value as TimedBookingSlot, is_all_day: false };
  }

  throw new Error("Unsupported booking slot.");
}

export function formatBookingSlot(record: SlotRecord): string {
  if (record.is_all_day) return ALL_DAY_SLOT;
  return record.slot ? String(record.slot).slice(0, 5) : "—";
}

export function getCalendarSlotState({
  day,
  slot,
  bookings,
  blocked,
}: {
  day: string;
  slot: BookingSlotInput;
  bookings: CalendarBooking[];
  blocked: CalendarBlock[];
}): CalendarSlotState {
  const dayBookings = bookings.filter(
    (booking) => booking.booking_date === day && booking.status !== "Cancelled",
  );
  const dayBlocks = blocked.filter((block) => block.blocked_date === day);
  const allDayBooking = dayBookings.find((booking) => booking.is_all_day);

  if (allDayBooking) return { kind: "booked", booking: allDayBooking };

  if (slot === ALL_DAY_SLOT) {
    const allDayBlock = dayBlocks.find((block) => block.slot === ALL_DAY_SLOT);
    if (allDayBlock) return { kind: "blocked", reason: allDayBlock.reason };
    if (dayBookings.length || dayBlocks.length) {
      return { kind: "partial", reason: "Timed slots already occupied" };
    }
    return { kind: "open" };
  }

  const booking = dayBookings.find(
    (candidate) => formatBookingSlot(candidate) === slot,
  );
  if (booking) return { kind: "booked", booking };

  const closure = dayBlocks.find(
    (block) => block.slot === ALL_DAY_SLOT || String(block.slot).slice(0, 5) === slot,
  );
  if (closure) return { kind: "blocked", reason: closure.reason };

  return { kind: "open" };
}

export function blockedDateConflicts(
  booking: { booking_date: string; slot: string; is_all_day: boolean },
  blocked: CalendarBlock[],
): boolean {
  return blocked.some((block) => {
    if (block.blocked_date !== booking.booking_date) return false;
    if (booking.is_all_day || block.slot === ALL_DAY_SLOT) return true;
    return String(block.slot).slice(0, 5) === String(booking.slot).slice(0, 5);
  });
}
