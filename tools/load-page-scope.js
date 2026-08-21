'use strict';

/**
 * Shared helper: run the real shipped odds-calculator page script in a Node sandbox.
 *
 * Used by tools/audit-poisson-matrix.js and tools/compare-poisson-matrix.js so both
 * exercise the actual page code rather than a hand-copy that could drift. The HTML is
 * only ever read — never written.
 */

const vm = require('vm');

/** Pull the inline <script> body (the one defining calculatePoissonMatrix) out of the page. */
function extractPageScript(html) {
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => m[1]);
  const block = blocks.find(b => b.includes('function calculatePoissonMatrix'));
  if (!block) {
    throw new Error('Could not find the inline <script> defining calculatePoissonMatrix');
  }
  return block;
}

/**
 * Evaluate a page script in a fresh sandbox and return a bridge onto its internals.
 *
 * The page declares its state with `let` (e.g. `let teamStats = {}`), which creates a
 * lexical binding that never lands on the sandbox object — so it cannot be populated from
 * outside. A bridge appended to the SAME evaluation shares that lexical scope, giving us a
 * handle on the page's real variables.
 *
 * @param {string} scriptBody  the inline script text
 * @param {string} [label]     filename shown in stack traces
 * @returns {{ setData: Function, getLeagueContext: Function, calculatePoissonMatrix: Function }}
 */
function loadPageScope(scriptBody, label = 'odds-calculator.html<script>') {
  const noop = () => {};
  const stubElement = {
    innerHTML: '', textContent: '', value: '', className: '', style: {},
    dataset: {}, classList: { toggle: noop, add: noop, remove: noop },
    appendChild: noop, addEventListener: noop
  };
  const sandbox = {
    console,
    document: {
      getElementById: () => stubElement,
      querySelectorAll: () => [],
      createElement: () => Object.create(stubElement),
      addEventListener: noop   // swallows DOMContentLoaded -> loadAllData never fires
    },
    window: {},
    Chart: function Chart() {}
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const bridge = `
;globalThis.__bridge = {
  setData(m, t) { matchesData = m; teamStats = t; },
  getLeagueContext() { return { matchCount: matchesData.length }; },
  calculatePoissonMatrix
};`;
  vm.runInContext(scriptBody + bridge, sandbox, { filename: label });

  const bridged = sandbox.__bridge;
  if (!bridged || typeof bridged.calculatePoissonMatrix !== 'function') {
    throw new Error(`calculatePoissonMatrix was not defined after evaluating ${label}`);
  }
  return bridged;
}

const DATA_BASE_URL = 'https://raw.githubusercontent.com/ferret-stack/odds-calculator/main/data';

async function fetchJson(name) {
  const res = await fetch(`${DATA_BASE_URL}/${name}`);
  if (!res.ok) throw new Error(`GET ${name} -> HTTP ${res.status}`);
  return res.json();
}

/** Fetch the three datasets the Poisson path depends on, from the live source. */
async function fetchLiveData() {
  const [matchesData, teamStats, upcomingFixtures] = await Promise.all([
    fetchJson('matches_data.json'),
    fetchJson('team_stats.json'),
    fetchJson('upcoming_fixtures.json')
  ]);
  return { matchesData, teamStats, upcomingFixtures };
}

/** Fixtures from upcoming_fixtures.json whose teams both have stats — real served fixtures. */
function usableFixtures(upcomingFixtures, teamStats, limit = 6) {
  return upcomingFixtures
    .filter(f => teamStats[f.home_team] && teamStats[f.away_team])
    .slice(0, limit);
}

module.exports = {
  extractPageScript,
  loadPageScope,
  fetchJson,
  fetchLiveData,
  usableFixtures,
  DATA_BASE_URL
};
