import { SxProps, Theme, buttonBaseClasses } from '@mui/material';
import { gridClasses } from '@mui/x-data-grid';
import { transparentize, mix } from 'polished';

export const dataGridStyles: SxProps<Theme> = {
  border: 0,
  width: '100%',
  display: 'grid',
  gridTemplateRows: 'auto 1f auto',

  // Action column separator
  [`.MuiSeparatorHidden .${gridClasses.columnSeparator}`]: {
    display: 'none',
  },

  // Column headers
  [`.${gridClasses.columnHeaders}`]: {
    // Column header
    "[role='row'] > :nth-of-type(2)": { pl: 3 },
    [`.${gridClasses['columnHeader--last']}`]: { pr: 3 },
    [`.${gridClasses.columnHeader}`]: {
      [`.${gridClasses.columnHeaderTitle}`]: {
        color: ({ palette }) =>
          palette.mode === 'light' ? palette.grey[700] : palette.common.white,
      },
      [`.${buttonBaseClasses.root}`]: {
        color: ({ palette }) => palette.primary.main,
      },
    },
    [`.${gridClasses.columnHeaderCheckbox}`]: {
      "&[aria-colindex='1']": {
        pl: 1,
      },
    },
  },

  [`.${gridClasses['cell']}`]: {
    display: 'flex',
    alignItems: 'center',
  },

  // Right pinned columns header
  [`.${gridClasses['columnHeader--pinnedRight']}`]: {
    borderLeft: 'none',
    background: ({ palette }) =>
      palette.mode === 'light'
        ? palette.common.white
        : palette.background.default,
  },

  // Right pinned columns
  [`.${gridClasses['cell--pinnedRight']}`]: {
    borderLeft: 'none',
    pl: 1.5,
  },

  // Rows
  [`.${gridClasses['row']}`]: {
    '&.clickable': {
      [`.${gridClasses['cell']}:not(.actions)`]: {
        cursor: 'pointer',
      },
    },

    '&.Mui-active': {
      backgroundColor: ({ palette }) =>
        `${transparentize(0.88, palette.primary.main)} !important`,

      '&.Mui-active': {
        [`.${gridClasses['cell--pinnedRight']}`]: {
          background: ({ palette }) =>
            `${mix(
              0.12,
              palette.primary.main,
              palette.background.default,
            )} !important`,
        },
      },

      [`.${gridClasses['cell']}`]: {
        "&[aria-colindex='1']": {
          pl: 2.5,
          borderLeft: ({ palette }) => `4px solid ${palette.primary.main}`,
        },
      },
    },
    '&.Mui-active:hover': {
      [`.${gridClasses['cell--pinnedRight']}`]: {
        background: ({ palette }) =>
          `${mix(
            0.12,
            palette.primary.main,
            palette.background.default,
          )} !important`,
      },
    },
    '&.Mui-selected': {
      backgroundColor: 'initial',
      [`.${gridClasses['cell--pinnedRight']}`]: {
        background: ({ palette }) => `${palette.common.white} !important`,
      },
    },
    '&.Mui-selected:hover': {
      backgroundColor: ({ palette }) =>
        `${mix(
          0.12,
          palette.primary.main,
          palette.background.default,
        )} !important`,
      [`.${gridClasses['cell--pinnedRight']}`]: {
        background: ({ palette }) =>
          `${mix(
            0.12,
            palette.primary.main,
            palette.background.default,
          )} !important`,
      },
    },

    // Cells
    [`.${gridClasses['cell']}`]: {
      '&:focus': {
        outline: 'none',
      },
      "&[aria-colindex='1']": {
        pl: 3,
      },
      '&:last-child': {
        pr: 3,
      },
    },
  },

  //cellCheckboxes
  [`.${gridClasses['cellCheckbox']}`]: {
    "&[aria-colindex='1']": {
      pr: 2,
    },
  },
};
