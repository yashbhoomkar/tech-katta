# Production audit maintenance workflows

These workflows support the Tech Katta production-readiness audit. They use the VPS backend runtime's existing MongoDB credentials; they must never print the connection URI or secrets.

## Commit-ledger collections

The canonical collections are in `techkatta_history`:

- `frontend_git_commits`
- `backend_git_commits`

Each canonical document uses `key` for the full 40-character Git commit SHA and `value` for a human-readable description. Each canonical collection must enforce a unique `{ key: 1 }` index named `key_unique`.

The legacy duplicate backup is `commit_ledger_duplicate_backup_20261011`. It preserves the original six duplicate documents using string IDs prefixed with `frontend:` or `backend:`.

## Workflows

- **Verify Ledger Maintenance Access** (`.github/workflows/verify-ledger-maintenance-access.yml`): creates a run-specific temporary collection, verifies a true unique index rejects duplicate keys, then removes the collection. It does not change canonical ledger records.
- **Inspect VPS Ledger Database View** (`.github/workflows/inspect-ledger-runtime-db.yml`): read-only comparison of backup rows, canonical records, duplicate groups, and unique-index metadata.
- **Repair Commit Ledger Duplicates** (`.github/workflows/repair-commit-ledger-duplicates.yml`): mutates the canonical ledger. It is intentionally guarded by exact backup validation, an exact duplicate-ID set, canonical-row checks, rollback logic, document-count checks, and SHA-union reconciliation.

## Safety rules

1. Prefer the read-only inspector before any migration.
2. Never delete a row unless its exact original ID, key, value, and backup copy have been verified.
3. Never relax a failed preflight just to make a workflow pass.
4. After a migration, verify both indexes report `unique: true`, no duplicate groups remain, the backup is intact, and all documented SHAs still exist.
5. These workflows are separate from application deployment and should not restart the production service.
6. Semgrep and CodeQL are static-analysis checks; unit tests, browser smoke checks, low-load probes, capacity tests, and AI PR reviews are separate kinds of evidence.

## AI review versus CI

An AI review must appear as a GitHub review submission, review walkthrough, or substantive inline review comments visible through GitHub's pull-request review APIs. A Vercel preview status, green CI check, Semgrep result, CodeQL result, or a bot message that only says “review in progress” is not evidence that an AI review completed.
