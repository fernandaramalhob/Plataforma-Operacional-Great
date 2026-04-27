#!/usr/bin/env node

import path from "node:path"
import { fileURLToPath } from "node:url"
import { config as loadDotenv } from "dotenv"
import { ensureBootstrapLoginAccount } from "@/lib/auth-accounts"
import { prisma } from "@/lib/prisma"
import {
  resolveWeeklyReportTimeZone,
  resolveWeeklyReportWindow,
} from "@/lib/reporting/weekly-report-time"
import { upsertClientReportSchedule } from "@/lib/report-schedule"

const TEST_GROUP_ID = "120363407411420148@g.us"
const TEST_AD_ACCOUNT_ID = "act_2419944241790300"
const TEST_AD_ACCOUNT_NAME = "GreatGo - Conta principal"

function getRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
}

function loadEnvironment(repoRoot) {
  loadDotenv({
    path: path.join(repoRoot, ".env"),
    override: false,
    quiet: true,
  })

  loadDotenv({
    path: path.join(repoRoot, ".env.local"),
    override: true,
    quiet: true,
  })
}

function buildClientEmail(name) {
  return `${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")}@greatgo.test`
}

async function upsertSeedClient(params) {
  const user = await ensureBootstrapLoginAccount(params.managerEmail)
  if (!user?.id) {
    throw new Error(`Nao foi possivel provisionar ${params.managerEmail}.`)
  }

  const existing = await prisma.client.findFirst({
    where: {
      name: params.name,
      managerId: user.id,
    },
    select: {
      id: true,
    },
  })

  const data = {
    name: params.name,
    company: params.company,
    email: buildClientEmail(params.name),
    phone: null,
    notes: "Seed automatizado para validar a automacao semanal.",
    whatsappGroupId: TEST_GROUP_ID,
    adAccountId: TEST_AD_ACCOUNT_ID,
    adAccountName: TEST_AD_ACCOUNT_NAME,
    status: "ACTIVE",
    managerId: user.id,
  }

  const client = existing
    ? await prisma.client.update({
        where: {
          id: existing.id,
        },
        data,
      })
    : await prisma.client.create({
        data,
      })

  return {
    client,
    user,
  }
}

async function upsertWeeklySchedule(client, createdByUserId, window) {
  return upsertClientReportSchedule({
    clientId: client.id,
    createdByUserId,
    payload: {
      frequency: "WEEKLY",
      weekday: 1,
      scheduledDate: null,
      hour: 9,
      minute: 0,
      filtersSince: window.since,
      filtersUntil: window.until,
      objective: "ALL",
      sendMode: "PDF_AND_MESSAGE",
      message: null,
      groupId: TEST_GROUP_ID,
      active: true,
    },
  })
}

async function main() {
  const repoRoot = getRepoRoot()
  loadEnvironment(repoRoot)

  const timeZone = resolveWeeklyReportTimeZone()
  const window = resolveWeeklyReportWindow({
    timeZone,
    referenceDate: new Date(),
  })

  const fixtures = [
    {
      name: "GreatGo Admin Teste",
      company: "GreatGo",
      managerEmail: "admin@greatgo.com",
    },
    {
      name: "Brayton Teste GreatGo",
      company: "GreatGo",
      managerEmail: "braytonmaycon5@gmail.com",
    },
    {
      name: "Pedro Teste GreatGo",
      company: "GreatGo",
      managerEmail: "pedrojuan.mwdigital@gmail.com",
    },
  ]

  const results = []

  for (const fixture of fixtures) {
    const { client, user } = await upsertSeedClient(fixture)
    const schedule = await upsertWeeklySchedule(client, user.id, window)

    results.push({
      email: fixture.managerEmail,
      userId: user.id,
      clientId: client.id,
      scheduleId: schedule.id,
      nextRunAt: schedule.nextRunAt.toISOString(),
    })
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        timeZone,
        window,
        testGroupId: TEST_GROUP_ID,
        testAdAccountId: TEST_AD_ACCOUNT_ID,
        results,
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
