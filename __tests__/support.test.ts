import { hostName, priceWords } from '../src/support/api';

jest.mock('../src/lib/supabase', () => ({ supabase: {} }));

describe('host cards', () => {
  it('shows a professional by their real name, a listener by nickname', () => {
    expect(hostName({ kind: 'professional', fullName: 'Dr Kemi Adeyemi', nickname: 'kemi' })).toBe('Dr Kemi Adeyemi');
    expect(hostName({ kind: 'listener', fullName: 'Hidden Name', nickname: 'lola' })).toBe('lola');
  });
  it('says the price before anything is asked', () => {
    expect(priceWords({ priceNaira: 0, minutes: 30, freeFirst: false })).toBe('Free · 30 min');
    expect(priceWords({ priceNaira: 15000, minutes: 45, freeFirst: false })).toBe('₦15,000 · 45 min');
    expect(priceWords({ priceNaira: 15000, minutes: 30, freeFirst: true })).toBe('₦15,000 · 30 min · first session free');
  });
});
