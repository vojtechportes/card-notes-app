export type ConfirmationVariant = 'default' | 'destructive';

export type ConfirmationOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
};

export type ConfirmationChoice<TValue extends string = string> = {
  value: TValue;
  label: string;
  description?: string;
  destructive?: boolean;
};

export type ChoiceConfirmationOptions<TValue extends string = string> = {
  title: string;
  description?: string;
  cancelLabel?: string;
  choices: Array<ConfirmationChoice<TValue>>;
};

export type ConfirmationService = {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  choose: <TValue extends string = string>(
    options: ChoiceConfirmationOptions<TValue>,
  ) => Promise<TValue | null>;
};
