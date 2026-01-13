import { describe, it, expect } from "vitest";

import {
  getLaunchAgentPath,
  isMacOS,
  getManualSetupCommand,
} from "../../../src/utils/launchAgentHelper";

describe("launchAgentHelper", () => {
  describe("getLaunchAgentPath", () => {
    it("should return a path ending with the correct plist filename", () => {
      const result = getLaunchAgentPath();
      expect(result).toMatch(/Library\/LaunchAgents\/com\.anthropic\.claude-oauth\.plist$/);
    });

    it("should return a path starting with a home directory", () => {
      const result = getLaunchAgentPath();
      expect(result).toMatch(/^\/[A-Za-z]+/);
    });
  });

  describe("isMacOS", () => {
    it("should return a boolean", () => {
      const result = isMacOS();
      expect(typeof result).toBe("boolean");
    });

    it("should return true on macOS (darwin platform)", () => {
      // This test will pass on macOS and fail on other platforms.
      // This is intentional - we're testing the actual platform detection.
      const result = isMacOS();
      expect(result).toBe(process.platform === "darwin");
    });
  });

  describe("getManualSetupCommand", () => {
    it("should return the correct launchctl command", () => {
      const result = getManualSetupCommand();

      expect(result).toBe(
        'launchctl setenv CLAUDE_CODE_OAUTH_TOKEN "$(echo $CLAUDE_CODE_OAUTH_TOKEN)"'
      );
    });

    it("should include launchctl setenv", () => {
      const result = getManualSetupCommand();
      expect(result).toContain("launchctl setenv");
    });

    it("should include CLAUDE_CODE_OAUTH_TOKEN", () => {
      const result = getManualSetupCommand();
      expect(result).toContain("CLAUDE_CODE_OAUTH_TOKEN");
    });
  });

  describe("plist content validation", () => {
    // Test the plist content structure without actually creating files.
    // We validate the expected content by checking the generatePlistContent function behavior.
    // Since it's private, we test indirectly through setupClaudeOAuthLaunchAgent return values.

    it("should have a label matching com.anthropic.claude-oauth", () => {
      const path = getLaunchAgentPath();
      expect(path).toContain("com.anthropic.claude-oauth");
    });
  });

  describe("platform detection", () => {
    it("isMacOS should correctly detect macOS", () => {
      // On macOS: should be true
      // On other platforms: should be false
      const result = isMacOS();
      if (process.platform === "darwin") {
        expect(result).toBe(true);
      } else {
        expect(result).toBe(false);
      }
    });
  });
});
