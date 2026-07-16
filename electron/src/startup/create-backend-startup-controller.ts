import type { ChildProcess } from 'node:child_process'
import { BackendEntrypointMissingError } from './backend-entrypoint-missing-error.js'
import type { BackendStartupController } from './types/backend-startup-controller.js'
import type { StartupFailureReason } from './types/startup-failure-reason.js'
import type { StartupState } from './types/startup-state.js'
import { delayWithSignal } from './utils/delay-with-signal.util.js'
import { terminateChildProcess } from './utils/terminate-child-process.util.js'

interface CreateBackendStartupControllerOptions {
  emitState: (state: StartupState) => void
  isHealthy: (signal: AbortSignal) => Promise<boolean>
  log: (message: string) => void
  now?: () => number
  pollIntervalMs: number
  softThresholdMs: number
  spawnBackend: () => ChildProcess
  terminationTimeoutMs?: number
}

interface StartupAttempt {
  abortController: AbortController
  child: ChildProcess | null
  id: number
  ownsChild: boolean
  prolonged: boolean
  ready: boolean
  startedAt: number
}

export const createBackendStartupController = ({
  emitState,
  isHealthy,
  log,
  now = Date.now,
  pollIntervalMs,
  softThresholdMs,
  spawnBackend,
  terminationTimeoutMs = 5_000,
}: CreateBackendStartupControllerOptions): BackendStartupController => {
  let activeAttempt: StartupAttempt | null = null
  let attemptGeneration = 0
  let disposed = false
  let retryPromise: Promise<void> | null = null
  let state: StartupState = { status: 'starting', phase: 'initial' }

  const setState = (nextState: StartupState): void => {
    state = nextState
    emitState(nextState)
  }

  const isActive = (attempt: StartupAttempt): boolean => {
    return (
      !disposed &&
      activeAttempt?.id === attempt.id &&
      !attempt.abortController.signal.aborted
    )
  }

  const terminateOwnedChild = async (
    attempt: StartupAttempt,
    reason: string
  ): Promise<boolean> => {
    const child = attempt.child

    if (
      !attempt.ownsChild ||
      !child ||
      child.exitCode !== null ||
      child.signalCode !== null
    ) {
      return true
    }

    log(
      'Terminating owned backend PID ' +
        (child.pid ?? 'unknown') +
        ' (' +
        reason +
        '; attempt ' +
        attempt.id +
        ').'
    )

    const terminated = await terminateChildProcess(child, terminationTimeoutMs)

    if (!terminated) {
      log(
        'Owned backend PID ' +
          (child.pid ?? 'unknown') +
          ' did not terminate (' +
          reason +
          '; attempt ' +
          attempt.id +
          ').'
      )
    }

    return terminated
  }

  const cancelAttempt = async (
    attempt: StartupAttempt,
    reason: string
  ): Promise<boolean> => {
    if (!attempt.abortController.signal.aborted) {
      log(
        'Cancelling backend startup attempt ' +
          attempt.id +
          ' (' +
          reason +
          ').'
      )
      attempt.abortController.abort()
    }

    return terminateOwnedChild(attempt, reason)
  }

  const failAttempt = (
    attempt: StartupAttempt,
    reason: StartupFailureReason,
    details: string
  ): void => {
    if (!isActive(attempt) || attempt.ready) {
      return
    }

    log('Backend startup attempt ' + attempt.id + ' failed: ' + details)
    setState({ status: 'failed', reason })
    attempt.abortController.abort()
    void terminateOwnedChild(attempt, 'startup failure')
  }

  const checkHealth = async (attempt: StartupAttempt): Promise<boolean> => {
    try {
      return await isHealthy(attempt.abortController.signal)
    } catch {
      return false
    }
  }

  const pollUntilReady = async (attempt: StartupAttempt): Promise<void> => {
    while (isActive(attempt)) {
      const healthy = await checkHealth(attempt)

      if (!isActive(attempt) || attempt.ready) {
        return
      }

      if (healthy) {
        attempt.ready = true
        log(
          'Backend startup attempt ' +
            attempt.id +
            ' became ready' +
            (attempt.ownsChild
              ? ' with owned PID ' + (attempt.child?.pid ?? 'unknown')
              : ' by reusing an existing backend') +
            '.'
        )
        setState({ status: 'ready' })
        return
      }

      if (!attempt.prolonged && now() - attempt.startedAt >= softThresholdMs) {
        attempt.prolonged = true
        log(
          'Backend startup attempt ' +
            attempt.id +
            ' is taking longer than ' +
            softThresholdMs +
            'ms; polling continues.'
        )
        setState({ status: 'starting', phase: 'taking-longer' })
      }

      await delayWithSignal(pollIntervalMs, attempt.abortController.signal)
    }
  }

  const launchAttempt = async (): Promise<void> => {
    if (disposed) {
      return
    }

    const attempt: StartupAttempt = {
      abortController: new AbortController(),
      child: null,
      id: ++attemptGeneration,
      ownsChild: false,
      prolonged: false,
      ready: false,
      startedAt: now(),
    }

    activeAttempt = attempt
    log('Created backend startup attempt ' + attempt.id + '.')
    setState({ status: 'starting', phase: 'initial' })

    if (await checkHealth(attempt)) {
      if (isActive(attempt)) {
        attempt.ready = true
        log(
          'Backend startup attempt ' +
            attempt.id +
            ' reused an already healthy backend without taking ownership.'
        )
        setState({ status: 'ready' })
      }
      return
    }

    if (!isActive(attempt)) {
      return
    }

    try {
      attempt.child = spawnBackend()
      attempt.ownsChild = true
    } catch (error) {
      failAttempt(
        attempt,
        error instanceof BackendEntrypointMissingError
          ? 'entrypoint-missing'
          : 'spawn-error',
        error instanceof Error
          ? error.message
          : 'Backend process could not be launched.'
      )
      return
    }

    const child = attempt.child

    log(
      'Spawned owned backend PID ' +
        (child.pid ?? 'unknown') +
        ' for attempt ' +
        attempt.id +
        '.'
    )
    child.once('error', (error) => {
      failAttempt(attempt, 'spawn-error', error.message)
    })
    child.once('exit', (code, signal) => {
      failAttempt(
        attempt,
        'process-exited',
        signal
          ? 'process exited with signal ' + signal
          : 'process exited with code ' + code
      )
    })

    await pollUntilReady(attempt)
  }

  const retry = (): Promise<void> => {
    if (retryPromise) {
      return retryPromise
    }

    retryPromise = Promise.resolve()
      .then(async () => {
        if (disposed) {
          return
        }

        if (activeAttempt) {
          const terminated = await cancelAttempt(
            activeAttempt,
            'retry requested'
          )

          if (!terminated) {
            setState({
              status: 'failed',
              reason: 'termination-failed',
            })
            return
          }
        }

        void launchAttempt()
      })
      .finally(() => {
        retryPromise = null
      })

    return retryPromise
  }

  return {
    dispose: () => {
      disposed = true

      if (activeAttempt) {
        void cancelAttempt(activeAttempt, 'application shutdown')
      }

      activeAttempt = null
    },
    getState: () => state,
    retry,
    start: () => {
      if (!activeAttempt && !disposed) {
        void launchAttempt()
      }
    },
  }
}
