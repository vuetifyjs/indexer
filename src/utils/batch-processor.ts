import { embed } from './openai.js'
import { upsertVectors as pineconeUpsertBatch } from './pinecone.js'
import type { VueSnippet } from './file-processor.js'
import type { RecordMetadata } from '@pinecone-database/pinecone'
import { ensureCacheFile, updateCache, normalizePath } from './file-processor.js'

/**
 * Maximum number of items to process in a single batch
 */
const MAX_BATCH_SIZE = 10

/**
 * Interface representing a batch operation result
 */
export interface BatchResult {
  id: string
  status: 'updated' | 'failed' | 'unchanged'
  message: string
}

/**
 * Generates embeddings for multiple snippets in batches
 *
 * @param snippets Array of snippet content strings to embed
 * @returns Array of embedding vectors
 */
export async function batchEmbeddings (snippets: string[]): Promise<number[][]> {
  try {
    // Process in chunks to respect API limits
    const embeddings: number[][] = []

    // Process in batches of MAX_BATCH_SIZE
    for (let i = 0; i < snippets.length; i += MAX_BATCH_SIZE) {
      const batch = snippets.slice(i, i + MAX_BATCH_SIZE)

      // Process each snippet in the batch (still have to do sequential calls to OpenAI)
      const batchResults = await Promise.all(
        batch.map(async (content) => {
          try {
            return await embed(content) // Get dense embeddings
          } catch (error: unknown) {
            console.error('Error generating embedding:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Failed to generate embedding: ${errorMessage}`)
          }
        }),
      )

      embeddings.push(...batchResults)
    }

    return embeddings
  } catch (error: unknown) {
    console.error('Error in batch embedding:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to process batch embeddings: ${errorMessage}`)
  }
}

/**
 * Enhanced item interface for upsert operations
 */
export interface UpsertItem {
  id: string
  vector: number[]
  metadata: RecordMetadata
}

/**
 * Batch upserts vectors to Pinecone, including sparse vectors if available
 *
 * @param items Array of items to upsert with ID, embedding results, and metadata
 * @returns Array of batch operation results
 */
export async function batchUpsertVectors (items: UpsertItem[]): Promise<BatchResult[]> {
  try {
    if (items.length === 0) {
      return []
    }

    // Format vectors for Pinecone
    const vectors = items.map(({ id, vector, metadata }) => {
      return {
        id,
        values: vector,
        metadata,
      }
    })

    // Use the optimized batch upsert
    await pineconeUpsertBatch(vectors)

    // Return success results
    return items.map(({ id }) => ({
      id,
      status: 'updated' as const,
      message: `Successfully updated snippet: ${id}`,
    }))
  } catch (error: unknown) {
    console.error('Error in batch upsert:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // If the entire batch fails, return failed for all items
    return items.map(({ id }) => ({
      id,
      status: 'failed' as const,
      message: `Failed to upsert in batch: ${errorMessage}`,
    }))
  }
}

/**
 * Process a collection of snippets in batches
 *
 * @param snippets Array of Vue snippets to process
 * @param snippetHashes Map of snippet paths to content hashes
 * @returns Results of the batch operation
 */
export async function batchProcessSnippets (
  snippets: VueSnippet[],
  snippetHashes: Map<string, string>,
): Promise<{
  results: BatchResult[]
}> {
  try {
    // Check cache for unchanged snippets
    const cache = await ensureCacheFile('./embedding-cache.json')
    const unchangedSnippets = new Set<string>()
    const snippetsToProcess: VueSnippet[] = []
    const hashesToProcess = new Map<string, string>()

    for (const snippet of snippets) {
      const normalizedPath = normalizePath(snippet.path)
      const cachedHash = cache[normalizedPath]
      const currentHash = snippetHashes.get(snippet.path)

      if (cachedHash === currentHash) {
        unchangedSnippets.add(snippet.id)
      } else if (currentHash) {
        snippetsToProcess.push(snippet)
        hashesToProcess.set(snippet.path, currentHash)
      }
    }

    // Process only changed snippets
    const results: BatchResult[] = []

    // Add unchanged results
    for (const id of unchangedSnippets) {
      results.push({
        id,
        status: 'unchanged',
        message: `Snippet unchanged: ${id}`,
      })
    }

    if (snippetsToProcess.length > 0) {
      // Extract content for embedding
      const contents = snippetsToProcess.map(s => s.content)

      // Generate embeddings in batch
      const embeddings = await batchEmbeddings(contents)

      // Prepare items for batch upsert
      const upsertItems = snippetsToProcess.map((snippet, index) => {
        return {
          id: snippet.id,
          vector: embeddings[index],
          metadata: {
            ...snippet.metadata,
            hash: hashesToProcess.get(snippet.path),
            updatedAt: new Date().toISOString(),
            content: snippet.content,
            path: snippet.path,
          } as RecordMetadata,
        }
      })

      // Perform batch upsert
      const upsertResults = await batchUpsertVectors(upsertItems)
      results.push(...upsertResults)

      // Update cache for processed snippets
      for (const [path, hash] of hashesToProcess.entries()) {
        await updateCache('./embedding-cache.json', path, hash)
      }
    }

    return {
      results,
    }
  } catch (error: unknown) {
    console.error('Error in batch processing:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to process snippets in batch: ${errorMessage}`)
  }
}
