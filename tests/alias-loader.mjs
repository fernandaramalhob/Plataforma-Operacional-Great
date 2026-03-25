import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const extensions = [".ts", ".tsx", ".js", ".mjs", ".cjs"]

function resolveAliasPath(specifier) {
  const basePath = path.resolve(process.cwd(), specifier.slice(2))

  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath
  }

  for (const extension of extensions) {
    const filePath = `${basePath}${extension}`

    if (fs.existsSync(filePath)) {
      return filePath
    }
  }

  for (const extension of extensions) {
    const indexPath = path.join(basePath, `index${extension}`)

    if (fs.existsSync(indexPath)) {
      return indexPath
    }
  }

  return null
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/")) {
    const resolvedPath = resolveAliasPath(specifier)

    if (!resolvedPath) {
      throw new Error(`Unable to resolve alias: ${specifier}`)
    }

    return {
      shortCircuit: true,
      url: pathToFileURL(resolvedPath).href,
    }
  }

  return defaultResolve(specifier, context, defaultResolve)
}
