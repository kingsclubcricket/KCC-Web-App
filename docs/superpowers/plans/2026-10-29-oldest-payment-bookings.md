# Oldest Payment Bookings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the oldest outstanding bookings first in Manual payment entry.

**Architecture:** Add a pure selector to the payment utility module, verify ordering and eligibility with Node tests, and pass its result to `ManualPaymentPanel`. The panel keeps its five-row display limit after the sorted data arrives.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-29-oldest-payment-bookings-design.md`

## Global Constraints

- Only the Manual payment entry queue changes.
- Sort `booking_date` oldest to newest before limiting to five rows.
- Cancelled and fully paid bookings remain excluded.

## Review Focus

- Unsorted input becomes chronological ascending output.
- Cancelled bookings are excluded.
- Zero-balance bookings are excluded.
- The source array is not mutated.
- Equal dates preserve their original order.

---

### Task 1: Oldest-first manual payment queue

**Files:**
- Modify: `lib/payment-search.ts`
- Modify: `tests/payment-search.test.ts`
- Modify: `app/dashboard/dashboard-client.tsx`

**Interfaces:**
- Produces: `getOutstandingBookingsOldestFirst(bookings: SearchRow[]): SearchRow[]`

- [ ] **Step 1:** Add failing tests for ascending order, eligibility, non-mutation, and equal-date stability.
- [ ] **Step 2:** Run `pnpm test` and confirm failure because the selector is missing.
- [ ] **Step 3:** Implement the selector and wire it into Manual payment entry.
- [ ] **Step 4:** Run tests, typecheck, production build, and `git diff --check`.
- [ ] **Step 5:** Commit, push, merge, and verify the READY production deployment.

