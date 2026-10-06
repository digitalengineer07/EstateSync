# EstateSync one-user load test

Run from `backend` with Node and local PostgreSQL binaries installed. No k6 installation is needed: this runner uses the application's existing test infrastructure and Node HTTP client. It creates its own temporary PostgreSQL cluster and local API, ignoring your configured database URL. It removes only that temporary cluster at completion and keeps a JSON report.

## Recommended first run (PowerShell)

```powershell
cd 'D:\devoxa technologies\EstateSync\backend'
$env:DOCUMENT_TEST_POSTGRES_BIN = 'D:\Program Files\PostgreSQL\17\bin'
$env:LOAD_RECORDS = '10000'
$env:LOAD_ROUNDS = '5'
$env:LOAD_PAUSE_MS = '1000'
npm run test:load
```

Increase `LOAD_RECORDS` to `100000` after the initial run. For one crore:

```powershell
$env:LOAD_RECORDS = '10000000'
$env:LOAD_LARGE_DATASET = 'YES'
npm run test:load
```

One crore means **10 million synthetic rows across tables**, plus a small number of accounts and workflow fixtures:

| Table | Rows at 1 crore |
| --- | ---: |
| Customer | 1,000,000 |
| JournalEntry | 1,000,000 |
| JournalLine | 2,000,000 |
| OperationalNote | 2,000,000 |
| AuditLog | 4,000,000 |

Journals have matching debit/credit lines on dedicated synthetic accounts. Rows are inserted in bounded batches, with dates spread over 730 days and database statistics refreshed afterward. This is not 10 million customers, complete financial workflows, or uploaded documents. These tables exercise large lists, accounting aggregation, search and audit queries; other modules retain small workflow fixtures. Account for disk space for tables, indexes and PostgreSQL WAL before a large run. Seeding is not included in HTTP timings. Do not assume the full-scale run is fast or will pass.

## What runs

1. Existing document unit/integration tests (63 tests).
2. Isolated role/account fixtures and the configurable dataset.
3. Existing customer, property, payment, expense and fund-request workflow checks, including malformed inputs. Roles act sequentially in this phase.
4. One authenticated admin session browsing 31 API paths sequentially: dashboards, customers/detail, properties, accounts/journals, audit, transactions, treasury, expenses, fund requests, users, employees/salary summary, periods, billing plans/demands/statement/aging/reconciliation, notes/statistics, notifications, search and document review/summary. Refresh occurs between passes; logout occurs at the end.

There is one HTTP request in flight during the performance phase. This measures a single user's backend experience, not concurrent-user capacity. Production rate limits remain enabled; HTTP 429 is recorded as failure, not hidden.

## Results

Reports are saved to `docs/qa/load-tests/<timestamp>.json`. Each route includes sample count, failures, p95 latency and largest response size; raw samples retain status, bytes and duration. With only a few passes, p95 is a rough indicator—use more passes for stronger evidence.

Default pass criteria: every measured request succeeds, p95 below 2 seconds per route, and the functional workflows pass. A request times out after 30 seconds, including reading its body. Responses above 20 MiB fail rather than exhausting the client. Five failures in a pass stop subsequent passes. Failures return a nonzero exit code; read the JSON and console diagnostics. Setup or document-test failures stop before performance reporting.

Some existing APIs ignore pagination parameters; the test intentionally exposes that rather than masking it. At large scale they may be slow, exceed the response limit, or exhaust the isolated server's memory. A cancelled HTTP request does not guarantee that the backend has cancelled its database query.

## Scope limits

This is broad regression and backend performance coverage, not proof that every feature is correct. It does not exercise every role/action combination, every payroll lifecycle, external S3 infrastructure, browser rendering, or production hardware/network conditions. Run `npm run test:security` and `node scripts/test_documents_local.js --security` separately for the security/concurrency suite. Existing production data is never used.

A small verification run is not a capacity claim for 1 crore records. Run the large profile explicitly and evaluate its report before making that claim.

## 1,000 concurrent users

```powershell
cd 'D:\devoxa technologies\EstateSync\backend'
$env:DOCUMENT_TEST_POSTGRES_BIN = 'D:\Program Files\PostgreSQL\17\bin'
$env:LOAD_RECORDS = '10000'
$env:LOAD_USERS = '1000'
$env:LOAD_RAMP_SECONDS = '30'
$env:LOAD_HOLD_SECONDS = '60'
$env:LOAD_THINK_MS = '3000'
npm run test:load:1000
```

This separate read-heavy profile ramps through 50, 100, 250, 500 and 1,000 users. Each stage ramps for 30 seconds and holds for 60 seconds after its users authenticate. Allow roughly 8–10 minutes, including setup and draining requests. Each virtual user has a separate temporary account and session, with one request at a time and randomized think time averaging three seconds. These are active simulated users, not 1,000 simultaneous requests every second.

The fixture users have ADMIN access and browse ten representative API routes. The earlier functional workflow suite runs before concurrent traffic. This is not a simultaneous financial-write test, a representative production role mix, or a browser UI test.

The runner sends unique synthetic client IP headers **only to its disposable loopback server**, exercising the existing trusted-proxy configuration. Rate limits are unchanged; 429 responses are counted separately and also count as failures. This models distinct clients, not 1,000 staff sharing one office IP.

Reports named `concurrent-<timestamp>.json` contain requested/authenticated/peak active users, peak in-flight requests, stage results, overall requests/second and per-route mean/p95/p99 timings, failures and response sizes. Histograms keep client memory bounded. Reads stream bodies and validate status/content type/size; the preceding functional suite checks business behavior.

Pass criteria: the target user count is reached, fewer than 1% requests fail, every route has p95 below two seconds, and functional workflows pass. More than 10% failures in a ten-second monitoring window containing at least 100 requests stops further ramping. Failure to authenticate the target within a stage deadline also stops the test. Requests exceeding 30 seconds or two MiB fail. A lower stage failing is useful evidence; it does not mean the runner successfully tested 1,000 active users.

Start with 10,000 records. Do not combine 1,000 users and 1 crore records as the first run. The generator, API and database share your computer, so results are local capacity measurements. A small smoke test validates the script, not 1,000-user capacity. For a shorter trial, set `LOAD_USERS=50` before running the same command.

### Per-stage latency reporting

Each stage now records separate ramp and steady summaries. After the target users authenticate, the runner pauses new reads and drains ramp requests. It then measures a 60-second steady window, pauses again and finishes all requests started in that window before increasing the load. Requests are attributed to the phase in which they started, so slow requests are not reassigned to the next stage.

Each stage includes per-route mean/p95/p99, failures, sample count, measurement and drain durations, throughput, worst-route p95 and a pass result. A passing steady stage requires every read route to have at least 20 samples, p95 below two seconds, fewer than 1% failures, the requested active-user count, and the complete hold duration. Login timings appear in the ramp results, not in steady read latency. The report also identifies the highest observed passing stage; this is a local read-workload result, not a guaranteed production limit.
