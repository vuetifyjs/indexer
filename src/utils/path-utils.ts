import { fileURLToPath } from 'url'
import path from 'path'

/**
 * Get the directory name of the current module
 * @param importMetaUrl The import.meta.url from the calling module
 */
export function getDirname(importMetaUrl: string): string {
  const __filename = fileURLToPath(importMetaUrl)
  return path.dirname(__filename)
}

/**
 * Get the filename of the current module
 * @param importMetaUrl The import.meta.url from the calling module
 */
export function getFilename(importMetaUrl: string): string {
  return fileURLToPath(importMetaUrl)
}

/**
 * Resolve a path relative to the current module
 * @param importMetaUrl The import.meta.url from the calling module
 * @param relativePath The path to resolve relative to the current module
 */
export function resolveFromModule(importMetaUrl: string, relativePath: string): string {
  const dirname = getDirname(importMetaUrl)
  return path.resolve(dirname, relativePath)
}
