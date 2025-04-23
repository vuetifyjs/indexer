import { batchDeleteVectors, deleteVector } from '../utils/pinecone.js'
import ora from 'ora'

interface DeleteResult {
  status: 'success' | 'failed'
  message: string
}

interface BatchDeleteResult {
  total: number
  status: 'success' | 'partial' | 'failed'
  message: string
}

/**
 * Deletes a single vector from Pinecone by ID
 *
 * @param id The unique identifier for the vector to delete
 * @returns Information about the operation performed
 */
export async function deleteById (id: string): Promise<DeleteResult> {
  const spinner = ora({
    text: `Deleting vector: ${id}...`,
    spinner: 'dots'
  }).start()

  try {
    await deleteVector(id)
    spinner.succeed(`Successfully deleted vector: ${id}`)
    return {
      status: 'success',
      message: `Successfully deleted snippet: ${id}`,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    spinner.fail(`Failed to delete vector: ${id}`)
    return {
      status: 'failed',
      message: `Failed to delete: ${errorMessage}`,
    }
  }
}

/**
 * Deletes multiple vectors from Pinecone by ID
 *
 * @param ids Array of vector IDs to delete
 * @returns Information about the operation performed
 */
export async function batchDelete (ids: string[]): Promise<BatchDeleteResult> {
  const spinner = ora({
    text: 'Starting batch delete...',
    spinner: 'dots'
  }).start()

  try {
    if (ids.length === 0) {
      spinner.info('No vectors to delete')
      return {
        total: 0,
        status: 'success',
        message: 'No vectors to delete',
      }
    }

    spinner.text = `Deleting ${ids.length} vectors...`
    await batchDeleteVectors(ids)

    spinner.succeed(`Successfully deleted ${ids.length} vectors`)
    return {
      total: ids.length,
      status: 'success',
      message: `Successfully deleted ${ids.length} vectors`,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    spinner.fail(`Failed to delete vectors: ${errorMessage}`)
    return {
      total: ids.length,
      status: 'failed',
      message: `Failed to delete vectors: ${errorMessage}`,
    }
  }
}
