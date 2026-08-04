import DatabaseConstructor, { type Database } from 'better-sqlite3'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { v4 as uuidV4 } from 'uuid'

interface SqliteSchemaRow {
  name: string
}

export class DatabaseBackupService {
  createVerifiedBackup(
    database: Database,
    databasePath: string,
    backupName: string
  ): string | null {
    if (databasePath === ':memory:') {
      return null
    }

    const backupPath = this.getBackupPath(databasePath, backupName)
    const candidatePath = this.getCandidatePath(backupPath)

    mkdirSync(dirname(backupPath), { recursive: true })
    database.pragma('wal_checkpoint(FULL)')

    try {
      database.exec(`VACUUM INTO ${this.toSqliteStringLiteral(candidatePath)}`)
      this.verifyBackup(candidatePath)

      const candidateHash = this.getFileHash(candidatePath)
      const matchingBackupPath = this.findMatchingBackupPath(
        backupPath,
        candidateHash
      )

      if (matchingBackupPath) {
        rmSync(candidatePath, { force: true })
        return matchingBackupPath
      }

      const destinationPath = existsSync(backupPath)
        ? this.getVersionedBackupPath(backupPath, candidateHash)
        : backupPath

      renameSync(candidatePath, destinationPath)
      this.verifyBackup(destinationPath)

      return destinationPath
    } catch (error) {
      if (existsSync(candidatePath)) {
        rmSync(candidatePath, { force: true })
      }

      throw error
    }
  }

  restoreVerifiedBackup(backupPath: string, databasePath: string): void {
    if (databasePath === ':memory:') {
      return
    }

    this.verifyBackup(backupPath)
    rmSync(`${databasePath}-wal`, { force: true })
    rmSync(`${databasePath}-shm`, { force: true })
    copyFileSync(backupPath, databasePath)
    this.verifyBackup(databasePath)
  }

  verifyBackup(backupPath: string): void {
    const backup = new DatabaseConstructor(backupPath, {
      fileMustExist: true,
      readonly: true,
    })

    try {
      const result = backup.pragma('integrity_check', {
        simple: true,
      }) as string | undefined

      if (result !== 'ok') {
        throw new Error(`SQLite backup integrity check failed: ${result}`)
      }

      const schema = backup
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'"
        )
        .get() as SqliteSchemaRow | undefined

      if (!schema) {
        throw new Error('SQLite backup is missing the migration history')
      }
    } finally {
      backup.close()
    }
  }

  getBackupPath(databasePath: string, backupName: string): string {
    const extension = extname(databasePath)
    const databaseName = basename(databasePath, extension)

    return join(
      dirname(databasePath),
      'backups',
      `${databaseName}.${backupName}.sqlite`
    )
  }

  private findMatchingBackupPath(
    backupPath: string,
    candidateHash: string
  ): string | null {
    if (existsSync(backupPath)) {
      this.verifyBackup(backupPath)

      if (this.getFileHash(backupPath) === candidateHash) {
        return backupPath
      }
    }

    const versionedBackupPath = this.getVersionedBackupPath(
      backupPath,
      candidateHash
    )

    if (!existsSync(versionedBackupPath)) {
      return null
    }

    this.verifyBackup(versionedBackupPath)

    if (this.getFileHash(versionedBackupPath) !== candidateHash) {
      throw new Error('SQLite backup fingerprint collision detected')
    }

    return versionedBackupPath
  }

  private getCandidatePath(backupPath: string): string {
    return `${backupPath}.candidate-${uuidV4()}`
  }

  private getVersionedBackupPath(
    backupPath: string,
    sourceHash: string
  ): string {
    const extension = extname(backupPath)

    return `${backupPath.slice(0, -extension.length)}.${sourceHash.slice(0, 16)}${extension}`
  }

  private getFileHash(filePath: string): string {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex')
  }

  private toSqliteStringLiteral(value: string): string {
    return `'${value.replaceAll("'", "''")}'`
  }
}
