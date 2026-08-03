import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const writePackagedOAuthVerificationResult = (
  verificationRoot: string
): void => {
  mkdirSync(verificationRoot, { recursive: true })
  writeFileSync(path.join(verificationRoot, 'result'), 'passed', {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  })
}
