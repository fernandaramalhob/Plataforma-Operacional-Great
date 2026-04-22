import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { compareSync as bcryptCompareSync } from "bcryptjs"

const SCRYPT_KEY_LENGTH = 64

function deriveKey(password: string, salt: string) {
  return scryptSync(password, salt, SCRYPT_KEY_LENGTH)
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = deriveKey(password, salt).toString("hex")

  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string) {
  if (!storedHash || typeof storedHash !== "string") {
    return false
  }

  if (storedHash.startsWith("bcrypt:")) {
    return bcryptCompareSync(password, storedHash.slice("bcrypt:".length))
  }

  if (storedHash.startsWith("$2")) {
    return bcryptCompareSync(password, storedHash)
  }

  if (storedHash === password) {
    return true
  }

  const [algorithm, salt, hash] = storedHash.split(":")

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false
  }

  const derived = deriveKey(password, salt)
  const target = Buffer.from(hash, "hex")

  if (derived.length !== target.length) {
    return false
  }

  return timingSafeEqual(derived, target)
}
