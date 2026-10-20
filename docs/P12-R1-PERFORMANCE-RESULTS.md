# P12-R1 — Performance and accessibility evidence

20 October 2026, Asia/Muscat; diagnostic evidence from18October is retained separately. Local synthetic data only. P12-P01 is **PARTIAL**: targeted repairs implemented and the final60-cell matrix completed, but the LCP budget still **FAILS** in6cells.

## Preserved baseline and diagnosis

P12 evidence is unchanged: `.npm-cache/p12/oct18-layout-shift-sum-proxy.json` records 60 visits and 21 LCP values above 2500ms. Its sum of layout shifts is not standard CLS. The corrected P12 probe only completed 5/60 cells; the remaining 55 are NOT TESTED. Neither historical failure is overwritten by R1.

R1 runner: `scripts/p12-r1-browser-performance.ts`. Diagnostic output: `.npm-cache/p12-r1/performance-diagnostic.json`; retained sandbox failure log: `.npm-cache/p12-r1-performance-diagnostic.log`; authorized run log: `.npm-cache/p12-r1-performance-diagnostic-authorized.log`. The first attempt failed before browser measurements because loopback PostgreSQL access was denied (EACCES), then the authorized command was run separately.

Diagnostic uses the exact P12 optimized build `ePMZxtot2YOyeXfKjk6tF`, 20 routes × 360/768/1280px, 900px height, fresh contexts, disabled cache, 100ms latency, 1.5Mbps download, 4× CPU, 30-second navigation timeout and the same explicit readiness method. Each failed cell is recorded as NOT TESTED, without retrying it or increasing timeout; subsequent independent cells may still run. Counts of attempted and valid visits must be distinguished.

New attribution records final LCP element tag/class, resource URL (when present), size, TTFB and resource timings. It excludes user-visible text, account identifiers and session credentials. All first 20 measured LCP elements were text (`p` / `p.local-notice`), not images. On welcome360, the fonts were discovered via CSS at approximately 1062–1075ms and completed at 1563–1578ms; LCP was 3752ms and DOMContentLoaded 6173ms. Register360 font discovery was 604–616ms, completion 1215–1277ms, LCP 2828ms and DOMContentLoaded 4500ms. These observations show a font-discovery waterfall and substantial rendering/hydration delay; they do not prove fonts alone cause all outliers. Private panels also require hydration and authenticated API responses before their main content can render.

Docker Scout scans overlapped the early diagnostic cohort. Shell commands also slowed during that period. The cohort therefore cannot establish an isolated causal before/after percentage. Final measurements must report this limitation and run without simultaneous image scans/builds/regression loads. No content is hidden or authentication weakened to alter LCP.

Diagnostic was intentionally interrupted through its own command session after 36 recorded attempts to release the build/schema for integrated remediation. Of those, 35 had complete instrumentation rows under the inherited readiness check; `/my-programs`768 timed out waiting for interface readiness (30000ms), and the unattempted 24 cells are NOT TESTED. This diagnostic is not a complete 60-cell acceptance run. Among those 35 historical instrumentation rows, 25 LCP values exceeded 2500ms and 7 standard CLS values exceeded 0.1; maximum LCP 8960ms and CLS 0.1733333333. Some private rows may still be early shells, as the later readiness investigation below establishes. All observed LCP elements were text: 13 ordinary paragraphs, 20 local-notice paragraphs, one amber-notice paragraph, one h2. An independent recomputation from retained shift timestamps/values matched all 35 standard CLS results (zero mismatches). No listener remained on the diagnostic server port3100 after interruption.

## Targeted repair

`src/app/layout.tsx` changes the same installed Cairo Arabic 400/600/700 WOFF2 files from CSS-discovered font faces to `next/font/local`, with preload and swap. `src/app/globals.css` consumes the generated font variable. No external font account, CDN or download is introduced. Preloading is supported by the [official Next.js font reference](https://nextjs.org/docs/app/api-reference/components/font). It addresses the demonstrated discovery delay; any LCP/CLS improvement requires measured evidence.

Standard CLS uses the maximum unexpected-shift session window, with gaps under 1000ms and duration under 5000ms; input-associated shifts are excluded. Numeric entries and the old cumulative sum are both retained for independent verification. This follows the [standard CLS definition](https://web.dev/articles/cls). A full lifecycle/iframe/physical-device result is not inferred from this bounded local observation.

The separate two-route attribution probe (`performance-shift-probe-before.json`, same P12 build) directly identified the large privacy768 shift: after `/api/v1/privacy` completed at6808.7ms, the footer moved at7122.4ms from a768×155.59px rectangle at y575.17 to outside the viewport. That single shift scored0.1733333333. R1 therefore reserves a viewport-height minimum for `.app-shell`; the footer stays below the initial viewport while asynchronous panels load, and all content continues to grow and scroll normally. The repair changes layout sizing only. Post-build measurements must prove its effect.

The probe also exposed an inherited measurement weakness: account/security had no API request in its captured resources, although the old readiness check passed. Its text `جارٍ تحميل الحساب` did not match the narrower `جارٍ التحميل`, and hydration could occur later. That row is a shell observation, not valid loaded private-screen acceptance. The final R1 method now requires the known successful initial API reads for each private route, with response waits armed before navigation under the unchanged30000ms bound, and recognizes both loading phrases. This stricter method prevents an early shell from receiving a false pass. It differs from P12 readiness and must not be used to claim a controlled causal percentage against older shell samples. Failed/missing required API readiness is NOT TESTED; the runner continues independent cells without retrying failures.

The final runner additionally records a reproducible gzip payload estimate: separately compress each decoded external script response and each nonempty inline script in the original document. This includes hydration/RSC script bodies and modules loaded during the observation window. Actual HTTP script encodings remain separately reported. The estimate is not claimed to be the exact HTTP wire sum or a field performance percentile.

## Final post-integration matrix — 20 October

Command: isolated Node24.22.0 → `node_modules/tsx/dist/cli.mjs scripts/p12-r1-browser-performance.ts final-oct20`. Execution **PASS completeness**, exit0:60attempted /60ready-interface observations /0NOT TESTED. Cohort `2026-10-20T04:12:02.077Z` (08:12:02 Asia/Muscat); optimized build `Bs3BkyVrKteoYc9ngLT1N`, checked after the integrated regression. Root held schema/build fixed and ran no simultaneous image scans, builds or regression workloads. Local desktop background processes were not disabled, so this is a laboratory cohort, not a controlled device/field percentile.

The same20routes,3widths,900px height,100ms latency,1.5Mbps download,4×CPU, fresh contexts, disabled cache and30000ms navigation bound were retained. The stricter authenticated-API readiness described above is recorded in every row. All42private visits received the expected successful API reads; failed API status samples0/60; horizontal overflow0/60.

Evidence copied for repository review: [complete numeric rows](evidence/P12-R1-PERFORMANCE-FINAL-OCT20.json), [summary](evidence/P12-R1-PERFORMANCE-FINAL-OCT20-SUMMARY.json). Original raw output/log remain `.npm-cache/p12-r1/performance-final-oct20.json` and `.npm-cache/p12-r1-performance-final-oct20.log`. The copied rows contain numeric timings, selectors and request paths, with no account text, session credentials or response bodies. SHA256 of complete rows: `ad1e94c1bc6de636939fe5498a011872096920e82d7791270c5ff26a8a54bdb4`.

| Metric | Final evidence | Acceptance |
|---|---|---|
| LCP≤2500ms |54/60meet budget;6exceed; range736–7692ms | **FAIL budget** |
| Standard maximum-session CLS≤0.1 |60/60meet; range0–0.0930831181 | **PASS measured scope** |
| Independent CLS arithmetic | Recomputed every saved shift sequence;60/60match;0mismatches | **PASS instrumentation verification** |
| Horizontal overflow |0/60 | **PASS sampled widths** |
| Required initial private API reads |42/42private visits ready;0observed failed API status samples | **PASS measurement readiness** |
| Complete inline+external gzip payload estimate |147556–166684B;52/60estimates exceed decimal150000B;60/60body collection complete | **Adverse estimate; exact full wire budget NOT CERTIFIED** |
| External script encoded bodies, historical-method comparison |143373–162627B; actual response encodings also retained | Descriptive transfer evidence, not full inline+external wire certification |

Remaining LCP failures are **not** waived:

| Route | Width | LCP ms | Actual final LCP element |
|---|---:|---:|---|
| `/onboarding` |360|2608|`p.local-notice`|
| `/login` |1280|2612|`p.local-notice`|
| `/onboarding` |1280|7692|`p.local-notice`|
| `/account` |1280|5888|`p.local-notice`|
| `/account/security` |1280|5816|`p.local-notice`|
| `/progress` |1280|3224|`p`|

Onboarding1280 fonts complete by882.4ms, but authenticated reads do not begin until6002.6ms and complete by6659.2ms; final LCP7692ms. Account1280 fonts complete by851.4ms, reads begin4811.4ms/complete5002.5ms, LCP5888ms. Account/security1280 fonts complete by826.2ms, reads begin4299.6ms/complete4512.1ms, LCP5816ms. This directly locates substantial remaining delay before/after client API hydration, after fonts are available; it does not establish a precise CPU root cause without a main-thread trace. Login1280 fonts complete by985.9ms but LCP2612ms, so this public outlier also remains unresolved. TTFB for these six failures is11.5–114.4ms; slow initial HTTP response alone does not explain their full LCP. No authentication shortcut, hidden important content, longer timeout or relaxed budget was used.

The font repair demonstrably changes discovery: welcome360 fonts now start from HTML `link` initiators at173.8–175.4ms and complete653.1–684.4ms; old diagnostic fonts were CSS-discovered at1061.6–1075.2ms and completed1562.8–1577.9ms. Welcome360 observed LCP is876ms in the final cohort versus3752ms in that diagnostic. Cohort/build/readiness/background load differ, so these are descriptive samples and proof of earlier discovery, not a universal causal percentage. The footer source previously contributed0.1733333 on privacy768; final privacy768 standard CLS is0.0041960447, with no final standard CLS value above0.1 and no footer-attributed shift in any final row. All measured font resources use link initiators across60/60visits. The original21/60LCP failures and diagnostic failures remain preserved; final6/60does not erase them or prove reliability across repeated cohorts.

Values below are in width order **360 /768 /1280**. Gzip figures are the separately compressed inline+external estimate described above.

| Route | LCP ms | Standard CLS | Gzip estimate B |
|---|---|---|---|
| `/` |876 /836 /1624|0.093083 /0.017095 /0.000125|148575 /148575 /148575|
| `/register` |888 /828 /1316|0.012663 /0.013032 /0.005245|147556 /153471 /153471|
| `/verify` |828 /844 /1684|0.055199 /0.013719 /0.005627|153467 /153467 /153467|
| `/login` |828 /848 /2612|0.073083 /0.019351 /0.008003|153467 /153467 /153467|
| `/forgot-password` |808 /812 /1724|0.055199 /0.013719 /0.000000|153474 /153474 /153474|
| `/reset-password` |832 /948 /2460|0.080178 /0.023361 /0.009694|153474 /153474 /147559|
| `/onboarding` |2608 /2096 /7692|0.002324 /0.000048 /0.000000|155770 /155770 /155770|
| `/account` |2048 /2056 /5888|0.001892 /0.000887 /0.000260|163529 /163529 /163529|
| `/account/security` |2104 /2200 /5816|0.000101 /0.000048 /0.000000|155760 /155760 /155760|
| `/my-programs` |844 /808 /1420|0.017779 /0.018294 /0.010333|155379 /155379 /155379|
| `/today` |800 /784 /1440|0.000101 /0.000048 /0.000000|159963 /159963 /159963|
| `/logs` |796 /804 /1208|0.004804 /0.000048 /0.000000|155367 /155367 /155367|
| `/progress` |2084 /804 /3224|0.037457 /0.038542 /0.023565|155379 /155379 /155379|
| `/privacy` |776 /2048 /2324|0.000101 /0.004196 /0.001991|149842 /149842 /149842|
| `/notifications` |804 /936 /1204|0.000101 /0.000048 /0.009582|154387 /154387 /154387|
| `/coaching` |784 /792 /1080|0.020215 /0.061176 /0.002174|153448 /153448 /153448|
| `/coach/participants` |788 /880 /832|0.020458 /0.014435 /0.002958|156688 /156688 /156688|
| `/admin` |800 /876 /932|0.050645 /0.006748 /0.004417|166684 /166684 /166684|
| `/admin/programs` |788 /960 /736|0.003419 /0.003617 /0.000000|163442 /163442 /163442|
| `/admin/content` |752 /1088 /792|0.003419 /0.003617 /0.000000|163438 /163438 /163438|

## Remaining acceptance scope

P12-P01 **PARTIAL**, LCP budget **FAIL**. Standard CLS and matrix completeness pass only within the executed scope. LCP≤2500ms, CLS≤0.1 and decimal150000B payload comparison thresholds are unchanged. INP, Lighthouse, physical screen reader, native200% browser zoom and two independent devices remain **NOT TESTED**. No Lighthouse package/executable was added for this cycle; no synthetic event timing is mislabeled field INP. Automated axe/RTL/reduced-motion/CSS zoom and impacted functional journeys are recorded in [integrated regression evidence](P12-R1-REGRESSION-RESULTS.md), rather than assumed from performance observations. Public release and production performance acceptance remain blocked by the broader owner gates.
