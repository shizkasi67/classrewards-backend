import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Pizarra() {
  const [catalogo, setCatalogo] = useState([]);
  const [premiosPizarra, setPremiosPizarra] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cursoActual, setCursoActual] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  
  const [modoPresentacion, setModoPresentacion] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  const [animando, setAnimando] = useState(false);

  // Cargar datos iniciales
  const cargarDatos = async () => {
    try {
      const [resCatalogo, resCursos] = await Promise.all([
        api.get('/recompensas'),
        api.get('/cursos')
      ]);
      setCatalogo(resCatalogo.data);
      setCursos(resCursos.data);
      if (resCursos.data.length > 0) setCursoActual(resCursos.data[0].id);
    } catch (error) { console.error("Error al cargar datos", error); }
  };

  useEffect(() => { cargarDatos(); }, []);

  // Cargar alumnos cuando cambia el curso
  useEffect(() => {
    if (cursoActual) {
      api.get(`/cursos/${cursoActual}/alumnos`).then(res => setAlumnos(res.data));
    }
  }, [cursoActual]);

  const toggleSeleccion = (id) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter(item => item !== id));
    } else {
      if (seleccionados.length >= 5) {
        Swal.fire({ title: 'Límite alcanzado', text: 'Máximo 5 premios.', icon: 'info', confirmButtonColor: '#6366F1' });
        return; 
      }
      setSeleccionados([...seleccionados, id]);
    }
  };

  const presentarSeleccion = async () => {
    if (seleccionados.length === 0) {
      return Swal.fire({ title: 'Atención', text: 'Selecciona al menos un premio.', icon: 'warning', confirmButtonColor: '#F59E0B' });
    }
    try {
      await api.post('/recompensas/clase/seleccionar', { ids: seleccionados });
      const res = await api.get('/recompensas/clase');
      setPremiosPizarra(res.data);
      iniciarAnimacion();
    } catch (error) { Swal.fire('Error', 'Problema al preparar los premios.', 'error'); }
  };

  const presentarAzar = async () => {
    try {
      const res = await api.post('/recompensas/azar');
      setPremiosPizarra(res.data);
      setSeleccionados(res.data.map(p => p.id));
      iniciarAnimacion();
    } catch (error) { Swal.fire('Error', 'No se pudieron elegir premios al azar.', 'error'); }
  };

  const iniciarAnimacion = () => {
    setModoPresentacion(true);
    setAnimando(true);
    setTimeout(() => setAnimando(false), 800); 
  };

  // --- NUEVA FUNCIÓN: COMPRA DESDE LA PIZARRA ---
  const comprarPremio = async (premio) => {
    if (!cursoActual) return;

    const opcionesAlumnos = {};
    alumnos.forEach(a => { opcionesAlumnos[a.id] = `${a.nombre} (${a.puntos} pts)`; });

    const { value: idAlumno } = await Swal.fire({
      title: `Canjear: ${premio.nombre}`,
      text: `Costo: ${premio.costo} puntos`,
      input: 'select',
      inputOptions: opcionesAlumnos,
      inputPlaceholder: 'Selecciona al estudiante',
      showCancelButton: true,
      confirmButtonColor: '#6366F1',
      confirmButtonText: '¡Comprar!',
      cancelButtonText: 'Cancelar'
    });

    if (idAlumno) {
      try {
        await api.post('/tienda/comprar', { alumno_id: parseInt(idAlumno), recompensa_id: premio.id });
        Swal.fire({ title: '¡Éxito!', text: 'Premio canjeado correctamente', icon: 'success', timer: 1500, showConfirmButton: false });
        // Recargamos alumnos para actualizar sus puntos
        const resAlumnos = await api.get(`/cursos/${cursoActual}/alumnos`);
        setAlumnos(resAlumnos.data);
      } catch (err) {
        Swal.fire('Error', 'Puntos insuficientes o error de conexión.', 'error');
      }
    }
  };

  if (!modoPresentacion) {
    return (
      <div style={{ width: '100%', padding: '20px' }}>
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.2rem', color: '#1E293B', margin: '0 0 10px 0', fontWeight: '900' }}>Preparar Pizarra</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
             <span style={{ fontWeight: 'bold', color: '#475569' }}>Curso activo:</span>
             <select value={cursoActual} onChange={(e) => setCursoActual(e.target.value)} style={{ padding: '8px', borderRadius: '10px', border: '1px solid #CBD5E1', outline: 'none' }}>
                {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
             </select>
          </div>
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
          <button onClick={presentarAzar} style={btnStyle('#F59E0B')}>🎲 Sorpréndelos (Al Azar)</button>
          <button onClick={presentarSeleccion} style={{ ...btnStyle('#6366F1'), opacity: seleccionados.length === 0 ? 0.5 : 1 }} disabled={seleccionados.length === 0}>
            📺 Presentar Seleccionados ({seleccionados.length}/5)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      
      <button onClick={() => setModoPresentacion(false)} style={closeBtnStyle}>✖</button>

      <div style={{ textAlign: 'center', marginBottom: '50px', animation: animando ? 'fadeInDown 0.8s ease-out' : 'none' }}>
        <h1 style={{ fontSize: '4rem', color: '#1E293B', margin: '0 0 10px 0', fontWeight: '900', textShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          ✨ Premios del Día ✨
        </h1>
        <p style={{ fontSize: '1.5rem', color: '#64748B', margin: 0 }}>¡Toca una tarjeta para canjear!</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', perspective: '1000px', maxWidth: '1400px', padding: '0 20px' }}>
        {premiosPizarra.map((premio, index) => (
          <div 
            key={premio.id} 
            onClick={() => comprarPremio(premio)}
            style={{ 
              width: '260px', 
              height: '380px', 
              backgroundColor: '#6366F1', 
              borderRadius: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              padding: '30px 20px',
              cursor: 'pointer',
              boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.4)',
              animation: animando ? `flipInY 0.6s ease-out ${index * 0.15}s both` : 'none',
              border: '4px solid #818CF8',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ backgroundColor: '#FCD34D', color: '#92400E', padding: '10px 25px', borderRadius: '25px', fontWeight: '900', fontSize: '1.4rem', marginBottom: '40px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              {premio.costo} PTS
            </div>
            <h2 style={{ color: 'white', fontSize: '1.8rem', textAlign: 'center', margin: 0, fontWeight: '900', lineHeight: '1.2' }}>
              {premio.nombre}
            </h2>
            <div style={{ marginTop: 'auto', color: '#C7D2FE', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '1px' }}>CLICK PARA CANJEAR</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes flipInY { from { opacity: 0; transform: rotateY(90deg); } to { opacity: 1; transform: rotateY(0deg); } }
      `}</style>
    </div>
  );
}

// Estilos rápidos
const btnStyle = (bg) => ({ padding: '15px 30px', backgroundColor: bg, color: 'white', border: 'none', borderRadius: '15px', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer', boxShadow: `0 4px 6px ${bg}33`, transition: 'transform 0.1s' });
const closeBtnStyle = { position: 'absolute', top: '20px', left: '20px', backgroundColor: 'transparent', border: 'none', color: '#CBD5E1', fontSize: '1.5rem', cursor: 'pointer' };