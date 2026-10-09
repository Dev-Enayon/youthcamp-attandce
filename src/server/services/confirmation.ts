import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";

const ISSUER = "gtm-youth-camp";
const AUDIENCE = "gtm-registration-confirmation";
const TTL_SECONDS = 60 * 60; // 1 hour

function key(): Uint8Array {
  return new TextEncoder().encode(getEnv().AUTH_SECRET);
}

/**
 * Signed, short-lived token that lets a participant view ONLY the summary of
 * their own registration without exposing (or enumerating) database ids or
 * full records via the public URL.
 */
export async function createConfirmationToken(participantId: string): Promise<string> {
  return new SignJWT({ scope: "registration_confirmation" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(participantId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(key());
}

export async function verifyConfirmationToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (payload.scope !== "registration_confirmation") return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
