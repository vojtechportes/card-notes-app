import JSZip from 'jszip'
import type { NoteImageValue } from '../../notes/types/note-value'
import { createNoteImageValueFromSpreadsheetMedia } from './create-note-image-value-from-spreadsheet-media.util'
import { getXlsxXmlNodes } from './get-xlsx-xml-nodes.util'
import { normalizeXlsxPackagePath } from './normalize-xlsx-package-path.util'
import { parseXlsxXml } from './parse-xlsx-xml.util'
import { resolveXlsxFirstWorksheetPath } from './resolve-xlsx-first-worksheet-path.util'

const metadataPath = 'xl/metadata.xml'
const richValueDataPath = 'xl/richData/rdrichvalue.xml'
const richValueRelationshipsPath = 'xl/richData/richValueRel.xml'
const richValueRelationshipLinksPath = 'xl/richData/_rels/richValueRel.xml.rels'
const richValueStructuresPath = 'xl/richData/rdrichvaluestructure.xml'
const localImageIdentifierKey = '_rvRel:LocalImageIdentifier'

export const resolveXlsxInCellImages = async (
  buffer: Buffer,
  candidateCellAddresses: ReadonlySet<string>
): Promise<Map<string, NoteImageValue>> => {
  const imagesByCellAddress = new Map<string, NoteImageValue>()
  const archive = await JSZip.loadAsync(buffer)
  const worksheetPath = await resolveXlsxFirstWorksheetPath(archive)

  if (!worksheetPath) {
    return imagesByCellAddress
  }

  const worksheetFile = archive.file(worksheetPath)
  const metadataFile = archive.file(metadataPath)
  const richValueDataFile = archive.file(richValueDataPath)
  const richValueRelationshipsFile = archive.file(richValueRelationshipsPath)
  const richValueRelationshipLinksFile = archive.file(
    richValueRelationshipLinksPath
  )
  const richValueStructuresFile = archive.file(richValueStructuresPath)

  if (
    !worksheetFile ||
    !metadataFile ||
    !richValueDataFile ||
    !richValueRelationshipsFile ||
    !richValueRelationshipLinksFile ||
    !richValueStructuresFile
  ) {
    return imagesByCellAddress
  }

  const [
    worksheetXml,
    metadataXml,
    richValueDataXml,
    richValueRelationshipsXml,
    richValueRelationshipLinksXml,
    richValueStructuresXml,
  ] = await Promise.all([
    worksheetFile.async('string'),
    metadataFile.async('string'),
    richValueDataFile.async('string'),
    richValueRelationshipsFile.async('string'),
    richValueRelationshipLinksFile.async('string'),
    richValueStructuresFile.async('string'),
  ])

  const worksheet = parseXlsxXml(worksheetXml)
  const worksheetRoot = getXlsxXmlNodes(worksheet.worksheet)[0]
  const sheetData = getXlsxXmlNodes(worksheetRoot?.sheetData)[0]
  const cells = getXlsxXmlNodes(sheetData?.row).flatMap((row) =>
    getXlsxXmlNodes(row.c)
  )

  const metadata = parseXlsxXml(metadataXml)
  const metadataRoot = getXlsxXmlNodes(metadata.metadata)[0]
  const metadataTypesRoot = getXlsxXmlNodes(metadataRoot?.metadataTypes)[0]
  const metadataTypes = getXlsxXmlNodes(metadataTypesRoot?.metadataType)
  const valueMetadataRoot = getXlsxXmlNodes(metadataRoot?.valueMetadata)[0]
  const valueMetadataRecords = getXlsxXmlNodes(valueMetadataRoot?.bk)
  const richValueFutureMetadata = getXlsxXmlNodes(
    metadataRoot?.futureMetadata
  ).find((futureMetadata) => futureMetadata.name === 'XLRICHVALUE')
  const richValueMetadataRecords = getXlsxXmlNodes(richValueFutureMetadata?.bk)

  const richValueData = parseXlsxXml(richValueDataXml)
  const richValueDataRoot = getXlsxXmlNodes(richValueData.rvData)[0]
  const richValues = getXlsxXmlNodes(richValueDataRoot?.rv)

  const richValueStructures = parseXlsxXml(richValueStructuresXml)
  const richValueStructuresRoot = getXlsxXmlNodes(
    richValueStructures.rvStructures
  )[0]
  const structures = getXlsxXmlNodes(richValueStructuresRoot?.s)

  const richValueRelationships = parseXlsxXml(richValueRelationshipsXml)
  const richValueRelationshipsRoot = getXlsxXmlNodes(
    richValueRelationships.richValueRels
  )[0]
  const richValueRelationshipEntries = getXlsxXmlNodes(
    richValueRelationshipsRoot?.rel
  )

  const richValueRelationshipLinks = parseXlsxXml(richValueRelationshipLinksXml)
  const richValueRelationshipLinksRoot = getXlsxXmlNodes(
    richValueRelationshipLinks.Relationships
  )[0]
  const relationshipLinks = getXlsxXmlNodes(
    richValueRelationshipLinksRoot?.Relationship
  )
  const imageCache = new Map<string, NoteImageValue | null>()

  for (const cell of cells) {
    const cellAddress = cell.r
    const valueMetadataIndex = Number(cell.vm) - 1

    if (
      typeof cellAddress !== 'string' ||
      !candidateCellAddresses.has(cellAddress) ||
      !Number.isInteger(valueMetadataIndex) ||
      valueMetadataIndex < 0
    ) {
      continue
    }

    const valueMetadataRecord = valueMetadataRecords[valueMetadataIndex]
    const metadataReference = getXlsxXmlNodes(valueMetadataRecord?.rc)[0]
    const metadataTypeIndex = Number(metadataReference?.t) - 1
    const futureMetadataIndex = Number(metadataReference?.v)

    if (
      metadataTypes[metadataTypeIndex]?.name !== 'XLRICHVALUE' ||
      !Number.isInteger(futureMetadataIndex) ||
      futureMetadataIndex < 0
    ) {
      continue
    }

    const richValueMetadataRecord =
      richValueMetadataRecords[futureMetadataIndex]
    const richValueBlock = getXlsxXmlNodes(
      getXlsxXmlNodes(
        getXlsxXmlNodes(richValueMetadataRecord?.extLst)[0]?.ext
      )[0]?.rvb
    )[0]
    const richValueIndex = Number(richValueBlock?.i)
    const richValue = richValues[richValueIndex]
    const structureIndex = Number(richValue?.s)
    const structure = structures[structureIndex]
    const structureKeys = getXlsxXmlNodes(structure?.k)
    const localImageValueIndex = structureKeys.findIndex(
      (key) => key.n === localImageIdentifierKey
    )
    const richValueItems = Array.isArray(richValue?.v)
      ? richValue.v
      : [richValue?.v]
    const relationshipIndex = Number(richValueItems[localImageValueIndex])
    const relationshipId = richValueRelationshipEntries[relationshipIndex]?.id

    if (
      localImageValueIndex < 0 ||
      !Number.isInteger(relationshipIndex) ||
      relationshipIndex < 0 ||
      typeof relationshipId !== 'string'
    ) {
      continue
    }

    const relationshipLink = relationshipLinks.find(
      (relationship) => relationship.Id === relationshipId
    )
    const relationshipTarget = relationshipLink?.Target

    if (typeof relationshipTarget !== 'string') {
      continue
    }

    const mediaPath = normalizeXlsxPackagePath(
      richValueRelationshipsPath,
      relationshipTarget
    )
    let imageValue = imageCache.get(mediaPath)

    if (imageValue === undefined) {
      const mediaFile = archive.file(mediaPath)
      const mediaBuffer = mediaFile ? await mediaFile.async('nodebuffer') : null

      imageValue = mediaBuffer
        ? createNoteImageValueFromSpreadsheetMedia(mediaPath, mediaBuffer)
        : null
      imageCache.set(mediaPath, imageValue)
    }

    if (imageValue) {
      imagesByCellAddress.set(cellAddress, imageValue)
    }
  }

  return imagesByCellAddress
}
