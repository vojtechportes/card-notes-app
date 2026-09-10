export const isMacOsRuntime = (): boolean => {
  return (
    new URLSearchParams(window.location.search).get('notestack-platform') ===
    'darwin'
  )
}
