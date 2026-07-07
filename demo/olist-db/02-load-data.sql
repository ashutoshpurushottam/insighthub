-- Olist Brazilian E-commerce Dataset Data Loader
-- This script bulk-imports CSV files into the Olist tables.
-- Load order respects logical FK dependencies:
--   1. Independent tables (customers, products, sellers, geolocation, translations)
--   2. Dependent tables (orders, order_items, order_payments, order_reviews)

SET sql_mode = 'STRICT_ALL_TABLES';

-- Enable local infile loading
SET GLOBAL local_infile = 1;

-- 1. Load customers (independent - referenced by orders)
LOAD DATA LOCAL INFILE '/data/olist_customers_dataset.csv'
INTO TABLE olist_customers
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(customer_id, customer_unique_id, customer_zip_code_prefix, customer_city, customer_state);

-- 2. Load products (independent - referenced by order_items)
LOAD DATA LOCAL INFILE '/data/olist_products_dataset.csv'
INTO TABLE olist_products
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(product_id, product_category_name, product_name_length, product_description_length, product_photos_qty, product_weight_g, product_length_cm, product_height_cm, product_width_cm);

-- 3. Load sellers (independent - referenced by order_items)
LOAD DATA LOCAL INFILE '/data/olist_sellers_dataset.csv'
INTO TABLE olist_sellers
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(seller_id, seller_zip_code_prefix, seller_city, seller_state);

-- 4. Load geolocation (independent)
LOAD DATA LOCAL INFILE '/data/olist_geolocation_dataset.csv'
INTO TABLE olist_geolocation
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(geolocation_zip_code_prefix, geolocation_lat, geolocation_lng, geolocation_city, geolocation_state);

-- 5. Load product category name translations (independent)
LOAD DATA LOCAL INFILE '/data/product_category_name_translation.csv'
INTO TABLE product_category_name_translation
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(product_category_name, product_category_name_english);

-- 6. Load orders (depends on customers)
LOAD DATA LOCAL INFILE '/data/olist_orders_dataset.csv'
INTO TABLE olist_orders
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(order_id, customer_id, order_status, order_purchase_timestamp, order_approved_at, order_delivered_carrier_date, order_delivered_customer_date, order_estimated_delivery_date);

-- 7. Load order items (depends on orders, products, sellers)
LOAD DATA LOCAL INFILE '/data/olist_order_items_dataset.csv'
INTO TABLE olist_order_items
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(order_id, order_item_id, product_id, seller_id, shipping_limit_date, price, freight_value);

-- 8. Load order payments (depends on orders)
LOAD DATA LOCAL INFILE '/data/olist_order_payments_dataset.csv'
INTO TABLE olist_order_payments
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(order_id, payment_sequential, payment_type, payment_installments, payment_value);

-- 9. Load order reviews (depends on orders)
LOAD DATA LOCAL INFILE '/data/olist_order_reviews_dataset.csv'
INTO TABLE olist_order_reviews
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(review_id, order_id, review_score, review_comment_title, review_comment_message, review_creation_date, review_answer_timestamp);
