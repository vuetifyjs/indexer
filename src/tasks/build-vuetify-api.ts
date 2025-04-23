import fs from 'fs'
import path from 'path'
import { VuetifyRepo, VUETIFY_DIR } from '#utils/vuetify-repo.js'
import { getDirname } from '#utils/path-utils.js'
import { execCommand, cleanupProcesses } from '#utils/process-utils.js'
import ora from 'ora'

const __dirname = getDirname(import.meta.url)
const API_OUTPUT_DIR = path.join(__dirname, '..', '..', 'vuetify-api')

/**
 * Builds Vuetify and generates API documentation
 */
async function buildVuetifyAndApi(): Promise<void> {
  try {
    await execCommand(
      `cd ${VUETIFY_DIR} && pnpm run build vuetify --parallel --filter=vuetify`
    )
  } catch (err) {
    throw new Error('Failed to build Vuetify')
  }

  const apiGeneratorDir = path.join(VUETIFY_DIR, 'packages', 'api-generator')

  if (fs.existsSync(apiGeneratorDir)) {
    try {
      await execCommand(
        `cd ${apiGeneratorDir} && pnpm install --frozen-lockfile && pnpm run build`
      )
    } catch (err) {
      throw new Error('Failed to build API documentation')
    }
  } else {
    throw new Error('API Generator directory does not exist!')
  }
}

/**
 * Extracts and saves the generated API files
 */
async function extractApiFiles(): Promise<void> {
  const apiSourceDir = path.join(VUETIFY_DIR, 'packages', 'api-generator', 'dist')

  if (!fs.existsSync(apiSourceDir)) {
    throw new Error('API build output directory does not exist!')
  }

  if (!fs.existsSync(API_OUTPUT_DIR)) {
    fs.mkdirSync(API_OUTPUT_DIR, { recursive: true })
  }

  try {
    await execCommand(
      `cp -r ${apiSourceDir}/*.json ${API_OUTPUT_DIR}/`
    )
  } catch (err) {
    throw new Error('Failed to extract API files')
  }
}

/**
 * Main function to orchestrate the build process
 */
async function main(): Promise<void> {
  const vuetifyRepo = new VuetifyRepo({
    cleanup: true,
    installDeps: true,
    shallowClone: true,
    silent: true // Add silent option to prevent duplicate spinners
  })

  // Set up signal handlers
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP']
  signals.forEach(signal => {
    process.on(signal, async () => {
      cleanupProcesses()
      await vuetifyRepo.cleanup()
      process.exit(0)
    })
  })

  const spinner = ora({
    text: 'Starting Vuetify API build process...',
    spinner: 'dots'
  }).start()

  try {
    await vuetifyRepo.setup()
    spinner.text = 'Building Vuetify...'
    await buildVuetifyAndApi()
    spinner.text = 'Extracting API files...'
    await extractApiFiles()
    spinner.succeed('Vuetify API build process completed!')
  } catch (err) {
    spinner.fail('Error during Vuetify API build process')
    throw err
  } finally {
    await vuetifyRepo.cleanup()
  }
}

// Run the main function
main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

export { buildVuetifyAndApi, extractApiFiles, main as buildVuetifyApi }
