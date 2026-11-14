# Changing the API server

The API (`tech-api.katta.cc`) runs on one Linux VPS behind Cloudflare. Nothing on that server is precious: the code
and content come from this repository, accounts and history live in MongoDB Atlas, and every setting the server
needs is in GitHub. So moving to another VPS (another provider, a bigger plan, a rebuild) is a fresh server plus
three values. Tested end to end on 2026-11-14 on a fresh Ubuntu 24.04 machine.

## What is where

| Setting (GitHub → tech-katta → Settings → Secrets and variables → Actions) | Kind | Changes per server? |
|---|---|---|
| `VPS_HOST` (IPv4 address), `VPS_USER` (`deploy`), `VPS_FINGERPRINT` (`SHA256:…`) | **Variables** (visible, editable) | **Yes**: printed by the script |
| `VPS_SSH_KEY` (the deploy key's private half; its public half is `ops/deploy-key.pub`) | Secret | No |
| `ORIGIN_CERT`, `ORIGIN_KEY` (Cloudflare Origin certificate for `tech-api.katta.cc`, valid 15 years) | Secrets | No |
| `CLOUDFLARE_API_TOKEN` (Zone → DNS → Edit on katta.cc) | Secret | No |
| `GOOGLE_CLIENT_ID`, `MONGODB_URI`, `SESSION_SECRET` (sign-in; required: the deploy stops without them) | Secrets | No |
| Optional private settings: `AI_API_KEY` (the interviewer's model key), `ADMIN_EMAILS` | Secrets | No |
| Optional settings: `AI_ENABLED`, `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`, `AI_JSON_MODE`, `AI_TOKENS_PARAM`, `AI_EXTRA_BODY`, `AI_TIMEOUT_MS`, `AI_MAX_OUTPUT_TOKENS`, `AI_MONTHLY_REVIEWS`, `AI_DAILY_REVIEWS`, `AI_DAILY_TOKEN_CAP`, `AI_ALLOW`, `JUDGE_WORKERS` (meanings and defaults: `backend/.env.example`) | Variables | No |

Secrets of the same names as the three server variables also work (the variables win).

## The server keeps nothing of its own

Every file on the server is rebuilt from GitHub, so a server can be thrown away at any time:

| On the server | Comes from | Rebuilt by |
|---|---|---|
| Code `/opt/tech-katta`, content releases `/var/lib/tech-katta/content` | this repository (`main`) | every deploy |
| API settings `/etc/tech-katta/api.env` (the whole file) | the secrets and variables above | every deploy (it replaces the file and lists, by name only, any setting it removed) |
| Origin certificate `/etc/tech-katta/tls` | secrets `ORIGIN_CERT` / `ORIGIN_KEY` | every deploy |
| Service settings (systemd drop-in) | `deploy-backend.yml` | every deploy |
| Node, Nginx, firewall, users, deploy key's public half | `provision-vps.sh`, `ops/deploy-key.pub` | the setup command |
| Accounts, progress, history | MongoDB Atlas (not on the server) | — |
| System logs | made on the server, capped at 100 MB, lost on a move (nothing needs them) | — |

**Rule:** never set anything on a server by hand. A new setting goes into GitHub (a secret if private, else a
variable) and its name into the lists in `deploy-backend.yml` ("Prepare API settings"); the next deploy writes it.

## Every move (about 15 minutes, no downtime)

1. **Buy a VPS**: Ubuntu 24.04 (22.04, 26.04 and Debian 12 also work), at least 1 vCPU and 1 GB memory (2 GB is
   comfortable), public IPv4, India region. Root access by password or key.
2. **Set it up**, as root on the new server (provider console or `ssh root@IP`), one command, about 3 minutes:

   ```
   curl -fsSL https://raw.githubusercontent.com/yashbhoomkar/tech-katta/main/ops/provision-vps.sh -o p.sh && bash p.sh
   ```

   It installs Node 22, Nginx, the firewall (SSH open; 80/443 only from Cloudflare), the service and the deploy
   user with the project's deploy key, and serves the API on its own. It prints the three variables.
3. **In GitHub**, set the variables `VPS_HOST`, `VPS_USER`, `VPS_FINGERPRINT` to what it printed.
4. **Actions → "Deploy Tech Katta Backend" → Run workflow**, with **"Moving servers"** ticked. It deploys main,
   writes every API setting from GitHub and the Origin certificate, and checks the API on the server.
5. **Actions → "Point API at the server" → Run workflow.** It checks the new server over SSH (API, Nginx, the
   Cloudflare certificate), refuses if anything is wrong, moves the `tech-api` DNS record (proxied) and waits until
   the public API serves the new server's release. It prints the old address for undoing.

Then let the old plan lapse. Optional: `HARDEN_SSH=1 bash p.sh` on the new server turns off password logins.

**Undo:** run "Point API at the server" with the old address (until the old plan ends).

## One-time setup (first move only)

- **Origin certificate:** Cloudflare → katta.cc → SSL/TLS → Origin Server → Create Certificate (RSA (2048),
  hostname `tech-api.katta.cc`, 15 years). Save the certificate as secret `ORIGIN_CERT` and the private key as
  `ORIGIN_KEY`. (The zone's SSL mode is Full (strict); Cloudflare trusts this certificate, browsers never see it.)
- **Cloudflare token:** Cloudflare → My Profile → API Tokens → Create Token → template "Edit zone DNS" → zone
  katta.cc. Save it as secret `CLOUDFLARE_API_TOKEN`.
- **Deploy key:** while `ops/deploy-key.pub` is not in the repository, the script makes a key and prints it: save
  the private half as secret `VPS_SSH_KEY` and commit the printed public line as `ops/deploy-key.pub` (it is public).
  Every later server then gets the same key and the secret never changes.
- **MongoDB Atlas:** the network access list allows `0.0.0.0/0`, so any server can connect (the database is still
  password-protected). To lock it to one server instead, list that server's IP and add a step to this checklist.

## Provider notes

- **AWS Lightsail** (Mumbai, `ap-south-1`): create an Ubuntu 24.04 instance; in its **Networking** tab, **create a
  static IP and attach it** (free while attached; without it the address changes on every stop/start) and **add a
  firewall rule for HTTPS (443)** (only 22 and 80 are open by default). Lightsail's own firewall can stay open to
  all on 80/443: the server's firewall lets only Cloudflare through. Log in with the browser SSH button and run the
  setup command with `sudo bash p.sh`.
- **OVHcloud** (the chosen plan: VPS-1, Mumbai): order VPS-1, location Mumbai (Asia-Pacific), image Ubuntu 24.04,
  monthly. The login details (user `ubuntu` or root, password) arrive by email; run the setup command with `sudo`.
  The IPv4 address is fixed. Leave OVH's "Network firewall" off (the server's firewall lets only Cloudflare in); if
  used, allow 22, 80 and 443. Asia-Pacific VPS-1 includes 500 GB of traffic a month (we use a few GB).
- **Akamai Cloud (Linode)** (the second choice: Nanode 1 GB, Mumbai): Create → Linode → image Ubuntu 24.04 LTS, region
  Mumbai (or Chennai), plan Shared CPU → Nanode 1 GB, set a root password. The IPv4 address is fixed. No Cloud Firewall
  is needed (the server's firewall lets only Cloudflare reach 80/443); if one is added, allow 22, 80 and 443. Log in
  with the "Launch LISH Console" button or `ssh root@IP` and run the setup command.
- **Any provider:** a fixed public IPv4 address that survives reboots, and no provider firewall blocking 22/80/443.

## Without a VPS

`backend/Dockerfile` runs the same API on a container platform; see `HOSTING.md`, "To a container platform".

## Choosing a provider

Requirements and the November 2026 comparison (monthly prices in India, Lightsail): tech-katta-context
`31-VPS-CHOICE.md`.
