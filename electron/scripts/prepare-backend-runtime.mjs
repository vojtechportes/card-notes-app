import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const electronRoot = path.resolve(dirname, '..')
const workspaceRoot = path.resolve(electronRoot, '..')
const backendRoot = path.join(workspaceRoot, 'backend')
const backendDistPath = path.join(backendRoot, 'dist')
const backendPackagePath = path.join(backendRoot, 'package.json')
const rootNodeModulesPath = path.join(workspaceRoot, 'node_modules')
const stagedBackendRoot = path.join(electronRoot, '.backend-runtime')
const stagedBackendDistPath = path.join(stagedBackendRoot, 'dist')
const stagedBackendNodeModulesPath = path.join(stagedBackendRoot, 'node_modules')

if (!existsSync(backendDistPath)) {
  throw new Error('Backend dist output was not found. Build the backend before packaging Electron.')
}

if (!existsSync(rootNodeModulesPath)) {
  throw new Error('Root node_modules directory was not found. Install dependencies before packaging Electron.')
}

rmSync(stagedBackendRoot, { recursive: true, force: true })
mkdirSync(stagedBackendRoot, { recursive: true })
cpSync(backendDistPath, stagedBackendDistPath, { recursive: true })
copyFileSync(backendPackagePath, path.join(stagedBackendRoot, 'package.json'))
mkdirSync(stagedBackendNodeModulesPath, { recursive: true })

const backendPackageJson = JSON.parse(readFileSync(backendPackagePath, 'utf8'))
const copiedPackages = new Set()

const getPackagePath = (packageName) => {
  return path.join(rootNodeModulesPath, ...packageName.split('/'))
}

const readInstalledPackageJson = (packageName) => {
  const packagePath = getPackagePath(packageName)
  const packageJsonPath = path.join(packagePath, 'package.json')

  if (!existsSync(packageJsonPath)) {
    throw new Error(`Resolved dependency ${packageName} was not found at ${packageJsonPath}.`)
  }

  return {
    packageJson: JSON.parse(readFileSync(packageJsonPath, 'utf8')),
    packagePath,
  }
}

const getDependencyNames = (packageJson) => {
  const dependencyNames = new Set(Object.keys(packageJson.dependencies ?? {}))

  for (const dependencyName of Object.keys(packageJson.optionalDependencies ?? {})) {
    dependencyNames.add(dependencyName)
  }

  for (const dependencyName of Object.keys(packageJson.peerDependencies ?? {})) {
    const peerDependencyPath = path.join(rootNodeModulesPath, ...dependencyName.split('/'))

    if (existsSync(peerDependencyPath)) {
      dependencyNames.add(dependencyName)
    }
  }

  return [...dependencyNames]
}

const copyDependencyClosure = (packageName) => {
  if (copiedPackages.has(packageName)) {
    return
  }

  const { packageJson, packagePath } = readInstalledPackageJson(packageName)
  const destinationPath = path.join(stagedBackendNodeModulesPath, ...packageName.split('/'))

  mkdirSync(path.dirname(destinationPath), { recursive: true })
  cpSync(packagePath, destinationPath, { recursive: true })
  copiedPackages.add(packageName)

  for (const dependencyName of getDependencyNames(packageJson)) {
    copyDependencyClosure(dependencyName)
  }
}

for (const dependencyName of Object.keys(backendPackageJson.dependencies ?? {})) {
  copyDependencyClosure(dependencyName)
}

const stagedPackageJson = JSON.parse(readFileSync(path.join(stagedBackendRoot, 'package.json'), 'utf8'))
delete stagedPackageJson.devDependencies
delete stagedPackageJson.scripts
writeFileSync(
  path.join(stagedBackendRoot, 'package.json'),
  `${JSON.stringify(stagedPackageJson, null, 2)}\n`
)

const metadata = {
  copiedDependencyCount: copiedPackages.size,
  directDependencyCount: Object.keys(backendPackageJson.dependencies ?? {}).length,
}

writeFileSync(
  path.join(stagedBackendRoot, 'runtime-metadata.json'),
  `${JSON.stringify(metadata, null, 2)}\n`
)
