// Password hashing with Node's built-in scrypt (no extra package needed).
// A stored hash looks like:  scrypt$<salt>$<key>   (both base64). Every password gets its own random salt,
// so two people with the same password have different hashes.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, saltPart, keyPart] = stored.split("$");
  if (kind !== "scrypt" || !saltPart || !keyPart) return false;
  const expected = Buffer.from(keyPart, "base64");
  const actual = await derive(password, Buffer.from(saltPart, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Used when the email does not exist, so a wrong email takes as long as a wrong password
// and nobody can discover which emails have accounts by timing the answer.
let dummy: Promise<string> | null = null;
export function burnTime(password: string): Promise<boolean> {
  dummy ??= hashPassword("not-a-real-password");
  return dummy.then((hash) => verifyPassword(password, hash));
}
