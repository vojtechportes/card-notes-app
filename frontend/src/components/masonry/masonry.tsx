import {
  type FC,
  type PropsWithChildren,
  type ReactNode,
  Children,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Box from '@mui/material/Box';
import { normalizeSize } from './utils/normalize-size.util';
import { type BreakpointKey, type IMasonryProps } from './types';
import { getColumnCount } from './utils/get-column-count.util';
import { getBreakpoint } from './utils/get-breakpoint.util';
import { getItemKey } from './utils/get-item-key.util';

export const Masonry: FC<PropsWithChildren<IMasonryProps>> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 8,
  className,
  columnClassName,
  itemClassName,
}) => {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey | undefined>();
  const [columnCount, setColumnCount] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return typeof columns === 'number' ? columns : (columns.xs ?? 1);
    }

    return getColumnCount(columns, window.innerWidth);
  });

  useEffect(() => {
    const updateColumnCount = (): void => {
      setColumnCount(getColumnCount(columns, window.innerWidth));
      setBreakpoint(getBreakpoint(columns, window.innerWidth));
    };

    updateColumnCount();

    window.addEventListener('resize', updateColumnCount);

    return () => {
      window.removeEventListener('resize', updateColumnCount);
    };
  }, [columns]);

  const childArray = useMemo(() => Children.toArray(children), [children]);

  const distributedChildren = useMemo(() => {
    const nextColumns = Array.from(
      { length: columnCount },
      () => [] as ReactNode[],
    );

    childArray.forEach((child, index) => {
      nextColumns[index % columnCount]?.push(child);
    });

    return nextColumns;
  }, [childArray, columnCount]);

  const resolvedGap = normalizeSize(gap);

  return (
    <Box
      className={className}
      sx={{
        alignItems: 'flex-start',
        display: 'flex',
        gap: resolvedGap,
        width: '100%',
        ...(breakpoint === 'xs' && {
          margin: 'auto',
          maxWidth: 380,
        }),
      }}
    >
      {distributedChildren.map((columnItems, columnIndex) => (
        <Box
          key={columnIndex}
          className={columnClassName}
          sx={{
            display: 'flex',
            flex: '1 1 0',
            flexDirection: 'column',
            gap: resolvedGap,
            minWidth: 0,
          }}
        >
          {columnItems.map((child, itemIndex) => (
            <Box
              key={getItemKey(child, itemIndex)}
              className={itemClassName}
              sx={{ width: '100%' }}
            >
              {child}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};