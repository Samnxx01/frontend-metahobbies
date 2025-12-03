import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Edit, Save, X } from 'lucide-react';
import { toast } from 'react-toastify';
import type { User } from '../../../../types/common';

interface DireccionEnvioFormProps {
    localUser: User;
    onUserUpdate: (updatedUser: User) => void;
}

export default function DireccionEnvioForm({
    localUser,
    onUserUpdate,
}: DireccionEnvioFormProps) {
    const [isEditing, setIsEditing] = useState(false);
    const direccionRef = React.useRef<HTMLInputElement>(null);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        const direccion = direccionRef.current?.value || '';
        onUserUpdate({
            ...localUser,
            direccion
        });
        setIsEditing(false);
        toast.success("Dirección de envío actualizada.");
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    return (
        <Card className="shadow-sm border-border bg-card">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-2 space-y-2 md:space-y-0">
                <CardTitle className="text-lg md:text-xl font-semibold flex items-center gap-2 text-foreground">
                    <MapPin className="h-5 w-5 text-primary" /> Dirección de Envío
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
                    <Label htmlFor="direccion" className="text-foreground">Dirección Completa</Label>
                    <Input
                        ref={direccionRef}
                        id="direccion"
                        name="direccion"
                        type="text"
                        defaultValue={localUser.direccion || ''}
                        readOnly={!isEditing}
                        key={`direccion-${isEditing}`}
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
