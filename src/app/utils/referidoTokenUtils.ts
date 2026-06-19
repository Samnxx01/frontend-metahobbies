/** Token referido cifrado: ivHex (32 chars) + ':' + payloadHex */
const REFERIDO_TOKEN_RE = /^[a-f0-9]{32}:[a-f0-9]+$/i;

export function isReferidoTokenComplete(token: string): boolean {
  return REFERIDO_TOKEN_RE.test(String(token || '').trim());
}

/** Elige el token más completo (evita :token en ruta truncado por el navegador). */
export function resolveReferidoToken(...candidates: Array<string | null | undefined>): string {
  const normalized = candidates
    .map((value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    })
    .filter(Boolean);

  const complete = normalized.find(isReferidoTokenComplete);
  if (complete) return complete;

  const withColon = normalized
    .filter((t) => t.includes(':'))
    .sort((a, b) => b.length - a.length)[0];
  if (withColon) return withColon;

  return normalized.sort((a, b) => b.length - a.length)[0] || '';
}
