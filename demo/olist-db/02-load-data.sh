#!/bin/bash
# Olist Brazilian E-commerce Dataset Data Loader
# Uses LOAD DATA INFILE (server-side read from /data/) which avoids
# the local_infile client-side restriction issues.
# Load order respects logical FK dependencies.

set -e

echo "Loading Olist dataset into MySQL..."

mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" <<'SQL'

SET sql_mode = '';

-- 1. Load customers (independent - referenced by orders)
LOAD DATA INFILE '/data/olist_customers_dataset.csv'
INTO TABLE olist_customers
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(customer_id, customer_unique_id, customer_zip_code_prefix, customer_city, customer_state);

-- 2. Load products (independent - referenced by order_items)
LOAD DATA INFILE '/data/olist_products_dataset.csv'
INTO TABLE olist_products
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(product_id, product_category_name, @name_len, @desc_len, @photos, @weight, @length, @height, @width)
SET product_name_length = NULLIF(@name_len, ''),
    product_description_length = NULLIF(@desc_len, ''),
    product_photos_qty = NULLIF(@photos, ''),
    product_weight_g = NULLIF(@weight, ''),
    product_length_cm = NULLIF(@length, ''),
    product_height_cm = NULLIF(@height, ''),
    product_width_cm = NULLIF(@width, '');

-- 3. Load sellers (independent - referenced by order_items)
LOAD DATA INFILE '/data/olist_sellers_dataset.csv'
INTO TABLE olist_sellers
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(seller_id, seller_zip_code_prefix, seller_city, seller_state);

-- 4. Load geolocation (independent)
LOAD DATA INFILE '/data/olist_geolocation_dataset.csv'
INTO TABLE olist_geolocation
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(geolocation_zip_code_prefix, geolocation_lat, geolocation_lng, geolocation_city, geolocation_state);

-- 5. Load product category name translations (independent)
LOAD DATA INFILE '/data/product_category_name_translation.csv'
INTO TABLE product_category_name_translation
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(product_category_name, product_category_name_english);

-- 6. Load orders (depends on customers)
LOAD DATA INFILE '/data/olist_orders_dataset.csv'
INTO TABLE olist_orders
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(order_id, customer_id, order_status, @purchase, @approved, @carrier, @delivered, @estimated)
SET order_purchase_timestamp = NULLIF(@purchase, ''),
    order_approved_at = NULLIF(@approved, ''),
    order_delivered_carrier_date = NULLIF(@carrier, ''),
    order_delivered_customer_date = NULLIF(@delivered, ''),
    order_estimated_delivery_date = NULLIF(@estimated, '');

-- 7. Load order items (depends on orders, products, sellers)
LOAD DATA INFILE '/data/olist_order_items_dataset.csv'
INTO TABLE olist_order_items
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(order_id, order_item_id, product_id, seller_id, @ship_limit, price, freight_value)
SET shipping_limit_date = NULLIF(@ship_limit, '');

-- 8. Load order payments (depends on orders)
LOAD DATA INFILE '/data/olist_order_payments_dataset.csv'
INTO TABLE olist_order_payments
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(order_id, payment_sequential, payment_type, payment_installments, payment_value);

-- 9. Load order reviews (depends on orders)
LOAD DATA INFILE '/data/olist_order_reviews_dataset.csv'
IGNORE
INTO TABLE olist_order_reviews
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(review_id, order_id, review_score, @title, @message, @creation, @answer)
SET review_comment_title = NULLIF(@title, ''),
    review_comment_message = NULLIF(@message, ''),
    review_creation_date = NULLIF(@creation, ''),
    review_answer_timestamp = NULLIF(@answer, '');

SQL

echo "Olist dataset loaded successfully!"
