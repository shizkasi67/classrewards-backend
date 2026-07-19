# Gestión de Clases

Aplicación web para la gestión de recompensas en la sala de clases. Permite a una profesora administrar cursos y estudiantes, otorgar o quitar puntos, canjear premios en una tienda virtual, presentar sorteos de premios en modo "pizarra" para proyectar en clase, y registrar actividades con la participación de cada alumno.

## ¿En qué se basa?

La dinámica es de **gamificación educativa**: los estudiantes ganan puntos por buen comportamiento o por participar en actividades, y esos puntos se canjean por premios definidos por la profesora en una tienda. Todo el manejo (cursos, alumnos, puntos, premios, canjes e historial) se hace desde un panel de control pensado para uso diario en clase.

### Módulos principales

- **Gestión de Alumnos** — alta/baja de cursos y estudiantes, ajuste de puntos individual o grupal, historial de movimientos y perfil de cada alumno con sus premios canjeados.
- **Tienda de Premios** — catálogo de recompensas con costo en puntos; permite otorgar un premio a uno o varios alumnos elegibles a la vez.
- **Modo Pizarra** — pantalla de presentación pensada para proyectar: muestra 3–5 premios (elegidos a mano o al azar) como tarjetas grandes con animación, para sortear o entregar en vivo frente al curso.
- **Actividades** — registro de actividades puntuales (tareas, dinámicas) marcando qué alumnos participaron, con historial editable.

## Estética

Pensada para el aula, no para una oficina: es una estética **colorida, lúdica y con emoticonos por todos lados**, hecha para que se vea atractiva y motivadora para niños y adolescentes en clase (no un dashboard corporativo serio). Tarjetas redondeadas, sombras suaves y una paleta de colores llamativos y contrastantes:


El uso de **emojis como iconografía principal** (🍎 🎁 🎯 📝 ✨ 🎲 👨‍🎓) reemplaza a los íconos tradicionales en casi toda la interfaz —botones, tarjetas, encabezados— reforzando el tono amigable y escolar en vez de uno técnico.

## Stack técnico

### Backend
- **Python 3.11** + **FastAPI** 
- **psycopg2** 
- **PyJWT** 

### Frontend
- **React 19** + **Vite** 
- **@supabase/supabase-js** — PostgreSQL .
- **axios** 

### Autenticación
- **Supabase Auth** (email/contraseña)

