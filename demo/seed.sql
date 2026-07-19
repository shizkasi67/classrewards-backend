-- =============================================================
-- Gestion de Clases — Proyecto DEMO
-- Ejecutar en el SQL Editor de un proyecto Supabase nuevo (aparte
-- del de producción). Este mismo script se usa dos veces:
--   1) Una vez a mano, para dejar la demo lista la primera vez.
--   2) Cada noche via GitHub Actions, para resetear los datos
--      a este mismo estado (ver .github/workflows/demo-reset.yml).
-- Por eso crea las tablas si no existen y de ahí las vacía y
-- vuelve a poblar — correrlo de nuevo siempre deja el mismo resultado.
-- =============================================================

-- ── ESQUEMA (igual al de producción) ────────────────────────────

CREATE TABLE IF NOT EXISTS profesores (
    profesorid   SERIAL PRIMARY KEY,
    correo       VARCHAR UNIQUE NOT NULL,
    nombre       VARCHAR NOT NULL,
    contrasena   VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS cursos (
    cursoid      SERIAL PRIMARY KEY,
    nombrecurso  VARCHAR NOT NULL,
    seccion      VARCHAR DEFAULT ''
);

CREATE TABLE IF NOT EXISTS alumnos (
    alumnoid  SERIAL PRIMARY KEY,
    nombre    VARCHAR NOT NULL,
    apellido  VARCHAR NOT NULL,
    cursoid   INTEGER REFERENCES cursos(cursoid) ON DELETE CASCADE,
    puntos    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recompensas (
    recompensaid      SERIAL PRIMARY KEY,
    nombrerecompensa  VARCHAR NOT NULL,
    descripcion       TEXT DEFAULT '',
    costopuntos       INTEGER NOT NULL,
    activaparaclase   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS historialpuntos (
    historialid  SERIAL PRIMARY KEY,
    alumnoid     INTEGER REFERENCES alumnos(alumnoid) ON DELETE CASCADE,
    cursoid      INTEGER REFERENCES cursos(cursoid) ON DELETE CASCADE,
    cantidad     INTEGER NOT NULL,
    motivo       VARCHAR,
    fecha        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historialcanjes (
    canjeid          SERIAL PRIMARY KEY,
    alumnoid         INTEGER REFERENCES alumnos(alumnoid) ON DELETE CASCADE,
    recompensaid     INTEGER REFERENCES recompensas(recompensaid) ON DELETE CASCADE,
    estadocanje      VARCHAR DEFAULT 'Disponible',
    fechaobtencion   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fechauso         TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actividades (
    actividadid       SERIAL PRIMARY KEY,
    nombreactividad   VARCHAR NOT NULL,
    fecha             DATE NOT NULL,
    puntosotorgados   INTEGER NOT NULL,
    cursoid           INTEGER REFERENCES cursos(cursoid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registroactividades (
    registroid   SERIAL PRIMARY KEY,
    actividadid  INTEGER REFERENCES actividades(actividadid) ON DELETE CASCADE,
    alumnoid     INTEGER REFERENCES alumnos(alumnoid) ON DELETE CASCADE
);

-- ── SEGURIDAD (RLS) ──────────────────────────────────────────────
-- Solo usuarios logueados (Supabase Auth) pueden leer/escribir.
-- El registro público de nuevas cuentas debe quedar deshabilitado
-- desde el dashboard (Authentication > Providers > Email > Disable signups).

ALTER TABLE profesores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recompensas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE historialpuntos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE historialcanjes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades         ENABLE ROW LEVEL SECURITY;
ALTER TABLE registroactividades ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profesores','cursos','alumnos','recompensas','historialpuntos','historialcanjes','actividades','registroactividades']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS demo_autenticados ON %I', t);
    EXECUTE format('CREATE POLICY demo_autenticados ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ── RESET DE DATOS ───────────────────────────────────────────────
-- Vacía todo y reinicia los IDs, para que este script sea reproducible.

TRUNCATE TABLE
  registroactividades, actividades, historialcanjes, historialpuntos,
  recompensas, alumnos, cursos, profesores
RESTART IDENTITY CASCADE;

-- ── DATOS DE PRUEBA ──────────────────────────────────────────────

INSERT INTO cursos (nombrecurso, seccion) VALUES
  ('5° Básico', 'A'),   -- cursoid 1
  ('8° Básico', 'B');   -- cursoid 2

INSERT INTO alumnos (nombre, apellido, cursoid, puntos) VALUES
  ('Alumno', '1',  1, 120),  -- alumnoid 1
  ('Alumno', '2',  1,  85),  -- 2
  ('Alumno', '3',  1, 150),  -- 3
  ('Alumno', '4',  1,  40),  -- 4
  ('Alumno', '5',  1,  95),  -- 5
  ('Alumno', '6',  1,  60),  -- 6
  ('Alumno', '7',  1, 175),  -- 7
  ('Alumno', '8',  1,  30),  -- 8
  ('Alumno', '9',  1, 110),  -- 9
  ('Alumno', '10', 1,  75),  -- 10
  ('Alumno', '11', 1,  20),  -- 11
  ('Alumno', '12', 1, 130),  -- 12
  ('Alumno', '13', 2, 200),  -- 13
  ('Alumno', '14', 2,  45),  -- 14
  ('Alumno', '15', 2,  90),  -- 15
  ('Alumno', '16', 2,  15),  -- 16
  ('Alumno', '17', 2, 160),  -- 17
  ('Alumno', '18', 2,  70),  -- 18
  ('Alumno', '19', 2,  25),  -- 19
  ('Alumno', '20', 2, 140),  -- 20
  ('Alumno', '21', 2,  55),  -- 21
  ('Alumno', '22', 2, 100);  -- 22

INSERT INTO recompensas (nombrerecompensa, descripcion, costopuntos) VALUES
  ('Elegir la música de la clase 🎵',        'Pone la playlist durante un bloque de trabajo',      20),  -- 1
  ('Snack saludable 🍎',                     'Una fruta o snack a la hora de colación',             15),  -- 2
  ('Sentarse donde quiera por un día 🪑',    'Cambia de puesto por un día',                         30),  -- 3
  ('Ser ayudante del profesor 📋',           'Reparte materiales y ayuda durante la clase',         40),  -- 4
  ('Sin tarea por un día 📚',                'Se libera de la tarea de un día',                     50),  -- 5
  ('Salir 5 minutos antes 🎉',               'Sale antes al recreo o a la salida',                  60),  -- 6
  ('Diploma "Estrella de la semana" ⭐',      'Diploma impreso para pegar en el cuaderno',            80),  -- 7
  ('Premio sorpresa 🎁',                     'Premio físico sorpresa de la caja de premios',       120);  -- 8

INSERT INTO historialpuntos (alumnoid, cursoid, cantidad, motivo, fecha) VALUES
  (1,  1, 20,  'Ajuste', NOW() - INTERVAL '9 days'),
  (3,  1, 30,  'Ajuste', NOW() - INTERVAL '8 days'),
  (7,  1, 25,  'Ajuste', NOW() - INTERVAL '6 days'),
  (4,  1, -10, 'Ajuste', NOW() - INTERVAL '5 days'),
  (NULL, 1, 10, 'Grupal', NOW() - INTERVAL '4 days'),
  (9,  1, 15,  'Ajuste', NOW() - INTERVAL '2 days'),
  (13, 2, 40,  'Ajuste', NOW() - INTERVAL '7 days'),
  (17, 2, 20,  'Ajuste', NOW() - INTERVAL '6 days'),
  (16, 2, -5,  'Ajuste', NOW() - INTERVAL '3 days'),
  (NULL, 2, 10, 'Grupal', NOW() - INTERVAL '3 days'),
  (20, 2, 15,  'Ajuste', NOW() - INTERVAL '1 days');

INSERT INTO historialcanjes (alumnoid, recompensaid, estadocanje, fechaobtencion, fechauso) VALUES
  (3,  8, 'Usado',      NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days'),
  (7,  7, 'Disponible', NOW() - INTERVAL '2 days',  NULL),
  (13, 6, 'Usado',      NOW() - INTERVAL '5 days',  NOW() - INTERVAL '3 days'),
  (17, 5, 'Disponible', NOW() - INTERVAL '1 days',  NULL),
  (20, 3, 'Usado',      NOW() - INTERVAL '6 days',  NOW() - INTERVAL '4 days');

INSERT INTO actividades (nombreactividad, fecha, puntosotorgados, cursoid) VALUES
  ('Trabajo en grupo: sistema solar', CURRENT_DATE - INTERVAL '8 days',  15, 1),  -- actividadid 1
  ('Disertación de lenguaje',         CURRENT_DATE - INTERVAL '3 days',  20, 1),  -- 2
  ('Feria científica',                CURRENT_DATE - INTERVAL '10 days', 25, 2),  -- 3
  ('Debate de historia',              CURRENT_DATE - INTERVAL '2 days',  10, 2);  -- 4

INSERT INTO registroactividades (actividadid, alumnoid) VALUES
  (1, 1), (1, 2), (1, 3), (1, 5), (1, 7), (1, 9), (1, 12),
  (2, 2), (2, 4), (2, 6), (2, 8), (2, 10),
  (3, 13), (3, 15), (3, 17), (3, 19), (3, 21),
  (4, 14), (4, 16), (4, 18), (4, 20), (4, 22);
