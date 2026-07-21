import { getContrastRatio } from '@mui/material/styles'

const darkTextColor = '#000000'
const lightTextColor = '#FFFFFF'

export const getAccessibleLabelChipTextColor = (
  backgroundColor: string
): string => {
  const darkContrast = getContrastRatio(backgroundColor, darkTextColor)
  const lightContrast = getContrastRatio(backgroundColor, lightTextColor)

  return darkContrast >= lightContrast ? darkTextColor : lightTextColor
}
