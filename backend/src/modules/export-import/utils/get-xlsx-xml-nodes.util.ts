import type { XlsxXmlNode } from '../types/xlsx-xml-node'

export const getXlsxXmlNodes = (value: unknown): XlsxXmlNode[] => {
  const values = Array.isArray(value) ? value : [value]

  return values.filter(
    (item): item is XlsxXmlNode =>
      typeof item === 'object' && item !== null && !Array.isArray(item)
  )
}
