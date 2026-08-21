# Poisson Score-Matrix Validation Audit

**Date:** 2026-08-21
**Scope:** `calculatePoissonMatrix()` / `generatePoissonGrid()` in `odds-calculator.html`
**Status:** Audit findings below, followed by the truncation fix (grid extended 0–5 → 0–10)
and its post-fix measurements. The venue-adjustment discrepancy remains **flagged only** —
no wiring change was made.

`boolean/odds-calculator.html` is byte-identical to `odds-calculator.html` (verified with
`diff`), so these findings apply to both copies.

## How this was run

- `tools/validate-score-matrix.js` — standalone, reusable `validateScoreMatrix(matrix, {tolerance})`.
  Knows nothing about Poisson or this site; takes any 2D probability array and reports the
  actual sum plus per-cell violations. Checks (a) sum ≈ 1.0 within tolerance, (b) no negative
  value, (c) no value > 1.0 (and flags non-finite cells).
- `tools/audit-poisson-matrix.js` — extracts the inline `<script>` from `odds-calculator.html`
  and evaluates it in a Node `vm`, so the audit calls the **real shipped function**, not a
  hand-copy that could drift. Data is fetched from the same `DATA_BASE_URL` the live page uses,
  and fixtures come from `upcoming_fixtures.json` — real fixtures served on the live site.

- `tools/compare-poisson-matrix.js` — proves an edit to the matrix left the pre-existing cells
  untouched, by rebuilding the old function from git and comparing with `Object.is`.
- `tools/load-page-scope.js` — shared extraction + sandbox helper used by both scripts.

Run with `node tools/audit-poisson-matrix.js` and `node tools/compare-poisson-matrix.js`.

The validator self-tests first (a matrix summing to exactly 1.0 passes; a matrix with a
negative fails (b); a matrix with a value > 1 fails (c)) so a "pass" below cannot be vacuous.

## Inputs at time of run

| | |
|---|---|
| Source | `https://raw.githubusercontent.com/ferret-stack/odds-calculator/main/data` |
| Matches in `matches_data.json` | 2205 |
| Teams in `team_stats.json` | 28 |
| Fixtures in `upcoming_fixtures.json` | 10 |
| Computed `leagueAvg` | 1.439456 goals/team/match |

`leagueAvg` and all expected-goals values are in a football-plausible range, so the matrices
tested are real output, not the product of malformed input.

## Results — 6 real fixtures (BEFORE the fix, 6×6 grid)

Every matrix is 6×6 (36 cells, 0–5 goals per side).

| Fixture (2026-05-24) | homeExpected | awayExpected | **Sum** | Deviation from 1.0 | (a) sum≈1 | (b) no negative | (c) none >1 |
|---|---|---|---|---|---|---|---|
| Crystal Palace vs Arsenal | 0.641909 | 1.312996 | **0.9976016636** | −0.0023983364 | FAIL | PASS | PASS |
| Man City vs Aston Villa | 2.903875 | 0.900340 | **0.9251427028** | −0.0748572972 | FAIL | PASS | PASS |
| Nott'm Forest vs Bournemouth | 1.344953 | 0.962864 | **0.9968782034** | −0.0031217966 | FAIL | PASS | PASS |
| Liverpool vs Brentford | 2.139698 | 1.488062 | **0.9736560208** | −0.0263439792 | FAIL | PASS | PASS |
| Brighton vs Man Utd | 1.589490 | 1.012883 | **0.9935120799** | −0.0064879201 | FAIL | PASS | PASS |
| Burnley vs Wolves | 1.100416 | 1.375520 | **0.9960941353** | −0.0039058647 | FAIL | PASS | PASS |

**6 fixtures tested, 0 passed, 6 failed.**

### Reading of the numbers (before)

- **(b) and (c) pass everywhere.** No negative probabilities, no probability above 1.0, no
  non-finite cells across all 216 cells. The PMF arithmetic itself is well-formed.
- **(a) fails on every fixture.** Every sum is *below* 1.0 and never within the ±0.001
  tolerance. Best case is Crystal Palace vs Arsenal at 0.99760 (0.24% of probability mass
  missing); worst is Man City vs Aston Villa at 0.92514 (**7.49% missing**).
- The deviation scales with expected goals, which is consistent with the matrix being
  truncated at 5 goals per side (`odds-calculator.html:704-711`): the sum is
  `P(home ≤ 5) · P(away ≤ 5)`, and the higher the expected goals, the more mass falls outside
  the grid. Man City at `homeExpected = 2.90` loses the most.
- No renormalisation happens anywhere between `calculatePoissonMatrix` and the rendered grid,
  so displayed scoreline percentages are understated by the deficit shown above.

## The fix — grid extended to 0–10 goals per side

`calculatePoissonMatrix` now builds an **11×11** matrix (`MAX_GOALS = 10`, inclusive) instead
of 6×6. The extra cells are genuine Poisson probabilities for scorelines 6–10; **nothing was
renormalised**, and the expected-goals formula and the `1.1` / `0.9` multipliers were not
touched. `generatePoissonGrid`'s column-header loop, which had its own hardcoded `6`, now
sizes itself from `matrix[0].length`.

### The original 36 cells are bit-identical

`tools/compare-poisson-matrix.js` reconstructs the pre-fix function from
`git show <ref>:odds-calculator.html`, evaluates it alongside the working-tree version against
the same live data, and compares the overlapping 0–5 block with `Object.is` — exact bit
equality, not an epsilon. For all six fixtures:

```
36/36 identical cells, 0 differing, expected goals unchanged   (6x6 -> 11x11)
```

Run it with `node tools/compare-poisson-matrix.js`.

### Results — same 6 fixtures (AFTER the fix, 11×11 grid)

| Fixture (2026-05-24) | Sum before (6×6) | **Sum after (11×11)** | Deviation | (a) | (b) | (c) |
|---|---|---|---|---|---|---|
| Crystal Palace vs Arsenal | 0.9976016636 | **0.9999998488** | −0.0000001512 | PASS | PASS | PASS |
| Man City vs Aston Villa | 0.9251427028 | **0.9997773053** | −0.0002226947 | PASS | PASS | PASS |
| Nott'm Forest vs Bournemouth | 0.9968782034 | **0.9999998019** | −0.0000001981 | PASS | PASS | PASS |
| Liverpool vs Brentford | 0.9736560208 | **0.9999840977** | −0.0000159023 | PASS | PASS | PASS |
| Brighton vs Man Utd | 0.9935120799 | **0.9999990262** | −0.0000009738 | PASS | PASS | PASS |
| Burnley vs Wolves | 0.9960941353 | **0.9999997355** | −0.0000002645 | PASS | PASS | PASS |

**6 fixtures tested, 6 passed, 0 failed.** Man City vs Aston Villa is the binding case — the
highest `homeExpected` (2.90) and so the fattest tail — and its residual deficit of 2.2×10⁻⁴
is the largest of the six, comfortably inside the ±0.001 tolerance. The remaining deviations
are the genuine mass beyond 10 goals per side, not rounding.

### Rendering

The grid is now 12×12 rendered cells (121 data cells plus headers, up from 36). Verified with
Playwright at 375px, 768px and 1280px: 12 grid columns at every width, header row aligned with
the data columns, no wrapped or orphaned cells, the table scrolling horizontally inside
`.poisson-table` at 375px (524px content in a 347px box), and the page body never scrolling
horizontally at any width.

## Where `teamStats`' expected-goals values come from

**Split answer: the inputs are fetched from the Python odds-calculator pipeline's exported
JSON; the expected-goals figures themselves are computed independently inside this repo.**

### The inputs are fetched, not computed and not hardcoded

`teamStats` is declared empty and assigned in exactly one place — the bulk fetch in
`loadAllData()`:

- `odds-calculator.html:281` — `let teamStats = {};`
- `odds-calculator.html:291` — `const DATA_BASE_URL = 'https://raw.githubusercontent.com/ferret-stack/odds-calculator/main/data';`
- `odds-calculator.html:300` — `fetch(\`${DATA_BASE_URL}/team_stats.json\`)` (index 6 of the `Promise.all`)
- `odds-calculator.html:312` — `teamStats = await responses[6].json();`

That URL is the Python odds-calculator repo's `data/` directory on `main`. There is no other
assignment to `teamStats` in the file.

### But `team_stats.json` contains no expected-goals values

Each team entry carries raw averages only:

```json
"Arsenal": {
  "last_10_avg_goals_for": 1.6,
  "last_10_avg_goals_against": 0.8,
  "last_10_avg_booking_points": 0.0,
  "season_avg_booking_points": 33.7,
  "form": { "elo_change_last_5": 13, "elo_change_last_10": 8, "trend": "stable", "form_rating": 6.1 }
}
```

The expected-goals numbers are derived locally, in `calculatePoissonMatrix` at
`odds-calculator.html:686-700`:

```js
const leagueAvg = totalGoals / (totalMatches * 2);          // from matches_data.json

const homeAttack  = homeStats.last_10_avg_goals_for     / leagueAvg;
const homeDefense = homeStats.last_10_avg_goals_against / leagueAvg;
const awayAttack  = awayStats.last_10_avg_goals_for     / leagueAvg;
const awayDefense = awayStats.last_10_avg_goals_against / leagueAvg;

const homeExpected = homeAttack * awayDefense * leagueAvg * 1.1;
const awayExpected = awayAttack * homeDefense * leagueAvg * 0.9;
```

So: **JSON from the Python pipeline supplies the per-team goal averages; the attack/defence
ratios, the league average, the home-advantage multipliers, and the final expected-goals
values are all this repo's own code.** The Python pipeline never exports an expected-goals
figure that this page consumes.

### Stale local copies are not used

`assets/data/team_stats.json` exists in this repo (28 teams, same shape) along with eight
sibling JSONs. A repo-wide grep for `assets/data` finds **zero** references in any HTML, MD,
or YML file — the live page reads only from `raw.githubusercontent.com`. These local files are
dead copies and are not the source of anything rendered.

## Flagged discrepancy — not investigated

The expected-goals math hardcodes `* 1.1` (home) and `* 0.9` (away) at
`odds-calculator.html:699-700`. The documented Python system venue adjustment is **×1.11 /
×0.89** per Source of Truth. The same file already carries those documented values as the
`venueAdjustment` fallbacks at `odds-calculator.html:348-349`
(`venueAdjustment.home_multiplier || 1.11`, `venueAdjustment.away_multiplier || 0.89`), and
`venueAdjustment.json` is fetched at `odds-calculator.html:302` — but
`calculatePoissonMatrix` never consults it.

### The live data has drifted from the fallbacks too

Fetched live from `${DATA_BASE_URL}/venue_adjustment.json`:

```json
{ "home_multiplier": 1.098, "away_multiplier": 0.898,
  "home_win_rate": 0.5759, "away_win_rate": 0.4711,
  "sample_size": 2194, "last_updated": "2026-08-15" }
```

The served values are **1.098 / 0.898** — they do **not** match the `|| 1.11` / `|| 0.89`
fallbacks at `odds-calculator.html:348-349`. Three different multiplier pairs are therefore
in play at once:

| Pair | Where | Used by |
|---|---|---|
| 1.1 / 0.9 | hardcoded, `odds-calculator.html:699-700` | `calculatePoissonMatrix` |
| 1.11 / 0.89 | fallback constants, `odds-calculator.html:348-349` | `getVenueAdjustedProbabilities`, only when the fetch fails |
| 1.098 / 0.898 | live `venue_adjustment.json` | `getVenueAdjustedProbabilities` in practice |

**Consequence:** pointing `calculatePoissonMatrix` at `venueAdjustment` is **not** a no-op
one-liner. Because the live values differ from both the hardcoded pair and the documented
fallbacks, the swap changes Poisson output no matter which pair is deemed authoritative, and
it needs an explicit decision on which is correct plus a defined behaviour for when the fetch
fails (the fallbacks themselves being stale). Note the live file also carries
`sample_size: 2194` against the 2205 matches in `matches_data.json`, so the two datasets are
not generated from the identical match set.

Recorded as an observation only. Reconciling this is a separate task and was not investigated
here.
