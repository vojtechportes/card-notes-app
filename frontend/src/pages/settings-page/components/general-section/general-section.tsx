import { Alert, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as yup from 'yup';
import type { GeneralSettingsDto } from '../../../../types/api';
import { createFormResolver } from '../../../../utils/create-form-resolver.util';
import { useGeneralSettingsQuery } from '../../hooks/use-general-settings-query';
import { useUpdateGeneralSettingsMutation } from '../../hooks/use-update-general-settings-mutation';
import { SettingsSection } from '../settings-section';

interface GeneralSettingsFormValues {
  cardFieldDisplayCount: string;
  textTruncationLength: string;
}

const emptyFormValues: GeneralSettingsFormValues = {
  cardFieldDisplayCount: '',
  textTruncationLength: '',
};

const mapSettingsToFormValues = (
  settings?: GeneralSettingsDto,
): GeneralSettingsFormValues => {
  if (!settings) {
    return emptyFormValues;
  }

  return {
    cardFieldDisplayCount: settings.cardFieldDisplayCount?.toString() ?? '',
    textTruncationLength: settings.textTruncationLength?.toString() ?? '',
  };
};

const isPositiveIntegerOrEmpty = (value: string | undefined) => {
  if (!value?.trim()) {
    return true;
  }

  return /^[1-9]\d*$/.test(value.trim());
};

const mapFormValuesToPayload = (values: GeneralSettingsFormValues) => {
  const cardFieldDisplayCount = values.cardFieldDisplayCount.trim();
  const textTruncationLength = values.textTruncationLength.trim();

  return {
    cardFieldDisplayCount: cardFieldDisplayCount ? Number(cardFieldDisplayCount) : null,
    textTruncationLength: textTruncationLength ? Number(textTruncationLength) : null,
  };
};

export const GeneralSection = () => {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const generalSettingsQuery = useGeneralSettingsQuery();
  const updateGeneralSettingsMutation = useUpdateGeneralSettingsMutation();

  const schema = useMemo((): yup.ObjectSchema<GeneralSettingsFormValues> => {
    const validationMessage = t('settings.general.validation.positiveInteger');

    return yup.object({
      cardFieldDisplayCount: yup
        .string()
        .defined()
        .test('positive-integer-or-empty', validationMessage, isPositiveIntegerOrEmpty),
      textTruncationLength: yup
        .string()
        .defined()
        .test('positive-integer-or-empty', validationMessage, isPositiveIntegerOrEmpty),
    });
  }, [t]);

  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<GeneralSettingsFormValues>({
    defaultValues: emptyFormValues,
    mode: 'onBlur',
    resolver: createFormResolver(schema),
  });

  const isSaving = isSubmitting || updateGeneralSettingsMutation.isPending;

  useEffect(() => {
    if (generalSettingsQuery.data) {
      reset(mapSettingsToFormValues(generalSettingsQuery.data));
      setSubmitError(null);
      setIsSaved(false);
      return;
    }

    if (!generalSettingsQuery.isLoading) {
      reset(emptyFormValues);
    }
  }, [generalSettingsQuery.data, generalSettingsQuery.isLoading, reset]);

  const handleFormSubmit = useCallback(
    async (values: GeneralSettingsFormValues) => {
      setSubmitError(null);
      setIsSaved(false);

      try {
        const updatedSettings = await updateGeneralSettingsMutation.mutateAsync(
          mapFormValuesToPayload(values),
        );

        reset(mapSettingsToFormValues(updatedSettings));
        setIsSaved(true);
      } catch {
        setSubmitError(t('settings.general.errors.submit'));
      }
    },
    [reset, t, updateGeneralSettingsMutation],
  );

  const showInitialLoadingState = generalSettingsQuery.isLoading && !generalSettingsQuery.data;
  const showInitialErrorState = generalSettingsQuery.isError && !generalSettingsQuery.data;

  return (
    <SettingsSection
      description={t('settings.sections.general.description')}
      title={t('settings.sections.general.title')}
    >
      {showInitialLoadingState ? (
        <Stack alignItems="center" direction="row" spacing={1.5}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">
            {t('settings.general.status.loading')}
          </Typography>
        </Stack>
      ) : showInitialErrorState ? (
        <Alert severity="error">{t('settings.general.status.error')}</Alert>
      ) : (
        <Stack component="form" noValidate onSubmit={handleSubmit(handleFormSubmit)} spacing={2}>
          <Typography color="text.secondary" variant="body2">
            {t('settings.general.hints.optional')}
          </Typography>

          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
          {isSaved ? <Alert severity="success">{t('settings.general.status.saved')}</Alert> : null}

          <Controller
            control={control}
            name="textTruncationLength"
            render={({ field }) => (
              <TextField
                error={!!errors.textTruncationLength}
                fullWidth
                helperText={
                  errors.textTruncationLength?.message ?? t('settings.general.hints.textTruncationLength')
                }
                inputRef={field.ref}
                label={t('settings.general.fields.textTruncationLength')}
                name={field.name}
                onBlur={field.onBlur}
                onChange={(event) => {
                  setSubmitError(null);
                  setIsSaved(false);
                  field.onChange(event);
                }}
                slotProps={{
                  htmlInput: {
                    inputMode: 'numeric',
                  },
                }}
                value={field.value}
              />
            )}
          />

          <Controller
            control={control}
            name="cardFieldDisplayCount"
            render={({ field }) => (
              <TextField
                error={!!errors.cardFieldDisplayCount}
                fullWidth
                helperText={
                  errors.cardFieldDisplayCount?.message ?? t('settings.general.hints.cardFieldDisplayCount')
                }
                inputRef={field.ref}
                label={t('settings.general.fields.cardFieldDisplayCount')}
                name={field.name}
                onBlur={field.onBlur}
                onChange={(event) => {
                  setSubmitError(null);
                  setIsSaved(false);
                  field.onChange(event);
                }}
                slotProps={{
                  htmlInput: {
                    inputMode: 'numeric',
                  },
                }}
                value={field.value}
              />
            )}
          />

          <Stack
            alignItems={{ sm: 'center', xs: 'stretch' }}
            direction={{ sm: 'row', xs: 'column' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Typography color="text.secondary" variant="body2">
              {t('settings.general.summary')}
            </Typography>
            <Button disabled={isSaving || !isDirty} type="submit" variant="contained">
              {isSaving
                ? t('settings.general.actions.saving')
                : t('settings.general.actions.save')}
            </Button>
          </Stack>
        </Stack>
      )}
    </SettingsSection>
  );
};
