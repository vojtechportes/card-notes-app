import SearchIcon from '@mui/icons-material/Search'
import { InputAdornment, TextField } from '@mui/material'

interface NotesSearchFieldProps {
  searchQuery: string
  label: string
  placeholder: string
  onSearchQueryChange: (searchQuery: string) => void
}

export const NotesSearchField = ({
  searchQuery,
  label,
  placeholder,
  onSearchQueryChange,
}: NotesSearchFieldProps) => {
  return (
    <TextField
      fullWidth
      label={label}
      placeholder={placeholder}
      size="small"
      value={searchQuery}
      onChange={(event) => onSearchQueryChange(event.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
      sx={{ flex: '1 1 auto', minWidth: 0 }}
    />
  )
}
