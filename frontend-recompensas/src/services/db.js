import { supabase } from './supabase';

const fmt = (iso) => {
  if (!iso) return 'Pendiente';
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

// ── CURSOS ──────────────────────────────────────────────────────────────────
export const getCursos = async () => {
  const { data, error } = await supabase
    .from('cursos')
    .select('cursoid, nombrecurso, seccion')
    .order('nombrecurso');
  if (error) throw error;
  return data.map(c => ({
    id: c.cursoid,
    nombre: `${c.nombrecurso} ${c.seccion || ''}`.trim(),
    nombreBase: c.nombrecurso,
    seccion: c.seccion || '',
  }));
};

export const crearCurso = async (nombre, seccion) => {
  const { error } = await supabase
    .from('cursos')
    .insert({ nombrecurso: nombre, seccion: seccion || '' });
  if (error) throw error;
};

export const editarCurso = async (id, nombre, seccion) => {
  const { error } = await supabase
    .from('cursos')
    .update({ nombrecurso: nombre, seccion: seccion || '' })
    .eq('cursoid', id);
  if (error) throw error;
};

export const eliminarCurso = async (id) => {
  const [{ data: alumnos }, { data: acts }] = await Promise.all([
    supabase.from('alumnos').select('alumnoid').eq('cursoid', id),
    supabase.from('actividades').select('actividadid').eq('cursoid', id),
  ]);
  const alumnoIds = (alumnos || []).map(a => a.alumnoid);
  const actIds = (acts || []).map(a => a.actividadid);

  if (actIds.length > 0) await supabase.from('registroactividades').delete().in('actividadid', actIds);
  if (alumnoIds.length > 0) await supabase.from('historialcanjes').delete().in('alumnoid', alumnoIds);
  await supabase.from('historialpuntos').delete().eq('cursoid', id);
  await supabase.from('actividades').delete().eq('cursoid', id);
  await supabase.from('alumnos').delete().eq('cursoid', id);
  const { error } = await supabase.from('cursos').delete().eq('cursoid', id);
  if (error) throw error;
};

// ── ALUMNOS ─────────────────────────────────────────────────────────────────
export const getAlumnos = async (cursoId) => {
  const { data, error } = await supabase
    .from('alumnos')
    .select('alumnoid, nombre, apellido, puntos')
    .eq('cursoid', cursoId)
    .order('apellido');
  if (error) throw error;
  return data.map(a => ({ id: a.alumnoid, nombre: `${a.nombre} ${a.apellido}`, puntos: a.puntos }));
};

export const getDashboard = async () => {
  const cursos = await getCursos();
  const alumnos = cursos.length > 0 ? await getAlumnos(cursos[0].id) : [];
  return { cursos, alumnos, curso_id: cursos[0]?.id ?? null };
};

export const crearAlumno = async (nombre, apellido, cursoId) => {
  const { error } = await supabase
    .from('alumnos')
    .insert({ nombre, apellido, cursoid: cursoId, puntos: 0 });
  if (error) throw error;
};

export const eliminarAlumno = async (id) => {
  await supabase.from('historialpuntos').delete().eq('alumnoid', id);
  await supabase.from('historialcanjes').delete().eq('alumnoid', id);
  const { error } = await supabase.from('alumnos').delete().eq('alumnoid', id);
  if (error) throw error;
};

export const modificarPuntos = async (alumnoId, cursoId, cantidad) => {
  if (alumnoId) {
    const { data: al } = await supabase.from('alumnos').select('puntos, cursoid').eq('alumnoid', alumnoId).single();
    await Promise.all([
      supabase.from('alumnos').update({ puntos: al.puntos + cantidad }).eq('alumnoid', alumnoId),
      supabase.from('historialpuntos').insert({ alumnoid: alumnoId, cursoid: al.cursoid, cantidad, motivo: 'Ajuste' }),
    ]);
  } else {
    const { data: lista } = await supabase.from('alumnos').select('alumnoid, puntos').eq('cursoid', cursoId);
    await Promise.all([
      ...lista.map(a => supabase.from('alumnos').update({ puntos: a.puntos + cantidad }).eq('alumnoid', a.alumnoid)),
      supabase.from('historialpuntos').insert({ cursoid: cursoId, cantidad, motivo: 'Grupal' }),
    ]);
  }
};

// ── RECOMPENSAS ─────────────────────────────────────────────────────────────
export const getRecompensas = async () => {
  const { data, error } = await supabase
    .from('recompensas')
    .select('recompensaid, nombrerecompensa, costopuntos, descripcion')
    .order('costopuntos');
  if (error) throw error;
  return data.map(r => ({ id: r.recompensaid, nombre: r.nombrerecompensa, costo: r.costopuntos, descripcion: r.descripcion }));
};

export const crearRecompensa = async (nombre, costo, descripcion) => {
  const { error } = await supabase
    .from('recompensas')
    .insert({ nombrerecompensa: nombre, costopuntos: costo, descripcion: descripcion || '' });
  if (error) throw error;
};

export const editarRecompensa = async (id, nombre, costo, descripcion) => {
  const { error } = await supabase
    .from('recompensas')
    .update({ nombrerecompensa: nombre, costopuntos: costo, descripcion: descripcion || '' })
    .eq('recompensaid', id);
  if (error) throw error;
};

export const eliminarRecompensa = async (id) => {
  await supabase.from('historialcanjes').delete().eq('recompensaid', id);
  const { error } = await supabase.from('recompensas').delete().eq('recompensaid', id);
  if (error) throw error;
};

// ── TIENDA ───────────────────────────────────────────────────────────────────
export const getElegibles = async (recompensaId, cursoId) => {
  const { data: rec } = await supabase.from('recompensas').select('costopuntos').eq('recompensaid', recompensaId).single();
  const { data, error } = await supabase
    .from('alumnos')
    .select('alumnoid, nombre, apellido, puntos')
    .eq('cursoid', cursoId)
    .gte('puntos', rec.costopuntos)
    .order('apellido');
  if (error) throw error;
  return data.map(a => ({ id: a.alumnoid, nombre: `${a.nombre} ${a.apellido}`, puntos: a.puntos }));
};

export const comprarRecompensa = async (alumnoId, recompensaId) => {
  const { data: rec } = await supabase.from('recompensas').select('costopuntos').eq('recompensaid', recompensaId).single();
  const { data: al } = await supabase.from('alumnos').select('puntos').eq('alumnoid', alumnoId).single();
  if (al.puntos < rec.costopuntos) throw new Error('Puntos insuficientes');
  await Promise.all([
    supabase.from('alumnos').update({ puntos: al.puntos - rec.costopuntos }).eq('alumnoid', alumnoId),
    supabase.from('historialcanjes').insert({
      alumnoid: alumnoId, recompensaid: recompensaId,
      estadocanje: 'Disponible', fechaobtencion: new Date().toISOString(),
    }),
  ]);
};

// ── PERFIL ───────────────────────────────────────────────────────────────────
export const getPerfil = async (alumnoId) => {
  const { data: al } = await supabase.from('alumnos').select('nombre, apellido, puntos').eq('alumnoid', alumnoId).single();
  const { data: canjes } = await supabase
    .from('historialcanjes')
    .select('canjeid, recompensaid, estadocanje, fechaobtencion, fechauso')
    .eq('alumnoid', alumnoId)
    .order('fechaobtencion', { ascending: false });

  const ids = [...new Set(canjes.map(c => c.recompensaid))];
  let recMap = {};
  if (ids.length > 0) {
    const { data: recs } = await supabase.from('recompensas').select('recompensaid, nombrerecompensa').in('recompensaid', ids);
    recMap = Object.fromEntries(recs.map(r => [r.recompensaid, r.nombrerecompensa]));
  }

  return {
    nombre: `${al.nombre} ${al.apellido}`,
    puntos: al.puntos,
    historial: canjes.map(c => ({
      canje_id: c.canjeid,
      recompensa: recMap[c.recompensaid] || 'Premio',
      fecha_obtencion: fmt(c.fechaobtencion),
      fecha_uso: c.fechauso ? fmt(c.fechauso) : 'Pendiente',
      estado: c.estadocanje,
    })),
  };
};

export const usarPremio = async (canjeId) => {
  const { error } = await supabase
    .from('historialcanjes')
    .update({ estadocanje: 'Usado', fechauso: new Date().toISOString() })
    .eq('canjeid', canjeId);
  if (error) throw error;
};

export const getHistorialPuntos = async (cursoId) => {
  const { data, error } = await supabase
    .from('historialpuntos')
    .select('historialid, alumnoid, cantidad, motivo, fecha')
    .eq('cursoid', cursoId)
    .order('fecha', { ascending: false });
  if (error) throw error;

  const alumnoIds = [...new Set(data.filter(h => h.alumnoid).map(h => h.alumnoid))];
  let alumnoMap = {};
  if (alumnoIds.length > 0) {
    const { data: als } = await supabase.from('alumnos').select('alumnoid, nombre, apellido').in('alumnoid', alumnoIds);
    alumnoMap = Object.fromEntries(als.map(a => [a.alumnoid, `${a.nombre} ${a.apellido}`]));
  }

  return data.map(h => ({
    id: h.historialid,
    beneficiario: h.alumnoid ? (alumnoMap[h.alumnoid] || 'Alumno') : 'Grupo',
    cantidad: h.cantidad,
    motivo: h.motivo,
    fecha: fmt(h.fecha),
  }));
};

// ── ACTIVIDADES ──────────────────────────────────────────────────────────────
export const confirmarActividad = async (nombre, fecha, puntos, cursoId, alumnosRealizaron) => {
  const { data: act, error } = await supabase
    .from('actividades')
    .insert({ nombreactividad: nombre, fecha, puntosotorgados: puntos, cursoid: cursoId })
    .select('actividadid')
    .single();
  if (error) throw error;

  if (alumnosRealizaron.length === 0) return;

  const { data: lista } = await supabase.from('alumnos').select('alumnoid, puntos').in('alumnoid', alumnosRealizaron);

  await Promise.all([
    supabase.from('registroactividades').insert(alumnosRealizaron.map(id => ({ actividadid: act.actividadid, alumnoid: id }))),
    ...lista.map(a => supabase.from('alumnos').update({ puntos: a.puntos + puntos }).eq('alumnoid', a.alumnoid)),
    supabase.from('historialpuntos').insert(alumnosRealizaron.map(id => ({
      alumnoid: id, cursoid: cursoId, cantidad: puntos, motivo: `Actividad: ${nombre}`,
    }))),
  ]);
};

export const getActividades = async (cursoId) => {
  const { data, error } = await supabase
    .from('actividades')
    .select('actividadid, nombreactividad, fecha, puntosotorgados')
    .eq('cursoid', cursoId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data.map(a => ({ id: a.actividadid, nombre: a.nombreactividad, fecha: fmtDate(a.fecha), puntos: a.puntosotorgados }));
};

export const getDetalleActividad = async (actividadId) => {
  const [{ data: act }, { data: registros }] = await Promise.all([
    supabase.from('actividades').select('nombreactividad, fecha, puntosotorgados').eq('actividadid', actividadId).single(),
    supabase.from('registroactividades').select('alumnoid').eq('actividadid', actividadId),
  ]);

  const alumnoIds = registros.map(r => r.alumnoid);
  let alumnoMap = {};
  if (alumnoIds.length > 0) {
    const { data: als } = await supabase.from('alumnos').select('alumnoid, nombre, apellido').in('alumnoid', alumnoIds).order('apellido');
    alumnoMap = Object.fromEntries(als.map(a => [a.alumnoid, `${a.nombre} ${a.apellido}`]));
  }

  return {
    id: actividadId,
    nombre: act.nombreactividad,
    fecha: fmtDate(act.fecha),
    puntos: act.puntosotorgados,
    realizaron: alumnoIds.map(id => ({ id, nombre: alumnoMap[id] || 'Alumno' })),
  };
};

export const actualizarActividad = async (actividadId, alumnosRealizaron) => {
  const [{ data: act }, { data: oldRegs }] = await Promise.all([
    supabase.from('actividades').select('puntosotorgados, cursoid, nombreactividad').eq('actividadid', actividadId).single(),
    supabase.from('registroactividades').select('alumnoid').eq('actividadid', actividadId),
  ]);

  const { puntosotorgados: puntos, cursoid, nombreactividad: nombre } = act;
  const oldSet = new Set(oldRegs.map(r => r.alumnoid));
  const newSet = new Set(alumnosRealizaron);
  const agregados = [...newSet].filter(id => !oldSet.has(id));
  const quitados = [...oldSet].filter(id => !newSet.has(id));

  const ops = [supabase.from('registroactividades').delete().eq('actividadid', actividadId)];

  if (agregados.length > 0) {
    const { data: lista } = await supabase.from('alumnos').select('alumnoid, puntos').in('alumnoid', agregados);
    ops.push(
      ...lista.map(a => supabase.from('alumnos').update({ puntos: a.puntos + puntos }).eq('alumnoid', a.alumnoid)),
      supabase.from('historialpuntos').insert(agregados.map(id => ({ alumnoid: id, cursoid, cantidad: puntos, motivo: `Actividad (agregado tarde): ${nombre}` }))),
    );
  }

  if (quitados.length > 0) {
    const { data: lista } = await supabase.from('alumnos').select('alumnoid, puntos').in('alumnoid', quitados);
    ops.push(
      ...lista.map(a => supabase.from('alumnos').update({ puntos: a.puntos - puntos }).eq('alumnoid', a.alumnoid)),
      supabase.from('historialpuntos').insert(quitados.map(id => ({ alumnoid: id, cursoid, cantidad: -puntos, motivo: `Actividad (corregida): ${nombre}` }))),
    );
  }

  await Promise.all(ops);

  if (alumnosRealizaron.length > 0) {
    await supabase.from('registroactividades').insert(alumnosRealizaron.map(id => ({ actividadid: actividadId, alumnoid: id })));
  }
};
