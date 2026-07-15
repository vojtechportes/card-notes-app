import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { rebuild } from '@electron/rebuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const electronRoot = path.resolve(dirname, '..')
const workspaceRoot = path.resolve(electronRoot, '..')
const backendRoot = path.join(workspaceRoot, 'backend')
const backendDistPath = path.join(backendRoot, 'dist')
const backendPackagePath = path.join(backendRoot, 'package.json')
const backendNodeModulesPath = path.join(backendRoot, 'node_modules')
const electronPackagePath = path.join(electronRoot, 'package.json')
const rootNodeModulesPath = path.join(workspaceRoot, 'node_modules')
const stagedBackendRoot = path.join(electronRoot, '.backend-runtime')
const stagedBackendDistPath = path.join(stagedBackendRoot, 'dist')
const stagedBackendNodeModulesPath = path.join(stagedBackendRoot, 'node_modules')

if (!existsSync(backendDistPath)) {
  throw new Error('Backend dist output was not found. Build the backend before packaging Electron.')
}

if (!existsSync(rootNodeModulesPath)) {
  throw new Error(
    'Root node_modules directory was not found. Install dependencies before packaging Electron.'
  )
}

rmSync(stagedBackendRoot, { recursive: true, force: true })
mkdirSync(stagedBackendRoot, { recursive: true })
cpSync(backendDistPath, stagedBackendDistPath, { recursive: true })
copyFileSync(backendPackagePath, path.join(stagedBackendRoot, 'package.json'))
mkdirSync(stagedBackendNodeModulesPath, { recursive: true })

const backendPackageJson = JSON.parse(readFileSync(backendPackagePath, 'utf8'))
const copiedPackagePaths = new Set()

const resolveInstalledPackagePath = (packageName, resolveFromPath) => {
  const packageRequire = createRequire(path.join(resolveFromPath, 'package.json'))

  try {
    return path.dirname(packageRequire.resolve(`${packageName}/package.json`))
  } catch (packageJsonError) {
    try {
      let candidatePath = path.dirname(packageRequire.resolve(packageName))

      while (candidatePath !== path.dirname(candidatePath)) {
        const candidatePackageJsonPath = path.join(candidatePath, 'package.json')

        if (existsSync(candidatePackageJsonPath)) {
          const candidatePackageJson = JSON.parse(readFileSync(candidatePackageJsonPath, 'utf8'))

          if (candidatePackageJson.name === packageName) {
            return candidatePath
          }
        }

        candidatePath = path.dirname(candidatePath)
      }
    } catch {
      // The caller decides whether a missing dependency is optional.
    }

    throw packageJsonError
  }
}

const getStagedPackagePath = (installedPackagePath) => {
  const nodeModulesRoots = [backendNodeModulesPath, rootNodeModulesPath]

  for (const nodeModulesRoot of nodeModulesRoots) {
    const relativePath = path.relative(nodeModulesRoot, installedPackagePath)

    if (
      relativePath !== '..' &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath)
    ) {
      return path.join(stagedBackendNodeModulesPath, relativePath)
    }
  }

  throw new Error(
    `Resolved backend dependency is outside known node_modules roots: ${installedPackagePath}`
  )
}

const getDependencyEntries = (packageJson) => {
  const dependencyEntries = new Map()

  for (const dependencyName of Object.keys(packageJson.dependencies ?? {})) {
    dependencyEntries.set(dependencyName, true)
  }

  for (const dependencyName of Object.keys(packageJson.optionalDependencies ?? {})) {
    dependencyEntries.set(dependencyName, dependencyEntries.get(dependencyName) ?? false)
  }

  for (const dependencyName of Object.keys(packageJson.peerDependencies ?? {})) {
    dependencyEntries.set(dependencyName, dependencyEntries.get(dependencyName) ?? false)
  }

  return [...dependencyEntries.entries()].map(([name, isRequired]) => ({
    name,
    isRequired,
  }))
}

const copyDependencyClosure = (packageName, resolveFromPath, isRequired = true) => {
  let installedPackagePath

  try {
    installedPackagePath = resolveInstalledPackagePath(packageName, resolveFromPath)
  } catch (error) {
    if (!isRequired) {
      return
    }

    throw new Error(
      `Could not resolve required backend dependency ${packageName} from ${resolveFromPath}.`,
      { cause: error }
    )
  }

  if (copiedPackagePaths.has(installedPackagePath)) {
    return
  }

  const packageJsonPath = path.join(installedPackagePath, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const destinationPath = getStagedPackagePath(installedPackagePath)

  mkdirSync(path.dirname(destinationPath), { recursive: true })
  cpSync(installedPackagePath, destinationPath, {
    recursive: true,
    filter: (sourcePath) => {
      const relativePath = path.relative(installedPackagePath, sourcePath)

      return !relativePath.split(path.sep).includes('node_modules')
    },
  })
  copiedPackagePaths.add(installedPackagePath)

  for (const dependency of getDependencyEntries(packageJson)) {
    copyDependencyClosure(dependency.name, installedPackagePath, dependency.isRequired)
  }
}

for (const dependencyName of Object.keys(backendPackageJson.dependencies ?? {})) {
  copyDependencyClosure(dependencyName, backendRoot)
}

const electronPackageJson = JSON.parse(readFileSync(electronPackagePath, 'utf8'))
const electronVersion = electronPackageJson.devDependencies?.electron

if (typeof electronVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(electronVersion)) {
  throw new Error('An exact Electron version is required to rebuild backend native dependencies.')
}

await rebuild({
  buildPath: stagedBackendRoot,
  projectRootPath: stagedBackendRoot,
  electronVersion,
  arch: process.env.npm_config_arch ?? process.arch,
  onlyModules: ['better-sqlite3'],
  force: true,
})

const stagedPackageJson = JSON.parse(
  readFileSync(path.join(stagedBackendRoot, 'package.json'), 'utf8')
)
delete stagedPackageJson.devDependencies
delete stagedPackageJson.scripts
writeFileSync(
  path.join(stagedBackendRoot, 'package.json'),
  `${JSON.stringify(stagedPackageJson, null, 2)}\n`
)

const metadata = {
  copiedDependencyCount: copiedPackagePaths.size,
  directDependencyCount: Object.keys(backendPackageJson.dependencies ?? {}).length,
}

writeFileSync(
  path.join(stagedBackendRoot, 'runtime-metadata.json'),
  `${JSON.stringify(metadata, null, 2)}\n`
)
