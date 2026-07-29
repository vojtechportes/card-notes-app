import type { Workbook } from 'exceljs'
import { ColumnTypeEnum } from '../../settings/types/column-type-enum'
import type { NoteColumn } from '../../settings/types/note-column'

export const getXlsxInCellImageCandidateAddresses = (
  worksheet: Workbook['worksheets'][number],
  mappedColumnsByIndex: ReadonlyMap<number, NoteColumn>
): Set<string> => {
  const candidateAddresses = new Set<string>()

  for (const [columnIndex, column] of mappedColumnsByIndex.entries()) {
    if (column.type !== ColumnTypeEnum.Image) {
      continue
    }

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const cell = worksheet.getRow(rowNumber).getCell(columnIndex)

      if (
        typeof cell.value === 'object' &&
        cell.value !== null &&
        'error' in cell.value
      ) {
        candidateAddresses.add(cell.address)
      }
    }
  }

  return candidateAddresses
}
