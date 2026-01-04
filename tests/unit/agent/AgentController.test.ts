import { describe, it, expect } from "vitest";

import { classifyError } from "@/agent/AgentController";

describe("classifyError", () => {
  describe("transient errors", () => {
    it("should classify process exit errors as transient", () => {
      const error = new Error("process exited with code 1");
      expect(classifyError(error)).toBe("transient");
    });

    it("should classify rate limit errors as transient", () => {
      const error = new Error("Rate limit exceeded");
      expect(classifyError(error)).toBe("transient");
    });

    it("should classify 429 errors as transient", () => {
      const error = new Error("HTTP 429 Too Many Requests");
      expect(classifyError(error)).toBe("transient");
    });

    it("should classify timeout errors as transient", () => {
      const error = new Error("Connection timeout");
      expect(classifyError(error)).toBe("transient");
    });

    it("should classify etimedout errors as transient", () => {
      const error = new Error("ETIMEDOUT: connection timed out");
      expect(classifyError(error)).toBe("transient");
    });

    it("should classify socket hang up as transient", () => {
      const error = new Error("socket hang up");
      expect(classifyError(error)).toBe("transient");
    });

    it("should classify econnreset as transient", () => {
      const error = new Error("ECONNRESET: connection reset by peer");
      expect(classifyError(error)).toBe("transient");
    });
  });

  describe("auth errors", () => {
    it("should classify unauthorized errors as auth", () => {
      const error = new Error("Unauthorized - invalid credentials");
      expect(classifyError(error)).toBe("auth");
    });

    it("should classify 401 errors as auth", () => {
      const error = new Error("HTTP 401 Unauthorized");
      expect(classifyError(error)).toBe("auth");
    });

    it("should classify invalid API key as auth", () => {
      const error = new Error("Invalid API Key provided");
      expect(classifyError(error)).toBe("auth");
    });

    it("should classify forbidden errors as auth", () => {
      const error = new Error("Forbidden access");
      expect(classifyError(error)).toBe("auth");
    });

    it("should classify 403 errors as auth", () => {
      const error = new Error("HTTP 403 Forbidden");
      expect(classifyError(error)).toBe("auth");
    });

    it("should classify authentication errors as auth", () => {
      const error = new Error("Authentication failed");
      expect(classifyError(error)).toBe("auth");
    });
  });

  describe("network errors", () => {
    it("should classify network errors as network", () => {
      const error = new Error("Network error: ENOTFOUND");
      expect(classifyError(error)).toBe("network");
    });

    it("should classify DNS errors as network", () => {
      const error = new Error("DNS resolution failed");
      expect(classifyError(error)).toBe("network");
    });

    it("should classify getaddrinfo errors as network", () => {
      const error = new Error("getaddrinfo ENOTFOUND api.anthropic.com");
      expect(classifyError(error)).toBe("network");
    });

    it("should classify enotfound as network", () => {
      const error = new Error("ENOTFOUND: host not found");
      expect(classifyError(error)).toBe("network");
    });

    it("should classify econnrefused as network", () => {
      const error = new Error("ECONNREFUSED: connection refused");
      expect(classifyError(error)).toBe("network");
    });
  });

  describe("permanent errors", () => {
    it("should classify unknown errors as permanent", () => {
      const error = new Error("Something unexpected happened");
      expect(classifyError(error)).toBe("permanent");
    });

    it("should classify empty message as permanent", () => {
      const error = new Error("");
      expect(classifyError(error)).toBe("permanent");
    });

    it("should classify random errors as permanent", () => {
      const error = new Error("xyz123 unrelated error");
      expect(classifyError(error)).toBe("permanent");
    });
  });

  describe("case insensitivity", () => {
    it("should be case insensitive for RATE LIMIT", () => {
      const error = new Error("RATE LIMIT EXCEEDED");
      expect(classifyError(error)).toBe("transient");
    });

    it("should be case insensitive for UNAUTHORIZED", () => {
      const error = new Error("UNAUTHORIZED");
      expect(classifyError(error)).toBe("auth");
    });

    it("should be case insensitive for Network", () => {
      const error = new Error("Network Error");
      expect(classifyError(error)).toBe("network");
    });
  });

  describe("priority of classification", () => {
    // When multiple keywords are present, earlier checks take priority.
    it("should prioritize transient over auth when both present", () => {
      const error = new Error("rate limit on unauthorized request");
      expect(classifyError(error)).toBe("transient");
    });

    it("should prioritize auth over network when both present", () => {
      const error = new Error("unauthorized network error");
      expect(classifyError(error)).toBe("auth");
    });
  });
});
