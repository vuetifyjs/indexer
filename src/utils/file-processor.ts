import fs from 'fs/promises'
import _path from 'path'
import { glob } from 'glob'
import type { RecordMetadata } from '@pinecone-database/pinecone'

/**
 * Interface representing a Vue snippet with its metadata
 */
export interface VueSnippet {
  id: string
  path: string
  content: string
  metadata: RecordMetadata & {
    id: string
    component: string
    tags: string[]
    title: string
    description: string
    category: string
  }
}

/**
 * Gets all Vue snippet files in the project
 *
 * @param snippetsDir Directory containing the snippets
 * @returns Array of file paths to Vue snippets
 */
export async function getSnippetFiles (snippetsDir: string = 'src/snippets'): Promise<string[]> {
  try {
    return await glob(`${snippetsDir}/**/*.vue`)
  } catch (error: unknown) {
    console.error('Error finding snippet files:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get snippet files: ${errorMessage}`)
  }
}

/**
 * Reads a Vue snippet and its associated metadata
 *
 * @param snippetPath Path to the Vue snippet file
 * @returns Object containing the snippet content and metadata
 */
export async function readSnippet (snippetPath: string): Promise<VueSnippet> {
  try {
    // Read the Vue template file
    const content = await fs.readFile(snippetPath, 'utf8')

    // Get the associated metadata file
    const metaPath = snippetPath.replace('.vue', '.meta.json')
    const metadataRaw = await fs.readFile(metaPath, 'utf8')
    const metadata = JSON.parse(metadataRaw) as VueSnippet['metadata']

    return {
      id: metadata.id,
      path: snippetPath,
      content,
      metadata,
    }
  } catch (error: unknown) {
    console.error(`Error reading snippet ${snippetPath}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to read snippet: ${errorMessage}`)
  }
}

/**
 * Checks if a cache file exists and creates it if it doesn't
 *
 * @param cachePath Path to the cache file
 * @returns The cache object or an empty object if not found
 */
export async function ensureCacheFile (cachePath: string): Promise<Record<string, string>> {
  try {
    try {
      const cacheContent = await fs.readFile(cachePath, 'utf8')
      return JSON.parse(cacheContent) as Record<string, string>
    } catch (error: unknown) {
      // Create an empty cache file if it doesn't exist
      console.warn(error)
      const emptyCache: Record<string, string> = {}
      await fs.writeFile(cachePath, JSON.stringify(emptyCache, null, 2), 'utf8')
      return emptyCache
    }
  } catch (error: unknown) {
    console.error('Error with cache file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    // Return empty cache object if there's any issue
    return {}
  }
}

/**
 * Updates the cache with a new hash for a snippet
 *
 * @param cachePath Path to the cache file
 * @param snippetPath Path of the snippet being cached
 * @param hash The hash to store
 */
export async function updateCache (cachePath: string, snippetPath: string, hash: string): Promise<void> {
  try {
    const cache = await ensureCacheFile(cachePath)
    cache[snippetPath] = hash
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8')
  } catch (error: unknown) {
    console.error('Error updating cache:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to update cache: ${errorMessage}`)
  }
}
