import { useContext } from 'react'
import { ConfirmationContext } from './confirmation-context'

export const useConfirmation = () => {
  const confirmation = useContext(ConfirmationContext)

  if (!confirmation) {
    throw new Error('useConfirmation must be used within ConfirmationProvider.')
  }

  return confirmation
}
