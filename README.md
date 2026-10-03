# ReliefLedger
A private working demonstration for a societal problem, using fictional data.

## Run locally
Install using `node scripts/install-ci.mjs`, generate schema with `npm run db:generate`, build with `npm run build`. The official Sites supervised preview supports this checkout. Apply Drizzle migrations to the local D1 database before using the API. Production migrations are handled by Sites.

## Architecture
React + TypeScript + Vinext; Cloudflare Worker request handlers; Sites-managed D1 SQLite persistence; Zod validation. No external dispatch, navigation, payments or medical decisions.

The bounded demonstration stores a versioned workspace document in one D1 row. Each mutation reads the revision, validates/recomputes the operation, then atomically updates `WHERE version = expected`. Concurrent writers cannot both succeed; stale clients get 409 and refresh. Stock, demand, plans and activity share one atomic snapshot, preventing partial reservations. This deliberately bounded document model is not intended for large deployments. A production evolution would normalize entities, retain unbounded audit history in separate tables, and introduce organization roles. Limits:100 supply records,100 requests,100 plans or saved routes;300 recent activities;200 audits;1.8MB workspace.

## API
`GET /api/state`:current workspace and revision. `POST /api/state`:a validated action, its revision and parameters. All writes require a same-origin Origin and workspace header. Private Sites access is the authorization boundary; there is no custom public registration. Do not make the site public without adding app-owned authentication and permissions. Actor identity uses the verified Sites identity header, or platform service identity for permitted service requests.

## Business logic
AccessGraph filters link measurements and uses Dijkstra with a bounded age penalty. ReliefLedger maximizes allocation and balances marginal coverage/priority/travel using residual minimum-cost maximum-flow. ReLoop filters verified grade/length/budget/distance compatible material, then maximizes units and minimizes integer-paise costs. Its payload bound uses the heaviest eligible unit. Reservation APIs recompute plans, store idempotency keys, and settle once with delivery/cancellation. No frontend-supplied quantity or price is trusted.

## Testing
`node --experimental-strip-types --test tests/algorithms.test.mjs`
15 meaningful algorithm and reservation tests cover disconnected routes, audit freshness, residual rerouting, fairness, expiration, capacity, specification compatibility, idempotency, cancellation and conservation. `node --test tests/api.test.mjs` runs real Worker/D1 integration checks after a build. Six API checks cover AccessGraph and eight each cover ReliefLedger/ReLoop, including concurrent conflicts, persisted read-back, same-origin protection and reservation replay. TypeScript and Worker builds must pass before publishing.

## Limitations
All geography and organizations are fictional. AccessGraph is not real navigation. Aid allocation has no road/vehicle/time-window or medical triage integration. ReLoop is for nonstructural reuse; evidence labels are not structural certification. Its illustrative transport coefficient (0.00015kg CO2/kg-km) is not an audited emission claim. Real pilots require verified data, domain experts, organization access control, backups, monitoring and scale testing. Browser-only WebMCP read-workspace support is feature detected. Browser interaction and WebMCP validation were unavailable in this environment; rendered HTML was verified through the built Worker.
