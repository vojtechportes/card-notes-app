import type { NoteStackDeveloperToolsBridge } from '../../../../../types/notestack-developer-tools-bridge'

export const getDeveloperToolsBridge = (): NoteStackDeveloperToolsBridge => {
  const bridge = window.noteStackDeveloperTools

  if (!bridge) {
    throw new Error('Developer tools are only available in NoteStack desktop.')
  }

  return bridge
}
