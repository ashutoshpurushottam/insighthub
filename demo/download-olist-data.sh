#!/usr/bin/env bash
#
# download-olist-data.sh
# Downloads the Olist Brazilian E-commerce dataset from Kaggle
# and places the 9 required CSV files into demo/data/.
#
# Prerequisites:
#   1. Install the Kaggle CLI: pip install kaggle
#   2. Configure your API key: https://www.kaggle.com/docs/api
#      - Go to https://www.kaggle.com/settings → Create New Token
#      - Place the downloaded kaggle.json in ~/.kaggle/kaggle.json
#      - chmod 600 ~/.kaggle/kaggle.json
#
# Usage:
#   ./demo/download-olist-data.sh
#

set -euo pipefail

# --- Configuration ---
DATASET="olistbr/brazilian-ecommerce"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data"
ZIP_FILE="${DATA_DIR}/brazilian-ecommerce.zip"

REQUIRED_FILES=(
  "olist_orders_dataset.csv"
  "olist_order_items_dataset.csv"
  "olist_order_payments_dataset.csv"
  "olist_order_reviews_dataset.csv"
  "olist_customers_dataset.csv"
  "olist_products_dataset.csv"
  "olist_sellers_dataset.csv"
  "olist_geolocation_dataset.csv"
  "product_category_name_translation.csv"
)

# --- Helper functions ---
cleanup() {
  local exit_code=$?
  if [[ -f "${ZIP_FILE}" ]]; then
    rm -f "${ZIP_FILE}"
  fi
  if [[ ${exit_code} -ne 0 ]]; then
    echo ""
    echo "ERROR: Script failed with exit code ${exit_code}."
    echo "Check the messages above for details."
  fi
  exit ${exit_code}
}

trap cleanup EXIT

log_info() {
  echo "[INFO] $*"
}

log_error() {
  echo "[ERROR] $*" >&2
}

# --- Pre-flight checks ---

# Check if kaggle CLI is installed
if ! command -v kaggle &>/dev/null; then
  log_error "The 'kaggle' CLI is not installed."
  echo ""
  echo "To install it:"
  echo "  pip install kaggle"
  echo ""
  echo "Then configure your API key:"
  echo "  1. Go to https://www.kaggle.com/settings"
  echo "  2. Click 'Create New Token' to download kaggle.json"
  echo "  3. Place it at ~/.kaggle/kaggle.json"
  echo "  4. Run: chmod 600 ~/.kaggle/kaggle.json"
  exit 1
fi

# Check if kaggle credentials are configured
if [[ ! -f "${HOME}/.kaggle/kaggle.json" ]] && [[ -z "${KAGGLE_USERNAME:-}" || -z "${KAGGLE_KEY:-}" ]]; then
  log_error "Kaggle API credentials not found."
  echo ""
  echo "Either:"
  echo "  - Place your kaggle.json at ~/.kaggle/kaggle.json"
  echo "  - Or set KAGGLE_USERNAME and KAGGLE_KEY environment variables"
  echo ""
  echo "To get your credentials:"
  echo "  1. Go to https://www.kaggle.com/settings"
  echo "  2. Click 'Create New Token' to download kaggle.json"
  exit 1
fi

# Check if unzip is available
if ! command -v unzip &>/dev/null; then
  log_error "'unzip' command is not installed. Please install it and retry."
  exit 1
fi

# --- Download dataset ---

mkdir -p "${DATA_DIR}"

log_info "Downloading Olist dataset from Kaggle (${DATASET})..."
if ! kaggle datasets download -d "${DATASET}" -p "${DATA_DIR}" 2>&1; then
  log_error "Failed to download dataset from Kaggle."
  echo ""
  echo "Possible causes:"
  echo "  - Network connectivity issue"
  echo "  - Invalid or expired Kaggle API credentials"
  echo "  - Dataset may have been moved or deleted"
  echo ""
  echo "Verify your credentials work by running:"
  echo "  kaggle datasets list -s olist"
  exit 1
fi

# --- Extract dataset ---

if [[ ! -f "${ZIP_FILE}" ]]; then
  log_error "Downloaded zip file not found at: ${ZIP_FILE}"
  echo "The Kaggle CLI may have saved it with a different name."
  echo "Check ${DATA_DIR} for .zip files."
  exit 1
fi

log_info "Extracting dataset to ${DATA_DIR}..."
if ! unzip -o "${ZIP_FILE}" -d "${DATA_DIR}" 2>&1; then
  log_error "Failed to extract zip file: ${ZIP_FILE}"
  exit 1
fi

# Remove the zip file after successful extraction
rm -f "${ZIP_FILE}"
log_info "Removed zip file."

# --- Validate all required files exist ---

log_info "Validating required CSV files..."
missing_files=()
for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "${DATA_DIR}/${file}" ]]; then
    missing_files+=("${file}")
  fi
done

if [[ ${#missing_files[@]} -gt 0 ]]; then
  log_error "The following required CSV files are missing from ${DATA_DIR}:"
  for file in "${missing_files[@]}"; do
    echo "  - ${file}"
  done
  echo ""
  echo "The dataset may have changed. Please verify the Kaggle dataset contents:"
  echo "  https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce"
  exit 1
fi

# --- Success ---

log_info "All 9 required CSV files are present in ${DATA_DIR}:"
for file in "${REQUIRED_FILES[@]}"; do
  size=$(du -h "${DATA_DIR}/${file}" | cut -f1)
  echo "  ✓ ${file} (${size})"
done

echo ""
log_info "Olist dataset download complete! You can now build the demo environment."
