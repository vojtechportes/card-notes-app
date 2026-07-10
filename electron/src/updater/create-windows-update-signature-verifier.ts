import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

interface AuthenticodeSignerCertificate {
  Subject?: string
  Thumbprint?: string
}

interface AuthenticodeSignatureResult {
  Path?: string
  SignerCertificate?: AuthenticodeSignerCertificate | null
  Status?: number
  StatusMessage?: string
}

interface FileSignatureInfo {
  path: string | null
  signerSubject: string | null
  signerThumbprint: string | null
  status: number | null
  statusMessage: string | null
}

interface LoggerLike {
  info?: (message: string) => void
  warn?: (message: string) => void
}

type VerifyUpdateCodeSignature = (
  publisherNames: string[],
  updateFilePath: string
) => Promise<string | null>

type VerifyUpdateCodeSignatureWithLogger = (
  publisherNames: string[],
  updateFilePath: string,
  logger: LoggerLike
) => Promise<string | null>

interface CreateWindowsUpdateSignatureVerifierOptions {
  currentFilePath: string
  logger?: LoggerLike
  readSignatureInfo?: (filePath: string) => Promise<FileSignatureInfo>
  verifySignature?: VerifyUpdateCodeSignatureWithLogger
}

const require = createRequire(import.meta.url)
const { verifySignature: verifyWindowsSignature } = require(
  'electron-updater/out/windowsExecutableCodeSignatureVerifier.js'
) as {
  verifySignature: VerifyUpdateCodeSignatureWithLogger
}

export const createWindowsUpdateSignatureVerifier = ({
  currentFilePath,
  logger = {},
  readSignatureInfo = readWindowsFileSignatureInfo,
  verifySignature = verifyWindowsSignature,
}: CreateWindowsUpdateSignatureVerifierOptions): VerifyUpdateCodeSignature => {
  return async (publisherNames, updateFilePath) => {
    const defaultVerificationResult = await verifySignature(
      publisherNames,
      updateFilePath,
      logger
    )

    if (defaultVerificationResult === null) {
      return null
    }

    const [currentSignature, updateSignature] = await Promise.all([
      readSignatureInfo(currentFilePath),
      readSignatureInfo(updateFilePath),
    ])

    const currentThumbprint = normalizeCertificateValue(
      currentSignature.signerThumbprint
    )
    const updateThumbprint = normalizeCertificateValue(
      updateSignature.signerThumbprint
    )
    const currentSubject = normalizeCertificateValue(currentSignature.signerSubject)
    const updateSubject = normalizeCertificateValue(updateSignature.signerSubject)

    if (
      updateSignature.status !== 0 &&
      currentThumbprint &&
      updateThumbprint &&
      currentSubject &&
      updateSubject &&
      currentThumbprint === updateThumbprint &&
      currentSubject === updateSubject
    ) {
      logger.warn?.(
        'Accepted self-signed update because the installer certificate matches the running application certificate thumbprint.'
      )

      return null
    }

    return defaultVerificationResult
  }
}

const readWindowsFileSignatureInfo = async (
  filePath: string
): Promise<FileSignatureInfo> => {
  const escapedFilePath = filePath.replace(/'/g, "''")
  const command = `Get-AuthenticodeSignature -LiteralPath '${escapedFilePath}' | ConvertTo-Json -Compress`

  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-InputFormat', 'None', '-Command', command],
      {
        windowsHide: true,
      },
      (error, resultStdout, resultStderr) => {
        if (error) {
          reject(error)
          return
        }

        if (resultStderr.trim()) {
          reject(new Error(resultStderr))
          return
        }

        resolve(resultStdout)
      }
    )
  })

  const signatureInfo = mapAuthenticodeSignatureResult(
    JSON.parse(stdout) as AuthenticodeSignatureResult
  )

  if (
    signatureInfo.path &&
    path.normalize(signatureInfo.path) !== path.normalize(filePath)
  ) {
    throw new Error(
      `Get-AuthenticodeSignature returned ${signatureInfo.path} instead of ${filePath}.`
    )
  }

  return signatureInfo
}

const mapAuthenticodeSignatureResult = (
  signatureResult: AuthenticodeSignatureResult
): FileSignatureInfo => {
  return {
    path: signatureResult.Path ?? null,
    signerSubject: signatureResult.SignerCertificate?.Subject ?? null,
    signerThumbprint: signatureResult.SignerCertificate?.Thumbprint ?? null,
    status: typeof signatureResult.Status === 'number' ? signatureResult.Status : null,
    statusMessage: signatureResult.StatusMessage ?? null,
  }
}

const normalizeCertificateValue = (
  value: string | null | undefined
): string | null => {
  if (!value) {
    return null
  }

  return value.replace(/^"|"$/g, '').trim().toUpperCase()
}
