import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Dashboard() {
  const [alumnos, setAlumnos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [cursoActual, setCursoActual] = useState('');

  // Estados para nuevas funcionalidades
  const [seleccionados, setSeleccionados] = useState([]); // Multiselección
  const [showHistorial, setShowHistorial] = useState(false); // Modal Historial
  const [historialData, setHistorialData] = useState([]); // Datos Historial

  const [perfilActivo, setPerfilActivo] = useState(null);
  const [datosPerfil, setDatosPerfil] = useState(null);
  
  const [modalAgregarActivo, setModalAgregarActivo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  
  const [modalCursoActivo, setModalCursoActivo] = useState(false);
  const [nuevoNombreCurso, setNuevoNombreCurso] = useState('');
  const [nuevaSeccionCurso, setNuevaSeccionCurso] = useState('');

  const cargarCursos = async () => {
    try {
      const respuesta = await api.get('/cursos');
      setCursos(respuesta.data);
      if (respuesta.data.length > 0 && !cursoActual) setCursoActual(respuesta.data[0].id);
    } catch (err) { setError("No se pudieron cargar los cursos."); }
  };

  const cargarAlumnos = async () => {
    if (!cursoActual) return;
    setCargando(true);
    try {
      const respuesta = await api.get(`/cursos/${cursoActual}/alumnos`);
      setAlumnos(respuesta.data); // El backend ya los devuelve por Apellido
      setError(null);
    } catch (err) { setError("No se pudieron cargar los datos."); } 
    finally { setCargando(false); }
  };

  useEffect(() => { cargarCursos(); }, []);
  useEffect(() => { cargarAlumnos(); }, [cursoActual]);

  // CARGAR HISTORIAL GENERAL
  const cargarHistorial = async () => {
    try {
      const res = await api.get(`/cursos/${cursoActual}/historial-puntos`);
      setHistorialData(res.data);
      setShowHistorial(true);
    } catch (err) { Swal.fire('Error', 'No se pudo cargar el historial.', 'error'); }
  };

  // MANEJAR PUNTOS CON ACTUALIZACIÓN OPTIMISTA (SIN SALTOS)
  const manejarPuntos = async (alumnoId, cantidad, e) => {
    if(e) e.stopPropagation();
    
    const objetivos = alumnoId ? [alumnoId] : (seleccionados.length > 0 ? seleccionados : null);
    
    // 1. Actualización Visual Inmediata
    const copiaPrevia = [...alumnos];
    if (objetivos) {
      setAlumnos(alumnos.map(al => objetivos.includes(al.id) ? { ...al, puntos: al.puntos + cantidad } : al));
    } else {
      setAlumnos(alumnos.map(al => ({ ...al, puntos: al.puntos + cantidad })));
    }

    try {
      if (objetivos) {
        // Si hay seleccionados, iteramos (Multiselección)
        await Promise.all(objetivos.map(id => 
          api.post('/alumnos/modificar-puntos', { cantidad, alumno_id: id })
        ));
        setSeleccionados([]);
      } else {
        // Para todos los del curso
        await api.post('/alumnos/modificar-puntos', { cantidad, curso_id: cursoActual });
      }
    } catch (err) {
      setAlumnos(copiaPrevia); // Revertir si falla
      Swal.fire({ title: 'Error', text: 'No se pudo actualizar. Los puntos no pueden ser negativos.', icon: 'error' });
    }
  };

  const toggleSeleccion = (id, e) => {
    e.stopPropagation();
    setSeleccionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  // ... (guardarNuevoAlumno, eliminarAlumno, guardarNuevoCurso, abrirPerfil, utilizarPremio se mantienen igual)

  const alumnosFiltrados = alumnos.filter((a) => a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || a.apellido?.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ width: '100%' }}>
      {/* CABECERA */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', color: '#1E293B', margin: '0 0 5px 0', fontWeight: '800' }}>Gestión de Clase</h2>
          <button onClick={cargarHistorial} style={btnGhost('#6366F1')}>📋 Ver Historial de Puntos</button>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 25px', borderRadius: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <label style={{ fontWeight: '700', color: '#475569' }}>Curso:</label>
          <select value={cursoActual} onChange={(e) => { setCursoActual(Number(e.target.value)); setSeleccionados([]); }} style={{ border: 'none', backgroundColor: '#F1F5F9', padding: '10px 15px', borderRadius: '10px', fontWeight: '700', color: '#6366F1', outline: 'none', cursor: 'pointer' }}>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <button onClick={abrirModalCurso} style={btnGhost('#6366F1')}>+ Nuevo Curso</button>
        </div>
      </header>

      {/* BARRA DE HERRAMIENTAS */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '25px', borderRadius: '20px', display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '15px', top: '14px', color: '#94A3B8' }}>🔍</span>
          <input type="search" placeholder="Buscar por nombre o apellido..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 45px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', backgroundColor: '#F1F5F9', padding: '10px 20px', borderRadius: '15px', flex: '1 1 auto', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '800', marginRight: '5px' }}>
            {seleccionados.length > 0 ? `PARA (${seleccionados.length}):` : 'PARA TODOS:'}
          </span>
          <button onClick={() => manejarPuntos(null, 1)} style={btnFast('#10B981')}>+1</button>
          <button onClick={() => manejarPuntos(null, 3)} style={btnFast('#10B981')}>+3</button>
          <button onClick={() => manejarPuntos(null, -1)} style={btnFast('#EF4444')}>-1</button>
          <button onClick={() => manejarPuntos(null, -3)} style={btnFast('#EF4444')}>-3</button>
          {seleccionados.length > 0 && <button onClick={() => setSeleccionados([])} style={{background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '0.8rem'}}>Limpiar</button>}
        </div>

        <button onClick={abrirModalAgregar} style={{...btnStyle('#6366F1'), flex: '1 1 auto'}} disabled={cursos.length === 0}>+ Nuevo Estudiante</button>
      </section>

      {/* GRILLA DE ALUMNOS */}
      {cargando ? <p style={{ textAlign: 'center', padding: '50px' }}>Cargando estudiantes...</p> : (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
          {alumnosFiltrados.map((alumno) => {
            const isSelected = seleccionados.includes(alumno.id);
            return (
              <article key={alumno.id} onClick={() => abrirPerfil(alumno.id)} style={{ backgroundColor: isSelected ? '#EEF2FF' : '#FFFFFF', border: isSelected ? '2px solid #6366F1' : '2px solid transparent', borderRadius: '20px', padding: '30px 20px', textAlign: 'center', cursor: 'pointer', position: 'relative', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}>
                <button onClick={(e) => eliminarAlumno(alumno.id, e)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer' }}>✖</button>
                
                {/* Avatar con Click para Multiselección */}
                <div onClick={(e) => toggleSeleccion(alumno.id, e)} style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: isSelected ? '#6366F1' : '#F1F5F9', color: isSelected ? '#fff' : '#6366F1', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', fontWeight: 'bold', margin: '0 auto 15px auto', border: '3px solid #fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {isSelected ? '✓' : alumno.nombre.charAt(0)}
                </div>
                
                <h2 style={{ fontSize: '1.2rem', margin: '0 0 5px 0', color: '#1E293B', fontWeight: '800' }}>{alumno.nombre} {alumno.apellido}</h2>
                
                <div style={{ display: 'inline-block', backgroundColor: '#FEF3C7', color: '#D97706', padding: '8px 20px', borderRadius: '25px', fontWeight: '900', fontSize: '1.4rem', marginBottom: '25px' }}>
                  {alumno.puntos} <span style={{ fontSize: '0.8rem' }}>PTS</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={(e) => manejarPuntos(alumno.id, 1, e)} style={btnAction('#10B981')}>+1</button>
                  <button onClick={(e) => manejarPuntos(alumno.id, 3, e)} style={btnAction('#10B981')}>+3</button>
                  <button onClick={(e) => manejarPuntos(alumno.id, -1, e)} style={btnAction('#EF4444')}>-1</button>
                  <button onClick={(e) => manejarPuntos(alumno.id, -3, e)} style={btnAction('#EF4444')}>-3</button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* MODAL HISTORIAL GENERAL */}
      {showHistorial && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={modalTitleStyle}>Historial del Curso</h2>
              <button onClick={() => setShowHistorial(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #F1F5F9' }}>
                    <th style={{ padding: '10px' }}>Fecha</th>
                    <th style={{ padding: '10px' }}>Alumno</th>
                    <th style={{ padding: '10px' }}>Motivo</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {historialData.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px', fontSize: '0.85rem' }}>{h.fecha}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{h.beneficiario}</td>
                      <td style={{ padding: '10px', color: '#64748B' }}>{h.motivo}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: h.cantidad > 0 ? '#10B981' : '#EF4444' }}>
                        {h.cantidad > 0 ? `+${h.cantidad}` : h.cantidad}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Estilos auxiliares (iguales a los anteriores)
const btnStyle = (bg) => ({ padding: '12px 20px', cursor: 'pointer', backgroundColor: bg, color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', transition: 'all 0.2s', whiteSpace: 'nowrap' });
const btnGhost = (color) => ({ backgroundColor: 'transparent', color: color, border: 'none', fontWeight: '700', cursor: 'pointer', padding: '10px', whiteSpace: 'nowrap' });
const btnFast = (bg) => ({ padding: '8px 15px', border: 'none', backgroundColor: bg, color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' });
const btnAction = (bg) => ({ padding: '12px', border: `2px solid ${bg}`, backgroundColor: 'transparent', color: bg, borderRadius: '12px', fontWeight: '900', cursor: 'pointer' });
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' };
const modalStyle = { backgroundColor: '#fff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' };
const modalTitleStyle = { marginTop: 0, color: '#1E293B', marginBottom: '25px', fontSize: '1.6rem', fontWeight: '800' };