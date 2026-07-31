export enum SyncDocumentQuarantineReasonEnum {
  InvalidJson = 'invalid-json',
  InvalidDocument = 'invalid-document',
  UnsupportedFormatVersion = 'unsupported-format-version',
  WorkspaceMismatch = 'workspace-mismatch',
  LogicalKeyMismatch = 'logical-key-mismatch',
  ContentHashMismatch = 'content-hash-mismatch',
  InvalidRelationship = 'invalid-relationship',
}
