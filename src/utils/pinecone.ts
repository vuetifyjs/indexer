import type { RecordMetadata, PineconeRecord, ScoredPineconeRecord } from '@pinecone-database/pinecone'
import { Pinecone } from '@pinecone-database/pinecone'

// Maximum vectors to upsert in a single API call to Pinecone
const MAX_VECTORS_PER_BATCH = 100

if (!process.env.PINECONE_API_KEY) {
  throw new Error('PINECONE_API_KEY environment variable is required')
}

// Initialize Pinecone client with API key from environment
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })

// Get a reference to the specific index we're using
export const index = pinecone.index('vuetify-docs')

export interface VectorRecord {
  id: string
  values: number[]
  metadata: RecordMetadata
  sparseValues?: {
    indices: number[]
    values: number[]
  }
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
 * Upserts multiple vectors into the Pinecone index in batches
 *
 * @param vectors Array of vectors to upsert
 * @returns Promise<void>
 */
export async function batchUpsertVectors (vectors: VectorRecord[]): Promise<void> {
  try {
    // Process in batches to respect API limits
    for (let i = 0; i < vectors.length; i += MAX_VECTORS_PER_BATCH) {
      const batch = vectors.slice(i, i + MAX_VECTORS_PER_BATCH)
      console.log(`Upserting batch ${i / MAX_VECTORS_PER_BATCH + 1}/${Math.ceil(vectors.length / MAX_VECTORS_PER_BATCH)} to Pinecone (${batch.length} vectors)`)

      const pineconeRecords: PineconeRecord<RecordMetadata>[] = batch.map(record => ({
        id: record.id,
        values: record.values,
        metadata: record.metadata,
        ...(record.sparseValues && {
          sparseValues: record.sparseValues,
        }),
      }))

      await index.upsert(pineconeRecords)
    }
  } catch (error: unknown) {
    console.error('Error batch upserting vectors to Pinecone:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to batch upsert vectors: ${errorMessage}`)
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

interface QueryResult {
  matches: ScoredPineconeRecord<RecordMetadata>[]
}

/**
 * Queries the Pinecone index for similar vectors
 *
 * @param vector The query vector
 * @param topK Number of results to return
 * @param filter Optional metadata filter
 * @param sparseVector Optional sparse vector for hybrid search
 * @returns Promise<QueryResult>
 */
export async function querySimilar (
  vector: number[],
  topK = 10,
  filter?: object,
  sparseVector?: {
    indices: number[]
    values: number[]
  },
): Promise<QueryResult> {
  try {
    const queryParams = {
      vector,
      topK,
      includeMetadata: true,
      ...(filter && { filter }),
      ...(sparseVector && { sparseVector }),
    }

    const result = await index.query(queryParams)
    return result
  } catch (error: unknown) {
    console.error('Error querying Pinecone:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to query similar vectors: ${errorMessage}`)
  }
}
