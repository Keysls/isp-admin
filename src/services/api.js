import axios from 'axios';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    // No redirigir si el 401 viene del propio endpoint de login
    // (en ese caso el error es "credenciales incorrectas", lo maneja el formulario)
    const esLogin = err.config?.url?.includes('/auth/login');

    if (err.response?.status === 401 && !esLogin) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login:  (data) => api.post('/auth/login', data),
  logout: ()     => api.post('/auth/logout'),
  me:     ()     => api.get('/auth/me'),
};

// Técnicos — el admin solo ve/crea los de su sede (backend lo filtra automáticamente)
export const tecnicosApi = {
  listar:    (params) => api.get('/tecnicos', { params }),
  obtener:   (id)     => api.get(`/tecnicos/${id}`),
  crear:     (data)   => api.post('/tecnicos', data),       // sedeId se asigna en el backend
  actualizar:(id, d)  => api.put(`/tecnicos/${id}`, d),
  resetPassword: (id, data)  => api.post(`/tecnicos/${id}/reset-password`, data),
};

// Órdenes — el admin solo ve/crea las de su sede (backend lo filtra automáticamente)
export const ordenesApi = {
  listar:         (params) => api.get('/ordenes', { params }),
  obtener:        (id)     => api.get(`/ordenes/${id}`),
  stats:          ()       => api.get('/ordenes/stats'),
  reportes:       ()       => api.get('/ordenes/reportes'),   // ← AGREGAR
  subirExcel:     (fd)     => api.post('/ordenes/subir-excel', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  confirmarExcel: (data)   => api.post('/ordenes/confirmar-excel', data),
  crear:          (data)   => api.post('/ordenes', data),
  asignar:        (id, tecnicoId) => api.patch(`/ordenes/${id}/asignar`, { tecnicoId }),
  cambiarEstado:  (id, estado)    => api.patch(`/ordenes/${id}/estado`, { estado }),
};

export const instalacionesApi = {
  obtener: (id) => api.get(`/instalaciones/${id}`),
};

// El admin solo puede editar su propio perfil y cambiar contraseñas de sus técnicos
export const usuariosApi = {
  activar:         (id, activo) => api.patch(`/usuarios/${id}/activar`, { activo }),
  password:        (id, data)   => api.patch(`/usuarios/${id}/password`, data),
  actualizarPerfil:(data)       => api.patch('/usuarios/perfil', data),
};

export const contratosApi = {
  listar:         (params) => api.get('/contratos', { params }),
  obtener:        (numero) => api.get(`/contratos/${numero}`),
  mapa:           (params) => api.get('/contratos/mapa', { params }),   // ← NUEVO
  subirExcel:     (formData) => api.post('/contratos/subir-excel', formData),
  confirmarExcel: (data)     => api.post('/contratos/confirmar-excel', data),
};

export const sedesApi = {
  listar: () => api.get('/sedes'),
};
/*
export const puntosRedApi = {
  listar:     (params) => api.get('/puntos-red', { params }),
  crear:      (data)   => api.post('/puntos-red', data),
  actualizar: (id, d)  => api.put(`/puntos-red/${id}`, d),
  eliminar:   (id)     => api.delete(`/puntos-red/${id}`),
};*/

export const puntosRedApi = {
  listar:     (params) => api.get('/puntos-red', { params }),
  crear:      (data)   => api.post('/puntos-red', data),
  actualizar: (id, data) => api.put(`/puntos-red/${id}`, data),
  eliminar:   (id)     => api.delete(`/puntos-red/${id}`),
  importar:   (formData) => api.post('/puntos-red/importar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};



export default api;