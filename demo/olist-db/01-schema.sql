-- Olist Brazilian E-commerce Dataset Schema
-- This script creates all tables for the Olist dataset and adds indexes
-- for frequently queried columns.

SET sql_mode = 'STRICT_ALL_TABLES';

-- Customers table
CREATE TABLE IF NOT EXISTS olist_customers (
    customer_id VARCHAR(32) NOT NULL PRIMARY KEY,
    customer_unique_id VARCHAR(32) NOT NULL,
    customer_zip_code_prefix VARCHAR(10),
    customer_city VARCHAR(100),
    customer_state VARCHAR(2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders table
CREATE TABLE IF NOT EXISTS olist_orders (
    order_id VARCHAR(32) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(32) NOT NULL,
    order_status VARCHAR(20) NOT NULL,
    order_purchase_timestamp DATETIME,
    order_approved_at DATETIME,
    order_delivered_carrier_date DATETIME,
    order_delivered_customer_date DATETIME,
    order_estimated_delivery_date DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products table
CREATE TABLE IF NOT EXISTS olist_products (
    product_id VARCHAR(32) NOT NULL PRIMARY KEY,
    product_category_name VARCHAR(100),
    product_name_length INT,
    product_description_length INT,
    product_photos_qty INT,
    product_weight_g INT,
    product_length_cm INT,
    product_height_cm INT,
    product_width_cm INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sellers table
CREATE TABLE IF NOT EXISTS olist_sellers (
    seller_id VARCHAR(32) NOT NULL PRIMARY KEY,
    seller_zip_code_prefix VARCHAR(10),
    seller_city VARCHAR(100),
    seller_state VARCHAR(2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order items table (composite primary key)
CREATE TABLE IF NOT EXISTS olist_order_items (
    order_id VARCHAR(32) NOT NULL,
    order_item_id INT NOT NULL,
    product_id VARCHAR(32) NOT NULL,
    seller_id VARCHAR(32) NOT NULL,
    shipping_limit_date DATETIME,
    price DECIMAL(10,2) NOT NULL,
    freight_value DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, order_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order payments table (composite primary key)
CREATE TABLE IF NOT EXISTS olist_order_payments (
    order_id VARCHAR(32) NOT NULL,
    payment_sequential INT NOT NULL,
    payment_type VARCHAR(30) NOT NULL,
    payment_installments INT NOT NULL,
    payment_value DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, payment_sequential)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order reviews table
CREATE TABLE IF NOT EXISTS olist_order_reviews (
    review_id VARCHAR(32) NOT NULL PRIMARY KEY,
    order_id VARCHAR(32) NOT NULL,
    review_score INT NOT NULL,
    review_comment_title VARCHAR(200),
    review_comment_message TEXT,
    review_creation_date DATETIME,
    review_answer_timestamp DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Geolocation table (no single primary key)
CREATE TABLE IF NOT EXISTS olist_geolocation (
    geolocation_zip_code_prefix VARCHAR(10) NOT NULL,
    geolocation_lat DECIMAL(10,8) NOT NULL,
    geolocation_lng DECIMAL(11,8) NOT NULL,
    geolocation_city VARCHAR(100),
    geolocation_state VARCHAR(2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Product category name translation table
CREATE TABLE IF NOT EXISTS product_category_name_translation (
    product_category_name VARCHAR(100) NOT NULL PRIMARY KEY,
    product_category_name_english VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes on frequently queried columns
CREATE INDEX idx_orders_customer_id ON olist_orders (customer_id);
CREATE INDEX idx_orders_order_status ON olist_orders (order_status);
CREATE INDEX idx_orders_purchase_timestamp ON olist_orders (order_purchase_timestamp);

CREATE INDEX idx_order_items_order_id ON olist_order_items (order_id);
CREATE INDEX idx_order_items_product_id ON olist_order_items (product_id);
CREATE INDEX idx_order_items_seller_id ON olist_order_items (seller_id);

CREATE INDEX idx_order_payments_order_id ON olist_order_payments (order_id);

CREATE INDEX idx_order_reviews_order_id ON olist_order_reviews (order_id);

CREATE INDEX idx_geolocation_zip ON olist_geolocation (geolocation_zip_code_prefix);
