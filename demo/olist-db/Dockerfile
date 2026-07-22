FROM mysql:8.0

# Allow LOAD DATA INFILE from /data/ directory (server-side file reads)
RUN printf '[mysqld]\nsecure_file_priv=/data/\nlocal_infile=1\n[mysql]\nlocal_infile=1\n' > /etc/mysql/conf.d/load-data.cnf

# Copy Olist CSV data files into /data/ inside the image
COPY demo/data/olist_orders_dataset.csv /data/
COPY demo/data/olist_order_items_dataset.csv /data/
COPY demo/data/olist_order_payments_dataset.csv /data/
COPY demo/data/olist_order_reviews_dataset.csv /data/
COPY demo/data/olist_customers_dataset.csv /data/
COPY demo/data/olist_products_dataset.csv /data/
COPY demo/data/olist_sellers_dataset.csv /data/
COPY demo/data/olist_geolocation_dataset.csv /data/
COPY demo/data/product_category_name_translation.csv /data/

# Copy SQL initialization scripts into the MySQL entrypoint directory
# Scripts are executed alphabetically on first container start
COPY demo/olist-db/01-schema.sql /docker-entrypoint-initdb.d/
COPY demo/olist-db/02-load-data.sh /docker-entrypoint-initdb.d/
