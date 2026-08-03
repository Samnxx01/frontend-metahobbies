import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, FileText, Send, CheckCircle2, XCircle, Loader2, Copy, RefreshCw, FileSearch, ScanLine, X, Camera, History, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/app/presentation/components/admin/DataTable';
import {
  consultarCufe,
  consultarDesdeXml,
  enviarFacturaPrueba,
  consultarEstadoZip,
  listarTrazabilidadTenant,
  listarTrazabilidadPorFactura,
  listarTrazabilidadPorCufe,
  reenviarTransmisionDian,
  type DianConsultaCufeResponse,
  type DianConsultaXmlResponse,
  type DianEnvioResponse,
  type DianZipEstadoResponse,
  type DianTrazabilidadEvento,
  type DianTrazabilidadTipoEvento,
} from '@/app/services/dianService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
const nowTime = new Date().toTimeString().slice(0, 8);

const PAYLOAD_INICIAL = {
  numFac: 'SETP990000001',
  fecFac: today,
  horFac: nowTime,
  valFac: 1000000,
  valIva: 190000,
  valTot: 1190000,
  ofe: {
    nit: '1003800902',
    nombre: 'SANCHEZ RIVEROS JUAN DIEGO',
    ciudad: 'Bogotá',
    departamento: 'Cundinamarca',
    pais: 'CO',
    direccion: 'Carrera 7 No. 1-20',
    email: 'srjuandi800@gmail.com',
  },
  adq: {
    nit: '222222222',
    nombre: 'Consumidor Final',
    ciudad: 'Bogotá',
    pais: 'CO',
    direccion: 'Dirección cliente',
    email: '',
  },
  lineas: [
    { id: 1, descripcion: 'Producto de prueba DIAN', cantidad: 1, precioUnitario: 1000000, subtotal: 1000000, iva: 190000 },
  ],
};

const XML_EJEMPLO = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UUID schemeID="2" schemeName="CUFE-SHA384">
    PEGA_AQUI_EL_CUFE_DE_96_CARACTERES_HEX
  </cbc:UUID>
  <!-- resto del XML UBL 2.1 -->
</Invoice>`;

// ── Extrae el CUFE de un valor escaneado (URL DIAN o hex directo) ──────────────

function extraerCufeDeQr(valor: string): string | null {
  const v = valor.trim();
  // CUFE directo: 96 chars hex
  if (/^[a-f0-9]{96}$/i.test(v)) return v.toLowerCase();
  // URL DIAN: ?documentkey=CUFE o /searchqr?documentkey=CUFE
  try {
    const url = new URL(v);
    const key = url.searchParams.get('documentkey') ?? url.searchParams.get('DocumentKey');
    if (key && /^[a-f0-9]{96}$/i.test(key.trim())) return key.trim().toLowerCase();
  } catch {
    // no es URL válida
  }
  // Buscar patrón hex de 96 chars en cualquier parte del string
  const match = v.match(/[a-f0-9]{96}/i);
  return match ? match[0].toLowerCase() : null;
}

// ── QR Scanner via BarcodeDetector API ───────────────────────────────────────

interface QrScannerModalProps {
  onCufeDetectado: (cufe: string) => void;
  onClose: () => void;
}

function QrScannerModal({ onCufeDetectado, onClose }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [detectando, setDetectando] = useState(false);

  const detener = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    const iniciar = async () => {
      if (!('BarcodeDetector' in window)) {
        setError('Tu navegador no soporta BarcodeDetector. Usa Chrome 88+ o Edge 88+.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setDetectando(true);
        // @ts-ignore — BarcodeDetector no está en los tipos TS estándar
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

        const escanear = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(escanear);
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              const cufe = extraerCufeDeQr(codes[0].rawValue);
              if (cufe) {
                detener();
                onCufeDetectado(cufe);
                return;
              }
            }
          } catch { /* continuar */ }
          rafRef.current = requestAnimationFrame(escanear);
        };
        rafRef.current = requestAnimationFrame(escanear);
      } catch (e: any) {
        setError(e?.message?.includes('Permission')
          ? 'Permiso de cámara denegado. Actívalo en la configuración del navegador.'
          : 'No se pudo acceder a la cámara.');
      }
    };
    void iniciar();
    return () => detener();
  }, [detener, onCufeDetectado]);

  const handleClose = () => { detener(); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-button/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 rounded-xl overflow-hidden bg-button shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-button/80">
          <div className="flex items-center gap-2 text-button-foreground text-sm font-medium">
            <Camera className="h-4 w-4" />
            Apunta al QR de la factura
          </div>
          <button onClick={handleClose} className="text-button-foreground/70 hover:text-button-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="p-6 text-center text-sm text-destructive space-y-2">
            <XCircle className="h-8 w-8 mx-auto text-destructive" />
            <p>{error}</p>
            <Button size="sm" variant="outline" onClick={handleClose} className="mt-2">Cerrar</Button>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full aspect-square object-cover"
              muted
              playsInline
            />
            {/* Marco de escaneo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-success/50 rounded-tl-md" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-success/50 rounded-tr-md" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-success/50 rounded-bl-md" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-success/50 rounded-br-md" />
                {detectando && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-success/50 animate-bounce" style={{ animationDuration: '1.5s' }} />
                )}
              </div>
            </div>
          </div>
        )}

        {!error && (
          <p className="text-center text-xs text-button-foreground/50 py-3">
            Detectando automáticamente...
          </p>
        )}
      </div>
    </div>
  );
}

function RespuestaJson({ data, label }: { data: unknown; label: string }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2 text-xs">
          <Copy className="h-3 w-3 mr-1" />
          {copied ? '¡Copiado!' : 'Copiar'}
        </Button>
      </div>
      <pre className="rounded-md bg-muted p-3 text-xs overflow-auto max-h-72 font-mono leading-relaxed whitespace-pre-wrap break-all">
        {text}
      </pre>
    </div>
  );
}

function EstadoBadge({ esValida }: { esValida: boolean }) {
  return esValida ? (
    <Badge className="gap-1 bg-success/10 text-success hover:bg-success/10">
      <CheckCircle2 className="h-3.5 w-3.5" /> Válida ante DIAN
    </Badge>
  ) : (
    <Badge className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10">
      <XCircle className="h-3.5 w-3.5" /> No válida / Error
    </Badge>
  );
}

// ── Tab 1 — Consultar por CUFE ────────────────────────────────────────────────

function TabConsultarCufe() {
  const [cufe, setCufe] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<DianConsultaCufeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerAbierto, setScannerAbierto] = useState(false);

  const handleConsultar = async () => {
    if (cufe.trim().length !== 96) {
      setError('El CUFE debe tener exactamente 96 caracteres hexadecimales.');
      return;
    }
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const res = await consultarCufe(cufe.trim());
      setResultado(res);
    } catch (err: any) {
      setError(err?.message || 'Error al consultar DIAN');
    } finally {
      setLoading(false);
    }
  };

  const handleCufeEscaneado = (cufeDetectado: string) => {
    setScannerAbierto(false);
    setCufe(cufeDetectado);
    setError(null);
    setResultado(null);
  };

  return (
    <div className="space-y-4">
      {scannerAbierto && (
        <QrScannerModal
          onCufeDetectado={handleCufeEscaneado}
          onClose={() => setScannerAbierto(false)}
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="cufe-input">CUFE (hash SHA384 — 96 caracteres hex)</Label>
        <div className="flex gap-2">
          <Input
            id="cufe-input"
            value={cufe}
            onChange={e => setCufe(e.target.value)}
            placeholder="a3f2b1c4d5e6... (96 caracteres)"
            className="font-mono text-xs"
            maxLength={96}
          />
          <Button
            variant="outline"
            onClick={() => setScannerAbierto(true)}
            disabled={loading}
            title="Escanear QR de la factura"
          >
            <ScanLine className="h-4 w-4" />
          </Button>
          <Button onClick={handleConsultar} disabled={loading || cufe.trim().length === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2">{loading ? 'Consultando...' : 'Consultar'}</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Caracteres ingresados: <span className={cufe.length === 96 ? 'text-success font-semibold' : 'text-muted-foreground'}>{cufe.length}/96</span>
          {' · '}
          <button
            type="button"
            className="underline hover:text-foreground transition-colors"
            onClick={() => setScannerAbierto(true)}
          >
            Escanear QR de la factura
          </button>
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {resultado && (
        <div className="space-y-3">
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Resultado</span>
            <EstadoBadge esValida={resultado.data?.esValida ?? false} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Código estado</span>
              <p className="font-mono font-semibold">{resultado.data?.codigoEstado || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Descripción</span>
              <p className="font-semibold">{resultado.data?.descripcion || '—'}</p>
            </div>
          </div>
          {resultado.data?.mensajeError && (
            <div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning">
              <strong>Error DIAN:</strong> {resultado.data.mensajeError}
            </div>
          )}
          <RespuestaJson data={resultado} label="Respuesta completa" />
        </div>
      )}
    </div>
  );
}

// ── Tab 2 — Consultar desde XML ───────────────────────────────────────────────

function TabConsultarXml() {
  const [xml, setXml] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<DianConsultaXmlResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConsultar = async () => {
    if (!xml.trim()) {
      setError('Pega el contenido XML de la factura.');
      return;
    }
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const res = await consultarDesdeXml(xml.trim());
      setResultado(res);
    } catch (err: any) {
      setError(err?.message || 'Error al procesar el XML o consultar DIAN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="xml-input">XML UBL 2.1 de la factura electrónica</Label>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setXml(XML_EJEMPLO)}>
            Cargar ejemplo
          </Button>
        </div>
        <Textarea
          id="xml-input"
          value={xml}
          onChange={e => setXml(e.target.value)}
          placeholder="Pega aquí el XML de la factura electrónica..."
          className="font-mono text-xs min-h-40 resize-y"
        />
        <p className="text-xs text-muted-foreground">
          El sistema extrae automáticamente el CUFE del campo <code className="bg-muted px-1 rounded">cbc:UUID</code> del XML.
        </p>
      </div>

      <Button onClick={handleConsultar} disabled={loading || !xml.trim()} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSearch className="h-4 w-4 mr-2" />}
        {loading ? 'Procesando XML...' : 'Extraer CUFE y Consultar DIAN'}
      </Button>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {resultado && (
        <div className="space-y-3">
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Resultado</span>
            <EstadoBadge esValida={resultado.data?.esValida ?? false} />
          </div>
          <div className="rounded-md bg-muted px-3 py-2 text-xs">
            <span className="text-muted-foreground">CUFE extraído: </span>
            <span className="font-mono break-all">{resultado.cufe || '—'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Código estado</span>
              <p className="font-mono font-semibold">{resultado.data?.codigoEstado || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Descripción</span>
              <p className="font-semibold">{resultado.data?.descripcion || '—'}</p>
            </div>
          </div>
          {resultado.data?.mensajeError && (
            <div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning">
              <strong>Error DIAN:</strong> {resultado.data.mensajeError}
            </div>
          )}
          <RespuestaJson data={resultado} label="Respuesta completa" />
        </div>
      )}
    </div>
  );
}

// ── Tab 3 — Enviar Factura Prueba ─────────────────────────────────────────────

function TabEnviarPrueba() {
  const [payload, setPayload] = useState(JSON.stringify(PAYLOAD_INICIAL, null, 2));
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<DianEnvioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [zipKey, setZipKey] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipResultado, setZipResultado] = useState<DianZipEstadoResponse | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  const handleEnviar = async () => {
    setError(null);
    setResultado(null);
    setZipKey(null);
    setZipResultado(null);

    let parsed: any;
    try {
      parsed = JSON.parse(payload);
    } catch {
      setError('El JSON del payload no es válido. Corrígelo antes de enviar.');
      return;
    }

    setLoading(true);
    try {
      const res = await enviarFacturaPrueba(parsed);
      setResultado(res);
      if (res.data?.zipKey) {
        setZipKey(res.data.zipKey);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al enviar la factura a DIAN');
    } finally {
      setLoading(false);
    }
  };

  const handleConsultarZip = async () => {
    if (!zipKey) return;
    setZipLoading(true);
    setZipError(null);
    try {
      const res = await consultarEstadoZip(zipKey);
      setZipResultado(res);
    } catch (err: any) {
      setZipError(err?.message || 'Error al consultar el estado del ZIP');
    } finally {
      setZipLoading(false);
    }
  };

  const handleReset = () => {
    setPayload(JSON.stringify(PAYLOAD_INICIAL, null, 2));
    setResultado(null);
    setError(null);
    setZipKey(null);
    setZipResultado(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="payload-input">Payload JSON (POST /api/dian/test/enviar)</Label>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleReset}>
            <RefreshCw className="h-3 w-3 mr-1" /> Datos de prueba
          </Button>
        </div>
        <Textarea
          id="payload-input"
          value={payload}
          onChange={e => setPayload(e.target.value)}
          className="font-mono text-xs min-h-64 resize-y"
        />
      </div>

      <Button onClick={handleEnviar} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
        {loading ? 'Enviando a DIAN...' : 'Generar XML, Firmar y Enviar a DIAN'}
      </Button>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {resultado && (
        <div className="space-y-3">
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Resultado envío</span>
            <EstadoBadge esValida={resultado.data?.ok ?? false} />
          </div>

          {zipKey && (
            <div className="rounded-md border bg-success/10 border-success/20 px-3 py-3 space-y-2">
              <p className="text-xs text-success font-medium">ZipKey recibido — úsalo para consultar el estado:</p>
              <p className="font-mono text-xs break-all text-success">{zipKey}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleConsultarZip}
                disabled={zipLoading}
                className="text-xs h-7"
              >
                {zipLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                {zipLoading ? 'Consultando estado...' : 'Consultar estado del ZIP'}
              </Button>
            </div>
          )}

          {zipError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {zipError}
            </div>
          )}

          {zipResultado && (
            <RespuestaJson data={zipResultado} label="Estado del ZIP en DIAN" />
          )}

          <RespuestaJson data={resultado} label="Respuesta envío" />
        </div>
      )}
    </div>
  );
}

// ── Tab 4 — Trazabilidad ──────────────────────────────────────────────────────

const TIPO_EVENTO_INFO: Record<DianTrazabilidadTipoEvento, { label: string; icon: typeof Send; className: string }> = {
  ENVIO_INICIADO: { label: 'Envío iniciado', icon: Send, className: 'bg-info/10 text-info' },
  REINTENTO: { label: 'Reintento', icon: RefreshCw, className: 'bg-warning/10 text-warning' },
  ENVIO_EXITOSO: { label: 'Envío exitoso', icon: CheckCircle2, className: 'bg-success/10 text-success' },
  ENVIO_FALLIDO: { label: 'Envío fallido', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  ACEPTADA_DIAN: { label: 'Aceptada DIAN', icon: CheckCircle2, className: 'bg-success/10 text-success' },
  RECHAZADA_DIAN: { label: 'Rechazada DIAN', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  CONSULTA_ESTADO: { label: 'Consulta estado', icon: Search, className: 'bg-muted text-foreground' },
  CONSULTA_CUFE: { label: 'Consulta CUFE', icon: Search, className: 'bg-muted text-foreground' },
};

function EventoBadge({ tipoEvento }: { tipoEvento: DianTrazabilidadTipoEvento }) {
  const info = TIPO_EVENTO_INFO[tipoEvento] || {
    label: tipoEvento,
    icon: HelpCircle,
    className: 'bg-muted text-foreground',
  };
  const Icon = info.icon;
  return (
    <Badge className={`gap-1 whitespace-nowrap hover:${info.className} ${info.className}`}>
      <Icon className="h-3.5 w-3.5" /> {info.label}
    </Badge>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Diálogo de detalle: mensaje completo + respuesta cruda de un evento (drill-down desde la tabla). */
function EventoDetalleDialog({ evento, onClose }: { evento: DianTrazabilidadEvento | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(evento)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {evento && <EventoBadge tipoEvento={evento.tipoEvento} />}
            <span className="text-sm font-normal text-muted-foreground">
              {evento && formatearFecha(evento.createdAt)}
            </span>
          </DialogTitle>
        </DialogHeader>
        {evento && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {evento.invoiceNumber && (
                <div><span className="text-muted-foreground">Factura: </span>{evento.invoiceNumber}</div>
              )}
              {evento.cufe && (
                <div className="truncate col-span-2"><span className="text-muted-foreground">CUFE: </span><span className="font-mono">{evento.cufe}</span></div>
              )}
              {evento.estadoAnterior && (
                <div><span className="text-muted-foreground">Estado anterior: </span>{evento.estadoAnterior}</div>
              )}
              {evento.estadoNuevo && (
                <div><span className="text-muted-foreground">Estado nuevo: </span>{evento.estadoNuevo}</div>
              )}
              <div><span className="text-muted-foreground">Origen: </span>{evento.origen}</div>
              {evento.zipKey && (
                <div className="truncate col-span-2"><span className="text-muted-foreground">ZipKey: </span><span className="font-mono">{evento.zipKey}</span></div>
              )}
            </div>
            {evento.mensaje && (
              <div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning">
                {evento.mensaje}
              </div>
            )}
            {evento.rawResponse != null && (
              <RespuestaJson data={evento.rawResponse} label="Respuesta cruda DIAN" />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type ModoBusquedaTrazabilidad = 'factura' | 'cufe' | 'tenant';

function TabTrazabilidad() {
  const [modo, setModo] = useState<ModoBusquedaTrazabilidad>('factura');
  const [electronicInvoiceId, setElectronicInvoiceId] = useState('');
  const [cufe, setCufe] = useState('');
  const [tipoEventoFiltro, setTipoEventoFiltro] = useState<string>('TODOS');
  const [loading, setLoading] = useState(false);
  const [eventos, setEventos] = useState<DianTrazabilidadEvento[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenvioMsg, setReenvioMsg] = useState<string | null>(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<DianTrazabilidadEvento | null>(null);

  const columnas = [
    {
      field: 'tipoEvento',
      headerName: 'Evento',
      minWidth: 170,
      render: (row: DianTrazabilidadEvento) => <EventoBadge tipoEvento={row.tipoEvento} />,
    },
    {
      field: 'createdAt',
      headerName: 'Fecha',
      minWidth: 150,
      render: (row: DianTrazabilidadEvento) => (
        <span className="text-xs text-muted-foreground">{formatearFecha(row.createdAt)}</span>
      ),
    },
    {
      field: 'invoiceNumber',
      headerName: 'Factura',
      minWidth: 130,
      render: (row: DianTrazabilidadEvento) => row.invoiceNumber || '—',
    },
    {
      field: 'cufe',
      headerName: 'CUFE',
      minWidth: 140,
      render: (row: DianTrazabilidadEvento) => (
        row.cufe ? <span className="font-mono text-xs">{row.cufe.slice(0, 12)}...</span> : '—'
      ),
    },
    {
      field: 'estado',
      headerName: 'Estado',
      minWidth: 160,
      render: (row: DianTrazabilidadEvento) => (
        <span className="text-xs">
          {row.estadoAnterior || '—'} <span className="text-muted-foreground">→</span> {row.estadoNuevo || '—'}
        </span>
      ),
    },
    {
      field: 'origen',
      headerName: 'Origen',
      minWidth: 100,
      render: (row: DianTrazabilidadEvento) => (
        <Badge variant="outline" className="text-xs font-normal">{row.origen}</Badge>
      ),
    },
    {
      field: 'mensaje',
      headerName: 'Detalle',
      minWidth: 220,
      render: (row: DianTrazabilidadEvento) => (
        <span className="text-xs text-muted-foreground truncate block max-w-56" title={row.mensaje || ''}>
          {row.mensaje || '—'}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      minWidth: 90,
      align: 'center' as const,
      render: (row: DianTrazabilidadEvento) => (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEventoSeleccionado(row)}>
          Ver detalle
        </Button>
      ),
    },
  ];

  const handleBuscar = async () => {
    setError(null);
    setReenvioMsg(null);
    setLoading(true);
    try {
      let res;
      if (modo === 'factura') {
        if (!electronicInvoiceId.trim()) {
          setError('Ingresa el id de la factura electrónica.');
          setLoading(false);
          return;
        }
        res = await listarTrazabilidadPorFactura(electronicInvoiceId.trim());
      } else if (modo === 'cufe') {
        if (!cufe.trim()) {
          setError('Ingresa el CUFE a consultar.');
          setLoading(false);
          return;
        }
        res = await listarTrazabilidadPorCufe(cufe.trim());
      } else {
        res = await listarTrazabilidadTenant(
          tipoEventoFiltro !== 'TODOS' ? { tipoEvento: tipoEventoFiltro } : {},
        );
      }
      setEventos(res.data);
    } catch (err: any) {
      setError(err?.message || 'Error consultando la trazabilidad');
    } finally {
      setLoading(false);
    }
  };

  const handleReenviar = async () => {
    if (!electronicInvoiceId.trim()) {
      setError('Ingresa el id de la factura electrónica para reenviar.');
      return;
    }
    setReenviando(true);
    setReenvioMsg(null);
    setError(null);
    try {
      const res = await reenviarTransmisionDian(electronicInvoiceId.trim());
      setReenvioMsg(
        res.msg || `Reenvío solicitado. Estado: ${res.data?.transmission?.status || 'PENDING'}.`,
      );
      await handleBuscar();
    } catch (err: any) {
      setError(err?.message || 'Error solicitando el reenvío a la DIAN');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label>Buscar por</Label>
          <Select value={modo} onValueChange={(v) => setModo(v as ModoBusquedaTrazabilidad)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="factura">Factura (id)</SelectItem>
              <SelectItem value="cufe">CUFE</SelectItem>
              <SelectItem value="tenant">Todas (tenant)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {modo === 'factura' && (
          <div className="space-y-1.5 flex-1 min-w-48">
            <Label htmlFor="traza-invoice-id">Id de la factura electrónica</Label>
            <Input
              id="traza-invoice-id"
              value={electronicInvoiceId}
              onChange={(e) => setElectronicInvoiceId(e.target.value)}
              placeholder="iud de invoiceElectronic"
              className="font-mono text-xs"
            />
          </div>
        )}

        {modo === 'cufe' && (
          <div className="space-y-1.5 flex-1 min-w-48">
            <Label htmlFor="traza-cufe">CUFE</Label>
            <Input
              id="traza-cufe"
              value={cufe}
              onChange={(e) => setCufe(e.target.value)}
              placeholder="96 caracteres hex"
              className="font-mono text-xs"
              maxLength={96}
            />
          </div>
        )}

        {modo === 'tenant' && (
          <div className="space-y-1.5">
            <Label>Tipo de evento</Label>
            <Select value={tipoEventoFiltro} onValueChange={setTipoEventoFiltro}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {Object.keys(TIPO_EVENTO_INFO).map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>{TIPO_EVENTO_INFO[tipo as DianTrazabilidadTipoEvento].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={handleBuscar} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
          <span className="ml-2">{loading ? 'Buscando...' : 'Buscar historial'}</span>
        </Button>

        {modo === 'factura' && (
          <Button
            variant="outline"
            onClick={handleReenviar}
            disabled={reenviando || !electronicInvoiceId.trim()}
            title="Solicita un nuevo envío a la DIAN de esta factura electrónica"
          >
            {reenviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">{reenviando ? 'Reenviando...' : 'Reenviar a DIAN'}</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {reenvioMsg && (
        <div className="rounded-md border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">
          {reenvioMsg} El resultado final (aceptado/rechazado) llega de forma asíncrona — vuelve a
          buscar el historial en unos segundos para verlo.
        </div>
      )}

      {eventos && (
        <div className="space-y-3">
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Historial ({eventos.length})</span>
          </div>
          <DataTable
            data={eventos.map((e) => ({ ...e, id: e.iud }))}
            columns={columnas}
            minWidth="820px"
          />
        </div>
      )}

      <EventoDetalleDialog evento={eventoSeleccionado} onClose={() => setEventoSeleccionado(null)} />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

const DianConsulta = (): React.ReactElement => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-info/10 p-2">
            <FileText className="h-6 w-6 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Consultor DIAN</h1>
            <p className="text-sm text-muted-foreground">
              Consulta y prueba los endpoints de facturación electrónica ante la DIAN (Ambiente: Habilitación)
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="cufe" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cufe" className="gap-2 text-xs sm:text-sm">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Consultar por </span>CUFE
          </TabsTrigger>
          <TabsTrigger value="xml" className="gap-2 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Consultar desde </span>XML
          </TabsTrigger>
          <TabsTrigger value="enviar" className="gap-2 text-xs sm:text-sm">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Enviar </span>Prueba
          </TabsTrigger>
          <TabsTrigger value="trazabilidad" className="gap-2 text-xs sm:text-sm">
            <History className="h-4 w-4" />
            Trazabilidad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cufe">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consultar por CUFE</CardTitle>
              <CardDescription>
                Ingresa el CUFE (Código Único de Factura Electrónica) de 96 caracteres para obtener
                el estado detallado de la factura directamente desde la DIAN vía <code className="bg-muted px-1 rounded text-xs">GetStatus</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabConsultarCufe />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xml">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consultar desde XML</CardTitle>
              <CardDescription>
                Pega el XML UBL 2.1 de una factura electrónica. El sistema extrae automáticamente
                el CUFE del campo <code className="bg-muted px-1 rounded text-xs">cbc:UUID</code> y consulta su estado en la DIAN.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabConsultarXml />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enviar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enviar Factura de Prueba</CardTitle>
              <CardDescription>
                Genera el XML UBL 2.1, lo firma con XAdES-BES y lo envía al set de pruebas DIAN
                (<code className="bg-muted px-1 rounded text-xs">SendTestSetAsync</code>). Recibe el ZipKey para
                consultar el estado del proceso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabEnviarPrueba />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trazabilidad">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trazabilidad de envío a la DIAN</CardTitle>
              <CardDescription>
                Historial completo de eventos (envíos, reintentos, consultas) de una factura electrónica.
                Desde aquí también puedes solicitar un reenvío a la DIAN.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabTrazabilidad />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DianConsulta;
