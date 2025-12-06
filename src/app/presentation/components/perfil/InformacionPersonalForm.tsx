import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserIcon, Edit, Save, X } from 'lucide-react';
import { toast } from 'react-toastify';
import type { User } from '../../../../types/common';

interface InformacionPersonalFormProps {
    localUser: User;
    onUserUpdate: (updatedUser: User) => void;
}

export default function InformacionPersonalForm({
    localUser,
    onUserUpdate,
}: InformacionPersonalFormProps) {
    const [isEditing, setIsEditing] = useState(false);
    const nombreRef = React.useRef<HTMLInputElement>(null);
    const correoRef = React.useRef<HTMLInputElement>(null);
    const telefonoRef = React.useRef<HTMLInputElement>(null);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        const nombre = nombreRef.current?.value || '';
        const correo = correoRef.current?.value || '';
        const telefono = telefonoRef.current?.value || '';
        
        onUserUpdate({
            ...localUser,
            nombre,
            correo,
            telefono
        });
        setIsEditing(false);
        toast.success("Información personal actualizada.");
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    return (
        <Card className="shadow-sm border-border bg-card">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-2 space-y-2 md:space-y-0">
                <CardTitle className="text-lg md:text-xl font-semibold flex items-center gap-2 text-foreground">
                    <UserIcon className="h-5 w-5 text-primary" /> Información Personal
                </CardTitle>
                {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCancel}>
                            <X className="h-4 w-4 mr-2" /> Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" /> Guardar
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="space-y-1">
                    <Label htmlFor="nombre" className="text-foreground">Nombre Completo</Label>
                    <Input
                        ref={nombreRef}
                        id="nombre"
                        name="nombre"
                        type="text"
                        defaultValue={localUser.nombre}
                        readOnly={!isEditing}
                        key={`nombre-${isEditing}`}
                        className={isEditing
                            ? "text-base bg-background border-border text-foreground"
                            : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                        }
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="correo" className="text-foreground">Correo Electrónico</Label>
                    <Input
                        ref={correoRef}
                        id="correo"
                        name="correo"
                        type="email"
                        defaultValue={localUser.correo}
                        readOnly={true}
                        key={`correo-true`}
                        className="border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="telefono" className="text-foreground">Teléfono</Label>
                    <Input
                        ref={telefonoRef}
                        id="telefono"
                        name="telefono"
                        type="tel"
                        defaultValue={localUser.telefono || ''}
                        readOnly={!isEditing}
                        key={`telefono-${isEditing}`}
                        className={isEditing
                            ? "text-base bg-background border-border text-foreground"
                            : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                        }
                    />
                </div>
            </CardContent>
        </Card>
    );
}
