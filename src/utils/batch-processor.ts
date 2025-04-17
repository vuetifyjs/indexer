import { embed } from './openai'
import { batchUpsertVectors as pineconeUpsertBatch } from './pinecone'
import { VueSnippet } from './file-processor'

/**
 * Maximum number of items to process in a single batch
 */
const MAX_BATCH_SIZE = 10

/**
 * Interface representing a batch operation result
 */
export interface BatchResult {
  id: string
  status: 'updated' | 'failed'
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
          } catch (error: any) {
            console.error('Error generating embedding:', error)
            throw error
          }
        })
      )

      embeddings.push(...batchResults)

      // Log progress
      console.log(`Processed embeddings batch ${Math.floor(i / MAX_BATCH_SIZE) + 1}/${Math.ceil(snippets.length / MAX_BATCH_SIZE)}`)
    }

    return embeddings
  } catch (error: any) {
    console.error('Error in batch embedding:', error)
    throw new Error(`Failed to process batch embeddings: ${error?.message || 'Unknown error'}`)
  }
}

/**
 * Enhanced item interface for upsert operations
 */
export interface UpsertItem {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
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
        metadata
      }
    })

    // Use the optimized batch upsert
    await pineconeUpsertBatch(vectors)

    // Return success results
    return items.map(({ id }) => ({
      id,
      status: 'updated' as const,
      message: `Successfully updated snippet: ${id}`
    }))
  } catch (error: any) {
    console.error('Error in batch upsert:', error)

    // If the entire batch fails, return failed for all items
    return items.map(({ id }) => ({
      id,
      status: 'failed' as const,
      message: `Failed to upsert in batch: ${error?.message || 'Unknown error'}`
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
  snippetHashes: Map<string, string>
): Promise<{
  results: BatchResult[],
  unchanged: string[]
}> {
  try {
    // Get unchanged snippets
    const unchangedSnippets = snippets.filter(snippet => {
      const cachedHash = snippetHashes.get(snippet.path)
      return cachedHash // Has a hash in the map
    })

    // Get changed/new snippets
    const changedSnippets = snippets.filter(snippet =>
      !unchangedSnippets.includes(snippet)
    )

    // If no snippets have changed, return early
    if (changedSnippets.length === 0) {
      return {
        results: [],
        unchanged: unchangedSnippets.map(s => s.id)
      }
    }

    console.log(`Processing ${changedSnippets.length} changed snippets in batches`)

    // Extract content for embedding
    const contents = changedSnippets.map(s => s.content)

    // Generate embeddings in batch
    const embeddings = await batchEmbeddings(contents)

    // Prepare items for batch upsert
    const upsertItems = changedSnippets.map((snippet, index) => {
      return {
        id: snippet.id,
        vector: embeddings[index],
        metadata: {
          ...snippet.metadata,
          hash: snippetHashes.get(snippet.path),
          updatedAt: new Date().toISOString(),
          content: snippet.content, // Store the content for reference
          path: snippet.path // Store the path for reference
        }
      }
    })

    // Perform batch upsert - using the optimized version
    const results = await batchUpsertVectors(upsertItems)

    return {
      results,
      unchanged: unchangedSnippets.map(s => s.id)
    }
  } catch (error: any) {
    console.error('Error in batch processing:', error)
    throw new Error(`Failed to process snippets in batch: ${error?.message || 'Unknown error'}`)
  }
}
