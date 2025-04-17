import { deleteById, batchDelete } from './tasks/delete-vector'

/**
 * Main entry point for the vector deletion tool
 */
async function main () {
  // Check for required environment variables
  if (!process.env.PINECONE_API_KEY) {
    console.error('Error: PINECONE_API_KEY environment variable is required')
    process.exit(1)
  }

  try {
    // Parse command line arguments
    const args = process.argv.slice(2)
    
    // Help flag
    if (args.includes('--help') || args.includes('-h') || args.length === 0) {
      showHelp()
      process.exit(0)
    }
    
    // Check for vector IDs to delete
    const ids = args.filter(arg => !arg.startsWith('--'))
    const forceBatch = args.includes('--batch')
    
    if (ids.length === 0) {
      console.error('Error: No vector IDs provided')
      showHelp()
      process.exit(1)
    }
    
    // If only one ID and not forced to batch, use single delete
    if (ids.length === 1 && !forceBatch) {
      console.log(`Deleting single vector: ${ids[0]}`)
      const result = await deleteById(ids[0])
      console.log(`Result: ${result.status} - ${result.message}`)
    } else {
      // Use batch delete for multiple IDs
      console.log(`Deleting ${ids.length} vectors in batch`)
      const result = await batchDelete(ids)
      console.log(`Result: ${result.status} - ${result.message}`)
    }
  } catch (error: any) {
    console.error('Error in deletion process:', error)
    console.error('Error message:', error?.message || 'Unknown error')
    process.exit(1)
  }
}

/**
 * Displays usage information
 */
function showHelp () {
  console.log(`
Vue Snippets Vector Deletion Tool

Usage:
  node dist/delete-vectors.js [options] <id1> [id2] [id3] ...

Options:
  --batch         Force batch deletion even for a single ID
  --help, -h      Show this help message

Examples:
  node dist/delete-vectors.js v-card-basic             # Delete a single vector
  node dist/delete-vectors.js v-card-basic v-card-advanced  # Delete multiple vectors
  node dist/delete-vectors.js --batch v-card-basic     # Force batch deletion for a single vector
  `)
}

// Run the main function
main().catch((err: any) => {
  console.error('Unhandled error:', err)
  console.error('Error message:', err?.message || 'Unknown error')
  process.exit(1)
})