import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Box, ListItemText, MenuItem, Popover } from '@mui/material'
import {
  type MouseEvent,
  type MouseEventHandler,
  useCallback,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { BackgroundEnumDto } from '../../../../types/api'
import { getNoteBackgroundColor } from '../../utils/get-note-background-color.util'
import { NoteBackgroundSwatch } from './note-background-swatch'

interface NoteBackgroundMenuItemProps {
  background: BackgroundEnumDto | null
  onClick?: MouseEventHandler<HTMLElement>
  onSelect: (background: BackgroundEnumDto) => void
}

const backgroundOptions: BackgroundEnumDto[] = [
  'CREAM',
  'LEMON',
  'LIME',
  'PEACH',
  'MAUVE',
  'SKY',
  'FLESH',
  'VERDE',
  'ROUGE',
  'TEAL',
  'OCHRE',
  'WHITE',
  'SILVER',
]

export const NoteBackgroundMenuItem = ({
  background,
  onClick,
  onSelect,
}: NoteBackgroundMenuItemProps) => {
  const { t } = useTranslation()
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null)
  const selectedBackground = background ?? 'WHITE'

  const handleSelect = useCallback(
    (event: MouseEvent<HTMLElement>, value: BackgroundEnumDto) => {
      onSelect(value)
      setAnchorElement(null)
      onClick?.(event)
    },
    [onClick, onSelect]
  )

  return (
    <>
      <MenuItem
        aria-expanded={Boolean(anchorElement)}
        aria-haspopup="dialog"
        onClick={(event) => {
          setAnchorElement(event.currentTarget)
        }}
      >
        <ListItemText>{t('notes.background.actions.open')}</ListItemText>
        <ChevronRightIcon fontSize="small" />
      </MenuItem>
      <Popover
        anchorEl={anchorElement}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        onClick={(event) => {
          event.stopPropagation()
        }}
        onClose={() => {
          setAnchorElement(null)
        }}
        open={Boolean(anchorElement)}
        slotProps={{
          paper: {
            'aria-label': t('notes.background.title'),
            role: 'dialog',
            sx: { p: 1.5 },
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
      >
        <Box
          aria-label={t('notes.background.colorsLabel')}
          role="group"
          sx={{
            display: 'grid',
            gap: 0.75,
            gridTemplateColumns: 'repeat(7, auto)',
          }}
        >
          {backgroundOptions.map((value) => (
            <NoteBackgroundSwatch
              key={value}
              color={getNoteBackgroundColor(value)}
              isSelected={selectedBackground === value}
              label={t(`notes.background.colors.${value.toLowerCase()}`)}
              onSelect={(event) => {
                handleSelect(event, value)
              }}
            />
          ))}
        </Box>
      </Popover>
    </>
  )
}
