# Security Controls

## Secrets management
- Store all secrets (database, Redis, API keys, encryption keys) in your cloud secret manager or OS keyring. Do not commit `.env` files. Use `.env.example` as the canonical variable list.
- Rotate `FILE_ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, and `QUEUE_UI_SECRET` on a scheduled cadence. Keys should be 32 bytes and stored as `base64:` values.
- CI uses environment variables only; never hardcode credentials into workflows or scripts.

## HTTPS enforcement
- The global `middleware.ts` enforces HTTPS redirects unless `ENFORCE_HTTPS=false` is explicitly set for local debugging.
- Upstream reverse proxies (Caddy/NGINX) must forward `x-forwarded-proto` and terminate TLS with modern ciphers.

## Audit logging
- Authentication successes, MFA failures, and general failures are recorded to `AUDIT_LOG_PATH` (default `./logs/audit.log`).
- Logs are JSONL to ease shipping to SIEM tools. Ensure the log directory is writable by the runtime user and rotate files regularly.
- Admins can query `/api/admin/audit` with filters (`userId`, `action`, `from`, `to`) to review actions without shell access.

### Rate limiting and headers
- `/api` routes are throttled via middleware (defaults: 120 requests/minute per IP; override with `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`).
- Security headers are enforced globally (HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`, XSS protection).

## MFA/2FA
- Users are provisioned with a TOTP secret and backup codes at registration. Auth flows require the one-time code when `twoFactorEnabled` is true.
- Store secrets encrypted at rest (database encryption or disk encryption) and restrict access to the backup codes.

## Data protection and retention
- Uploaded files are encrypted with AES-256-GCM via `FILE_ENCRYPTION_KEY` before entering the ingestion queue.
- Each upload receives a `retentionUntil` timestamp honoring `FILE_RETENTION_DAYS` (default 30). Expired files are skipped during processing to respect retention policies.
- Keep the encryption key outside of the repo and rotate it alongside database backups.
- Run `npm run retention:purge` on a scheduled basis (cron/worker) to delete expired uploads and emit audit entries for removals.

## Operational expectations
- Use least-privilege IAM roles for CI/CD and database access.
- Enable full-disk encryption on hosts running workers and ensure Redis/queue traffic is network-restricted to trusted subnets.

## Secret rotation & scanning
- Rotate `NEXTAUTH_SECRET`, `FILE_ENCRYPTION_KEY`, and SMTP/queue credentials every 90 days or immediately after suspected exposure. Update environment variables in CI/CD and restart services after rotation.
- CI should run SAST (e.g., `npm run lint` plus dependency scanning) and DAST against the deployed preview. Document suppression/acceptance of any findings.
- Backups must include encrypted uploads and the database; store restore runbooks with access-controlled storage.
