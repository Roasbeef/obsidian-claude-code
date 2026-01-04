import { describe, it, expect } from "vitest";
import fc from "fast-check";

// Import actual function from source.
import { formatDuration } from "../../../src/utils/formatting";

describe("formatDuration property tests", () => {
  it("should always return a non-empty string", () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000000 }), (ms) => {
        const result = formatDuration(ms);
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 500 }
    );
  });

  it("should return ms suffix for sub-second durations", () => {
    fc.assert(
      fc.property(fc.nat({ max: 999 }), (ms) => {
        const result = formatDuration(ms);
        expect(result).toMatch(/^\d+ms$/);
      }),
      { numRuns: 100 }
    );
  });

  it("should return s suffix for second-range durations", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000, max: 59999 }), (ms) => {
        const result = formatDuration(ms);
        expect(result).toMatch(/^\d+s$/);
      }),
      { numRuns: 100 }
    );
  });

  it("should return m Xs format for minute-range durations", () => {
    fc.assert(
      fc.property(fc.integer({ min: 60000, max: 10000000 }), (ms) => {
        const result = formatDuration(ms);
        expect(result).toMatch(/^\d+m \d+s$/);
      }),
      { numRuns: 200 }
    );
  });

  it("should be deterministic", () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000000 }), (ms) => {
        const result1 = formatDuration(ms);
        const result2 = formatDuration(ms);
        expect(result1).toBe(result2);
      }),
      { numRuns: 200 }
    );
  });

  it("should preserve ordering (larger ms = same or larger formatted value)", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000000 }),
        fc.nat({ max: 1000000 }),
        (base, delta) => {
          const ms1 = base;
          const ms2 = base + delta;
          const result1 = formatDuration(ms1);
          const result2 = formatDuration(ms2);

          // Parse results back to ms for comparison.
          const parse = (s: string): number => {
            if (s.endsWith("ms")) {
              return parseInt(s);
            }
            if (s.match(/^\d+m \d+s$/)) {
              const [m, rest] = s.split("m ");
              const sec = parseInt(rest);
              return parseInt(m) * 60000 + sec * 1000;
            }
            if (s.endsWith("s")) {
              return parseInt(s) * 1000;
            }
            return 0;
          };

          const parsed1 = parse(result1);
          const parsed2 = parse(result2);

          // Due to flooring, parsed values should satisfy: parsed2 >= parsed1.
          expect(parsed2).toBeGreaterThanOrEqual(parsed1);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("should round down seconds correctly", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000, max: 59999 }), (ms) => {
        const result = formatDuration(ms);
        const expectedSeconds = Math.floor(ms / 1000);
        expect(result).toBe(`${expectedSeconds}s`);
      }),
      { numRuns: 100 }
    );
  });

  it("should calculate minutes and remaining seconds correctly", () => {
    fc.assert(
      fc.property(fc.integer({ min: 60000, max: 10000000 }), (ms) => {
        const result = formatDuration(ms);
        const totalSeconds = Math.floor(ms / 1000);
        const expectedMinutes = Math.floor(totalSeconds / 60);
        const expectedSeconds = totalSeconds % 60;
        expect(result).toBe(`${expectedMinutes}m ${expectedSeconds}s`);
      }),
      { numRuns: 200 }
    );
  });

  it("should handle boundary cases at 1000ms", () => {
    expect(formatDuration(999)).toBe("999ms");
    expect(formatDuration(1000)).toBe("1s");
    expect(formatDuration(1001)).toBe("1s");
  });

  it("should handle boundary cases at 60s", () => {
    expect(formatDuration(59000)).toBe("59s");
    expect(formatDuration(59999)).toBe("59s");
    expect(formatDuration(60000)).toBe("1m 0s");
    expect(formatDuration(60001)).toBe("1m 0s");
  });
});
