import React, { useState } from 'react';
import type { RutaInfo } from '@/app/services/paletaRutaService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface Props {
  rutasDisponibles: RutaInfo[];
  rutaPreseleccionada?: RutaInfo;
  onGuardar: (data: { nombre: string; rutaId: string }) => void;
  onCancelar: () => void;
  cargando?: boolean;
}

export default function CrearPaletaModal({
  rutasDisponibles,
  rutaPreseleccionada,
  onGuardar,
  onCancelar,
  cargando = false,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [rutaId, setRutaId] = useState<string>(rutaPreseleccionada?._id ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !rutaId) return;
    onGuardar({ nombre: nombre.trim(), rutaId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="crear-nombre">Nombre de la paleta</Label>
        <Input
          id="crear-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Paleta dashboard principal"
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="crear-ruta">Ruta asociada</Label>
        <select
          id="crear-ruta"
          value={rutaId}
          onChange={(e) => setRutaId(e.target.value)}
          required
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm
                     shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Seleccionar ruta...</option>
          {rutasDisponibles.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name} — {r.path}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Podrás configurar colores, imagen de fondo y botones al editar la paleta.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onCancelar} disabled={cargando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={cargando || !nombre.trim() || !rutaId}>
          {cargando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando...
            </>
          ) : (
            'Crear paleta'
          )}
        </Button>
      </div>
    </form>
  );
}
