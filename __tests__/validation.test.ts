import {
  cleanCode,
  isAdult,
  isCodeComplete,
  isValidEmail,
  nicknameProblem,
  parseDateOfBirth,
  toIsoDate,
} from '../src/lib/validation';

const today = new Date(Date.UTC(2026, 9, 8)); // 8 October 2026

describe('email', () => {
  it('accepts normal addresses', () => {
    expect(isValidEmail('sammy@gmail.com')).toBe(true);
    expect(isValidEmail('  ada.k+circles@yahoo.co.uk ')).toBe(true);
  });
  it('rejects broken ones', () => {
    expect(isValidEmail('sammy')).toBe(false);
    expect(isValidEmail('sammy@gmail')).toBe(false);
    expect(isValidEmail('sam my@gmail.com')).toBe(false);
  });
});

describe('code', () => {
  it('keeps digits only, up to 8', () => {
    expect(cleanCode('12 34-56')).toBe('123456');
    expect(cleanCode('1234567890')).toBe('12345678');
  });
  it('needs at least 6 digits', () => {
    expect(isCodeComplete('12345')).toBe(false);
    expect(isCodeComplete('123456')).toBe(true);
  });
});

describe('date of birth', () => {
  it('reads a real date', () => {
    expect(toIsoDate(parseDateOfBirth('5', '3', '1995', today)!)).toBe('1995-03-05');
  });
  it('rejects dates that do not exist or are in the future', () => {
    expect(parseDateOfBirth('31', '2', '2000', today)).toBeNull();
    expect(parseDateOfBirth('1', '13', '2000', today)).toBeNull();
    expect(parseDateOfBirth('1', '1', '1800', today)).toBeNull();
    expect(parseDateOfBirth('1', '1', '2030', today)).toBeNull();
    expect(parseDateOfBirth('aa', '1', '2000', today)).toBeNull();
  });
  it('lets in people who turn 18 today, not a day before', () => {
    expect(isAdult(parseDateOfBirth('8', '10', '2008', today)!, today)).toBe(true);
    expect(isAdult(parseDateOfBirth('9', '10', '2008', today)!, today)).toBe(false);
    expect(isAdult(parseDateOfBirth('1', '1', '2012', today)!, today)).toBe(false);
  });
});

describe('nickname', () => {
  it('accepts names like the designs use', () => {
    expect(nicknameProblem('Ada_K')).toBeNull();
    expect(nicknameProblem('quietone')).toBeNull();
    expect(nicknameProblem('NightOwl_22')).toBeNull();
  });
  it('explains what is wrong', () => {
    expect(nicknameProblem('A')).toBe('tooShort');
    expect(nicknameProblem('a'.repeat(21))).toBe('tooLong');
    expect(nicknameProblem('Ada K')).toBe('badCharacters');
    expect(nicknameProblem('Adé')).toBe('badCharacters');
  });
  it('never lets a phone number become a name', () => {
    expect(nicknameProblem('08031234567')).toBe('looksLikeNumber');
    expect(nicknameProblem('call_08031234567')).toBe('looksLikeNumber');
  });
});
