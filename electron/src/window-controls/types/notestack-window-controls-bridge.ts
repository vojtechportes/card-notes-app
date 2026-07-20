export interface WindowControlsState {
  isMaximized: boolean
}

export interface NoteStackWindowControlsBridge {
  close: () => Promise<void>
  getState: () => Promise<WindowControlsState>
  minimize: () => Promise<void>
  subscribe: (listener: (state: WindowControlsState) => void) => () => void
  toggleMaximize: () => Promise<void>
}
