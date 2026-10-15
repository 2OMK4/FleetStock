
INSERT INTO public.items
(barcode, name, unit, quantity_on_hand, low_stock_threshold)
VALUES
('ELEC-001', 'Electrical Cable', 'meter', 150, 20),
('ELEC-002', 'Power Socket', 'piece', 80, 10),
('ELEC-003', 'LED Light Bulb', 'piece', 120, 15),
('ELEC-004', 'Circuit Breaker', 'piece', 35, 10),
('ELEC-005', 'Electrical Fuse', 'piece', 4, 10),
('SAFE-001', 'Safety Gloves', 'pair', 3, 5)
ON CONFLICT DO NOTHING;


INSERT INTO public.vehicles
(registration, name, type)
VALUES
('OM-1001', 'Service Van 1', 'Van'),
('OM-1002', 'Service Van 2', 'Van'),
('OM-1003', 'Maintenance Truck', 'Truck')
ON CONFLICT DO NOTHING;
