-- Initial admin user
INSERT INTO users (id, username, email, password, role, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@sharebite.com', '$2a$10$exampleEncodedPassword', 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP);

-- Sample donor user
INSERT INTO users (id, username, email, password, role, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'donor1', 'donor1@example.com', '$2a$10$exampleEncodedPassword', 'DONOR', 'ACTIVE', CURRENT_TIMESTAMP);

-- Sample recipient user
INSERT INTO users (id, username, email, password, role, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'recipient1', 'recipient1@example.com', '$2a$10$exampleEncodedPassword', 'RECIPIENT', 'ACTIVE', CURRENT_TIMESTAMP);

-- Sample food listing
INSERT INTO food_listings (id, title, description, quantity, expiry_date, location, status, created_at, donor_id) VALUES
('550e8400-e29b-41d4-a716-446655440003', 'Fresh Bread', 'Loaf of bread', '1 loaf', CURRENT_DATE + INTERVAL '7 days', 'Downtown', 'AVAILABLE', CURRENT_TIMESTAMP, '550e8400-e29b-41d4-a716-446655440001');

-- Sample listing request
INSERT INTO listing_requests (id, status, request_date, listing_id, recipient_id, version) VALUES
('550e8400-e29b-41d4-a716-446655440004', 'PENDING', CURRENT_TIMESTAMP, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 0);