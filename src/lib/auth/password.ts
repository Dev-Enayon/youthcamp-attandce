import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing with Argon2id (the default algorithm for @node-rs/argon2),
 * using parameters aligned with OWASP guidance: 19 MiB memory, 2 iterations,
 * parallelism 1.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  try {
    return await verify(hashValue, password);
  } catch {
    return false;
  }
}
