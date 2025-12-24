
import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';

interface RepresentanteLegal {
  nombre_representante_legal: string;
  cargo_representante_legal: string;
}

interface TipoSociedad {
  nombre: string;
  descripcion: string;
}

interface RegisUsuario {
  correo: string;
  rol: string;
}

interface PerfilEmpresa {
  _id: string;
  razon_social: string;
  estado: boolean;
  represeLegaEmpresa: RepresentanteLegal;
  tipo_sociedad: TipoSociedad;
  direccion_empresa_relacion?: Record<string, any>;
  regisUsuario: RegisUsuario;
}

const SectorIndustriaEmpresa = () => {
  const [perfiles, setPerfiles] = useState<PerfilEmpresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ sector_empresarial: '', numero_empleados: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchPerfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/config/parametrizacion/sector-industria-empresa', { method: 'GET' });
      if (data.ok && Array.isArray(data.perfiles)) {
        setPerfiles(data.perfiles);
      } else {
        setError('No se pudieron obtener los perfiles.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener los perfiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerfiles();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await apiFetch('/api/configuracion/parametrizacion/sector-industria-empresa', {
        method: 'POST',
        body: {
          sector_empresarial: form.sector_empresarial,
          numero_empleados: Number(form.numero_empleados),
        },
      });
      setFormSuccess('Guardado correctamente');
      setForm({ sector_empresarial: '', numero_empleados: '' });
      await fetchPerfiles();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Sector e Industria de la Empresa</h2>
      <form onSubmit={handleFormSubmit} className="max-w-md mx-auto mb-6 bg-card p-4 rounded-lg shadow flex flex-col gap-3 border border-border">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Sector empresarial</span>
          <input
            name="sector_empresarial"
            value={form.sector_empresarial}
            onChange={handleFormChange}
            className="bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ej: Tecnología y software"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Número de empleados</span>
          <input
            name="numero_empleados"
            value={form.numero_empleados}
            onChange={handleFormChange}
            className="bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ej: 120"
            type="number"
            min="1"
            required
          />
        </label>
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded px-4 py-2 mt-2 font-semibold disabled:opacity-60"
          disabled={formLoading}
        >
          {formLoading ? 'Guardando...' : 'Guardar'}
        </button>
        {formError && <div className="text-destructive text-sm">{formError}</div>}
        {formSuccess && <div className="text-success text-sm">{formSuccess}</div>}
      </form>
      {loading && <div>Cargando...</div>}
      {!loading && error && (
        <div className="text-red-500 text-center py-4">{error}</div>
      )}
      {!loading && !error && perfiles.length === 0 && (
        <div className="text-center py-4">No hay datos.</div>
      )}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {perfiles.map((perfil) => (
          <div key={perfil._id} className="rounded-lg shadow bg-card p-4 flex flex-col gap-2 border border-border">
            <div className="font-bold text-lg mb-1">{perfil.razon_social}</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`px-2 py-1 rounded ${perfil.estado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{perfil.estado ? 'Activo' : 'Inactivo'}</span>
            </div>
            <div><span className="font-semibold">Nombre Rep. Legal:</span> {perfil.represeLegaEmpresa?.nombre_representante_legal || '-'}</div>
            <div><span className="font-semibold">Cargo Rep. Legal:</span> {perfil.represeLegaEmpresa?.cargo_representante_legal || '-'}</div>
            <div><span className="font-semibold">Tipo Sociedad:</span> {perfil.tipo_sociedad?.nombre || '-'}</div>
            <div><span className="font-semibold">Descripción Sociedad:</span> {perfil.tipo_sociedad?.descripcion || '-'}</div>
            <div><span className="font-semibold">Correo Admin:</span> {perfil.regisUsuario?.correo || '-'}</div>
            <div><span className="font-semibold">Rol Admin:</span> {perfil.regisUsuario?.rol || '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectorIndustriaEmpresa;
