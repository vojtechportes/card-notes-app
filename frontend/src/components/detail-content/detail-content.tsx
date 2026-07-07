import { Box, type SxProps, type Theme, useTheme } from '@mui/material';
import {
  Children,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type MouseEvent,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { DetailContentContainerContext } from './components/detail-content-container-provider';

const drawerWidth = 248;
const maxItemsPerColumn = 5;
const maxItemsPerColumnFullHeight = 10;

export type DetailContentAction = 'edit';

export type DetailContentProps = PropsWithChildren<{
  id?: string | number;
  actions?: DetailContentAction[];
  onActionClick?: (
    event: MouseEvent<HTMLButtonElement>,
    action: DetailContentAction,
    id: string | number,
  ) => void;
  sx?: SxProps<Theme>;
  className?: string;
  isScrollable?: boolean;
  transformsAtFullWidth?: boolean;
  maxItemsPerColumn?: number;
  maxItemsPerColumnFullHeight?: number;
}>;

export const DetailContent: FC<DetailContentProps> = ({
  children,
  sx,
  className,
  isScrollable = false,
  transformsAtFullWidth = true,
  maxItemsPerColumn: initialMaxItemsPerColumn = maxItemsPerColumn,
  maxItemsPerColumnFullHeight:
    initialMaxItemsPerColumnFullHeight = maxItemsPerColumnFullHeight,
}) => {
  const [width, setWidth] = useState(drawerWidth);
  const containerRef = useRef<HTMLElement | null>(null);
  const { breakpoints } = useTheme();
  const { fullHeight } = useContext(DetailContentContainerContext);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const containerResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    containerResizeObserver.observe(containerRef.current);

    return () => {
      containerResizeObserver.disconnect();
    };
  }, []);

  const columnsCount = useMemo(() => {
    if (width >= breakpoints.values.lg) {
      return 3;
    }

    if (width >= breakpoints.values.md) {
      return 2;
    }

    return 1;
  }, [breakpoints, width]);

  const resolvedMaxItemsPerColumn = fullHeight
    ? initialMaxItemsPerColumnFullHeight
    : initialMaxItemsPerColumn;

  const formattedChildren = useMemo(() => {
    const childrenArray = Children.toArray(children);
    const childrenCount = childrenArray.length;

    if (
      !transformsAtFullWidth ||
      childrenCount <= resolvedMaxItemsPerColumn ||
      columnsCount <= 1
    ) {
      return children;
    }

    let firstColumn: ReactNode[];
    let secondColumn: ReactNode[];
    let thirdColumn: ReactNode[];

    if (childrenCount <= resolvedMaxItemsPerColumn * columnsCount) {
      firstColumn = childrenArray.slice(
        0,
        Math.min(childrenCount, resolvedMaxItemsPerColumn),
      );
      secondColumn = childrenArray.slice(
        firstColumn.length,
        Math.min(firstColumn.length + resolvedMaxItemsPerColumn, childrenCount),
      );
      thirdColumn = childrenArray.slice(
        secondColumn.length + firstColumn.length,
      );
    } else {
      const baseSize = Math.floor(childrenCount / columnsCount);
      const remainder = childrenCount % columnsCount;

      firstColumn = childrenArray.slice(0, baseSize + (remainder > 0 ? 1 : 0));
      secondColumn = childrenArray.slice(
        firstColumn.length,
        firstColumn.length + baseSize + (remainder > 1 ? 1 : 0),
      );
      thirdColumn = childrenArray.slice(firstColumn.length + secondColumn.length);
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `1fr auto 1fr ${
            columnsCount === 3 ? 'auto 1fr' : ''
          }`,
        }}
        data-test-name="detail-content"
      >
        <Box>
          {firstColumn.map((item, index) => (
            <Fragment key={index}>{item}</Fragment>
          ))}
        </Box>
        <Box sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, mx: 4 }} />
        <Box>
          {secondColumn.map((item, index) => (
            <Fragment key={index}>{item}</Fragment>
          ))}
        </Box>
        {thirdColumn.length > 0 ? (
          <>
            <Box
              sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, mx: 4 }}
            />
            <Box>
              {thirdColumn.map((item, index) => (
                <Fragment key={index}>{item}</Fragment>
              ))}
            </Box>
          </>
        ) : (
          <>
            <Box />
            <Box />
          </>
        )}
      </Box>
    );
  }, [children, transformsAtFullWidth, resolvedMaxItemsPerColumn, columnsCount]);

  const scrollableStyles: SxProps<Theme> =
    isScrollable && width >= breakpoints.values.md
      ? {
          maxHeight: '470px',
          overflowY: 'auto',
        }
      : {};

  const fullWidthScrollableStyles: SxProps<Theme> =
    columnsCount === 3 && transformsAtFullWidth && width >= breakpoints.values.lg
      ? {
          maxHeight: fullHeight ? undefined : '320px',
          overflowY: 'auto',
        }
      : {};

  return (
    <Box
      ref={containerRef}
      sx={{
        ...scrollableStyles,
        ...fullWidthScrollableStyles,
        padding: 3,
        ...sx,
      }}
      className={className}
    >
      <Box>{formattedChildren}</Box>
    </Box>
  );
};








