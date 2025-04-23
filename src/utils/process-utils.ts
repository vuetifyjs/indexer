import { spawn, ChildProcess } from 'child_process'
import ora from 'ora'
import os from 'os'

// Track active child processes for cleanup
const activeProcesses = new Set<ChildProcess>()

/**
 * Get optimal concurrency based on CPU cores
 */
export function getOptimalConcurrency(): number {
  const cores = os.cpus().length
  // Leave 1-2 cores for the system depending on total cores
  return Math.max(1, cores - (cores > 4 ? 2 : 1))
}

/**
 * Executes a command silently and returns a promise
 */
export async function execCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use a shell process with output completely ignored
    const child = spawn('sh', ['-c', command], {
      stdio: 'ignore',
      shell: false
    } as const)

    activeProcesses.add(child)

    child.on('close', (code: number | null) => {
      activeProcesses.delete(child)
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', (err: Error) => {
      activeProcesses.delete(child)
      reject(err)
    })
  })
}

/**
 * Cleanup function to kill all active processes
 */
export function cleanupProcesses(): void {
  for (const process of activeProcesses) {
    try {
      process.kill('SIGTERM')
    } catch (err) {
      console.error('Error killing process:', err)
    }
  }
  activeProcesses.clear()
}
