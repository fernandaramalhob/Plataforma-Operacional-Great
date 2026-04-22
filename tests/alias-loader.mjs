import fs from "node:fs"
import fsPromises from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const extensions = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".mts"]
const typescriptExtensions = new Set([".ts", ".tsx", ".mts"])

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

export async function load(url, context, defaultLoad) {
  if (!url.startsWith("file://")) {
    return defaultLoad(url, context, defaultLoad)
  }

  const filePath = fileURLToPath(url)
  const extension = path.extname(filePath)

  if (typescriptExtensions.has(extension)) {
    const source = await fsPromises.readFile(filePath, "utf8")
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2017,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        resolveJsonModule: true,
        sourceMap: false,
      },
      fileName: filePath,
    })

    return {
      format: "module",
      shortCircuit: true,
      source: transpiled.outputText,
    }
  }

  return defaultLoad(url, context, defaultLoad)
}
