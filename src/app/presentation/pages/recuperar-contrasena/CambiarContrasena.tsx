import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { resetPassword } from '../../../services/authService';
import { Loader2 } from 'lucide-react';

export default function CambiarContrasena() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!correo || !password || !confirmPassword) {
            toast.error('Por favor completa todos los campos.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (!token) {
            toast.error('Token de recuperación no válido o ausente.');
            return;
        }

        setLoading(true);
        try {
            const response = await resetPassword(correo, password, token);
            toast.success(response.msg || 'Contraseña actualizada correctamente.');
            setTimeout(() => navigate('/login'), 1500);
        } catch (error) {
            toast.error((error as Error).message || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background px-4">
            <Card className="w-full max-w-md shadow-lg border-border">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-foreground">Cambiar Contraseña</CardTitle>
                    <CardDescription>Ingresa tu correo electrónico y tu nueva contraseña.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="correo" className="text-foreground">
                                Correo Electrónico
                            </Label>
                            <Input
                                id="correo"
                                type="email"
                                placeholder="tu@correo.com"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-foreground">
                                Nueva Contraseña
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-foreground">
                                Confirmar Contraseña
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Actualizando...
                                </>
                            ) : (
                                'Actualizar Contraseña'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
