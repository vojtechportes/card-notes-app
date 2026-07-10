import { contextBridge, ipcRenderer } from 'electron'
import { createUpdaterBridge } from './updater/create-updater-bridge.js'

contextBridge.exposeInMainWorld(
  'cardNotesUpdater',
  createUpdaterBridge(ipcRenderer)
)

