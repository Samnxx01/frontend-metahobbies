import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Controller } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InputFieldProps } from '@/types/components';

export default function InputField({
    label,
    fullWidth = true,
    control,
    name,
    type: inputType = 'text',
    placeholder,
    error = false,
    helperText,
    disabled = false,
    required = false,
    ...props
}: InputFieldProps): React.ReactElement {
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const isPasswordType = inputType === 'password';

    const handleClickShowPassword = (): void => {
        setShowPassword((prev) => !prev);
    };

    const dynamicType = isPasswordType && !showPassword ? 'password' : inputType;

    const renderInputField = (fieldProps: any) => (
        <div className={`space-y-2 ${fullWidth ? 'w-full' : ''}`}>
            {label && (
                <Label htmlFor={name} className={error ? 'text-destructive' : ''}>
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </Label>
            )}
            <div className="relative">
                <Input
                    {...fieldProps}
                    {...props}
                    id={name}
                    type={dynamicType}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`${error ? 'border-destructive focus-visible:ring-destructive' : ''} ${
                        isPasswordType ? 'pr-10' : ''
                    }`}
                />
                {isPasswordType && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={handleClickShowPassword}
                        disabled={disabled}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                            {showPassword ? 'Hide password' : 'Show password'}
                        </span>
                    </Button>
                )}
            </div>
            {helperText && (
                <p className={`text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {helperText}
                </p>
            )}
        </div>
    );

    if (control && name) {
        return (
            <Controller
                name={name}
                control={control}
                render={({ field, fieldState }) => 
                    renderInputField({
                        ...field,
                        error: fieldState.error ? true : error,
                        helperText: fieldState.error?.message || helperText
                    })
                }
            />
        );
    }

    return renderInputField({});
}