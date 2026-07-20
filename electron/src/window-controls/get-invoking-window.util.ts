import { BrowserWindow, type WebContents } from 'electron'

export const getInvokingWindow = (
  sender: WebContents
): BrowserWindow | null => {
  return BrowserWindow.fromWebContents(sender)
}
