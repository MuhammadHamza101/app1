# Premium Feature Parity Implementation Plan

## Goal
Achieve parity with leading patent review/analysis tools by closing the gaps called out in `premium-gap-assessment.md` while preserving the existing local-first, authenticated foundation. The plan is organized into parallel workstreams with crisp deliverables, owners, and acceptance criteria.

## Guiding Principles
- **Local-first + offline-ready**: Prefer local processing for ingestion and AI where possible; use opt-in cloud services behind feature flags.
- **Security-first**: MFA, audit trails, and least-privilege defaults are not optional extras.
- **Incremental shipping**: Each sprint should unlock a user-visible capability and come with telemetry and docs.
- **Extensible contracts**: Define clear interfaces for ingestion, search, and AI orchestration to enable swapping providers.

## Workstreams & Milestones (approx. 10-12 weeks)

### 1) Full-Fidelity Ingestion (Weeks 1-3)
**Deliverables**
- Multi-format parsers (PDF, DOCX, ZIP) with metadata extraction (title, assignee, inventors, filing/publication dates, CPC/IPC if present).
- Raw file storage (local disk/S3-compatible) with checksum + versioning.
- Background job queue for batch processing and retry (BullMQ/Redis).
- API + UI update for upload with progress + background status.

**Key Tasks**
- Add `IngestionJob` Prisma model (status, file refs, errors, extracted metadata JSON, checksums, size).
- Wire `src/pages/api/patents/upload` to enqueue jobs and stream status events.
- Implement parsers using `pdf-parse`/`pdf-lib`, `mammoth` for DOCX, `adm-zip` for ZIP; normalize to a canonical `ParsedPatent` DTO.
- Persist originals to storage and extracted text/metadata to DB; attach to patents.
- Add `/patents/uploads` UI to show queue status, errors, retry/cancel.

**Acceptance Criteria**
- A 10MB PDF, DOCX, and ZIP containing multiple files all ingest successfully with metadata populated.
- Upload UI shows queued → processing → complete/failed without page refresh; retries work.
- Corrupted file emits a user-friendly error and is logged with stacktrace.

### 2) Search & Retrieval Depth (Weeks 2-5)
**Deliverables**
- Hybrid keyword + vector search over claims/abstract/description.
- Filters for CPC/IPC, assignee, date ranges, jurisdictions, and upload tags.
- Semantic embeddings store (e.g., PostgreSQL pgvector or local `@qdrant/js-client`).

**Key Tasks**
- Extend Prisma schema with `PatentEmbedding` and `PatentTag` tables; backfill existing records.
- Build an indexing job fed from ingestion outputs to generate embeddings (e.g., `nomic-embed-text` local or OpenAI with feature flag).
- Add search API route combining SQL filters with vector similarity and keyword scoring (BM25 via `@orama` or Postgres full-text).
- Update `/patents` UI with advanced filters and “semantic search” toggle; paginate results with score display.

**Acceptance Criteria**
- Queries return in <1.5s on 5k docs; relevance judged acceptable by test suite of 20 seeded queries.
- Filters combine with semantic search (e.g., assignee + date + vector query) correctly.
- Index stays consistent when new patents are ingested or updated.

### 3) AI-Assisted Analysis Pipelines (Weeks 3-7)
**Deliverables**
- Claim summarization, novelty cues, and risk scoring pipelines with prompt/result logging.
- Configurable provider abstraction (local LLM, OpenAI, Anthropic) with retries and rate-limit handling.
- UI for triggering analyses and viewing outputs per patent and per claim.

**Key Tasks**
- Define `AnalysisRun` model (type, patent_id, status, outputs JSON, prompt hash, model name, tokens, cost).
- Implement orchestrator service to chunk claims, call LLMs, and store results; include guardrails for PII leak prevention.
- Add API endpoints to start/monitor runs and stream progress via SSE/WebSockets.
- Extend patent detail page to show claim tree with summaries, novelty/risk badges, and download report button (PDF/Word via `pdfkit`/`docx`).

**Acceptance Criteria**
- A 50-claim patent completes summarization and scoring within 2 minutes with retries on transient errors.
- Runs are auditable: prompts, model, tokens, timestamps, and user are stored.
- Reports export correctly with all generated insights and source references.

### 4) Review UI & Collaboration Workflows (Weeks 5-9)
**Deliverables**
- Detailed patent workspace with claims tree, inline annotations, prior art links, and approval states.
- Assignment and review queues with role-aware permissions.
- Real-time collaboration (comments, cursors, presence) integrated with permissions.

**Key Tasks**
- Expand UI: `/patents/[id]` workspace with sidebar (claims/metadata), main panel (claim text + annotations), and activity drawer.
- Implement annotations API (Prisma `Annotation` model with target ranges, markdown body, status, assignee).
- Add prior-art linking (link patents to other patents/documents with reasoning field) and approval workflow (pending/approved/rejected).
- Integrate Socket.IO rooms with authorization checks; broadcast annotation/comment/approval updates.

**Acceptance Criteria**
- Two users editing same patent see annotations/comments in real time with correct permissions enforced.
- Assignments surface in “My reviews” list; status changes persist and audit.
- Prior art links display bidirectionally with reasoning.

### 5) Analytics & Reporting (Weeks 7-10)
**Deliverables**
- Portfolio dashboards (by assignee/IPC/jurisdiction), trend charts, and SLA metrics for review throughput.
- Scheduled reports with email delivery and export to PDF/Word.
- Alerting for expiring deadlines or flagged risks.

**Key Tasks**
- Add warehouse-friendly summary tables/materialized views; nightly cron jobs to refresh metrics.
- Build `/analytics` UI with charts (e.g., `recharts`) and filters by team, date, and tags.
- Implement scheduler (cron worker) to generate and send reports; template with handlebars.
- Add alert rules model and notification delivery (email/Slack webhook) with user preferences.

**Acceptance Criteria**
- Dashboards load in <2s on seeded data; filters update charts without reload.
- Scheduled report sends at configured interval and includes latest analyses.
- Alerts fire when thresholds met and respect user preferences.

### 6) Security & Compliance (Weeks 1-8, parallel)
**Deliverables**
- MFA (TOTP + recovery codes), audit trails, data retention policies, and hardened deployment defaults.
- Role-based access with least-privilege presets (admin, reviewer, contributor, viewer).

**Key Tasks**
- Add MFA enrollment/verification flows to auth pages; store TOTP secrets securely; backup codes with one-time use.
- Implement audit log middleware capturing auth events, data access, and configuration changes; expose query UI for admins.
- Data retention: scheduled purges for uploads/analyses per tenant policy; soft-delete with restore window.
- Harden production: security headers, rate limiting, secret rotation playbook, SAST/DAST in CI, backups documented.

**Acceptance Criteria**
- MFA required for all users except during bootstrap; recovery codes usable exactly once.
- Every sensitive action writes an audit record with actor, target, IP, and outcome; admins can filter by user/date/action.
- Retention jobs delete/expire data per policy and are logged; security scans run in CI.

### 7) Desktop Parity & Offline (Weeks 8-12)
**Deliverables**
- Desktop client integrated with new APIs and offline cache for recent patents and analyses.
- Sync engine for background upload and conflict resolution.

**Key Tasks**
- Update Electron/desktop client to consume new search, analysis, and annotation APIs; share auth session securely.
- Implement local cache (SQLite/IndexedDB) with sync layer; queue offline edits/annotations and reconcile on reconnect.
- Add background upload/analysis triggers from desktop with status notifications.

**Acceptance Criteria**
- Desktop app mirrors web workspace features including annotations and reports.
- Offline mode allows viewing cached patents and creating annotations that sync on reconnect without data loss.

## Cross-Cutting Enablement
- **Observability**: OpenTelemetry traces for ingestion/search/AI pipelines; dashboards + alerting in Grafana.
- **Testing**: Add e2e coverage (Playwright/Cypress) for upload → search → analysis → review flow; contract tests for parsers and LLM adapters.
- **Documentation**: Update RUN_NOW/README with new env vars, storage requirements, background workers, and feature flags.

## Deployment & Rollout Checklist
- Staging environment with sample corpora and load tests before enabling features in production.
- Feature flags for AI provider choice, semantic search, and analytics dashboards.
- Backward-compatible DB migrations with data backfill scripts.
- Rollback scripts for workers and search index changes; disaster recovery drills.
