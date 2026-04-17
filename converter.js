'use strict';

/**
 * Roman Numeral Converter
 *
 * Reference spec: https://en.wikipedia.org/wiki/Roman_numerals
 *
 * Roman numerals use seven symbols:
 *   I=1, V=5, X=10, L=50, C=100, D=500, M=1000
 *
 * Subtractive notation: a smaller symbol placed BEFORE a larger one means
 * subtraction. Only the following six subtractive pairs are valid:
 *   IV=4, IX=9, XL=40, XC=90, CD=400, CM=900
 *
 * Algorithm: greedy descent.
 *   Build a lookup table ordered from largest to smallest value.
 *   While the number > 0, find the largest table entry that fits,
 *   append its symbol(s), and subtract its value. Repeat.
 *
 * Supported range: 1–3999 (standard Roman numeral range).
 * Numbers >= 4000 require non-standard notation (vinculum / apostrophus)
 * which is outside the scope of this implementation.
 */

const nos = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
const val = [1000,900,500,400,100, 90, 50, 40, 10,  9, 5,  4,  1];

/**
 * Convert an integer to its Roman numeral representation.
 *
 * @param {number} num - Integer in the range [1, 3999].
 * @returns {string} Roman numeral string (e.g. 2024 → "MMXXIV").
 * @throws {RangeError} If num is outside [1, 3999].
 * @throws {TypeError} If num is not a finite integer.
 */
function toRoman(num) {
 
  if (!Number.isFinite(num)) {
    throw new TypeError(`Input must be a finite number; received: ${num}`);
  }

  if (!Number.isInteger(num)) {
    throw new TypeError(`Input must be an integer; received: ${num}`);
  }

  if (num < 1 || num > 3999) {
    throw new RangeError(
      `Input must be between 1 and 3999 inclusive; received: ${num}`
    );
  }

  let ans = '';
  let pos = 0;

  while (num > 0) {
    while (num >= val[pos]) {
      num -= val[pos];
      ans += nos[pos];
    }
    pos++;
  }

  return ans;
}

module.exports = { toRoman };