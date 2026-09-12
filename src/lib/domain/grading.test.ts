import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatPercent,
  formatPhone,
  formatTime,
  mean,
  perfLabel,
  perfLevel,
} from "./grading";

describe("currency formatting", () => {
  it("renders Ghana cedis with a thousands separator", () => {
    expect(formatCurrency(1250)).toBe("₵ 1,250");
  });

  it("rounds fractional cedis to the nearest unit", () => {
    expect(formatCurrency(1250.6)).toBe("₵ 1,251");
  });

  it("compacts large figures for KPI tiles", () => {
    expect(formatCurrencyCompact(6_400_000)).toBe("₵ 6.4M");
    expect(formatCurrencyCompact(12_000)).toBe("₵ 12K");
    expect(formatCurrencyCompact(940)).toBe("₵ 940");
  });

  it("keeps negative balances readable", () => {
    // toFixed rounds halfway values away from zero for both signs.
    expect(formatCurrencyCompact(-2_500)).toBe("₵ -3K");
    expect(formatCurrencyCompact(2_500)).toBe("₵ 3K");
  });
});

describe("performance bands", () => {
  it("maps scores onto the GES proficiency ladder", () => {
    expect(perfLevel(92)).toBe("HP");
    expect(perfLevel(80)).toBe("HP");
    expect(perfLevel(79.9)).toBe("P");
    expect(perfLevel(65)).toBe("P");
    expect(perfLevel(64)).toBe("AP");
    expect(perfLevel(50)).toBe("AP");
    expect(perfLevel(49)).toBe("D");
    expect(perfLevel(0)).toBe("D");
  });

  it("labels each band", () => {
    expect(perfLabel("HP")).toBe("Highly Proficient");
    expect(perfLabel("D")).toBe("Developing");
  });
});

describe("mean", () => {
  it("returns 0 for no marks rather than NaN", () => {
    expect(mean([])).toBe(0);
  });

  it("rounds to one decimal place", () => {
    expect(mean([70, 75, 81])).toBe(75.3);
    expect(mean([100])).toBe(100);
  });
});

describe("misc formatters", () => {
  it("formats percentages", () => {
    expect(formatPercent(93.456)).toBe("93.5%");
    expect(formatPercent(93.456, 0)).toBe("93%");
  });

  it("formats dates as DD/MM/YYYY and blanks empty values", () => {
    expect(formatDate("2026-03-09T10:00:00Z")).toBe("09/03/2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("trims database times to HH:mm", () => {
    expect(formatTime("14:30:00")).toBe("14:30");
    expect(formatTime(null)).toBe("—");
  });

  it("normalises Ghana phone numbers", () => {
    expect(formatPhone("0245123390")).toBe("+233 24 512 3390");
    expect(formatPhone("+233245123390")).toBe("+233 24 512 3390");
    expect(formatPhone("233245123390")).toBe("+233 24 512 3390");
    // Unrecognised lengths are shown verbatim rather than mangled.
    expect(formatPhone("12345")).toBe("12345");
    expect(formatPhone(null)).toBe("—");
  });
});
