import { useState, useEffect, lazy, Suspense } from 'react';
import Login from './pages/Login';
import { supabase } from './services/supabase';
import api from './services/api';
import DemoBanner from './components/DemoBanner';

const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Tienda      = lazy(() => import('./pages/Tienda'));
const Pizarra     = lazy(() => import('./pages/Pizarra'));
const Actividades = lazy(() => import('./pages/actividades'));

export default function App() {
  const [autenticada, setAutenticada] = useState(false);
  const [pantallaActual, setPantallaActual] = useState('dashboard');
  const [nombreProfesora, setNombreProfesora] = useState('Profesora');
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    // Mantener backend activo (evita cold starts en Render free tier)
    if (!import.meta.env.VITE_API_URL) return;
    api.get('/ping').catch(() => {});
    const keepAlive = setInterval(() => api.get('/ping').catch(() => {}), 9 * 60 * 1000);
    return () => clearInterval(keepAlive);
  }, []);

  useEffect(() => {
    // Revisar si hay sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAutenticada(true);
        cargarNombre(session);
      }
    });

    // Escuchar cambios de sesión (login / logout / refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setAutenticada(true);
        if (event === 'SIGNED_IN') cargarNombre(session);
      } else {
        setAutenticada(false);
        setPantallaActual('dashboard');
        setNombreProfesora('Profesora');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const cargarNombre = async (session) => {
    const user = session?.user;
    if (!user) return;
    const nombre =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Profesora';
    setNombreProfesora(nombre.charAt(0).toUpperCase() + nombre.slice(1));
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  const manejarLoginExitoso = () => {
    // onAuthStateChange se encarga del resto
  };

  const cambiarPantalla = (pantalla) => {
    setPantallaActual(pantalla);
    setMenuAbierto(false);
  };

  // ==========================================
  // 1. PANTALLA DE BLOQUEO (LOGIN)
  // ==========================================
  if (!autenticada) {
    return (
      <>
        <DemoBanner />
        <Login onLoginExitoso={manejarLoginExitoso} />
      </>
    );
  }

  // ==========================================
  // 2. APLICACIÓN PRINCIPAL (AUTENTICADA)
  // ==========================================
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#F8FAFC', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      <DemoBanner />

      {/* MENÚ LATERAL (SIDEBAR) */}
      <aside className={`app-sidebar${menuAbierto ? ' sidebar-open' : ''}`} style={{ width: '280px', backgroundColor: '#1E293B', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '4px 0 15px rgba(0,0,0,0.1)', zIndex: 10 }}>

        {/* Logo y Título */}
        <div>
          <div style={{ padding: '30px 20px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #334155', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#6366F1', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.4)' }}>
              🍎
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '900', letterSpacing: '0.5px' }}>Gestion de clases</h1>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Panel de Control</span>
            </div>
          </div>

          {/* Botones de Navegación */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 15px' }}>
            <BotonNavegacion
              activo={pantallaActual === 'dashboard'}
              onClick={() => cambiarPantalla('dashboard')}
              icono="👨‍🎓"
              texto="Gestión de Alumnos"
            />
            <BotonNavegacion
              activo={pantallaActual === 'tienda'}
              onClick={() => cambiarPantalla('tienda')}
              icono="🎁"
              texto="Tienda de Premios"
            />
            <BotonNavegacion
              activo={pantallaActual === 'pizarra'}
              onClick={() => cambiarPantalla('pizarra')}
              icono="🎯"
              texto="Modo Pizarra"
            />
            <BotonNavegacion
              activo={pantallaActual === 'actividades'}
              onClick={() => cambiarPantalla('actividades')}
              icono="📝"
              texto="Actividades"
            />
          </nav>
        </div>

        {/* Zona inferior: Perfil y Cerrar Sesión */}
        <div style={{ padding: '20px', backgroundColor: '#0F172A', borderTop: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#475569', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: 'white' }}>
              {nombreProfesora.charAt(0)}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{nombreProfesora}</h4>
              <span style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: 'bold' }}>● En línea</span>
            </div>
          </div>

          <button
            onClick={cerrarSesion}
            style={{ width: '100%', padding: '10px', backgroundColor: '#ef444420', color: '#EF4444', border: '1px solid #ef444440', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#EF4444'; e.currentTarget.style.color = 'white'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ef444420'; e.currentTarget.style.color = '#EF4444'; }}
          >
            <span>🚪</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {menuAbierto && <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)} />}

      {/* ÁREA PRINCIPAL (Donde cambian las pantallas) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        <header className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">☰</button>
          <span style={{ fontWeight: '800', fontSize: '1.05rem' }}>Gestion de clases</span>
        </header>

        <main style={{ flex: 1, padding: 'clamp(20px, 4vw, 40px)', overflowY: 'auto' }}>
          <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94A3B8', fontSize: '1rem' }}>Cargando...</div>}>
            {pantallaActual === 'dashboard' && <Dashboard />}
            {pantallaActual === 'tienda' && <Tienda />}
            {pantallaActual === 'pizarra' && <Pizarra />}
            {pantallaActual === 'actividades' && <Actividades />}
          </Suspense>
        </main>
      </div>

    </div>
  );
}

// ==========================================
// COMPONENTE AUXILIAR: Botón del Menú
// ==========================================
function BotonNavegacion({ activo, onClick, icono, texto }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        padding: '14px 20px',
        width: '100%',
        backgroundColor: activo ? '#6366F1' : 'transparent',
        color: activo ? 'white' : '#94A3B8',
        border: 'none',
        borderRadius: '14px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: activo ? '800' : '600',
        transition: 'all 0.2s',
        textAlign: 'left'
      }}
      onMouseOver={(e) => !activo && (e.currentTarget.style.backgroundColor = '#334155')}
      onMouseOut={(e) => !activo && (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <span style={{ fontSize: '1.3rem' }}>{icono}</span>
      {texto}
    </button>
  );
}