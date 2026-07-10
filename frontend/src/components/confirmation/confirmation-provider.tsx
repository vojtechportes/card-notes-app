import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmationContext } from './confirmation-context'
import type {
  ChoiceConfirmationOptions,
  ConfirmationOptions,
  ConfirmationService,
} from './types/confirmation-options'

type ConfirmRequest = {
  type: 'confirm'
  options: ConfirmationOptions
  resolve: (value: boolean) => void
}

type ChoiceRequest = {
  type: 'choice'
  options: ChoiceConfirmationOptions
  resolve: (value: string | null) => void
}

type ConfirmationRequest = ConfirmRequest | ChoiceRequest

const getChoiceButtonVariant = (destructive?: boolean) => {
  return destructive ? 'contained' : 'outlined'
}

export const ConfirmationProvider = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation()
  const [activeRequest, setActiveRequest] =
    useState<ConfirmationRequest | null>(null)
  const queuedRequestsRef = useRef<ConfirmationRequest[]>([])
  const activeRequestRef = useRef<ConfirmationRequest | null>(null)

  useEffect(() => {
    activeRequestRef.current = activeRequest
  }, [activeRequest])

  useEffect(() => {
    return () => {
      const active = activeRequestRef.current

      if (active?.type === 'confirm') {
        active.resolve(false)
      }

      if (active?.type === 'choice') {
        active.resolve(null)
      }

      queuedRequestsRef.current.forEach((request) => {
        if (request.type === 'confirm') {
          request.resolve(false)
          return
        }

        request.resolve(null)
      })
      queuedRequestsRef.current = []
    }
  }, [])

  const showNextQueuedRequest = useCallback(() => {
    setActiveRequest((currentRequest) => {
      if (currentRequest) {
        return currentRequest
      }

      return queuedRequestsRef.current.shift() ?? null
    })
  }, [])

  const enqueueRequest = useCallback(
    (request: ConfirmationRequest) => {
      queuedRequestsRef.current.push(request)
      showNextQueuedRequest()
    },
    [showNextQueuedRequest]
  )

  const closeActiveRequest = useCallback(() => {
    setActiveRequest(null)
  }, [])

  useEffect(() => {
    if (!activeRequest) {
      showNextQueuedRequest()
    }
  }, [activeRequest, showNextQueuedRequest])

  const handleCancel = useCallback(() => {
    if (!activeRequest) {
      return
    }

    if (activeRequest.type === 'confirm') {
      activeRequest.resolve(false)
    } else {
      activeRequest.resolve(null)
    }

    closeActiveRequest()
  }, [activeRequest, closeActiveRequest])

  const handleConfirm = useCallback(() => {
    if (activeRequest?.type !== 'confirm') {
      return
    }

    activeRequest.resolve(true)
    closeActiveRequest()
  }, [activeRequest, closeActiveRequest])

  const handleChoice = useCallback(
    (value: string) => {
      if (activeRequest?.type !== 'choice') {
        return
      }

      activeRequest.resolve(value)
      closeActiveRequest()
    },
    [activeRequest, closeActiveRequest]
  )

  const confirmation = useMemo<ConfirmationService>(
    () => ({
      confirm: (options) => {
        return new Promise<boolean>((resolve) => {
          enqueueRequest({
            type: 'confirm',
            options,
            resolve,
          })
        })
      },
      choose: (options) => {
        return new Promise((resolve) => {
          enqueueRequest({
            type: 'choice',
            options,
            resolve: resolve as (value: string | null) => void,
          })
        })
      },
    }),
    [enqueueRequest]
  )

  const cancelLabel =
    activeRequest?.options.cancelLabel ?? t('confirmation.actions.cancel')
  const title = activeRequest?.options.title
  const description = activeRequest?.options.description
  const confirmLabel =
    activeRequest?.type === 'confirm'
      ? (activeRequest.options.confirmLabel ??
        t('confirmation.actions.confirm'))
      : undefined
  const destructive =
    activeRequest?.type === 'confirm' &&
    activeRequest.options.variant === 'destructive'

  return (
    <ConfirmationContext.Provider value={confirmation}>
      {children}
      <Dialog
        open={Boolean(activeRequest)}
        onClose={handleCancel}
        aria-labelledby="confirmation-dialog-title"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="confirmation-dialog-title" sx={{ pr: 6 }}>
          <Typography component="span" variant="h6">
            {title}
          </Typography>
          <IconButton
            aria-label={t('confirmation.actions.close')}
            onClick={handleCancel}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers={activeRequest?.type === 'choice'}>
          {description ? (
            <DialogContentText>{description}</DialogContentText>
          ) : null}
          {activeRequest?.type === 'choice' ? (
            <Stack spacing={1.5} sx={{ mt: description ? 2 : 0 }}>
              {activeRequest.options.choices.map((choice) => (
                <Button
                  key={choice.value}
                  color={choice.destructive ? 'error' : 'primary'}
                  variant={getChoiceButtonVariant(choice.destructive)}
                  onClick={() => handleChoice(choice.value)}
                  sx={{
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    minHeight: 56,
                    px: 2,
                    py: 1.25,
                    textAlign: 'left',
                    whiteSpace: 'normal',
                  }}
                >
                  <Box>
                    <Typography component="span" fontWeight={700}>
                      {choice.label}
                    </Typography>
                    {choice.description ? (
                      <Typography
                        component="span"
                        color={
                          choice.destructive ? 'inherit' : 'text.secondary'
                        }
                        sx={{ display: 'block', mt: 0.5 }}
                        variant="body2"
                      >
                        {choice.description}
                      </Typography>
                    ) : null}
                  </Box>
                </Button>
              ))}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>{cancelLabel}</Button>
          {activeRequest?.type === 'confirm' ? (
            <Button
              color={destructive ? 'error' : 'primary'}
              onClick={handleConfirm}
              startIcon={destructive ? <DeleteOutlineIcon /> : undefined}
              variant="contained"
            >
              {confirmLabel}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </ConfirmationContext.Provider>
  )
}
