import { assert, test } from "./test-helpers.mjs"
import { prisma } from "@/lib/prisma"
import { findUserForSession } from "@/lib/session-user"

const originalFindUnique = prisma.user.findUnique
const originalFindMany = prisma.user.findMany

test("findUserForSession prefers the session user id", async () => {
  const calls = []

  try {
    prisma.user.findUnique = async (args) => {
      calls.push(args)

      if (args.where?.id === "user-123") {
        return {
          id: "user-123",
          email: "gestor@greatgo.com",
        }
      }

      return null
    }

    const user = await findUserForSession({
      sessionUser: {
        id: "user-123",
        email: "Gestor@GreatGo.com",
      },
      select: {
        id: true,
        email: true,
      },
    })

    assert.deepEqual(user, {
      id: "user-123",
      email: "gestor@greatgo.com",
    })
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].where, { id: "user-123" })
  } finally {
    prisma.user.findUnique = originalFindUnique
  }
})

test("findUserForSession falls back to normalized email when id is stale", async () => {
  const calls = []

  try {
    prisma.user.findUnique = async (args) => {
      calls.push(args)

      if (args.where?.id === "stale-id") {
        return null
      }

      if (args.where?.email === "gestor@greatgo.com") {
        return {
          id: "user-999",
          email: "gestor@greatgo.com",
        }
      }

      return null
    }
    prisma.user.findMany = async (args) => {
      calls.push(args)

      if (args.select?.email) {
        return [
          {
            id: "user-999",
            email: "gestor@greatgo.com",
          },
        ]
      }

      return []
    }

    const user = await findUserForSession({
      sessionUser: {
        id: "stale-id",
        email: "Gestor@GreatGo.com",
      },
      select: {
        id: true,
        email: true,
      },
    })

    assert.deepEqual(user, {
      id: "user-999",
      email: "gestor@greatgo.com",
    })
    assert.equal(calls.length, 2)
    assert.deepEqual(calls[0].where, { id: "stale-id" })
    assert.deepEqual(calls[1].select, {
      id: true,
      email: true,
    })
  } finally {
    prisma.user.findUnique = originalFindUnique
    prisma.user.findMany = originalFindMany
  }
})
