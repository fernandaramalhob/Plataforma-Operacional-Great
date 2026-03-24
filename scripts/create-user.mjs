#!/usr/bin/env node

import "dotenv/config"
import { randomBytes, scryptSync } from "node:crypto"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const SCRYPT_KEY_LENGTH = 64
const VALID_ROLES = new Set(["ADMIN", "MANAGER"])

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function deriveKey(password, salt) {
  return scryptSync(password, salt, SCRYPT_KEY_LENGTH)
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex")
  const hash = deriveKey(password, salt).toString("hex")

  return `scrypt:${salt}:${hash}`
}

function parseArgs(argv) {
  const options = {}

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]

    if (!current.startsWith("--")) {
      continue
    }

    const [rawKey, inlineValue] = current.slice(2).split("=", 2)
    const candidateValue = argv[index + 1]
    const hasNextValue = Boolean(candidateValue) && !candidateValue.startsWith("--")
    const nextValue = inlineValue ?? (hasNextValue ? candidateValue : true)

    if (!inlineValue && hasNextValue) {
      index += 1
    }

    options[rawKey] = nextValue
  }

  return options
}

function printHelp() {
  console.log("Uso: npm run user:create -- --email email@dominio.com --password senha --role ADMIN")
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help || options.h) {
    printHelp()
    return
  }

  const email = normalizeEmail(options.email ?? process.env.SEED_USER_EMAIL ?? "")
  const password = options.password ?? process.env.SEED_USER_PASSWORD ?? ""
  const role = String(options.role ?? process.env.SEED_USER_ROLE ?? "ADMIN").toUpperCase()

  if (!email) {
    throw new Error("Informe o email com --email ou SEED_USER_EMAIL.")
  }

  if (!password) {
    throw new Error("Informe a senha com --password ou SEED_USER_PASSWORD.")
  }

  if (password.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.")
  }

  if (!VALID_ROLES.has(role)) {
    throw new Error("Role invalida. Use ADMIN ou MANAGER.")
  }

  const passwordHash = hashPassword(password)
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
    },
    create: {
      email,
      passwordHash,
      role,
    },
  })

  console.log(`Usuario ${user.email} provisionado com role ${user.role}.`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
