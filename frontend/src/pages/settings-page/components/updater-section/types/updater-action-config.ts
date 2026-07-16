export interface UpdaterActionConfig {
  disabled: boolean
  isPending: boolean
  key:
    | 'check'
    | 'checkDisabled'
    | 'download'
    | 'install'
    | 'installing'
    | 'checking'
    | 'downloading'
}
