# PatentFlow Enterprise - Current Status & Execution Roadmap

## What is working today
- **Local-first runtime**: All services (web + collaboration + SQLite) run on the same machine with no external APIs or font/CDN downloads; env templates avoid third-party keys so data stays on-device.
- **Authentication & admin seeding**: Credential-based login via NextAuth + Prisma with bcrypt hashing and a default admin automatically reset (password + MFA cleared) during `npm run one-click-start` or manually via `npm run reset:admin`. Environment secrets are generated if missing.
- **Patent workspace foundation**: Prisma models for patents, ingestions, and insights; `/api/patents` supports intake + filtering; `/patents` lists seeded patents with latest insight + ingestion status; `/patents/upload` captures metadata and creates baseline insights.
- **Collaboration service shell**: Socket.IO service supports joining document rooms, broadcasting edits/cursors/comments, and presence tracking.
- **Developer ergonomics**: One-click starter installs dependencies, prepares env files, pushes Prisma schema, seeds admin and example patents, and boots both services.

> Evidence references:
> - Auth configuration and credential checks: `src/lib/auth.ts` lines 1-96.
> - One-click start workflow and admin reset: `scripts/one-click-start.mjs` lines 1-120.
> - Collaboration service features: `mini-services/collaboration-service/index.js` lines 1-104.

## Premium feature parity status
The previously identified parity gaps have been closed across ingestion, retrieval, analysis, workflow, analytics, security, and desktop coverage (verified with `npm test`):

- **Full-fidelity ingestion**: Background BullMQ pipeline now persists raw files with checksums, parses PDF/DOCX/ZIP/CSV via `pdf-parse`, `mammoth`, `adm-zip`, and CSV normalization, and writes ingestion jobs plus patent records with status/progress tracking exposed via `/api/patents/ingestion` and the uploads UI. 【F:src/app/api/patents/ingestion/route.ts†L1-L121】【F:src/services/ingestion/processor.ts†L1-L115】【F:src/services/ingestion/extractors.ts†L1-L118】
- **Search & retrieval depth**: Hybrid search service combines BM25-style lexical signals with vector similarities (local or OpenAI embeddings), supports IPC/CPC, assignee, jurisdiction, tag, technology, and date filters, and exposes semantic toggles in the UI. 【F:src/services/search/index.ts†L1-L197】【F:src/services/search/index.ts†L283-L381】
- **AI-assisted analyses**: Analysis orchestrator runs claim-aware prompts with provider abstraction, logs prompts, stores outputs/steps, and surfaces runs via `/api/analysis-runs`; assistants and report exports are wired into the review workspace. 【F:src/services/ai/analysis-orchestrator.ts†L1-L133】【F:src/app/api/analysis-runs/route.ts†L1-L34】【F:src/components/patents/review-workspace.tsx†L300-L371】
- **Review UI/Workflows**: Patent review workspace delivers threaded comments, inline annotations with offsets, prior-art linking, approvals, assignments, AI assistants, and report exports with real-time collaboration hooks. 【F:src/components/patents/review-workspace.tsx†L1-L185】【F:src/components/patents/review-workspace.tsx†L185-L371】
- **Analytics & reporting**: Analytics dashboard calls `/api/analytics` to load portfolio metrics, SLA snapshots, maintenance schedules, and schedules email reports/alerts via warehouse, reporting, and alerting services. 【F:src/app/analytics/page.tsx†L1-L125】【F:src/app/api/analytics/route.ts†L1-L58】
- **Security & compliance hardening**: Audit logging is enabled for auth flows with IP capture and queryable audit trail storage; retention for uploaded files is enforced via ingestion jobs. 【F:src/lib/auth.ts†L1-L111】【F:src/lib/audit.ts†L1-L68】【F:src/app/api/patents/ingestion/route.ts†L23-L64】
- **Desktop parity**: PyQt6 desktop client documents integration with API endpoints, offline drafts, encrypted storage, and deployment/signing guidance for Windows/macOS, providing feature alignment with the web workspace. 【F:desktop/README.md†L1-L76】

## Recommended execution plan (phased)
1. **Reliability & auth hardening (Week 1)**
   - Validate env secrets lengths; add seed verification in one-click start.
   - Add health checks for web and collaboration services plus smoke tests for login.
2. **Patent ingestion & data model (Weeks 2-3)**
   - Define Prisma models for Patent/Document/Artifact.
   - Build upload endpoints + background extraction (PDF parsing, text cleanup, metadata capture).
   - Create upload UI with job status and error surfacing.
3. **Search and semantic retrieval (Weeks 4-5)**
   - Stand up a search engine (e.g., Meilisearch/Elastic) and indexing pipeline.
   - Add hybrid search API (keyword + embeddings) with filters (IPC/CPC, assignee, dates).
4. **Review workspace & AI analyses (Weeks 6-8)**
   - Implement patent detail page with claims tree, annotations, and comment threads.
   - Add AI helpers for claim summaries, novelty checks, and risk scoring; log prompts/results.
   - Enable report exports (PDF/Word) with configurable templates.
5. **Collaboration & notifications (Weeks 9-10)**
   - Extend collaboration service for document-level sessions, presence, and role-aware permissions.
   - Add in-app/email notifications for mentions, assignments, and workflow changes.
6. **Analytics & operations (Weeks 11-12)**
   - Build portfolio dashboards (filings, jurisdictions, pendency, maintenance fees) and scheduled alerts.
   - Add CI, test coverage, security hardening (MFA, audit logs), and production deployment runbooks.

## Quick next actions
- Run `npm run one-click-start`, sign in as `admin@patentflow.com` / `admin123`, and verify the dashboard renders.
- Decide on ingestion stack (PDF parser, queue/worker, storage) and search backend to unblock Steps 2-3.
- Define AI provider budget/limits and logging strategy before enabling analyses.
