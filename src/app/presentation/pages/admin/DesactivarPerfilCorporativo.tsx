import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';

interface PerfilItem {
  _id?: string;
  iud?: string;
  razon_social?: string;
  estado?: boolean;
}

export default function DesactivarPerfilCorporativo(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [perfiles, setPerfiles] = useState<PerfilItem[]>([]);
  const [selectedPerfilId, setSelectedPerfilId] = useState<string>('');

  const cargarPerfiles = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/config/parametrizacion/listarPerfil', {
        method: 'GET',
        useAuth: true
      });
      const perfilesActivos = Array.isArray(res?.perfiles) ? res.perfiles : [];
      setPerfiles(perfilesActivos);
    } catch (error) {
      console.error('Error cargando perfiles corporativos:', error);
      toast.error('No se pudieron cargar los perfiles corporativos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPerfiles();
  }, []);

  const perfilSeleccionado = useMemo(
    () => perfiles.find((p) => String(p._id || p.iud || '') === selectedPerfilId),
    [perfiles, selectedPerfilId]
  );

  const handleDesactivar = async (): Promise<void> => {
    if (!selectedPerfilId) {
      toast.error('Selecciona un perfil corporativo');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/config/parametrizacion/desactivar/perfil/coporativa/${selectedPerfilId}`, {
        method: 'DELETE',
        useAuth: true
      });

      if (!res?.ok) {
        toast.error(res?.msg || 'No se pudo desactivar el perfil corporativo');
        return;
      }

      toast.success('Perfil corporativo desactivado correctamente');
      setSelectedPerfilId('');
      await cargarPerfiles();
    } catch (error) {
      console.error('Error desactivando perfil corporativo:', error);
      toast.error('Error desactivando perfil corporativo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-6 border rounded-lg p-6 bg-card shadow-sm">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        Desactivación de Perfil Corporativo
      </h3>
      <p className="text-sm text-muted-foreground mt-2">
        Esta acción realiza eliminación lógica (`estado=false`) del perfil corporativo.
      </p>

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Perfil corporativo activo
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedPerfilId}
              onChange={(e) => setSelectedPerfilId(e.target.value)}
              disabled={submitting}
            >
              <option value="">Seleccionar perfil</option>
              {perfiles.map((perfil) => {
                const id = String(perfil._id || perfil.iud || '');
                return (
                  <option key={id} value={id}>
                    {perfil.razon_social || id}
                  </option>
                );
              })}
            </select>
          </div>

          {perfilSeleccionado && (
            <div className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-md">
              Perfil seleccionado: <span className="font-medium text-foreground">{perfilSeleccionado.razon_social || selectedPerfilId}</span>
            </div>
          )}

          <Button
            variant="destructive"
            onClick={handleDesactivar}
            disabled={submitting || !selectedPerfilId}
            className="inline-flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Desactivar perfil corporativo
          </Button>
        </div>
      )}
    </div>
  );
}
