# PatentFlow Enterprise - Current Status & Execution Roadmap

## What is working today
- **Local-first runtime**: All services (web + collaboration + SQLite) run on the same machine with no external APIs or font/CDN downloads; env templates avoid third-party keys so data stays on-device.
- **Authentication & admin seeding**: Credential-based login via NextAuth + Prisma with bcrypt hashing and a default admin seeded by `npm run seed:default` (or automatically via `npm run one-click-start`). Environment secrets are generated if missing.
- **Patent workspace foundation**: Prisma models for patents, ingestions, and insights; `/api/patents` supports intake + filtering; `/patents` lists seeded patents with latest insight + ingestion status; `/patents/upload` captures metadata and creates baseline insights.
- **Collaboration service shell**: Socket.IO service supports joining document rooms, broadcasting edits/cursors/comments, and presence tracking.
- **Developer ergonomics**: One-click starter installs dependencies, prepares env files, pushes Prisma schema, seeds admin and example patents, and boots both services.

> Evidence references:
> - Auth configuration and credential checks: `src/lib/auth.ts` lines 1-96.
> - One-click start workflow and seeding: `scripts/one-click-start.mjs` lines 1-120.
> - Collaboration service features: `mini-services/collaboration-service/index.js` lines 1-104.

## What is missing to match premium patent tools
- **Full-fidelity ingestion**: No parsing of PDFs/DOCX/ZIP or automated metadata extraction; no queue/worker for large batches; no storage of raw files.
- **Search & retrieval depth**: No external index (keyword/semantic), classification filters, or vector search; current filtering is SQLite-only.
- **AI-assisted analysis**: No LLM-backed claim review, novelty checks, risk scoring, or summarization workflows beyond seeded insights.
- **Review UI/Workflows**: No patent-centric workspace (claims tree, prior art linking, annotations, approvals) beyond the new list + intake forms.
- **Analytics & reporting**: No portfolio metrics, alerts, or exportable reports.
- **Security & compliance hardening**: No MFA, audit trails, data retention policies, or production deployment guidance.
- **Desktop parity**: Desktop app not integrated with new APIs or offline workflows.

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
