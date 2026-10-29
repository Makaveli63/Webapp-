import { formatDate, formatDayTime } from "./format";

describe("formatDate", () => {
  it("formats a standard ISO date string to a French localized date string", () => {
    const isoString = "2024-10-31T16:00:00Z";
    expect(formatDate(isoString)).toBe("31 octobre 2024");
  });

  it("handles different times correctly in Europe/Paris timezone", () => {
    // 2024-10-31 23:30:00 UTC is 2024-11-01 00:30:00 in Paris (Standard Time)
    const isoString = "2024-10-31T23:30:00Z";
    expect(formatDate(isoString)).toBe("1 novembre 2024");
  });
});

describe("formatDayTime", () => {
  it("formats a standard ISO date string to a French localized string with day and time", () => {
    const isoString = "2024-10-31T16:00:00Z";
    expect(formatDayTime(isoString)).toBe("jeudi 31 octobre à 17:00");
  });

  it("handles Daylight Saving Time appropriately", () => {
    // 2024-08-01 16:00:00 UTC is 2024-08-01 18:00:00 in Paris (DST)
    const isoString = "2024-08-01T16:00:00Z";
    expect(formatDayTime(isoString)).toBe("jeudi 1 août à 18:00");
  });
});
