# Per-stage load-test results

Run report: [concurrent-2026-10-05T16-22-13-764Z.json](load-tests/concurrent-2026-10-05T16-22-13-764Z.json). Reviewed 6 October 2026, India time.

The test used 10,000 synthetic workload rows (including 1,000 customers), a disposable local PostgreSQL database and a local API. The client, database and API shared the same computer. All 63 document tests and the financial workflow suite passed before concurrent traffic began.

| Active users | Steady requests | Failures | Worst route p95 | Result |
| ---: | ---: | ---: | ---: | --- |
| 50 | 995 | 0 | 180 ms — customer list | Pass |
| 100 | 1,967 | 0 | 128 ms — customer list | Pass |
| 250 | 4,887 | 0 | 270 ms — admin dashboard | Pass |
| 500 | 7,096 | 0 | 7,272 ms — admin dashboard | Latency failed |
| 1,000 | 1,521 | 511 | 14,128 ms — admin dashboard, partial window | Aborted early |

The first four stages each completed approximately 60 seconds of steady traffic, excluding ramp requests. The 1,000-user stage measured only about seven seconds before the failure-rate stop, then drained outstanding requests for about seven seconds. Its percentile is a partial-run diagnostic, not a comparable completed 60-second benchmark. All 1,000 users authenticated and peak active users reached 1,000; activeAtEnd=0 reflects workers exiting after the stop.

The test recorded 29,315 requests overall, including ramps and login, with 511 failures. No HTTP 429 responses or timeout classifications were recorded. This report version did not retain HTTP status/error categories, so the failures cannot be reliably attributed to a backend error versus a connection/client error. The runner now captures statusCounts and errorCounts for future tests; those fields cannot be reconstructed for this historical run.

## Interpretation

**250 is the highest tested stage that met the latency target**, not a guaranteed maximum user count. The next measured point, 500, failed the per-route p95 target of two seconds despite no request failures. The boundary between those levels was not measured. Steady read throughput increased from about 81 requests/second at 250 users to 117 at 500, while dashboard latency rose sharply.

This does not establish production hosting capacity, financial-write throughput, or performance with one crore records. The read-heavy workload used admin accounts, synthetic distinct proxy IPs, and three seconds average think time. Warming, local resource contention, and brief pauses to drain requests between phases affect comparability to other runs. Repeat on staging and test intermediate user counts after optimizing the slow routes before choosing a production capacity target.

The JSON contains ramp and steady per-route mean, p95, p99, sample counts, failures and response sizes. There were no changes to business endpoints during this rerun.
