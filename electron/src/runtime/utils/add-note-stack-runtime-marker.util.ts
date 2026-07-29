import { noteStackRuntimeQuery } from '../constants/note-stack-runtime-query.js'

export const addNoteStackRuntimeMarker = (url: string): string => {
  const markedUrl = new URL(url)

  for (const [key, value] of Object.entries(noteStackRuntimeQuery)) {
    markedUrl.searchParams.set(key, value)
  }

  return markedUrl.toString()
}
