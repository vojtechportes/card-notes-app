import { type ReactNode, isValidElement } from 'react'

export const getItemKey = (
  child: ReactNode,
  fallbackIndex: number
): string | number => {
  if (isValidElement(child) && child.key !== null) {
    return child.key
  }

  return fallbackIndex
}
