import { createContext } from 'react';
import type { ConfirmationService } from './types/confirmation-options';

export const ConfirmationContext = createContext<ConfirmationService | null>(
  null,
);
