import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import psycopg2 # <--- Nueva librería para PostgreSQL
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta

# 1. CARGAR VARIABLES SECRETAS
load_dotenv()
DB_CONNECTION_STRING = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

app = FastAPI(title="Backend Profesora - Sistema de Recompensas Seguro")

# 2. CONFIGURACIÓN DE CORS
url_permitida = os.getenv("FRONTEND_URL", "https://classrewards-backend.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[url_permitida],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 3. SEGURIDAD: ENCRIPTACIÓN Y TOKENS
# ==========================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def create_access_token(data: dict):
    """Crea un token JWT que caduca en 12 horas"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=12)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verificar_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """El Guardia de Seguridad: Verifica que el token enviado por React sea auténtico"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        correo: str = payload.get("sub")
        if correo is None:
            raise HTTPException(status_code=401, detail="Credenciales inválidas")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Sesión expirada o token inválido")

# ==========================================
# 4. CONEXIÓN A BASE DE DATOS
# ==========================================
def get_db_connection():
    try:
        return psycopg2.connect(DB_CONNECTION_STRING)
    except Exception as e:
        print(f"❌ Error conectando a BD: {str(e)}")
        raise HTTPException(status_code=500, detail="Error de conexión a la base de datos")

# ==========================================
# 5. MODELOS DE DATOS (PYDANTIC)
# ==========================================
class NuevoCursoRequest(BaseModel):
    nombre: str
    seccion: Optional[str] = ""

class NuevoAlumnoRequest(BaseModel):
    nombre: str
    apellido: str
    curso_id: int

class ModificarPuntosRequest(BaseModel):
    alumno_id: Optional[int] = None
    curso_id: Optional[int] = None
    cantidad: int

class NuevaRecompensaRequest(BaseModel):
    nombre: str
    costo: int
    descripcion: Optional[str] = ""

class CompraRequest(BaseModel):
    alumno_id: int
    recompensa_id: int

class SeleccionRecompensasRequest(BaseModel):
    ids: List[int]

class LoginRequest(BaseModel):
    correo: str
    contrasena: str

# ==========================================
# 6. RUTAS: AUTENTICACIÓN (Ruta Pública)
# ==========================================
@app.post("/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Cambiamos ? por %s y pasamos (req.correo,) como tupla
        cursor.execute("SELECT ProfesorID, Nombre, Contrasena FROM Profesores WHERE Correo = %s", (req.correo,))
        profesor = cursor.fetchone()
        
        if not profesor:
            raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
            
        hashed_password = profesor[2] # Posición 2 es la contraseña
        
        # Verificamos matemáticamente la contraseña
        if not pwd_context.verify(req.contrasena, hashed_password):
            raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
            
        # Generamos el Token JWT firmado
        token = create_access_token(data={"sub": req.correo, "nombre": profesor[1]})
        
        return {
            "mensaje": "Login exitoso", 
            "nombre": profesor[1], 
            "token": token 
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# ==========================================
# 7. RUTAS: CURSOS (Protegidas)
# ==========================================
@app.get("/cursos")
def obtener_cursos(usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT CursoID, NombreCurso, Seccion FROM Cursos")
    # Lectura por índices: r[0]=ID, r[1]=Nombre, r[2]=Sección
    cursos = [{"id": r[0], "nombre": f"{r[1]} {r[2] if r[2] else ''}".strip()} for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return cursos

@app.post("/cursos")
def crear_curso(req: NuevoCursoRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Cursos (NombreCurso, Seccion) VALUES (%s, %s)", (req.nombre, req.seccion))
        conn.commit()
        return {"mensaje": "Curso creado"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Error al crear el curso")
    finally:
        cursor.close()
        conn.close()

# ==========================================
# 8. RUTAS: ALUMNOS Y PUNTOS (Protegidas)
# ==========================================
@app.get("/cursos/{curso_id}/alumnos")
def obtener_alumnos_por_curso(curso_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT AlumnoID, Nombre, Apellido, Puntos FROM Alumnos WHERE CursoID = %s ORDER BY Apellido ASC", (curso_id,))
    alumnos = [{"id": r[0], "nombre": f"{r[1]} {r[2]}", "puntos": r[3]} for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return alumnos

@app.post("/alumnos")
def crear_alumno(req: NuevoAlumnoRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Alumnos (Nombre, Apellido, CursoID, Puntos) VALUES (%s, %s, %s, 0)", (req.nombre, req.apellido, req.curso_id))
        conn.commit()
        return {"mensaje": "Alumno agregado"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Error al agregar alumno")
    finally:
        cursor.close()
        conn.close()

@app.delete("/alumnos/{alumno_id}")
def eliminar_alumno(alumno_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM HistorialCanjes WHERE AlumnoID = %s", (alumno_id,))
        cursor.execute("DELETE FROM Alumnos WHERE AlumnoID = %s", (alumno_id,))
        conn.commit()
        return {"mensaje": "Alumno eliminado"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Error al eliminar alumno")
    finally:
        cursor.close()
        conn.close()

@app.post("/alumnos/modificar-puntos")
def modificar_puntos(req: ModificarPuntosRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        motivo = "Ajuste de puntos"
        if req.alumno_id:
            cursor.execute("UPDATE Alumnos SET Puntos = Puntos + %s WHERE AlumnoID = %s AND (Puntos + %s) >= 0", (req.cantidad, req.alumno_id, req.cantidad))
            # Insertar en historial
            cursor.execute(
                "INSERT INTO HistorialPuntos (AlumnoID, CursoID, Cantidad, Motivo) SELECT %s, CursoID, %s, %s FROM Alumnos WHERE AlumnoID = %s",
                (req.alumno_id, req.cantidad, motivo, req.alumno_id)
            )
        elif req.curso_id:
            cursor.execute("UPDATE Alumnos SET Puntos = Puntos + %s WHERE CursoID = %s AND (Puntos + %s) >= 0", (req.cantidad, req.curso_id, req.cantidad))
            cursor.execute(
                "INSERT INTO HistorialPuntos (CursoID, Cantidad, Motivo) VALUES (%s, %s, %s)",
                (req.curso_id, req.cantidad, "Puntos otorgados a todo el curso")
            )
        conn.commit()
        return {"mensaje": "Puntos actualizados e historial registrado"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/alumnos/{alumno_id}/perfil")
def obtener_perfil_alumno(alumno_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT Nombre, Apellido, Puntos FROM Alumnos WHERE AlumnoID = %s", (alumno_id,))
    alumno_row = cursor.fetchone()
    if not alumno_row:
        raise HTTPException(status_code=404, detail="No encontrado")
        
    cursor.execute("""
        SELECT h.CanjeID, r.NombreRecompensa, h.FechaObtencion, h.FechaUso, h.EstadoCanje 
        FROM HistorialCanjes h JOIN Recompensas r ON h.RecompensaID = r.RecompensaID
        WHERE h.AlumnoID = %s ORDER BY h.FechaObtencion DESC
    """, (alumno_id,))
    
    historial = [{
        "canje_id": row[0], "recompensa": row[1],
        "fecha_obtencion": row[2].strftime("%Y-%m-%d %H:%M") if row[2] else "Desconocida",
        "fecha_uso": row[3].strftime("%Y-%m-%d %H:%M") if row[3] else None,
        "estado": row[4]
    } for row in cursor.fetchall()]
        
    cursor.close()
    conn.close()
    return {"nombre": f"{alumno_row[0]} {alumno_row[1]}", "puntos": alumno_row[2], "historial": historial}

# ==========================================
# 9. RUTAS: TIENDA Y RECOMPENSAS (Protegidas)
# ==========================================
@app.get("/recompensas")
def obtener_recompensas(usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT RecompensaID, NombreRecompensa, CostoPuntos, Descripcion FROM Recompensas")
    recompensas = [{"id": r[0], "nombre": r[1], "costo": r[2], "descripcion": r[3]} for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return recompensas

@app.post("/recompensas")
def crear_recompensa(req: NuevaRecompensaRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Recompensas (NombreRecompensa, CostoPuntos, Descripcion, ActivaParaClase) VALUES (%s, %s, %s, 0)", (req.nombre, req.costo, req.descripcion))
        conn.commit()
        return {"mensaje": "Recompensa creada"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Error al crear")
    finally:
        cursor.close()
        conn.close()

@app.delete("/recompensas/{recompensa_id}")
def eliminar_recompensa(recompensa_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM HistorialCanjes WHERE RecompensaID = %s", (recompensa_id,))
        cursor.execute("DELETE FROM Recompensas WHERE RecompensaID = %s", (recompensa_id,))
        conn.commit()
        return {"mensaje": "Eliminada"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Error al eliminar")
    finally:
        cursor.close()
        conn.close()

@app.get("/tienda/recompensas/{recompensa_id}/elegibles")
def alumnos_elegibles_para_recompensa(recompensa_id: int, curso_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT CostoPuntos FROM Recompensas WHERE RecompensaID = %s", (recompensa_id,))
    recompensa = cursor.fetchone()
    
    cursor.execute("SELECT AlumnoID, Nombre, Apellido, Puntos FROM Alumnos WHERE CursoID = %s AND Puntos >= %s", (curso_id, recompensa[0]))
    alumnos = [{"id": r[0], "nombre": f"{r[1]} {r[2]}", "puntos": r[3]} for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return alumnos

@app.post("/tienda/comprar")
def comprar_recompensa(req: CompraRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT CostoPuntos FROM Recompensas WHERE RecompensaID = %s", (req.recompensa_id,))
        costo = cursor.fetchone()[0]

        cursor.execute("UPDATE Alumnos SET Puntos = Puntos - %s WHERE AlumnoID = %s AND Puntos >= %s", (costo, req.alumno_id, costo))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=400, detail="Puntos insuficientes")

        # CURRENT_TIMESTAMP en lugar de GETDATE()
        cursor.execute("INSERT INTO HistorialCanjes (AlumnoID, RecompensaID, EstadoCanje, FechaObtencion) VALUES (%s, %s, 'Disponible', CURRENT_TIMESTAMP)", (req.alumno_id, req.recompensa_id))
        conn.commit()
        return {"mensaje": "Compra exitosa"}
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/canjes/{canje_id}/usar")
def usar_recompensa(canje_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # CURRENT_TIMESTAMP en lugar de GETDATE()
        cursor.execute("UPDATE HistorialCanjes SET EstadoCanje = 'Usado', FechaUso = CURRENT_TIMESTAMP WHERE CanjeID = %s AND EstadoCanje = 'Disponible'", (canje_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=400, detail="Premio ya usado")
        conn.commit()
        return {"mensaje": "Recompensa utilizada"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# ==========================================
# 10. RUTAS: MODO PIZARRA (Protegidas)
# ==========================================
@app.get("/recompensas/clase")
def obtener_recompensas_clase(usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT RecompensaID, NombreRecompensa, Descripcion, CostoPuntos FROM Recompensas WHERE ActivaParaClase = 1")
    recompensas = [{"id": r[0], "nombre": r[1], "descripcion": r[2], "costo": r[3]} for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return recompensas

@app.post("/recompensas/clase/seleccionar")
def seleccionar_recompensas_clase(req: SeleccionRecompensasRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Recompensas SET ActivaParaClase = 0")
        if req.ids:
            placeholders = ','.join(['%s'] * len(req.ids))
            query = f"UPDATE Recompensas SET ActivaParaClase = 1 WHERE RecompensaID IN ({placeholders})"
            cursor.execute(query, tuple(req.ids))
        conn.commit()
        return {"mensaje": "Premios actualizados"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/recompensas/azar")
def recompensas_al_azar(usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Recompensas SET ActivaParaClase = 0")
        # Cambiamos TOP 3 y NEWID() por RANDOM() y LIMIT 3 de Postgres
        cursor.execute("UPDATE Recompensas SET ActivaParaClase = 1 WHERE RecompensaID IN (SELECT RecompensaID FROM Recompensas ORDER BY RANDOM() LIMIT 3)")
        conn.commit()
        
        cursor.execute("SELECT RecompensaID, NombreRecompensa, Descripcion, CostoPuntos FROM Recompensas WHERE ActivaParaClase = 1")
        recompensas = [{"id": r[0], "nombre": r[1], "descripcion": r[2], "costo": r[3]} for r in cursor.fetchall()]
        return recompensas
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()