import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import {
    colectarTodasOpcionesPerfilCorporativo,
    fetchPerfilCorporativoDetallePorId,
    fetchPerfilesCorporativosCompletos,
    fetchPerfilesCorporativosScopeOpciones,
    perfilCorporativoCoincideId,
    PERFIL_CORPORATIVO_NUEVO_ID,
    resolvePerfilCorporativoApiId,
    resolvePerfilCorporativoScopeJwt,
    type PerfilCorporativoScopeOpcion,
} from '@/app/services/routesService';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { resolveApiEntityId } from '@/app/utils/normalizeMongoId';
import { Loader2, Building2, Edit, Save, Globe, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { toast } from 'react-toastify';

interface FormularioProps {
    data: any;
    setData: (data: any) => void;
    representantes: any[];
    tiposSociedad: any[];
    direcciones: any[];
    /** Si true, la razón social se elige arriba con el select (no input). */
    ocultarRazonSocial?: boolean;
}

const SelectorRazonSocialPerfil = ({
    opciones,
    value,
    onChange,
    loading = false,
    disabled = false,
    mostrarCrearNuevo = false,
}: {
    opciones: PerfilCorporativoScopeOpcion[];
    value: string | null;
    onChange: (id: string) => void;
    loading?: boolean;
    disabled?: boolean;
    mostrarCrearNuevo?: boolean;
}) => (
    <div className="space-y-2 md:col-span-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-primary" /> Razon Social *
        </label>
        <Select
            value={value || undefined}
            disabled={loading || disabled}
            onValueChange={onChange}
        >
            <SelectTrigger>
                {loading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando perfiles…
                    </span>
                ) : (
                    <SelectValue placeholder="Seleccione razón social" />
                )}
            </SelectTrigger>
            <SelectContent>
                {mostrarCrearNuevo && (
                    <SelectItem value={PERFIL_CORPORATIVO_NUEVO_ID}>
                        + Crear nuevo perfil corporativo
                    </SelectItem>
                )}
                {opciones.map((opcion) => (
                    <SelectItem key={opcion.id} value={opcion.id}>
                        {opcion.label}{typeof opcion.publicar === 'boolean' ? ` · ${opcion.publicar ? 'Público' : 'Privado'}` : ''}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
        {mostrarCrearNuevo ? (
            <p className="text-xs text-muted-foreground">
                Elija un perfil existente para consultarlo o seleccione crear nuevo para registrar uno.
            </p>
        ) : (
            <p className="text-xs text-muted-foreground">
                {disabled
                    ? 'Perfil parametrizado al tenant corporativo (solo lectura).'
                    : 'Seleccione la razón social del perfil a editar.'}
            </p>
        )}
    </div>
);

const FormularioEmpresa = ({
    data,
    setData,
    representantes,
    tiposSociedad,
    direcciones,
    ocultarRazonSocial = false,
}: FormularioProps) => {
    const updateField = (field: string, value: any) => {
        setData({ ...data, [field]: value });
    };

    const catalogId = (item: Record<string, unknown>) => resolveApiEntityId(item);

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {!ocultarRazonSocial && (
                <div className="space-y-2 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                        <Building2 className="h-4 w-4 text-primary" /> Razon Social *
                    </label>
                    <Input
                        required
                        value={data.razon_social}
                        onChange={(e) => updateField('razon_social', e.target.value)}
                        placeholder="Nombre legal de la empresa"
                    />
                </div>
            )}

            <div className="space-y-2">
                <label className="text-sm font-semibold">Titulo / Eslogan</label>
                <Input value={data.titulo} onChange={(e) => updateField('titulo', e.target.value)} placeholder="Ej: Innovacion constante" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">NIT / RUC *</label>
                <Input required value={data.nit_ruc_rtn} onChange={(e) => updateField('nit_ruc_rtn', e.target.value)} />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Tipo de Sociedad *</label>
                <Select
                    value={data.tipo_sociedad || undefined}
                    onValueChange={(value) => {
                        updateField('tipo_sociedad', value);
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {tiposSociedad.map((tipo) => {
                            const tipoId = catalogId(tipo);
                            if (!tipoId) return null;
                            return (
                                <SelectItem key={tipoId} value={tipoId}>
                                    {tipo.tipo_sociedad} - {tipo.nombre_sociedad}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Representante Legal</label>
                <Select value={data.represeLegaEmpresa || ''} onValueChange={(value) => updateField('represeLegaEmpresa', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {representantes.map((representante) => {
                            const repId = catalogId(representante);
                            if (!repId) return null;
                            return (
                                <SelectItem key={repId} value={repId}>
                                    {representante.nombre_representante_legal}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Ubicacion (Sede)</label>
                <Select value={data.direccion_empresa_relacion || ''} onValueChange={(value) => updateField('direccion_empresa_relacion', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {direcciones.map((direccion) => {
                            const dirId = catalogId(direccion);
                            if (!dirId) return null;
                            return (
                                <SelectItem key={dirId} value={dirId}>
                                    {direccion.ciudad?.nombre_ciudad} - {direccion.telefono_empresa}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Direccion (Nomenclatura) *</label>
                <Input required value={data.direccion_empresa} onChange={(e) => updateField('direccion_empresa', e.target.value)} placeholder="Ej: Calle 10 # 5-25" />
            </div>

            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarIcon className="h-4 w-4 text-primary" /> Fecha Constitucion
                </label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !data.fecha_constitucion && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {data.fecha_constitucion && isValid(parseISO(data.fecha_constitucion))
                                ? format(parseISO(data.fecha_constitucion), 'PPP', { locale: es })
                                : <span>Seleccionar fecha</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            fromYear={1900}
                            toYear={new Date().getFullYear()}
                            selected={data.fecha_constitucion ? parseISO(data.fecha_constitucion) : undefined}
                            onSelect={(date) => updateField('fecha_constitucion', date ? format(date, 'yyyy-MM-dd') : '')}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Movil Corporativo</label>
                <Input value={data.movil_corporativo} onChange={(e) => updateField('movil_corporativo', e.target.value)} />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Camara de Comercio</label>
                <Input value={data.camara_comercio} onChange={(e) => updateField('camara_comercio', e.target.value)} />
            </div>

            <div className="space-y-2">
                <label className="flex items-center justify-between gap-2 text-sm font-semibold">
                    <span>Perfil Público</span>
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-foreground">
                        {data.publicar === true ? 'Público' : 'Privado'}
                    </span>
                </label>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div>
                        <p className="text-sm font-medium">Publicar perfil en vistas publicas</p>
                        <p className="text-xs text-muted-foreground">El sitio publico solo renderiza perfiles con `publicar = true`.</p>
                    </div>
                    <Switch checked={data.publicar === true} onCheckedChange={(checked) => updateField('publicar', checked)} />
                </div>
            </div>

            <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Descripcion General</label>
                <Textarea value={data.descripcion} onChange={(e) => updateField('descripcion', e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 md:col-span-2 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <FileText className="h-4 w-4" /> Mision
                    </label>
                    <Textarea
                        value={data.descripcion_mision_empresa}
                        onChange={(e) => updateField('descripcion_mision_empresa', e.target.value)}
                        rows={3}
                        placeholder="Escribe la mision de la empresa..."
                    />
                </div>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Globe className="h-4 w-4" /> Vision
                    </label>
                    <Textarea
                        value={data.descripcion_vision_empresa}
                        onChange={(e) => updateField('descripcion_vision_empresa', e.target.value)}
                        rows={3}
                        placeholder="Escribe la vision de la empresa..."
                    />
                </div>
            </div>
        </div>
    );
};

const initialFormState = {
    razon_social: '',
    titulo: '',
    descripcion: '',
    represeLegaEmpresa: '',
    nit_ruc_rtn: '',
    tipo_sociedad: '',
    direccion_empresa: '',
    direccion_empresa_relacion: '',
    movil_corporativo: '',
    descripcion_mision_empresa: '',
    descripcion_vision_empresa: '',
    fecha_constitucion: '',
    camara_comercio: '',
    publicar: false,
    estado: true,
};

function normalizeFechaPerfil(value: unknown): string {
    if (!value) return '';
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const parsed = parseISO(raw);
    if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
    const fallback = new Date(raw);
    if (isValid(fallback)) return format(fallback, 'yyyy-MM-dd');
    return '';
}

function perfilToUpdateForm(perfil: Record<string, any>) {
    return {
        razon_social: perfil.razon_social || '',
        titulo: perfil.titulo || '',
        descripcion: perfil.descripcion || '',
        represeLegaEmpresa: resolveApiEntityId(perfil.represeLegaEmpresa),
        nit_ruc_rtn: perfil.nit_ruc_rtn || '',
        tipo_sociedad: resolveApiEntityId(perfil.tipo_sociedad),
        direccion_empresa: perfil.direccion_empresa || '',
        direccion_empresa_relacion: resolveApiEntityId(perfil.direccion_empresa_relacion),
        movil_corporativo: perfil.movil_corporativo?.toString() || '',
        descripcion_mision_empresa: perfil.descripcion_mision_empresa || '',
        descripcion_vision_empresa: perfil.descripcion_vision_empresa || '',
        fecha_constitucion: normalizeFechaPerfil(perfil.fecha_constitucion),
        camara_comercio: perfil.camara_comercio || '',
        publicar: perfil.publicar === true,
        estado: perfil.estado ?? true,
    };
}

function opcionDesdePerfil(perfil: Record<string, unknown>): PerfilCorporativoScopeOpcion {
    const id = resolvePerfilCorporativoApiId(perfil);
    const razonSocial = String(perfil.razon_social || '').trim();
    return {
        id,
        perfilCorporativoId: id,
        label: razonSocial || id,
        razonSocial,
        publicar: perfil.publicar === true,
    };
}

export default function PerfilCorporativo() {
    const { user } = useAuth();
    const [perfil, setPerfil] = useState<any>(null);
    const [perfilId, setPerfilId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [loadingPerfilesScope, setLoadingPerfilesScope] = useState(false);
    const [loadingPerfilDetalle, setLoadingPerfilDetalle] = useState(false);
    const [perfilesScopeOpciones, setPerfilesScopeOpciones] = useState<PerfilCorporativoScopeOpcion[]>([]);
    const [perfilesEnScopeCache, setPerfilesEnScopeCache] = useState<Record<string, any>[]>([]);
    const [selectedPerfilScopeId, setSelectedPerfilScopeId] = useState<string | null>(null);
    const [scopeModo, setScopeModo] = useState<'catalogo_completo' | 'tenant_corporativo' | 'legacy'>('legacy');
    const [selectorPerfilEditable, setSelectorPerfilEditable] = useState(true);
    const selectedPerfilRef = useRef<string | null>(null);

    const [representantes, setRepresentantes] = useState<any[]>([]);
    const [tiposSociedad, setTiposSociedad] = useState<any[]>([]);
    const [direcciones, setDirecciones] = useState<any[]>([]);

    const [form, setForm] = useState(initialFormState);
    const [updateForm, setUpdateForm] = useState(initialFormState);
    const [modoRegistroNuevo, setModoRegistroNuevo] = useState(true);

    const hayOpcionesPerfil = perfilesScopeOpciones.length > 0;
    const selectedVistaId = selectedPerfilScopeId
        ?? (modoRegistroNuevo ? PERFIL_CORPORATIVO_NUEVO_ID : null);

    const aplicarPerfilAlEstado = useCallback((perfilData: Record<string, any>) => {
        const id = resolvePerfilCorporativoApiId(perfilData);
        setPerfil(perfilData);
        setPerfilId(id || null);
        setSelectedPerfilScopeId(id || null);
        selectedPerfilRef.current = id || null;
        setUpdateForm(perfilToUpdateForm(perfilData));
    }, []);

    const fetchCatalogos = async () => {
        try {
            const [repsRes, socRes, dirRes] = await Promise.all([
                apiFetch('/api/config/listar/represente/empresarial', { method: 'GET' }),
                apiFetch('/api/config/parametrizacion/sociedades/coporativa', { method: 'GET' }),
                apiFetch('/api/config/parametrizacion/direccion/coporativa', { method: 'GET' }),
            ]);

            setRepresentantes(repsRes?.representantes || []);
            setTiposSociedad(socRes?.sociedades || []);
            setDirecciones(dirRes?.direcciones || []);
        } catch (err) {
            console.error('Error cargando catalogos:', err);
            toast.error('Error al cargar catalogos');
        }
    };

    const fetchPerfilLegacy = async (): Promise<Record<string, unknown> | null> => {
        const res = await apiFetch('/api/configuracion/listar/user/coporativo/perfil/publico', {
            method: 'GET',
            logoutOn401: false,
        });

        if (res?.ok && res?.perfil) {
            aplicarPerfilAlEstado(res.perfil);
            return res.perfil as Record<string, unknown>;
        }

        setPerfil(null);
        setPerfilId(null);
        setSelectedPerfilScopeId(null);
        setModoRegistroNuevo(true);
        return null;
    };

    const fetchPerfil = useCallback(async () => {
        setLoading(true);
        setLoadingPerfilesScope(true);

        try {
            const scope = resolvePerfilCorporativoScopeJwt(user);
            let { opciones, selectorEditable, modo, perfilPreferidoId } = await fetchPerfilesCorporativosScopeOpciones(scope);

            if (!opciones.length) {
                const todas = await colectarTodasOpcionesPerfilCorporativo();
                if (todas.length) {
                    opciones = todas;
                    modo = scope.tenantCorporativoId ? 'tenant_corporativo' : 'catalogo_completo';
                    selectorEditable = !scope.tenantCorporativoId && todas.length > 1;
                }
            }

            if (modo === 'legacy' || opciones.length === 0) {
                const legacyPerfil = await fetchPerfilLegacy();
                if (legacyPerfil?._id) {
                    const opLegacy = opcionDesdePerfil(legacyPerfil);
                    setPerfilesScopeOpciones([opLegacy]);
                    setScopeModo('catalogo_completo');
                    setSelectorPerfilEditable(false);
                    setModoRegistroNuevo(false);
                } else {
                    setPerfilesScopeOpciones(opciones);
                    setScopeModo(modo);
                    setSelectorPerfilEditable(selectorEditable);
                    setModoRegistroNuevo(true);
                    setSelectedPerfilScopeId(PERFIL_CORPORATIVO_NUEVO_ID);
                }
                return;
            }

            setScopeModo(modo);
            setSelectorPerfilEditable(selectorEditable);
            const perfilesCompletos = await fetchPerfilesCorporativosCompletos();
            const idsScope = new Set(opciones.map((o) => o.id));
            const perfilesFiltrados =
                modo === 'catalogo_completo'
                    ? perfilesCompletos
                    : perfilesCompletos.filter((p) => idsScope.has(resolvePerfilCorporativoApiId(p)));

            const perfilesPorId = new Map(
                perfilesFiltrados.map((p) => [resolvePerfilCorporativoApiId(p), p])
            );
            setPerfilesScopeOpciones(opciones.map((opcion) => ({
                ...opcion,
                publicar: perfilesPorId.get(opcion.id)?.publicar === true,
            })));

            setPerfilesEnScopeCache(perfilesFiltrados);

            const preferido =
                (selectedPerfilRef.current && idsScope.has(selectedPerfilRef.current)
                    ? selectedPerfilRef.current
                    : null)
                || (perfilPreferidoId && idsScope.has(perfilPreferidoId) ? perfilPreferidoId : null)
                || (modo === 'tenant_corporativo' || opciones.length === 1 ? opciones[0]?.id : null)
                || null;

            if (!preferido && modo === 'catalogo_completo' && opciones.length > 1) {
                setPerfil(null);
                setPerfilId(null);
                selectedPerfilRef.current = null;
                setModoRegistroNuevo(true);
                setSelectedPerfilScopeId(PERFIL_CORPORATIVO_NUEVO_ID);
                return;
            }

            const perfilSeleccionado = preferido
                ? perfilesFiltrados.find((p) => perfilCorporativoCoincideId(p, preferido))
                : undefined;

            if (perfilSeleccionado) {
                aplicarPerfilAlEstado(perfilSeleccionado);
                setModoRegistroNuevo(false);
            } else if (preferido) {
                const detalle = await fetchPerfilCorporativoDetallePorId(preferido, perfilesFiltrados);
                if (detalle) {
                    setPerfilesEnScopeCache((prev) => {
                        const exists = prev.some((p) => perfilCorporativoCoincideId(p, preferido));
                        return exists ? prev : [...prev, detalle];
                    });
                    aplicarPerfilAlEstado(detalle);
                    setModoRegistroNuevo(false);
                } else {
                    setSelectedPerfilScopeId(preferido);
                    selectedPerfilRef.current = preferido;
                    setPerfilId(preferido);
                    setModoRegistroNuevo(false);
                }
            } else {
                setPerfil(null);
                setPerfilId(null);
                selectedPerfilRef.current = null;
                setModoRegistroNuevo(true);
                setSelectedPerfilScopeId(PERFIL_CORPORATIVO_NUEVO_ID);
            }
        } catch (err: unknown) {
            console.error('Error cargando perfil:', err);
            const message = err instanceof Error ? err.message : '';
            if (message.includes('no encontrado') || message.includes('404')) {
                setPerfil(null);
                setPerfilId(null);
                setModoRegistroNuevo(true);
                setSelectedPerfilScopeId(PERFIL_CORPORATIVO_NUEVO_ID);
            } else {
                toast.error('Error al cargar el perfil');
            }
        } finally {
            setLoading(false);
            setLoadingPerfilesScope(false);
        }
    }, [user, aplicarPerfilAlEstado]);

    const handleCambioPerfilScope = async (id: string, contexto: 'vista' | 'edicion' = 'vista') => {
        if (id === PERFIL_CORPORATIVO_NUEVO_ID) {
            selectedPerfilRef.current = null;
            setSelectedPerfilScopeId(PERFIL_CORPORATIVO_NUEVO_ID);
            setPerfil(null);
            setPerfilId(null);
            setModoRegistroNuevo(true);
            setForm(initialFormState);
            if (contexto === 'edicion') {
                setIsUpdateModalOpen(false);
            }
            return;
        }

        selectedPerfilRef.current = id;
        setSelectedPerfilScopeId(id);
        setModoRegistroNuevo(false);
        setLoadingPerfilDetalle(true);
        try {
            const detalle = await fetchPerfilCorporativoDetallePorId(id, perfilesEnScopeCache);
            if (detalle) {
                setPerfilesEnScopeCache((prev) => {
                    const exists = prev.some((p) => perfilCorporativoCoincideId(p, id));
                    return exists ? prev : [...prev, detalle];
                });
                aplicarPerfilAlEstado(detalle);
                return;
            }

            toast.error('No se pudo cargar el perfil seleccionado');
            setModoRegistroNuevo(true);
            setSelectedPerfilScopeId(PERFIL_CORPORATIVO_NUEVO_ID);
        } catch (err: unknown) {
            console.error('Error cargando perfil del scope:', err);
            toast.error('Error al cargar el perfil seleccionado');
        } finally {
            setLoadingPerfilDetalle(false);
        }
    };

    useEffect(() => {
        void fetchCatalogos();
    }, []);

    useEffect(() => {
        if (!perfil) return;
        setUpdateForm(perfilToUpdateForm(perfil));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sincronizar selects cuando llegan catálogos
    }, [perfil, representantes, tiposSociedad, direcciones]);

    useEffect(() => {
        if (!user) return;
        void fetchPerfil();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- recargar solo al cambiar scope JWT
    }, [
        user,
        user?.auth?.tenantScope?.tenantCorporativoId,
        user?.auth?.tenantScope?.tenantGlobalId,
        user?.auth?.tenantScope?.tenantSuperAdminId,
    ]);

    useEffect(() => {
        if (!isUpdateModalOpen || !user) return;
        void fetchPerfil();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isUpdateModalOpen]);

    useEffect(() => {
        const id = selectedPerfilScopeId;
        if (!id || id === PERFIL_CORPORATIVO_NUEVO_ID || perfil || loading || loadingPerfilDetalle) return;
        void handleCambioPerfilScope(id, 'vista');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- cargar detalle si el select quedó con id sin perfil
    }, [selectedPerfilScopeId, perfil, loading, loadingPerfilDetalle]);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.razon_social?.trim()) {
            toast.error('Debe ingresar la razón social');
            return;
        }

        if (!form.tipo_sociedad) {
            toast.error('Debe seleccionar un tipo de sociedad');
            return;
        }

        setSubmitting(true);

        const payload = {
            ...form,
            publicar: form.publicar === true,
            estado: true,
        };

        try {
            const res = await apiFetch('/api/configuracion/parametrizacion/corporativo/perfil', {
                method: 'POST',
                body: payload,
            });

            if (res?.ok) {
                toast.success('Perfil corporativo registrado');
                await fetchPerfil();
            }
        } catch (err: any) {
            console.error('Error registrando perfil:', err);
            toast.error(err.message || 'Error al registrar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!perfilId) {
            toast.error('No se encontro el ID del perfil');
            return;
        }

        setUpdating(true);

        try {
            await apiFetch(`/api/configuracion/parametrizacion/actualizar/corporativo/perfil/${perfilId}`, {
                method: 'PUT',
                body: {
                    ...updateForm,
                    represeLegaEmpresa: resolveApiEntityId(updateForm.represeLegaEmpresa),
                    tipo_sociedad: resolveApiEntityId(updateForm.tipo_sociedad),
                    direccion_empresa_relacion: resolveApiEntityId(updateForm.direccion_empresa_relacion),
                },
            });

            toast.success('Informacion actualizada');
            setIsUpdateModalOpen(false);
            await fetchPerfil();
        } catch (err: any) {
            console.error('Error actualizando perfil:', err);
            toast.error(err.message || 'Error al actualizar');
        } finally {
            setUpdating(false);
        }
    };

    const getTipoSociedadDisplay = (tipoSociedad: any) => {
        if (!tipoSociedad) return '-';

        const nombre = tipoSociedad.nombre_sociedad || '';
        const sigla = tipoSociedad.tipo_sociedad?.tipo_sociedad || '';

        return sigla ? `${nombre} (${sigla})` : nombre;
    };

    return (
        <div className="container mx-auto max-w-5xl space-y-6 p-4">
            <Card className="border-t-4 border-t-primary shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="text-primary" />
                        {perfil ? 'Informacion de la Empresa' : 'Registro de Perfil Corporativo'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {(hayOpcionesPerfil || loadingPerfilesScope) && (
                                <SelectorRazonSocialPerfil
                                    opciones={perfilesScopeOpciones}
                                    value={perfil ? (selectedPerfilScopeId || perfilId) : selectedVistaId}
                                    onChange={(id) => void handleCambioPerfilScope(id, 'vista')}
                                    loading={loadingPerfilesScope || loadingPerfilDetalle}
                                    disabled={Boolean(perfil) && !selectorPerfilEditable}
                                    mostrarCrearNuevo={!perfil && scopeModo !== 'tenant_corporativo'}
                                />
                            )}

                            {loadingPerfilDetalle && (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            )}

                            {perfil && !loadingPerfilDetalle && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted p-5 md:grid-cols-4">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-primary">Razon Social</p>
                                            <p className="text-lg font-bold">{perfil.razon_social}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-primary">NIT / Documento</p>
                                            <p className="font-medium">{perfil.nit_ruc_rtn}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-primary">Tipo de Sociedad</p>
                                            <p className="font-medium">{getTipoSociedadDisplay(perfil.tipo_sociedad)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-primary">Publicacion</p>
                                            <p className="font-medium">{perfil.publicar === true ? 'Publicado' : 'Privado'}</p>
                                        </div>
                                    </div>
                                    <Button onClick={() => setIsUpdateModalOpen(true)} className="h-12 w-full">
                                        <Edit className="mr-2 h-5 w-5" /> Editar Informacion Corporativa
                                    </Button>
                                </div>
                            )}

                            {!perfil && modoRegistroNuevo && !loadingPerfilDetalle && (
                                <form onSubmit={handleCreateSubmit} className="space-y-8">
                                    <FormularioEmpresa
                                        data={form}
                                        setData={setForm}
                                        representantes={representantes}
                                        tiposSociedad={tiposSociedad}
                                        direcciones={direcciones}
                                    />
                                    <Button type="submit" disabled={submitting} className="h-12 w-full text-lg">
                                        {submitting ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                                        Finalizar Registro de Empresa
                                    </Button>
                                </form>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="text-primary" /> Actualizar Perfil
                        </DialogTitle>
                        <DialogDescription>Actualiza la informacion corporativa de tu empresa</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateSubmit} className="space-y-6 pt-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <SelectorRazonSocialPerfil
                                opciones={
                                    perfilesScopeOpciones.length
                                        ? perfilesScopeOpciones
                                        : perfilId && updateForm.razon_social
                                            ? [{
                                                id: perfilId,
                                                perfilCorporativoId: perfilId,
                                                label: updateForm.razon_social,
                                                razonSocial: updateForm.razon_social,
                                            }]
                                            : []
                                }
                                value={selectedPerfilScopeId || perfilId}
                                onChange={(id) => void handleCambioPerfilScope(id, 'edicion')}
                                loading={loadingPerfilesScope || loadingPerfilDetalle}
                                disabled={!selectorPerfilEditable}
                            />
                        </div>
                        <FormularioEmpresa
                            data={updateForm}
                            setData={setUpdateForm}
                            representantes={representantes}
                            tiposSociedad={tiposSociedad}
                            direcciones={direcciones}
                            ocultarRazonSocial
                        />
                        <div className="flex justify-end gap-3 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={updating || loadingPerfilDetalle} className="min-w-[150px]">
                                {updating ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// PR hecho por Gustavo Pereira el 13-02-2026
