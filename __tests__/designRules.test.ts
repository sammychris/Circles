import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { moodColors, night, space, type } from '../src/theme/tokens';
import tokens from '../docs/design/tokens.json';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : full.endsWith('.tsx') ? [full] : [];
  });
}

describe('theme matches docs/design/tokens.json', () => {
  it('has every night colour', () => {
    for (const [key, value] of Object.entries(tokens.color.night)) {
      expect((night as Record<string, string>)[key]).toBe(value);
    }
  });

  it('has the same mood colours', () => {
    for (const [key, value] of Object.entries(tokens.color.mood)) {
      expect((moodColors as Record<string, { fg: string; bg: string }>)[key]).toEqual(value.night);
    }
  });

  it('has the same spacing scale', () => {
    expect([...new Set(Object.values(space))].sort((a, b) => a - b)).toEqual(
      [...new Set(Object.values(tokens.space))].sort((a, b) => a - b),
    );
  });

  it('has the same text sizes', () => {
    for (const [key, value] of Object.entries(tokens.type)) {
      expect((type as Record<string, { fontSize: number }>)[key].fontSize).toBe(value.size);
    }
  });
});

describe('components use the theme, not raw values', () => {
  const files = sourceFiles(join(__dirname, '..', 'src'));

  it('has no hex colours inside screens or components', () => {
    for (const file of files) {
      expect({ file, hits: readFileSync(file, 'utf8').match(/#[0-9a-fA-F]{3,8}\b/g) }).toEqual({ file, hits: null });
    }
  });

  it('has no raw rgba colours inside screens or components', () => {
    for (const file of files) {
      expect({ file, hits: readFileSync(file, 'utf8').match(/rgba?\(/g) }).toEqual({ file, hits: null });
    }
  });

  it('has no placeholder text in square brackets', () => {
    for (const file of files) {
      expect({ file, hits: readFileSync(file, 'utf8').match(/\[[A-Z][A-Z ]{6,}\]/g) }).toEqual({ file, hits: null });
    }
  });
});
