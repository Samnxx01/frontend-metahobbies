import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserIcon, Edit, Save, X } from 'lucide-react';
import { ClientProfile } from '@/types/common';

interface TipoDocumento {
    tipos: string;
    nombreDocumento: string;
    iud: string;
}

interface Genero {
    nombre_genero: string;
    iud: string;
}

interface Nacionalidad {
    Nacionalidad: string;
    siglaNaciona: string;
    iud: string;
}

interface Prefijo {
    iud: string;
    prefijoTelefonicoPais: string;
}

interface Departamento {
    departamentoId: string;
    codigo_postal: string;
    ciudades: Ciudad[];
}

interface Ciudad {
    ciudadId: string;
    nombre_ciudad: string;
}

interface Pais {
    Id: string;
    nombre_pais: string;
    codigoISO2: string;
}

// Mapeo de IDs de departamento a sus nombres reales
const DEPARTAMENTO_NOMBRES: Record<string, string> = {
    '1': 'Amazonas',
    '2': 'Antioquia',
    '3': 'Arauca',
    '4': 'Atlántico',
    '5': 'Bogotá D.C.',
    '6': 'Bolívar',
    '7': 'Boyacá',
    '8': 'Caldas',
    '9': 'Caquetá',
    '10': 'Casanare',
    '11': 'Cauca',
    '12': 'Cesar',
    '13': 'Chocó',
    '14': 'Córdoba',
    '15': 'Cundinamarca',
    '16': 'Guainía',
    '17': 'Guaviare',
    '18': 'Huila',
    '19': 'La Guajira',
    '20': 'Magdalena',
    '21': 'Meta',
    '22': 'Nariño',
    '23': 'Norte de Santander',
    '24': 'Putumayo',
    '25': 'Quindío',
    '26': 'Risaralda',
    '27': 'San Andrés y Providencia',
    '28': 'Santander',
    '29': 'Sucre',
    '30': 'Tolima',
    '31': 'Valle del Cauca',
    '32': 'Vaupés',
    '33': 'Vichada'
};

/**
 * Props del componente PerfilClienteForm
 * @property {ClientProfile | null} profile - Datos del perfil del cliente (null durante la carga)
 * @property {function} onProfileUpdate - Callback que se ejecuta cuando se guardan los cambios
 * @property {string} token - Token de autenticación del usuario
 */
interface PerfilClienteFormProps {
    profile: ClientProfile | null;
    onProfileUpdate: (updatedProfile: ClientProfile) => void;
    token?: string;
}

/**
 * Componente PerfilClienteForm
 * 
 * Formulario para visualizar y editar el perfil del cliente.
 * Maneja 9 campos editables y permite guardar/cancelar cambios.
 * 
 * Campos editables:
 * - Información personal: nombre_cliente, apellido, documento, teléfono, género, fecha_nacimiento
 * - Ubicación: país, departamento, ciudad
 * 
 * Características:
 * - Modo lectura/edición con estado local (isEditing)
 * - Inputs no controlados usando refs para mejor rendimiento
 * - Validación y parseo de campos numéricos (documento, teléfono)
 * - Estado de carga mientras se obtienen datos del servidor
 */
export default function PerfilClienteForm({
    profile,
    onProfileUpdate,
    token,
}: PerfilClienteFormProps) {
    // --- ESTADO LOCAL ---
    const [isEditing, setIsEditing] = useState(false);
    const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
    const [generos, setGeneros] = useState<Genero[]>([]);
    const [nacionalidades, setNacionalidades] = useState<Nacionalidad[]>([]);
    const [prefijos, setPrefijos] = useState<Prefijo[]>([]);
    const [paises, setPaises] = useState<Pais[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [ciudades, setCiudades] = useState<Ciudad[]>([]);
    const [selectedTipoDoc, setSelectedTipoDoc] = useState<string>('');
    const [selectedGenero, setSelectedGenero] = useState<string>('');
    const [selectedNacionalidad, setSelectedNacionalidad] = useState<string>('');
    const [selectedPrefijo, setSelectedPrefijo] = useState<string>('');
    const [selectedPais, setSelectedPais] = useState<string>('1');
    const [selectedDepartamento, setSelectedDepartamento] = useState<string>('');
    const [selectedCiudad, setSelectedCiudad] = useState<string>('');

    // --- REFS PARA INPUTS NO CONTROLADOS ---
    // Usamos refs en lugar de estado controlado para mejor rendimiento
    // y para evitar re-renders innecesarios en cada keystroke
    
    // Refs para información personal
    const nombreRef = React.useRef<HTMLInputElement>(null);
    const apellidoRef = React.useRef<HTMLInputElement>(null);
    const documentoRef = React.useRef<HTMLInputElement>(null);
    const telefonoRef = React.useRef<HTMLInputElement>(null);
    const fechaNacimientoRef = React.useRef<HTMLInputElement>(null);
    
    // Refs para ubicación ya no son necesarios - usamos Select controlados

    // --- CARGAR DATOS DEL BACKEND ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Cargar tipos de documento
                const tiposResponse = await fetch('/api/perfil/seguridad/tipo/documentos');
                const tiposData = await tiposResponse.json();
                if (tiposData.ok) {
                    setTiposDocumento(tiposData.tipos);
                }

                // Cargar géneros (requiere autenticación)
                if (token) {
                    const generosResponse = await fetch('/api/perfil/seguridad/listar/tipo/genero', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const generosData = await generosResponse.json();
                    if (generosData.ok) {
                        setGeneros(generosData.generos);
                    }

                    // Cargar nacionalidades (requiere autenticación)
                    const nacionalidadesResponse = await fetch('/api/perfil/seguridad/listar/tipo/nacionalidad', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const nacionalidadesData = await nacionalidadesResponse.json();
                    if (nacionalidadesData.ok) {
                        setNacionalidades(nacionalidadesData.nacionalidades);
                    }

                    // Cargar prefijos telefónicos (requiere autenticación)
                    const prefijosResponse = await fetch('/api/perfil/seguridad/listar/tipo/prefijo', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const prefijosData = await prefijosResponse.json();
                    if (prefijosData.ok) {
                        setPrefijos(prefijosData.prefijos);
                    }

                    // Cargar departamentos y ciudades (requiere autenticación)
                    const locationResponse = await fetch('/api/perfil/seguridad/listar/paises/departamentos/ciudades?paisId=1', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const locationData = await locationResponse.json();
                    if (locationData.ok) {
                        // Guardar el país desde la respuesta
                        if (locationData.pais) {
                            setPaises([locationData.pais]);
                        }
                        setDepartamentos(locationData.departamentos);
                    }
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
            }
        };

        fetchData();
    }, [token]);

    // Actualizar valores seleccionados cuando cambia el perfil
    useEffect(() => {
        if (profile) {
            setSelectedTipoDoc(profile.tipoDeIntendidad || '');
            setSelectedGenero(profile.genero || '');
            setSelectedNacionalidad(profile.nacionalidad || '');
            setSelectedPrefijo(profile.prefijo || '');
            setSelectedPais(profile.paisId || '1');
            setSelectedDepartamento(profile.departamentoId || '');
            setSelectedCiudad(profile.ciudadId || '');
        }
    }, [profile]);

    // Actualizar ciudades cuando cambia el departamento seleccionado
    useEffect(() => {
        if (selectedDepartamento) {
            const dept = departamentos.find(d => d.departamentoId === selectedDepartamento);
            if (dept) {
                setCiudades(dept.ciudades);
            }
        } else {
            setCiudades([]);
        }
    }, [selectedDepartamento, departamentos]);
    
    // --- HANDLER: ACTIVAR MODO EDICIÓN ---
    // Cambia el formulario de modo lectura a modo edición
    const handleEdit = () => {
        setIsEditing(true);
    };

    // --- HANDLER: GUARDAR CAMBIOS ---
    // Recopila los valores de todos los refs, construye el objeto actualizado
    // y lo envía al componente padre a través del callback onProfileUpdate
    const handleSave = async () => {
        try {
            // Construir objeto base para enviar al backend según el schema
            const profileData: any = {
                nombre_cliente: nombreRef.current?.value || profile?.nombre_cliente || '',
                apellido: apellidoRef.current?.value || profile?.apellido || '',
                genero: selectedGenero || profile?.genero || '',
                tipoDeIntendidad: selectedTipoDoc || profile?.tipoDeIntendidad || '',
                documentoIntentidad: parseInt(documentoRef.current?.value || String(profile?.documentoIntentidad || 0), 10),
                telefono: parseInt(telefonoRef.current?.value || String(profile?.telefono || 0), 10),
                fecha_nacimiento: fechaNacimientoRef.current?.value || profile?.fecha_nacimiento || '',
                paisId: selectedPais || profile?.paisId || '1',
                departamentoId: selectedDepartamento || profile?.departamentoId || '',
                ciudadId: selectedCiudad || profile?.ciudadId || '',
            };

            // Solo agregar campos opcionales si tienen valores válidos
            if (selectedNacionalidad) {
                profileData.Nacionalidad = selectedNacionalidad;
            } else if (profile?.nacionalidad) {
                profileData.Nacionalidad = profile.nacionalidad;
            }

            if (selectedPrefijo) {
                profileData.prefijo = selectedPrefijo;
            } else if (profile?.prefijo) {
                profileData.prefijo = profile.prefijo;
            }

            // Determinar si es creación o actualización
            const isCreating = !profile;
            const endpoint = isCreating 
                ? '/api/perfil/seguridad/usuario'
                : '/api/perfil/usuario/actualizar';

            // Enviar al backend
            const response = await fetch(endpoint, {
                method: isCreating ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            const data = await response.json();

            if (data.ok) {
                // Construir el perfil actualizado para el callback
                const updatedProfile: ClientProfile = {
                    nombre_cliente: profileData.nombre_cliente,
                    apellido: profileData.apellido,
                    genero: profileData.genero,
                    tipoDeIntendidad: profileData.tipoDeIntendidad,
                    documentoIntentidad: profileData.documentoIntentidad,
                    telefono: profileData.telefono,
                    fecha_nacimiento: profileData.fecha_nacimiento,
                    nacionalidad: profileData.Nacionalidad,
                    prefijo: profileData.prefijo,
                    paisId: profileData.paisId,
                    departamentoId: profileData.departamentoId,
                    ciudadId: profileData.ciudadId,
                };
                
                // Enviar datos actualizados al componente padre
                onProfileUpdate(updatedProfile);
                
                // Volver a modo lectura
                setIsEditing(false);
            } else {
                console.error('Error al guardar perfil:', data.message);
                alert('Error al guardar el perfil: ' + (data.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error en handleSave:', error);
            alert('Error al guardar el perfil. Por favor intenta nuevamente.');
        }
    };

    // --- HANDLER: CANCELAR EDICIÓN ---
    // Descarta los cambios y vuelve a modo lectura
    // Los inputs se resetean automáticamente al cambiar la key basada en isEditing
    const handleCancel = () => {
        setIsEditing(false);
    };

    // --- ACTIVAR MODO EDICIÓN SI NO HAY PERFIL ---
    // Si profile es null, activar automáticamente el modo edición para crear el perfil
    useEffect(() => {
        if (profile === null && tiposDocumento.length > 0) {
            // Solo activar edición cuando ya se cargaron los datos de catálogos
            setIsEditing(true);
        }
    }, [profile, tiposDocumento]);

    return (
        <Card className="shadow-sm border-border bg-card">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-2 space-y-2 md:space-y-0">
                <CardTitle className="text-lg md:text-xl font-semibold flex items-center gap-2 text-foreground">
                    <UserIcon className="h-5 w-5 text-primary" /> Información del Perfil
                    {!profile && <span className="text-sm font-normal text-muted-foreground ml-2">(Nuevo)</span>}
                </CardTitle>
                {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        {profile && (
                            <Button variant="outline" size="sm" onClick={handleCancel}>
                                <X className="h-4 w-4 mr-2" /> Cancelar
                            </Button>
                        )}
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" /> {profile ? 'Guardar' : 'Crear Perfil'}
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
                            defaultValue={profile?.nombre_cliente || ''}
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
                            defaultValue={profile?.apellido || ''}
                            readOnly={!isEditing}
                            key={`apellido-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="tipoDocumento" className="text-foreground">Tipo de Documento</Label>
                        {isEditing ? (
                            <Select value={selectedTipoDoc} onValueChange={setSelectedTipoDoc}>
                                <SelectTrigger className="text-base">
                                    <SelectValue placeholder="Selecciona tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tiposDocumento.map((tipo) => (
                                        <SelectItem key={tipo.iud} value={tipo.iud}>
                                            {tipo.nombreDocumento}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-base text-foreground">
                                {tiposDocumento.find(t => t.iud === selectedTipoDoc)?.nombreDocumento || selectedTipoDoc}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="documentoIntentidad" className="text-foreground">Número de Documento</Label>
                        <Input
                            ref={documentoRef}
                            id="documentoIntentidad"
                            name="documentoIntentidad"
                            type="text"
                            defaultValue={profile?.documentoIntentidad || ''}
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
                            defaultValue={profile?.telefono || ''}
                            readOnly={!isEditing}
                            key={`telefono-${isEditing}`}
                            className={isEditing
                                ? "text-base bg-background border-border text-foreground"
                                : "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="prefijo" className="text-foreground">Prefijo Telefónico</Label>
                        {isEditing ? (
                            <Select value={selectedPrefijo} onValueChange={setSelectedPrefijo}>
                                <SelectTrigger className="text-base">
                                    <SelectValue placeholder="Selecciona prefijo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {prefijos.map((prefijo) => (
                                        <SelectItem key={prefijo.iud} value={prefijo.iud}>
                                            {prefijo.prefijoTelefonicoPais}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-base text-foreground">
                                {prefijos.find(p => p.iud === selectedPrefijo)?.prefijoTelefonicoPais || selectedPrefijo}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="genero" className="text-foreground">Género</Label>
                        {isEditing ? (
                            <Select value={selectedGenero} onValueChange={setSelectedGenero}>
                                <SelectTrigger className="text-base">
                                    <SelectValue placeholder="Selecciona género" />
                                </SelectTrigger>
                                <SelectContent>
                                    {generos.map((genero) => (
                                        <SelectItem key={genero.iud} value={genero.nombre_genero}>
                                            {genero.nombre_genero}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-base text-foreground">
                                {selectedGenero || profile?.genero || ''}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nacionalidad" className="text-foreground">Nacionalidad</Label>
                        {isEditing ? (
                            <Select value={selectedNacionalidad} onValueChange={setSelectedNacionalidad}>
                                <SelectTrigger className="text-base">
                                    <SelectValue placeholder="Selecciona nacionalidad" />
                                </SelectTrigger>
                                <SelectContent>
                                    {nacionalidades.map((nacionalidad) => (
                                        <SelectItem key={nacionalidad.iud} value={nacionalidad.iud}>
                                            {nacionalidad.Nacionalidad}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-base text-foreground">
                                {nacionalidades.find(n => n.iud === selectedNacionalidad)?.Nacionalidad || selectedNacionalidad}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="fecha_nacimiento" className="text-foreground">Fecha de Nacimiento</Label>
                        <Input
                            ref={fechaNacimientoRef}
                            id="fecha_nacimiento"
                            name="fecha_nacimiento"
                            type="date"
                            defaultValue={profile?.fecha_nacimiento || ''}
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
                        {isEditing ? (
                            <Select value={selectedPais} onValueChange={setSelectedPais}>
                                <SelectTrigger className="text-base">
                                    <SelectValue placeholder="Selecciona país" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paises.map((pais) => (
                                        <SelectItem key={pais.Id} value={pais.Id}>
                                            {pais.nombre_pais}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-base text-foreground">
                                {paises.find(p => p.Id === selectedPais)?.nombre_pais || 'Colombia'}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="departamentoId" className="text-foreground">Departamento</Label>
                        {isEditing ? (
                            <Select value={selectedDepartamento} onValueChange={(value) => {
                                setSelectedDepartamento(value);
                                setSelectedCiudad(''); // Reset ciudad cuando cambia departamento
                            }}>
                                <SelectTrigger className="text-base">
                                    <SelectValue placeholder="Selecciona departamento" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departamentos.map((dept) => (
                                        <SelectItem key={dept.departamentoId} value={dept.departamentoId}>
                                            {DEPARTAMENTO_NOMBRES[dept.departamentoId] || `Departamento ${dept.departamentoId}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-base text-foreground">
                                {DEPARTAMENTO_NOMBRES[selectedDepartamento] || selectedDepartamento}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="ciudadId" className="text-foreground">Ciudad</Label>
                        {isEditing ? (
                            <Select value={selectedCiudad} onValueChange={setSelectedCiudad} disabled={!selectedDepartamento}>
                                <SelectTrigger className="text-base">
                                    <SelectValue placeholder="Selecciona ciudad" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ciudades.map((ciudad) => (
                                        <SelectItem key={ciudad.ciudadId} value={ciudad.ciudadId}>
                                            {ciudad.nombre_ciudad}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-base text-foreground">
                                {ciudades.find(c => c.ciudadId === selectedCiudad)?.nombre_ciudad || selectedCiudad}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
