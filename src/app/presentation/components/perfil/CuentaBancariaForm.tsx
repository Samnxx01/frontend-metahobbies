import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Landmark, Pencil, Plus, Save, Star, Trash2, Wallet, X } from 'lucide-react';

import { apiFetch } from '@/app/services/api';
import type { BankAccount, BankAccountType, WompiBankCatalogItem } from '@/types/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TipoDocumento {
    iud: string;
    nombreDocumento: string;
}

interface CuentaBancariaFormProps {
    token?: string;
}

interface FormState {
    nombre_titular: string;
    tipo_documento: string;
    numero_documento: string;
    banco: string;
    banco_codigo: string;
    tipo_cuenta_codigo: 'AHORROS' | 'CORRIENTE';
    numero_cuenta: string;
    correo_titular: string;
    telefono_titular: string;
    es_principal: boolean;
    permite_pago_automatico: boolean;
}

const EMPTY_FORM: FormState = {
    nombre_titular: '',
    tipo_documento: '',
    numero_documento: '',
    banco: '',
    banco_codigo: '',
    tipo_cuenta_codigo: 'AHORROS',
    numero_cuenta: '',
    correo_titular: '',
    telefono_titular: '',
    es_principal: true,
    permite_pago_automatico: false,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export default function CuentaBancariaForm({ token }: CuentaBancariaFormProps): React.ReactElement {
    const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
    const [tiposCuenta, setTiposCuenta] = useState<BankAccountType[]>([]);
    const [bancosCatalogo, setBancosCatalogo] = useState<WompiBankCatalogItem[]>([]);
    const [cuentas, setCuentas] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);

    const cuentaPrincipal = useMemo(
        () => cuentas.find((cuenta) => cuenta.es_principal) || null,
        [cuentas]
    );

    const resetForm = () => {
        setForm({
            ...EMPTY_FORM,
            es_principal: cuentas.length === 0,
        });
        setEditingId(null);
        setShowForm(false);
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [tiposDocRes, tiposCuentaRes, bancosRes, cuentasRes] = await Promise.all([
                apiFetch(`${API_BASE_URL}/perfil/seguridad/tipo/documentos`, { method: 'GET' }),
                apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/tipo/cuenta-bancaria`, { method: 'GET' }),
                apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/bancos-wompi`, { method: 'GET' }),
                apiFetch(`${API_BASE_URL}/perfil/seguridad/cuenta-bancaria`, { method: 'GET' }),
            ]);

            if (tiposDocRes?.ok) setTiposDocumento(tiposDocRes.tipos || []);
            if (tiposCuentaRes?.ok) setTiposCuenta(tiposCuentaRes.tipos || []);
            if (bancosRes?.ok) setBancosCatalogo(bancosRes.bancos || []);
            if (cuentasRes?.ok) setCuentas(cuentasRes.cuentas || []);
        } catch (error) {
            console.error('Error cargando cuentas bancarias:', error);
            toast.error('No se pudo cargar la configuración bancaria');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [token]);

    const handleInputChange = (field: keyof FormState, value: string | boolean) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCreate = () => {
        setEditingId(null);
        setForm({
            ...EMPTY_FORM,
            es_principal: cuentas.length === 0,
        });
        setShowForm(true);
    };

    const handleEdit = (cuenta: BankAccount) => {
        const tipoDocumentoId =
            typeof cuenta.tipo_documento === 'object'
                ? (cuenta.tipo_documento?._id || cuenta.tipo_documento?.iud || '')
                : '';

        const bancoSeleccionado = bancosCatalogo.find(
            (item) => item.wompiBankId === cuenta.banco_codigo
        );

        setEditingId(cuenta.iud);
        setForm({
            nombre_titular: cuenta.nombre_titular || '',
            tipo_documento: tipoDocumentoId,
            numero_documento: cuenta.numero_documento || '',
            banco: bancoSeleccionado?.nombre || cuenta.banco || '',
            banco_codigo: bancoSeleccionado?.wompiBankId || cuenta.banco_codigo || '',
            tipo_cuenta_codigo: cuenta.tipo_cuenta_codigo || 'AHORROS',
            numero_cuenta: cuenta.numero_cuenta || '',
            correo_titular: cuenta.correo_titular || '',
            telefono_titular: cuenta.telefono_titular || '',
            es_principal: !!cuenta.es_principal,
            permite_pago_automatico: !!cuenta.permite_pago_automatico,
        });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const bancoSeleccionado = bancosCatalogo.find((item) => item.wompiBankId === form.banco_codigo);
            const payload = {
                ...form,
                nombre_titular: form.nombre_titular.trim(),
                numero_documento: form.numero_documento.trim(),
                banco: bancoSeleccionado?.nombre || form.banco.trim(),
                banco_codigo: bancoSeleccionado?.wompiBankId || form.banco_codigo.trim() || undefined,
                numero_cuenta: form.numero_cuenta.replace(/\s+/g, ''),
                correo_titular: form.correo_titular.trim() || undefined,
                telefono_titular: form.telefono_titular.trim() || undefined,
                tipo_documento: form.tipo_documento || undefined,
            };

            const endpoint = editingId
                ? `${API_BASE_URL}/perfil/seguridad/cuenta-bancaria/${editingId}`
                : `${API_BASE_URL}/perfil/seguridad/cuenta-bancaria`;

            const response = await apiFetch(endpoint, {
                method: editingId ? 'PUT' : 'POST',
                body: payload,
            });

            if (!response?.ok) {
                toast.error(response?.msg || 'No se pudo guardar la cuenta bancaria');
                return;
            }

            toast.success(response.msg || 'Cuenta bancaria guardada correctamente');
            resetForm();
            await loadData();
        } catch (error: any) {
            console.error('Error guardando cuenta bancaria:', error);
            toast.error(error?.message || 'Error guardando la cuenta bancaria');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            setSaving(true);
            const response = await apiFetch(`${API_BASE_URL}/perfil/seguridad/cuenta-bancaria/${deleteId}`, {
                method: 'DELETE',
            });

            if (!response?.ok) {
                toast.error(response?.msg || 'No se pudo eliminar la cuenta bancaria');
                return;
            }

            toast.success(response.msg || 'Cuenta bancaria eliminada');
            setDeleteId(null);
            if (editingId === deleteId) resetForm();
            await loadData();
        } catch (error: any) {
            console.error('Error eliminando cuenta bancaria:', error);
            toast.error(error?.message || 'Error eliminando la cuenta bancaria');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Card className="shadow-sm border-border bg-card">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-lg md:text-xl font-semibold flex items-center gap-2 text-foreground">
                            <Landmark className="h-5 w-5 text-primary" />
                            Cuenta bancaria para pagos automáticos
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            El sistema usará la cuenta principal con pago automático habilitado.
                        </p>
                    </div>
                    <Button onClick={handleCreate} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva cuenta
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Cargando cuentas bancarias...</p>
                    ) : cuentas.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                            Aún no tienes una cuenta bancaria registrada. Agrega una para dejar listo el pago automático.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cuentaPrincipal && (
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                                    <div className="flex items-center gap-2 font-medium">
                                        <Star className="h-4 w-4 text-primary" />
                                        Cuenta principal configurada
                                    </div>
                                    <p className="mt-1 text-muted-foreground">
                                        {cuentaPrincipal.banco} • {cuentaPrincipal.tipo_cuenta_codigo} • {cuentaPrincipal.numero_cuenta_mascara}
                                    </p>
                                </div>
                            )}

                            {cuentas.map((cuenta) => (
                                <div
                                    key={cuenta.iud}
                                    className="rounded-xl border border-border p-4 bg-background/60 flex flex-col gap-3"
                                >
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-foreground">{cuenta.banco}</span>
                                                {cuenta.es_principal && (
                                                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                                                        Principal
                                                    </span>
                                                )}
                                                {cuenta.permite_pago_automatico && (
                                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                                        Pago automático
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {cuenta.nombre_titular} • {cuenta.tipo_cuenta_codigo} • {cuenta.numero_cuenta_mascara}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Documento: {cuenta.numero_documento}
                                                {cuenta.correo_titular ? ` • ${cuenta.correo_titular}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(cuenta)}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Editar
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => setDeleteId(cuenta.iud)}>
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {showForm && (
                <Card className="shadow-sm border-border bg-card mt-4">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            {editingId ? 'Editar cuenta bancaria' : 'Registrar cuenta bancaria'}
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={resetForm}>
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="nombre_titular">Titular</Label>
                                <Input id="nombre_titular" value={form.nombre_titular} onChange={(e) => handleInputChange('nombre_titular', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="tipo_documento">Tipo de documento</Label>
                                <Select value={form.tipo_documento} onValueChange={(value) => handleInputChange('tipo_documento', value)}>
                                    <SelectTrigger>
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
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="numero_documento">Número de documento</Label>
                                <Input id="numero_documento" value={form.numero_documento} onChange={(e) => handleInputChange('numero_documento', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="banco">Banco</Label>
                                <Select
                                    value={form.banco_codigo}
                                    onValueChange={(value) => {
                                        const banco = bancosCatalogo.find((item) => item.wompiBankId === value);
                                        handleInputChange('banco_codigo', value);
                                        handleInputChange('banco', banco?.nombre || '');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un banco" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bancosCatalogo.map((banco) => (
                                            <SelectItem key={banco.iud} value={banco.wompiBankId}>
                                                {banco.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="banco_codigo">ID de banco Wompi</Label>
                                <Input id="banco_codigo" value={form.banco_codigo} readOnly className="bg-muted" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="tipo_cuenta_codigo">Tipo de cuenta</Label>
                                <Select
                                    value={form.tipo_cuenta_codigo}
                                    onValueChange={(value: 'AHORROS' | 'CORRIENTE') => handleInputChange('tipo_cuenta_codigo', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tiposCuenta.map((tipo) => (
                                            <SelectItem key={tipo.codigo} value={tipo.codigo}>
                                                {tipo.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="numero_cuenta">Número de cuenta</Label>
                                <Input id="numero_cuenta" value={form.numero_cuenta} onChange={(e) => handleInputChange('numero_cuenta', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="correo_titular">Correo del titular</Label>
                                <Input id="correo_titular" value={form.correo_titular} onChange={(e) => handleInputChange('correo_titular', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="telefono_titular">Teléfono del titular</Label>
                                <Input id="telefono_titular" value={form.telefono_titular} onChange={(e) => handleInputChange('telefono_titular', e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-border p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-medium text-foreground">Cuenta principal</p>
                                    <p className="text-sm text-muted-foreground">La cuenta preferida del usuario.</p>
                                </div>
                                <Switch
                                    checked={form.es_principal}
                                    onCheckedChange={(checked) => handleInputChange('es_principal', checked)}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-medium text-foreground">Pago automático</p>
                                    <p className="text-sm text-muted-foreground">Permite que el sistema use esta cuenta al liquidar pagos.</p>
                                </div>
                                <Switch
                                    checked={form.permite_pago_automatico}
                                    onCheckedChange={(checked) => handleInputChange('permite_pago_automatico', checked)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleSubmit} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? 'Guardando...' : editingId ? 'Actualizar cuenta' : 'Guardar cuenta'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar cuenta bancaria</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactiva la cuenta bancaria y evita que el sistema la use para pagos automáticos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={saving}>
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
