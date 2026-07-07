export interface NoteImageValue {
  fileName?: string;
  mimeType?: string;
  size?: number;
  dataUrl?: string;
  path?: string;
  url?: string;
  altText?: string;
  width?: number;
  height?: number;
}

export type NoteValue = string | number | NoteImageValue;

export type NoteValues = Record<string, NoteValue>;

export type NoteValuePatch = Record<string, NoteValue | null>;
