import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Tienda() {
  const [recompensas, setRecompensas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cursoActual, setCursoActual] = useState('');
  
  const [recompensaActiva, setRecompensaActiva] = useState(null);
  const [alumnosElegibles, setAlumnosElegibles] = useState([]);
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState([]); // Estado para selección múltiple
  const [cargandoElegibles, setCargandoElegibles] = useState(false);

  const [modalNuevaRecompensa, setModalNuevaRecompensa] = useState(false);
  const [nuevoNombreRec, setNuevoNombreRec] = useState('');
  const [nuevoCostoRec, setNuevoCostoRec] = useState('');
  const [nuevaDescRec, setNuevaDescRec] = useState('');

  const cargarDatos = async () => {
    try {
      const resCursos = await api.get('/cursos'); 
      setCursos(resCursos.data);
      if (resCursos.data.length > 0 && !cursoActual) setCursoActual(resCursos.data[0].id);
      
      const resRecompensas = await api.get('/recompensas'); 
      setRecompensas(resRecompensas.data);
    } catch (error) { console.error("Error", error); }
  };

  useEffect(() => { cargarDatos(); }, [cursoActual]);

  const abrirModalCompra = async (recompensa) => {
    if (!cursoActual) {
      return Swal.fire({ title: 'Atención', text: 'Selecciona un curso primero.', icon: 'info', confirmButtonColor: '#6366F1' });
    }
    setRecompensaActiva(recompensa);
    setAlumnosSeleccionados([]); // Limpiar selección al abrir
    setCargandoElegibles(true);
    try { 
      const res = await api.get(`/tienda/recompensas/${recompensa.id}/elegibles?curso_id=${cursoActual}`); 
      setAlumnosElegibles(res.data); 
    } catch (error) { console.error(error); } 
    finally { setCargandoElegibles(false); }
  };

  const toggleAlumnoSeleccionado = (id) => {
    setAlumnosSeleccionados(prev => 
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  // LÓGICA DE COMPRA MÚLTIPLE
  const procesarCompraMultiple = async () => {
    if (alumnosSeleccionados.length === 0) return;

    const cantidad = alumnosSeleccionados.length;
    const result = await Swal.fire({
      title: '¿Confirmar Entrega Grupal?',
      html: `¿Estás segura de otorgar <b>"${recompensaActiva.nombre}"</b> a los <b>${cantidad}</b> estudiantes seleccionados?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Sí, otorgar a todos',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        // Ejecutar todas las compras en paralelo
        await Promise.all(alumnosSeleccionados.map(id => 
          api.post('/tienda/comprar', { alumno_id: id, recompensa_id: recompensaActiva.id })
        ));

        Swal.fire({ title: '¡Éxito!', text: `Premio entregado correctamente a ${cantidad} estudiantes.`, icon: 'success', confirmButtonColor: '#6366F1' });
        setRecompensaActiva(null);
        cargarDatos(); 
      } catch (error) { 
        Swal.fire({ title: 'Error', text: 'Hubo un problema con la compra masiva. Verifica los puntos de los estudiantes.', icon: 'error', confirmButtonColor: '#EF4444' });
      }
    }
  };

  const guardarNuevaRecompensa = async () => {
    if (nuevoNombreRec.trim() === '') return Swal.fire('Falta el Título', 'Escribe un nombre para el premio.', 'warning');
    if (!nuevoCostoRec || Number(nuevoCostoRec) <= 0) return Swal.fire('Costo Inválido', 'Ingresa un costo mayor a 0.', 'warning');
    
    try {
      await api.post('/recompensas', { nombre: nuevoNombreRec, costo: Number(nuevoCostoRec), descripcion: nuevaDescRec || "" });
      setModalNuevaRecompensa(false);
      setNuevoNombreRec(''); setNuevoCostoRec(''); setNuevaDescRec('');
      cargarDatos(); 
      Swal.fire({ title: '¡Guardado!', text: 'Premio añadido a la tienda.', icon: 'success', confirmButtonColor: '#10B981', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', 'No se pudo guardar en la base de datos.', 'error');
    }
  };

  const eliminarRecompensa = async (id, nombre, e) => {
    e.stopPropagation(); 
    const result = await Swal.fire({
      title: '¿Eliminar Premio?',
      html: `Estás a punto de borrar <b>"${nombre}"</b>. Desaparecerá de la tienda y del inventario de los alumnos.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/recompensas/${id}`);
        cargarDatos(); 
        Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1000, showConfirmButton: false });
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar el premio.', 'error');
      }
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* CABECERA */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', backgroundColor: '#6366F1', padding: '30px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', margin: '0 0 10px 0', fontWeight: '800' }}>Tienda de Premios 🎁</h2>
          <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>Recompensa el esfuerzo de tus estudiantes.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '15px', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Filtrar:</label>
            <select value={cursoActual} onChange={(e) => setCursoActual(Number(e.target.value))} style={{ border: 'none', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '10px', fontWeight: '700', color: '#6366F1', outline: 'none', cursor: 'pointer' }}>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          
          <button onClick={() => setModalNuevaRecompensa(true)} style={{ backgroundColor: '#F59E0B', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}>
            + Nuevo Premio
          </button>
        </div>
      </header>

      {/* CATÁLOGO DE PREMIOS */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
        {recompensas.map(recompensa => (
          <article key={recompensa.id} onClick={() => abrirModalCompra(recompensa)} style={{ backgroundImage: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', borderRadius: '20px', padding: '30px', textAlign: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(217, 119, 6, 0.1)', transition: 'transform 0.2s', border: '2px solid #FCD34D' }}>
            <button onClick={(e) => eliminarRecompensa(recompensa.id, recompensa.nombre, e)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#B45309', cursor: 'pointer', fontSize: '1.2rem', transition: 'color 0.2s' }} title="Eliminar Premio">🗑️</button>
            <div style={{ backgroundColor: '#D97706', color: 'white', display: 'inline-block', padding: '8px 20px', borderRadius: '20px', fontWeight: '900', fontSize: '1.4rem', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              {recompensa.costo} PTS
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#92400E', margin: '0 0 10px 0', fontWeight: '800' }}>{recompensa.nombre}</h2>
            <p style={{ color: '#B45309', fontSize: '1rem', lineHeight: '1.4' }}>{recompensa.descripcion}</p>
          </article>
        ))}
      </section>

      {/* ================= MODALES ================= */}
      {modalNuevaRecompensa && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginTop: 0, color: '#D97706', borderBottom: '2px solid #FEF3C7', paddingBottom: '15px', marginBottom: '20px', fontSize: '1.6rem', fontWeight: '800' }}>Crear Nuevo Premio</h2>
            <label style={labelStyle}>Título del Premio:</label>
            <input type="text" placeholder="Ej: Elegir música de fondo" value={nuevoNombreRec} onChange={(e) => setNuevoNombreRec(e.target.value)} style={inputFormStyle} />
            <label style={labelStyle}>Costo (Puntos):</label>
            <input type="number" min="1" placeholder="Ej: 15" value={nuevoCostoRec} onChange={(e) => setNuevoCostoRec(e.target.value)} style={inputFormStyle} />
            <label style={labelStyle}>Descripción corta (Opcional):</label>
            <textarea placeholder="¿De qué trata este premio?" value={nuevaDescRec} onChange={(e) => setNuevaDescRec(e.target.value)} style={{...inputFormStyle, minHeight: '80px', resize: 'none'}} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setModalNuevaRecompensa(false)} style={{ backgroundColor: 'transparent', color: '#64748B', border: 'none', fontWeight: '700', cursor: 'pointer', padding: '10px 20px' }}>Cancelar</button>
              <button type="button" onClick={guardarNuevaRecompensa} style={{ padding: '12px 25px', backgroundColor: '#F59E0B', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.2)' }}>Guardar Premio</button>
            </div>
          </div>
        </div>
      )}

      {recompensaActiva && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ backgroundColor: '#FEF3C7', margin: '-35px -35px 25px -35px', padding: '30px', borderRadius: '24px 24px 0 0', textAlign: 'center', borderBottom: '2px solid #FDE68A' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#92400E', fontSize: '1.8rem', fontWeight: '900' }}>{recompensaActiva.nombre}</h2>
              <span style={{ backgroundColor: '#D97706', color: 'white', padding: '6px 18px', borderRadius: '15px', fontWeight: 'bold' }}>Costo: {recompensaActiva.costo} Pts</span>
            </div>
            <h3 style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '15px', fontWeight: '700' }}>Selecciona a los estudiantes:</h3>
            
            {cargandoElegibles ? <p style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}>Buscando alumnos...</p> : alumnosElegibles.length === 0 ? (
              <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '20px', borderRadius: '12px', textAlign: 'center', fontWeight: '600' }}>Ningún alumno tiene suficientes puntos.</div>
            ) : (
              <>
                <div style={{ display: 'grid', gap: '12px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '5px', paddingLeft: '2px' }}>
                  {alumnosElegibles.map(alumno => {
                    const isSelected = alumnosSeleccionados.includes(alumno.id);
                    return (
                      <div 
                        key={alumno.id} 
                        onClick={() => toggleAlumnoSeleccionado(alumno.id)}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '15px 20px', 
                          border: isSelected ? '2px solid #6366F1' : '1px solid #E2E8F0', 
                          borderRadius: '12px', 
                          backgroundColor: isSelected ? '#EEF2FF' : '#F8FAFC',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '1.1rem', color: '#1E293B', display: 'block' }}>{alumno.nombre}</strong>
                          <span style={{ color: '#10B981', fontWeight: '800', fontSize: '0.9rem' }}>Disponibles: {alumno.puntos} pts</span>
                        </div>
                        <div style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          border: '2px solid #6366F1', 
                          backgroundColor: isSelected ? '#6366F1' : 'transparent',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          color: 'white',
                          fontSize: '0.8rem'
                        }}>
                          {isSelected && '✓'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <button 
                  onClick={procesarCompraMultiple} 
                  disabled={alumnosSeleccionados.length === 0}
                  style={{ 
                    padding: '15px', 
                    width: '100%', 
                    marginTop: '20px', 
                    backgroundColor: alumnosSeleccionados.length > 0 ? '#10B981' : '#CBD5E1', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontWeight: '800', 
                    cursor: alumnosSeleccionados.length > 0 ? 'pointer' : 'default',
                    boxShadow: alumnosSeleccionados.length > 0 ? '0 4px 6px rgba(16, 185, 129, 0.2)' : 'none'
                  }}
                >
                  Otorgar a {alumnosSeleccionados.length} estudiantes
                </button>
              </>
            )}
            <button onClick={() => setRecompensaActiva(null)} style={{ padding: '15px', width: '100%', marginTop: '10px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' };
const modalStyle = { backgroundColor: '#fff', padding: '35px', borderRadius: '24px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '700', color: '#92400E', fontSize: '0.95rem' };
const inputFormStyle = { width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #FDE68A', marginBottom: '20px', boxSizing: 'border-box', backgroundColor: '#FFFBEB', outline: 'none', fontSize: '1rem', color: '#92400E', fontWeight: '600' };