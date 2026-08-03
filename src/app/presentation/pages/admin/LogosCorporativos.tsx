import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Eye, X, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/app/providers/AuthProvider';

const ITEMS_PER_PAGE = 10;

type TenantOption = {
  id: string;
  label: string;
  razonSocial?: string;
  estadoPerfilCorporativo?: string;
};

const getReadableErrorMessage = (error: unknown, fallback: string) => {
  const rawMessage =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : '';

  const cleaned = rawMessage.replace(/^\[\d+\]\s*/, '').trim();
  return cleaned || fallback;
};

export default function LogosCorporativos() {
  const { user } = useAuth();
  const tenantScope = user?.auth?.tenantScope || {};
  const normalizedRole = String(user?.role || user?.rol || '').toUpperCase();
  const isTenantSuperAdmin =
    (!!tenantScope?.tenantSuperAdminId && !tenantScope?.tenantGlobalId) ||
    normalizedRole === 'DIOS' ||
    normalizedRole === 'DESAROLLADOR';
  const isTenantGlobal = !!tenantScope?.tenantGlobalId;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingPublicoId, setUpdatingPublicoId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [selectedPerfilCorporativoId, setSelectedPerfilCorporativoId] = useState<string>('');
  const [loadingTenantOptions, setLoadingTenantOptions] = useState(false);
  const [destinoLogoMeta, setDestinoLogoMeta] = useState<{
    modoParametrizacion?: string;
    sinJerarquiaCorporativoEnCounters?: boolean;
    corporativoSeResuelveEnServidor?: boolean;
  } | null>(null);

  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canDeactivateLogo = (logo: any) => !!logo?.estadoActivo && isTenantGlobal && !isTenantSuperAdmin;
  const canDeleteLogo = () => isTenantSuperAdmin;

  const fetchLogos = async () => {
    setLoading(true);
    try {
      const query = isTenantSuperAdmin && selectedPerfilCorporativoId
        ? `?perfilCorporativoId=${encodeURIComponent(selectedPerfilCorporativoId)}`
        : '';
      const res = await apiFetch(`/api/config/parametrizacion/listar/logos/coporativa${query}`, {
        method: 'GET',
        useAuth: true
      });
      setData(res);
    } catch (err: any) {
      console.error('Error cargando logos:', err);
      toast.error(getReadableErrorMessage(err, 'No pudimos cargar los logos. Intenta nuevamente.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPerfilCorporativoId, isTenantSuperAdmin]);

  useEffect(() => {
    let active = true;

    const fetchTenantOptions = async () => {
      if (!isTenantSuperAdmin) {
        setTenantOptions([]);
        setLoadingTenantOptions(false);
        return;
      }

      setLoadingTenantOptions(true);
      try {
        const res = await apiFetch('/api/config/parametrizacion/listar/tenantglobal/logos/destino', {
          method: 'GET',
          useAuth: true,
          logoutOn401: false
        });

        if (!active) return;

        setDestinoLogoMeta(res?.meta && typeof res.meta === 'object' ? res.meta : null);

        const raw = Array.isArray(res?.data) ? res.data : [];
        const mapped: TenantOption[] = raw
          .map((item: any) => {
            const id = String(item?.perfilCorporativoId || item?.id || item?._id || '').trim();
            const razonSocial = String(item?.razonSocial || '').trim();
            const label = String(item?.label || razonSocial || id).trim();
            const estadoPerfilCorporativo = String(item?.estadoPerfilCorporativo || '').trim();
            return id ? { id, label, razonSocial, estadoPerfilCorporativo } : null;
          })
          .filter(Boolean) as TenantOption[];

        setTenantOptions(mapped);
      } catch (error) {
        console.error('Error cargando opciones de tenant destino:', error);
        if (!active) return;
        setTenantOptions([]);
        setDestinoLogoMeta(null);
      } finally {
        if (active) setLoadingTenantOptions(false);
      }
    };

    fetchTenantOptions();
    return () => {
      active = false;
    };
  }, [isTenantSuperAdmin]);

  const handleViewLogo = async (id: string) => {
    setViewLoading(id);
    try {
      const res = await apiFetch(`/api/config/parametrizacion/listar/logos/coporativa/${id}`, {
        method: 'GET'
      });

      if (res?.ok && res?.logo?.base64) {
        const dataUri = `data:${res.logo.mimetype};base64,${res.logo.base64}`;
        setSelectedLogo({
          id: res.logo.id || id,
          url: dataUri,
          nombre: res.logo.nombre,
          estadoActivo: !!res.logo.estadoActivo,
          estadoPublico: !!res.logo.estadoPublico
        });
      } else {
        toast.error('No pudimos cargar la imagen del logo.');
      }
    } catch (error) {
      console.error('Error al visualizar logo:', error);
      toast.error(getReadableErrorMessage(error, 'No pudimos abrir el logo. Intenta nuevamente.'));
    } finally {
      setViewLoading(null);
    }
  };

  const handleSetActiveLogo = async () => {
    if (!selectedLogo?.id) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/config/parametrizacion/activar/logos/coporativa/${selectedLogo.id}`, {
        method: 'PUT',
        useAuth: true
      });

      if (!res?.ok) {
        toast.error(res?.msg || 'No se pudo activar el logo');
        return;
      }

      toast.success('Logo activado correctamente.');
      setSelectedLogo((prev: any) => (prev ? { ...prev, estadoActivo: true } : prev));
      await fetchLogos();
    } catch (error) {
      console.error('Error al activar logo:', error);
      toast.error(getReadableErrorMessage(error, 'No pudimos activar el logo. Intenta nuevamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!selectedLogo?.id || !isTenantSuperAdmin) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/config/parametrizacion/eliminar/logos/coporativa/${selectedLogo.id}`, {
        method: 'DELETE',
        useAuth: true
      });

      if (!res?.ok) {
        toast.error(res?.msg || 'No se pudo eliminar el logo');
        return;
      }

      toast.success('Logo eliminado correctamente.');
      setSelectedLogo(null);
      await fetchLogos();
    } catch (error) {
      console.error('Error al eliminar logo:', error);
      toast.error(getReadableErrorMessage(error, 'No pudimos eliminar el logo. Intenta nuevamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLogoById = async (logoId: string) => {
    if (!logoId || !isTenantSuperAdmin) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/config/parametrizacion/eliminar/logos/coporativa/${logoId}`, {
        method: 'DELETE',
        useAuth: true
      });

      if (!res?.ok) {
        toast.error(res?.msg || 'No se pudo eliminar el logo');
        return;
      }

      toast.success('Logo eliminado correctamente.');
      if (selectedLogo?.id === logoId) setSelectedLogo(null);
      await fetchLogos();
    } catch (error) {
      console.error('Error al eliminar logo:', error);
      toast.error(getReadableErrorMessage(error, 'No pudimos eliminar el logo. Intenta nuevamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateLogo = async () => {
    if (!selectedLogo?.id || !isTenantGlobal || isTenantSuperAdmin) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/config/parametrizacion/desactivar/logos/coporativa/${selectedLogo.id}`, {
        method: 'PUT',
        useAuth: true
      });

      if (!res?.ok) {
        toast.error(res?.msg || 'No se pudo desactivar el logo');
        return;
      }

      toast.success('Logo desactivado correctamente.');
      setSelectedLogo((prev: any) => (prev ? { ...prev, estadoActivo: false } : prev));
      await fetchLogos();
    } catch (error) {
      console.error('Error al desactivar logo:', error);
      toast.error(getReadableErrorMessage(error, 'No pudimos desactivar el logo. Intenta nuevamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateLogoById = async (logoId: string) => {
    if (!logoId || !isTenantGlobal || isTenantSuperAdmin) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/config/parametrizacion/desactivar/logos/coporativa/${logoId}`, {
        method: 'PUT',
        useAuth: true
      });

      if (!res?.ok) {
        toast.error(res?.msg || 'No se pudo desactivar el logo');
        return;
      }

      toast.success('Logo desactivado correctamente.');
      if (selectedLogo?.id === logoId) {
        setSelectedLogo((prev: any) => (prev ? { ...prev, estadoActivo: false } : prev));
      }
      await fetchLogos();
    } catch (error) {
      console.error('Error al desactivar logo:', error);
      toast.error(getReadableErrorMessage(error, 'No pudimos desactivar el logo. Intenta nuevamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEstadoPublico = async (logoId: string, nextValue: boolean) => {
    setUpdatingPublicoId(logoId);
    try {
      const res = await apiFetch(`/api/config/parametrizacion/publico/logos/coporativa/${logoId}`, {
        method: 'PUT',
        useAuth: true,
        body: { estadoPublico: nextValue }
      });

      if (!res?.ok) {
        toast.error(res?.msg || 'No se pudo actualizar el estado publico');
        return;
      }

      setData((prev: any) => ({
        ...prev,
        logos: Array.isArray(prev?.logos)
          ? prev.logos.map((logo: any) => {
              const currentId = logo._id || logo.id;
              return currentId === logoId ? { ...logo, estadoPublico: nextValue } : logo;
            })
          : prev?.logos
      }));
      if (selectedLogo?.id === logoId) {
        setSelectedLogo((prev: any) => (prev ? { ...prev, estadoPublico: nextValue } : prev));
      }
      toast.success(nextValue ? 'Logo publicado correctamente.' : 'Logo marcado como no publico.');
    } catch (error) {
      console.error('Error al actualizar estado publico:', error);
      toast.error(getReadableErrorMessage(error, 'No pudimos cambiar el estado publico del logo.'));
    } finally {
      setUpdatingPublicoId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Selecciona una imagen');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      if (isTenantSuperAdmin && selectedPerfilCorporativoId) {
        formData.append('perfilCorporativoId', selectedPerfilCorporativoId);
      }

      await apiFetch('/api/config/parametrizacion/guardar/logos/coporativa', {
        method: 'POST',
        body: formData
      });

      toast.success('Logo subido correctamente');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchLogos();
    } catch (err: any) {
      console.error('Error al subir logo:', err);
      toast.error(getReadableErrorMessage(err, 'No pudimos subir el logo. Intenta nuevamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const getFileExtension = (mimetype: string) => mimetype?.split('/')[1]?.toUpperCase() || 'IMG';
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, "d 'de' MMMM, yyyy", { locale: es }) : '-';
  };

  const logosList = useMemo(() => (Array.isArray(data?.logos) ? data.logos : []), [data]);
  const ultimosLogos = logosList.slice(0, 4);
  const totalPages = Math.ceil(logosList.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const logosPaginados = logosList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const renderRow = (logo: any) => {
    const logoId = logo._id || logo.id;
    return (
      <tr key={logoId} className="border-t hover:bg-muted/20 transition-colors">
        <td className="px-4 py-3 truncate max-w-[220px]" title={logo.nombre_documento || logo.nombre}>
          <div className="flex items-center gap-2">
            <span>{logo.nombre_documento || logo.nombre || 'Sin nombre'}</span>
            {logo.estadoActivo && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold">
                Activo
              </span>
            )}
          </div>
        </td>
        {isTenantSuperAdmin && (
          <td className="px-4 py-3 text-xs text-muted-foreground">
            <div className="space-y-1">
              <div className="font-medium text-foreground/90">tenantSuperAdmin (sesión)</div>
              {logo.perfilCorporativoLabel ? (
                <div className="text-[11px] text-muted-foreground/80">
                  Perfil corporativo: {logo.perfilCorporativoLabel}
                </div>
              ) : (
                <div className="text-[11px] text-warning/90">Sin perfil corporativo en el archivo</div>
              )}
            </div>
          </td>
        )}
        <td className="px-4 py-3">
          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
            {getFileExtension(logo.mimetype)}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={!!logo.estadoPublico}
              onCheckedChange={(checked) => handleToggleEstadoPublico(logoId, checked)}
              disabled={updatingPublicoId === logoId}
            />
            <span
              className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                logo.estadoPublico
                  ? 'bg-info/10 text-info'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {logo.estadoPublico ? 'Publico' : 'Privado'}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground text-xs">
          {formatDate(logo.usuCreacion || logo.createdAt)}
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleViewLogo(logoId)}
              disabled={viewLoading === logoId}
            >
              {viewLoading === logoId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 text-primary" />
              )}
            </Button>
            {canDeactivateLogo(logo) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeactivateLogoById(logoId)}
                disabled={submitting}
                className="h-8 px-2 text-xs"
              >
                Desactivar
              </Button>
            )}
            {canDeleteLogo() && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteLogoById(logoId)}
                disabled={submitting}
                className="h-8 px-2 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <Card className="max-w-5xl mx-auto mt-8 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" /> Logos Corporativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : (
            <div className="mb-6">
              {ultimosLogos.length > 0 ? (
                <>
                  <div className="overflow-x-auto border rounded-md">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                          {isTenantSuperAdmin && (
                            <th className="px-4 py-3 text-left font-semibold">Tenant SuperAdmin / Perfil</th>
                          )}
                          <th className="px-4 py-3 text-left font-semibold">Extension</th>
                          <th className="px-4 py-3 text-left font-semibold">Estado Publico</th>
                          <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                          <th className="px-4 py-3 text-center font-semibold">Ver</th>
                        </tr>
                      </thead>
                      <tbody>{ultimosLogos.map(renderRow)}</tbody>
                    </table>
                  </div>
                  {logosList.length > 4 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setIsListModalOpen(true)}
                        className="text-primary hover:underline font-medium text-sm inline-flex items-center gap-1"
                      >
                        Ver todos ({logosList.length}) <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>No hay logos registrados</p>
                </div>
              )}
            </div>
          )}

          <div className="pt-6 border-t bg-muted/10 -mx-6 px-6 pb-2">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4" /> Subir nuevo logo
            </h3>
            {isTenantSuperAdmin && tenantOptions.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Perfil corporativo (parametrización)
                </label>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  {destinoLogoMeta?.sinJerarquiaCorporativoEnCounters
                    ? 'Sin filas previas en tenantjerarquiacounters con corporativo: elige un perfil del catálogo. El tenantSuperAdmin lo toma del JWT.'
                    : 'Perfiles acotados por tenantjerarquiacounters (y coporativo del tenantSuperAdmin). Si hay varios, elige uno; si hay uno solo, el servidor puede resolverlo al subir.'}
                </p>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedPerfilCorporativoId}
                  onChange={(e) => setSelectedPerfilCorporativoId(e.target.value)}
                  disabled={loadingTenantOptions || submitting}
                >
                  <option value="">
                    {destinoLogoMeta?.corporativoSeResuelveEnServidor && tenantOptions.length === 1
                      ? 'Usar único perfil en jerarquía (automático)'
                      : 'Opcional — resolver en servidor si aplica'}
                  </option>
                  {tenantOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !file} className="w-full sm:w-auto">
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Subir
              </Button>
            </div>
            {isTenantSuperAdmin && tenantOptions.length === 0 && !loadingTenantOptions && (
              <p className="text-xs text-muted-foreground mt-2">
                {destinoLogoMeta?.modoParametrizacion === 'jerarquia_sin_perfil_resuelto'
                  ? 'No hay perfiles derivados de tenantjerarquiacounters; puedes subir el logo sin perfil o revisa counters / coporativo del tenantSuperAdmin.'
                  : 'El tenantSuperAdmin del JWT se usa solo; si tienes jerarquía con un corporativo, el servidor lo asignará al subir sin elegir aquí.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isListModalOpen} onOpenChange={setIsListModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Historial de Logos</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  {isTenantSuperAdmin && <th className="px-4 py-3 text-left">Tenant SuperAdmin / Perfil</th>}
                  <th className="px-4 py-3 text-left">Extension</th>
                  <th className="px-4 py-3 text-left">Estado Publico</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-center">Accion</th>
                </tr>
              </thead>
              <tbody>{logosPaginados.map(renderRow)}</tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-xs text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedLogo} onOpenChange={() => setSelectedLogo(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-button/90 border-none">
          <div className="absolute top-2 right-2 z-50">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setSelectedLogo(null)}
              className="rounded-full opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-full h-[80vh] flex items-center justify-center p-4">
            {selectedLogo ? (
              <img src={selectedLogo.url} alt={selectedLogo.nombre} className="max-w-full max-h-full object-contain" />
            ) : (
              <Loader2 className="animate-spin text-button-foreground" />
            )}
          </div>
          <div className="p-4 bg-card text-center">
            <p className="font-medium text-sm">{selectedLogo?.nombre}</p>
            {selectedLogo?.id && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">Estado publico</span>
                <Switch
                  checked={!!selectedLogo?.estadoPublico}
                  onCheckedChange={(checked) => handleToggleEstadoPublico(selectedLogo.id, checked)}
                  disabled={updatingPublicoId === selectedLogo.id}
                />
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    selectedLogo?.estadoPublico
                      ? 'bg-info/10 text-info'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {selectedLogo?.estadoPublico ? 'Publico' : 'Privado'}
                </span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-center gap-3">
              {selectedLogo?.estadoActivo ? (
                <>
                  <span className="inline-flex items-center gap-1 text-success text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Logo activo en navbar
                  </span>
                  {isTenantGlobal && !isTenantSuperAdmin && (
                    <Button
                      variant="outline"
                      onClick={handleDeactivateLogo}
                      disabled={submitting}
                      className="inline-flex items-center gap-2"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      Desactivar
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={handleSetActiveLogo} disabled={submitting} className="inline-flex items-center gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Seleccionar como activo
                </Button>
              )}
              {isTenantSuperAdmin && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteLogo}
                  disabled={submitting}
                  className="inline-flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Eliminar logo
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
