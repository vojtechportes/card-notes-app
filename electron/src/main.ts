import { spawn, type ChildProcess } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, dialog, shell } from 'electron'
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
import { BackendEntrypointMissingError } from './startup/backend-entrypoint-missing-error.js'
import { createBackendStartupController } from './startup/create-backend-startup-controller.js'
import { registerStartupIpc } from './startup/register-startup-ipc.js'
import { startupIpcChannels } from './startup/startup-ipc-channels.js'
import type { BackendStartupController } from './startup/types/backend-startup-controller.js'
import type { StartupState } from './startup/types/startup-state.js'
import { fetchBackendHealth } from './startup/utils/fetch-backend-health.util.js'
import { openBackendLog } from './startup/utils/open-backend-log.util.js'

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
const backendPort = Number(
  process.env.PORT ?? process.env.BACKEND_PORT ?? '3000'
)
const backendHealthUrl = `http://${backendHost}:${backendPort}/api/health`
const backendStartupSoftThresholdMs = 15_000
const backendPollIntervalMs = 250
const backendHealthRequestTimeoutMs = 2_000
const backendLogFileName = 'backend.log'
const frontendDevServerUrl = process.env.FRONTEND_DEV_SERVER_URL
const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:'])

let backendStartupController: BackendStartupController | null = null
let mainWindow: BrowserWindow | null = null
let updaterBackgroundSchedule: UpdaterBackgroundSchedule | null = null
let updaterService: UpdaterService | null = null

app.setName('NoteStack')

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
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

app.on('before-quit', () => {
  updaterBackgroundSchedule?.dispose()
  updaterBackgroundSchedule = null

  backendStartupController?.dispose()
  backendStartupController = null
})

async function startApplication(): Promise<void> {
  try {
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
      emitState: emitStartupState,
      isHealthy: isBackendHealthy,
      log: (message) => writeBackendLog('lifecycle', message + '\n'),
      pollIntervalMs: backendPollIntervalMs,
      softThresholdMs: backendStartupSoftThresholdMs,
      spawnBackend: startBackendProcess,
    })

    registerUpdaterIpc(updaterService)
    registerStartupIpc(backendStartupController, {
      exit: () => app.quit(),
      openBackendLog: () =>
        openBackendLog(getBackendLogPath(), (logPath) => {
          shell.showItemInFolder(logPath)
        }),
    })

    backendStartupController.start()
    await createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow()
      }
    })
  } catch (error) {
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
    minWidth: 960,
    minHeight: 640,
    icon: existsSync(applicationIconPath) ? applicationIconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadEntryPath,
      sandbox: true,
    },
  })

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
    await mainWindow.loadURL(frontendDevServerUrl)
    return
  }

  await mainWindow.loadFile(packagedFrontendEntryPath)
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

  const childProcess = spawn(process.execPath, args, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOST: backendHost,
      BACKEND_HOST: backendHost,
      PORT: String(backendPort),
      BACKEND_PORT: String(backendPort),
    },
    stdio: 'pipe',
  })

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
  return fetchBackendHealth(
    backendHealthUrl,
    signal,
    backendHealthRequestTimeoutMs
  )
}
