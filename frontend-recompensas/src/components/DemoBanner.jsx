// Aviso flotante que solo aparece cuando el frontend está desplegado con VITE_DEMO_MODE=true
// (la instancia de portafolio con datos de prueba), para que quien la visite sepa que no son datos reales.
export default function DemoBanner() {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        zIndex: 9999,
        backgroundColor: '#1E293B',
        color: 'white',
        padding: '10px 16px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
        fontSize: '0.8rem',
        fontWeight: '700',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        maxWidth: '260px',
        lineHeight: 1.4,
      }}
    >
      <span>🎬 Demo con datos de prueba</span>
      <span style={{ fontWeight: '500', color: '#94A3B8' }}>
        Se reinician todos los días
      </span>
    </div>
  );
}
