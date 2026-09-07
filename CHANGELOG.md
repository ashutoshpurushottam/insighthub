# Changelog

All notable changes to InsightHub are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-09-07

[GitHub release](https://github.com/ashutoshpurushottam/insighthub/releases/tag/v1.1.0)

### Added

- Shared TypeScript helpers and Zod schemas (`api-errors`, `formatters`, `query-keys`, `list-utils`, `runner-utils`, and related form schemas)
- Vitest coverage for shared helpers and report-engine components/pages
- Vite bootstrap stubs for local frontend development
- Drill-down parent navigation context in child report URLs (`_ihFrom` / `_ihFromPage`) so Back can restore the parent report
- Execute API `DrillDownInfo.paramMappings` so the UI maps parent columns to child parameters correctly

### Changed

- Richer report runner results table (client-side sort), export toolbar, and pagination UX
- Enriched chart, job history, and dashboard views
- Report runner remounts cleanly when switching report IDs so execution state does not leak across reports
- Child drill-down reports auto-run when required parameters are satisfied
- URL parameter overrides merge with report defaults without wiping missing keys

### Fixed

- Drill-down Back button no longer relies on brittle `navigate(-1)` history; it returns to the parent report path and re-runs (#1, #4)
- Restored missing backend auth / JWT stack required for local login
- CORS allows Vite origins on `localhost` and `127.0.0.1` (ports `3000` and `5173`)

### Pull requests

- [#3](https://github.com/ashutoshpurushottam/insighthub/pull/3) — Improve report UI, dashboards, and test coverage
- [#4](https://github.com/ashutoshpurushottam/insighthub/pull/4) — Fix drill-down Back button and auto-run
- [#5](https://github.com/ashutoshpurushottam/insighthub/pull/5) — Promote `dev` to `main` for v1.1.0

## [1.0.0] - 2026-07-22

[GitHub release](https://github.com/ashutoshpurushottam/insighthub/releases/tag/v1.0.0)

### Added

- Initial full feature set: reports, parameters, datasources, dashboards, jobs/scheduling, RBAC, guardrails, exports, and REST API

[1.1.0]: https://github.com/ashutoshpurushottam/insighthub/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ashutoshpurushottam/insighthub/releases/tag/v1.0.0
