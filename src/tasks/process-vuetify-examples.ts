import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { glob } from 'glob'
import ora from 'ora'
import { embedAll } from './embed-all.js'
import { VuetifyRepo } from '#utils/vuetify-repo.js'
import { hashContent } from '../utils/hash.js'
import { ensureCacheFile, updateCache } from '../utils/file-processor.js'

// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is required')
  process.exit(1)
}

if (!process.env.PINECONE_API_KEY) {
  console.error('Error: PINECONE_API_KEY environment variable is required')
  process.exit(1)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const VUETIFY_DIR = path.join(__dirname, '..', '..', 'vuetify-clone')
const EXAMPLES_DIR = path.join(VUETIFY_DIR, 'packages', 'docs', 'src', 'examples')
const CACHE_FILE = './vuetify-examples-cache.json'
const MAX_EXAMPLES = 10 // Limit for test run

/**
 * Processes a single Vue example file and creates metadata for it
 * @param examplePath Path to the example file
 * @returns Object containing the processed example data
 */
async function processExampleFile (examplePath: string): Promise<void> {
  try {
    // Read the example file
    const content = await fs.promises.readFile(examplePath, 'utf8')

    // Extract component name from the path
    const relativePath = path.relative(EXAMPLES_DIR, examplePath)
    const componentName = path.dirname(relativePath).split(path.sep)[0]

    // Create metadata
    const metadata = {
      id: `vuetify-example-${path.basename(examplePath, '.vue')}`,
      component: componentName,
      tags: ['vuetify', 'example', componentName],
      title: `Vuetify ${componentName} Example`,
      description: `Example usage of the ${componentName} component from Vuetify documentation`,
      category: 'examples'
    }

    // Create output directory structure
    const outputDir = path.join(__dirname, '..', '..', 'src', 'snippets', 'vuetify-examples', componentName)
    await fs.promises.mkdir(outputDir, { recursive: true })

    // Write the example file
    const outputPath = path.join(outputDir, path.basename(examplePath))
    await fs.promises.writeFile(outputPath, content, 'utf8')

    // Write metadata file
    const metaPath = outputPath.replace('.vue', '.meta.json')
    await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8')

    // Update cache with the hash of the content
    const hash = hashContent(content)
    await updateCache(CACHE_FILE, outputPath, hash)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to process example ${examplePath}: ${errorMessage}`)
  }
}

/**
 * Main function to process all Vuetify examples
 */
async function processVuetifyExamples (): Promise<void> {
  const spinner = ora({
    text: 'Starting Vuetify examples processing...',
    spinner: 'dots'
  }).start()

  const vuetifyRepo = new VuetifyRepo({
    cleanup: true,
    installDeps: true,
    shallowClone: true,
    silent: true // Add silent option to prevent duplicate spinners
  })

  try {
    // Set up Vuetify repository
    await vuetifyRepo.setup()

    // Find all example files
    spinner.text = 'Finding example files...'
    const exampleFiles = await glob('**/*.vue', { cwd: EXAMPLES_DIR })

    // Limit the number of examples for test run
    const limitedExampleFiles = exampleFiles.slice(0, MAX_EXAMPLES)
    spinner.text = `Processing ${limitedExampleFiles.length} examples...`

    // Ensure cache file exists
    await ensureCacheFile(CACHE_FILE)

    // Process each example
    for (const exampleFile of limitedExampleFiles) {
      const fullPath = path.join(EXAMPLES_DIR, exampleFile)
      await processExampleFile(fullPath)
    }

    // Create embeds for all processed examples
    spinner.text = 'Creating embeds for examples...'
    const results = await embedAll('src/snippets/vuetify-examples')

    spinner.succeed(`Processed ${results.total} examples: ${results.updated} updated, ${results.unchanged} unchanged, ${results.failed} failed`)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    spinner.fail(`Error during Vuetify examples processing: ${errorMessage}`)
    process.exit(1)
  } finally {
    await vuetifyRepo.cleanup()
  }
}

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  processVuetifyExamples().catch((error: unknown) => {
    console.error('Unhandled error in Vuetify examples processing:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    process.exit(1)
  })
}

export { processVuetifyExamples }
