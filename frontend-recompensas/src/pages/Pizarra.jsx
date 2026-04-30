import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Pizarra() {
  const [recompensas, setRecompensas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [alumnos, setAlumnos] = useState([]);

  // 1. Cargar cursos y premios activos para la pizarra al iniciar
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const [resCursos, resPremios] = await Promise.all([
          api.get('/cursos'),
          api.get('/recompensas/clase')
        ]);
        setCursos(resCursos.data);
        setRecompensas(resPremios.data);
      } catch (err) {
        console.error("Error al cargar datos iniciales:", err);
      }
    };
    cargarDatosIniciales();
  }, []);

  // 2. Cargar lista de alumnos cuando el profesor cambia el curso
  useEffect(() => {
    if (cursoSeleccionado) {
      api.get(`/cursos/${cursoSeleccionado}/alumnos`)
        .then(res => setAlumnos(res.data))
        .catch(err => console.error("Error al cargar alumnos:", err));
    } else {
      setAlumnos([]);
    }
  }, [cursoSeleccionado]);

  // 3. Lógica de canje interactivo
  const confirmarCompra = async (premio) => {
    if (!cursoSeleccionado) {
      return Swal.fire({
        title: '¡Espera!',
        text: 'Primero debes seleccionar un curso en la parte superior.',
        icon: 'info',
        confirmButtonColor: '#6366F1'
      });
    }

    // Generamos las opciones del select con el nombre completo y puntos actuales
    const opcionesAlumnos = {};
    alumnos.forEach(a => {
      opcionesAlumnos[a.id] = `${a.nombre} (${a.puntos} pts)`;
    });

    const { value: idAlumno } = await Swal.fire({
      title: `Canjear: ${premio.nombre}`,
      text: `Se descontarán ${premio.costo} puntos.`,
      input: 'select',
      inputOptions: opcionesAlumnos,
      inputPlaceholder: '¿Quién recibe el premio?',
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
          title: '¡Canje Exitoso!',
          text: `El premio ha sido asignado a la mochila del estudiante.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        // Actualizamos la lista de alumnos para reflejar el nuevo puntaje inmediatamente
        const resActualizada = await api.get(`/cursos/${cursoSeleccionado}/alumnos`);
        setAlumnos(resActualizada.data);

      } catch (err) {
        const mensajeError = err.response?.data?.detail || 'No se pudo procesar la compra.';
        Swal.fire('Error', mensajeError, 'error');
      }
    }
  };

  return (
    <div className="p-8 min-h-screen bg-slate-950 text-white font-sans">
      {/* HEADER INTERACTIVO */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            MODO PIZARRA
          </h1>
          <p className="text-slate-500 font-medium mt-2">Selecciona un premio para realizar un canje rápido.</p>
        </div>
        
        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-2xl">
          <select 
            value={cursoSeleccionado} 
            onChange={(e) => setCursoSeleccionado(e.target.value)}
            className="bg-transparent px-6 py-3 rounded-xl text-indigo-300 font-bold outline-none cursor-pointer min-w-[250px]"
          >
            <option value="" className="bg-slate-900 text-slate-400">--- Elegir Curso ---</option>
            {cursos.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* REJILLA DE PREMIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {recompensas.length > 0 ? (
          recompensas.map(premio => (
            <div 
              key={premio.id}
              onClick={() => confirmarCompra(premio)}
              className="group relative bg-slate-900 border-2 border-slate-800 p-10 rounded-[2.5rem] cursor-pointer hover:border-indigo-500 hover:scale-[1.02] transition-all duration-300 shadow-xl"
            >
              {/* Etiqueta de Costo */}
              <div className="absolute -top-5 -right-3 bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-2 rounded-2xl font-black text-xl shadow-2xl transform group-hover:rotate-6 transition-transform">
                {premio.costo} <span className="text-xs opacity-80">PTS</span>
              </div>

              <h3 className="text-3xl font-extrabold mb-4 text-slate-100 group-hover:text-indigo-400 transition-colors">
                {premio.nombre}
              </h3>
              
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                {premio.descripcion || "Sin descripción disponible."}
              </p>

              <div className="flex items-center gap-3 text-indigo-500 font-bold text-sm uppercase tracking-[0.2em]">
                <span className="w-8 h-[2px] bg-indigo-500"></span>
                Tocar para canjear
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-800">
            <p className="text-2xl text-slate-600 font-bold italic">No hay premios activos en la pizarra.</p>
            <p className="text-slate-700 mt-2">Activa premios desde la sección de Recompensas.</p>
          </div>
        )}
      </div>
    </div>
  );
}