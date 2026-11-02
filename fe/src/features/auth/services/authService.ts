import { getDB, mutate } from "@/lib/hms/store";
import { modulesFor } from "@/lib/hms/permissions";
import type { ModuleKey, User } from "@/lib/hms/types";

export const DEMO_PASSWORD = "demo1234";
const REMEMBER_ME_KEY = "hms-remembered-username";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

let failedAttempts = 0;
let lockoutUntil: number | null = null;

export type AuthResult =
  | { success: true; user: User; permittedModules: ModuleKey[] }
  | {
      success: false;
      error: "invalid_credentials" | "account_inactive" | "locked" | "network_error";
      remainingSeconds?: number;
      message: string;
    };

/**
 * Sanitizes and validates redirect URLs to protect against Open Redirect vulnerabilities.
 * Rejects external URLs, protocol-relative paths (//), and unknown scheme redirects.
 */
export function sanitizeRedirectUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();

  // Rejection rules:
  // 1. Must start with a single slash '/'
  // 2. Must not start with '//' or '\'
  // 3. Must not contain any protocol scheme (e.g. 'https:', 'javascript:')
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
  ) {
    return "";
  }

  return trimmed;
}

/**
 * Checks remaining lockout seconds if currently locked out.
 */
export function getRemainingLockoutSeconds(): number {
  if (!lockoutUntil) return 0;
  const remainingMs = lockoutUntil - Date.now();
  if (remainingMs <= 0) {
    lockoutUntil = null;
    failedAttempts = 0;
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
}

/**
 * Simulates server-side authentication with constant-time delay and brute-force lockout.
 */
export async function signIn(username: string, password: string): Promise<AuthResult> {
  // 1. Check for active lockout
  const remaining = getRemainingLockoutSeconds();
  if (remaining > 0) {
    return {
      success: false,
      error: "locked",
      remainingSeconds: remaining,
      message: `Too many failed attempts. Temporary lockout active for ${remaining} seconds.`,
    };
  }

  // 2. Constant-time simulation delay (250ms) to model real backend auth and prevent timing leaks
  await new Promise((resolve) => setTimeout(resolve, 250));

  // 3. User verification against database seed
  const db = getDB();
  const normalizedInput = username.trim().toLowerCase();
  const user = db.users.find(
    (u) =>
      u.username.toLowerCase() === normalizedInput ||
      u.contact.toLowerCase() === normalizedInput
  );

  // 4. Verify password
  if (!user || password !== DEMO_PASSWORD) {
    failedAttempts += 1;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      const secs = Math.ceil(LOCKOUT_DURATION_MS / 1000);
      return {
        success: false,
        error: "locked",
        remainingSeconds: secs,
        message: `Too many failed attempts. Account locked for ${secs} seconds.`,
      };
    }
    return {
      success: false,
      error: "invalid_credentials",
      message: "Username or password is incorrect.",
    };
  }

  // 5. Inactive / deactivated check
  if (!user.active) {
    return {
      success: false,
      error: "account_inactive",
      message: "This account is inactive. Contact your administrator.",
    };
  }

  // 6. Reset failed attempts on success
  failedAttempts = 0;
  lockoutUntil = null;

  // 7. Establish session
  const permittedModules = modulesFor(user);
  const defaultModule = permittedModules.length === 1 ? permittedModules[0] : null;

  mutate((d) => {
    d.auth = {
      userId: user.id,
      module: defaultModule,
    };
  });

  return {
    success: true,
    user,
    permittedModules,
  };
}

/**
 * Signs out the current user and clears session state.
 */
export function signOut(): void {
  mutate((d) => {
    d.auth = {
      userId: null,
      module: null,
    };
  });
}

/**
 * Simulated password reset request. Never reveals account existence.
 */
export async function requestPasswordReset(_identity: string): Promise<{ success: true; simulated: true }> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { success: true, simulated: true };
}

/**
 * Remembered username storage (non-sensitive username only, never password).
 */
export function getRememberedUsername(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(REMEMBER_ME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setRememberedUsername(username: string): void {
  if (typeof window === "undefined") return;
  try {
    if (username.trim()) {
      window.localStorage.setItem(REMEMBER_ME_KEY, username.trim());
    } else {
      window.localStorage.removeItem(REMEMBER_ME_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearRememberedUsername(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REMEMBER_ME_KEY);
  } catch {
    /* ignore */
  }
}
