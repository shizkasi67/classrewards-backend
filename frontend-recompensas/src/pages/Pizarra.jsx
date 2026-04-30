import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Pizarra() {
  const [recompensas, setRecompensas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [alumnos, setAlumnos] = useState([]);

  // 1. Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resCursos, resPremios] = await Promise.all([
          api.get('/cursos'),
          api.get('/recompensas/clase')
        ]);
        setCursos(resCursos.data);
        setRecompensas(resPremios.data);
      } catch (err) {
        console.error("Error al cargar datos:", err);
      }
    };
    cargarDatos();
  }, []);

  // 2. Cargar alumnos cuando cambie el curso
  useEffect(() => {
    if (cursoSeleccionado) {
      api.get(`/cursos/${cursoSeleccionado}/alumnos`)
        .then(res => setAlumnos(res.data))
        .catch(err => console.error("Error al cargar alumnos:", err));
    }
  }, [cursoSeleccionado]);

  // 3. Función de compra
  const confirmarCompra = async (premio) => {
    if (!cursoSeleccionado) {
      return Swal.fire({
        title: '¡Espera!',
        text: 'Selecciona un curso primero.',
        icon: 'info',
        confirmButtonColor: '#6366F1'
      });
    }

    const opcionesAlumnos = {};
    alumnos.forEach(a => {
      opcionesAlumnos[a.id] = `${a.nombre} (${a.puntos} pts)`;
    });

    const { value: idAlumno } = await Swal.fire({
      title: `Canjear: ${premio.nombre}`,
      input: 'select',
      inputOptions: opcionesAlumnos,
      inputPlaceholder: 'Selecciona al estudiante',
      showCancelButton: true,
      confirmButtonColor: '#6366F1'
    });

    if (idAlumno) {
      try {
        await api.post('/tienda/comprar', {
          alumno_id: parseInt(idAlumno),
          recompensa_id: premio.id
        });
        Swal.fire('¡Éxito!', 'Premio canjeado', 'success');
        const resAlumnos = await api.get(`/cursos/${cursoSeleccionado}/alumnos`);
        setAlumnos(resAlumnos.data);
      } catch (err) {
        Swal.fire('Error', 'Puntos insuficientes.', 'error');
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '40px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' }}>
        <div>
          <h1 style={{ fontSize: '3rem', fontWeight: '900', color: '#818cf8', margin: 0 }}>MODO PIZARRA</h1>
          <p style={{ color: '#94a3b8' }}>Selecciona un premio para realizar un canje rápido.</p>
        </div>
        
        <div style={{ backgroundColor: '#1e293b', padding: '10px 20px', borderRadius: '15px' }}>
          <select 
            value={cursoSeleccionado} 
            onChange={(e) => setCursoSeleccionado(e.target.value)}
            style={{ backgroundColor: 'transparent', color: '#818cf8', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', outline: 'none' }}
          >
            <option value="">--- Elegir Curso ---</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
        {recompensas.length > 0 ? (
          recompensas.map(premio => (
            <div 
              key={premio.id}
              onClick={() => confirmarCompra(premio)}
              style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '25px', border: '2px solid #334155', cursor: 'pointer', position: 'relative' }}
            >
              <div style={{ position: 'absolute', top: '-15px', right: '-10px', backgroundColor: '#6366f1', padding: '8px 15px', borderRadius: '12px', fontWeight: 'bold' }}>
                {premio.costo} PTS
              </div>
              <h3 style={{ fontSize: '1.8rem', margin: '0 0 10px 0' }}>{premio.nombre}</h3>
              <p style={{ color: '#94a3b8' }}>{premio.descripcion}</p>
            </div>
          ))
        ) : (
          <p>No hay premios activos. Ejecuta el comando SQL en Neon.</p>
        )}
      </div>
    </div>
  );
}