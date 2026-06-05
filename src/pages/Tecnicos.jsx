import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Pencil, Lock, PowerOff, Power, Phone, Mail, MapPin, Car, CreditCard, Package, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';
import { tecnicosApi, stockApi } from '../services/api';
import { Card, Btn, Modal, Input, Avatar, Spinner, Empty } from '../components/ui';
import { useAuthStore } from '../store/auth.store';

// ─── CSS responsivo ───────────────────────────────────────────
const CSS = `
  .tec-row       { flex-wrap: nowrap; }
  .tec-info-meta { display: flex; }
  .tec-acciones  { flex-direction: row; }

  @media (max-width: 760px) {
    .tec-row {
      flex-wrap: wrap !important;
      gap: 10px !important;
    }
    .tec-info-meta {
      flex-direction: column !important;
      gap: 3px !important;
    }
    .tec-meta-hide {
      display: none !important;
    }
    .tec-acciones {
      width: 100% !important;
      flex-wrap: nowrap !important;
      gap: 4px !important;
      padding-top: 8px !important;
      border-top: 1px solid var(--border) !important;
    }
    .tec-acciones > * {
      flex: 1 !important;
      justify-content: center !important;
      padding-left: 6px !important;
      padding-right: 6px !important;
      font-size: 11px !important;
      min-width: 0 !important;
    }
      .tec-btn-label { display: none !important; }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('tec-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'tec-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}


function Badge({ children, color = 'blue' }) {
  const colors = {
    green:  { bg: 'rgba(22,163,74,0.1)',   color: '#16A34A', border: 'rgba(22,163,74,0.2)'   },
    gray:   { bg: 'rgba(100,116,139,0.1)', color: '#64748B', border: 'rgba(100,116,139,0.2)' },
    yellow: { bg: 'rgba(217,119,6,0.1)',   color: '#D97706', border: 'rgba(217,119,6,0.2)'   },
    blue:   { bg: 'rgba(59,159,212,0.1)',  color: '#3B9FD4', border: 'rgba(59,159,212,0.2)'  },
  };
  const s = colors[color] || colors.blue;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

// ── Modal Inventario Técnico ──────────────────────────────────
function ModalInventario({ open, onClose, tecnico }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventario-tecnico', tecnico?.id],
    queryFn:  () => stockApi.inventarioTecnico(tecnico.id).then(r => r.data),
    enabled:  open && !!tecnico?.id,
  });

  if (!tecnico) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Inventario — ${tecnico.usuario?.nombre} ${tecnico.usuario?.apellido}`} width={500}>
      {/* Header técnico */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-3)', borderRadius: 10, marginBottom: 20 }}>
        <Avatar nombre={tecnico.usuario?.nombre} apellido={tecnico.usuario?.apellido} size={40} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{tecnico.usuario?.nombre} {tecnico.usuario?.apellido}</div>
          <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{tecnico.zonaAsignada || 'Sin zona'}</div>
        </div>
        {data && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{data.totalItems}</div>
            <div style={{ fontSize: 10, color: 'var(--txt-3)', textTransform: 'uppercase' }}>items totales</div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={24} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Items asignados */}
          <div>
            <SectionLabel>Materiales asignados ({data?.asignaciones?.length || 0})</SectionLabel>
            {(data?.asignaciones || []).length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--txt-3)', padding: '10px 0' }}>Sin materiales asignados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.asignaciones.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={15} color="var(--accent)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{a.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>
                        {a.codigo && <span style={{ fontFamily: 'var(--font-mono)' }}>{a.codigo}</span>}
                        {a.categoria && <span style={{ marginLeft: a.codigo ? 6 : 0 }}>· {a.categoria}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--font-mono)' }}>{a.cantidad}</div>
                      <div style={{ fontSize: 10, color: 'var(--txt-3)' }}>{a.unidad || 'und'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ONUs asignadas */}
          {(data?.onus || []).length > 0 && (
            <div>
              <SectionLabel>ONUs asignadas ({data.onus.length})</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.onus.map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <Wifi size={12} color="var(--accent)" />
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--txt)' }}>{o.codigoPon || '—'}</span>
                    <span style={{ fontSize: 10, color: 'var(--txt-3)' }}>{o.producto}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimas entregas */}
          {(data?.ultimasEntregas || []).length > 0 && (
            <div>
              <SectionLabel>Últimas entregas</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.ultimasEntregas.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, fontSize: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--txt)' }}>{e.producto}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--txt)' }}>×{e.cantidad}</span>
                    <span style={{ color: 'var(--txt-3)', fontSize: 11 }}>
                      {new Date(e.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </Modal>
  );
}

// ── Modal Crear ───────────────────────────────────────────────
function ModalCrear({ open, onClose }) {
  const qc      = useQueryClient();
  const usuario = useAuthStore(s => s.usuario);
  const [form, setForm] = useState({ nombre:'', apellido:'', email:'', password:'', telefono:'', dni:'', zonaAsignada:'', vehiculo:'' });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: () => tecnicosApi.crear(form),
    onSuccess: () => {
      toast.success('Técnico creado correctamente');
      qc.invalidateQueries(['tecnicos']);
      onClose();
      setForm({ nombre:'', apellido:'', email:'', password:'', telefono:'', dni:'', zonaAsignada:'', vehiculo:'' });
    },
    onError: e => {
      const msg = e.response?.data?.error || 'Error al crear técnico';
      toast.error(msg);
      if (msg.toLowerCase().includes('email')) setErrors(p => ({ ...p, email: 'Este email ya está registrado' }));
      else if (msg.toLowerCase().includes('dni')) setErrors(p => ({ ...p, dni: 'Este DNI ya está registrado en esta sede' }));
    },
  });

  const handleSubmit = () => {
    const e = {};
    if (!form.nombre)   e.nombre   = 'Requerido';
    if (!form.apellido) e.apellido = 'Requerido';
    if (!form.email)    e.email    = 'Requerido';
    if (!form.password || form.password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (!form.dni || form.dni.length !== 8)         e.dni      = 'DNI debe tener 8 dígitos';
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    mut.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo técnico" width={540}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <SectionLabel>Datos personales</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <Input label="Nombre *"   value={form.nombre}   onChange={e => set('nombre', e.target.value)}   error={errors.nombre}   placeholder="Juan" />
          <Input label="Apellido *" value={form.apellido} onChange={e => set('apellido', e.target.value)} error={errors.apellido} placeholder="Pérez García" />
          <Input label="DNI *"      value={form.dni}      onChange={e => set('dni', e.target.value)}      error={errors.dni}      placeholder="12345678" maxLength={8} />
          <Input label="Teléfono"   value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="9XXXXXXXX" />
        </div>
        <SectionLabel>Acceso al sistema</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Input label="Email *" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} placeholder="tecnico@enetfiber.com" type="email" />
              </div>
              <Btn variant="ghost" size="sm"
                style={{ marginBottom: errors.email ? 22 : 0, flexShrink: 0, fontSize: 11, whiteSpace: 'nowrap', minHeight: 36, }}
                onClick={() => {
                  const nombre   = form.nombre.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  const apellido = form.apellido.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(' ')[0];
                  const sede     = (usuario?.sede?.nombre || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/sede/gi, '').replace(/\s+/g, '').replace(/^[-.]+|[-.]+$/g, '');
                  if (!nombre || !apellido) { toast.error('Ingresa nombre y apellido primero'); return; }
                  set('email', `${nombre[0]}${apellido}${sede ? '.' + sede : ''}@enetfiber.com`);
                }}>
                ✉ Generar
              </Btn>
            </div>
          </div>
          <Input label="Contraseña *" type="password" value={form.password} onChange={e => set('password', e.target.value)} error={errors.password} placeholder="Mínimo 6 caracteres" />
        </div>
        <SectionLabel>Datos de campo</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <Input label="Zona asignada" value={form.zonaAsignada} onChange={e => set('zonaAsignada', e.target.value)} placeholder="Zona Norte..." />
          <Input label="Vehículo"      value={form.vehiculo}     onChange={e => set('vehiculo', e.target.value)}     placeholder="Moto / Camioneta" />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSubmit} loading={mut.isPending}>Crear técnico</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal Editar ──────────────────────────────────────────────
function ModalEditar({ open, onClose, tecnico }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre:'', apellido:'', telefono:'', zonaAsignada:'', vehiculo:'' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  React.useEffect(() => {
    if (tecnico) setForm({
      nombre:       tecnico.usuario?.nombre      || '',
      apellido:     tecnico.usuario?.apellido    || '',
      telefono:     tecnico.usuario?.telefono    || '',
      zonaAsignada: tecnico.zonaAsignada         || '',
      vehiculo:     tecnico.vehiculo             || '',
    });
  }, [tecnico]);

  const mut = useMutation({
    mutationFn: () => tecnicosApi.actualizar(tecnico.id, form),
    onSuccess:  () => { toast.success('Técnico actualizado'); qc.invalidateQueries(['tecnicos']); onClose(); },
    onError:    e  => toast.error(e.response?.data?.error || 'Error'),
  });

  if (!tecnico) return null;
  return (
    <Modal open={open} onClose={onClose} title="Editar técnico" width={480}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--bg-3)', borderRadius: 12, marginBottom: 20 }}>
        <Avatar nombre={tecnico.usuario?.nombre} apellido={tecnico.usuario?.apellido} size={48} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{tecnico.usuario?.nombre} {tecnico.usuario?.apellido}</div>
          <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2 }}>{tecnico.usuario?.email}</div>
          <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>DNI: {tecnico.dni}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Input label="Nombre"        value={form.nombre}       onChange={e => set('nombre', e.target.value)} />
        <Input label="Apellido"      value={form.apellido}     onChange={e => set('apellido', e.target.value)} />
        <Input label="Teléfono"      value={form.telefono}     onChange={e => set('telefono', e.target.value)} placeholder="9XXXXXXXX" />
        <Input label="Zona asignada" value={form.zonaAsignada} onChange={e => set('zonaAsignada', e.target.value)} placeholder="Zona Norte" />
        <div style={{ gridColumn: '1/-1' }}>
          <Input label="Vehículo" value={form.vehiculo} onChange={e => set('vehiculo', e.target.value)} placeholder="Moto / Camioneta" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => mut.mutate()} loading={mut.isPending}>Guardar cambios</Btn>
      </div>
    </Modal>
  );
}

// ── Modal Contraseña ──────────────────────────────────────────
function ModalPassword({ open, onClose, tecnico }) {
  const [password,  setPassword]  = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error,     setError]     = useState('');

  const mut = useMutation({
    mutationFn: () => tecnicosApi.resetPassword(tecnico.id, { password }),
    onSuccess:  () => { toast.success('Contraseña actualizada'); onClose(); setPassword(''); setConfirmar(''); },
    onError:    e  => toast.error(e.response?.data?.error || 'Error'),
  });

  const handleGuardar = () => {
    if (!password || password.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (password !== confirmar)            { setError('Las contraseñas no coinciden'); return; }
    setError('');
    mut.mutate();
  };

  if (!tecnico) return null;
  return (
    <Modal open={open} onClose={onClose} title="Cambiar contraseña" width={380}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-3)', borderRadius: 10, marginBottom: 18 }}>
        <Avatar nombre={tecnico.usuario?.nombre} apellido={tecnico.usuario?.apellido} size={36} />
        <div style={{ fontSize: 13, fontWeight: 600 }}>{tecnico.usuario?.nombre} {tecnico.usuario?.apellido}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <Input label="Nueva contraseña" type="password" value={password}  onChange={e => setPassword(e.target.value)}  placeholder="Mínimo 6 caracteres" />
        <Input label="Confirmar"        type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repite la contraseña" />
        {error && (
          <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 8, borderLeft: '3px solid var(--red)' }}>
            {error}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleGuardar} loading={mut.isPending}>Cambiar contraseña</Btn>
      </div>
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function TecnicosPage() {
  const qc      = useQueryClient();
  const usuario = useAuthStore(s => s.usuario);
  const [showCrear,       setShowCrear]       = useState(false);
  const [tecnicoEditar,   setTecnicoEditar]   = useState(null);
  const [tecnicoPass,     setTecnicoPass]     = useState(null);
  const [tecnicoInventario, setTecnicoInventario] = useState(null);

  const { data: tecnicos, isLoading } = useQuery({
    queryKey: ['tecnicos'],
    queryFn:  () => tecnicosApi.listar().then(r => r.data),
  });

  const toggleActivoMut = useMutation({
    mutationFn: ({ id, activo }) => tecnicosApi.actualizar(id, { activo }),
    onSuccess:  (_, { activo }) => {
      toast.success(activo ? '✓ Técnico habilitado' : 'Técnico deshabilitado');
      qc.invalidateQueries(['tecnicos']);
    },
    onError: () => toast.error('Error al cambiar estado'),
  });

  return (
    <div style={{ padding: 28 }} className="animate-fade">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--txt)' }}>
            Técnicos
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 4 }}>
            {tecnicos?.length || 0} técnico{tecnicos?.length !== 1 ? 's' : ''} en {usuario?.sede?.nombre || 'tu sede'}
          </p>
        </div>
        <Btn variant="primary" size="sm" icon={<UserPlus size={13}/>} onClick={() => setShowCrear(true)}>
          Nuevo técnico
        </Btn>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28}/></div>
      ) : (tecnicos || []).length === 0 ? (
        <Empty icon="👷" title="Sin técnicos registrados" subtitle="Agrega tu primer técnico instalador"/>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {(tecnicos || []).map((t, idx) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px',
              borderBottom: idx < tecnicos.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background .15s',
            }}
              className="tec-row"
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Avatar */}
              <div style={{ opacity: t.activo ? 1 : 0.4, display: 'flex' }}>
                <Avatar nombre={t.usuario.nombre} apellido={t.usuario.apellido} size={42} />
              </div>

              {/* Info principal */}
                <div style={{ flex: 1, minWidth: 0, opacity: t.activo ? 1 : 0.4 }}>                
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>
                    {t.usuario.nombre} {t.usuario.apellido}
                  </span>
                  <Badge color={t.activo ? 'green' : 'gray'}>{t.activo ? '● Activo' : '○ Inactivo'}</Badge>
                  {t._count?.ordenes > 0 && (
                    <Badge color="yellow">{t._count.ordenes} orden{t._count.ordenes !== 1 ? 'es' : ''}</Badge>
                  )}
                </div>
                <div className="tec-info-meta" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { icon: <Mail size={11}/>,       val: t.usuario.email,              hide: false },
                    { icon: <Phone size={11}/>,      val: t.usuario.telefono || '—',    hide: true  },
                    { icon: <CreditCard size={11}/>, val: `DNI: ${t.dni}`,              hide: false },
                    { icon: <MapPin size={11}/>,     val: t.zonaAsignada || 'Sin zona', hide: true  },
                    { icon: <Car size={11}/>,        val: t.vehiculo || 'Sin vehículo', hide: true  },
                  ].map((item, i) => (
                    <div key={i}
                      className={item.hide ? 'tec-meta-hide' : ''}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--txt-3)' }}>
                      {item.icon} {item.val}
                    </div>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="tec-acciones" style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {/* Botones */}
                  <Btn variant="ghost" size="sm" icon={<Package size={11}/>}  onClick={() => setTecnicoInventario(t)}>
                    <span className="tec-btn-label">Inventario</span>
                  </Btn>
                  <Btn variant="ghost" size="sm" icon={<Pencil size={11}/>}   onClick={() => setTecnicoEditar(t)}>
                    <span className="tec-btn-label">Editar</span>
                  </Btn>
                  <Btn variant="ghost" size="sm" icon={<Lock size={11}/>}     onClick={() => setTecnicoPass(t)}>
                    <span className="tec-btn-label">Contraseña</span>
                  </Btn>
                  <Btn
                    variant={t.activo ? 'danger' : 'ghost'}
                    size="sm"
                    icon={t.activo ? <PowerOff size={11}/> : <Power size={11} color="#22c55e"/>}
                    style={!t.activo ? {
                      color: '#22c55e',
                      borderColor: 'rgba(34,197,94,0.4)',
                      background: 'rgba(34,197,94,0.08)',
                    } : {}}                    
                    onClick={() => toggleActivoMut.mutate({ id: t.id, activo: !t.activo })}
                    loading={toggleActivoMut.isPending}>
                    <span className="tec-btn-label">{t.activo ? 'Deshabilitar' : 'Habilitar'}</span>
                  </Btn>
              </div>
            </div>
          ))}
        </Card>
      )}

      <ModalCrear       open={showCrear}             onClose={() => setShowCrear(false)} />
      <ModalEditar      open={!!tecnicoEditar}        onClose={() => setTecnicoEditar(null)}    tecnico={tecnicoEditar} />
      <ModalPassword    open={!!tecnicoPass}          onClose={() => setTecnicoPass(null)}       tecnico={tecnicoPass} />
      <ModalInventario  open={!!tecnicoInventario}    onClose={() => setTecnicoInventario(null)} tecnico={tecnicoInventario} />
    </div>
  );
}