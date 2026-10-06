# Customer and summary read optimization

Implemented on `new-features-branch`. All performance and mutation checks use disposable local PostgreSQL databases. No production data was changed.

## Customer API and UI

`GET /api/v1/customers?page=1&limit=25&status=ACTIVE&search=...` now applies `take`/`skip` in PostgreSQL, selects table fields only, and sorts by `createdAt DESC, id DESC`. Default page size is 25; maximum is 100. Invalid page sizes/statuses are rejected. Search covers customer, plot, project location and khata and treats `%`/`_` literally. Existing owner/permission restrictions apply to the page, count and summary.

The response adds `pagination: { page, limit, total, totalPages, hasNextPage }`. Each row has `_count.payments` instead of payment history. Payment counts are restricted to customer IDs on the requested page. Portfolio totals still cover **all authorized non-cancelled customers**, regardless of the page/search/status filter, matching the former KPI behavior.

The UI uses Previous/Next, sends filters to the server, debounces search, ignores superseded responses, and loads the full authorized customer detail before opening a statement, edit, payment or refund dialog. Search highlights outside the current page resolve one record through the detail endpoint. Statements retain full payment history. Deploy frontend and backend together because the list response no longer includes histories.

## Summaries and invalidation

Admin/accounting dashboard routes share one aggregate implementation and cache entry. Independent aggregates run together on a cold refresh to avoid successive waits in a busy connection pool. Existing sums/counts and access guards are retained. Document summary counts start from document records and check source existence through primary keys; missing-evidence counts scan only source types with applicable evidence rules and omit display joins. Receipt exceptions, refunds, bank-reference payment modes and sensitive-document permission scopes are preserved. The “verified today” boundary now compares UTC database timestamps against the start of the Indian calendar day explicitly, independent of the PostgreSQL session timezone.

Presentation summaries cache for five seconds. Concurrent misses share one loader. Every lookup reads a small `SummaryRevision` row; database statement triggers update it in the same transaction as relevant customer/payment/property/wallet/expense/fund-request/user/role/document/reference changes. This covers other backend instances and database maintenance writes. Rollbacks also roll back invalidation. An in-flight older revision cannot overwrite a newer entry. Cache keys include the customer ownership scope or document module/sensitive permissions, policy and Indian calendar day. Permission checks run before cache lookup. Missing/unavailable revision information disables caching for that read.

Payment validation, balance checks, detail records and writes never use this summary cache. The revision row adds a short write synchronization point; write-heavy throughput has not been benchmarked. Summary reads already in progress during a write can reflect their earlier snapshot, but subsequent requests see the committed revision.

## Index deployment

The measured indexes are:

- `Customer(createdAt DESC, id DESC)` for global page ordering.
- `Customer(salesOwnerId, createdAt DESC, id DESC)` for owner-scoped pages.
- `CustomerPayment(customerId, dateOfPayment DESC)` for page-specific counts and full statements.

Existing document source/status indexes and financial source primary keys are reused. No blanket status/sum indexes were added: broad portfolio totals still need to aggregate the authorized data. In particular, an index does not remove the cost of exact counts or substring searches over large populations.

Run the additive index upgrade from the deployed backend directory against its intended database:

```powershell
Set-Location 'D:\devoxa technologies\EstateSync\backend'
npm run db:read-indexes
```

It uses `CREATE INDEX CONCURRENTLY` outside a transaction, validates index validity, and leaves existing writes available. An interrupted invalid index is reported for explicit repair. Index creation is intentionally separate from server startup because a large deployment can take substantial time to build indexes. The Prisma schema declares the same indexes for new databases. Normal startup installs the summary revision table/function/triggers before accepting traffic; the database role therefore needs the existing schema-upgrade permissions.

## Repeat verification

```powershell
Set-Location 'D:\devoxa technologies\EstateSync\backend'
$env:DOCUMENT_TEST_POSTGRES_BIN='D:\Program Files\PostgreSQL\17\bin'
$env:LOAD_RECORDS='100000'
npm run test:performance
# Full staged concurrent run using the same isolated setup:
node scripts/test_documents_local.js --performance --concurrent
```

The performance runner checks pagination, owner isolation, complete detail, totals, committed/rolled-back invalidation, and document summary parity. It records `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` before and after indexes, including actual Prisma customer/dashboard SQL, in `docs/qa/load-tests/read-optimization-*.json`. The dataset has 10,000 synthetic customers, 50,000 additional payments and the other 90,000 load-fixture rows, plus small integration fixtures. It does not establish capacity for one crore records or a hosted production environment.

Frontend tests cover paging, server filters, on-demand statements and failed detail loads. Backend unit tests cover cache coalescing, expiry, unavailable revisions, failed loaders, long-running loads and invalidation races. Document integration tests exercise committed document changes and permission-specific summary cache keys.

## Recorded query checks

Final query-plan report: [read-optimization-1791228498336.json](load-tests/read-optimization-1791228498336.json). This uses 10,001 customers and approximately 50,000 payments including integration fixtures. All checks passed, alongside 64 document tests, 10 security/cache unit tests and 17 frontend tests.

| Query/check | Before | After |
| --- | ---: | ---: |
| Global customer page query, without/with ordering index | 4.668 ms | 0.041 ms |
| Owner customer page, without/with ordering index | 7.627 ms | 0.054 ms |
| Customer payment history, without/with customer/date index | 13.165 ms | 0.119 ms |
| Document counts, old source join/new document-driven query | 55.466 ms | 0.250 ms |
| Missing-evidence count, full source union/relevant sources | 8.618 ms | 0.111 ms |

These are individual PostgreSQL plan execution times from one disposable local run, not HTTP p95 measurements. Wide aggregate scans remain scans; they are amortized by caching rather than “fixed” with unnecessary indexes. The new 25-customer response was **14,103 bytes**, versus the previously reported **976,070-byte** response that ignored pagination. Those payload measurements have different fixture cardinalities, so they demonstrate bounded payloads rather than an exact same-dataset benchmark.

An earlier exploratory staged run with the larger dataset is saved as `concurrent-2026-10-05T19-06-37-438Z.json`. It failed the two-second target above 100 users and had timeouts at high load. That run preceded the final document-count query change; it is diagnostic evidence, not a final capacity result. Do not compare its larger dataset directly with the original 10,000-row baseline.

The final direct-controller check measured a cold dashboard refresh at 16.0 ms; 50 concurrent warm dashboard calls completed in 39.0 ms total. These timings exclude HTTP authentication/network overhead and are not per-request percentiles.

## Final staged HTTP run

Report: [concurrent-2026-10-05T19-29-00-855Z.json](load-tests/concurrent-2026-10-05T19-29-00-855Z.json). This run uses the original 10,000-row load bundle (1,000 synthetic customers), plus small integration fixtures, rather than the larger query-plan dataset. Each stage ramps for 30 seconds and measures a 60-second hold separately, with approximately three seconds of think time. All 1,000 users authenticated. Overall: 35,281 requests, 23 connection-refused failures, no recorded rate limits or request timeouts.

| Users | Customer list p95 | Dashboard p95 | Documents p95 | Worst route p95 | Steady failures | Meets criteria |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 50 | 125 ms | 103 ms | 114 ms | 202 ms | 0 | Yes |
| 100 | 241 ms | 397 ms | 187 ms | 656 ms | 0 | Yes |
| 250 | 3,690 ms | 3,091 ms | 3,990 ms | 3,990 ms | 0 | No |
| 500 | 5,405 ms | 4,013 ms | 6,028 ms | 6,028 ms | 0 | No |
| 1,000 | 9,294 ms | 7,626 ms | 9,283 ms | 9,294 ms | 23 | No |

Criteria require every measured read route's p95 below 2,000 ms, failure rate below 1%, sufficient samples and the full hold. **The final load test failed its latency target above 100 users.** This is not a claim of production capacity. Earlier local runs passed 250 users, so the runs also show substantial variability; controlled repeated runs on deployment-equivalent hardware are needed before setting a capacity limit. The benchmark does not isolate the cause of the connection refusals or distinguish server scheduling, connection-pool waiting and host resource contention.

The final list payload was 13,963 bytes. Functional suites and the production frontend build passed. Smaller payloads, faster isolated queries and cached aggregates do not by themselves establish 1,000-user readiness; the end-to-end results above retain the remaining performance limitation explicitly.
