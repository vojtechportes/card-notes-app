import { XMLParser } from 'fast-xml-parser'
import type { XlsxXmlNode } from '../types/xlsx-xml-node'

const xmlParser = new XMLParser({
  attributeNamePrefix: '',
  ignoreAttributes: false,
  processEntities: false,
  removeNSPrefix: true,
})

export const parseXlsxXml = (xml: string): XlsxXmlNode => {
  const parsedXml = xmlParser.parse(xml, true) as unknown

  if (
    typeof parsedXml !== 'object' ||
    parsedXml === null ||
    Array.isArray(parsedXml)
  ) {
    return {}
  }

  return parsedXml as XlsxXmlNode
}
