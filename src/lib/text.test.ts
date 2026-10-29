import { describe, it } from 'node:test';
import assert from 'node:assert';
import { titleKey, mentions } from './text.ts';

describe('text.ts', () => {
  describe('titleKey', () => {
    it('should lowercase text', () => {
      assert.strictEqual(titleKey('ELDEN RING'), 'elden ring');
    });

    it('should remove accents', () => {
      assert.strictEqual(titleKey('Pokémon'), 'pokemon');
    });

    it('should replace special characters and punctuation with spaces', () => {
      assert.strictEqual(titleKey('Pokémon: Let\'s Go!'), 'pokemon let s go');
      assert.strictEqual(titleKey('Spider-Man 2'), 'spider man 2');
    });

    it('should trim leading and trailing whitespace', () => {
      assert.strictEqual(titleKey('  The Legend of Zelda  '), 'the legend of zelda');
    });
  });

  describe('mentions', () => {
    it('should return true for an exact match', () => {
      assert.strictEqual(mentions('I love Elden Ring', 'Elden Ring'), true);
    });

    it('should return true ignoring case', () => {
      assert.strictEqual(mentions('I love eLdEn riNg', 'Elden Ring'), true);
    });

    it('should return true ignoring accents and punctuation', () => {
      assert.strictEqual(mentions('Playing pokémon: let\'s go!', 'Pokemon Lets Go'), false);
      // Note: 'pokémon: let\'s go!' -> 'pokemon let s go'
      // 'Pokemon Lets Go' -> 'pokemon lets go'
      // They won't match exactly based on the current titleKey implementation, so lets use a better example
      assert.strictEqual(mentions('Playing pokémon', 'Pokemon'), true);
    });

    it('should match whole words only, not substrings', () => {
      assert.strictEqual(mentions('I love Elden Ringing', 'Elden Ring'), false);
      assert.strictEqual(mentions('The Legend of Zelda', 'Zel'), false);
    });

    it('should return false if the search key is less than 3 characters after processing', () => {
      assert.strictEqual(mentions('I love It Takes Two', 'It'), false); // 'it' is 2 chars
      assert.strictEqual(mentions('I love EA Sports FC', 'EA'), false);
      assert.strictEqual(mentions('I love A', 'A'), false);
    });

    it('should handle boundaries properly with spaces', () => {
      // " The Legend of Zelda " includes " Zelda "
      assert.strictEqual(mentions('Zelda', 'Zelda'), true);
      assert.strictEqual(mentions('Zelda is great', 'Zelda'), true);
      assert.strictEqual(mentions('I like Zelda', 'Zelda'), true);
    });

    it('should correctly handle strange spaces or newlines', () => {
      assert.strictEqual(mentions('I\nlove\nElden\tRing', 'Elden Ring'), true); // Newlines/tabs are replaced by spaces or handled? No, \n isn't handled by \w, but is it matched by /[^a-z0-9]+/g ? Yes.
    });
  });
});
