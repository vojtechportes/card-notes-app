import { MoreVert } from '@mui/icons-material'
import {
  Box,
  Card,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ColumnDto,
  GeneralSettingsDto,
  NoteDto,
} from '../../../../types/api'
import { getNoteCardFields } from '../../utils/get-note-card-fields.util'
import { NoteFieldValue as NoteCardFieldValue } from '../note-field-value/note-field-value'

interface NoteCardProps {
  columns: ColumnDto[]
  generalSettings: GeneralSettingsDto
  isSelected?: boolean
  note: NoteDto
  onDeleteNote?: (note: NoteDto) => void
  onEditNote?: (note: NoteDto) => void
  onOpenNoteDetail?: (note: NoteDto) => void
}

const INTERACTIVE_ELEMENT_SELECTOR =
  'a, button, input, textarea, select, [role="button"], [role="link"]'

const isInteractiveTarget = (
  target: EventTarget | null,
  currentTarget: HTMLElement
) => {
  if (!(target instanceof Element)) {
    return false
  }

  const interactiveElement = target.closest(INTERACTIVE_ELEMENT_SELECTOR)

  return interactiveElement !== null && interactiveElement !== currentTarget
}

const resolveCardAccessibleLabel = (
  fields: ReturnType<typeof getNoteCardFields>
) => {
  const firstTextValue = fields.find(
    (field) => typeof field.value === 'string' && field.value.trim().length > 0
  )

  if (firstTextValue && typeof firstTextValue.value === 'string') {
    return firstTextValue.value
  }

  return fields[0]?.title
}

export const NoteCard = ({
  columns,
  generalSettings,
  isSelected = false,
  note,
  onDeleteNote,
  onEditNote,
  onOpenNoteDetail,
}: NoteCardProps) => {
  const { t } = useTranslation()
  const [actionsAnchorElement, setActionsAnchorElement] =
    useState<HTMLElement | null>(null)
  const fields = getNoteCardFields(
    note,
    columns,
    generalSettings.cardFieldDisplayCount,
    !!generalSettings.mergeDateTimeFields,
    t('notes.fields.lastUpdatedAt')
  )
  const cardAccessibleLabel = resolveCardAccessibleLabel(fields) ?? note.id
  const canOpenDetail = Boolean(onOpenNoteDetail)
  const hasActionMenu = Boolean(onEditNote || onDeleteNote)
  const isActionsMenuOpen = Boolean(actionsAnchorElement)

  const handleOpenDetail = () => {
    onOpenNoteDetail?.(note)
  }

  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (
      !canOpenDetail ||
      isInteractiveTarget(event.target, event.currentTarget)
    ) {
      return
    }

    handleOpenDetail()
  }

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!canOpenDetail || event.target !== event.currentTarget) {
      return
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    handleOpenDetail()
  }

  return (
    <Card
      aria-label={
        canOpenDetail
          ? t('notes.card.actions.openDetailNamed', {
              label: cardAccessibleLabel,
            })
          : undefined
      }
      aria-pressed={canOpenDetail ? isSelected : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={canOpenDetail ? 'button' : undefined}
      sx={{
        borderColor: isSelected ? 'primary.main' : 'divider',
        borderWidth: isSelected ? 2 : 1,
        cursor: canOpenDetail ? 'pointer' : 'default',
        height: '100%',
        outline: 'none',
        position: 'relative',
        transition: (theme) =>
          theme.transitions.create(['border-color', 'box-shadow'], {
            duration: theme.transitions.duration.shorter,
          }),
        '&:focus-visible': canOpenDetail
          ? {
              boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.light}`,
            }
          : undefined,
        '&:hover': canOpenDetail
          ? {
              borderColor: 'primary.main',
              boxShadow: (theme) => theme.shadows[2],
            }
          : undefined,
      }}
      tabIndex={canOpenDetail ? 0 : undefined}
      variant="outlined"
    >
      {hasActionMenu && (
        <>
          <Box
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 1,
            }}
          >
            <IconButton
              aria-label={t('notes.card.actions.more')}
              onClick={(event) => {
                event.stopPropagation()
                setActionsAnchorElement(event.currentTarget)
              }}
              size="small"
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>
          <Menu
            anchorEl={actionsAnchorElement}
            onClick={(event) => {
              event.stopPropagation()
            }}
            onClose={() => {
              setActionsAnchorElement(null)
            }}
            open={isActionsMenuOpen}
          >
            {onEditNote && (
              <MenuItem
                onClick={() => {
                  setActionsAnchorElement(null)
                  onEditNote(note)
                }}
              >
                {t('notes.card.actions.edit')}
              </MenuItem>
            )}
            {onDeleteNote && (
              <MenuItem
                onClick={() => {
                  setActionsAnchorElement(null)
                  onDeleteNote(note)
                }}
                sx={{ color: 'error.main' }}
              >
                {t('notes.card.actions.delete')}
              </MenuItem>
            )}
          </Menu>
        </>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          p: 2,
          pr: hasActionMenu ? 7 : 2,
        }}
      >
        {fields.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            {t('notes.card.noVisibleFields')}
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={2}>
            {fields.map((field) => (
              <Stack key={field.columnId} spacing={1}>
                <Typography component="h3" variant="subtitle2">
                  {field.title}
                </Typography>
                <NoteCardFieldValue
                  emptyImageLabel={t('notes.card.imagePreviewUnavailable')}
                  field={field}
                  textTruncationLength={generalSettings.textTruncationLength}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Card>
  )
}
