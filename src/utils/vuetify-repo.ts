import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ora from 'ora'
import { execCommand, getOptimalConcurrency } from './process-utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const VUETIFY_DIR = path.join(__dirname, '..', '..', 'vuetify-clone')
const VUETIFY_REPO_URL = 'https://github.com/vuetifyjs/vuetify.git'

export interface VuetifyRepoOptions {
  cleanup?: boolean
  installDeps?: boolean
  shallowClone?: boolean
  silent?: boolean
}

/**
 * Manages the Vuetify repository clone
 */
export class VuetifyRepo {
  private options: VuetifyRepoOptions
  private spinner: ReturnType<typeof ora>
  private concurrency: number

  constructor(options: VuetifyRepoOptions = {}) {
    this.options = {
      cleanup: true,
      installDeps: true,
      shallowClone: true,
      silent: false,
      ...options
    }
    this.spinner = ora({ spinner: 'dots' })
    this.concurrency = getOptimalConcurrency()
  }

  /**
   * Clones or updates the Vuetify repository
   */
  async setup(): Promise<void> {
    if (!this.options.silent) {
      this.spinner.start('Checking Vuetify repository...')
    }

    if (!fs.existsSync(VUETIFY_DIR)) {
      if (!this.options.silent) {
        this.spinner.text = 'Cloning Vuetify repository...'
      }
      const cloneCommand = this.options.shallowClone
        ? `git clone --depth 1 ${VUETIFY_REPO_URL} ${VUETIFY_DIR}`
        : `git clone ${VUETIFY_REPO_URL} ${VUETIFY_DIR}`
      await execCommand(cloneCommand)
      if (!this.options.silent) {
        this.spinner.succeed('Vuetify repository cloned')
      }
    }

    if (this.options.installDeps) {
      await this.installDependencies()
    }
  }

  /**
   * Installs dependencies in the Vuetify repository
   */
  private async installDependencies(): Promise<void> {
    if (!this.options.silent) {
      this.spinner.start('Installing Vuetify dependencies...')
    }
    await execCommand(`cd ${VUETIFY_DIR} && pnpm install --frozen-lockfile`)
    if (!this.options.silent) {
      this.spinner.succeed('Dependencies installed')
    }
  }

  /**
   * Cleans up the Vuetify repository if cleanup is enabled
   */
  async cleanup(): Promise<void> {
    if (this.options.cleanup && fs.existsSync(VUETIFY_DIR)) {
      if (!this.options.silent) {
        this.spinner.start('Cleaning up Vuetify repository...')
      }
      await execCommand(`rm -rf ${VUETIFY_DIR}`)
      if (!this.options.silent) {
        this.spinner.succeed('Vuetify repository cleaned up')
      }
    }
  }
}
