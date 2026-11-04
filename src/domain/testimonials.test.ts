import { describe, expect, it } from "vitest";
import { formatCount, formatDuration } from "./testimonials";

describe("depoimentos", () => {
  it("formata duração", () => {
    expect(formatDuration(205)).toBe("3:25");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(null)).toBeNull();
  });
  it("formata contagens", () => {
    expect(formatCount(850)).toBe("850");
    expect(formatCount(100000)).toBe("+100 Mil");
    expect(formatCount(1500)).toBe("+1,5 Mil");
    expect(formatCount(50000)).toBe("+50 Mil");
  });
});
