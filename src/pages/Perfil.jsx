import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Lock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, usuariosApi } from '../services/api';
import { Card, Btn, Input, Spinner } from '../components/ui';
import { useAuthStore } from '../store/auth.store';

export default function PerfilPage() {
  const qc      = useQueryClient();
  const usuario = useAuthStore(s => s.usuario);
  const updateUsuario = useAuthStore(s => s.updateUsuario);   // ← agregar

  const [form, setForm] = useState({
    nombre:   usuario?.nombre   || '',
    apellido: usuario?.apellido || '',
    telefono: usuario?.telefono || '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const setP = (k, v) => setPassForm(p => ({ ...p, [k]: v }));
  const [passError, setPassError] = useState('');

  const updateMut = useMutation({
    mutationFn: () => usuariosApi.actualizarPerfil({ nombre: form.nombre, apellido: form.apellido, telefono: form.telefono }),
    onSuccess: () => {
      toast.success('Perfil actualizado');
      // Actualizar el store + localStorage para que el sidebar refresque
      updateUsuario({
        nombre:   form.nombre,
        apellido: form.apellido,
        telefono: form.telefono,
      });
    },
    onError: e => toast.error(e.response?.data?.error || 'Error al actualizar'),
  });

  const passMut = useMutation({
    mutationFn: () => usuariosApi.password(usuario.id, { passwordActual: passForm.actual, passwordNueva: passForm.nueva }),
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      setPassForm({ actual: '', nueva: '', confirmar: '' });
      setPassError('');
    },
    onError: e => toast.error(e.response?.data?.error || 'Contraseña actual incorrecta'),
  });

  const handleGuardarPerfil = () => {
    if (!form.nombre || !form.apellido) { toast.error('Nombre y apellido son requeridos'); return; }
    updateMut.mutate();
  };

  const handleCambiarPass = () => {
    if (!passForm.actual)               { setPassError('Ingresa tu contraseña actual'); return; }
    if (passForm.nueva.length < 6)      { setPassError('Mínimo 6 caracteres'); return; }
    if (passForm.nueva !== passForm.confirmar) { setPassError('Las contraseñas no coinciden'); return; }
    setPassError('');
    passMut.mutate();
  };

  return (
    <div style={{ padding: 28, maxWidth: 640, margin: '0 auto' }} className="animate-fade">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Mi Perfil</h1>
        <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 4 }}>Gestiona tu información personal</p>
      </div>

      {/* Avatar + info */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #1E3A8A, #3B9FD4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--txt)' }}>
              {usuario?.nombre} {usuario?.apellido}
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 3 }}>{usuario?.email}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'rgba(30,58,138,0.1)', color: '#1E3A8A', border: '1px solid rgba(30,58,138,0.2)' }}>
                {usuario?.rol}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Editar datos */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(30,58,138,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={15} color="#1E3A8A"/>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>Datos personales</div>
            <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>Actualiza tu información de contacto</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Input label="Nombre *"   value={form.nombre}   onChange={e => set('nombre', e.target.value)}   placeholder="Juan" />
          <Input label="Apellido *" value={form.apellido} onChange={e => set('apellido', e.target.value)} placeholder="Pérez" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <Input label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="9XXXXXXXX" />
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 8, fontSize: 12, color: 'var(--txt-3)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={13} color="var(--txt-3)"/>
          {usuario?.email} — el email no es editable
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn variant="primary" icon={<Save size={13}/>} onClick={handleGuardarPerfil} loading={updateMut.isPending}>
            Guardar cambios
          </Btn>
        </div>
      </Card>

      {/* Cambiar contraseña */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(30,58,138,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={15} color="#1E3A8A"/>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>Cambiar contraseña</div>
            <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>Mínimo 6 caracteres</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          <Input label="Contraseña actual" type="password" value={passForm.actual}    onChange={e => setP('actual', e.target.value)}    placeholder="••••••" />
          <Input label="Nueva contraseña" type="password"  value={passForm.nueva}     onChange={e => setP('nueva', e.target.value)}     placeholder="Mínimo 6 caracteres" />
          <Input label="Confirmar"         type="password" value={passForm.confirmar} onChange={e => setP('confirmar', e.target.value)} placeholder="Repite la nueva contraseña" />
        </div>

        {passError && (
          <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 8, borderLeft: '3px solid var(--red)', marginBottom: 14 }}>
            {passError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn variant="primary" icon={<Lock size={13}/>} onClick={handleCambiarPass} loading={passMut.isPending}>
            Cambiar contraseña
          </Btn>
        </div>
      </Card>
    </div>
  );
}