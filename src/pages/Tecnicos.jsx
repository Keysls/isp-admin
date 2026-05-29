import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Pencil, Lock, PowerOff, Power, Phone, Mail, MapPin, Car, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { tecnicosApi } from '../services/api';
import { Card, Btn, Modal, Input, Avatar, Spinner, Empty } from '../components/ui';
import { useAuthStore } from '../store/auth.store';

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

// ── Modal Crear ───────────────────────────────────────────────
// El sedeId se asigna automáticamente en el backend desde el admin logueado
function ModalCrear({ open, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nombre:'', apellido:'', email:'', password:'',
    telefono:'', dni:'', zonaAsignada:'', vehiculo:''
  });
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
    onError: e => toast.error(e.response?.data?.error || 'Error al crear técnico'),
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
          <Input label="Email *"      value={form.email}    onChange={e => set('email', e.target.value)}    error={errors.email}    placeholder="tecnico@enetfiber.com" type="email" />
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

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function TecnicosPage() {
  const qc = useQueryClient();
  const usuario = useAuthStore(s => s.usuario);
  const [showCrear,     setShowCrear]     = useState(false);
  const [tecnicoEditar, setTecnicoEditar] = useState(null);
  const [tecnicoPass,   setTecnicoPass]   = useState(null);

  const { data: tecnicos, isLoading } = useQuery({
    queryKey: ['tecnicos'],
    // El backend filtra automáticamente por sede del admin logueado
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {(tecnicos || []).map(t => (
            <Card key={t.id} style={{ opacity: t.activo ? 1 : 0.55, transition: 'all .2s', border: t.activo ? '1px solid var(--border)' : '1px dashed var(--border)' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <Avatar nombre={t.usuario.nombre} apellido={t.usuario.apellido} size={50}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt)', marginBottom: 6 }} className="truncate">
                    {t.usuario.nombre} {t.usuario.apellido}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge color={t.activo ? 'green' : 'gray'}>{t.activo ? '● Activo' : '○ Inactivo'}</Badge>
                    {t._count?.ordenes > 0 && (
                      <Badge color="yellow">{t._count.ordenes} orden{t._count.ordenes !== 1 ? 'es' : ''}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                {[
                  { icon: <Mail size={12}/>,      val: t.usuario.email,              color: 'var(--accent)'  },
                  { icon: <Phone size={12}/>,     val: t.usuario.telefono || '—',    color: 'var(--txt-3)'   },
                  { icon: <CreditCard size={12}/>,val: `DNI: ${t.dni}`,              color: 'var(--txt-3)'   },
                  { icon: <MapPin size={12}/>,    val: t.zonaAsignada || 'Sin zona', color: 'var(--txt-3)'   },
                  { icon: <Car size={12}/>,       val: t.vehiculo || 'Sin vehículo', color: 'var(--txt-3)'   },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--txt-3)', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ color: item.color }} className="truncate">{item.val}</span>
                  </div>
                ))}
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 6, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <Btn variant="ghost" size="sm" icon={<Pencil size={11}/>} onClick={() => setTecnicoEditar(t)}>Editar</Btn>
                <Btn variant="ghost" size="sm" icon={<Lock size={11}/>}   onClick={() => setTecnicoPass(t)}>Contraseña</Btn>
                <Btn
                  variant={t.activo ? 'danger' : 'blue'}
                  size="sm"
                  icon={t.activo ? <PowerOff size={11}/> : <Power size={11}/>}
                  onClick={() => toggleActivoMut.mutate({ id: t.id, activo: !t.activo })}
                  loading={toggleActivoMut.isPending}>
                  {t.activo ? 'Deshabilitar' : 'Habilitar'}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ModalCrear    open={showCrear}       onClose={() => setShowCrear(false)} />
      <ModalEditar   open={!!tecnicoEditar} onClose={() => setTecnicoEditar(null)} tecnico={tecnicoEditar} />
      <ModalPassword open={!!tecnicoPass}   onClose={() => setTecnicoPass(null)}   tecnico={tecnicoPass} />
    </div>
  );
}