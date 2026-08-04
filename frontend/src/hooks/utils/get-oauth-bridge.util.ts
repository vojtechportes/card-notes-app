import type { NoteStackOAuthBridge } from '../../types/notestack-oauth-bridge'

export const getOAuthBridge = (): NoteStackOAuthBridge => {
  const bridge = window.noteStackOAuth

  if (!bridge) {
    throw new Error('OAuth is only available in the NoteStack desktop app.')
  }

  return bridge
}
