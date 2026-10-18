# P12 — Performance and accessibility acceptance

Acceptance began2026-10-15; final local review2026-10-18, Asia/Muscat. Windows11, Chromium156/Playwright1.64.0, optimized Next16.4.1 build, isolated Node24.22.0. Local synthetic data only. The final measurements below are execution evidence, not production capacity or a field percentile. P11 outliers remain historical findings in [P11 performance](P11-PERFORMANCE-CAPACITY.md); they are not erased by a new sample.

## Measurement method

`scripts/p12-browser-performance.ts` expands the P11 four-shell matrix to20 routes ×360/768/1280px =60 intended visits. Each uses a fresh Chromium context,900px height, cache disabled,100ms latency,1.5Mbps download and4× CPU slowdown. Routes include all account entry flows, participant today/programs/logs/progress/account/privacy/notifications/coaching, coach participant list and admin account/program/content panels. Private routes receive actual synthetic role sessions; fixture setup publishes a neutral quantitative program, joins a real participant and saves actual water. The coach list may legitimately be empty; it does not measure a populated large caseload.

The final method waits for the navigation `load` event, `document.fonts.ready`, a1500ms observation window and absence of the main loading state; navigation timeout remains30seconds. Earlier attempts used networkidle and are retained separately. Buffered observers measure LCP/CLS; resource timing measures external encoded script bodies and total transfer, CDP samples JS heap, and layout checks page overflow. Script response `Content-Encoding` is recorded to distinguish verified gzip external resources from assumed compression. It still does not measure a separately compressed sum of inline hydration/RSC script and external bundles, so the full initial-JavaScript gzip budget is not certified solely by external resource bytes. An authenticated measurement reporting failed API statuses or null LCP must be investigated and cannot prove a successfully loaded private screen.

There is one visit per route/width, not enough for browser p95 or a representative device percentile. No field INP is measured. Proposed R-22 targets (LCP≤2500ms, CLS≤0.1, initial JS150KB gzip, API p95 reads≤800ms/writes≤1500ms at20 concurrent users, Lighthouse≥90) are reported against measured scope without silently changing thresholds. Final values/budget exceptions are appended after execution; an exit0 measurement command does not itself mean budgets pass.

Initial expanded measurement stopped after36 samples at a30-second navigation timeout on `/coach/participants`768. Original partial JSON and failure log are preserved; a separately identified resumed cohort completed the missing24 cells without raising the timeout. The same coach route succeeded on retry, so no persistent route outage is proved. Cohorts differ and are not pooled into a statistical percentile. Background Next link prefetch added unrelated modules in some samples. A minimal source improvement disables automatic prefetch on the five primary navigation links and header help link; navigation itself remains intact. The final build/browser replay and fresh matrix after this change are reported separately and do not erase original LCP/CLS/JS outliers.

On18October a fresh networkidle-based attempt failed at `/register`768 after21 recorded samples; those samples/logs are preserved in `oct18-performance-networkidle-partial.json` and the operations log. Its wrapper reports navigation failure, not a proven application root cause. The final method uses explicit document/font/interface readiness instead of global network idleness. This follows the readiness distinction in the [Playwright navigation API](https://playwright.dev/docs/api/class-page#page-goto). Thresholds, CPU/network emulation and30-second navigation bound are unchanged. Method/cohort/build ID are recorded; before/after transfers are descriptive samples, not a controlled causal performance experiment. The method change cannot turn either failed attempt into PASS.

## HTTP and database capacity

`scripts/p12-capacity.ts` preserves the P11 workload and adds P12-specific output paths. One-session scenario has100 own water records and75 timed HTTP reads at1/2/4/8 concurrency. Multi-user scenario uses20 actual independent synthetic sessions with one own row each,20 sequential warmups followed by180 timed reads at1/5/10/20 concurrency. Every multi-user response must contain only the expected own row. Direct service write timing is separate from HTTP; it does not measure concurrent HTTP writes. EXPLAIN ANALYZE uses actual non-owner actor/RLS context, and captures query/index/buffer/resource snapshots. No larger-scale/long-duration/cloud SLA is inferred.

## Accessibility and connection coverage

Final existing browser replay passed147/147 cases across360/768/1280. This includes actual account/program/tracking/analytics/coach/privacy/notification actions, axe WCAG2/2.1/2.2AA checks on sampled pages, keyboard skip/focus and some form/order interaction, Arabic save/failure states, textual chart alternatives and page overflow assertions. P10 additionally covers reduced motion and CSS `zoom=2` reflow. CSS zoom is not proof of browser-native 200% zoom on a physical device. Not every private screen/state/control was exercised by keyboard or axe; the route-shell cases are explicitly unauthenticated where applicable.

PWA browser/unit checks execute real service-worker registration, manifest inspection and cache contents, offline private-API failure, safe fallback and actual failed-then-successful logout with database session revocation/cache purge. Only public icons/offline HTML are cached; there is no offline health queue, synchronization or claimed offline persistence. This is tested Chromium behavior, not installed PWA acceptance on all devices.

| Acceptance item | Status / scope |
|---|---|
| Three required viewport widths, sampled RTL/overflow/axe | PASS within the executed147 existing browser cases |
| Keyboard/focus, sampled form actions and CSS zoom200%, reduced motion | PASS automated sampled scope; exhaustive keyboard operation NOT TESTED |
| Actual Arabic NVDA/VoiceOver session | NOT TESTED |
| Two independent physical devices/accounts | NOT TESTED |
| Native browser zoom200% on supported devices | NOT TESTED |
| Lighthouse | NOT TESTED: no installed Lighthouse executable/package verified; browser instrumentation is a different measurement |
| INP/field vitals, all-control touch dimensions and manual contrast audit | NOT TESTED |
| Full populated coach/admin/large historical participant workload | NOT TESTED |
| Concurrent20-user HTTP writes | NOT TESTED; direct sequential service writes are not a substitute |

[Open issues](P12-OPEN-ISSUES.md) and [final acceptance](P12-FINAL-ACCEPTANCE-REPORT.md) preserve the effect of untested scope and adverse budgets on P12. No Lighthouse score, screen-reader PASS, independent-device PASS or complete WCAG conformance is invented.

## Superseded cumulative-shift-sum matrix — 2026-10-18

Historical execution60/60,42authenticated, cohort `2026-10-18T06:51:35.127Z`, build `ePMZxtot2YOyeXfKjk6tF`:21LCP samples>2500ms. The inherited field labelled`cls` was a **sum of all unexpected shifts**, not maximum session-window CLS;20sums exceeded0.1, maximum0.189200. These are not20certified standard-CLS failures. Overflow0/60; observed failed API samples0/60. External encoded script bodies143364–159352B; complete150KB-gzip budget unproven. A corrected standard-CLS matrix below supersedes this execution for final acceptance. Raw old sums/log are preserved, not relabelled as passes.

| Route | Historical LCP ms360 /768 /1280 | Maximum cumulative shift sum (not standard CLS) | External encoded JS B360 /768 /1280 |
|---|---|---|---|
| `/` |2196 /1684 /2668|0.002794|143366 /143366 /143366|
| `/register` |2140 /1368 /1768|0.003186|143366 /149273 /149273|
| `/verify` |2480 /836 /3044|0.002364|149273 /149273 /143366|
| `/login` |1096 /1488 /3204|0.019807|143366 /149273 /143366|
| `/forgot-password` |1860 /1628 /3088|0.013219|149273 /149273 /143366|
| `/reset-password` |2152 /1168 /3712|0.013219|149273 /149273 /149273|
| `/onboarding` |4432 /4076 /8068|0.179312|146257 /146257 /146257|
| `/account` |1936 /2908 /2712|0.175379|146257 /159183 /146257|
| `/account/security` |6624 /3096 /2228|0.174979|146257 /151561 /146257|
| `/my-programs` |1644 /1196 /1968|0.130286|150085 /150085 /150085|
| `/today` |1356 /4320 /2328|0.176306|144258 /144258 /144258|
| `/logs` |2044 /1652 /2688|0.176043|150085 /150085 /150085|
| `/progress` |2036 /3676 /7252|0.041802|150085 /150085 /150085|
| `/privacy` |3856 /3708 /1564|0.175573|145654 /145654 /145654|
| `/notifications` |2280 /1556 /2440|0.175832|144898 /150202 /150202|
| `/coaching` |1340 /2504 /3196|0.005926|149331 /149331 /149331|
| `/coach/participants` |1296 /1460 /2140|0.023774|149331 /149331 /149331|
| `/admin` |1180 /1572 /2572|0.189200|159350 /159350 /143364|
| `/admin/programs` |1856 /1156 /1984|0.153573|156336 /156336 /159352|
| `/admin/content` |968 /1304 /1828|0.153290|159352 /159352 /150429|

Data/log: `.npm-cache/p12/oct18-layout-shift-sum-proxy.json`, `oct18-performance-final.log`. Earlier networkidle cohorts/failed attempts are retained separately and not pooled into this table. Sampled desktop welcome JS162911→143366B and today159895→144258B show fewer transferred modules in these visits after prefetch changes; some other cells increased. Readiness method/time/cohort changed, so no universal percentage gain or sole causal attribution is claimed. LCP failures remain adverse; standard CLS acceptance uses the corrected matrix, not these sums.

During final review, the copied P11 observer's sum-only calculation was found to differ from [standard CLS session windows](https://web.dev/articles/cls): shifts are grouped less than1second apart and under5seconds per window; the largest window is used, excluding recent input. P12 now computes that maximum and separately retains the total and bounded numeric shift timestamps/values for verification. Earlier P11/P12 sum-based labels are historical instrumentation evidence, not retroactively certified standard CLS. The corrected run failed before all60cells, as reported below; field lifecycle/iframe/device limitations remain.

## Standard CLS correction — final incomplete probe

Corrected probe **FAIL execution completeness**:5/60visits recorded,55NOT TESTED after a30-second navigation TimeoutError at `/reset-password`360. No timeout increase or automatic success retry. Source/data/log: `scripts/p12-browser-performance.ts`, `.npm-cache/p12/oct18-standard-cls-partial.json`, `oct18-performance-standard-cls.log`; cohort2026-10-18T08:17:21.759Z, same build. Browser navigation failures recurred at different routes across attempts; their cause is unproven and remains a test-environment/application diagnostic issue, not certified harmlessness. Existing147functional cases pass, which does not erase the measurement failures.

| Route360px | LCP ms | Standard maximum-session CLS |
|---|---:|---:|
|`/`|1932|0.0021842353|
|`/register`|1800|0.0001996056|
|`/verify`|2096|0.0025785974|
|`/login`|2552|0.0025801578|
|`/forgot-password`|2224|0.0023539060|

Five recorded standard CLS values are≤0.1, with numeric entry timestamps retained; this does **not** accept the remaining55cells or field CLS. One additional LCP sample exceeded2500ms. Final performance judgment: FAIL observed LCP targets and repeated incomplete execution; complete standard CLS/gzip/INP/Lighthouse/device acceptance NOT TESTED. The prior60visit table remains valid as that LCP/transfer/cumulative-shift-sum observation, with21LCP failures and20high sums, not20standard-CLS failures. No sum-based pass/failure is silently substituted for the standard metric.

Single-session capacity PASS75/75 HTTP reads,0non200, p95 by concurrency1/2/4/8:624.09/146.36/296.33/631.72ms.100sequential direct-service writes p95=281.71ms, not HTTP/concurrent writes. Actor/RLS EXPLAIN used `WaterLog_userId_recordId_recordKind_key`, planning1.294ms/execution8.541ms,32KB in-memory sort,256shared-hit blocks,0physical/temp reads. Instantaneous DB112282771B/8connections includes other retained synthetic schemas. Server working set92483584→152371200B is a snapshot, not peak. Multi-user results/failures are reported separately after that command's actual completion.

## Multi-user capacity and retained failure

The first multi-user command **FAILed with HTTP TimeoutError** before a complete report; it is not accepted as180 reads. Its preserved stream contains27 completed handler records,1status≥400; this is not a verified full client workload count or an accepted error-rate baseline. Original log: `oct18-capacity-multiuser.log`; preserved stream: `oct18-multiuser-failed-http-metrics.jsonl`. Cause was not independently established. Safe stage/completed-tier diagnostics were added to the runner, without increasing its15-second request timeout, changing limits or weakening row ownership assertions.

One separately logged retry PASSed on20independent synthetic sessions:20warmups +180timed HTTP reads,0non200, every returned row checked against the actual worker's identity. This does not erase the initial timeout or prove long-duration reliability. `oct18-capacity-multiuser-retry.log` and `capacity-multiuser-capacity.json`, measured2026-10-18T07:09:23Z.

| Concurrent sessions | Timed reads | Client p50 /p95 ms | Non200 |
|---|---:|---|---:|
|1|5|52.04 /53.94|0|
|5|25|51.92 /196.17|0|
|10|50|98.16 /127.73|0|
|20|100|192.78 /213.79|0|

The200 handler records include warmups and have p95=200ms/0server or client errors.20sequential direct service writes p95=319.54ms; no concurrent HTTP-write acceptance. Actor/RLS query planning0.459ms/execution0.386ms. Instantaneous database112602259B/11connections; server working set137154560→181747712B, not peak. The successful capacity runs total255timed reads +20warmups and120direct-service writes; failed-attempt traffic is separate, never added to successful coverage. Proposed read p95 is met in these successful tiers only; intermittent timeout, larger scale, writes, physical devices and production capacity remain open.
