'use strict';

/**
 * Prove that extending the Poisson grid left the original cells untouched.
 *
 * Does NOT trust a snapshot taken by whatever process made the edit. It reconstructs the
 * pre-edit function straight from git (`git show <ref>:odds-calculator.html`), evaluates it
 * and the working-tree version in separate vm contexts against the same live data, and
 * compares the overlapping cells with Object.is — exact bit equality, not an epsilon.
 *
 * Usage: node tools/compare-poisson-matrix.js [baselineRef]   (default: HEAD)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  extractPageScript,
  loadPageScope,
  fetchLiveData,
  usableFixtures
} = require('./load-page-scope.js');

const REPO_ROOT = path.join(__dirname, '..');
const HTML_REL = 'odds-calculator.html';
const HTML_PATH = path.join(REPO_ROOT, HTML_REL);
const BASELINE_REF = process.argv[2] || 'HEAD';
const OVERLAP = 6;   // the original 0-5 x 0-5 grid

function gitShow(ref, relPath) {
  return execFileSync('git', ['show', `${ref}:${relPath}`], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
}

async function main() {
  const oldPage = loadPageScope(
    extractPageScript(gitShow(BASELINE_REF, HTML_REL)),
    `${BASELINE_REF}:${HTML_REL}<script>`
  );
  const newPage = loadPageScope(
    extractPageScript(fs.readFileSync(HTML_PATH, 'utf8')),
    `worktree:${HTML_REL}<script>`
  );

  const { matchesData, teamStats, upcomingFixtures } = await fetchLiveData();
  oldPage.setData(matchesData, teamStats);
  newPage.setData(matchesData, teamStats);

  const fixtures = usableFixtures(upcomingFixtures, teamStats, 6);
  if (fixtures.length < 5) {
    throw new Error(`Only ${fixtures.length} usable fixtures; need at least 5`);
  }

  console.log(`Cell-identity check: ${BASELINE_REF} vs working tree`);
  console.log(`Comparing the original ${OVERLAP}x${OVERLAP} block with Object.is (exact bits)`);
  console.log('='.repeat(78));

  let totalDiffs = 0;

  for (const f of fixtures) {
    const oldData = oldPage.calculatePoissonMatrix(f.home_team, f.away_team);
    const newData = newPage.calculatePoissonMatrix(f.home_team, f.away_team);
    if (!oldData || !newData) {
      throw new Error(`calculatePoissonMatrix returned null for ${f.home_team} vs ${f.away_team}`);
    }

    const problems = [];

    // Expected goals must be untouched too — the formula was explicitly out of scope.
    if (!Object.is(oldData.homeExpected, newData.homeExpected)) {
      problems.push(`homeExpected ${oldData.homeExpected} -> ${newData.homeExpected}`);
    }
    if (!Object.is(oldData.awayExpected, newData.awayExpected)) {
      problems.push(`awayExpected ${oldData.awayExpected} -> ${newData.awayExpected}`);
    }

    if (oldData.matrix.length < OVERLAP || newData.matrix.length < OVERLAP) {
      throw new Error('A matrix is smaller than the original 6x6 overlap region');
    }

    const expectedGoalDiffs = problems.length;   // any entries so far are lambda mismatches

    let cellDiffs = 0;
    for (let i = 0; i < OVERLAP; i++) {
      for (let j = 0; j < OVERLAP; j++) {
        const a = oldData.matrix[i][j];
        const b = newData.matrix[i][j];
        if (!Object.is(a, b)) {
          cellDiffs++;
          if (problems.length < 8) problems.push(`cell [${i}][${j}] ${a} -> ${b}`);
        }
      }
    }
    totalDiffs += cellDiffs + expectedGoalDiffs;

    const dims = `${oldData.matrix.length}x${oldData.matrix[0].length} -> ` +
                 `${newData.matrix.length}x${newData.matrix[0].length}`;
    console.log(
      `\n${f.home_team} vs ${f.away_team}`.padEnd(40) + dims
    );
    console.log(`  identical cells  ${OVERLAP * OVERLAP - cellDiffs}/${OVERLAP * OVERLAP}`);
    console.log(`  differing cells  ${cellDiffs}`);
    if (problems.length) {
      for (const p of problems) console.log(`  !! ${p}`);
    } else {
      console.log('  expected goals   unchanged');
    }
  }

  console.log('\n' + '='.repeat(78));
  if (totalDiffs === 0) {
    console.log(`PASS: all ${fixtures.length} fixtures bit-identical across the original ${OVERLAP}x${OVERLAP} block.`);
  } else {
    console.log(`FAIL: ${totalDiffs} difference(s) found in the original block.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
