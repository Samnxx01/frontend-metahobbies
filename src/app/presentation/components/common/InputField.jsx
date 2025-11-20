// src/presentation/components/common/InputField.jsx

import React, { useState } from 'react';
import { TextField, IconButton, InputAdornment } from '@mui/material';
import { Controller } from 'react-hook-form';

import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function InputField({
    label,
    fullWidth = true,
    control,
    name,
    // Renombramos 'type' a 'inputType' para evitar conflictos de props
    type: inputType = 'text',
    ...props
}) {
    const [showPassword, setShowPassword] = useState(false);

    // Usamos el tipo original pasado, que ahora es inputType
    const isPasswordType = inputType === 'password';

    const handleClickShowPassword = () => {
        setShowPassword((prev) => !prev);
    };

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    // La variable que contendrá el tipo de campo dinámico: 'password', 'text', o el tipo original
    const dynamicType = isPasswordType && !showPassword ? 'password' : inputType;

    // Función auxiliar para renderizar el TextField
    const renderTextField = (fieldProps) => (
        <TextField
            {...fieldProps}
            {...props}

            label={label}
            fullWidth={fullWidth}
            variant="outlined"

            // 💡 SOLUCIÓN CLAVE: Pasamos el tipo dinámico calculado.
            type={dynamicType}

            InputProps={isPasswordType ? {
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                        >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                ),
            } : {}}

            sx={{
                '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                },
            }}
        />
    );


    if (control && name) {
        return (
            <Controller
                name={name}
                control={control}
                render={({ field }) => renderTextField(field)}
            />
        );
    }

    return renderTextField({});
}