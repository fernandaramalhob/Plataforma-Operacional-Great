import IORedis, { type RedisOptions } from "ioredis"

type RedisConnectionKind = "client" | "worker"

type GlobalRedisState = typeof globalThis & {
  __greatgoRedisClient?: IORedis
  __greatgoRedisWorker?: IORedis
}

function getRedisUrl() {
  const redisUrl = process.env.REDIS_URL?.trim()

  if (!redisUrl) {
    throw new Error("Configuracao ausente: REDIS_URL")
  }

  return redisUrl
}

function createRedisConnection(kind: RedisConnectionKind) {
  const options: RedisOptions = {
    enableReadyCheck: false,
    maxRetriesPerRequest: kind === "worker" ? null : undefined,
  }

  return new IORedis(getRedisUrl(), options)
}

export function getRedisConnection(kind: RedisConnectionKind = "client") {
  const globalState = globalThis as GlobalRedisState

  if (kind === "worker") {
    globalState.__greatgoRedisWorker ??= createRedisConnection("worker")
    return globalState.__greatgoRedisWorker
  }

  globalState.__greatgoRedisClient ??= createRedisConnection("client")
  return globalState.__greatgoRedisClient
}
