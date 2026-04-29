import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tienda from './pages/Tienda';
import Pizarra from './pages/Pizarra';

export default function App() {
  // Estados principales de la aplicación
  const [autenticada, setAutenticada] = useState(false);
  const [pantallaActual, setPantallaActual] = useState('dashboard');
  const [nombreProfesora, setNombreProfesora] = useState('Profesora');

  // Al cargar la página, revisamos si la profesora ya había iniciado sesión
  useEffect(() => {
    const token = localStorage.getItem('token_profesora');
    const nombre = localStorage.getItem('nombre_profesora');
    if (token) {
      setAutenticada(true);
      if (nombre) setNombreProfesora(nombre);
    }
  }, []);

  // Función para cerrar sesión de forma segura
  const cerrarSesion = () => {
    localStorage.removeItem('token_profesora');
    localStorage.removeItem('nombre_profesora');
    setAutenticada(false);
    setPantallaActual('dashboard'); // Reseteamos la vista por defecto
  };

  // Si se logra el login, actualizamos el estado
  const manejarLoginExitoso = () => {
    const nombre = localStorage.getItem('nombre_profesora');
    if (nombre) setNombreProfesora(nombre);
    setAutenticada(true);
  };

  // ==========================================
  // 1. PANTALLA DE BLOQUEO (LOGIN)
  // ==========================================
  if (!autenticada) {
    return <Login onLoginExitoso={manejarLoginExitoso} />;
  }

  // ==========================================
  // 2. APLICACIÓN PRINCIPAL (AUTENTICADA)
  // ==========================================
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#F8FAFC', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      
      {/* MENÚ LATERAL (SIDEBAR) */}
      <aside style={{ width: '280px', backgroundColor: '#1E293B', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '4px 0 15px rgba(0,0,0,0.1)', zIndex: 10 }}>
        
        {/* Logo y Título */}
        <div>
          <div style={{ padding: '30px 20px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #334155', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#6366F1', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.4)' }}>
              🍎
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '900', letterSpacing: '0.5px' }}>ClassRewards</h1>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Panel de Control</span>
            </div>
          </div>

          {/* Botones de Navegación */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 15px' }}>
            <BotonNavegacion 
              activo={pantallaActual === 'dashboard'} 
              onClick={() => setPantallaActual('dashboard')}
              icono="👨‍🎓" 
              texto="Gestión de Alumnos" 
            />
            <BotonNavegacion 
              activo={pantallaActual === 'tienda'} 
              onClick={() => setPantallaActual('tienda')}
              icono="🎁" 
              texto="Tienda de Premios" 
            />
            <BotonNavegacion 
              activo={pantallaActual === 'pizarra'} 
              onClick={() => setPantallaActual('pizarra')}
              icono="🎯" 
              texto="Modo Pizarra" 
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

      {/* ÁREA PRINCIPAL (Donde cambian las pantallas) */}
      <main style={{ flex: 1, padding: 'clamp(20px, 4vw, 40px)', overflowY: 'auto' }}>
        {pantallaActual === 'dashboard' && <Dashboard />}
        {pantallaActual === 'tienda' && <Tienda />}
        {pantallaActual === 'pizarra' && <Pizarra />}
      </main>
      
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