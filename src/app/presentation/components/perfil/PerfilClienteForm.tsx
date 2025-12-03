import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserIcon, Edit, Save, X } from 'lucide-react';
import { ClientProfile } from '@/types/common';

interface PerfilClienteFormProps {
    profile: ClientProfile | null;
    onProfileUpdate: (updatedProfile: ClientProfile) => void;
}

export default function PerfilClienteForm({
    profile,
    onProfileUpdate,
}: PerfilClienteFormProps) {
    if (!profile) {
        return (
            <Card className="shadow-sm border-border bg-card">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg md:text-xl font-semibold flex items-center gap-2 text-foreground">
                        <UserIcon className="h-5 w-5 text-primary" /> Información del Perfil
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">Cargando información del perfil...</p>
                </CardContent>
            </Card>
        );
    }

    const [isEditing, setIsEditing] = useState(false);
    const nombreRef = React.useRef<HTMLInputElement>(null);
    const apellidoRef = React.useRef<HTMLInputElement>(null);
    const documentoRef = React.useRef<HTMLInputElement>(null);
    const telefonoRef = React.useRef<HTMLInputElement>(null);
    const generioRef = React.useRef<HTMLInputElement>(null);
    const fechaNacimientoRef = React.useRef<HTMLInputElement>(null);
    const paisRef = React.useRef<HTMLInputElement>(null);
    const departamentoRef = React.useRef<HTMLInputElement>(null);
    const ciudadRef = React.useRef<HTMLInputElement>(null);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        const updatedProfile: ClientProfile = {
            ...profile,
            nombre_cliente: nombreRef.current?.value || profile.nombre_cliente,
            apellido: apellidoRef.current?.value || profile.apellido,
            documentoIntentidad: parseInt(documentoRef.current?.value || String(profile.documentoIntentidad), 10),
            telefono: parseInt(telefonoRef.current?.value || String(profile.telefono), 10),
            genero: generioRef.current?.value || profile.genero,
            fecha_nacimiento: fechaNacimientoRef.current?.value || profile.fecha_nacimiento,
            paisId: paisRef.current?.value || profile.paisId,
            departamentoId: departamentoRef.current?.value || profile.departamentoId,
            ciudadId: ciudadRef.current?.value || profile.ciudadId,
        };

        onProfileUpdate(updatedProfile);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    return (
        <Card className="shadow-sm border-border bg-card">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-2 space-y-2 md:space-y-0">
                <CardTitle className="text-lg md:text-xl font-semibold flex items-center gap-2 text-foreground">
                    <UserIcon className="h-5 w-5 text-primary" /> Información del Perfil
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="nombre_cliente" className="text-foreground">Nombre</Label>
                        <Input
                            ref={nombreRef}
                            id="nombre_cliente"
                            name="nombre_cliente"
                            type="text"
                            defaultValue={profile.nombre_cliente}
                            readOnly={!isEditing}
                            key={`nombre_cliente-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="apellido" className="text-foreground">Apellido</Label>
                        <Input
                            ref={apellidoRef}
                            id="apellido"
                            name="apellido"
                            type="text"
                            defaultValue={profile.apellido}
                            readOnly={!isEditing}
                            key={`apellido-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="documentoIntentidad" className="text-foreground">Documento de Identidad</Label>
                        <Input
                            ref={documentoRef}
                            id="documentoIntentidad"
                            name="documentoIntentidad"
                            type="text"
                            defaultValue={profile.documentoIntentidad}
                            readOnly={!isEditing}
                            key={`documentoIntentidad-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="telefono" className="text-foreground">Teléfono</Label>
                        <Input
                            ref={telefonoRef}
                            id="telefono"
                            name="telefono"
                            type="tel"
                            defaultValue={profile.telefono}
                            readOnly={!isEditing}
                            key={`telefono-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="genero" className="text-foreground">Género</Label>
                        <Input
                            ref={generioRef}
                            id="genero"
                            name="genero"
                            type="text"
                            defaultValue={profile.genero}
                            readOnly={!isEditing}
                            key={`genero-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="fecha_nacimiento" className="text-foreground">Fecha de Nacimiento</Label>
                        <Input
                            ref={fechaNacimientoRef}
                            id="fecha_nacimiento"
                            name="fecha_nacimiento"
                            type="date"
                            defaultValue={profile.fecha_nacimiento}
                            readOnly={!isEditing}
                            key={`fecha_nacimiento-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="paisId" className="text-foreground">País</Label>
                        <Input
                            ref={paisRef}
                            id="paisId"
                            name="paisId"
                            type="text"
                            defaultValue={profile.paisId || ''}
                            readOnly={!isEditing}
                            key={`paisId-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="departamentoId" className="text-foreground">Departamento</Label>
                        <Input
                            ref={departamentoRef}
                            id="departamentoId"
                            name="departamentoId"
                            type="text"
                            defaultValue={profile.departamentoId || ''}
                            readOnly={!isEditing}
                            key={`departamentoId-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="ciudadId" className="text-foreground">Ciudad</Label>
                        <Input
                            ref={ciudadRef}
                            id="ciudadId"
                            name="ciudadId"
                            type="text"
                            defaultValue={profile.ciudadId || ''}
                            readOnly={!isEditing}
                            key={`ciudadId-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
