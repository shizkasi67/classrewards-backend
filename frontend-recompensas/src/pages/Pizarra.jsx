import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Pizarra() {
  const [recompensas, setRecompensas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [alumnos, setAlumnos] = useState([]);

  // 1. Cargar datos iniciales (Cursos y Premios activos)
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

  // 2. Cargar alumnos cuando cambie el curso seleccionado
  useEffect(() => {
    if (cursoSeleccionado) {
      api.get(`/cursos/${cursoSeleccionado}/alumnos`)
        .then(res => setAlumnos(res.data))
        .catch(err => console.error("Error al cargar alumnos:", err));
    }
  }, [cursoSeleccionado]);

  // 3. Función de compra rápida
  const confirmarCompra = async (premio) => {
    if (!cursoSeleccionado) {
      return Swal.fire({
        title: '¡Espera!',
        text: 'Selecciona un curso primero en el menú superior.',
        icon: 'info',
        confirmButtonColor: '#6366F1'
      });
    }

    // El backend ya envía nombre y apellido juntos en la propiedad "nombre"
    const opcionesAlumnos = {};
    alumnos.forEach(a => {
      opcionesAlumnos[a.id] = `${a.nombre} (${a.puntos} pts)`;
    });

    const { value: idAlumno } = await Swal.fire({
      title: `Canjear: ${premio.nombre}`,
      text: `Costo: ${premio.costo} puntos`,
      input: 'select',
      inputOptions: opcionesAlumnos,
      inputPlaceholder: 'Selecciona al estudiante',
      showCancelButton: true,
      confirmButtonText: 'Confirmar Canje',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6366F1',
      cancelButtonColor: '#64748B',
    });

    if (idAlumno) {
      try {
        await api.post('/tienda/comprar', {
          alumno_id: parseInt(idAlumno),
          recompensa_id: premio.id
        });

        Swal.fire({
          title: '¡Éxito!',
          text: 'Premio canjeado correctamente.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });

        // Actualizar puntos de los alumnos localmente
        const resAlumnos = await api.get(`/cursos/${cursoSeleccionado}/alumnos`);
        setAlumnos(resAlumnos.data);

      } catch (err) {
        Swal.fire('Error', 'Puntos insuficientes o problema de conexión.', 'error');
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '40px', fontFamily: 'sans-serif' }}>
      {/* CABECERA */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: '900', color: '#818cf8', margin: 0 }}>MODO PIZARRA</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '5px' }}>Selecciona un premio para realizar un canje rápido.</p>
        </div>
        
        <div style={{ backgroundColor: '#1e293b', padding: '10px 20px', borderRadius: '15px', border: '1px solid #334155' }}>
          <label style={{ marginRight: '10px', fontWeight: 'bold', color: '#94a3b8' }}>Curso:</label>
          <select 
            value={cursoSeleccionado} 
            onChange={(e) => setCursoSeleccionado(e.target.value)}
            style={{ backgroundColor: 'transparent', color: '#818cf8', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">--- Elegir Curso ---</option>
            {cursos.map(c => (
              <option key={c.id} value={c.id} style={{ backgroundColor: '#1e293b', color: 'white' }}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* REJILLA DE PREMIOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '40px' }}>
        {recompensas.length > 0 ? (
          recompensas.map(premio => (
            <div 
              key={premio.id}
              onClick={() => confirmarCompra(premio)}
              style={{ 
                backgroundColor: '#1e293b', 
                padding: '40px', 
                borderRadius: '30px', 
                border: '2px solid #334155', 
                cursor: 'pointer', 
                position: 'relative', 
                transition: 'all 0.3s ease',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.transform = 'translateY(-5px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Burbuja de Costo */}
              <div style={{ 
                position: 'absolute', 
                top: '-20px', 
                right: '-10px', 
                backgroundColor: '#6366f1', 
                color: 'white', 
                padding: '10px 20px', 
                borderRadius: '15px', 
                fontWeight: '900', 
                fontSize: '1.3rem',
                boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)' 
              }}>
                {premio.costo} PTS
              </div>

              <h3 style={{ fontSize: '2rem', margin: '0 0 15px 0', color: '#f8fafc', fontWeight: '800' }}>{premio.nombre}</h3>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.6', fontStyle: 'italic' }}>
                {premio.descripcion || "Sin descripción disponible."}
              </p>
              
              <div style={{ 
                marginTop: '30px', 
                fontSize: '0.85rem', 
                fontWeight: 'bold', 
                color: '#6366f1', 
                textTransform: 'uppercase', 
                letterSpacing: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ width: '30px', height: '2px', backgroundColor: '#6366f1' }}></span>
                Tocar para canjear
              </div>
            </div>
          ))
        ) : (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '100px 20px', 
            border: '2px dashed #334155', 
            borderRadius: '40px',
            backgroundColor: 'rgba(30, 41, 59, 0.3)'
          }}>
            <p style={{ fontSize: '1.8rem', color: '#64748b', fontWeight: 'bold' }}>No hay premios activos en la pizarra.</p>
            <p style={{ color: '#475569', marginTop: '10px' }}>Asegúrate de haber ejecutado el comando SQL para activarlos.</p>
          </div>
        )}
      </div>
    </div>
  );
}