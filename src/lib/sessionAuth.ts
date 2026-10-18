import crypto from "crypto";
import { UserSession, RoleType, AUTH_COOKIE_NAME, ROLE_DATA } from "./auth";

const AUTH_SECRET =
  process.env.AUTH_SECRET || "kit_project_auth_secret_dev_2026_super_secure_key";

export interface SignedSessionPayload extends UserSession {
  exp: number; // Timestamp in milliseconds
  iat: number; // Issued at timestamp
}

/**
 * Creates an HMAC-SHA256 signature for the given payload string.
 */
function createSignature(payloadBase64: string): string {
  return crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payloadBase64)
    .digest("hex");
}

/**
 * Signs a UserSession object into a tamper-proof session token.
 * Token structure: `signed:<payloadBase64>.<hexSignature>`
 */
export function signSessionToken(
  session: UserSession,
  expiresInDays = 7
): string {
  const now = Date.now();
  const payload: SignedSessionPayload = {
    ...session,
    iat: now,
    exp: now + expiresInDays * 24 * 60 * 60 * 1000,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createSignature(payloadBase64);
  return `signed:${payloadBase64}.${signature}`;
}

/**
 * Cryptographically verifies and extracts the session from a token.
 * Returns null if the token is tampered, forged, expired, or invalid.
 */
export function verifySessionToken(
  token: string | undefined | null
): UserSession | null {
  if (!token) return null;

  try {
    const raw = decodeURIComponent(token.trim());

    // 1. Signed token verification
    if (raw.startsWith("signed:")) {
      const parts = raw.slice(7).split(".");
      if (parts.length !== 2) return null;

      const [payloadBase64, providedSig] = parts;
      const expectedSig = createSignature(payloadBase64);

      // Constant-time comparison to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSig, "hex");
      const providedBuffer = Buffer.from(providedSig, "hex");

      if (
        expectedBuffer.length !== providedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
      ) {
        return null; // Signature mismatch! Tampered or forged!
      }

      const jsonStr = Buffer.from(payloadBase64, "base64url").toString("utf-8");
      const payload = JSON.parse(jsonStr) as SignedSessionPayload;

      // Check expiration
      if (payload.exp && Date.now() > payload.exp) {
        return null; // Expired session
      }

      // Ensure non-empty role
      if (!payload.role) {
        return null;
      }

      return {
        role: payload.role,
        email: payload.email,
        name: payload.name,
        dept: payload.dept,
      };
    }

    // 2. Unsigned fallback (Legacy dev mode only if explicitly enabled)
    if (process.env.ALLOW_UNSIGNED_SESSIONS === "true") {
      const parsed = JSON.parse(raw);
      if (parsed?.role === "HOD" || parsed?.role === "COORDINATOR") {
        return parsed;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Extracts and verifies the session from incoming Request headers or NextRequest cookies.
 */
export function getAuthenticatedSession(
  request: Request
): UserSession | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp("(?:^|;\\s*)" + AUTH_COOKIE_NAME + "=([^;]+)")
  );
  if (!match) return null;

  const rawCookie = match[1];
  return verifySessionToken(rawCookie);
}

/**
 * Enforces authorization for HOD or Coordinator.
 * Throws an error with HTTP status details if unauthorized.
 */
export function requireAuthorizedSession(
  request: Request,
  allowedRoles: RoleType[] = ["HOD", "COORDINATOR"]
): UserSession {
  const session = getAuthenticatedSession(request);

  if (!session) {
    const error: any = new Error(
      "Authentication required. Valid signed institutional session cookie missing."
    );
    error.status = 401;
    throw error;
  }

  if (!allowedRoles.includes(session.role)) {
    const error: any = new Error(
      `Access denied. Role '${session.role}' is not authorized for this departmental action.`
    );
    error.status = 403;
    throw error;
  }

  return session;
}
