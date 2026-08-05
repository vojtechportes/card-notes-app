import {
  type FC,
  type PropsWithChildren,
  Children,
  useEffect,
  useState,
} from 'react'
import Box from '@mui/material/Box'
import { normalizeSize } from './utils/normalize-size.util'
import { type IMasonryProps } from './types'
import { getColumnCount } from './utils/get-column-count.util'
import { getItemKey } from './utils/get-item-key.util'

export const Masonry: FC<PropsWithChildren<IMasonryProps>> = ({
  children,
  columns = { xs: 1, sm: 1, md: 2, lg: 3 },
  gap = 8,
  className,
  itemClassName,
}) => {
  const [columnCount, setColumnCount] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return typeof columns === 'number' ? columns : (columns.xs ?? 1)
    }

    return getColumnCount(columns, window.innerWidth)
  })

  useEffect(() => {
    const updateColumnCount = (): void => {
      setColumnCount(getColumnCount(columns, window.innerWidth))
    }

    updateColumnCount()

    window.addEventListener('resize', updateColumnCount)

    return () => {
      window.removeEventListener('resize', updateColumnCount)
    }
  }, [columns])

  const childArray = Children.toArray(children)
  const resolvedGap = normalizeSize(gap)

  return (
    <Box
      className={className}
      sx={{
        columnCount,
        columnGap: resolvedGap,
        width: '100%',
      }}
    >
      {childArray.map((child, index) => (
        <Box
          key={getItemKey(child, index)}
          className={itemClassName}
          sx={{
            breakInside: 'avoid',
            display: 'inline-block',
            marginBottom: resolvedGap,
            verticalAlign: 'top',
            width: '100%',
          }}
        >
          {child}
        </Box>
      ))}
    </Box>
  )
}
