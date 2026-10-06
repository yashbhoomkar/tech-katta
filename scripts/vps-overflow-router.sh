#!/usr/bin/env bash
set -euo pipefail

# Tech Katta VPS-first overflow controller.
#
# This controller is intentionally inactive until OVERFLOW_UPSTREAM is configured
# to a dedicated Tech Katta secondary API. It never routes to the Life With Yash
# Render service.
#
# Normal state:
#   100% traffic -> local Tech Katta API
#
# Overflow state:
#   new traffic -> secondary API
#
# Recovery uses hysteresis so transient CPU spikes do not cause route flapping.

OVERFLOW_UPSTREAM="${OVERFLOW_UPSTREAM:-}"
LOCAL_HEALTH_URL="${LOCAL_HEALTH_URL:-http://127.0.0.1:5000/api/health}"
STATE_FILE="${STATE_FILE:-/run/tech-katta-overflow.state}"
NGINX_INCLUDE="${NGINX_INCLUDE:-/etc/nginx/conf.d/tech-katta-overflow-upstream.conf}"

ENTER_CPU="${ENTER_CPU:-85}"
EXIT_CPU="${EXIT_CPU:-65}"
FAILURES_TO_ENTER="${FAILURES_TO_ENTER:-3}"
HEALTHY_CHECKS_TO_EXIT="${HEALTHY_CHECKS_TO_EXIT:-5}"

if [[ -z "$OVERFLOW_UPSTREAM" ]]; then
  echo "OVERFLOW_UPSTREAM is not configured; overflow routing is disabled."
  exit 0
fi

if [[ ! "$OVERFLOW_UPSTREAM" =~ ^https?://[^/]+$ ]]; then
  echo "Invalid OVERFLOW_UPSTREAM: $OVERFLOW_UPSTREAM" >&2
  exit 1
fi

state="primary"
failures=0
healthy=0

if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
fi

cpu="$(awk '{print 100 - $8}' /proc/stat 2>/dev/null || echo 0)"

health_ok=0
if curl --silent --show-error --fail --max-time 2 "$LOCAL_HEALTH_URL" >/dev/null 2>&1; then
  health_ok=1
fi

if (( health_ok == 0 )); then
  failures=$((failures + 1))
  healthy=0
else
  failures=0
  healthy=$((healthy + 1))
fi

if [[ "$state" == "primary" ]] && { (( health_ok == 0 && failures >= FAILURES_TO_ENTER )) || awk "BEGIN {exit !($cpu >= $ENTER_CPU)}"; }; then
  state="overflow"
  healthy=0
elif [[ "$state" == "overflow" ]] && (( health_ok == 1 )) && (( healthy >= HEALTHY_CHECKS_TO_EXIT )) && awk "BEGIN {exit !($cpu <= $EXIT_CPU)}"; then
  state="primary"
fi

mkdir -p "$(dirname "$STATE_FILE")"
cat > "$STATE_FILE" <<EOF
state="$state"
failures=$failures
healthy=$healthy
EOF

# Generate only the upstream include. The existing HTTPS/server configuration
# remains owned by the host's Nginx configuration.
mkdir -p "$(dirname "$NGINX_INCLUDE")"

if [[ "$state" == "overflow" ]]; then
  cat > "$NGINX_INCLUDE" <<EOF
# Managed by Tech Katta overflow controller.
# New requests use the secondary only while the VPS is in overflow state.
set $tech_katta_overflow 1;
proxy_pass $OVERFLOW_UPSTREAM;
EOF
else
  cat > "$NGINX_INCLUDE" <<'EOF'
# Managed by Tech Katta overflow controller.
set $tech_katta_overflow 0;
EOF
fi

nginx -t
systemctl reload nginx

echo "Tech Katta routing state: $state (cpu=$cpu%, health=$health_ok)"
