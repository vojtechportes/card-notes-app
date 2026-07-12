import { ColumnTypeEnum } from '../types/column-type-enum'

export const areColumnTypesCompatible = (
  sourceType: ColumnTypeEnum,
  targetType: ColumnTypeEnum
): boolean => {
  if (sourceType === targetType) {
    return true
  }

  const isTextLike = (type: ColumnTypeEnum): boolean => {
    return type === ColumnTypeEnum.Text || type === ColumnTypeEnum.Link
  }

  return isTextLike(sourceType) && isTextLike(targetType)
}
