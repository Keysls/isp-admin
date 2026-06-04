import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Send, Warehouse, TrendingDown } from 'lucide-react';
import { stockApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Card, Spinner, Table } from '../../components/ui';

// ─── CSS responsivo ───────────────────────────────────────────
const CSS = `
  .adash-header     { flex-direction: row; align-items: center; }
  .adash-bajo-table { display: block; }
  .adash-bajo-list  { display: none; }

  @media (max-width: 1080px) {
    .adash-header {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 10px !important;
    }
    .adash-bajo-table { display: none; }
    .adash-bajo-list  { display: flex; flex-direction: column; gap: 8px; }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('adash-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'adash-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function useMiSede() {
  const usuario = useAuthStore(s => s.usuario);
  return { usuario, sedeId: usuario?.sedeId, sedeNombre: usuario?.sede?.nombre || 'Mi sede' };
}

function Header({ title, subtitle, right }) {
  return (
    <div className="adash-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--txt-2)' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function SedeBadge({ sedeNombre }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>
      {sedeNombre}
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--txt-3)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
        {Icon && <Icon size={17} color="var(--accent)" />}
      </div>
      <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800, color: 'var(--txt)' }}>{value ?? 0}</div>
    </Card>
  );
}

export default function AdminAlmacenDashboard() {
  const { sedeId, sedeNombre } = useMiSede();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stock-stats', sedeId],
    enabled: Boolean(sedeId),
    queryFn: () => stockApi.stats().then(r => r.data),
    staleTime: 30000,
  });

  if (isLoading) return (
    <div style={{ padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner size={28} />
    </div>
  );

  const data = stats || {};

  return (
    <div style={{ padding: 28 }} className="animate-fade">
      <Header
        title="Almacén"
        subtitle="Resumen del inventario de tu sede"
        right={<SedeBadge sedeNombre={sedeNombre} />}
      />

      {/* Stats — auto-fit ya responsivo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
        <Stat label="Items en sede"    value={data.itemsEnSede}            icon={Package}     />
        <Stat label="Técnicos"         value={data.tecnicos}               icon={Send}        />
        <Stat label="Movimientos hoy"  value={data.movimientosHoy}         icon={Warehouse}   />
        <Stat label="Bajo stock"       value={data.stockBajo?.length || 0} icon={TrendingDown} />
      </div>

      <Card style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingDown size={15} /> Productos bajo mínimo
        </div>
        <div style={{ padding: 16 }}>
          {(data.stockBajo || []).length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>No hay alertas de stock para tu sede</div>
          ) : (
            <>
              {/* Desktop: tabla */}
              <div className="adash-bajo-table">
                <Table headers={['Producto', 'Stock', 'Mínimo']}>
                  {data.stockBajo.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '11px 14px', color: 'var(--txt)' }}>{p.nombre}</td>
                      <td style={{ padding: '11px 14px', color: 'var(--red)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.stock}</td>
                      <td style={{ padding: '11px 14px', color: 'var(--txt-3)', fontFamily: 'var(--font-mono)' }}>{p.minimo}</td>
                    </tr>
                  ))}
                </Table>
              </div>

              {/* Móvil: lista */}
              <div className="adash-bajo-list">
                {data.stockBajo.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', background: 'var(--bg-3)',
                    border: '1px solid var(--border)', borderRadius: 8,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nombre}
                    </span>
                    <div style={{ display: 'flex', gap: 12, flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--txt-3)', textTransform: 'uppercase' }}>Stock</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--red)', fontSize: 14 }}>{p.stock}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--txt-3)', textTransform: 'uppercase' }}>Mínimo</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--txt-3)', fontSize: 14 }}>{p.minimo}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}