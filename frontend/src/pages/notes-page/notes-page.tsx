import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Masonry } from '../../components/masonry/masonry';

const PREVIEW_CARD_KEYS = ['structure', 'search', 'images'];

export const NotesPage = () => {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h2">
          {t('notes.title')}
        </Typography>
        <Typography color="text.secondary">{t('notes.description')}</Typography>
      </Stack>
      <Masonry columns={{ xs: 1, sm: 2, md: 3 }} gap={16}>
        {PREVIEW_CARD_KEYS.map((key) => (
          <Card key={key} variant="outlined">
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                {t(`notes.previewCards.${key}.title`)}
              </Typography>
              <Typography color="text.secondary">
                {t(`notes.previewCards.${key}.description`)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Masonry>
    </Stack>
  );
};

