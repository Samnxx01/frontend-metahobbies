import type { ClientProfile } from '@/types/common';

const extraerId = (valor: unknown): string => {
  if (!valor) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'object' && valor !== null) {
    const obj = valor as { _id?: string; iud?: string; id?: string };
    return String(obj._id || obj.iud || obj.id || '').trim();
  }
  return String(valor).trim();
};

export function mapPerfilClienteFromApi(
  perfilRaw: Record<string, unknown> | null | undefined,
): ClientProfile | null {
  if (!perfilRaw || typeof perfilRaw !== 'object') return null;

  const nombre = String(perfilRaw.nombre_cliente || '').trim();
  const apellido = String(perfilRaw.apellido || '').trim();
  const documento = String(perfilRaw.documentoIntentidad ?? '').trim();

  if (!nombre && !apellido && !documento) return null;

  const fechaRaw = perfilRaw.fecha_nacimiento;
  const fecha_nacimiento =
    typeof fechaRaw === 'string'
      ? fechaRaw.split('T')[0] || ''
      : fechaRaw instanceof Date
        ? fechaRaw.toISOString().split('T')[0]
        : '';

  const perfilId = extraerId(perfilRaw._id || perfilRaw.iud);

  return {
    _id: perfilId || undefined,
    nombre_cliente: nombre,
    apellido,
    genero: extraerId(perfilRaw.genero),
    tipoDeIntendidad: extraerId(perfilRaw.tipoDeIntendidad),
    fecha_nacimiento,
    documentoIntentidad: Number(documento) || (documento as unknown as number),
    telefono: Number(String(perfilRaw.telefono ?? '').replace(/\D/g, '')) || 0,
    nacionalidad: extraerId(perfilRaw.nacionalidad),
    prefijo: extraerId(perfilRaw.prefijo),
    paisId: String(perfilRaw.paisId || '1').trim() || '1',
    departamentoId: String(perfilRaw.departamentoId || '').trim(),
    ciudadId: String(perfilRaw.ciudadId || '').trim(),
  };
}
