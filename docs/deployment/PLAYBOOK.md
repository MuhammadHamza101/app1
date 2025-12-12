# Deployment Playbook

## Containers
- Build production image with `npm run build` followed by containerizing `.next/standalone` and `public/` assets. Sample Dockerfile snippet:
  ```dockerfile
  FROM node:20-alpine AS runner
  WORKDIR /app
  COPY .next/standalone ./
  COPY .next/static ./ .next/static
  COPY public ./public
  ENV NODE_ENV=production
  CMD ["node", "server.js"]
  ```
- Pass secrets via environment variables (see `.env.example`). Avoid baking them into images.

## Database (production)
- Use managed Postgres. Set `DATABASE_URL` accordingly and run `prisma migrate deploy` during release.
- Enable at-rest encryption and automated backups. Restrict network access to app + worker nodes only.

## Search cluster
- Provision Elasticsearch/OpenSearch at `SEARCH_CLUSTER_URL` with TLS enabled and IP allow-lists.
- Configure snapshot/restore to object storage and monitor cluster health (heap pressure, shard allocation).

## Redis & queue workers
- Use managed Redis with TLS. Point `REDIS_URL` to the TLS endpoint and require AUTH/ACL.
- Run BullMQ workers with the same `REDIS_URL` and `QUEUE_UI_SECRET` secrets. Scale workers horizontally; set concurrency per CPU core.
- Deploy a metrics dashboard (e.g., Bull Board or custom Grafana) pointed at Redis for queue visibility.

## HTTPS & edge
- Place Caddy/NGINX or cloud LB in front of the app. Forward `x-forwarded-proto` and set HSTS.
- Enable Web Application Firewall rules for auth endpoints and file uploads.

## Zero-downtime rollout
- Use blue/green or rolling deployments. Run `npm run lint && npm run test` in CI before promotion.
- Keep a database migration step gated behind a maintenance toggle or feature flag for risky schema changes.

## Observability
- Ship `logs/audit.log` and application logs to your SIEM. Configure alerts for repeated MFA failures and ingestion errors.
- Enable uptime checks for `/api/health` (add upstream if absent) and queue lag monitors for ingestion workers.
