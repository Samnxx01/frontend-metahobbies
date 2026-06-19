import type { SaJerarquiaCounterIndice } from './saJerarquiaCounterFilter';

export type SaJerarquiaUsuarioRegistrado = {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  correo?: string | null;
  tienePerfil?: boolean;
  perfilCc?: string | null;
  perfilTelefono?: string | null;
  esAsignadoTenant?: boolean;
};

export type SaJerarquiaLabelMeta = {
  id?: string;
  codigoJerarquia?: string | null;
  coporativoNombre?: string | null;
  rolNombre?: string | null;
  usuarioNombre?: string | null;
  usuarioCorreo?: string | null;
};

export type SaJerarquiaMetaPanel = {
  id: string;
  codigoJerarquia?: string | null;
  coporativoNombre?: string | null;
  /** RegisUsu enlazado por rol.tenantSuperAdmin o tenantId (scope JWT), no solo tenant.usuarioId. */
  usuarioId?: string | null;
  rolNombre?: string | null;
  usuarioNombre?: string | null;
  usuarioCorreo?: string | null;
  counterJerarquia?: { corporativoId?: string | null } | null;
  usuariosJerarquia?: SaJerarquiaUsuarioRegistrado[];
};

function iniciales(nombre?: string | null, correo?: string | null): string {
  const base = String(nombre || correo || '?').trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function esSaAdministradorPlataforma(meta: SaJerarquiaMetaPanel, indice: SaJerarquiaCounterIndice[]): boolean {
  const row = indice.find((r) => String(r.tenantSuperAdminId) === String(meta.id));
  return Boolean(row && !row.corporativoId);
}

function usuariosUnicosDeMeta(meta: SaJerarquiaMetaPanel): SaJerarquiaUsuarioRegistrado[] {
  const out: SaJerarquiaUsuarioRegistrado[] = [];
  const seen = new Set<string>();

  const push = (u: SaJerarquiaUsuarioRegistrado | null | undefined) => {
    const id = String(u?.id || '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(u!);
  };

  if (meta.usuarioNombre || meta.usuarioCorreo) {
    push({
      id: String(meta.usuarioId || `asignado-${meta.id}`),
      nombre: meta.usuarioNombre ?? null,
      correo: meta.usuarioCorreo ?? null,
      tienePerfil: Boolean(meta.usuarioNombre),
      esAsignadoTenant: true,
    });
  }

  for (const u of meta.usuariosJerarquia || []) {
    push(u);
  }

  return out;
}

/** Etiqueta de combo sin secuencia ni rama superior (validación jerárquica solo en backend). */
export function formatSaJerarquiaOptionLabel(meta: SaJerarquiaLabelMeta): string {
  const codigo = String(meta.codigoJerarquia || 'SA').trim();
  const corp = String(meta.coporativoNombre || '').trim();
  const rol = String(meta.rolNombre || '').trim();
  const usr = [meta.usuarioNombre, meta.usuarioCorreo].filter(Boolean).join(' · ');
  if (usr) return rol ? `${codigo} · ${usr} · ${rol}` : `${codigo} · ${usr}`;
  if (corp) return rol ? `${codigo} · ${corp} · ${rol}` : `${codigo} · ${corp}`;
  return rol ? `${codigo} · ${rol}` : codigo;
}

/** Select tenant SA: solo código jerárquico (+ corporativo/rol), sin nombre ni correo de usuario. */
export function formatSaTenantJerarquiaSelectLabel(meta: SaJerarquiaLabelMeta): string {
  const codigo = String(meta.codigoJerarquia || 'SA').trim();
  const corp = String(meta.coporativoNombre || '').trim();
  const rol = String(meta.rolNombre || '').trim();
  if (corp) return rol ? `${codigo} · ${corp} · ${rol}` : `${codigo} · ${corp}`;
  return rol ? `${codigo} · ${rol}` : codigo;
}

/** Solo usuario a parametrizar (formularios reglas DIOS: sin código SA, seq, rama ni sufijo id). */
export function formatSaUsuarioParametrizarLabel(meta: SaJerarquiaLabelMeta): string {
  const rol = String(meta.rolNombre || '').trim();
  const nombre = String(meta.usuarioNombre || '').trim();
  const correo = String(meta.usuarioCorreo || '').trim();
  const usr = nombre
    ? `${nombre}${correo ? ` (${correo})` : ''}`
    : correo || '';
  if (usr) return rol ? `${rol} - ${usr}` : usr;
  const corp = String(meta.coporativoNombre || '').trim();
  if (corp) return rol ? `${rol} - ${corp}` : corp;
  return rol || String(meta.codigoJerarquia || meta.id || 'Tenant SuperAdmin').trim();
}

type Props = {
  meta: SaJerarquiaMetaPanel | null | undefined;
  indice?: SaJerarquiaCounterIndice[];
};

export function SaJerarquiaUsuariosPanel({ meta, indice = [] }: Props) {
  if (!meta) return null;

  const codigo = String(meta.codigoJerarquia || '').trim() || 'SA';
  const esAdminPlataforma = esSaAdministradorPlataforma(meta, indice);
  const usuarios = usuariosUnicosDeMeta(meta);

  return (
    <div className="sa-jerarquia-usuarios-panel mt-2 overflow-hidden rounded-lg border border-border/80 bg-gradient-to-br from-muted/40 to-muted/20 px-3 py-3 text-xs shadow-sm">
      <style>{`
        @keyframes saUsuarioEntrada {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sa-jerarquia-usuario-card {
          animation: saUsuarioEntrada 0.45s ease-out both;
        }
      `}</style>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full bg-primary/10 px-2 font-mono text-[11px] font-semibold text-primary">
          {codigo}
        </span>
        {meta.rolNombre ? (
          <span className="rounded-full border border-sky-300/60 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-900">
            {meta.rolNombre}
          </span>
        ) : null}
        {esAdminPlataforma ? (
          <span className="rounded-full border border-violet-300/60 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-800">
            Administrador SuperAdmin
          </span>
        ) : meta.coporativoNombre ? (
          <span className="truncate text-[11px] text-muted-foreground">{meta.coporativoNombre}</span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Usuarios registrados en esta rama (correo y perfil cuando exista en RegisUsu).
      </p>
      {usuarios.length === 0 ? (
        <p className="mt-2 rounded-md border border-dashed border-border/70 bg-background/50 px-2 py-2 text-[11px] text-muted-foreground">
          Sin usuarios registrados bajo {codigo}.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {usuarios.map((u, idx) => {
            const nombre = [u.nombre, u.apellido].filter(Boolean).join(' ').trim();
            const titulo = nombre || u.correo || 'Usuario';
            return (
              <li
                key={u.id}
                className="sa-jerarquia-usuario-card flex items-start gap-2.5 rounded-md border border-border/60 bg-background/80 px-2.5 py-2"
                style={{ animationDelay: `${idx * 90}ms` }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary"
                  aria-hidden
                >
                  {iniciales(nombre, u.correo)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{titulo}</p>
                  {u.correo ? (
                    <p className="truncate text-[11px] text-muted-foreground">{u.correo}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {u.tienePerfil ? (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-800">
                        Perfil creado
                      </span>
                    ) : (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800">
                        Sin perfilSuperAdmin
                      </span>
                    )}
                    {u.esAsignadoTenant ? (
                      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-800">
                        Asignado al tenant
                      </span>
                    ) : null}
                    {u.perfilCc ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        CC {u.perfilCc}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
