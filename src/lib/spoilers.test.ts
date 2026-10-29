import { spoilerShield, SPOILER_KEY } from "./spoilers";

describe("spoilerShield", () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it("should return true when localStorage is empty (default)", () => {
    expect(spoilerShield()).toBe(true);
  });

  it("should return false when localStorage has '0'", () => {
    localStorage.setItem(SPOILER_KEY, "0");
    expect(spoilerShield()).toBe(false);
  });

  it("should return true when localStorage has '1'", () => {
    localStorage.setItem(SPOILER_KEY, "1");
    expect(spoilerShield()).toBe(true);
  });

  it("should return true when localStorage.getItem throws an error", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage is disabled");
    });

    expect(spoilerShield()).toBe(true);
  });
});
