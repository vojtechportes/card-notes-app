import type { ChildProcess } from 'node:child_process'

export const terminateChildProcess = (
  child: ChildProcess,
  timeoutMs: number
): Promise<boolean> => {
  return new Promise((resolve) => {
    let settled = false
    let timeout: ReturnType<typeof setTimeout> | undefined

    const finish = (terminated: boolean) => {
      if (settled) {
        return
      }

      settled = true

      if (timeout) {
        clearTimeout(timeout)
      }

      child.removeListener('exit', handleExit)
      resolve(terminated)
    }
    const handleExit = () => finish(true)

    child.once('exit', handleExit)

    try {
      if (!child.kill()) {
        finish(false)
        return
      }
    } catch {
      finish(false)
      return
    }

    if (!settled) {
      timeout = setTimeout(() => finish(false), timeoutMs)
    }
  })
}
