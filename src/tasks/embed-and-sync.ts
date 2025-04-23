import _fs from 'fs/promises'
import path from 'path'
import { embed } from '../utils/openai.js'
import { hashContent } from '../utils/hash.js'
import { upsertVector } from '../utils/pinecone.js'
import { readSnippet, ensureCacheFile, updateCache } from '../utils/file-processor.js'
import type { RecordMetadata } from '@pinecone-database/pinecone'

const CACHE_FILE = './embedding-cache.json'

interface EmbedAndSyncResult {
  id: string
  status: 'unchanged' | 'updated' | 'failed'
  message: string
}

/**
 * Embeds and syncs a single Vue component snippet
 *
 * @param snippetPath Path to the Vue snippet file
 * @returns Information about the operation performed
 */
export async function embedAndSync (snippetPath: string): Promise<EmbedAndSyncResult> {
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
        message: `No changes detected for snippet: ${id}`,
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
        updatedAt: new Date().toISOString(),
      } as RecordMetadata,
    )

    // Update the cache with the new hash
    await updateCache(CACHE_FILE, snippetPath, hash)

    return {
      id,
      status: 'updated',
      message: `Successfully updated snippet: ${id}`,
    }
  } catch (error: unknown) {
    console.error(`Error processing snippet ${snippetPath}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      id: path.basename(snippetPath, '.vue'),
      status: 'failed',
      message: `Failed to process: ${errorMessage}`,
    }
  }
}
