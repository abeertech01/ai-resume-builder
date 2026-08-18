import "server-only";
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended Argon2id parameters: ~19 MiB memory, 2 iterations, 1 thread.
// `algorithm: 2` is Argon2id (see Algorithm enum in @node-rs/argon2) — used as a
// literal because it's a `const enum` and this project runs isolatedModules.
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string) {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password, ARGON2_OPTIONS);
}

// Computed once per server instance and reused for login attempts against a
// nonexistent email, so "no such user" and "wrong password" take the same
// amount of time — otherwise the timing gap would let an attacker enumerate
// registered emails without ever seeing an error message differ.
export const dummyPasswordHash = hashPassword(
  "dummy-password-for-timing-safety",
);
