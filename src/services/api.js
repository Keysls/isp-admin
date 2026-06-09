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
  activar:           (id, activo) => api.patch(`/usuarios/${id}/activar`, { activo }),
  password:          (id, data)   => api.patch(`/usuarios/${id}/password`, data),
  actualizarPerfil:  (data)       => api.patch('/usuarios/perfil', data),
  // Secretarios
  listarSecretarios: ()           => api.get('/usuarios/secretarios'),
  crearSecretario:   (data)       => api.post('/usuarios/secretarios', data),
  actualizar:        (id, data)   => api.patch(`/usuarios/${id}`, data),
  resetPassword:     (id, data)   => api.patch(`/usuarios/${id}/password`, data),
};

export const contratosApi = {
  listar:         (params) => api.get('/contratos', { params }),
  obtener:        (numero) => api.get(`/contratos/${numero}`),
  mapa:           (params) => api.get('/contratos/mapa', { params }),   // ← NUEVO
  subirExcel:     (formData) => api.post('/contratos/subir-excel', formData),
  confirmarExcel: (data)     => api.post('/contratos/confirmar-excel', data),
};

export const sedesApi = {
  listar:         ()       => api.get('/sedes'),
  listarParaEnvio:()       => api.get('/sedes?para_envio=true'),
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

// ─── Inventario ────────────────────────────────────────────────
 
export const productosApi = {
  listar:         (params)     => api.get('/productos', { params }),
  catalogo:       (params)     => api.get('/productos', { params: { ...params, catalogo: true } }),
  categorias:     ()           => api.get('/productos/categorias'),
  crear:          (data)       => api.post('/productos', data),
  actualizar:     (id, data)   => api.put(`/productos/${id}`, data),
  stockPorSede:   (sedeId)     => api.get(`/productos/stock-sede/${sedeId}`),
  entrada:        (data)       => api.post('/productos/entrada', data),
  variantes:      (productoId) => api.get(`/productos/${productoId}/variantes`),
  crearVariante:  (productoId, data) => api.post(`/productos/${productoId}/variantes`, data),
  actualizarVariante: (id, data)    => api.put(`/productos/variantes/${id}`, data),
  eliminarVariante:   (id)          => api.delete(`/productos/variantes/${id}`),
};
 
export const stockApi = {
  inventarioTecnico: (tecnicoId) => api.get(`/stock/tecnico/${tecnicoId}`),
  listar:                 (params)         => api.get('/stock', { params }),
  stats:                  (params)         => api.get('/stock/stats', { params }),
  auditoria:              (params)         => api.get('/stock/auditoria', { params }),
  entrada:                (data)           => api.post('/stock/entrada', data),
  salidaMultiple:         (data)           => api.post('/stock/salida-multiple', data),
  salidaDirecta:          (data)           => api.post('/stock/salida-directa', data),
  asignarCompleto:        (data)           => api.post('/stock/asignar-completo', data),
  listarEnviosPendientes: ({ sedeId })     => api.get('/stock/envios/pendientes', { params: { sedeId } }),
  listarEnviosOrigen:     ({ sedeId })     => api.get('/stock/envios/origen', { params: { sedeId } }),
  confirmarEnvio:         (id)             => api.post(`/stock/envios/${id}/confirmar`),
  cancelarEnvio:          (id, { motivo }) => api.post(`/stock/envios/${id}/cancelar`, { motivo }),
  enviarSede:             (data)           => api.post('/stock/enviar-sede', data),
};
 
export const onusApi = {
  listar:          (params)    => api.get('/onus', { params }),
  disponibles:     (params)    => api.get('/onus', { params: { ...params, solo_disponibles: true } }),
  crear:           (data)      => api.post('/onus', data),
  actualizarCodigo:(id, data)  => api.patch(`/onus/${id}/codigo`, data),
};
 
export const planesApi = {
  listar:     ()           => api.get('/planes'),
  crear:      (data)       => api.post('/planes', data),
  actualizar: (id, data)   => api.put(`/planes/${id}`, data),
  eliminar:   (id)         => api.delete(`/planes/${id}`),
};
 


export default api;

export const notificacionesApi = {
  listar:           (params) => api.get('/notificaciones', { params }),
  marcarLeida:      (id)     => api.patch(`/notificaciones/${id}/leida`),
  marcarTodasLeidas:(sedeId) => api.patch('/notificaciones/marcar-todas-leidas', { sedeId }),
};