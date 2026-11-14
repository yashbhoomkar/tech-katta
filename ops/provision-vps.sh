#!/usr/bin/env bash
# Turns a fresh Ubuntu (22.04 or newer) or Debian 12 VPS into a Tech Katta API server that the deploy workflow
# (.github/workflows/deploy-backend.yml) can deploy to unchanged. Safe to run again: every step checks first.
#
#   As root on the new server:
#     curl -fsSL https://raw.githubusercontent.com/yashbhoomkar/tech-katta/main/ops/provision-vps.sh -o provision-vps.sh
#     bash provision-vps.sh                       # installs the project's deploy key (ops/deploy-key.pub)
#     bash provision-vps.sh "ssh-ed25519 AAAA…"   # or: this public key instead
#   With no ops/deploy-key.pub in the repository yet (the very first move), it makes a key and prints it.
#   Options (environment): DEPLOY_USER (default deploy), HARDEN_SSH=1 (keys only, no root password login),
#   DEPLOY_PUBKEY_URL (where the project's deploy key is read from),
#   SKIP_FIREWALL=1 (testing in a container that shares its host's network only).
#
# What it sets up (HOSTING.md, "To another Linux VPS"):
#   - Node 22, Git, Nginx, UFW, unattended security upgrades; 2 GB of swap on small machines
#   - user techkatta (runs the API) and the deploy user (the workflow's SSH user, passwordless sudo)
#   - /opt/tech-katta (checkout of main), /var/lib/tech-katta/content/releases + current (first release)
#   - systemd service tech-katta-api (the workflow adds its settings in a drop-in)
#   - Nginx on 443 for tech-api.katta.cc → 127.0.0.1:5000, real visitor IP from CF-Connecting-IP trusted only
#     from Cloudflare's ranges; TLS from /etc/tech-katta/tls/origin.{pem,key} (a Cloudflare Origin certificate;
#     a self-signed stand-in until it is installed)
#   - firewall: SSH open, 80/443 only from Cloudflare's published ranges
# It prints what to put in the GitHub secrets VPS_HOST, VPS_USER, VPS_FINGERPRINT (and VPS_SSH_KEY when it made the key).
set -euo pipefail

REPO=https://github.com/yashbhoomkar/tech-katta.git
API_HOST=tech-api.katta.cc
DEPLOY_USER=${DEPLOY_USER:-deploy}
APP=/opt/tech-katta
BASE=/var/lib/tech-katta/content
TLS=/etc/tech-katta/tls
PUBKEY=${1:-}
DEPLOY_PUBKEY_URL=${DEPLOY_PUBKEY_URL:-https://raw.githubusercontent.com/yashbhoomkar/tech-katta/main/ops/deploy-key.pub}

[ "$(id -u)" = 0 ] || { echo "Run as root (sudo bash $0)."; exit 1; }
say() { printf '\n== %s\n' "$*"; }
export DEBIAN_FRONTEND=noninteractive

say "Packages"
apt-get update -q
apt-get install -y -q ca-certificates curl git gnupg nginx ufw openssl unattended-upgrades >/dev/null
if ! command -v node >/dev/null || ! node -v | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -q nodejs >/dev/null
fi
echo "node $(node -v), npm $(npm -v), nginx $(nginx -v 2>&1 | sed 's/.*\///')"

say "Swap (only when the machine has under 3 GB of memory and no swap)"
if [ "$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)" -lt 3000 ] && ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "2 GB swap added"
else echo "not needed"; fi

say "System log size"
# The old server's journal grew to 184 MB of memory; on a 1 GB machine keep it small (disk and memory).
install -d /etc/systemd/journald.conf.d
printf '%s\n' '[Journal]' 'SystemMaxUse=100M' 'RuntimeMaxUse=50M' > /etc/systemd/journald.conf.d/90-tech-katta.conf
systemctl restart systemd-journald && echo "journal capped at 100 MB"

say "Users"
id techkatta >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/techkatta --shell /usr/sbin/nologin techkatta
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$DEPLOY_USER"
HOME_DIR=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$HOME_DIR/.ssh"
# A key made here is kept root-only in /root/tech-katta-deploy-key until you have copied it into the GitHub secret
# VPS_SSH_KEY (each run prints it again, so a run that fails later loses nothing); then delete that file.
KEYFILE=/root/tech-katta-deploy-key
# the project's own deploy key, the same on every server, so the GitHub secret VPS_SSH_KEY never changes
if [ -z "$PUBKEY" ] && [ ! -s "$KEYFILE" ]; then
  REPOKEY=$(curl -fsS "$DEPLOY_PUBKEY_URL" 2>/dev/null | grep -E '^ssh-(ed25519|rsa) ' | head -1 || true)
  [ -n "$REPOKEY" ] && PUBKEY=$REPOKEY && echo "deploy key: the project's (ops/deploy-key.pub)"
fi
if [ -z "$PUBKEY" ] && [ ! -s "$HOME_DIR/.ssh/authorized_keys" ] && [ ! -s "$KEYFILE" ]; then
  ssh-keygen -q -t ed25519 -N '' -C "github-actions-deploy@$API_HOST" -f "$KEYFILE"
  chmod 600 "$KEYFILE"
fi
[ -z "$PUBKEY" ] && [ -s "$KEYFILE.pub" ] && PUBKEY=$(cat "$KEYFILE.pub")
if [ -n "$PUBKEY" ]; then
  touch "$HOME_DIR/.ssh/authorized_keys"
  grep -qxF "$PUBKEY" "$HOME_DIR/.ssh/authorized_keys" || echo "$PUBKEY" >> "$HOME_DIR/.ssh/authorized_keys"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$HOME_DIR/.ssh/authorized_keys" 2>/dev/null || true
chmod 600 "$HOME_DIR/.ssh/authorized_keys" 2>/dev/null || true
# The workflow runs systemctl, journalctl, mkdir, chown, tee, sh and sudo -u techkatta. sudo for sh is root in
# all but name, so this is plain passwordless sudo, for a user that can only log in with the deploy key.
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-tech-katta-deploy
chmod 440 /etc/sudoers.d/90-tech-katta-deploy && visudo -cq

say "Code and first content release"
install -d -o techkatta -g techkatta "$APP" /var/lib/tech-katta "$BASE" "$BASE/releases"
[ -d "$APP/.git" ] || sudo -u techkatta git clone --quiet "$REPO" "$APP"
sudo -u techkatta git -C "$APP" fetch --quiet origin main
sudo -u techkatta git -C "$APP" reset --quiet --hard origin/main
sudo -u techkatta bash -c "cd $APP/backend && npm ci --omit=dev --silent"
if [ ! -e "$BASE/current" ]; then
  NAME="$(date -u +%Y%m%dT%H%M%SZ)-$(sudo -u techkatta git -C "$APP" rev-parse --short=7 HEAD)"
  sudo -u techkatta cp -a "$APP/content" "$BASE/releases/$NAME"
  sudo -u techkatta node "$APP/backend/scripts/check-content.mjs" "$BASE/releases/$NAME"
  sudo -u techkatta ln -sfn "$BASE/releases/$NAME" "$BASE/current"
  echo "content release $NAME"
fi

say "Service tech-katta-api"
cat > /etc/systemd/system/tech-katta-api.service <<'UNIT'
[Unit]
Description=Tech Katta API
After=network-online.target
Wants=network-online.target

[Service]
User=techkatta
Group=techkatta
WorkingDirectory=/opt/tech-katta
ExecStart=/usr/bin/node backend/src/server.js
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
UNIT
# the same settings the deploy writes, so the API runs correctly before the first deploy
install -d /etc/systemd/system/tech-katta-api.service.d /etc/tech-katta
[ -f /etc/systemd/system/tech-katta-api.service.d/production.conf ] || printf '%s\n' '[Service]' 'Environment=NODE_ENV=production' \
  'Environment=HOST=127.0.0.1' 'Environment=PORT=5000' 'Environment=FRONTEND_ORIGIN=https://tech.katta.cc' \
  "Environment=CONTENT_DIR=$BASE/current" 'EnvironmentFile=-/etc/tech-katta/api.env' > /etc/systemd/system/tech-katta-api.service.d/production.conf
systemctl daemon-reload
systemctl enable --now tech-katta-api >/dev/null
systemctl restart tech-katta-api
for _ in $(seq 1 20); do curl -fsS http://127.0.0.1:5000/health >/dev/null 2>&1 && break; sleep 1; done
curl -fsS http://127.0.0.1:5000/health && echo

say "Cloudflare ranges"
# IPv6 only where the machine has it (nginx refuses [::] listens and ufw v6 rules otherwise)
HAS6=0; [ -s /proc/net/if_inet6 ] && HAS6=1
L6(){ [ "$HAS6" = 1 ] && echo " listen [::]:$1${2:+ $2};" || true; }
V4=$(curl -fsS https://www.cloudflare.com/ips-v4); V6=$(curl -fsS https://www.cloudflare.com/ips-v6)
[ -n "$V4" ] && [ -n "$V6" ] || { echo "Could not fetch Cloudflare's ranges."; exit 1; }
{ echo "# Cloudflare's ranges ($(date -u +%F)); written by ops/provision-vps.sh"
  for c in $V4 $V6; do echo "set_real_ip_from $c;"; done   # trusting v6 ranges is harmless without IPv6
  echo "real_ip_header CF-Connecting-IP;"; echo "real_ip_recursive on;"; } > /etc/nginx/snippets/cloudflare-real-ip.conf

say "TLS"
install -d -m 700 "$TLS"
if [ ! -s "$TLS/origin.pem" ] || [ ! -s "$TLS/origin.key" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=$API_HOST" -keyout "$TLS/origin.key" -out "$TLS/origin.pem" 2>/dev/null
  echo "self-signed stand-in written; install the Cloudflare Origin certificate before pointing DNS here"
else echo "certificate present"; fi
chmod 600 "$TLS/origin.key"

say "Nginx"
cat > /etc/nginx/sites-available/tech-api <<NGINX
server {
  listen 80;$(L6 80)
  server_name $API_HOST;
  return 301 https://\$host\$request_uri;
}
server {
  listen 443 ssl http2;$(L6 443 'ssl http2')
  server_name $API_HOST;
  ssl_certificate $TLS/origin.pem;
  ssl_certificate_key $TLS/origin.key;
  ssl_protocols TLSv1.2 TLSv1.3;
  include /etc/nginx/snippets/cloudflare-real-ip.conf;
  client_max_body_size 1m;
  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_read_timeout 90s;
  }
}
NGINX
ln -sfn /etc/nginx/sites-available/tech-api /etc/nginx/sites-enabled/tech-api
rm -f /etc/nginx/sites-enabled/default
nginx -t -q
systemctl enable nginx >/dev/null 2>&1; systemctl reload-or-restart nginx

if [ "${SKIP_FIREWALL:-0}" = 1 ]; then say "Firewall: skipped (SKIP_FIREWALL=1)"; else
say "Firewall"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp comment 'SSH (GitHub Actions deploys)' >/dev/null
RANGES=$V4; [ "$HAS6" = 1 ] && RANGES="$V4 $V6"
for c in $RANGES; do ufw allow proto tcp from "$c" to any port 80,443 comment 'Cloudflare' >/dev/null; done
ufw --force enable >/dev/null
ufw status | head -5
fi

if [ "${HARDEN_SSH:-0}" = 1 ]; then
  say "SSH: keys only"
  printf '%s\n' 'PasswordAuthentication no' 'KbdInteractiveAuthentication no' 'PermitRootLogin prohibit-password' > /etc/ssh/sshd_config.d/90-tech-katta.conf
  sshd -t && (systemctl reload ssh 2>/dev/null || systemctl reload sshd)
fi

IP=$(curl -fsS -4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
FP=$(ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256 | awk '{print $2}')
say "Done. In GitHub → tech-katta → Settings → Secrets and variables → Actions → Variables, set:"
echo "VPS_HOST        = $IP"
echo "VPS_USER        = $DEPLOY_USER"
echo "VPS_FINGERPRINT = $FP"
if [ -s "$KEYFILE" ]; then
  echo
  echo "First move only: a new deploy key was made. Under Secrets (not Variables), set"
  echo "VPS_SSH_KEY     = the whole private key below, from -----BEGIN to -----END,"
  echo "and commit its public half to the repository as ops/deploy-key.pub, so later servers use the same key:"
  echo "  $(cat "$KEYFILE.pub")"
  echo "Then delete this copy: rm $KEYFILE $KEYFILE.pub"
  echo; cat "$KEYFILE"; echo
fi
echo
echo "Next (ops/README.md): Actions → Deploy Tech Katta Backend → Run workflow with \"Moving servers\" ticked;"
echo "then Actions → Point API at the server. The deploy installs the Origin certificate from the ORIGIN_CERT secret."
