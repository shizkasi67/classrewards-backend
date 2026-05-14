import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Actividades() {
  const [cursos, setCursos] = useState([]);
  const [cursoActual, setCursoActual] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Actividad en preparación (en memoria hasta confirmar)
  const [actividadActual, setActividadActual] = useState(null);
  const [marcas, setMarcas] = useState({}); // { alumnoId: true } — solo quienes SÍ realizaron

  // Modal nueva actividad
  const [modalNuevaActividad, setModalNuevaActividad] = useState(false);
  const [nombreActividad, setNombreActividad] = useState('');
  const [fechaActividad, setFechaActividad] = useState('');
  const [puntosActividad, setPuntosActividad] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  // Historial
  const [modalHistorial, setModalHistorial] = useState(false);
  const [historialActividades, setHistorialActividades] = useState([]);
  const [actividadDetalle, setActividadDetalle] = useState(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Edición de actividad histórica
  const [modoEdicion, setModoEdicion] = useState(false);
  const [marcasEdicion, setMarcasEdicion] = useState({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  useEffect(() => {
    const cargarCursos = async () => {
      try {
        const res = await api.get('/cursos');
        setCursos(res.data);
        if (res.data.length > 0) setCursoActual(res.data[0].id);
      } catch (err) { console.error(err); }
    };
    cargarCursos();
  }, []);

  useEffect(() => {
    if (!cursoActual) return;
    const cargarAlumnos = async () => {
      setCargando(true);
      try {
        const res = await api.get(`/cursos/${cursoActual}/alumnos`);
        setAlumnos(res.data);
        setMarcas({});
      } catch (err) { console.error(err); }
      finally { setCargando(false); }
    };
    cargarAlumnos();
  }, [cursoActual]);

  const cambiarCurso = (id) => {
    setCursoActual(Number(id));
    setActividadActual(null);
    setMarcas({});
  };

  const abrirModalNuevaActividad = () => {
    setNombreActividad('');
    setFechaActividad(new Date().toISOString().split('T')[0]);
    setPuntosActividad('');
    setModalNuevaActividad(true);
  };

  const crearActividad = (e) => {
    e.preventDefault();
    if (!nombreActividad.trim()) {
      return Swal.fire({ title: 'Falta el nombre', text: 'Escribe el nombre de la actividad.', icon: 'warning', confirmButtonColor: '#6366F1' });
    }
    if (!puntosActividad || Number(puntosActividad) <= 0) {
      return Swal.fire({ title: 'Puntos inválidos', text: 'Ingresa una cantidad de puntos mayor a 0.', icon: 'warning', confirmButtonColor: '#6366F1' });
    }
    setActividadActual({ nombre: nombreActividad.trim(), fecha: fechaActividad, puntos: Number(puntosActividad) });
    setMarcas({});
    setModalNuevaActividad(false);
  };

  // Marcar/desmarcar alumno — solo "sí realizó"; sin marca = no realizó
  const toggleMarca = (alumnoId) => {
    setMarcas(prev => ({ ...prev, [alumnoId]: !prev[alumnoId] }));
  };

  const confirmarActividad = async () => {
    if (!actividadActual) return;
    const alumnosRealizaron = alumnos.filter(a => marcas[a.id]).map(a => a.id);

    if (alumnosRealizaron.length === 0) {
      return Swal.fire({ title: 'Sin marcas', text: 'Marca al menos un alumno antes de confirmar.', icon: 'warning', confirmButtonColor: '#6366F1' });
    }

    const result = await Swal.fire({
      title: '¿Confirmar actividad?',
      html: `Se otorgarán <b>${actividadActual.puntos} puntos</b> a <b>${alumnosRealizaron.length}</b> estudiante${alumnosRealizaron.length !== 1 ? 's' : ''} por:<br/><br/><b>"${actividadActual.nombre}"</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6366F1',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setConfirmando(true);
    try {
      await api.post('/actividades/confirmar', {
        nombre: actividadActual.nombre,
        fecha: actividadActual.fecha,
        puntos: actividadActual.puntos,
        curso_id: cursoActual,
        alumnos_realizaron: alumnosRealizaron
      });
      Swal.fire({
        title: '¡Actividad registrada!',
        text: `${alumnosRealizaron.length} estudiante${alumnosRealizaron.length !== 1 ? 's' : ''} recibieron ${actividadActual.puntos} puntos.`,
        icon: 'success',
        confirmButtonColor: '#6366F1',
        timer: 2500,
        showConfirmButton: false
      });
      setActividadActual(null);
      setMarcas({});
      const res = await api.get(`/cursos/${cursoActual}/alumnos`);
      setAlumnos(res.data);
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'No se pudo registrar la actividad.', icon: 'error', confirmButtonColor: '#EF4444' });
    } finally {
      setConfirmando(false);
    }
  };

  const abrirHistorial = async () => {
    if (!cursoActual) return;
    setActividadDetalle(null);
    setModoEdicion(false);
    setCargandoHistorial(true);
    setModalHistorial(true);
    try {
      const res = await api.get(`/cursos/${cursoActual}/actividades`);
      setHistorialActividades(res.data);
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'No se pudo cargar el historial.', icon: 'error', confirmButtonColor: '#EF4444' });
    } finally {
      setCargandoHistorial(false);
    }
  };

  const verDetalleActividad = async (actividad) => {
    setModoEdicion(false);
    try {
      const res = await api.get(`/actividades/${actividad.id}/detalle`);
      setActividadDetalle(res.data);
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'No se pudo cargar el detalle.', icon: 'error', confirmButtonColor: '#EF4444' });
    }
  };

  const entrarModoEdicion = () => {
    const realizaronIds = new Set(actividadDetalle.realizaron.map(a => a.id));
    const marcasIniciales = {};
    alumnos.forEach(a => { marcasIniciales[a.id] = realizaronIds.has(a.id); });
    setMarcasEdicion(marcasIniciales);
    setModoEdicion(true);
  };

  const guardarEdicion = async () => {
    const alumnosRealizaron = Object.entries(marcasEdicion)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));

    setGuardandoEdicion(true);
    try {
      await api.put(`/actividades/${actividadDetalle.id}/actualizar`, {
        alumnos_realizaron: alumnosRealizaron
      });
      // Refrescar detalle y puntos de alumnos
      const [detalle, alumnosActualizados] = await Promise.all([
        api.get(`/actividades/${actividadDetalle.id}/detalle`),
        api.get(`/cursos/${cursoActual}/alumnos`)
      ]);
      setActividadDetalle(detalle.data);
      setAlumnos(alumnosActualizados.data);
      setModoEdicion(false);
      Swal.fire({ title: '¡Guardado!', text: 'La actividad fue actualizada.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'No se pudo actualizar la actividad.', icon: 'error', confirmButtonColor: '#EF4444' });
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const totalSi = alumnos.filter(a => marcas[a.id]).length;

  return (
    <div style={{ width: '100%' }}>

      {/* CABECERA */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', color: '#1E293B', margin: '0 0 5px 0', fontWeight: '800' }}>Registro de Actividades</h2>
          <button onClick={abrirHistorial} style={btnGhost('#6366F1')}>📋 Historial de Actividades</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 25px', borderRadius: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <label style={{ fontWeight: '700', color: '#475569' }}>Curso:</label>
          <select
            value={cursoActual}
            onChange={(e) => cambiarCurso(e.target.value)}
            style={{ border: 'none', backgroundColor: '#F1F5F9', padding: '10px 15px', borderRadius: '10px', fontWeight: '700', color: '#6366F1', outline: 'none', cursor: 'pointer' }}
          >
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <button onClick={abrirModalNuevaActividad} style={btnStyle('#6366F1')}>+ Nueva Actividad</button>
        </div>
      </header>

      {/* BANNER ACTIVIDAD ACTIVA */}
      {actividadActual && (
        <div style={{ backgroundColor: '#EEF2FF', border: '2px solid #6366F1', borderRadius: '15px', padding: '15px 25px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: '#6366F1', color: 'white', padding: '5px 15px', borderRadius: '20px', fontWeight: '800', fontSize: '0.85rem', letterSpacing: '0.5px' }}>ACTIVIDAD ACTIVA</span>
            <span style={{ fontWeight: '800', color: '#1E293B', fontSize: '1.05rem' }}>{actividadActual.nombre}</span>
            <span style={{ color: '#64748B', fontSize: '0.9rem' }}>📅 {actividadActual.fecha}</span>
            <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 14px', borderRadius: '10px', fontWeight: '800', fontSize: '0.9rem' }}>+{actividadActual.puntos} pts</span>
          </div>
          <button onClick={() => { setActividadActual(null); setMarcas({}); }} style={btnGhost('#EF4444')}>✕ Cancelar</button>
        </div>
      )}

      {/* ESTADO VACÍO */}
      {!actividadActual && (
        <div style={{ backgroundColor: '#EEF2FF', border: '2px dashed #A5B4FC', borderRadius: '20px', padding: '60px 40px', textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>📝</div>
          <h3 style={{ margin: '0 0 10px 0', fontWeight: '800', fontSize: '1.4rem', color: '#1E293B' }}>Sin actividad activa</h3>
          <p style={{ margin: '0 0 25px 0', color: '#818CF8', fontSize: '1rem' }}>
            Crea una nueva actividad para comenzar a registrar<br />la participación de los alumnos.
          </p>
          <button onClick={abrirModalNuevaActividad} style={btnStyle('#6366F1')}>+ Crear Nueva Actividad</button>
        </div>
      )}

      {/* TABLA DE ALUMNOS */}
      {cargando ? (
        <p style={{ textAlign: 'center', padding: '50px', color: '#64748B', fontWeight: '600' }}>Cargando alumnos...</p>
      ) : actividadActual && alumnos.length > 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}>

          {/* Encabezado tabla */}
          <div style={{ backgroundColor: '#1E293B', padding: '16px 25px', display: 'grid', gridTemplateColumns: '1fr 100px', gap: '10px', alignItems: 'center' }}>
            <span style={{ color: '#94A3B8', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Estudiante</span>
            <span style={{ color: '#34D399', fontWeight: '800', fontSize: '0.8rem', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase' }}>✓ Realizó</span>
          </div>

          {/* Filas — toda la fila es clickeable */}
          {alumnos.map((alumno, index) => {
            const hizo = marcas[alumno.id] === true;
            return (
              <div
                key={alumno.id}
                onClick={() => toggleMarca(alumno.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '14px 25px',
                  backgroundColor: hizo ? '#F0FDF4' : index % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  borderBottom: '1px solid #F1F5F9',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    backgroundColor: hizo ? '#10B981' : '#6366F1',
                    color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    fontWeight: '800', fontSize: '1rem', transition: 'background-color 0.15s'
                  }}>
                    {alumno.nombre.charAt(0)}
                  </div>
                  <span style={{ fontWeight: '700', color: '#1E293B', fontSize: '1rem' }}>{alumno.nombre}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    border: `2px solid ${hizo ? '#10B981' : '#CBD5E1'}`,
                    backgroundColor: hizo ? '#10B981' : 'transparent',
                    color: hizo ? 'white' : '#CBD5E1',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    transition: 'all 0.15s', fontWeight: 'bold', fontSize: '1.1rem',
                    userSelect: 'none'
                  }}>✓</div>
                </div>
              </div>
            );
          })}

          {/* Pie: resumen + confirmar */}
          <div style={{ padding: '20px 25px', backgroundColor: '#F8FAFC', borderTop: '2px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <span style={{ color: '#10B981', fontWeight: '700', fontSize: '0.95rem' }}>✓ {totalSi} realizaron</span>
              <span style={{ color: '#94A3B8', fontWeight: '600', fontSize: '0.95rem' }}>○ {alumnos.length - totalSi} sin marcar</span>
            </div>
            <button
              onClick={confirmarActividad}
              disabled={totalSi === 0 || confirmando}
              style={{
                padding: '14px 35px',
                backgroundColor: totalSi > 0 && !confirmando ? '#6366F1' : '#CBD5E1',
                color: 'white', border: 'none', borderRadius: '12px',
                fontWeight: '800', cursor: totalSi > 0 && !confirmando ? 'pointer' : 'default',
                fontSize: '1rem', transition: 'all 0.2s',
                boxShadow: totalSi > 0 && !confirmando ? '0 4px 10px rgba(99, 102, 241, 0.35)' : 'none'
              }}
            >
              {confirmando ? 'Guardando...' : 'Confirmar Actividad ✓'}
            </button>
          </div>
        </div>
      ) : null}

      {/* =================== MODALES =================== */}
      {(modalNuevaActividad || modalHistorial) && (
        <div style={overlayStyle}>

          {/* Modal: Nueva Actividad */}
          {modalNuevaActividad && (
            <form onSubmit={crearActividad} style={modalStyle}>
              <h2 style={modalTitleStyle}>Nueva Actividad</h2>
              <label style={labelStyle}>Nombre de la actividad:</label>
              <input
                type="text"
                placeholder="Ej: Tarea de matemáticas"
                value={nombreActividad}
                onChange={(e) => setNombreActividad(e.target.value)}
                style={inputFormStyle}
                required autoFocus
              />
              <label style={labelStyle}>Fecha:</label>
              <input
                type="date"
                value={fechaActividad}
                onChange={(e) => setFechaActividad(e.target.value)}
                style={inputFormStyle}
                required
              />
              <label style={labelStyle}>Puntos que otorga:</label>
              <input
                type="number"
                min="1"
                placeholder="Ej: 5"
                value={puntosActividad}
                onChange={(e) => setPuntosActividad(e.target.value)}
                style={inputFormStyle}
                required
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalNuevaActividad(false)} style={btnGhost('#64748B')}>Cancelar</button>
                <button type="submit" style={btnStyle('#6366F1')}>Crear Actividad</button>
              </div>
            </form>
          )}

          {/* Modal: Historial */}
          {modalHistorial && (
            <div style={{ ...modalStyle, maxWidth: '580px' }}>
              {/* Header del modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '2px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {actividadDetalle && (
                    <button
                      onClick={() => { setActividadDetalle(null); setModoEdicion(false); }}
                      style={{ ...btnGhost('#6366F1'), padding: '6px 8px', fontSize: '0.9rem' }}
                    >← Volver</button>
                  )}
                  <h2 style={{ ...modalTitleStyle, margin: 0, fontSize: '1.3rem' }}>
                    {!actividadDetalle && 'Historial de Actividades'}
                    {actividadDetalle && !modoEdicion && actividadDetalle.nombre}
                    {actividadDetalle && modoEdicion && 'Editar Actividad'}
                  </h2>
                </div>
                <button
                  onClick={() => { setModalHistorial(false); setActividadDetalle(null); setModoEdicion(false); }}
                  style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', color: '#94A3B8', cursor: 'pointer', lineHeight: 1 }}
                >✕</button>
              </div>

              {/* Vista: detalle de actividad (solo realizaron) */}
              {actividadDetalle && !modoEdicion && (
                <div>
                  <div style={{ backgroundColor: '#EEF2FF', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: '#64748B', fontSize: '0.9rem' }}>📅 {actividadDetalle.fecha}</span>
                      <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '3px 12px', borderRadius: '10px', fontWeight: '800', fontSize: '0.875rem' }}>+{actividadDetalle.puntos} pts</span>
                    </div>
                    <button onClick={entrarModoEdicion} style={{ ...btnStyle('#6366F1'), padding: '8px 16px', fontSize: '0.875rem' }}>✏️ Editar</button>
                  </div>

                  <h4 style={{ color: '#10B981', margin: '0 0 12px 0', fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ✓ Realizaron ({actividadDetalle.realizaron?.length || 0})
                  </h4>
                  <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    {actividadDetalle.realizaron?.length === 0 ? (
                      <p style={{ color: '#94A3B8', fontSize: '0.9rem', fontStyle: 'italic', padding: '10px 0' }}>Ningún alumno registrado.</p>
                    ) : actividadDetalle.realizaron?.map(a => (
                      <div key={a.id} style={{ padding: '10px 15px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', marginBottom: '8px', color: '#065F46', fontWeight: '600', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#10B981', fontWeight: '900', fontSize: '1rem' }}>✓</span>
                        {a.nombre}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vista: edición de actividad */}
              {actividadDetalle && modoEdicion && (
                <div>
                  <p style={{ margin: '0 0 15px 0', color: '#64748B', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    Marca o desmarca alumnos. Los puntos se ajustan automáticamente al guardar.
                  </p>
                  <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '20px' }}>
                    {alumnos.map((alumno, index) => {
                      const hizo = marcasEdicion[alumno.id] === true;
                      return (
                        <div
                          key={alumno.id}
                          onClick={() => setMarcasEdicion(prev => ({ ...prev, [alumno.id]: !prev[alumno.id] }))}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 15px',
                            backgroundColor: hizo ? '#F0FDF4' : index % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                            border: hizo ? '1px solid #BBF7D0' : '1px solid #F1F5F9',
                            borderRadius: '10px', marginBottom: '8px',
                            cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                              backgroundColor: hizo ? '#10B981' : '#6366F1',
                              color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center',
                              fontWeight: '800', fontSize: '0.9rem', transition: 'background-color 0.15s'
                            }}>
                              {alumno.nombre.charAt(0)}
                            </div>
                            <span style={{ fontWeight: '700', color: '#1E293B', fontSize: '0.95rem' }}>{alumno.nombre}</span>
                          </div>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            border: `2px solid ${hizo ? '#10B981' : '#CBD5E1'}`,
                            backgroundColor: hizo ? '#10B981' : 'transparent',
                            color: hizo ? 'white' : '#CBD5E1',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.15s',
                            userSelect: 'none', flexShrink: 0
                          }}>✓</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setModoEdicion(false)} style={btnGhost('#64748B')}>Cancelar</button>
                    <button
                      onClick={guardarEdicion}
                      disabled={guardandoEdicion}
                      style={{ ...btnStyle('#6366F1'), opacity: guardandoEdicion ? 0.7 : 1 }}
                    >
                      {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </div>
              )}

              {/* Vista: lista del historial */}
              {!actividadDetalle && (
                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {cargandoHistorial ? (
                    <p style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontWeight: '600' }}>Cargando...</p>
                  ) : historialActividades.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94A3B8' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
                      <p style={{ fontWeight: '700', margin: 0, fontSize: '1rem' }}>No hay actividades registradas aún.</p>
                    </div>
                  ) : (
                    historialActividades.map(act => (
                      <div
                        key={act.id}
                        onClick={() => verDetalleActividad(act)}
                        style={{ padding: '18px 20px', border: '1px solid #E2E8F0', borderRadius: '14px', marginBottom: '10px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: '#F8FAFC' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#EEF2FF'; e.currentTarget.style.borderColor = '#A5B4FC'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: '0 0 4px 0', color: '#1E293B', fontWeight: '800', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.nombre}</h4>
                            <span style={{ color: '#64748B', fontSize: '0.875rem' }}>📅 {act.fecha}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 14px', borderRadius: '10px', fontWeight: '800', fontSize: '0.875rem' }}>+{act.puntos} pts</span>
                            <span style={{ color: '#A5B4FC', fontSize: '1rem' }}>›</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const btnStyle = (bg) => ({ padding: '12px 20px', cursor: 'pointer', backgroundColor: bg, color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', transition: 'all 0.2s', whiteSpace: 'nowrap' });
const btnGhost = (color) => ({ backgroundColor: 'transparent', color: color, border: 'none', fontWeight: '700', cursor: 'pointer', padding: '10px', whiteSpace: 'nowrap' });
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' };
const modalStyle = { backgroundColor: '#fff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' };
const modalTitleStyle = { marginTop: 0, color: '#1E293B', marginBottom: '25px', fontSize: '1.6rem', fontWeight: '800' };
const inputFormStyle = { width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px', boxSizing: 'border-box', backgroundColor: '#F8FAFC', outline: 'none', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '700', color: '#475569', fontSize: '0.9rem' };
