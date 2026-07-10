import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, dialog, shell } from 'electron'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(dirname, '..', '..')
const backendHost = process.env.HOST ?? process.env.BACKEND_HOST ?? '127.0.0.1'
const backendPort = Number(process.env.PORT ?? process.env.BACKEND_PORT ?? '3000')
const backendHealthUrl = `http://${backendHost}:${backendPort}/api/health`
const backendStartupTimeoutMs = 15000
const backendPollIntervalMs = 250

let backendProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null

app.setName('Card Notes App')

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
  if (backendProcess && backendProcess.exitCode === null) {
    backendProcess.kill()
  }
})

async function startApplication(): Promise<void> {
  try {
    await ensureBackendAvailable()
    await createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow()
      }
    })
  } catch (error) {
    dialog.showErrorBox(
      'Unable to start Card Notes App',
      error instanceof Error ? error.message : 'Unknown startup error.'
    )

    app.quit()
  }
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)

    return { action: 'deny' }
  })

  const frontendDevServerUrl = process.env.FRONTEND_DEV_SERVER_URL

  if (frontendDevServerUrl) {
    await mainWindow.loadURL(frontendDevServerUrl)
    return
  }

  await mainWindow.loadFile(
    path.join(workspaceRoot, 'frontend', 'dist', 'index.html')
  )
}

async function ensureBackendAvailable(): Promise<void> {
  if (await isBackendHealthy()) {
    return
  }

  backendProcess = startBackendProcess()
  await waitForBackend()
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
    console.log(`[backend] ${chunk.toString().trimEnd()}`)
  })

  childProcess.stderr?.on('data', (chunk: Buffer) => {
    console.error(`[backend] ${chunk.toString().trimEnd()}`)
  })

  childProcess.on('exit', () => {
    if (backendProcess?.pid === childProcess.pid) {
      backendProcess = null
    }
  })

  childProcess.on('error', (error) => {
    console.error('[backend] failed to start', error)
  })

  return childProcess
}

function getBackendProcessArgs(): string[] {
  if (!app.isPackaged) {
    const tsxCliPath = path.join(workspaceRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
    const backendSourcePath = path.join(workspaceRoot, 'backend', 'src', 'main.ts')

    if (existsSync(tsxCliPath) && existsSync(backendSourcePath)) {
      return [tsxCliPath, backendSourcePath]
    }
  }

  const backendDistPath = path.join(workspaceRoot, 'backend', 'dist', 'main.js')

  if (existsSync(backendDistPath)) {
    return [backendDistPath]
  }

  throw new Error(
    'Backend entrypoint was not found. Build the backend before launching Electron.'
  )
}

async function waitForBackend(): Promise<void> {
  const timeoutAt = Date.now() + backendStartupTimeoutMs

  while (Date.now() < timeoutAt) {
    if (await isBackendHealthy()) {
      return
    }

    if (backendProcess?.exitCode !== null) {
      throw new Error('The local backend exited before it became ready.')
    }

    await delay(backendPollIntervalMs)
  }

  throw new Error('Timed out while waiting for the local backend to become ready.')
}

async function isBackendHealthy(): Promise<boolean> {
  try {
    const response = await fetch(backendHealthUrl)

    return response.ok
  } catch {
    return false
  }
}

function delay(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs)
  })
}
