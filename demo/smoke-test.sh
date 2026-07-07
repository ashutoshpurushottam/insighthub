#!/usr/bin/env bash
# =============================================================================
# InsightHub Demo Smoke Test
# Validates that the running demo environment is healthy and properly seeded.
# Run after `make demo-up` or `docker compose -f docker/docker-compose.demo.yml up`
# =============================================================================
set -uo pipefail

# --- Configuration ---
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:8080/insighthub"
AUTH_URL="${BACKEND_URL}/api/auth/login"
MYSQL_IH_HOST="127.0.0.1"
MYSQL_IH_PORT=3307
MYSQL_OLIST_HOST="127.0.0.1"
MYSQL_OLIST_PORT=3308
MYSQL_USER="insighthub"
MYSQL_PASS="insighthub"
MYSQL_DB="insighthub"
CURL_TIMEOUT=10

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# --- Counters ---
PASS_COUNT=0
FAIL_COUNT=0

# --- Helper Functions ---
pass() {
  echo -e "  ${GREEN}✓ PASS${NC}: $1"
  ((PASS_COUNT++))
}

fail() {
  echo -e "  ${RED}✗ FAIL${NC}: $1"
  ((FAIL_COUNT++))
}

info() {
  echo -e "${YELLOW}▸${NC} $1"
}

check_tcp_port() {
  local host=$1
  local port=$2
  # Try nc first, fall back to bash /dev/tcp
  if command -v nc &>/dev/null; then
    nc -z -w 3 "$host" "$port" &>/dev/null
  elif command -v bash &>/dev/null; then
    (echo >/dev/tcp/"$host"/"$port") &>/dev/null
  else
    # Last resort: use curl
    curl -s --max-time 3 "telnet://${host}:${port}" &>/dev/null
    return $?
  fi
}

mysql_query() {
  local port=$1
  local query=$2
  mysql -h "$MYSQL_IH_HOST" -P "$port" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" -N -s -e "$query" 2>/dev/null
}

# =============================================================================
# Smoke Tests
# =============================================================================

echo ""
echo "======================================"
echo " InsightHub Demo Smoke Test"
echo "======================================"
echo ""

# --- 1. Frontend HTTP Check ---
info "Checking frontend at ${FRONTEND_URL} ..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time ${CURL_TIMEOUT} "${FRONTEND_URL}" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Frontend responds HTTP 200 at ${FRONTEND_URL}"
else
  fail "Frontend returned HTTP ${HTTP_CODE} at ${FRONTEND_URL} (expected 200)"
fi

# --- 2. Backend HTTP Check ---
info "Checking backend at ${BACKEND_URL} ..."
# Use actuator health endpoint (publicly accessible) as the primary backend check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time ${CURL_TIMEOUT} "${BACKEND_URL}/actuator/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Backend responds HTTP 200 at ${BACKEND_URL}/actuator/health"
else
  fail "Backend returned HTTP ${HTTP_CODE} at ${BACKEND_URL}/actuator/health (expected 200)"
fi

# --- 3. MySQL Port Checks ---
info "Checking MySQL InsightHub DB port ${MYSQL_IH_PORT} ..."
if check_tcp_port "$MYSQL_IH_HOST" "$MYSQL_IH_PORT"; then
  pass "MySQL InsightHub DB accessible on port ${MYSQL_IH_PORT}"
else
  fail "MySQL InsightHub DB not accessible on port ${MYSQL_IH_PORT}"
fi

info "Checking MySQL Olist DB port ${MYSQL_OLIST_PORT} ..."
if check_tcp_port "$MYSQL_OLIST_HOST" "$MYSQL_OLIST_PORT"; then
  pass "MySQL Olist DB accessible on port ${MYSQL_OLIST_PORT}"
else
  fail "MySQL Olist DB not accessible on port ${MYSQL_OLIST_PORT}"
fi

# --- 4. Division Count Check ---
info "Checking division count >= 4 ..."
if command -v mysql &>/dev/null; then
  DIV_COUNT=$(mysql_query "$MYSQL_IH_PORT" "SELECT COUNT(*) FROM divisions;" 2>/dev/null)
  if [ -n "$DIV_COUNT" ] && [ "$DIV_COUNT" -ge 4 ] 2>/dev/null; then
    pass "Division count = ${DIV_COUNT} (>= 4)"
  else
    fail "Division count = ${DIV_COUNT:-'N/A'} (expected >= 4)"
  fi
else
  # Fall back to API check via curl
  RESPONSE=$(curl -s --max-time ${CURL_TIMEOUT} "${BACKEND_URL}/api/divisions" 2>/dev/null)
  if [ -n "$RESPONSE" ]; then
    # Count JSON array elements (simple heuristic: count "id" occurrences)
    DIV_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
    if [ "$DIV_COUNT" -ge 4 ] 2>/dev/null; then
      pass "Division count = ${DIV_COUNT} (>= 4) via API"
    else
      fail "Division count = ${DIV_COUNT} (expected >= 4) via API"
    fi
  else
    fail "Could not verify division count (no mysql CLI and API unreachable)"
  fi
fi

# --- 5. Report Group Count Check ---
info "Checking report group count >= 8 ..."
if command -v mysql &>/dev/null; then
  RG_COUNT=$(mysql_query "$MYSQL_IH_PORT" "SELECT COUNT(*) FROM report_groups;" 2>/dev/null)
  if [ -n "$RG_COUNT" ] && [ "$RG_COUNT" -ge 8 ] 2>/dev/null; then
    pass "Report group count = ${RG_COUNT} (>= 8)"
  else
    fail "Report group count = ${RG_COUNT:-'N/A'} (expected >= 8)"
  fi
else
  RESPONSE=$(curl -s --max-time ${CURL_TIMEOUT} "${BACKEND_URL}/api/report-groups" 2>/dev/null)
  if [ -n "$RESPONSE" ]; then
    RG_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
    if [ "$RG_COUNT" -ge 8 ] 2>/dev/null; then
      pass "Report group count = ${RG_COUNT} (>= 8) via API"
    else
      fail "Report group count = ${RG_COUNT} (expected >= 8) via API"
    fi
  else
    fail "Could not verify report group count (no mysql CLI and API unreachable)"
  fi
fi

# --- 6. User Group Count Check ---
info "Checking user group count >= 5 ..."
if command -v mysql &>/dev/null; then
  UG_COUNT=$(mysql_query "$MYSQL_IH_PORT" "SELECT COUNT(*) FROM user_groups;" 2>/dev/null)
  if [ -n "$UG_COUNT" ] && [ "$UG_COUNT" -ge 5 ] 2>/dev/null; then
    pass "User group count = ${UG_COUNT} (>= 5)"
  else
    fail "User group count = ${UG_COUNT:-'N/A'} (expected >= 5)"
  fi
else
  RESPONSE=$(curl -s --max-time ${CURL_TIMEOUT} "${BACKEND_URL}/api/user-groups" 2>/dev/null)
  if [ -n "$RESPONSE" ]; then
    UG_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
    if [ "$UG_COUNT" -ge 5 ] 2>/dev/null; then
      pass "User group count = ${UG_COUNT} (>= 5) via API"
    else
      fail "User group count = ${UG_COUNT} (expected >= 5) via API"
    fi
  else
    fail "Could not verify user group count (no mysql CLI and API unreachable)"
  fi
fi

# --- 7. Demo User Login Check ---
info "Checking demo user login (admin/admin) ..."
LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time ${CURL_TIMEOUT} \
  -X POST "${AUTH_URL}" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' 2>/dev/null || echo "000")
if [ "$LOGIN_CODE" = "200" ]; then
  pass "Demo user 'admin' login successful (HTTP 200)"
else
  fail "Demo user 'admin' login failed (HTTP ${LOGIN_CODE}, expected 200)"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "======================================"
echo -e " ${BOLD}Results${NC}"
echo "======================================"
echo -e "  ${GREEN}Passed${NC}: ${PASS_COUNT}"
echo -e "  ${RED}Failed${NC}: ${FAIL_COUNT}"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo "  Total:  ${TOTAL}"
echo "======================================"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo -e "${RED}Smoke test FAILED — ${FAIL_COUNT} check(s) did not pass.${NC}"
  exit 1
else
  echo -e "${GREEN}All smoke tests PASSED!${NC}"
  exit 0
fi
