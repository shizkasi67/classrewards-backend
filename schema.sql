-- =============================================
-- Schema - Gestion de Clases
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

CREATE TABLE IF NOT EXISTS profesores (
    profesorid   SERIAL PRIMARY KEY,
    correo       TEXT UNIQUE NOT NULL,
    nombre       TEXT NOT NULL,
    contrasena   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cursos (
    cursoid      SERIAL PRIMARY KEY,
    nombrecurso  TEXT NOT NULL,
    seccion      TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS alumnos (
    alumnoid  SERIAL PRIMARY KEY,
    nombre    TEXT NOT NULL,
    apellido  TEXT NOT NULL,
    cursoid   INTEGER REFERENCES cursos(cursoid) ON DELETE CASCADE,
    puntos    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recompensas (
    recompensaid      SERIAL PRIMARY KEY,
    nombrerecompensa  TEXT NOT NULL,
    costopuntos       INTEGER NOT NULL,
    descripcion       TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS historialpuntos (
    historialid  SERIAL PRIMARY KEY,
    alumnoid     INTEGER REFERENCES alumnos(alumnoid) ON DELETE CASCADE,
    cursoid      INTEGER REFERENCES cursos(cursoid) ON DELETE CASCADE,
    cantidad     INTEGER NOT NULL,
    motivo       TEXT DEFAULT 'Ajuste',
    fecha        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historialcanjes (
    canjeid          SERIAL PRIMARY KEY,
    alumnoid         INTEGER REFERENCES alumnos(alumnoid) ON DELETE CASCADE,
    recompensaid     INTEGER REFERENCES recompensas(recompensaid) ON DELETE CASCADE,
    estadocanje      TEXT DEFAULT 'Disponible',
    fechaobtencion   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fechauso         TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actividades (
    actividadid       SERIAL PRIMARY KEY,
    nombreactividad   TEXT NOT NULL,
    fecha             DATE NOT NULL,
    puntosotorgados   INTEGER NOT NULL,
    cursoid           INTEGER REFERENCES cursos(cursoid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registroactividades (
    actividadid  INTEGER REFERENCES actividades(actividadid) ON DELETE CASCADE,
    alumnoid     INTEGER REFERENCES alumnos(alumnoid) ON DELETE CASCADE,
    PRIMARY KEY (actividadid, alumnoid)
);
