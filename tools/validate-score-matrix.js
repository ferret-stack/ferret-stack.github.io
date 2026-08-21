'use strict';

/**
 * Standalone, reusable validation for a scoreline probability matrix.
 *
 * Knows nothing about Poisson, fixtures, or this site's data model — it takes any
 * 2D array of probabilities and reports on it. Reusable from any audit or test.
 *
 * Checks:
 *   (a) all scoreline probabilities sum to ~1.0 (within `tolerance`)
 *   (b) no probability is negative
 *   (c) no probability exceeds 1.0
 *
 * Always reports the actual sum at full precision, never a bare pass/fail.
 *
 * @param {number[][]} matrix          rows = home goals, cols = away goals
 * @param {object}     [options]
 * @param {number}     [options.tolerance=0.001]  allowed deviation from 1.0
 * @returns {{
 *   sum: number,
 *   deviation: number,
 *   passed: boolean,
 *   cellCount: number,
 *   min: number,
 *   max: number,
 *   tolerance: number,
 *   checks: { sumsToOne: boolean, noNegative: boolean, noneExceedOne: boolean },
 *   violations: Array<{ check: string, row: number, col: number, value: number }>
 * }}
 */
function validateScoreMatrix(matrix, options = {}) {
  const tolerance = options.tolerance === undefined ? 0.001 : options.tolerance;

  if (!Array.isArray(matrix) || matrix.length === 0 || !matrix.every(Array.isArray)) {
    throw new TypeError('validateScoreMatrix: expected a non-empty 2D array of numbers');
  }

  const violations = [];
  let sum = 0;
  let cellCount = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      const value = matrix[row][col];
      cellCount++;

      if (typeof value !== 'number' || !Number.isFinite(value)) {
        violations.push({ check: 'finite', row, col, value });
        continue;
      }

      sum += value;
      if (value < min) min = value;
      if (value > max) max = value;

      if (value < 0) violations.push({ check: 'noNegative', row, col, value });
      if (value > 1) violations.push({ check: 'noneExceedOne', row, col, value });
    }
  }

  const deviation = sum - 1;
  const checks = {
    sumsToOne: Math.abs(deviation) <= tolerance,
    noNegative: !violations.some(v => v.check === 'noNegative'),
    noneExceedOne: !violations.some(v => v.check === 'noneExceedOne')
  };
  const allFinite = !violations.some(v => v.check === 'finite');

  return {
    sum,
    deviation,
    passed: allFinite && checks.sumsToOne && checks.noNegative && checks.noneExceedOne,
    cellCount,
    min: min === Infinity ? NaN : min,
    max: max === -Infinity ? NaN : max,
    tolerance,
    checks,
    violations
  };
}

module.exports = { validateScoreMatrix };
