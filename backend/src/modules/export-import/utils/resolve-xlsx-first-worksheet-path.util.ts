import type JSZip from 'jszip'
import { getXlsxXmlNodes } from './get-xlsx-xml-nodes.util'
import { normalizeXlsxPackagePath } from './normalize-xlsx-package-path.util'
import { parseXlsxXml } from './parse-xlsx-xml.util'

const workbookPath = 'xl/workbook.xml'
const workbookRelationshipsPath = 'xl/_rels/workbook.xml.rels'

export const resolveXlsxFirstWorksheetPath = async (
  archive: JSZip
): Promise<string | null> => {
  const workbookFile = archive.file(workbookPath)
  const relationshipsFile = archive.file(workbookRelationshipsPath)

  if (!workbookFile || !relationshipsFile) {
    return null
  }

  const workbook = parseXlsxXml(await workbookFile.async('string'))
  const workbookRoot = getXlsxXmlNodes(workbook.workbook)[0]
  const sheets = getXlsxXmlNodes(workbookRoot?.sheets)
  const firstSheet = getXlsxXmlNodes(sheets[0]?.sheet)[0]
  const relationshipId = firstSheet?.id

  if (typeof relationshipId !== 'string') {
    return null
  }

  const relationships = parseXlsxXml(await relationshipsFile.async('string'))
  const relationshipsRoot = getXlsxXmlNodes(relationships.Relationships)[0]
  const worksheetRelationship = getXlsxXmlNodes(
    relationshipsRoot?.Relationship
  ).find(
    (relationship) =>
      relationship.Id === relationshipId &&
      typeof relationship.Target === 'string'
  )

  if (typeof worksheetRelationship?.Target !== 'string') {
    return null
  }

  return normalizeXlsxPackagePath(workbookPath, worksheetRelationship.Target)
}
