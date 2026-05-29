import { create } from 'zustand';
import { authApi } from '../services/api';

// ── Lectura defensiva del localStorage ───────────────────────
// Si está corrupto, limpiamos todo en lugar de crashear la app
const cargarUsuarioInicial = () => {
  try {
    const stored = localStorage.getItem('admin_usuario');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn('localStorage admin_usuario corrupto, limpiando sesión');
    localStorage.removeItem('admin_usuario');
    localStorage.removeItem('admin_token');
    return null;
  }
};

// ── Helper: invalidar TokenSesion huérfano ───────────────────
// Cuando el backend nos dio token pero rechazamos client-side,
// hacemos logout para que no quede una sesión activa 7 días en BD
const invalidarTokenHuerfano = async (token) => {
  try {
    // Set temporal para que el interceptor de axios lo use
    localStorage.setItem('admin_token', token);
    await authApi.logout();
  } catch {
    /* no nos importa si falla — al menos lo intentamos */
  } finally {
    localStorage.removeItem('admin_token');
  }
};

export const useAuthStore = create((set) => ({
  usuario: cargarUsuarioInicial(),
  token:   localStorage.getItem('admin_token') || null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await authApi.login({ email, password, dispositivo: 'Panel Admin' });

      // Solo ADMIN accede al panel admin
      // SUPERADMIN tiene su propio panel (NOC)
      if (data.usuario.rol !== 'ADMIN') {
        await invalidarTokenHuerfano(data.token);
        set({ loading: false });
        return { ok: false, error: 'No tienes acceso al panel de administrador' };
      }

      // ADMIN debe tener sede asignada
      if (!data.usuario.sedeId) {
        await invalidarTokenHuerfano(data.token);
        set({ loading: false });
        return { ok: false, error: 'Tu usuario no tiene sede asignada. Contacta al administrador.' };
      }

      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_usuario', JSON.stringify(data.usuario));
      set({ token: data.token, usuario: data.usuario, loading: false });
      return { ok: true };
    } catch (err) {
      set({ loading: false });
      return { ok: false, error: err.response?.data?.error || 'Error al iniciar sesión' };
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_usuario');
    set({ token: null, usuario: null });
  },

  updateUsuario: (cambios) => {
    set((state) => {
      const nuevoUsuario = { ...state.usuario, ...cambios };
      localStorage.setItem('admin_usuario', JSON.stringify(nuevoUsuario));
      return { usuario: nuevoUsuario };
    });
  },
  
}));