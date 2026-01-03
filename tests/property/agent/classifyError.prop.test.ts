import { describe, it, expect } from "vitest";
import fc from "fast-check";

// Import the actual function from source code.
import { classifyError } from "../../../src/agent/AgentController";
import type { ErrorType } from "../../../src/types";

describe("classifyError property tests", () => {
  it("should always return a valid ErrorType", () => {
    fc.assert(
      fc.property(fc.string(), (message) => {
        const error = new Error(message);
        const result = classifyError(error);
        const validTypes: ErrorType[] = ["transient", "auth", "network", "permanent"];
        expect(validTypes).toContain(result);
      }),
      { numRuns: 1000 }
    );
  });

  it("should be deterministic - same input always gives same output", () => {
    fc.assert(
      fc.property(fc.string(), (message) => {
        const error1 = new Error(message);
        const error2 = new Error(message);
        expect(classifyError(error1)).toBe(classifyError(error2));
      }),
      { numRuns: 500 }
    );
  });

  it("should classify messages containing transient keywords as transient", () => {
    const transientKeywords = fc.constantFrom(
      "rate limit",
      "429",
      "timeout",
      "etimedout",
      "socket hang up",
      "econnreset",
      "process exited with code 1"
    );

    fc.assert(
      fc.property(transientKeywords, (keyword) => {
        const error = new Error(keyword);
        expect(classifyError(error)).toBe("transient");
      }),
      { numRuns: 100 }
    );
  });

  it("should classify messages containing auth keywords as auth", () => {
    const authKeywords = fc.constantFrom(
      "unauthorized",
      "401",
      "invalid api key",
      "forbidden",
      "403",
      "authentication"
    );

    fc.assert(
      fc.property(authKeywords, (keyword) => {
        const error = new Error(keyword);
        expect(classifyError(error)).toBe("auth");
      }),
      { numRuns: 100 }
    );
  });

  it("should classify messages containing network keywords as network", () => {
    const networkKeywords = fc.constantFrom(
      "network",
      "enotfound",
      "dns",
      "getaddrinfo",
      "econnrefused"
    );

    fc.assert(
      fc.property(networkKeywords, (keyword) => {
        const error = new Error(keyword);
        expect(classifyError(error)).toBe("network");
      }),
      { numRuns: 100 }
    );
  });

  it("should handle very long error messages", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1000, maxLength: 10000 }), (message) => {
        const error = new Error(message);
        const result = classifyError(error);
        expect(["transient", "auth", "network", "permanent"]).toContain(result);
      }),
      { numRuns: 50 }
    );
  });

  it("should handle special characters in error messages", () => {
    const specialChars = fc.string({
      minLength: 1,
      maxLength: 100,
    });

    fc.assert(
      fc.property(specialChars, (message) => {
        const error = new Error(message);
        const result = classifyError(error);
        expect(["transient", "auth", "network", "permanent"]).toContain(result);
      }),
      { numRuns: 200 }
    );
  });

  it("should handle unicode in error messages", () => {
    fc.assert(
      fc.property(fc.unicodeString(), (message) => {
        const error = new Error(message);
        const result = classifyError(error);
        expect(["transient", "auth", "network", "permanent"]).toContain(result);
      }),
      { numRuns: 200 }
    );
  });

  it("should be case insensitive for all keyword matches", () => {
    const keywords = fc.constantFrom(
      "RATE LIMIT",
      "Timeout",
      "UNAUTHORIZED",
      "forbidden",
      "NETWORK",
      "DNS"
    );

    fc.assert(
      fc.property(keywords, (keyword) => {
        const upperError = new Error(keyword.toUpperCase());
        const lowerError = new Error(keyword.toLowerCase());
        const mixedError = new Error(keyword);
        expect(classifyError(upperError)).toBe(classifyError(lowerError));
        expect(classifyError(mixedError)).toBe(classifyError(lowerError));
      }),
      { numRuns: 50 }
    );
  });

  it("should return permanent for strings without any matching keywords", () => {
    // Test with specific strings that definitely don't contain keywords.
    const safeStrings = [
      "hello world",
      "just a test",
      "xyz abc",
      "foo bar baz",
      "some random message",
      "1234",
      "!!??!!",
      "nothing special here",
      "no keywords at all",
      "completely safe string",
    ];

    for (const message of safeStrings) {
      const error = new Error(message);
      expect(classifyError(error)).toBe("permanent");
    }
  });
});
