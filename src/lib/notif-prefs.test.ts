import { readPrefs, DEFAULT_PREFS, PREFS_KEY } from "./notif-prefs";

describe("notif-prefs", () => {
  describe("readPrefs", () => {
    let getItemSpy: jest.SpyInstance;

    beforeEach(() => {
      // Clear localStorage before each test just in case, though we mock getItem directly
      window.localStorage.clear();
      getItemSpy = jest.spyOn(window.localStorage.__proto__, "getItem");
    });

    afterEach(() => {
      getItemSpy.mockRestore();
    });

    it("should return DEFAULT_PREFS if localStorage is empty", () => {
      getItemSpy.mockReturnValue(null);
      const prefs = readPrefs();
      expect(prefs).toEqual(DEFAULT_PREFS);
      expect(getItemSpy).toHaveBeenCalledWith(PREFS_KEY);
    });

    it("should return DEFAULT_PREFS if localStorage contains invalid JSON", () => {
      getItemSpy.mockReturnValue("{ invalid json");
      const prefs = readPrefs();
      expect(prefs).toEqual(DEFAULT_PREFS);
    });

    it("should return DEFAULT_PREFS if localStorage.getItem throws", () => {
      getItemSpy.mockImplementation(() => {
        throw new Error("Access denied");
      });
      const prefs = readPrefs();
      expect(prefs).toEqual(DEFAULT_PREFS);
    });

    it("should merge stored preferences with DEFAULT_PREFS", () => {
      getItemSpy.mockReturnValue(JSON.stringify({ digest: true, myGames: true }));
      const prefs = readPrefs();
      expect(prefs).toEqual({
        ...DEFAULT_PREFS,
        digest: true,
        myGames: true,
      });
    });

    it("should use DEFAULT_PREFS.digestTime if stored digestTime is in invalid format", () => {
      getItemSpy.mockReturnValue(JSON.stringify({ digestTime: "invalid" }));
      const prefs = readPrefs();
      expect(prefs.digestTime).toBe(DEFAULT_PREFS.digestTime);
    });

    it("should use stored digestTime if valid format", () => {
      getItemSpy.mockReturnValue(JSON.stringify({ digestTime: "12:34" }));
      const prefs = readPrefs();
      expect(prefs.digestTime).toBe("12:34");
    });
  });
});
