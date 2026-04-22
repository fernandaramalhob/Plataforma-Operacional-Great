export function ensureAuthEnvironment() {
  return {
    authSecret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "",
  }
}
