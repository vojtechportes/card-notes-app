import {
  Box,
  type SxProps,
  Typography,
  useMediaQuery,
  useTheme,
  type Theme,
} from '@mui/material'
import { useMemo, type FC, type PropsWithChildren, type ReactNode } from 'react'

export type DetailContentItemProps = PropsWithChildren<{
  label: ReactNode
  sx?: SxProps<Theme>
  highlighted?: boolean
  canCopy?: boolean
}>

export const DetailContentItem: FC<DetailContentItemProps> = ({
  children,
  label,
  sx,
  highlighted,
}) => {
  const { breakpoints } = useTheme()
  const upSm = useMediaQuery(breakpoints.up('sm'))

  const isChildrenStringOrNumber = useMemo(
    () =>
      (typeof children === 'string' && Boolean(children.length)) ||
      typeof children === 'number',
    [children]
  )

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: upSm ? 'minmax(200px, 1fr) 2fr' : undefined,
        gap: upSm ? 2 : 0,
        mb: upSm ? 1 : 1.5,
        alignItems: 'center',
        ...sx,
      }}
      data-test-name="detail-item"
      data-test-value={typeof label === 'string' ? label : undefined}
    >
      <Typography
        component="h3"
        sx={{ lineBreak: 'auto' }}
        variant="subtitle2"
      >
        {label}
      </Typography>
      <Box sx={{ lineBreak: 'anywhere' }}>
        {(isChildrenStringOrNumber ? (
          <Typography sx={highlighted ? { fontWeight: 'bold' } : undefined}>
            {children}
          </Typography>
        ) : (
          children
        )) || <Typography>-</Typography>}
      </Box>
    </Box>
  )
}
