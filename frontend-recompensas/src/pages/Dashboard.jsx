import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2'; // <-- Magia de alertas importada

export default function Dashboard() {
  const [alumnos, setAlumnos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [cursoActual, setCursoActual] = useState('');

  const [perfilActivo, setPerfilActivo] = useState(null);
  const [datosPerfil, setDatosPerfil] = useState(null);
  
  const [modalAgregarActivo, setModalAgregarActivo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevoCursoId, setNuevoCursoId] = useState('');
  
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
      setAlumnos(respuesta.data);
      setError(null);
    } catch (err) { setError("No se pudieron cargar los datos."); } 
    finally { setCargando(false); }
  };

  useEffect(() => { cargarCursos(); }, []);
  useEffect(() => { cargarAlumnos(); }, [cursoActual]);

  const manejarPuntos = async (alumnoId, cantidad, e) => {
    if(e) e.stopPropagation(); 
    try {
      await api.post('/alumnos/modificar-puntos', { cantidad, alumno_id: alumnoId, curso_id: alumnoId ? null : cursoActual });
      cargarAlumnos(); 
      if (perfilActivo) abrirPerfil(perfilActivo); 
    } catch (err) { 
      Swal.fire({ title: 'Cuidado', text: 'Asegúrate de que los puntos no queden en negativo.', icon: 'warning', confirmButtonColor: '#F59E0B' });
    }
  };

  const abrirModalAgregar = () => { setNuevoNombre(''); setNuevoApellido(''); setNuevoCursoId(cursoActual); setModalAgregarActivo(true); };
  
  const guardarNuevoAlumno = async (e) => {
    e.preventDefault();
    try { 
      await api.post('/alumnos', { nombre: nuevoNombre, apellido: nuevoApellido, curso_id: nuevoCursoId }); 
      setModalAgregarActivo(false); 
      cargarAlumnos(); 
      Swal.fire({ title: '¡Guardado!', text: 'Estudiante agregado con éxito.', icon: 'success', timer: 1500, showConfirmButton: false });
    } 
    catch (err) { Swal.fire('Error', 'No se pudo guardar el estudiante.', 'error'); }
  };

  const eliminarAlumno = async (id, e) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: '¿Eliminar Estudiante?',
      text: "Se borrará su perfil y todo su historial de premios.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try { 
        await api.delete(`/alumnos/${id}`); 
        cargarAlumnos(); 
        Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1000, showConfirmButton: false });
      } 
      catch (error) { Swal.fire('Error', 'No se pudo eliminar al estudiante.', 'error'); }
    }
  };

  const abrirModalCurso = () => { setNuevoNombreCurso(''); setNuevaSeccionCurso(''); setModalCursoActivo(true); };
  
  const guardarNuevoCurso = async (e) => {
    e.preventDefault();
    try { 
      await api.post('/cursos', { nombre: nuevoNombreCurso, seccion: nuevaSeccionCurso }); 
      setModalCursoActivo(false); 
      await cargarCursos(); 
      Swal.fire({ title: '¡Curso creado!', icon: 'success', timer: 1500, showConfirmButton: false });
    } 
    catch (err) { Swal.fire('Error', 'No se pudo crear el curso.', 'error'); }
  };

  const abrirPerfil = async (id) => {
    setPerfilActivo(id);
    try {
      const res = await api.get(`/alumnos/${id}/perfil`);
      setDatosPerfil(res.data);
    } catch (err) { Swal.fire('Error', 'No se pudo cargar el perfil del estudiante.', 'error'); }
  };

  const utilizarPremio = async (canjeId) => {
    const result = await Swal.fire({
      title: '¿Usar Premio?',
      text: "El premio se marcará como usado y no podrá volver a canjearse.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6366F1',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Sí, usar premio',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.post(`/canjes/${canjeId}/usar`);
        abrirPerfil(perfilActivo); 
        Swal.fire({ title: '¡Utilizado!', text: 'El premio ha sido marcado como usado.', icon: 'success', timer: 1500, showConfirmButton: false });
      } catch (err) { 
        Swal.fire('Error', 'No se pudo procesar el uso del premio.', 'error'); 
      }
    }
  };

  const alumnosFiltrados = alumnos.filter((a) => a.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ width: '100%' }}>
      {/* CABECERA */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', color: '#1E293B', margin: '0 0 5px 0', fontWeight: '800' }}>Gestión de Clase</h2>
          <p style={{ color: '#64748B', margin: 0 }}>Control de puntos rápido y efectivo.</p>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 25px', borderRadius: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <label style={{ fontWeight: '700', color: '#475569' }}>Curso:</label>
          <select value={cursoActual} onChange={(e) => setCursoActual(Number(e.target.value))} style={{ border: 'none', backgroundColor: '#F1F5F9', padding: '10px 15px', borderRadius: '10px', fontWeight: '700', color: '#6366F1', outline: 'none', cursor: 'pointer' }}>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <button onClick={abrirModalCurso} style={btnGhost('#6366F1')}>+ Nuevo Curso</button>
        </div>
      </header>

      {/* BARRA DE HERRAMIENTAS */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '25px', borderRadius: '20px', display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '15px', top: '14px', color: '#94A3B8' }}>🔍</span>
          <input type="search" placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 45px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', backgroundColor: '#F1F5F9', padding: '10px 20px', borderRadius: '15px', flex: '1 1 auto', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '800', marginRight: '5px' }}>PARA TODOS:</span>
          <button onClick={() => manejarPuntos(null, 1)} style={btnFast('#10B981')}>+1</button>
          <button onClick={() => manejarPuntos(null, 3)} style={btnFast('#10B981')}>+3</button>
          <button onClick={() => manejarPuntos(null, -1)} style={btnFast('#EF4444')}>-1</button>
          <button onClick={() => manejarPuntos(null, -3)} style={btnFast('#EF4444')}>-3</button>
        </div>

        <button onClick={abrirModalAgregar} style={{...btnStyle('#6366F1'), flex: '1 1 auto'}} disabled={cursos.length === 0}>+ Nuevo Estudiante</button>
      </section>

      {/* GRILLA DE ALUMNOS */}
      {cargando ? <p style={{ textAlign: 'center', padding: '50px' }}>Cargando estudiantes...</p> : (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
          {alumnosFiltrados.length === 0 && <p style={{ gridColumn: '1 / -1', color: '#64748B' }}>No hay alumnos para mostrar.</p>}
          
          {alumnosFiltrados.map((alumno) => (
            <article key={alumno.id} onClick={() => abrirPerfil(alumno.id)} style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '30px 20px', textAlign: 'center', cursor: 'pointer', position: 'relative', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              
              <button onClick={(e) => eliminarAlumno(alumno.id, e)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: '1.2rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#EF4444'} onMouseOut={(e) => e.currentTarget.style.color = '#CBD5E1'}>✖</button>
              
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#6366F1', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', fontWeight: 'bold', margin: '0 auto 15px auto' }}>
                {alumno.nombre.charAt(0)}
              </div>
              
              <h2 style={{ fontSize: '1.4rem', margin: '0 0 5px 0', color: '#1E293B', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alumno.nombre}</h2>
              
              <div style={{ display: 'inline-block', backgroundColor: '#FEF3C7', color: '#D97706', padding: '8px 20px', borderRadius: '25px', fontWeight: '900', fontSize: '1.6rem', marginBottom: '25px' }}>
                {alumno.puntos} <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>PTS</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={(e) => manejarPuntos(alumno.id, 1, e)} style={btnAction('#10B981')}>+1</button>
                <button onClick={(e) => manejarPuntos(alumno.id, 3, e)} style={btnAction('#10B981')}>+3</button>
                <button onClick={(e) => manejarPuntos(alumno.id, -1, e)} style={btnAction('#EF4444')}>-1</button>
                <button onClick={(e) => manejarPuntos(alumno.id, -3, e)} style={btnAction('#EF4444')}>-3</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* ================= MODALES ================= */}
      {(modalCursoActivo || modalAgregarActivo || perfilActivo) && (
        <div style={overlayStyle}>
            {modalCursoActivo && <form onSubmit={guardarNuevoCurso} style={modalStyle}>
              <h2 style={modalTitleStyle}>Nuevo Curso</h2>
              <label style={labelStyle}>Nombre:</label>
              <input type="text" value={nuevoNombreCurso} onChange={(e) => setNuevoNombreCurso(e.target.value)} style={inputFormStyle} required />
              <label style={labelStyle}>Sección:</label>
              <input type="text" value={nuevaSeccionCurso} onChange={(e) => setNuevaSeccionCurso(e.target.value)} style={inputFormStyle} />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalCursoActivo(false)} style={btnGhost('#64748B')}>Cancelar</button>
                <button type="submit" style={btnStyle('#6366F1')}>Crear</button>
              </div>
            </form>}

            {modalAgregarActivo && <form onSubmit={guardarNuevoAlumno} style={modalStyle}>
              <h2 style={modalTitleStyle}>Nuevo Estudiante</h2>
              <label style={labelStyle}>Nombres:</label>
              <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} style={inputFormStyle} required />
              <label style={labelStyle}>Apellidos:</label>
              <input type="text" value={nuevoApellido} onChange={(e) => setNuevoApellido(e.target.value)} style={inputFormStyle} required />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAgregarActivo(false)} style={btnGhost('#64748B')}>Cancelar</button>
                <button type="submit" style={btnStyle('#6366F1')}>Guardar</button>
              </div>
            </form>}

            {perfilActivo && datosPerfil && (
              <div style={{ ...modalStyle, maxWidth: '750px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '2px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#6366F1', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', fontWeight: 'bold' }}>
                      {datosPerfil.nombre.charAt(0)}
                    </div>
                    <h2 style={{ margin: 0, color: '#1E293B', fontSize: '1.8rem' }}>{datosPerfil.nombre}</h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: '600' }}>PUNTOS DISPONIBLES</span>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10B981' }}>{datosPerfil.puntos}</div>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.2rem', color: '#475569', marginBottom: '20px' }}>Inventario de Recompensas</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '10px' }}>
                  {datosPerfil.historial.length === 0 ? (
                    <p style={{ color: '#94A3B8', fontStyle: 'italic', gridColumn: '1 / -1' }}>El alumno aún no ha canjeado premios.</p>
                  ) : (
                    datosPerfil.historial.map(canje => {
                      const esUsada = canje.estado === 'Usado';
                      return (
                        <div key={canje.canje_id} style={{ border: `2px solid ${esUsada ? '#E2E8F0' : '#6366F1'}`, borderRadius: '16px', padding: '15px', backgroundColor: esUsada ? '#F8FAFC' : '#FFFFFF', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: esUsada ? 0.7 : 1 }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: esUsada ? '#94A3B8' : '#6366F1', textTransform: 'uppercase' }}>
                                {esUsada ? '✓ Utilizada' : '★ Disponible'}
                              </span>
                            </div>
                            <h4 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', color: esUsada ? '#94A3B8' : '#1E293B', textDecoration: esUsada ? 'line-through' : 'none' }}>
                              {canje.recompensa}
                            </h4>
                          </div>

                          <div style={{ fontSize: '0.85rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                            <p style={{ margin: '0 0 5px 0' }}>📅 <strong>Obtenida:</strong> {canje.fecha_obtencion}</p>
                            {esUsada ? (
                              <p style={{ margin: 0, color: '#EF4444', fontWeight: 'bold' }}>⏰ <strong>Usada el:</strong> {canje.fecha_uso}</p>
                            ) : (
                              <button onClick={() => utilizarPremio(canje.canje_id)} style={{ width: '100%', marginTop: '15px', padding: '12px', backgroundColor: '#6366F1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4F46E5'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366F1'}>
                                Utilizar Premio
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <button onClick={() => setPerfilActivo(null)} style={{ width: '100%', marginTop: '30px', padding: '15px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E2E8F0'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}>
                  Cerrar Ventana
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

const btnStyle = (bg) => ({ padding: '12px 20px', cursor: 'pointer', backgroundColor: bg, color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', transition: 'all 0.2s', whiteSpace: 'nowrap' });
const btnGhost = (color) => ({ backgroundColor: 'transparent', color: color, border: 'none', fontWeight: '700', cursor: 'pointer', padding: '10px', whiteSpace: 'nowrap' });
const btnFast = (bg) => ({ padding: '8px 15px', border: 'none', backgroundColor: bg, color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.1s' });
const btnAction = (bg) => ({ padding: '12px', border: `2px solid ${bg}`, backgroundColor: 'transparent', color: bg, borderRadius: '12px', fontWeight: '900', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' });
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' };
const modalStyle = { backgroundColor: '#fff', padding: 'clamp(20px, 5vw, 40px)', borderRadius: '24px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' };
const modalTitleStyle = { marginTop: 0, color: '#1E293B', marginBottom: '25px', fontSize: '1.6rem', fontWeight: '800' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '700', color: '#475569', fontSize: '0.9rem' };
const inputFormStyle = { width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px', boxSizing: 'border-box', backgroundColor: '#F8FAFC', outline: 'none', fontSize: '1rem' };