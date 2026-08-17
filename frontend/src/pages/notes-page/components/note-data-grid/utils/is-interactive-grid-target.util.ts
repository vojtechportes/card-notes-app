const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [role="button"], [role="link"], [contenteditable="true"]'

export const isInteractiveGridTarget = (
  target: EventTarget | null
): boolean => {
  return (
    target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR))
  )
}
