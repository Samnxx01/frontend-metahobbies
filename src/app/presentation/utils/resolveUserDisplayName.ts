import type { User } from '@/types/common';

type PerfilLike = {
  nombreCompleto?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  nombre_cliente?: string | null;
};

const perfilComoObjeto = (perfil: User['perfil']): PerfilLike | null => {
  if (!perfil || typeof perfil !== 'object') return null;
  return perfil as PerfilLike;
};

/** Nombre visible en navbar/menú. El JWT no trae nombre; usa `localStorage.user` del login. */
export const resolveUserDisplayName = (user: User | null | undefined): string => {
  if (!user) return 'Usuario';

  const perfil = perfilComoObjeto(user.perfil);
  const fromCompleto = String(perfil?.nombreCompleto || '').trim();
  if (fromCompleto) return fromCompleto;

  const fromPerfil = [perfil?.nombre, perfil?.apellido, perfil?.nombre_cliente]
    .filter(Boolean)
    .map(String)
    .join(' ')
    .trim();
  if (fromPerfil) return fromPerfil;

  const fromRoot = [user.nombre, user.apellido].filter(Boolean).map(String).join(' ').trim();
  if (fromRoot) return fromRoot;

  const correo = String(user.correo || '').trim();
  if (correo.includes('@')) return correo.split('@')[0];
  if (correo) return correo;

  return 'Usuario';
};

export const resolveUserInitial = (user: User | null | undefined): string => {
  const name = resolveUserDisplayName(user);
  return name.charAt(0).toUpperCase() || 'U';
};
