import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import dotenv from 'dotenv'

dotenv.config()

const VUETIFY_REPO_URL = 'https://github.com/vuetifyjs/vuetify.git'
const VUETIFY_DIR = path.join(__dirname, '..', '..', 'vuetify-clone')
const API_OUTPUT_DIR = path.join(__dirname, '..', '..', 'vuetify-api')

/**
 * Clones the Vuetify repository if it doesn't exist already
 */
function cloneVuetifyRepo (): void {
  console.log('Checking if Vuetify repository exists...')

  if (!fs.existsSync(VUETIFY_DIR)) {
    console.log(`Cloning Vuetify repository to ${VUETIFY_DIR}...`)
    execSync(`git clone ${VUETIFY_REPO_URL} ${VUETIFY_DIR}`, { stdio: 'inherit' })
    console.log('Vuetify repository cloned successfully.')
  } else {
    console.log('Vuetify repository already exists. Pulling latest changes...')
    execSync(`cd ${VUETIFY_DIR} && git pull`, { stdio: 'inherit' })
    console.log('Vuetify repository updated successfully.')
  }
}

/**
 * Installs dependencies for the Vuetify project
 */
function installDependencies (): void {
  console.log('Installing Vuetify dependencies...')
  execSync(`cd ${VUETIFY_DIR} && pnpm install`, { stdio: 'inherit' })
  console.log('Dependencies installed successfully.')
}

/**
 * Builds Vuetify and generates API documentation
 */
function buildVuetifyAndApi (): void {
  console.log('Building Vuetify...')
  execSync(`cd ${VUETIFY_DIR} && pnpm run build vuetify`, { stdio: 'inherit' })
  console.log('Vuetify built successfully.')

  console.log('Building Vuetify API documentation...')
  // Make sure the api-generator directory exists and run the build
  const apiGeneratorDir = path.join(VUETIFY_DIR, 'packages', 'api-generator')

  if (fs.existsSync(apiGeneratorDir)) {
    execSync(`cd ${apiGeneratorDir} && pnpm run build`, { stdio: 'inherit' })
    console.log('API documentation built successfully.')
  } else {
    throw new Error('API Generator directory does not exist!')
  }
}

/**
 * Extracts and saves the generated API files
 */
function extractApiFiles (): void {
  const apiSourceDir = path.join(VUETIFY_DIR, 'packages', 'api-generator', 'dist')

  if (!fs.existsSync(apiSourceDir)) {
    throw new Error('API build output directory does not exist!')
  }

  console.log('Creating output directory for API files...')
  if (!fs.existsSync(API_OUTPUT_DIR)) {
    fs.mkdirSync(API_OUTPUT_DIR, { recursive: true })
  }

  console.log('Copying API files...')
  // Copy all .json files from the API generator output
  execSync(`cp -r ${apiSourceDir}/*.json ${API_OUTPUT_DIR}/`, { stdio: 'inherit' })
  console.log(`API files extracted successfully to ${API_OUTPUT_DIR}`)
}

/**
 * Main function to execute the entire process
 */
async function main (): Promise<void> {
  try {
    console.log('Starting Vuetify API build process...')

    cloneVuetifyRepo()
    installDependencies()
    buildVuetifyAndApi()
    extractApiFiles()

    console.log('Vuetify API build process completed successfully!')
  } catch (error: unknown) {
    console.error('Error during Vuetify API build process:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Unhandled error in Vuetify API build process:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    process.exit(1)
  })
}

export { cloneVuetifyRepo, installDependencies, buildVuetifyAndApi, extractApiFiles, main as buildVuetifyApi }
