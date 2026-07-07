export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ResponsiveColumns = Partial<Record<BreakpointKey, number>>;

export interface IMasonryProps {
  columns?: number | ResponsiveColumns;
  gap?: number | string;
  className?: string;
  columnClassName?: string;
  itemClassName?: string;
}
