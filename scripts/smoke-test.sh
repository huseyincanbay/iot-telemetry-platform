#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."

set -a
[ -f .env ] && . ./.env
set +a

GREEN='\033[32m'
RED='\033[31m'
BOLD='\033[1m'
RESET='\033[0m'
FAILED=0

pass() { printf "  ${GREEN}PASS${RESET} %s\n" "$1"; }
fail() {
  printf "  ${RED}FAIL${RESET} %s\n" "$1"
  FAILED=1
}

printf "\n${BOLD}Infrastructure${RESET}\n"

if docker compose exec -T mosquitto mosquitto_pub -h localhost -t telemetry/smoke -m ok >/dev/null 2>&1; then
  pass "Mosquitto accepts publish (:${MOSQUITTO_PORT:-1883})"
else
  fail "Mosquitto accepts publish (:${MOSQUITTO_PORT:-1883})"
fi

TS_VERSION=$(docker compose exec -T timescaledb psql -U "${POSTGRES_USER:-telemetry}" -d "${POSTGRES_DB:-telemetry}" -tAc "SELECT extversion FROM pg_extension WHERE extname='timescaledb';" 2>/dev/null | tr -d '[:space:]')
if [ -n "$TS_VERSION" ]; then
  pass "TimescaleDB extension loaded (v${TS_VERSION})"
else
  fail "TimescaleDB extension loaded"
fi

if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
  pass "Redis responds to PING (:${REDIS_PORT:-6379})"
else
  fail "Redis responds to PING (:${REDIS_PORT:-6379})"
fi

if docker compose exec -T rabbitmq rabbitmq-diagnostics -q ping >/dev/null 2>&1; then
  pass "RabbitMQ diagnostics ping (:${RABBITMQ_PORT:-5672})"
else
  fail "RabbitMQ diagnostics ping (:${RABBITMQ_PORT:-5672})"
fi

if curl -fsS "http://localhost:${PROMETHEUS_PORT:-9090}/-/healthy" >/dev/null 2>&1; then
  pass "Prometheus healthy (:${PROMETHEUS_PORT:-9090})"
else
  fail "Prometheus healthy (:${PROMETHEUS_PORT:-9090})"
fi

if curl -fsS "http://localhost:${GRAFANA_PORT:-3000}/api/health" >/dev/null 2>&1; then
  pass "Grafana healthy (:${GRAFANA_PORT:-3000})"
else
  fail "Grafana healthy (:${GRAFANA_PORT:-3000})"
fi

printf "\n${BOLD}Service health endpoints${RESET}\n"
for pair in "ingestion-service:3001" "rule-engine:3002" "notification-service:3003" "query-api:3004"; do
  name="${pair%%:*}"
  port="${pair##*:}"
  if curl -fsS "http://localhost:${port}/health" >/dev/null 2>&1; then
    pass "${name} /health (:${port})"
  else
    fail "${name} /health (:${port})"
  fi
done

printf "\n"
if [ "$FAILED" -eq 0 ]; then
  printf "${GREEN}${BOLD}All checks passed${RESET}\n"
else
  printf "${RED}${BOLD}Some checks failed${RESET}\n"
fi
exit "$FAILED"
