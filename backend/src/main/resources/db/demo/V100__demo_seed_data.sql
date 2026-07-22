-- ===========================================================================
-- V100: Demo Seed Data for Olist E-commerce Demo Environment
-- This migration only runs when the 'demo' Spring profile is active
-- (Flyway locations include classpath:db/demo).
-- Target database: MySQL 8.0
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. DIVISIONS (Req 4.1)
-- ---------------------------------------------------------------------------
INSERT INTO divisions (id, name, description) VALUES
(101, 'Executive', 'Executive leadership and strategic oversight'),
(102, 'Sales & Marketing', 'Sales operations and marketing analytics'),
(103, 'Operations & Logistics', 'Supply chain, fulfillment, and seller management'),
(104, 'Customer Success', 'Customer experience, support, and retention');

-- ---------------------------------------------------------------------------
-- 2. REPORT GROUPS (Req 5.1, 5.2) — mapped to divisions
-- ---------------------------------------------------------------------------
INSERT INTO report_groups (id, name, description, division_id) VALUES
(101, 'Executive Dashboard', 'High-level KPIs and executive summaries', 101),
(102, 'Sales Analytics', 'Sales trends, conversion, and pipeline analysis', 102),
(103, 'Revenue & Payments', 'Revenue breakdowns and payment method insights', 102),
(104, 'Customer Intelligence', 'Customer segmentation and behavior analysis', 104),
(105, 'Product Performance', 'Product category and catalog performance metrics', 103),
(106, 'Seller Analytics', 'Seller ranking, performance, and onboarding', 103),
(107, 'Logistics & Delivery', 'Shipping times, carrier performance, and delays', 104),
(108, 'Review Sentiment', 'Customer reviews, ratings, and satisfaction trends', 104);

-- ---------------------------------------------------------------------------
-- 3. ROLES for demo user groups (Req 6.2)
-- We create dedicated roles with the specific permission sets required.
-- ---------------------------------------------------------------------------
INSERT INTO roles (id, name, description) VALUES
(101, 'Executive Viewer', 'View reports, analytics, jobs, and logs'),
(102, 'Sales Manager', 'View reports and schedule jobs'),
(103, 'Operations Manager', 'View reports, view and configure jobs'),
(104, 'Support Agent', 'View reports only'),
(105, 'Data Analyst', 'View reports and self-service reporting');

-- Role-Permission mappings
-- Executive Viewer (role 101): view_reports, view_analytics, view_jobs, view_logs
INSERT INTO role_permissions (role_id, permission_id)
SELECT 101, id FROM permissions WHERE name IN ('view_reports', 'view_analytics', 'view_jobs', 'view_logs');

-- Sales Manager (role 102): view_reports, schedule_jobs
INSERT INTO role_permissions (role_id, permission_id)
SELECT 102, id FROM permissions WHERE name IN ('view_reports', 'schedule_jobs');

-- Operations Manager (role 103): view_reports, view_jobs, configure_jobs
INSERT INTO role_permissions (role_id, permission_id)
SELECT 103, id FROM permissions WHERE name IN ('view_reports', 'view_jobs', 'configure_jobs');

-- Support Agent (role 104): view_reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT 104, id FROM permissions WHERE name IN ('view_reports');

-- Data Analyst (role 105): view_reports, self_service_reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT 105, id FROM permissions WHERE name IN ('view_reports', 'self_service_reports');

-- ---------------------------------------------------------------------------
-- 4. USER GROUPS (Req 6.1, 6.2)
-- ---------------------------------------------------------------------------
INSERT INTO user_groups (id, name, description) VALUES
(101, 'Executive Team', 'Senior leadership with broad read access'),
(102, 'Sales Managers', 'Sales team leads with scheduling capabilities'),
(103, 'Operations Team', 'Operations staff managing fulfillment and logistics'),
(104, 'Customer Support', 'Support agents with basic report access'),
(105, 'Data Analysts', 'Analysts with self-service reporting capabilities');

-- User Group → Role assignments
INSERT INTO user_group_roles (user_group_id, role_id) VALUES
(101, 101),  -- Executive Team → Executive Viewer
(102, 102),  -- Sales Managers → Sales Manager
(103, 103),  -- Operations Team → Operations Manager
(104, 104),  -- Customer Support → Support Agent
(105, 105);  -- Data Analysts → Data Analyst

-- ---------------------------------------------------------------------------
-- 5. DEMO USERS (Req 7.1-7.5)
-- Passwords are BCrypt-encoded with the username as the password.
-- ---------------------------------------------------------------------------
INSERT INTO users (id, username, password, full_name, email, access_level, active, division_id, created_by) VALUES
(101, 'admin', '$2b$10$y/VIfseKwTiyAioo/BVbdehQ/bezaBOv/ZD1Lu2lDcmCvsx.9GPRa', 'Admin User', 'admin@insighthub.local', 100, TRUE, 101, 'system'),
(102, 'ceo', '$2b$10$BRgx0hns6RZ2eQfvr10X4umE6v4SmwL6qyV3eZ06d5zd6GKt4/fKy', 'CEO User', 'ceo@insighthub.local', 80, TRUE, 101, 'system'),
(103, 'sales_mgr', '$2b$10$TRAnNLjNUaYuSoWbo7iX8eiDlhIrdoNk9vd4Fm1/eJ2mdgrs3YnFe', 'Sales Manager', 'sales_mgr@insighthub.local', 40, TRUE, 102, 'system'),
(104, 'ops_lead', '$2b$10$z4ry3Vvq3uhRh.TXWXtVGOrteKGLD8Yk4MnTLw0CTv4TkfyeygjSi', 'Operations Lead', 'ops_lead@insighthub.local', 10, TRUE, 103, 'system'),
(105, 'support_agent', '$2b$10$LZ/um2543Wmciz1J.Tcar.tEfByc8D.6ctvkhzXfSXJgz4Lk1MTxq', 'Support Agent', 'support_agent@insighthub.local', 5, TRUE, 104, 'system'),
(106, 'analyst', '$2b$10$kX8VlIVbj3NIJXx5JAxyx.X8HOzuxRq5AHUbaxBIjfinavkGBPzMC', 'Data Analyst', 'analyst@insighthub.local', 0, TRUE, 104, 'system');

-- User → User Group assignments (Req 7.3)
-- admin (id=101) has no group assignment (Super Admin bypasses access checks)
INSERT INTO user_group_members (user_id, user_group_id) VALUES
(102, 101),  -- ceo → Executive Team
(103, 102),  -- sales_mgr → Sales Managers
(104, 103),  -- ops_lead → Operations Team
(105, 104),  -- support_agent → Customer Support
(106, 105);  -- analyst → Data Analysts

-- Assign admin user to Super Admin role
INSERT INTO user_roles (user_id, role_id) VALUES (101, 1);

-- ---------------------------------------------------------------------------
-- 6. DATASOURCE (Req 8.1, 8.2)
-- ---------------------------------------------------------------------------
INSERT INTO datasources (id, name, description, database_type, driver, url, username, password, active, test_sql, created_by) VALUES
(101, 'Olist E-commerce', 'Brazilian e-commerce dataset (Olist)', 'MySQL', 'com.mysql.cj.jdbc.Driver',
 'jdbc:mysql://olist-mysql:3306/olist', 'olist', 'olist', TRUE, 'SELECT 1', 'system');

-- ---------------------------------------------------------------------------
-- 7. REPORTS (Req 9.1-9.5)
-- 16+ reports distributed across 8 report groups, mix of type=0 and type=1
-- All queries target the Olist database schema.
-- ---------------------------------------------------------------------------

-- == Executive Dashboard (report_group_id=101) ==
INSERT INTO reports (id, name, short_description, report_type, report_group_id, datasource_id, active, report_source, created_by) VALUES
(101, 'Monthly Order Volume', 'Monthly order count trend for executive overview', 1, 101, 101, TRUE,
'SELECT DATE_FORMAT(order_purchase_timestamp, ''%Y-%m'') AS month, COUNT(*) AS order_count FROM olist_orders WHERE order_purchase_timestamp >= :date_from AND order_purchase_timestamp <= :date_to GROUP BY month ORDER BY month', 'system'),
(102, 'Order Status Breakdown', 'Distribution of orders by current status', 0, 101, 101, TRUE,
'SELECT order_status, COUNT(*) AS total, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM olist_orders), 1) AS percentage FROM olist_orders WHERE order_purchase_timestamp >= :date_from AND order_purchase_timestamp <= :date_to GROUP BY order_status ORDER BY total DESC', 'system');

-- == Sales Analytics (report_group_id=102) ==
INSERT INTO reports (id, name, short_description, report_type, report_group_id, datasource_id, active, report_source, created_by) VALUES
(103, 'Top Product Categories by Revenue', 'Highest-grossing product categories with filters', 0, 102, 101, TRUE,
'SELECT t.product_category_name_english AS category, COUNT(DISTINCT oi.order_id) AS orders, COUNT(*) AS items_sold, ROUND(SUM(oi.price), 2) AS revenue, ROUND(SUM(oi.freight_value), 2) AS freight, ROUND(AVG(oi.price), 2) AS avg_price FROM olist_order_items oi JOIN olist_products p ON oi.product_id = p.product_id JOIN product_category_name_translation t ON p.product_category_name = t.product_category_name JOIN olist_orders o ON oi.order_id = o.order_id WHERE o.order_purchase_timestamp >= :date_from AND o.order_purchase_timestamp <= :date_to AND (:state = ''ALL'' OR EXISTS (SELECT 1 FROM olist_customers c WHERE c.customer_id = o.customer_id AND c.customer_state = :state)) GROUP BY t.product_category_name_english ORDER BY revenue DESC LIMIT 20', 'system'),
(104, 'Customer Acquisition by Month', 'New unique customers placing first orders each month', 1, 102, 101, TRUE,
'SELECT DATE_FORMAT(first_order, ''%Y-%m'') AS month, COUNT(*) AS new_customers FROM (SELECT customer_id, MIN(order_purchase_timestamp) AS first_order FROM olist_orders GROUP BY customer_id) first_orders WHERE first_order >= :date_from AND first_order <= :date_to GROUP BY month ORDER BY month', 'system');

-- == Revenue & Payments (report_group_id=103) ==
INSERT INTO reports (id, name, short_description, report_type, report_group_id, datasource_id, active, report_source, created_by) VALUES
(105, 'Payment Method Distribution', 'Breakdown of payment types with date filtering', 1, 103, 101, TRUE,
'SELECT payment_type, COUNT(*) AS usage_count, ROUND(SUM(payment_value), 2) AS total_value, ROUND(AVG(payment_value), 2) AS avg_value, ROUND(AVG(payment_installments), 1) AS avg_installments FROM olist_order_payments op JOIN olist_orders o ON op.order_id = o.order_id WHERE o.order_purchase_timestamp >= :date_from AND o.order_purchase_timestamp <= :date_to GROUP BY payment_type ORDER BY total_value DESC', 'system'),
(106, 'Revenue by State', 'Revenue aggregated by customer state with period filter', 0, 103, 101, TRUE,
'SELECT c.customer_state AS state, COUNT(DISTINCT o.order_id) AS orders, COUNT(DISTINCT o.customer_id) AS customers, ROUND(SUM(op.payment_value), 2) AS revenue, ROUND(AVG(op.payment_value), 2) AS avg_order_value FROM olist_orders o JOIN olist_customers c ON o.customer_id = c.customer_id JOIN olist_order_payments op ON o.order_id = op.order_id WHERE o.order_purchase_timestamp >= :date_from AND o.order_purchase_timestamp <= :date_to GROUP BY c.customer_state ORDER BY revenue DESC', 'system');

-- == Customer Intelligence (report_group_id=104) ==
INSERT INTO reports (id, name, short_description, report_type, report_group_id, datasource_id, active, report_source, created_by) VALUES
(107, 'Customer Geographic Distribution', 'Customer count by state for market analysis', 0, 104, 101, TRUE,
'SELECT customer_state AS state, COUNT(*) AS customer_count, COUNT(DISTINCT customer_zip_code_prefix) AS zip_codes FROM olist_customers GROUP BY customer_state ORDER BY customer_count DESC', 'system'),
(108, 'Orders by Customer State', 'Detailed order metrics by state with date range', 0, 104, 101, TRUE,
'SELECT c.customer_state AS state, c.customer_city AS city, COUNT(*) AS order_count, ROUND(SUM(op.payment_value), 2) AS total_spent, ROUND(AVG(op.payment_value), 2) AS avg_order_value FROM olist_orders o JOIN olist_customers c ON o.customer_id = c.customer_id JOIN olist_order_payments op ON o.order_id = op.order_id WHERE c.customer_state = :state AND o.order_purchase_timestamp >= :date_from AND o.order_purchase_timestamp <= :date_to GROUP BY c.customer_state, c.customer_city ORDER BY total_spent DESC LIMIT 30', 'system');

-- == Product Performance (report_group_id=105) ==
INSERT INTO reports (id, name, short_description, report_type, report_group_id, datasource_id, active, report_source, created_by) VALUES
(109, 'Product Category Sales Volume', 'Number of items sold per product category', 0, 105, 101, TRUE,
'SELECT t.product_category_name_english AS category, COUNT(*) AS items_sold, COUNT(DISTINCT oi.order_id) AS orders, ROUND(SUM(oi.price), 2) AS revenue, ROUND(AVG(oi.price), 2) AS avg_price FROM olist_order_items oi JOIN olist_products p ON oi.product_id = p.product_id JOIN product_category_name_translation t ON p.product_category_name = t.product_category_name JOIN olist_orders o ON oi.order_id = o.order_id WHERE o.order_purchase_timestamp >= :date_from AND o.order_purchase_timestamp <= :date_to GROUP BY t.product_category_name_english ORDER BY items_sold DESC LIMIT 20', 'system'),
(110, 'Products in Category', 'Detailed product listing within a specific category', 0, 105, 101, TRUE,
'SELECT p.product_id, t.product_category_name_english AS category, COUNT(*) AS times_sold, ROUND(SUM(oi.price), 2) AS total_revenue, ROUND(AVG(oi.price), 2) AS avg_price, p.product_weight_g AS weight_g, ROUND(AVG(r.review_score), 1) AS avg_review FROM olist_order_items oi JOIN olist_products p ON oi.product_id = p.product_id JOIN product_category_name_translation t ON p.product_category_name = t.product_category_name LEFT JOIN olist_order_reviews r ON oi.order_id = r.order_id WHERE t.product_category_name_english = :category GROUP BY p.product_id, t.product_category_name_english, p.product_weight_g ORDER BY total_revenue DESC LIMIT 50', 'system');

-- == Seller Analytics (report_group_id=106) ==
INSERT INTO reports (id, name, short_description, report_type, report_group_id, datasource_id, active, report_source, created_by) VALUES
(111, 'Top Sellers by Revenue', 'Highest-performing sellers with state filter', 0, 106, 101, TRUE,
'SELECT s.seller_id, s.seller_city, s.seller_state, ROUND(SUM(oi.price), 2) AS total_revenue, COUNT(*) AS items_sold, COUNT(DISTINCT oi.order_id) AS orders, ROUND(AVG(oi.price), 2) AS avg_item_price FROM olist_order_items oi JOIN olist_sellers s ON oi.seller_id = s.seller_id JOIN olist_orders o ON oi.order_id = o.order_id WHERE o.order_purchase_timestamp >= :date_from AND o.order_purchase_timestamp <= :date_to AND (:seller_state = ''ALL'' OR s.seller_state = :seller_state) GROUP BY s.seller_id, s.seller_city, s.seller_state ORDER BY total_revenue DESC LIMIT 30', 'system'),
(112, 'Seller Detail', 'Full performance breakdown for a specific seller', 0, 106, 101, TRUE,
'SELECT DATE_FORMAT(o.order_purchase_timestamp, ''%Y-%m'') AS month, COUNT(DISTINCT o.order_id) AS orders, COUNT(*) AS items, ROUND(SUM(oi.price), 2) AS revenue, ROUND(AVG(oi.price), 2) AS avg_price, ROUND(AVG(r.review_score), 1) AS avg_review FROM olist_order_items oi JOIN olist_orders o ON oi.order_id = o.order_id LEFT JOIN olist_order_reviews r ON o.order_id = r.order_id WHERE oi.seller_id = :seller_id GROUP BY month ORDER BY month', 'system');

-- == Logistics & Delivery (report_group_id=107) ==
INSERT INTO reports (id, name, short_description, report_type, report_group_id, datasource_id, active, report_source, created_by) VALUES
(113, 'Average Delivery Time by State', 'Mean days from purchase to delivery per state', 0, 107, 101, TRUE,
'SELECT c.customer_state AS state, COUNT(*) AS delivered_orders, ROUND(AVG(DATEDIFF(o.order_delivered_customer_date, o.order_purchase_timestamp)), 1) AS avg_delivery_days, ROUND(MIN(DATEDIFF(o.order_delivered_customer_date, o.order_purchase_timestamp)), 1) AS min_days, ROUND(MAX(DATEDIFF(o.order_delivered_customer_date, o.order_purchase_timestamp)), 1) AS max_days, ROUND(100.0 * SUM(CASE WHEN o.order_delivered_customer_date > o.order_estimated_delivery_date THEN 1 ELSE 0 END) / COUNT(*), 1) AS late_pct FROM olist_orders o JOIN olist_customers c ON o.customer_id = c.customer_id WHERE o.order_delivered_customer_date IS NOT NULL AND o.order_purchase_timestamp >= :date_from AND o.order_purchase_timestamp <= :date_to GROUP BY c.customer_state ORDER BY avg_delivery_days DESC', 'system'),
(114, 'Late Delivery Rate by Month', 'Percentage of orders delivered after estimated date', 1, 107, 101, TRUE,
'SELECT DATE_FORMAT(order_purchase_timestamp, ''%Y-%m'') AS month, COUNT(*) AS total_delivered, SUM(CASE WHEN order_delivered_customer_date > order_estimated_delivery_date THEN 1 ELSE 0 END) AS late_count, ROUND(100.0 * SUM(CASE WHEN order_delivered_customer_date > order_estimated_delivery_date THEN 1 ELSE 0 END) / COUNT(*), 1) AS late_pct FROM olist_orders WHERE order_delivered_customer_date IS NOT NULL AND order_purchase_timestamp >= :date_from AND order_purchase_timestamp <= :date_to GROUP BY month ORDER BY month', 'system');

-- == Review Sentiment (report_group_id=108) ==
INSERT INTO reports (id, name, short_description, report_type, report_group_id, datasource_id, active, report_source, created_by) VALUES
(115, 'Review Score Distribution', 'Count of reviews by star rating with date range', 1, 108, 101, TRUE,
'SELECT review_score, COUNT(*) AS review_count, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM olist_order_reviews), 1) AS percentage FROM olist_order_reviews WHERE review_creation_date >= :date_from AND review_creation_date <= :date_to GROUP BY review_score ORDER BY review_score', 'system'),
(116, 'Reviews by Score Detail', 'Individual reviews filtered by score with text', 0, 108, 101, TRUE,
'SELECT r.review_id, r.review_score, r.review_comment_title, SUBSTRING(r.review_comment_message, 1, 200) AS comment_preview, DATE_FORMAT(r.review_creation_date, ''%Y-%m-%d'') AS review_date, o.order_status FROM olist_order_reviews r JOIN olist_orders o ON r.order_id = o.order_id WHERE r.review_score = :review_score AND r.review_creation_date >= :date_from AND r.review_creation_date <= :date_to ORDER BY r.review_creation_date DESC LIMIT 100', 'system');

-- ---------------------------------------------------------------------------
-- 8. DASHBOARDS (Req 12.1, 12.2, 12.3)
-- ---------------------------------------------------------------------------
INSERT INTO dashboards (id, name, description, layout_type, columns_count, active, created_by) VALUES
(101, 'Executive Overview', 'High-level business metrics for executive leadership', 'GRID', 2, TRUE, 'system'),
(102, 'Sales Performance', 'Sales and revenue analytics dashboard', 'GRID', 2, TRUE, 'system'),
(103, 'Operations Monitor', 'Logistics, delivery, and seller performance tracking', 'GRID', 2, TRUE, 'system');

-- Dashboard Items — Executive Overview (references reports from multiple groups: 101, 102, 103, 105)
INSERT INTO dashboard_items (dashboard_id, report_id, title, position, col_span, row_span) VALUES
(101, 101, 'Monthly Order Volume', 0, 2, 1),
(101, 102, 'Order Status Breakdown', 1, 1, 1),
(101, 105, 'Payment Method Distribution', 2, 1, 1),
(101, 106, 'Revenue by State', 3, 2, 1);

-- Dashboard Items — Sales Performance (references reports from groups 102, 103)
INSERT INTO dashboard_items (dashboard_id, report_id, title, position, col_span, row_span) VALUES
(102, 103, 'Top Categories by Revenue', 0, 2, 1),
(102, 104, 'Customer Acquisition Trend', 1, 1, 1),
(102, 105, 'Payment Methods', 2, 1, 1);

-- Dashboard Items — Operations Monitor (references reports from groups 105, 106, 107)
INSERT INTO dashboard_items (dashboard_id, report_id, title, position, col_span, row_span) VALUES
(103, 111, 'Top Sellers by Revenue', 0, 2, 1),
(103, 113, 'Delivery Time by State', 1, 1, 1),
(103, 114, 'Late Delivery Rate', 2, 1, 1);

-- ---------------------------------------------------------------------------
-- 9. USER GROUP → REPORT GROUP ACCESS RIGHTS (Req 6.3, 6.4)
-- Differentiated access ensuring non-overlapping sets for at least 2 groups.
-- ---------------------------------------------------------------------------

-- Executive Team (user_group 101): access to ALL 8 report groups
INSERT INTO user_group_report_group_rights (user_group_id, report_group_id) VALUES
(101, 101), (101, 102), (101, 103), (101, 104),
(101, 105), (101, 106), (101, 107), (101, 108);

-- Sales Managers (user_group 102): Sales Analytics, Revenue & Payments
INSERT INTO user_group_report_group_rights (user_group_id, report_group_id) VALUES
(102, 102), (102, 103);

-- Operations Team (user_group 103): Product Performance, Seller Analytics, Logistics & Delivery
INSERT INTO user_group_report_group_rights (user_group_id, report_group_id) VALUES
(103, 105), (103, 106), (103, 107);

-- Customer Support (user_group 104): Customer Intelligence, Review Sentiment
INSERT INTO user_group_report_group_rights (user_group_id, report_group_id) VALUES
(104, 104), (104, 108);

-- Data Analysts (user_group 105): access to ALL 8 report groups
INSERT INTO user_group_report_group_rights (user_group_id, report_group_id) VALUES
(105, 101), (105, 102), (105, 103), (105, 104),
(105, 105), (105, 106), (105, 107), (105, 108);

-- ---------------------------------------------------------------------------
-- 10. REPORT PARAMETERS
-- Date range parameters for most reports, plus dynamic LOV dropdowns
-- ---------------------------------------------------------------------------

-- Report 101: Monthly Order Volume (date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name) VALUES
(1001, 101, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to'),
(1002, 101, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL);

-- Report 102: Order Status Breakdown (date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name) VALUES
(1003, 102, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to'),
(1004, 102, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL);

-- Report 103: Top Product Categories (date range + state LOV + top N)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name, lov_type, lov_query) VALUES
(1005, 103, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to', NULL, NULL),
(1006, 103, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL, NULL, NULL),
(1007, 103, 'state', 'Customer State', 'TEXT', 'ALL', FALSE, 3, NULL, NULL, 'DYNAMIC', 'SELECT ''ALL'' AS value UNION SELECT DISTINCT customer_state AS value FROM olist_customers ORDER BY value');

-- Report 104: Customer Acquisition by Month (date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name) VALUES
(1009, 104, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to'),
(1010, 104, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL);

-- Report 105: Payment Method Distribution (date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name) VALUES
(1011, 105, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to'),
(1012, 105, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL);

-- Report 106: Revenue by State (date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name) VALUES
(1013, 106, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to'),
(1014, 106, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL);

-- Report 108: Orders by Customer State (state LOV + date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name, lov_type, lov_query) VALUES
(1015, 108, 'state', 'State', 'TEXT', 'SP', TRUE, 1, NULL, NULL, 'DYNAMIC', 'SELECT DISTINCT customer_state AS value FROM olist_customers ORDER BY value'),
(1016, 108, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 2, NULL, 'date_to', NULL, NULL),
(1017, 108, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 3, 'date_from', NULL, NULL, NULL);

-- Report 109: Product Category Sales Volume (date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name) VALUES
(1018, 109, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to'),
(1019, 109, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL);

-- Report 110: Products in Category (category LOV - cascading from 109)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, lov_type, lov_query) VALUES
(1020, 110, 'category', 'Product Category', 'TEXT', 'bed_bath_table', TRUE, 1, 'DYNAMIC', 'SELECT DISTINCT product_category_name_english AS value FROM product_category_name_translation ORDER BY value');

-- Report 111: Top Sellers by Revenue (date range + state LOV + top N)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name, lov_type, lov_query) VALUES
(1021, 111, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to', NULL, NULL),
(1022, 111, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL, NULL, NULL),
(1023, 111, 'seller_state', 'Seller State', 'TEXT', 'ALL', FALSE, 3, NULL, NULL, 'DYNAMIC', 'SELECT ''ALL'' AS value UNION SELECT DISTINCT seller_state AS value FROM olist_sellers ORDER BY value');

-- Report 112: Seller Detail (seller_id parameter)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, placeholder) VALUES
(1025, 112, 'seller_id', 'Seller ID', 'TEXT', '0015a82c2db000af6aaaf3ae2ecb0532', TRUE, 1, 'Enter seller ID from parent report');

-- Report 113: Average Delivery Time by State (date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name) VALUES
(1026, 113, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to'),
(1027, 113, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL);

-- Report 114: Late Delivery Rate by Month (date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name) VALUES
(1028, 114, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to'),
(1029, 114, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL);

-- Report 115: Review Score Distribution (date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name) VALUES
(1030, 115, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 1, NULL, 'date_to'),
(1031, 115, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 2, 'date_from', NULL);

-- Report 116: Reviews by Score Detail (review_score LOV + date range)
INSERT INTO parameters (id, report_id, name, label, param_type, default_value, required, position, from_parameter_name, to_parameter_name, lov_type, lov_static_values) VALUES
(1032, 116, 'review_score', 'Review Score', 'TEXT', '5', TRUE, 1, NULL, NULL, 'STATIC', '[{"value":"1","label":"1 Star"},{"value":"2","label":"2 Stars"},{"value":"3","label":"3 Stars"},{"value":"4","label":"4 Stars"},{"value":"5","label":"5 Stars"}]'),
(1033, 116, 'date_from', 'From Date', 'DATE', '2017-01-01', TRUE, 2, NULL, 'date_to', NULL, NULL),
(1034, 116, 'date_to', 'To Date', 'DATE', '2018-12-31', TRUE, 3, 'date_from', NULL, NULL, NULL);

-- ---------------------------------------------------------------------------
-- 11. DRILL-DOWN LINKS
-- Parent report → Child report navigation via column click
-- ---------------------------------------------------------------------------

-- Revenue by State (106) → Orders by Customer State (108): click "state" column
INSERT INTO drill_down_links (id, parent_report_id, child_report_id, trigger_column, position) VALUES
(101, 106, 108, 'state', 0);

INSERT INTO drill_down_param_mappings (drill_down_link_id, parent_column_name, child_param_name) VALUES
(101, 'state', 'state');

-- Product Category Sales (109) → Products in Category (110): click "category" column
INSERT INTO drill_down_links (id, parent_report_id, child_report_id, trigger_column, position) VALUES
(102, 109, 110, 'category', 0);

INSERT INTO drill_down_param_mappings (drill_down_link_id, parent_column_name, child_param_name) VALUES
(102, 'category', 'category');

-- Top Sellers (111) → Seller Detail (112): click "seller_id" column
INSERT INTO drill_down_links (id, parent_report_id, child_report_id, trigger_column, position) VALUES
(103, 111, 112, 'seller_id', 0);

INSERT INTO drill_down_param_mappings (drill_down_link_id, parent_column_name, child_param_name) VALUES
(103, 'seller_id', 'seller_id');

-- Review Score Distribution (115) → Reviews by Score Detail (116): click "review_score"
INSERT INTO drill_down_links (id, parent_report_id, child_report_id, trigger_column, position) VALUES
(104, 115, 116, 'review_score', 0);

INSERT INTO drill_down_param_mappings (drill_down_link_id, parent_column_name, child_param_name) VALUES
(104, 'review_score', 'review_score');

-- Customer Geographic Distribution (107) → Orders by Customer State (108): click "state"
INSERT INTO drill_down_links (id, parent_report_id, child_report_id, trigger_column, position) VALUES
(105, 107, 108, 'state', 0);

INSERT INTO drill_down_param_mappings (drill_down_link_id, parent_column_name, child_param_name) VALUES
(105, 'state', 'state');
