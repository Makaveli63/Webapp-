import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkPseudo } from '../player';
import * as social from '../social';

// We mock the entire social module using vi.mock
vi.mock('../social', () => {
  let socialEnabledMock = false;
  return {
    rpc: vi.fn(),
    savePseudo: vi.fn(),
    get socialEnabled() { return socialEnabledMock; },
    set socialEnabled(val) { socialEnabledMock = val; },
    voterId: vi.fn(() => 'test-voter-id'),
  };
});

describe('checkPseudo validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup: social disabled
    // @ts-ignore - we added a setter in the mock
    social.socialEnabled = false;
  });

  describe('format validation', () => {
    it('returns PSEUDO_FORMAT for empty pseudo', async () => {
      expect(await checkPseudo('')).toBe('PSEUDO_FORMAT');
    });

    it('returns PSEUDO_FORMAT for too short pseudos (<3 chars)', async () => {
      expect(await checkPseudo('ab')).toBe('PSEUDO_FORMAT');
      expect(await checkPseudo('a')).toBe('PSEUDO_FORMAT');
    });

    it('returns PSEUDO_FORMAT for too long pseudos (>20 chars)', async () => {
      expect(await checkPseudo('a'.repeat(21))).toBe('PSEUDO_FORMAT');
    });

    it('returns ok for boundaries (3 and 20 chars)', async () => {
      expect(await checkPseudo('abc')).toBe('ok');
      expect(await checkPseudo('a'.repeat(20))).toBe('ok');
    });

    it('returns PSEUDO_FORMAT for pseudos with spaces', async () => {
      expect(await checkPseudo('name with spaces')).toBe('PSEUDO_FORMAT');
    });

    it('returns PSEUDO_FORMAT for pseudos with invalid symbols', async () => {
      expect(await checkPseudo('invalid@name')).toBe('PSEUDO_FORMAT');
      expect(await checkPseudo('no#symbols')).toBe('PSEUDO_FORMAT');
      expect(await checkPseudo('hello!')).toBe('PSEUDO_FORMAT');
    });

    it('accepts letters, numbers, underscores, dots, and dashes', async () => {
      expect(await checkPseudo('ValidName_123')).toBe('ok');
      expect(await checkPseudo('name-with-dash')).toBe('ok');
      expect(await checkPseudo('name.with.dot')).toBe('ok');
      expect(await checkPseudo('_abc.')).toBe('ok');
    });

    it('accepts Unicode letters (accented characters)', async () => {
      expect(await checkPseudo('éàçù')).toBe('ok');
      expect(await checkPseudo('Jérôme')).toBe('ok');
    });

    it('trims whitespace before validation', async () => {
      expect(await checkPseudo('  valid_name  ')).toBe('ok');
      expect(await checkPseudo('  ab  ')).toBe('PSEUDO_FORMAT');
    });
  });

  describe('social integration', () => {
    it('returns "ok" directly when socialEnabled is false', async () => {
      expect(await checkPseudo('valid')).toBe('ok');
      expect(social.rpc).not.toHaveBeenCalled();
    });

    it('calls rpc when socialEnabled is true and returns rpc result', async () => {
      // @ts-ignore
      social.socialEnabled = true;
      vi.mocked(social.rpc).mockResolvedValue('PSEUDO_PRIS');

      const result = await checkPseudo('valid');

      expect(social.rpc).toHaveBeenCalledWith('check_pseudo', { p_pseudo: 'valid', p_voter: 'test-voter-id' });
      expect(result).toBe('PSEUDO_PRIS');
    });

    it('returns "ok" if rpc throws an error', async () => {
      // @ts-ignore
      social.socialEnabled = true;
      vi.mocked(social.rpc).mockRejectedValue(new Error('Network error'));

      const result = await checkPseudo('valid');

      expect(social.rpc).toHaveBeenCalled();
      expect(result).toBe('ok');
    });
  });
});
