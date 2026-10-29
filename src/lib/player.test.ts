import { levelOf } from './player';

describe('levelOf', () => {
  it('should return level 1 for negative xp', () => {
    expect(levelOf(-50)).toEqual({ level: 1, into: 0, need: 100 });
  });

  it('should return level 1 for 0 xp', () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, need: 100 });
  });

  it('should handle intermediate values in level 1', () => {
    expect(levelOf(50)).toEqual({ level: 1, into: 50, need: 100 });
  });

  it('should handle exact boundary to level 2', () => {
    expect(levelOf(100)).toEqual({ level: 2, into: 0, need: 150 });
  });

  it('should handle intermediate values in level 2', () => {
    expect(levelOf(120)).toEqual({ level: 2, into: 20, need: 150 });
  });

  it('should handle exact boundary to level 3', () => {
    expect(levelOf(250)).toEqual({ level: 3, into: 0, need: 200 }); // 100 (for lv 1) + 150 (for lv 2) = 250
  });

  it('should handle intermediate values in higher levels', () => {
    expect(levelOf(300)).toEqual({ level: 3, into: 50, need: 200 }); // 250 (up to lv 3) + 50 = 300
  });

  it('should handle very large xp', () => {
    // lv 1: 100
    // lv 2: 150
    // lv 3: 200
    // lv 4: 250
    // lv 5: 300
    // total for lv 6 boundary: 100 + 150 + 200 + 250 + 300 = 1000
    expect(levelOf(1000)).toEqual({ level: 6, into: 0, need: 350 });
    expect(levelOf(1100)).toEqual({ level: 6, into: 100, need: 350 });
  });
});
