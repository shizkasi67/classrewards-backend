import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Dashboard() {
  const [alumnos, setAlumnos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cursoActual, setCursoActual] = useState('');
  const [historialPuntos, setHistorialPuntos] = useState([]);
  
  // Estados para nuevo alumno
  const [modalAlumno, setModalAlumno] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');

  // Estados para modificar puntos
  const [modalPuntos, setModalPuntos] = useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [cantidadPuntos, setCantidadPuntos] = useState('');

  const cargarCursos = async () => {
    try {
      const res = await api.get('/cursos');
      setCursos(res.data);
      if (res.data.length > 0 && !cursoActual) {
        setCursoActual(res.data[0].id);
      }
    } catch (error) {
      console.error("Error al cargar cursos", error);
    }
  };

  const cargarAlumnos = async () => {
    if (!cursoActual) return;
    try {
      const res = await api.get(`/cursos/${cursoActual}/alumnos`);
      setAlumnos(res.data);
    } catch (error) {
      console.error("Error al cargar alumnos", error);
    }
  };

  const cargarHistorial = async () => {
    if (!cursoActual) return;
    try {
      const res = await api.get(`/cursos/${cursoActual}/historial-puntos`);
      setHistorialPuntos(res.data);
    } catch (error) {
      console.error("Error al cargar historial", error);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  useEffect(() => {
    if (cursoActual) {
      cargarAlumnos();
      cargarHistorial();
    }
  }, [cursoActual]);

  // --- FUNCIÓN: GUARDAR ALUMNO NUEVO ---
  const guardarAlumno = async (e) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoApellido) {
      return Swal.fire('Atención', 'Completa el nombre y apellido.', 'warning');
    }

    try {
      await api.post('/alumnos', {
        nombre: nuevoNombre,
        apellido: nuevoApellido,
        curso_id: cursoActual // Enviamos el ID del curso actual
      });
      
      setModalAlumno(false);
      setNuevoNombre('');
      setNuevoApellido('');
      
      Swal.fire({ title: '¡Éxito!', text: 'Alumno agregado.', icon: 'success', timer: 1500, showConfirmButton: false });
      cargarAlumnos(); // Refrescamos la lista
    } catch (error) {
      Swal.fire('Error', 'No se pudo agregar al alumno.', 'error');
    }
  };

  // --- FUNCIÓN: MODIFICAR PUNTOS ---
  const procesarPuntos = async (e) => {
    e.preventDefault();
    const pts = parseInt(cantidadPuntos);
    if (isNaN(pts)) return;

    try {
      await api.post('/alumnos/modificar-puntos', {
        alumno_id: alumnoSeleccionado?.id || null,
        curso_id: alumnoSeleccionado ? null : cursoActual,
        cantidad: pts
      });

      setModalPuntos(false);
      setCantidadPuntos('');
      setAlumnoSeleccionado(null);
      
      Swal.fire({ title: 'Puntos Actualizados', icon: 'success', timer: 1500, showConfirmButton: false });
      cargarAlumnos();
      cargarHistorial();
    } catch (error) {
      Swal.fire('Error', 'No se pudieron ajustar los puntos.', 'error');
    }
  };

  const verPerfil = async (id) => {
    try {
      const res = await api.get(`/alumnos/${id}/perfil`);
      const { nombre, puntos, historial } = res.data;

      let tablaHistorial = `
        <div style="max-height: 300px; overflow-y: auto;">
          <table style="width: 100%; font-size: 0.8rem; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #eee;">
                <th style="padding: 8px;">Premio</th>
                <th style="padding: 8px;">Obtenido</th>
                <th style="padding: 8px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${historial.map(h => `
                <tr style="border-bottom: 1px solid #f9f9f9;">
                  <td style="padding: 8px;"><b>${h.recompensa}</b></td>
                  <td style="padding: 8px;">${h.fecha_obtencion}</td>
                  <td style="padding: 8px;">
                    <span style="color: ${h.estado === 'Disponible' ? '#10B981' : '#64748B'}">
                      ${h.estado}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${historial.length === 0 ? '<p style="margin-top: 10px;">Sin compras registradas.</p>' : ''}
        </div>
      `;

      Swal.fire({
        title: nombre,
        html: `<p><b>Puntos actuales:</b> ${puntos}</p>${tablaHistorial}`,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#6366F1'
      });
    } catch (error) {
      Swal.fire('Error', 'No se pudo cargar el perfil.', 'error');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* HEADER DASHBOARD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1E293B' }}>Gestión de Estudiantes</h2>
          <select value={cursoActual} onChange={(e) => setCursoActual(Number(e.target.value))} style={{ marginTop: '10px', padding: '8px', borderRadius: '10px', border: '1px solid #CBD5E1', fontWeight: 'bold', color: '#6366F1' }}>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <button onClick={() => setModalAlumno(true)} style={{ backgroundColor: '#6366F1', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          + Agregar Alumno
        </button>
      </div>

      {/* LISTA DE ALUMNOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {alumnos.map(alumno => (
          <div key={alumno.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'relative' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1E293B' }}>{alumno.nombre}</div>
            <div style={{ color: '#10B981', fontWeight: '800', margin: '5px 0' }}>{alumno.puntos} Puntos</div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={() => verPerfil(alumno.id)} style={{ flex: 1, padding: '8px', border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>Historial</button>
              <button onClick={() => { setAlumnoSeleccionado(alumno); setModalPuntos(true); }} style={{ flex: 1, padding: '8px', backgroundColor: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>+/- Puntos</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL AGREGAR ALUMNO */}
      {modalAlumno && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Nuevo Estudiante</h3>
            <form onSubmit={guardarAlumno}>
              <input type="text" placeholder="Nombre" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} style={inputStyle} />
              <input type="text" placeholder="Apellido" value={nuevoApellido} onChange={(e) => setNuevoApellido(e.target.value)} style={inputStyle} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalAlumno(false)} style={{ flex: 1, background: '#F1F5F9', border: 'none', padding: '10px', borderRadius: '10px' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, background: '#6366F1', color: 'white', border: 'none', padding: '10px', borderRadius: '10px' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PUNTOS */}
      {modalPuntos && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Ajustar Puntos</h3>
            <p>{alumnoSeleccionado ? `Alumno: ${alumnoSeleccionado.nombre}` : 'A todo el curso'}</p>
            <form onSubmit={procesarPuntos}>
              <input type="number" placeholder="Ej: 10 o -5" value={cantidadPuntos} onChange={(e) => setCantidadPuntos(e.target.value)} style={inputStyle} autoFocus />
              <button type="submit" style={{ width: '100%', background: '#10B981', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', marginTop: '10px' }}>Aplicar</button>
              <button type="button" onClick={() => setModalPuntos(false)} style={{ width: '100%', background: 'transparent', border: 'none', marginTop: '10px', color: '#64748B' }}>Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalStyle = { background: 'white', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px' };
const inputStyle = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', boxSizing: 'border-box' };