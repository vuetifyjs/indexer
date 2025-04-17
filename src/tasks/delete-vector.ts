import { batchDeleteVectors, deleteVector } from '../utils/pinecone'

/**
 * Deletes a single vector from Pinecone by ID
 *
 * @param id The unique identifier for the vector to delete
 * @returns Information about the operation performed
 */
export async function deleteById (id: string): Promise<{
  status: 'success' | 'failed',
  message: string
}> {
  try {
    console.log(`Deleting vector with ID: ${id}`)
    await deleteVector(id)
    return {
      status: 'success',
      message: `Successfully deleted snippet: ${id}`
    }
  } catch (error: any) {
    console.error(`Error deleting vector ${id}:`, error)
    return {
      status: 'failed',
      message: `Failed to delete: ${error?.message || 'Unknown error'}`
    }
  }
}

/**
 * Deletes multiple vectors from Pinecone by ID
 *
 * @param ids Array of vector IDs to delete
 * @returns Information about the operation performed
 */
export async function batchDelete (ids: string[]): Promise<{
  total: number,
  status: 'success' | 'partial' | 'failed',
  message: string
}> {
  try {
    if (ids.length === 0) {
      return {
        total: 0,
        status: 'success',
        message: 'No vectors to delete'
      }
    }

    console.log(`Deleting ${ids.length} vectors in batch`)

    await batchDeleteVectors(ids)

    return {
      total: ids.length,
      status: 'success',
      message: `Successfully deleted ${ids.length} vectors`
    }
  } catch (error: any) {
    console.error('Error in batch delete:', error)
    return {
      total: ids.length,
      status: 'failed',
      message: `Failed to delete vectors: ${error?.message || 'Unknown error'}`
    }
  }
}
