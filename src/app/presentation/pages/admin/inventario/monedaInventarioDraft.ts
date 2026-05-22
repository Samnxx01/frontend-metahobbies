import type { ConversionMonedaConfig, MonedaCopOption, MonedaInventarioConfig } from '@/app/services/inventarioService';

export type MonedaInventarioDraft = {
  monedaBaseId: string;
  monedaCompraId: string;
  simbolo: string;
  decimales: string;
  formato: string;
  convertirPorTrm: boolean;
  conversionesMoneda: ConversionMonedaDraft[];
};

export type ConversionMonedaDraft = {
  id: string;
  monedaOrigen: string;
  monedaDestino: string;
  tasa: string;
  fuente: string;
  fechaVigencia: string;
  activo: boolean;
};

const monedaDefault: MonedaInventarioDraft = {
  monedaBaseId: '',
  monedaCompraId: '',
  simbolo: '$',
  decimales: '2',
  formato: 'es-CO',
  convertirPorTrm: true,
  conversionesMoneda: [],
};

const toConversionDraft = (item: ConversionMonedaConfig): ConversionMonedaDraft => ({
  id: item.id,
  monedaOrigen: item.monedaOrigen,
  monedaDestino: item.monedaDestino,
  tasa: String(item.tasa ?? ''),
  fuente: item.fuente || 'MANUAL',
  fechaVigencia: item.fechaVigencia || '',
  activo: item.activo !== false,
});

export const toMonedaDraft = (config?: MonedaInventarioConfig | null): MonedaInventarioDraft => ({
  monedaBaseId: config?.monedaBaseId || monedaDefault.monedaBaseId,
  monedaCompraId: config?.monedaCompraId || monedaDefault.monedaCompraId,
  simbolo: config?.simbolo || monedaDefault.simbolo,
  decimales: String(config?.decimales ?? monedaDefault.decimales),
  formato: config?.formato || monedaDefault.formato,
  convertirPorTrm: config?.convertirPorTrm ?? monedaDefault.convertirPorTrm,
  conversionesMoneda: (config?.conversionesMoneda || []).map(toConversionDraft),
});

export const conversionLabel = (item: ConversionMonedaDraft): string =>
  `${item.monedaOrigen} -> ${item.monedaDestino}`;

export const monedaId = (moneda: MonedaCopOption): string => String(moneda._id || moneda.iud || '').trim();

export const monedaCodigo = (moneda: MonedaCopOption): string => String(moneda.monedas || '').trim().toUpperCase();

export const monedaLabel = (moneda: MonedaCopOption): string => monedaCodigo(moneda);
