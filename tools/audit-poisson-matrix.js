'use strict';

/**
 * Audit of the site's client-side Poisson score matrix.
 *
 * Runs the REAL shipped calculatePoissonMatrix() out of odds-calculator.html — the
 * inline <script> block is extracted and evaluated in a Node vm context with a minimal
 * `document` stub — rather than a hand-copy that could silently drift from the page.
 * The HTML file is only ever read.
 *
 * Data comes from the same DATA_BASE_URL the live page fetches, and fixtures come from
 * upcoming_fixtures.json, so these are real fixtures actually served on the site.
 *
 * Usage: node tools/audit-poisson-matrix.js
 */

const fs = require('fs');
const path = require('path');
const { validateScoreMatrix } = require('./validate-score-matrix.js');
const {
  extractPageScript,
  loadPageScope,
  fetchLiveData,
  usableFixtures,
  DATA_BASE_URL
} = require('./load-page-scope.js');

const HTML_PATH = path.join(__dirname, '..', 'odds-calculator.html');
const MIN_FIXTURES = 5;

/** Self-check: prove each validator rule actually fires before trusting a "pass". */
function selfTestValidator() {
  const uniform = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 1 / 36));
  const negative = uniform.map(r => r.slice());
  negative[0][0] = -0.1;
  const overOne = uniform.map(r => r.slice());
  overOne[0][0] = 1.5;

  const results = {
    'sums to 1.0': validateScoreMatrix(uniform),
    'contains a negative': validateScoreMatrix(negative),
    'contains a value > 1': validateScoreMatrix(overOne)
  };

  console.log('Validator self-test');
  console.log('-------------------');
  for (const [label, r] of Object.entries(results)) {
    console.log(
      `  ${label.padEnd(22)} sum=${r.sum.toFixed(6)}  passed=${r.passed}  ` +
      `sumsToOne=${r.checks.sumsToOne} noNegative=${r.checks.noNegative} noneExceedOne=${r.checks.noneExceedOne}`
    );
  }
  const ok = results['sums to 1.0'].passed &&
    !results['contains a negative'].checks.noNegative &&
    !results['contains a value > 1'].checks.noneExceedOne;
  console.log(`  => self-test ${ok ? 'OK' : 'FAILED'}\n`);
  if (!ok) throw new Error('Validator self-test failed; audit results would be meaningless');
}

async function main() {
  selfTestValidator();

  const page = loadPageScope(extractPageScript(fs.readFileSync(HTML_PATH, 'utf8')));

  const { matchesData, teamStats, upcomingFixtures } = await fetchLiveData();

  // Populate exactly the globals the page populates in loadAllData().
  page.setData(matchesData, teamStats);
  if (page.getLeagueContext().matchCount !== matchesData.length) {
    throw new Error('Page globals were not populated; results would be meaningless');
  }

  const totalGoals = matchesData.reduce((acc, m) => acc + m.home_goals + m.away_goals, 0);
  const leagueAvg = totalGoals / (matchesData.length * 2);

  console.log('Inputs');
  console.log('------');
  console.log(`  source          ${DATA_BASE_URL}`);
  console.log(`  matches         ${matchesData.length}`);
  console.log(`  teams in stats  ${Object.keys(teamStats).length}`);
  console.log(`  fixtures served ${upcomingFixtures.length}`);
  console.log(`  leagueAvg       ${leagueAvg.toFixed(6)} goals/team/match\n`);

  const fixtures = usableFixtures(upcomingFixtures, teamStats, Math.max(MIN_FIXTURES, 6));

  if (fixtures.length < MIN_FIXTURES) {
    throw new Error(`Only ${fixtures.length} usable fixtures; need at least ${MIN_FIXTURES}`);
  }

  console.log(`Per-fixture results (${fixtures.length} real fixtures from upcoming_fixtures.json)`);
  console.log('='.repeat(78));

  const summary = [];
  for (const f of fixtures) {
    const data = page.calculatePoissonMatrix(f.home_team, f.away_team);
    if (!data) {
      console.log(`\n${f.home_team} vs ${f.away_team} (${f.date}) -> calculatePoissonMatrix returned null`);
      continue;
    }
    const r = validateScoreMatrix(data.matrix, { tolerance: 0.001 });
    summary.push({ fixture: `${f.home_team} vs ${f.away_team}`, date: f.date, r, data });

    console.log(`\n${f.home_team} vs ${f.away_team}   (${f.date})`);
    console.log(`  homeExpected   ${data.homeExpected.toFixed(6)}`);
    console.log(`  awayExpected   ${data.awayExpected.toFixed(6)}`);
    console.log(`  matrix         ${data.matrix.length}x${data.matrix[0].length} (${r.cellCount} cells)`);
    console.log(`  SUM            ${r.sum.toFixed(10)}`);
    console.log(`  deviation      ${r.deviation.toFixed(10)}  (missing ${(-r.deviation * 100).toFixed(4)}% of mass)`);
    console.log(`  min cell       ${r.min.toExponential(4)}`);
    console.log(`  max cell       ${r.max.toFixed(10)}`);
    console.log(`  (a) sums to 1.0 +/-0.001   ${r.checks.sumsToOne ? 'PASS' : 'FAIL'}`);
    console.log(`  (b) no negative values     ${r.checks.noNegative ? 'PASS' : 'FAIL'}`);
    console.log(`  (c) none exceed 1.0        ${r.checks.noneExceedOne ? 'PASS' : 'FAIL'}`);
    console.log(`  overall                    ${r.passed ? 'PASS' : 'FAIL'}`);
  }

  console.log(`\n\nSummary`);
  console.log('='.repeat(78));
  console.log(
    'Fixture'.padEnd(34) + 'Sum'.padEnd(15) + 'Deviation'.padEnd(15) + '(a)'.padEnd(7) +
    '(b)'.padEnd(7) + '(c)'
  );
  console.log('-'.repeat(78));
  for (const s of summary) {
    console.log(
      s.fixture.slice(0, 33).padEnd(34) +
      s.r.sum.toFixed(10).padEnd(15) +
      s.r.deviation.toFixed(10).padEnd(15) +
      (s.r.checks.sumsToOne ? 'PASS' : 'FAIL').padEnd(7) +
      (s.r.checks.noNegative ? 'PASS' : 'FAIL').padEnd(7) +
      (s.r.checks.noneExceedOne ? 'PASS' : 'FAIL')
    );
  }
  const failed = summary.filter(s => !s.r.passed).length;
  console.log('-'.repeat(78));
  console.log(`${summary.length} fixtures tested, ${summary.length - failed} passed, ${failed} failed.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
