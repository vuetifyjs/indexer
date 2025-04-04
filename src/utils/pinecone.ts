import { Pinecone } from '@pinecone-database/pinecone'

// Maximum vectors to upsert in a single API call to Pinecone
const MAX_VECTORS_PER_BATCH = 100

// Initialize Pinecone client with API key from environment
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })

// Get a reference to the specific index we're using
export const index = pinecone.index('vuetify-docs')

/**
 * Upserts a vector into the Pinecone index
 * 
 * @param id The unique identifier for the vector
 * @param values The embedding vector values
 * @param metadata Additional metadata to store with the vector
 * @param sparseValues Optional sparse vector values
 * @param sparseIndices Optional sparse vector indices
 */
export async function upsertVector(
  id: string, 
  values: number[], 
  metadata: Record<string, any>,
  sparseValues?: number[],
  sparseIndices?: number[]
) {
  try {
    const vectorRecord: any = { 
      id, 
      values, 
      metadata 
    }
    
    // Add sparse vector if both indices and values are provided
    if (sparseIndices && sparseValues && sparseIndices.length === sparseValues.length) {
      vectorRecord.sparseValues = {
        indices: sparseIndices,
        values: sparseValues
      }
    }
    
    await index.upsert([vectorRecord])
  } catch (error: any) {
    console.error('Error upserting vector to Pinecone:', error)
    throw new Error(`Failed to upsert vector: ${error?.message || 'Unknown error'}`)
  }
}

/**
 * Describes a vector with optional sparse vector components
 */
export interface VectorRecord {
  id: string;
  values: number[];
  metadata: Record<string, any>;
  sparseValues?: number[];
  sparseIndices?: number[];
}

/**
 * Upserts multiple vectors into the Pinecone index in batches
 * 
 * @param vectors Array of vectors to upsert with ID, values, metadata and optional sparse components
 */
export async function batchUpsertVectors(vectors: VectorRecord[]) {
  try {
    // Process in batches to respect API limits
    for (let i = 0; i < vectors.length; i += MAX_VECTORS_PER_BATCH) {
      const batch = vectors.slice(i, i + MAX_VECTORS_PER_BATCH)
      console.log(`Upserting batch ${i / MAX_VECTORS_PER_BATCH + 1}/${Math.ceil(vectors.length / MAX_VECTORS_PER_BATCH)} to Pinecone (${batch.length} vectors)`)
      
      // Convert VectorRecord to PineconeRecord format
      // Pinecone expects a specific sparse vector format
      const pineconeRecords = batch.map(record => {
        const pineconeRecord: any = {
          id: record.id,
          values: record.values,
          metadata: record.metadata
        }
        
        // Add sparse vector if both indices and values are provided
        if (record.sparseIndices && record.sparseValues && 
            record.sparseIndices.length === record.sparseValues.length) {
          pineconeRecord.sparseValues = {
            indices: record.sparseIndices,
            values: record.sparseValues
          }
        }
        
        return pineconeRecord
      })
      
      // Perform the batch upsert
      await index.upsert(pineconeRecords)
    }
  } catch (error: any) {
    console.error('Error batch upserting vectors to Pinecone:', error)
    throw new Error(`Failed to batch upsert vectors: ${error?.message || 'Unknown error'}`)
  }
}

/**
 * Deletes a vector from the Pinecone index
 * 
 * @param id The unique identifier for the vector to delete
 */
export async function deleteVector(id: string) {
  try {
    await index.deleteOne(id)
  } catch (error: any) {
    console.error(`Error deleting vector ${id} from Pinecone:`, error)
    throw new Error(`Failed to delete vector: ${error?.message || 'Unknown error'}`)
  }
}

/**
 * Deletes multiple vectors from the Pinecone index
 * 
 * @param ids Array of vector IDs to delete
 */
export async function batchDeleteVectors(ids: string[]) {
  try {
    // Process in batches to respect API limits
    for (let i = 0; i < ids.length; i += MAX_VECTORS_PER_BATCH) {
      const batch = ids.slice(i, i + MAX_VECTORS_PER_BATCH)
      console.log(`Deleting batch ${i / MAX_VECTORS_PER_BATCH + 1}/${Math.ceil(ids.length / MAX_VECTORS_PER_BATCH)} from Pinecone (${batch.length} vectors)`)
      
      // Perform the batch delete
      await index.deleteMany(batch)
    }
  } catch (error: any) {
    console.error('Error batch deleting vectors from Pinecone:', error)
    throw new Error(`Failed to batch delete vectors: ${error?.message || 'Unknown error'}`)
  }
}

/**
 * Queries the Pinecone index for similar vectors
 * Currently using dense vector search only. Sparse vector functionality is retained
 * in the interface for future compatibility but not actively used.
 * 
 * @param vector The query vector to find similar vectors for
 * @param topK Number of most similar vectors to return
 * @param filter Optional metadata filter
 * @param sparseVector Optional sparse vector for hybrid search (currently not in use)
 * @returns The query results
 */
export async function querySimilar(
  vector: number[], 
  topK: number = 10, 
  filter?: object,
  _sparseVector?: {
    indices: number[],
    values: number[]
  }
) {
  try {
    // Prepare query params
    const queryParams: any = {
      vector,
      topK,
      includeMetadata: true
    }
    
    // Add filter if provided
    if (filter) {
      queryParams.filter = filter
    }
    
    // Sparse vector functionality is currently disabled
    // Code kept for future implementation if API requirements change
    
    const result = await index.query(queryParams)
    
    return result
  } catch (error: any) {
    console.error('Error querying Pinecone:', error)
    throw new Error(`Failed to query similar vectors: ${error?.message || 'Unknown error'}`)
  }
}
