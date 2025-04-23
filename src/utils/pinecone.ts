import type { RecordMetadata, PineconeRecord, ScoredPineconeRecord } from '@pinecone-database/pinecone'
import { Pinecone } from '@pinecone-database/pinecone'

// Maximum vectors to upsert in a single API call to Pinecone
const MAX_VECTORS_PER_BATCH = 100

if (!process.env.PINECONE_API_KEY) {
  throw new Error('PINECONE_API_KEY environment variable is not set')
}

if (!process.env.PINECONE_INDEX) {
  throw new Error('PINECONE_INDEX environment variable is not set')
}

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
})

export const index = pinecone.Index(process.env.PINECONE_INDEX)

export type VectorRecord = PineconeRecord<RecordMetadata>

/**
 * Upserts vectors to Pinecone in batches
 * @param vectors Array of vectors to upsert
 * @param batchSize Maximum number of vectors to upsert in a single batch
 */
export async function upsertVectors(
  vectors: VectorRecord[],
  batchSize: number = MAX_VECTORS_PER_BATCH
): Promise<void> {
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize)
    await index.upsert(batch)
  }
}

/**
 * Queries Pinecone for similar vectors
 * @param vector Query vector
 * @param topK Number of results to return
 * @param filter Optional metadata filter
 * @returns Array of scored vectors
 */
export async function queryVectors(
  vector: number[],
  topK: number = 10,
  filter?: Record<string, unknown>
): Promise<ScoredPineconeRecord<RecordMetadata>[]> {
  const results = await index.query({
    vector,
    topK,
    filter,
  })
  return results.matches
}

/**
 * Upserts a vector into the Pinecone index
 *
 * @param id The unique identifier for the vector
 * @param values The embedding vector values
 * @param metadata Additional metadata to store with the vector
 * @param sparseValues Optional sparse vector values
 * @param sparseIndices Optional sparse vector indices
 * @returns Promise<void>
 */
export async function upsertVector (
  id: string,
  values: number[],
  metadata: RecordMetadata,
  sparseValues?: number[],
  sparseIndices?: number[],
): Promise<void> {
  try {
    const vectorRecord: PineconeRecord<RecordMetadata> = {
      id,
      values,
      metadata,
    }

    // Add sparse vector if both indices and values are provided
    if (sparseIndices?.length && sparseValues?.length && sparseIndices.length === sparseValues.length) {
      vectorRecord.sparseValues = {
        indices: sparseIndices,
        values: sparseValues,
      }
    }

    await index.upsert([vectorRecord])
  } catch (error: unknown) {
    console.error('Error upserting vector to Pinecone:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to upsert vector: ${errorMessage}`)
  }
}

/**
 * Deletes a vector from the Pinecone index
 *
 * @param id The unique identifier for the vector to delete
 * @returns Promise<void>
 */
export async function deleteVector (id: string): Promise<void> {
  try {
    await index.deleteOne(id)
  } catch (error: unknown) {
    console.error(`Error deleting vector ${id} from Pinecone:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to delete vector: ${errorMessage}`)
  }
}

/**
 * Deletes multiple vectors from the Pinecone index
 *
 * @param ids Array of vector IDs to delete
 * @returns Promise<void>
 */
export async function batchDeleteVectors (ids: string[]): Promise<void> {
  try {
    // Process in batches to respect API limits
    for (let i = 0; i < ids.length; i += MAX_VECTORS_PER_BATCH) {
      const batch = ids.slice(i, i + MAX_VECTORS_PER_BATCH)
      console.log(`Deleting batch ${i / MAX_VECTORS_PER_BATCH + 1}/${Math.ceil(ids.length / MAX_VECTORS_PER_BATCH)} from Pinecone (${batch.length} vectors)`)

      await index.deleteMany(batch)
    }
  } catch (error: unknown) {
    console.error('Error batch deleting vectors from Pinecone:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to batch delete vectors: ${errorMessage}`)
  }
}
