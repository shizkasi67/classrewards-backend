import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2'; // <-- Magia de alertas importada

export default function Pizarra() {
  const [catalogo, setCatalogo] = useState([]);
  const [premiosPizarra, setPremiosPizarra] = useState([]);
  
  const [modoPresentacion, setModoPresentacion] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  const [animando, setAnimando] = useState(false);

  const cargarCatalogo = async () => {
    try {
      const res = await api.get('/recompensas');
      setCatalogo(res.data);
    } catch (error) { console.error("Error al cargar el catálogo", error); }
  };

  useEffect(() => { cargarCatalogo(); }, []);

  const toggleSeleccion = (id) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter(item => item !== id));
    } else {
      if (seleccionados.length >= 5) {
        // Alerta estética de límite
        Swal.fire({
          title: 'Límite alcanzado',
          text: 'Puedes seleccionar un máximo de 5 premios para mostrar en la pizarra.',
          icon: 'info',
          confirmButtonColor: '#6366F1'
        });
        return; 
      }
      setSeleccionados([...seleccionados, id]);
    }
  };

  const presentarSeleccion = async () => {
    if (seleccionados.length === 0) {
      return Swal.fire({ title: 'Atención', text: 'Selecciona al menos un premio para presentar.', icon: 'warning', confirmButtonColor: '#F59E0B' });
    }
    
    try {
      await api.post('/recompensas/clase/seleccionar', { ids: seleccionados });
      const res = await api.get('/recompensas/clase');
      setPremiosPizarra(res.data);
      iniciarAnimacion();
    } catch (error) {
      Swal.fire('Error', 'Hubo un problema al preparar los premios.', 'error');
    }
  };

  const presentarAzar = async () => {
    try {
      const res = await api.post('/recompensas/azar');
      setPremiosPizarra(res.data);
      setSeleccionados(res.data.map(p => p.id));
      iniciarAnimacion();
    } catch (error) {
      Swal.fire('Error', 'No se pudieron elegir los premios al azar.', 'error');
    }
  };

  const iniciarAnimacion = () => {
    setModoPresentacion(true);
    setAnimando(true);
    setTimeout(() => setAnimando(false), 800); 
  };

  if (!modoPresentacion) {
    return (
      <div style={{ width: '100%', padding: '20px' }}>
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.2rem', color: '#1E293B', margin: '0 0 10px 0', fontWeight: '900' }}>Preparar Pizarra</h2>
          <p style={{ color: '#64748B', fontSize: '1.1rem' }}>Elige hasta 5 premios para hoy, o deja que el azar decida por ti.</p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {catalogo.map(premio => {
            const estaSeleccionado = seleccionados.includes(premio.id);
            return (
              <div 
                key={premio.id}
                onClick={() => toggleSeleccion(premio.id)}
                style={{ 
                  border: `3px solid ${estaSeleccionado ? '#10B981' : '#E2E8F0'}`, 
                  borderRadius: '16px', 
                  padding: '20px', 
                  backgroundColor: estaSeleccionado ? '#ECFDF5' : '#FFFFFF',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s',
                  transform: estaSeleccionado ? 'scale(1.02)' : 'scale(1)',
                  opacity: (!estaSeleccionado && seleccionados.length >= 5) ? 0.6 : 1
                }}
              >
                {estaSeleccionado && (
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#10B981', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>✓</div>
                )}
                <div style={{ backgroundColor: '#F1F5F9', color: '#475569', display: 'inline-block', padding: '5px 12px', borderRadius: '12px', fontWeight: '800', fontSize: '0.9rem', marginBottom: '10px' }}>{premio.costo} PTS</div>
                <h3 style={{ margin: '0 0 5px 0', color: '#1E293B', fontSize: '1.1rem' }}>{premio.nombre}</h3>
              </div>
            );
          })}
        </section>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', backgroundColor: '#F8FAFC', padding: '25px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
          <button 
            onClick={presentarAzar}
            style={{ padding: '15px 30px', backgroundColor: '#F59E0B', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.2)', transition: 'transform 0.1s' }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🎲 Sorpréndelos (Al Azar)
          </button>
          
          <button 
            onClick={presentarSeleccion}
            style={{ padding: '15px 30px', backgroundColor: '#6366F1', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)', transition: 'transform 0.1s', opacity: seleccionados.length === 0 ? 0.5 : 1 }}
            disabled={seleccionados.length === 0}
            onMouseDown={(e) => seleccionados.length > 0 && (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => seleccionados.length > 0 && (e.currentTarget.style.transform = 'scale(1)')}
          >
            📺 Presentar Seleccionados ({seleccionados.length}/5)
          </button>
        </div>
      </div>
    );
  }

  // ================= RENDER DE LA PANTALLA DE PRESENTACIÓN =================
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      
      <button 
        onClick={() => setModoPresentacion(false)}
        style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: 'transparent', border: 'none', color: '#CBD5E1', fontSize: '1.5rem', cursor: 'pointer', transition: 'color 0.2s' }}
        onMouseOver={(e) => e.currentTarget.style.color = '#64748B'}
        onMouseOut={(e) => e.currentTarget.style.color = '#CBD5E1'}
        title="Volver a Configuración"
      >
        ✖
      </button>

      <div style={{ textAlign: 'center', marginBottom: '50px', animation: animando ? 'fadeInDown 0.8s ease-out' : 'none' }}>
        <h1 style={{ fontSize: '4rem', color: '#1E293B', margin: '0 0 10px 0', fontWeight: '900', textShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          ✨ Premios del Día ✨
        </h1>
        <p style={{ fontSize: '1.5rem', color: '#64748B', margin: 0 }}>¡Esfuérzate para conseguir estos beneficios en la clase de hoy!</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', perspective: '1000px', maxWidth: '1400px', padding: '0 20px' }}>
        {premiosPizarra.map((premio, index) => (
          <div 
            key={premio.id} 
            style={{ 
              width: '260px', 
              height: '380px', 
              backgroundColor: '#6366F1', 
              borderRadius: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              padding: '30px 20px',
              boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.4)',
              animation: animando ? `flipInY 0.6s ease-out ${index * 0.15}s both` : 'none',
              border: '4px solid #818CF8'
            }}
          >
            <div style={{ backgroundColor: '#FCD34D', color: '#92400E', padding: '10px 25px', borderRadius: '25px', fontWeight: '900', fontSize: '1.4rem', marginBottom: '40px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              {premio.costo} PTS
            </div>
            <h2 style={{ color: 'white', fontSize: '1.8rem', textAlign: 'center', margin: 0, fontWeight: '900', lineHeight: '1.2' }}>
              {premio.nombre}
            </h2>
          </div>
        ))}
      </div>

      <style>
        {`
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes flipInY {
            from { opacity: 0; transform: rotateY(90deg); }
            to { opacity: 1; transform: rotateY(0deg); }
          }
        `}
      </style>
    </div>
  );
}