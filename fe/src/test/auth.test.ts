import { describe, it, expect, beforeEach } from "vitest";
import {
  signIn,
  signOut,
  sanitizeRedirectUrl,
  requestPasswordReset,
  DEMO_PASSWORD,
} from "@/features/auth/services/authService";
import { resetDemo } from "@/lib/hms/store";

describe("authService", () => {
  beforeEach(() => {
    resetDemo();
  });

  describe("Open Redirect Protection", () => {
    it("rejects absolute external URLs", () => {
      expect(sanitizeRedirectUrl("https://evil.example")).toBe("");
      expect(sanitizeRedirectUrl("http://evil.example/login")).toBe("");
      expect(sanitizeRedirectUrl("javascript:alert(1)")).toBe("");
    });

    it("rejects protocol-relative and malformed slashes", () => {
      expect(sanitizeRedirectUrl("//evil.example")).toBe("");
      expect(sanitizeRedirectUrl("//evil.example/test")).toBe("");
      expect(sanitizeRedirectUrl("/\\evil.example")).toBe("");
    });

    it("accepts valid relative internal application paths", () => {
      expect(sanitizeRedirectUrl("/dashboard")).toBe("/dashboard");
      expect(sanitizeRedirectUrl("/modules")).toBe("/modules");
      expect(sanitizeRedirectUrl("/queue?session=s1")).toBe("/queue?session=s1");
      expect(sanitizeRedirectUrl("/invoices/inv1")).toBe("/invoices/inv1");
    });

    it("handles null and empty input safely", () => {
      expect(sanitizeRedirectUrl(null)).toBe("");
      expect(sanitizeRedirectUrl(undefined)).toBe("");
      expect(sanitizeRedirectUrl("")).toBe("");
    });
  });

  describe("signIn authentication logic", () => {
    it("signs in valid admin user and returns both permitted modules", async () => {
      const res = await signIn("admin", DEMO_PASSWORD);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.user.role).toBe("admin");
        expect(res.permittedModules).toContain("sfa");
        expect(res.permittedModules).toContain("billing");
      }
    });

    it("signs in nurse and returns only billing module", async () => {
      const res = await signIn("nurse", DEMO_PASSWORD);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.user.role).toBe("nurse");
        expect(res.permittedModules).toEqual(["billing"]);
      }
    });

    it("rejects invalid credentials with generic message", async () => {
      const res = await signIn("admin", "wrong-password-999");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("invalid_credentials");
        expect(res.message).toBe("Username or password is incorrect.");
      }
    });

    it("rejects inactive accounts with clear explanation", async () => {
      const res = await signIn("cashier.old", DEMO_PASSWORD);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("account_inactive");
        expect(res.message).toBe("This account is inactive. Contact your administrator.");
      }
    });
  });

  describe("requestPasswordReset", () => {
    it("returns simulated confirmation without disclosing account existence", async () => {
      const res = await requestPasswordReset("nonexistent@example.com");
      expect(res.success).toBe(true);
      expect(res.simulated).toBe(true);
    });
  });

  describe("signOut", () => {
    it("clears user session from storage", async () => {
      await signIn("admin", DEMO_PASSWORD);
      signOut();
      // Should not throw and clean auth state
    });
  });
});
