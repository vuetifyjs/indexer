import { exec } from 'child_process'
import { promisify } from 'util'
import { rimraf } from 'rimraf'
import { logger } from '#utils/logger'

const execAsync = promisify(exec)

async function main () {
  await rimraf('api')
  await rimraf('temp')

  logger.info('Installing Vuetify dependencies and building API...')
  await execAsync('git clone --depth=1 git@github.com:vuetifyjs/vuetify.git temp/vuetify')
  await execAsync('cd temp/vuetify && pnpm install --frozen-lockfile && pnpm build vuetify && pnpm build api')
  await execAsync('cp -r temp/vuetify/packages/api-generator/dist/api api/')
  await rimraf('temp')

  logger.info('Vuetify API generated successfully.')
}

await main()
