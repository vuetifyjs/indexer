import _fs from 'fs/promises'
import path from 'path'
import { embed } from '../utils/openai'
import { hashContent } from '../utils/hash'
import { upsertVector } from '../utils/pinecone'
import { readSnippet, ensureCacheFile, updateCache } from '../utils/file-processor'

const CACHE_FILE = './embedding-cache.json'

/**
 * Embeds and syncs a single Vue component snippet
 *
 * @param snippetPath Path to the Vue snippet file
 * @returns Information about the operation performed
 */
export async function embedAndSync (snippetPath: string): Promise<{
  id: string,
  status: 'unchanged' | 'updated' | 'failed',
  message: string
}> {
  try {
    // Read the snippet and metadata
    const snippet = await readSnippet(snippetPath)
    const { id, content, metadata } = snippet

    // Generate hash of the content
    const hash = hashContent(content)

    // Read the cache
    const cache = await ensureCacheFile(CACHE_FILE)

    // Check if the content has changed
    if (cache[snippetPath] === hash) {
      return {
        id,
        status: 'unchanged',
        message: `No changes detected for snippet: ${id}`
      }
    }

    // Generate embedding for the content
    const vector = await embed(content)

    // Update Pinecone with the new vector
    await upsertVector(
      id,
      vector,
      {
        ...metadata,
        hash,
        updatedAt: new Date().toISOString()
      }
    )

    // Update the cache with the new hash
    await updateCache(CACHE_FILE, snippetPath, hash)

    return {
      id,
      status: 'updated',
      message: `Successfully updated snippet: ${id}`
    }
  } catch (error: any) {
    console.error(`Error processing snippet ${snippetPath}:`, error)
    return {
      id: path.basename(snippetPath, '.vue'),
      status: 'failed',
      message: `Failed to process: ${error?.message || 'Unknown error'}`
    }
  }
}
