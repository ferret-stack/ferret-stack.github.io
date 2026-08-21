# Poisson Score-Matrix Validation Audit

**Date:** 2026-08-21
**Scope:** `calculatePoissonMatrix()` / `generatePoissonGrid()` in `odds-calculator.html`
**Status:** Audit only — no code was changed. No fix has been applied or proposed here.

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

Run with `node tools/audit-poisson-matrix.js`.

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

## Results — 6 real fixtures

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

### Reading of the numbers

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

Recorded as an observation only. Reconciling this is a separate task and was not investigated
here.
