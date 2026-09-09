import { assertMacReleaseEnvironment } from './assert-mac-release-environment.util.mjs'

assertMacReleaseEnvironment(process.env)
console.log('macOS signing and notarization configuration is present.')
