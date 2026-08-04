import { spawn, type ChildProcess } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  app,
  BrowserWindow,
  dialog,
  net,
  powerMonitor,
  safeStorage,
  shell,
} from 'electron'
import electronUpdater from 'electron-updater'
import type { AppUpdater } from 'electron-updater'
import { fileURLToPath } from 'node:url'
import {
  createUpdaterBackgroundSchedule,
  type UpdaterBackgroundSchedule,
} from './updater/create-updater-background-schedule/create-updater-background-schedule.js'
import {
  createUpdaterService,
  type UpdaterService,
} from './updater/create-updater-service.js'
import { createWindowsUpdateSignatureVerifier } from './updater/create-windows-update-signature-verifier.js'
import { updaterIpcChannels } from './updater/updater-ipc-channels.js'
import { registerUpdaterIpc } from './updater/register-updater-ipc.js'
import type { UpdaterState } from './updater/updater-contract.js'
import { getApplicationDataRoot } from './backend/utils/get-application-data-root.util.js'
import { BackendEntrypointMissingError } from './startup/backend-entrypoint-missing-error.js'
import { createBackendStartupController } from './startup/create-backend-startup-controller.js'
import { registerStartupIpc } from './startup/register-startup-ipc.js'
import { startupIpcChannels } from './startup/startup-ipc-channels.js'
import type { BackendStartupController } from './startup/types/backend-startup-controller.js'
import type { StartupState } from './startup/types/startup-state.js'
import { fetchBackendHealth } from './startup/utils/fetch-backend-health.util.js'
import { findAvailablePort } from './startup/utils/find-available-port.util.js'
import { openBackendLog } from './startup/utils/open-backend-log.util.js'
import { noteStackRuntimeQuery } from './runtime/constants/note-stack-runtime-query.js'
import { addNoteStackRuntimeMarker } from './runtime/utils/add-note-stack-runtime-marker.util.js'
import { createAuthRuntime } from './auth/create-auth-runtime.js'
import { registerOAuthIpc } from './auth/register-oauth-ipc.js'
import { oauthIpcChannels } from './auth/constants/oauth-ipc-channels.js'
import type { AuthRuntime } from './auth/types/auth-runtime.js'
import type { OAuthPublicState } from './auth/types/oauth-public-state.js'
import { runPackagedOAuthVerification } from './auth/packaged/run-packaged-oauth-verification.util.js'
import { getPackagedOAuthVerificationRoot } from './auth/packaged/get-packaged-oauth-verification-root.util.js'
import { writePackagedOAuthVerificationResult } from './auth/packaged/write-packaged-oauth-verification-result.util.js'
import { registerWindowControlsIpc } from './window-controls/register-window-controls-ipc.js'
import { registerWindowControlsStateEvents } from './window-controls/register-window-controls-state-events.js'
import { createSyncTriggerSchedule } from './sync/create-sync-trigger-schedule.js'
import type { SyncTriggerSchedule } from './sync/create-sync-trigger-schedule.js'
import { createSyncQuitHandler } from './sync/utils/create-sync-quit-handler.util.js'
import { sendSyncTrigger } from './sync/utils/send-sync-trigger.util.js'

const { autoUpdater } = electronUpdater
const windowsAutoUpdater = autoUpdater as AppUpdater & {
  verifyUpdateCodeSignature?: (
    publisherNames: string[],
    updateFilePath: string
  ) => Promise<string | null>
}

if (process.platform === 'win32') {
  windowsAutoUpdater.verifyUpdateCodeSignature =
    createWindowsUpdateSignatureVerifier({
      currentFilePath: process.execPath,
      logger: autoUpdater.logger ?? undefined,
    })
}

const dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(dirname, '..', '..')
const preloadEntryPath = path.join(dirname, 'preload.cjs')
const packagedFrontendEntryPath = path.join(
  workspaceRoot,
  'frontend',
  'dist',
  'index.html'
)
const applicationIconPath = path.join(
  workspaceRoot,
  'electron',
  'build',
  'icon.png'
)
const backendHost = process.env.HOST ?? process.env.BACKEND_HOST ?? '127.0.0.1'
const applicationDataRoot = getApplicationDataRoot(app.getPath('appData'))
let backendPort: number | null = null
let backendHealthUrl: string | null = null
let backendApiBaseUrl: string | null = null
const backendStartupSoftThresholdMs = 30_000
const backendPollIntervalMs = 250
const backendHealthRequestTimeoutMs = 2_000
const backendLogFileName = 'backend.log'
const frontendDevServerUrl = process.env.FRONTEND_DEV_SERVER_URL
const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:'])

let authRuntime: AuthRuntime | null = null
let unregisterOAuthIpc: (() => void) | null = null
let backendStartupController: BackendStartupController | null = null
let mainWindow: BrowserWindow | null = null
let updaterBackgroundSchedule: UpdaterBackgroundSchedule | null = null
let updaterService: UpdaterService | null = null
let syncTriggerSchedule: SyncTriggerSchedule | null = null

app.setName('NoteStack')

const isPackagedOAuthVerification =
  process.env.NOTESTACK_VERIFY_PACKAGED_OAUTH === '1'
const packagedOAuthVerificationRoot = getPackagedOAuthVerificationRoot(
  app.getPath('temp'),
  process.env.NOTESTACK_PACKAGED_OAUTH_VERIFICATION_ROOT
)

if (isPackagedOAuthVerification && packagedOAuthVerificationRoot) {
  app.setPath('userData', path.join(packagedOAuthVerificationRoot, 'user-data'))
}

const hasSingleInstanceLock =
  isPackagedOAuthVerification || app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else if (isPackagedOAuthVerification) {
  app.whenReady().then(async () => {
    try {
      if (!packagedOAuthVerificationRoot) {
        throw new Error('Packaged OAuth verification root is invalid.')
      }

      await runPackagedOAuthVerification(app, safeStorage)
      writePackagedOAuthVerificationResult(packagedOAuthVerificationRoot)
      app.exit(0)
    } catch {
      app.exit(1)
    }
  })
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      return
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.focus()
  })

  app.whenReady().then(() => {
    void startApplication()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on(
  'before-quit',
  createSyncQuitHandler({
    dispose: disposeApplicationResources,
    flush: () => syncTriggerSchedule?.flushBeforeQuit() ?? Promise.resolve(),
    quit: () => app.quit(),
  })
)

function disposeApplicationResources(): void {
  syncTriggerSchedule?.dispose()
  syncTriggerSchedule = null

  unregisterOAuthIpc?.()
  unregisterOAuthIpc = null
  authRuntime?.dispose()
  authRuntime = null

  updaterBackgroundSchedule?.dispose()
  updaterBackgroundSchedule = null

  backendStartupController?.dispose()
  backendStartupController = null
}
async function startApplication(): Promise<void> {
  try {
    authRuntime = await createAuthRuntime({
      dataRoot: applicationDataRoot,
      onStateChange: emitOAuthState,
      openExternal: (url) => shell.openExternal(url),
      safeStorage,
    })
    unregisterOAuthIpc = registerOAuthIpc(authRuntime.oauthService)
    backendPort = await findAvailablePort(backendHost)
    const apiBaseUrl = `http://${backendHost}:${backendPort}/api`
    backendApiBaseUrl = apiBaseUrl
    backendHealthUrl = `${apiBaseUrl}/health`
    updaterService = createUpdaterService({
      client: autoUpdater,
      currentVersion: app.getVersion(),
      isEnabled: isUpdaterEnabled(),
      onStateChange: emitUpdaterState,
    })
    updaterBackgroundSchedule = createUpdaterBackgroundSchedule({
      updaterService,
    })
    backendStartupController = createBackendStartupController({
      apiBaseUrl,
      emitState: emitStartupState,
      isHealthy: isBackendHealthy,
      log: (message) => writeBackendLog('lifecycle', message + '\n'),
      pollIntervalMs: backendPollIntervalMs,
      softThresholdMs: backendStartupSoftThresholdMs,
      spawnBackend: startBackendProcess,
    })

    registerUpdaterIpc(updaterService)
    registerWindowControlsIpc()
    registerStartupIpc(backendStartupController, {
      exit: () => app.quit(),
      openBackendLog: () =>
        openBackendLog(getBackendLogPath(), (logPath) => {
          shell.showItemInFolder(logPath)
        }),
    })

    backendStartupController.start()
    syncTriggerSchedule = createSyncTriggerSchedule({
      isOnline: () => net.isOnline(),
      onBackground: (listener) => {
        app.on('browser-window-blur', listener)
        return () => app.off('browser-window-blur', listener)
      },
      onFocus: (listener) => {
        app.on('browser-window-focus', listener)
        return () => app.off('browser-window-focus', listener)
      },
      onResume: (listener) => {
        powerMonitor.on('resume', listener)
        return () => powerMonitor.off('resume', listener)
      },
      send: (trigger) => {
        if (backendApiBaseUrl) {
          return sendSyncTrigger(backendApiBaseUrl, trigger)
        }
      },
    })
    await createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow()
      }
    })
  } catch (error) {
    unregisterOAuthIpc?.()
    unregisterOAuthIpc = null
    authRuntime?.dispose()
    authRuntime = null
    backendStartupController?.dispose()
    dialog.showErrorBox(
      'Unable to start NoteStack',
      error instanceof Error ? error.message : 'Unknown startup error.'
    )

    app.quit()
  }
}

function isUpdaterEnabled(): boolean {
  return (
    app.isPackaged &&
    !process.defaultApp &&
    process.env.NODE_ENV !== 'development'
  )
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 420,
    minHeight: 640,
    frame: false,
    icon: existsSync(applicationIconPath) ? applicationIconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadEntryPath,
      sandbox: true,
    },
  })
  mainWindow.removeMenu()
  registerWindowControlsStateEvents(mainWindow)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      return
    }

    if (updaterService) {
      mainWindow.webContents.send(
        updaterIpcChannels.stateChanged,
        updaterService.getState()
      )
    }

    if (backendStartupController) {
      mainWindow.webContents.send(
        startupIpcChannels.stateChanged,
        backendStartupController.getState()
      )
    }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedApplicationUrl(url)) {
      return
    }

    event.preventDefault()
    void openExternalUrl(url)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalUrl(url)

    return { action: 'deny' }
  })

  if (frontendDevServerUrl) {
    await mainWindow.loadURL(addNoteStackRuntimeMarker(frontendDevServerUrl))
    return
  }

  await mainWindow.loadFile(packagedFrontendEntryPath, {
    query: noteStackRuntimeQuery,
  })
}

function emitOAuthState(state: OAuthPublicState): void {
  for (const browserWindow of BrowserWindow.getAllWindows()) {
    if (!browserWindow.isDestroyed()) {
      browserWindow.webContents.send(oauthIpcChannels.stateChanged, state)
    }
  }
}

function emitUpdaterState(state: UpdaterState): void {
  for (const browserWindow of BrowserWindow.getAllWindows()) {
    if (browserWindow.isDestroyed()) {
      continue
    }

    browserWindow.webContents.send(updaterIpcChannels.stateChanged, state)
  }
}

function emitStartupState(state: StartupState): void {
  for (const browserWindow of BrowserWindow.getAllWindows()) {
    if (browserWindow.isDestroyed()) {
      continue
    }

    browserWindow.webContents.send(startupIpcChannels.stateChanged, state)
  }
}
function isAllowedApplicationUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)

    if (frontendDevServerUrl) {
      return parsedUrl.origin === new URL(frontendDevServerUrl).origin
    }

    if (parsedUrl.protocol !== 'file:') {
      return false
    }

    return (
      path.normalize(fileURLToPath(parsedUrl)) === packagedFrontendEntryPath
    )
  } catch {
    return false
  }
}

async function openExternalUrl(url: string): Promise<void> {
  const safeExternalUrl = getSafeExternalUrl(url)

  if (!safeExternalUrl) {
    return
  }

  await shell.openExternal(safeExternalUrl)
}

function getSafeExternalUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url)

    if (!allowedExternalProtocols.has(parsedUrl.protocol)) {
      return null
    }

    return parsedUrl.toString()
  } catch {
    return null
  }
}

function startBackendProcess(): ChildProcess {
  const args = getBackendProcessArgs()
  const port = getBackendPort()

  const childProcess = spawn(process.execPath, args, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOST: backendHost,
      BACKEND_HOST: backendHost,
      PORT: String(port),
      BACKEND_PORT: String(port),
      CARD_NOTES_DATA_ROOT: applicationDataRoot,
      NOTESTACK_CREDENTIAL_BROKER_BOOTSTRAP: 'stdin',
    },
    stdio: 'pipe',
  })

  if (!authRuntime) {
    childProcess.kill()
    throw new Error('Credential broker is unavailable.')
  }

  childProcess.stdin?.end(JSON.stringify(authRuntime.bootstrap) + '\n')

  childProcess.stdout?.on('data', (chunk: Buffer) => {
    const output = chunk.toString()

    console.log(`[backend] ${output.trimEnd()}`)
    writeBackendLog('stdout', output)
  })

  childProcess.stderr?.on('data', (chunk: Buffer) => {
    const output = chunk.toString()

    console.error(`[backend] ${output.trimEnd()}`)
    writeBackendLog('stderr', output)
  })

  childProcess.on('error', (error) => {
    const output = `Failed to start backend process: ${error.message}`

    console.error('[backend] failed to start', error)
    writeBackendLog('error', output)
  })

  return childProcess
}

function getBackendProcessArgs(): string[] {
  if (!app.isPackaged) {
    const tsxCliPath = path.join(
      workspaceRoot,
      'node_modules',
      'tsx',
      'dist',
      'cli.mjs'
    )
    const backendSourcePath = path.join(
      workspaceRoot,
      'backend',
      'src',
      'main.ts'
    )

    if (existsSync(tsxCliPath) && existsSync(backendSourcePath)) {
      return [tsxCliPath, backendSourcePath]
    }
  }

  const backendDistPath = path.join(workspaceRoot, 'backend', 'dist', 'main.js')

  if (existsSync(backendDistPath)) {
    return [backendDistPath]
  }

  throw new BackendEntrypointMissingError(
    'Backend entrypoint was not found. Build the backend before launching Electron.'
  )
}

function writeBackendLog(stream: string, output: string): void {
  try {
    const logEntry = `[${new Date().toISOString()}] [${stream}] ${output}`

    mkdirSync(app.getPath('logs'), { recursive: true })
    appendFileSync(getBackendLogPath(), logEntry)
  } catch (error) {
    console.error('[backend] failed to write backend log', error)
  }
}

function getBackendLogPath(): string {
  return path.join(app.getPath('logs'), backendLogFileName)
}

function isBackendHealthy(signal: AbortSignal): Promise<boolean> {
  if (!backendHealthUrl) {
    return Promise.resolve(false)
  }

  return fetchBackendHealth(
    backendHealthUrl,
    signal,
    backendHealthRequestTimeoutMs
  )
}
function getBackendPort(): number {
  if (backendPort === null) {
    throw new Error('Backend port has not been selected.')
  }

  return backendPort
}
