import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { findPlaceholders } = require('../scripts/check-placeholders.js');

describe('placeholder guard for production builds', () => {
  it('finds no placeholder text in the app today', () => {
    expect(findPlaceholders(join(__dirname, '..', 'src'))).toEqual([]);
  });
});

describe('placeholder pattern', () => {
  it('catches short placeholders like [PRICE] but not ordinary code', () => {
    const pattern = /\[[A-Z][A-Z _]{3,}\]/g;
    expect('Pay [PRICE] a month'.match(pattern)).toEqual(['[PRICE]']);
    expect('const seats = [a, b]; list[0]; [VERIFIED NIGERIA CRISIS LINE]'.match(pattern)).toEqual([
      '[VERIFIED NIGERIA CRISIS LINE]',
    ]);
  });
});
