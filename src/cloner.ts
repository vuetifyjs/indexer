import { exec } from 'child_process'
import { promisify } from 'util'
import { rimraf } from 'rimraf'

const execAsync = promisify(exec)

async function main () {
  await rimraf('api')
  await execAsync('git clone --depth=1 git@github.com:vuetifyjs/vuetify.git temp/vuetify')
  await execAsync('cd temp/vuetify && pnpm patch-remove @testing-library/vue vue-gtag-next && pnpm install --frozen-lockfile && pnpm build vuetify && pnpm build api')
  await execAsync('cp -r temp/vuetify/packages/api-generator/dist/api api/')
  await rimraf('temp')
}

await main()
