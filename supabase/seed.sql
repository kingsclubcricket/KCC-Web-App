insert into public.maintenance_tasks (title, description, category, priority, status, due_date) values
('Inspect floodlights', 'Check all lights before evening bookings.', 'Electrical', 'Urgent', 'To do', current_date + 1),
('Prepare main pitch', 'Roll, mark, and water the main wicket.', 'Ground care', 'Routine', 'In progress', current_date),
('Check boundary rope', 'Replace worn clips and confirm distance markers.', 'Equipment', 'Routine', 'Completed', current_date - 1)
on conflict do nothing;

insert into public.expenses (expense_date, item, category, amount, status) values
(current_date - 2, 'Ground staff wages', 'Ground care', 13000, 'Paid'),
(current_date - 1, 'Water delivery', 'Utilities', 1200, 'Paid'),
(current_date, 'Pitch preparation', 'Ground care', 2050, 'Paid')
on conflict do nothing;
