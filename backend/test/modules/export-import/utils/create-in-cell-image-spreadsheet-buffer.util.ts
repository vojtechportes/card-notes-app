import { Workbook } from 'exceljs'
import JSZip from 'jszip'

interface InCellImageSpreadsheetOptions {
  malformedRichValueData?: boolean
}

export const createInCellImageSpreadsheetBuffer = async (
  options: InCellImageSpreadsheetOptions = {}
): Promise<Buffer> => {
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet('Import')
  const imageError = { error: '#VALUE!' as const }

  worksheet.addRow([
    'harmonyLink',
    'title',
    'printscreen',
    'printscreen',
    'printscreen',
  ])
  worksheet.addRow([
    'https://example.com/first',
    'First note',
    imageError,
    imageError,
    imageError,
  ])
  worksheet.addRow(['https://example.com/second', 'Second note', imageError])
  worksheet.addRow([
    'https://example.com/third',
    'Third note',
    null,
    imageError,
    imageError,
  ])

  const workbookBuffer = await workbook.xlsx.writeBuffer()
  const archive = await JSZip.loadAsync(workbookBuffer)
  const worksheetPath = 'xl/worksheets/sheet1.xml'
  const worksheetFile = archive.file(worksheetPath)

  if (!worksheetFile) {
    throw new Error('Generated worksheet XML is missing.')
  }

  let worksheetXml = await worksheetFile.async('string')

  for (const cellAddress of ['C2', 'D2', 'E2', 'D4', 'E4']) {
    worksheetXml = worksheetXml.replace(
      `<c r="${cellAddress}"`,
      `<c r="${cellAddress}" vm="1"`
    )
  }

  archive.file(worksheetPath, worksheetXml)
  archive.file(
    'xl/metadata.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:xlrd="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata"><metadataTypes count="1"><metadataType name="XLRICHVALUE"/></metadataTypes><futureMetadata name="XLRICHVALUE" count="1"><bk><extLst><ext uri="{3e2802c4-a4d2-4d8b-9148-e3be6c30e623}"><xlrd:rvb i="0"/></ext></extLst></bk></futureMetadata><valueMetadata count="1"><bk><rc t="1" v="0"/></bk></valueMetadata></metadata>'
  )
  archive.file(
    'xl/richData/rdrichvaluestructure.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><rvStructures xmlns="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata" count="1"><s t="_localImage"><k n="_rvRel:LocalImageIdentifier" t="i"/><k n="CalcOrigin" t="i"/></s></rvStructures>'
  )
  archive.file(
    'xl/richData/rdrichvalue.xml',
    options.malformedRichValueData
      ? '<rvData><rv>'
      : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><rvData xmlns="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata" count="1"><rv s="0"><v>0</v><v>5</v></rv></rvData>'
  )
  archive.file(
    'xl/richData/richValueRel.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><richValueRels xmlns="http://schemas.microsoft.com/office/spreadsheetml/2022/richvaluerel" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><rel r:id="rId1"/></richValueRels>'
  )
  archive.file(
    'xl/richData/_rels/richValueRel.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>'
  )
  archive.file(
    'xl/media/image1.png',
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64'
    )
  )

  return archive.generateAsync({
    compression: 'DEFLATE',
    type: 'nodebuffer',
  })
}
