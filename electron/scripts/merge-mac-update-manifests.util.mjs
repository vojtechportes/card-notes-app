export const mergeMacUpdateManifests = (manifests) => {
  const expectedArchitectures = ['x64', 'arm64']

  if (!Array.isArray(manifests) || manifests.length !== 2) {
    throw new Error('Exactly two macOS updater manifests are required.')
  }

  const versions = new Set(manifests.map((manifest) => manifest?.version))

  if (versions.size !== 1 || versions.has(undefined)) {
    throw new Error('macOS updater manifests must have one matching version.')
  }

  const files = expectedArchitectures.map((architecture) => {
    const matches = manifests
      .flatMap((manifest) => manifest.files ?? [])
      .filter(
        (file) =>
          typeof file?.url === 'string' &&
          file.url.endsWith('.zip') &&
          file.url.includes(`-${architecture}.zip`)
      )

    if (matches.length !== 1) {
      throw new Error(
        `Expected exactly one ${architecture} macOS ZIP updater entry.`
      )
    }

    const [file] = matches

    if (
      typeof file.sha512 !== 'string' ||
      file.sha512.length === 0 ||
      !Number.isSafeInteger(file.size) ||
      file.size <= 0
    ) {
      throw new Error(
        `The ${architecture} macOS ZIP updater entry is incomplete.`
      )
    }

    return {
      url: file.url,
      sha512: file.sha512,
      size: file.size,
    }
  })
  const primaryFile = files[0]
  const releaseDate = manifests
    .map((manifest) => manifest.releaseDate)
    .filter(Boolean)
    .sort()
    .at(-1)

  return {
    version: [...versions][0],
    files,
    path: primaryFile.url,
    sha512: primaryFile.sha512,
    releaseDate,
  }
}
