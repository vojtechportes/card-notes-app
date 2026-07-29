const noteStackRuntimeQueryKey = 'notestack-runtime'
const noteStackElectronRuntime = 'electron'

export const isNoteStackElectronRuntime = (search: string): boolean => {
  return (
    new URLSearchParams(search).get(noteStackRuntimeQueryKey) ===
    noteStackElectronRuntime
  )
}
