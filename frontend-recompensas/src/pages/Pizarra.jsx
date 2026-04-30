import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Pizarra() {
  const [catalogo, setCatalogo] = useState([]);
  const [premiosPizarra, setPremiosPizarra] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cursoActual, setCursoActual] = useState('');
  
  const [modoPresentacion, setModoPresentacion] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  const [animando, setAnimando] = useState(false);

  const [recompensaActiva, setRecompensaActiva] = useState(null);
  const [alumnosElegibles, setAlumnosElegibles] = useState([]);
  const [cargandoElegibles, setCargandoElegibles] = useState(false);

  const cargarDatosIniciales = async () => {
    try {
      const [resRec, resCur] = await Promise.all([
        api.get('/recompensas'),
        api.get('/cursos')
      ]);
      setCatalogo(resRec.data);
      setCursos(resCur.data);
      if (resCur.data.length > 0 && !cursoActual) setCursoActual(resCur.data[0].id);
    } catch (error) { console.error("Error al cargar datos", error); }
  };

  useEffect(() => { cargarDatosIniciales(); }, []);

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
    if (seleccionados.length === 0) return Swal.fire({ title: 'Atención', text: 'Selecciona premios.', icon: 'warning', confirmButtonColor: '#F59E0B' });
    try {
      await api.post('/recompensas/clase/seleccionar', { ids: seleccionados });
      const res = await api.get('/recompensas/clase');
      setPremiosPizarra(res.data);
      setModoPresentacion(true);
      setAnimando(true);
      setTimeout(() => setAnimando(false), 800);
    } catch (error) { Swal.fire('Error', 'No se pudo preparar la pizarra.', 'error'); }
  };

  const presentarAzar = async () => {
    try {
      const res = await api.post('/recompensas/azar');
      setPremiosPizarra(res.data);
      setSeleccionados(res.data.map(p => p.id));
      setModoPresentacion(true);
      setAnimando(true);
      setTimeout(() => setAnimando(false), 800);
    } catch (error) { Swal.fire('Error', 'Fallo al elegir premios al azar.', 'error'); }
  };

  const abrirInterfazCompra = async (recompensa) => {
    if (!cursoActual) return Swal.fire('Atención', 'Selecciona un curso primero.', 'info', '#6366F1');
    setRecompensaActiva(recompensa);
    setCargandoElegibles(true);
    try { 
      const res = await api.get(`/tienda/recompensas/${recompensa.id}/elegibles?curso_id=${cursoActual}`); 
      setAlumnosElegibles(res.data); 
    } catch (error) { 
        console.error(error); 
        setAlumnosElegibles([]);
    } finally { setCargandoElegibles(false); }
  };

  // --- FUNCIÓN CORREGIDA: Ahora sí procesa la compra ---
  const procesarCompra = async (alumnoId, nombreAlumno) => {
    const result = await Swal.fire({
      title: '¿Confirmar Canje?',
      html: `¿Confirmas que <b>${nombreAlumno}</b> canjeará <b>"${recompensaActiva.nombre}"</b>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Sí, comprar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.post('/tienda/comprar', { 
          alumno_id: alumnoId, 
          recompensa_id: recompensaActiva.id 
        });
        
        Swal.fire({ title: '¡Éxito!', text: 'Compra realizada con éxito.', icon: 'success', timer: 1500, showConfirmButton: false });
        
        // Cerramos el modal
        setRecompensaActiva(null);
        
      } catch (error) { 
        Swal.fire({ title: 'Error', text: 'No se pudo procesar la compra.', icon: 'error', confirmButtonColor: '#EF4444' });
      }
    }
  };

  if (!modoPresentacion) {
    return (
      <div style={{ width: '100%', padding: '20px' }}>
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.2rem', color: '#1E293B', margin: '0 0 10px 0', fontWeight: '900' }}>Preparar Pizarra</h2>
          <div style={{ margin: '15px 0', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', color: '#64748B' }}>Curso:</span>
            <select value={cursoActual} onChange={(e) => { setCursoActual(Number(e.target.value)); setSeleccionados([]); }} style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid #CBD5E1', fontWeight: '700', color: '#6366F1', outline: 'none', cursor: 'pointer' }}>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {catalogo.map(premio => {
            const estaSeleccionado = seleccionados.includes(premio.id);
            return (
              <div key={premio.id} onClick={() => toggleSeleccion(premio.id)} style={{ border: `3px solid ${estaSeleccionado ? '#10B981' : '#E2E8F0'}`, borderRadius: '16px', padding: '20px', backgroundColor: estaSeleccionado ? '#ECFDF5' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s', transform: estaSeleccionado ? 'scale(1.02)' : 'scale(1)' }}>
                <div style={{ backgroundColor: '#F1F5F9', color: '#475569', display: 'inline-block', padding: '5px 12px', borderRadius: '12px', fontWeight: '800', fontSize: '0.8rem', marginBottom: '10px' }}>{premio.costo} PTS</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1E293B' }}>{premio.nombre}</h3>
              </div>
            );
          })}
        </section>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <button onClick={presentarAzar} style={btnMain('#F59E0B')}>🎲 Al Azar</button>
          <button onClick={presentarSeleccion} style={btnMain('#6366F1')}>📺 Presentar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      
      <button onClick={() => setModoPresentacion(false)} style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#CBD5E1' }}>✖</button>

      <div style={{ textAlign: 'center', marginBottom: '50px', animation: animando ? 'fadeInDown 0.8s ease-out' : 'none' }}>
        <h1 style={{ fontSize: '4rem', color: '#1E293B', fontWeight: '900' }}>✨ Premios del Día ✨</h1>
      </div>

      <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', justifyContent: 'center', perspective: '1000px' }}>
        {premiosPizarra.map((premio, index) => (
          <div 
            key={premio.id} 
            onClick={() => abrirInterfazCompra(premio)}
            style={{ 
              width: '260px', height: '380px', backgroundColor: '#6366F1', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px', cursor: 'pointer', boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.4)',
              animation: animando ? `flipInY 0.6s ease-out ${index * 0.15}s both` : 'none',
              transition: 'transform 0.2s', border: '4px solid #818CF8'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ backgroundColor: '#FCD34D', color: '#92400E', padding: '10px 25px', borderRadius: '25px', fontWeight: '900', fontSize: '1.4rem', marginBottom: '40px' }}>{premio.costo} PTS</div>
            <h2 style={{ color: 'white', fontSize: '1.8rem', textAlign: 'center', fontWeight: '900' }}>{premio.nombre}</h2>
          </div>
        ))}
      </div>

      {recompensaActiva && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ backgroundColor: '#FEF3C7', margin: '-35px -35px 25px -35px', padding: '30px', borderRadius: '24px 24px 0 0', textAlign: 'center', borderBottom: '2px solid #FDE68A' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#92400E', fontSize: '1.8rem', fontWeight: '900' }}>{recompensaActiva.nombre}</h2>
              <span style={{ backgroundColor: '#D97706', color: 'white', padding: '6px 18px', borderRadius: '15px', fontWeight: 'bold' }}>Costo: {recompensaActiva.costo} Pts</span>
            </div>
            
            {cargandoElegibles ? <p style={{ textAlign: 'center', padding: '20px' }}>Buscando alumnos...</p> : alumnosElegibles.length === 0 ? (
              <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>Sin alumnos con puntos suficientes.</div>
            ) : (
              <div style={{ display: 'grid', gap: '12px', maxHeight: '40vh', overflowY: 'auto' }}>
                {alumnosElegibles.map(alumno => (
                  <div key={alumno.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', border: '1px solid #E2E8F0', borderRadius: '12px', backgroundColor: '#F8FAFC' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem', color: '#1E293B', display: 'block' }}>{alumno.nombre}</strong>
                      <span style={{ color: '#10B981', fontWeight: '800' }}>{alumno.puntos} pts</span>
                    </div>
                    {/* EL BOTÓN QUE FALTABA VINCULAR */}
                    <button 
                      onClick={() => procesarCompra(alumno.id, alumno.nombre)} 
                      style={{ padding: '10px 18px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Canjear
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setRecompensaActiva(null)} style={{ padding: '15px', width: '100%', marginTop: '20px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes flipInY { from { opacity: 0; transform: rotateY(90deg); } to { opacity: 1; transform: rotateY(0deg); } }
      `}</style>
    </div>
  );
}

const btnMain = (bg) => ({ padding: '15px 30px', backgroundColor: bg, color: 'white', border: 'none', borderRadius: '15px', fontWeight: '800', cursor: 'pointer' });
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '20px' };
const modalStyle = { backgroundColor: '#fff', padding: '35px', borderRadius: '24px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' };