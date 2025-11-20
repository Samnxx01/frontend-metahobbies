import { TextField, InputAdornment } from '@mui/material'
import { Search } from '@mui/icons-material'

export default function SearchBar() {
    return (
        <TextField
            placeholder="Buscar productos..."
            variant="outlined"
            size="small"
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <Search color="action" />
                    </InputAdornment>
                ),
            }}
            sx={{
                width: '100%',
                maxWidth: 500,
                '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: '#f5f5f5',
                },
            }}
        />
    )
}
