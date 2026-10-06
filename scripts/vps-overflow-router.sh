#!/usr/bin/env bash
set -euo pipefail

OVERFLOW_UPSTREAM="${OVERFLOW_UPSTREAM:-}"
LOCAL_HEALTH_URL="${LOCAL_HEALTH_URL:-http://127.0.0.1:5000/api/health}"
STATE_FILE="${STATE_FILE:-/run/tech-katta-overflow.state}"
ENTER_CPU="${ENTER_CPU:-85}"
EXIT_CPU="${EXIT_CPU:-65}"
FAILURES_TO_ENTER="${FAILURES_TO_ENTER:-3}"
HEALTHY_CHECKS_TO_EXIT="${HEALTHY_CHECKS_TO_EXIT:-5}"

# Safety: no secondary configured means no routing changes.
if [[ -z "$OVERFLOW_UPSTREAM" ]]; then
  echo "OVERFLOW_UPSTREAM is not configured; overflow monitoring is disabled."
  exit 0
fi

if [[ ! "$OVERFLOW_UPSTREAM" =~ ^https?://[^/]+$ ]]; then
  echo "Invalid OVERFLOW_UPSTREAM: $OVERFLOW_UPSTREAM" >&2
  exit 1
fi

state="primary"
failures=0
healthy=0
[[ -f "$STATE_FILE" ]] && source "$STATE_FILE"

read -r _ user nice system idle iowait irq softirq steal _ < /proc/stat
total1=$((user + nice + system + idle + iowait + irq + softirq + steal))
busy1=$((total1 - idle - iowait))
sleep 1
read -r _ user nice system idle iowait irq softirq steal _ < /proc/stat
total2=$((user + nice + system + idle + iowait + irq + softirq + steal))
busy2=$((total2 - idle - iowait))
total_delta=$((total2 - total1))
busy_delta=$((busy2 - busy1))
cpu=0
(( total_delta > 0 )) && cpu=$((busy_delta * 100 / total_delta))

health_ok=0
curl --silent --show-error --fail --max-time 2 "$LOCAL_HEALTH_URL" >/dev/null 2>&1 && health_ok=1

if (( health_ok == 0 )); then
  failures=$((failures + 1))
  healthy=0
else
  failures=0
  healthy=$((healthy + 1))
fi

if [[ "$state" == "primary" ]] && { (( health_ok == 0 && failures >= FAILURES_TO_ENTER )) || (( cpu >= ENTER_CPU )); }; then
  state="overflow"
  healthy=0
elif [[ "$state" == "overflow" ]] && (( health_ok == 1 )) && (( healthy >= HEALTHY_CHECKS_TO_EXIT )) && (( cpu <= EXIT_CPU )); then
  state="primary"
fi

mkdir -p "$(dirname "$STATE_FILE")"
cat > "$STATE_FILE" <<EOF
state="$state"
failures=$failures
healthy=$healthy
cpu=$cpu
checked_at="$(date -Is)"
EOF

echo "Tech Katta routing state: $state (cpu=$cpu%, health=$health_ok, failures=$failures, healthy=$healthy)"
