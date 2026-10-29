import { describe, it, expect } from 'vitest';
import { titleKey } from './text';

describe('titleKey', () => {
  it('converts text to lowercase', () => {
    expect(titleKey('Game')).toBe('game');
    expect(titleKey('SOME TEXT')).toBe('some text');
  });

  it('removes accents', () => {
    expect(titleKey('Pokémon')).toBe('pokemon');
    expect(titleKey('Épée')).toBe('epee');
    expect(titleKey('Ragnarök')).toBe('ragnarok');
  });

  it('replaces punctuation with spaces', () => {
    expect(titleKey('Spider-Man')).toBe('spider man');
    expect(titleKey('Zelda: Breath of the Wild')).toBe('zelda breath of the wild');
    expect(titleKey('Command & Conquer!')).toBe('command conquer');
  });

  it('trims leading and trailing spaces', () => {
    expect(titleKey('  Hello World  ')).toBe('hello world');
    expect(titleKey(' !Game ')).toBe('game');
  });

  it('compresses multiple spaces into single spaces', () => {
    expect(titleKey('One   Two')).toBe('one two');
    expect(titleKey('One - Two')).toBe('one two');
  });

  it('preserves numbers', () => {
    expect(titleKey('GTA 5')).toBe('gta 5');
    expect(titleKey('2048')).toBe('2048');
  });

  it('handles empty strings', () => {
    expect(titleKey('')).toBe('');
    expect(titleKey('   ')).toBe('');
  });
});
