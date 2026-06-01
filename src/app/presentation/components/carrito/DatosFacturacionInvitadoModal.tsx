import React, { useEffect, useMemo, useState } from 'react';
import { Building2, UserRound } from 'lucide-react';
import { apiFetchPublic } from '@/app/services/api';
import terceroService from '@/app/services/terceroService';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const DATOS_FACTURACION_INVITADO_KEY = 'mabs_datos_facturacion_invitado';

export type TipoPersonaFacturacion = 'NATURAL' | 'JURIDICA';

export interface DatosFacturacionBase {
  terceroId?: string;
  tipoPersona: TipoPersonaFacturacion;
  tipoDocumento: string;
  numeroDocumento: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  ciudadId: string;
  departamentoId: string;
  pais: 'CO';
}

export interface DatosFacturacionNatural extends DatosFacturacionBase {
  tipoPersona: 'NATURAL';
  nombreCompleto: string;
}

export interface DatosFacturacionJuridica extends DatosFacturacionBase {
  tipoPersona: 'JURIDICA';
  dv: string;
  razonSocial: string;
}

export type DatosFacturacionInvitado = DatosFacturacionNatural | DatosFacturacionJuridica;

interface FacturacionDraft {
  terceroId: string;
  tipoPersona: TipoPersonaFacturacion;
  tipoDocumento: string;
  numeroDocumento: string;
  nombreCompleto: string;
  dv: string;
  razonSocial: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  ciudadId: string;
  departamentoId: string;
  pais: 'CO';
}

const INITIAL_DRAFT: FacturacionDraft = {
  terceroId: '',
  tipoPersona: 'NATURAL',
  tipoDocumento: '',
  numeroDocumento: '',
  nombreCompleto: '',
  dv: '',
  razonSocial: '',
  email: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  ciudadId: '',
  departamentoId: '',
  pais: 'CO',
};

interface TipoDocumentoCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  validacion: ValidacionDocumento;
}

interface ValidacionDocumento {
  minLength: number;
  maxLength: number;
  soloNumeros: boolean;
  descripcion: string;
}

interface CiudadCatalogo {
  ciudadId: string;
  nombre: string;
}

interface DepartamentoCatalogo {
  departamentoId: string;
  nombre: string;
  ciudades: CiudadCatalogo[];
}

interface FacturacionCatalogos {
  tiposDocumento: TipoDocumentoCatalogo[];
  departamentos: DepartamentoCatalogo[];
}

const esDocumentoEmpresa = (tipo: TipoDocumentoCatalogo): boolean => {
  const texto = `${tipo.codigo} ${tipo.nombre}`.toUpperCase();
  return texto.includes('NIT') || tipo.codigo === '31';
};

export const readDatosFacturacionInvitado = (): DatosFacturacionInvitado | null => {
  const saved = sessionStorage.getItem(DATOS_FACTURACION_INVITADO_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as DatosFacturacionInvitado;
  } catch {
    sessionStorage.removeItem(DATOS_FACTURACION_INVITADO_KEY);
    return null;
  }
};

interface DatosFacturacionInvitadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (datosFacturacion: DatosFacturacionInvitado) => Promise<void> | void;
}

export default function DatosFacturacionInvitadoModal({
  open,
  onOpenChange,
  onContinue,
}: DatosFacturacionInvitadoModalProps): React.ReactElement {
  const [draft, setDraft] = useState<FacturacionDraft>(INITIAL_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [catalogos, setCatalogos] = useState<FacturacionCatalogos>({ tiposDocumento: [], departamentos: [] });
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [catalogosError, setCatalogosError] = useState('');
  const [formError, setFormError] = useState('');
  const [buscandoTercero, setBuscandoTercero] = useState(false);
  const [terceroEncontrado, setTerceroEncontrado] = useState(false);

  useEffect(() => {
    if (!open) return;
    const saved = readDatosFacturacionInvitado();
    if (saved) setDraft((current) => ({ ...current, ...saved }));
    setLoadingCatalogos(true);
    setCatalogosError('');
    apiFetchPublic('/api/carrito/catalogos/facturacion', { method: 'GET' })
      .then((response) => {
        const next = response?.data as FacturacionCatalogos;
        setCatalogos(next);
        setDraft((current) => ({
          ...current,
          tipoDocumento: next.tiposDocumento.some((tipo) => tipo.codigo === current.tipoDocumento)
            ? current.tipoDocumento
            : next.tiposDocumento.find((tipo) => !esDocumentoEmpresa(tipo))?.codigo || next.tiposDocumento[0]?.codigo || '',
        }));
      })
      .catch(() => setCatalogosError('No se pudieron cargar los catalogos parametrizados.'))
      .finally(() => setLoadingCatalogos(false));
  }, [open]);

  const tiposDocumentoDisponibles = useMemo(() => {
    const filtrados = catalogos.tiposDocumento.filter((tipo) =>
      draft.tipoPersona === 'JURIDICA' ? esDocumentoEmpresa(tipo) : !esDocumentoEmpresa(tipo)
    );
    return filtrados.length ? filtrados : catalogos.tiposDocumento;
  }, [catalogos.tiposDocumento, draft.tipoPersona]);

  const ciudadesDisponibles = useMemo(
    () => catalogos.departamentos.find((item) => item.departamentoId === draft.departamentoId)?.ciudades || [],
    [catalogos.departamentos, draft.departamentoId]
  );

  const validacionDocumento = useMemo(
    () => catalogos.tiposDocumento.find((tipo) => tipo.codigo === draft.tipoDocumento)?.validacion,
    [catalogos.tiposDocumento, draft.tipoDocumento]
  );

  const setField = (field: keyof FacturacionDraft, value: string): void => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (!open || !draft.tipoDocumento || !draft.numeroDocumento || !validacionDocumento) return;
    const numero = draft.numeroDocumento.trim();
    const longitudValida = numero.length >= validacionDocumento.minLength && numero.length <= validacionDocumento.maxLength;
    const formatoValido = validacionDocumento.soloNumeros ? /^\d+$/.test(numero) : /^[a-zA-Z0-9]+$/.test(numero);
    if (!longitudValida || !formatoValido) {
      setTerceroEncontrado(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBuscandoTercero(true);
      terceroService.buscarPorDocumento(numero)
        .then((tercero) => {
          if (!tercero) {
            setTerceroEncontrado(false);
            setDraft((current) => ({ ...current, terceroId: '' }));
            return;
          }
          setTerceroEncontrado(true);
          setDraft((current) => ({
            ...current,
            ...tercero,
            terceroId: tercero.iud,
            numeroDocumento: numero,
          }));
        })
        .catch(() => setTerceroEncontrado(false))
        .finally(() => setBuscandoTercero(false));
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [draft.numeroDocumento, draft.tipoDocumento, open, validacionDocumento]);

  const handleTipoPersona = (tipoPersona: TipoPersonaFacturacion): void => {
    const disponibles = catalogos.tiposDocumento.filter((tipo) =>
      tipoPersona === 'JURIDICA' ? esDocumentoEmpresa(tipo) : !esDocumentoEmpresa(tipo)
    );
    setDraft((current) => ({
      ...current,
      tipoPersona,
      tipoDocumento: disponibles[0]?.codigo || catalogos.tiposDocumento[0]?.codigo || '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    if (!draft.tipoDocumento || !draft.departamentoId || !draft.ciudadId) {
      setFormError('Selecciona el tipo de documento, el departamento y la ciudad.');
      return;
    }
    if (validacionDocumento) {
      const numero = draft.numeroDocumento.trim();
      const longitudValida = numero.length >= validacionDocumento.minLength && numero.length <= validacionDocumento.maxLength;
      const formatoValido = validacionDocumento.soloNumeros ? /^\d+$/.test(numero) : /^[a-zA-Z0-9]+$/.test(numero);
      if (!longitudValida || !formatoValido) {
        setFormError(`El numero de documento debe tener ${validacionDocumento.descripcion}.`);
        return;
      }
    }
    const common = {
      terceroId: draft.terceroId || undefined,
      tipoPersona: draft.tipoPersona,
      tipoDocumento: draft.tipoDocumento.trim(),
      numeroDocumento: draft.numeroDocumento.trim(),
      email: draft.email.trim(),
      telefono: draft.telefono.trim(),
      direccion: draft.direccion.trim(),
      ciudad: draft.ciudad.trim(),
      departamento: draft.departamento.trim(),
      ciudadId: draft.ciudadId.trim(),
      departamentoId: draft.departamentoId.trim(),
      pais: 'CO' as const,
    };
    const payload: DatosFacturacionInvitado = draft.tipoPersona === 'NATURAL'
      ? { ...common, tipoPersona: 'NATURAL', nombreCompleto: draft.nombreCompleto.trim() }
      : { ...common, tipoPersona: 'JURIDICA', dv: draft.dv.trim(), razonSocial: draft.razonSocial.trim() };

    sessionStorage.setItem(DATOS_FACTURACION_INVITADO_KEY, JSON.stringify(payload));
    setSubmitting(true);
    try {
      await onContinue(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Datos para facturacion</DialogTitle>
          <DialogDescription>
            Completa los datos que se incluiran en la factura de tu compra.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={draft.tipoPersona === 'NATURAL' ? 'default' : 'outline'}
              onClick={() => handleTipoPersona('NATURAL')}
            >
              <UserRound className="mr-2 h-4 w-4" />
              Persona natural
            </Button>
            <Button
              type="button"
              variant={draft.tipoPersona === 'JURIDICA' ? 'default' : 'outline'}
              onClick={() => handleTipoPersona('JURIDICA')}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Empresa
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="factura-tipo-documento">Tipo de documento</Label>
              <Select value={draft.tipoDocumento} onValueChange={(value) => setField('tipoDocumento', value)} disabled={loadingCatalogos}>
                <SelectTrigger id="factura-tipo-documento">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDocumentoDisponibles.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.codigo}>{tipo.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="factura-numero-documento">Numero de documento</Label>
              <Input
                id="factura-numero-documento"
                required
                inputMode={validacionDocumento?.soloNumeros ? 'numeric' : 'text'}
                minLength={validacionDocumento?.minLength}
                maxLength={validacionDocumento?.maxLength}
                pattern={validacionDocumento?.soloNumeros ? '[0-9]+' : '[a-zA-Z0-9]+'}
                value={draft.numeroDocumento}
                onChange={(e) => {
                  const limpio = validacionDocumento?.soloNumeros
                    ? e.target.value.replace(/\D/g, '')
                    : e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                  setField('numeroDocumento', limpio);
                }}
              />
              {validacionDocumento ? <p className="text-xs text-muted-foreground">{validacionDocumento.descripcion}</p> : null}
              {buscandoTercero ? <p className="text-xs text-muted-foreground">Consultando tercero...</p> : null}
              {terceroEncontrado ? <p className="text-xs text-green-700">Tercero encontrado. Datos autocompletados.</p> : null}
            </div>
            {draft.tipoPersona === 'NATURAL' ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="factura-nombre-completo">Nombre completo</Label>
                <Input id="factura-nombre-completo" required value={draft.nombreCompleto} onChange={(e) => setField('nombreCompleto', e.target.value)} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="factura-dv">Digito de verificacion</Label>
                  <Input id="factura-dv" required maxLength={1} pattern="[0-9]" value={draft.dv} onChange={(e) => setField('dv', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="factura-razon-social">Razon social</Label>
                  <Input id="factura-razon-social" required value={draft.razonSocial} onChange={(e) => setField('razonSocial', e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="factura-email">Correo electronico</Label>
              <Input id="factura-email" required type="email" value={draft.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factura-telefono">Telefono</Label>
              <Input id="factura-telefono" required type="tel" value={draft.telefono} onChange={(e) => setField('telefono', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="factura-direccion">Direccion</Label>
              <Input id="factura-direccion" required value={draft.direccion} onChange={(e) => setField('direccion', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factura-departamento">Departamento</Label>
              <Select
                value={draft.departamentoId}
                onValueChange={(value) => {
                  const departamento = catalogos.departamentos.find((item) => item.departamentoId === value);
                  setDraft((current) => ({ ...current, departamentoId: value, departamento: departamento?.nombre || '', ciudadId: '', ciudad: '' }));
                }}
                disabled={loadingCatalogos}
              >
                <SelectTrigger id="factura-departamento"><SelectValue placeholder="Selecciona departamento" /></SelectTrigger>
                <SelectContent>
                  {catalogos.departamentos.map((item) => (
                    <SelectItem key={item.departamentoId} value={item.departamentoId}>{item.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="factura-ciudad">Ciudad</Label>
              <Select
                value={draft.ciudadId}
                onValueChange={(value) => {
                  const ciudad = ciudadesDisponibles.find((item) => item.ciudadId === value);
                  setDraft((current) => ({ ...current, ciudadId: value, ciudad: ciudad?.nombre || '' }));
                }}
                disabled={!draft.departamentoId || loadingCatalogos}
              >
                <SelectTrigger id="factura-ciudad"><SelectValue placeholder={draft.departamentoId ? 'Selecciona ciudad' : 'Primero el departamento'} /></SelectTrigger>
                <SelectContent>
                  {ciudadesDisponibles.map((item) => (
                    <SelectItem key={item.ciudadId} value={item.ciudadId}>{item.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {catalogosError || formError ? <p className="text-sm text-destructive">{catalogosError || formError}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cerrar
            </Button>
            <Button type="submit" disabled={submitting || loadingCatalogos || Boolean(catalogosError)}>
              {submitting ? 'Guardando...' : 'Continuar al pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
