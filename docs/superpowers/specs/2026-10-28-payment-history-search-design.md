# Payment History Search Design

## Intent

Give KCC administrators the same top-bar search experience on the Payments page that already exists on Bookings, Clients, and Expenses, so a payment can be found quickly without scanning the full history.

## Scope

- Show the existing top search bar while the Payments view is active.
- Filter only Payment history; keep open requests, email activity, metrics, and manual-payment suggestions unchanged.
- Match case-insensitively across the linked booking's team, captain, and booking date plus payment reference, method, type, notes, and amount.
- Show the existing empty state when no payment matches.

## Approaches

1. Reuse the top search bar and derive filtered payments in the dashboard client. Selected because it matches the existing admin navigation pattern and avoids duplicate controls.
2. Add a second search field inside Payment history. Rejected because it duplicates the established top-bar interaction.

## Constraints

- Keep filtering client-side; payment data is already loaded into the authenticated dashboard.
- Do not change Supabase, payment records, or other financial views.
- Preserve mobile layout and existing search styling.

