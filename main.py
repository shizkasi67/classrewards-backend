import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import psycopg2 
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta

# 1. CARGAR VARIABLES SECRETAS
load_dotenv()
DB_CONNECTION_STRING = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

app = FastAPI(title="Backend ClassRewards - Sistema de Recompensas")

# 2. CONFIGURACIÓN DE CORS
url_permitida = os.getenv("FRONTEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[url_permitida],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. SEGURIDAD
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=12)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verificar_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        correo: str = payload.get("sub")
        if correo is None:
            raise HTTPException(status_code=401, detail="Credenciales inválidas")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Sesión expirada")

def get_db_connection():
    return psycopg2.connect(DB_CONNECTION_STRING)

# 4. MODELOS (PYDANTIC)
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

class CompraRequest(BaseModel):
    alumno_id: int
    recompensa_id: int

class NuevaRecompensaRequest(BaseModel):
    nombre: str
    costo: int
    descripcion: Optional[str] = ""

class SeleccionPizarraRequest(BaseModel):
    ids: List[int]

# ==========================================
# 5. RUTAS: ALUMNOS Y CURSOS
# ==========================================
@app.get("/cursos")
def obtener_cursos(usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT CursoID, NombreCurso, Seccion FROM Cursos ORDER BY NombreCurso ASC")
    cursos = [{"id": r[0], "nombre": f"{r[1]} {r[2] if r[2] else ''}".strip()} for r in cursor.fetchall()]
    cursor.close(); conn.close()
    return cursos

@app.post("/cursos")
def crear_curso(req: NuevoCursoRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("INSERT INTO Cursos (NombreCurso, Seccion) VALUES (%s, %s)", (req.nombre, req.seccion))
    conn.commit(); cursor.close(); conn.close()
    return {"mensaje": "Curso creado"}

@app.get("/cursos/{curso_id}/alumnos")
def obtener_alumnos(curso_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT AlumnoID, Nombre, Apellido, Puntos FROM Alumnos WHERE CursoID = %s ORDER BY Apellido ASC", (curso_id,))
    alumnos = [{"id": r[0], "nombre": f"{r[1]} {r[2]}", "puntos": r[3]} for r in cursor.fetchall()]
    cursor.close(); conn.close()
    return alumnos

@app.post("/alumnos")
def crear_alumno(req: NuevoAlumnoRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("INSERT INTO Alumnos (Nombre, Apellido, CursoID, Puntos) VALUES (%s, %s, %s, 0)", (req.nombre, req.apellido, req.curso_id))
    conn.commit(); cursor.close(); conn.close()
    return {"mensaje": "Alumno agregado"}

@app.delete("/alumnos/{alumno_id}")
def eliminar_alumno(alumno_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("DELETE FROM HistorialPuntos WHERE AlumnoID = %s", (alumno_id,))
    cursor.execute("DELETE FROM HistorialCanjes WHERE AlumnoID = %s", (alumno_id,))
    cursor.execute("DELETE FROM Alumnos WHERE AlumnoID = %s", (alumno_id,))
    conn.commit(); cursor.close(); conn.close()
    return {"mensaje": "Eliminado"}

# ==========================================
# 6. RUTAS: PUNTOS E HISTORIAL
# ==========================================
@app.post("/alumnos/modificar-puntos")
def modificar_puntos(req: ModificarPuntosRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    if req.alumno_id:
        cursor.execute("UPDATE Alumnos SET Puntos = Puntos + %s WHERE AlumnoID = %s", (req.cantidad, req.alumno_id))
        cursor.execute("INSERT INTO HistorialPuntos (AlumnoID, CursoID, Cantidad, Motivo) SELECT %s, CursoID, %s, 'Ajuste' FROM Alumnos WHERE AlumnoID = %s", (req.alumno_id, req.cantidad, req.alumno_id))
    elif req.curso_id:
        cursor.execute("UPDATE Alumnos SET Puntos = Puntos + %s WHERE CursoID = %s", (req.cantidad, req.curso_id))
        cursor.execute("INSERT INTO HistorialPuntos (CursoID, Cantidad, Motivo) VALUES (%s, %s, 'Ajuste Grupal')", (req.curso_id, req.cantidad))
    conn.commit(); cursor.close(); conn.close()
    return {"mensaje": "Puntos actualizados"}

@app.get("/cursos/{curso_id}/historial-puntos")
def historial(curso_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT h.HistorialID, COALESCE(a.Nombre || ' ' || a.Apellido, 'Grupo'), h.Cantidad, h.Motivo, h.Fecha FROM HistorialPuntos h LEFT JOIN Alumnos a ON h.AlumnoID = a.AlumnoID WHERE h.CursoID = %s ORDER BY h.Fecha DESC LIMIT 50", (curso_id,))
    res = [{"id": r[0], "beneficiario": r[1], "cantidad": r[2], "motivo": r[3], "fecha": r[4].strftime("%d/%m/%Y %H:%M")} for r in cursor.fetchall()]
    cursor.close(); conn.close()
    return res

# ==========================================
# 7. RUTAS: TIENDA Y CANJES
# ==========================================
@app.get("/recompensas")
def catalogo(usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT RecompensaID, NombreRecompensa, CostoPuntos, Descripcion FROM Recompensas ORDER BY CostoPuntos ASC")
    res = [{"id": r[0], "nombre": r[1], "costo": r[2], "descripcion": r[3]} for r in cursor.fetchall()]
    cursor.close(); conn.close()
    return res

@app.get("/tienda/recompensas/{rec_id}/elegibles")
def alumnos_elegibles(rec_id: int, curso_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT CostoPuntos FROM Recompensas WHERE RecompensaID = %s", (rec_id,))
    costo_row = cursor.fetchone()
    if not costo_row: raise HTTPException(status_code=404, detail="Recompensa no encontrada")
    costo = costo_row[0]
    cursor.execute("SELECT AlumnoID, Nombre, Apellido, Puntos FROM Alumnos WHERE CursoID = %s AND Puntos >= %s", (curso_id, costo))
    res = [{"id": r[0], "nombre": f"{r[1]} {r[2]}", "puntos": r[3]} for r in cursor.fetchall()]
    cursor.close(); conn.close()
    return res

@app.post("/tienda/comprar")
def comprar(req: CompraRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT CostoPuntos FROM Recompensas WHERE RecompensaID = %s", (req.recompensa_id,))
        costo_row = cursor.fetchone()
        if not costo_row: raise HTTPException(status_code=404, detail="Premio no existe")
        costo = costo_row[0]
        
        # Intentar descontar puntos
        cursor.execute("UPDATE Alumnos SET Puntos = Puntos - %s WHERE AlumnoID = %s AND Puntos >= %s", (costo, req.alumno_id, costo))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=400, detail="El alumno no tiene puntos suficientes")
            
        cursor.execute("INSERT INTO HistorialCanjes (AlumnoID, RecompensaID, EstadoCanje, FechaObtencion) VALUES (%s, %s, 'Disponible', CURRENT_TIMESTAMP)", (req.alumno_id, req.recompensa_id))
        conn.commit()
        return {"mensaje": "Canje exitoso"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()

# ==========================================
# 8. RUTAS: PIZARRA
# ==========================================
@app.post("/recompensas/clase/seleccionar")
def seleccionar_pizarra(req: SeleccionPizarraRequest, usuario = Depends(verificar_token)):
    return {"mensaje": "Pizarra preparada"}

@app.get("/recompensas/clase")
def obtener_pizarra(usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT RecompensaID, NombreRecompensa, CostoPuntos FROM Recompensas ORDER BY RANDOM() LIMIT 5")
    res = [{"id": r[0], "nombre": r[1], "costo": r[2]} for r in cursor.fetchall()]
    cursor.close(); conn.close()
    return res

@app.post("/recompensas/azar")
def azar_pizarra(usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT RecompensaID, NombreRecompensa, CostoPuntos FROM Recompensas ORDER BY RANDOM() LIMIT 3")
    res = [{"id": r[0], "nombre": r[1], "costo": r[2]} for r in cursor.fetchall()]
    cursor.close(); conn.close()
    return res

# PERFIL
@app.get("/alumnos/{alumno_id}/perfil")
def perfil(alumno_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT Nombre, Apellido, Puntos FROM Alumnos WHERE AlumnoID = %s", (alumno_id,))
    al = cursor.fetchone()
    if not al: raise HTTPException(status_code=404, detail="Alumno no encontrado")
    
    cursor.execute("SELECT h.CanjeID, r.NombreRecompensa, h.FechaObtencion, h.FechaUso, h.EstadoCanje FROM HistorialCanjes h JOIN Recompensas r ON h.RecompensaID = r.RecompensaID WHERE h.AlumnoID = %s ORDER BY h.FechaObtencion DESC", (alumno_id,))
    hist = [{"canje_id": r[0], "recompensa": r[1], "fecha_obtencion": r[2].strftime("%d/%m/%Y %H:%M"), "fecha_uso": r[3].strftime("%d/%m/%Y %H:%M") if r[3] else "Pendiente", "estado": r[4]} for r in cursor.fetchall()]
    cursor.close(); conn.close()
    return {"nombre": f"{al[0]} {al[1]}", "puntos": al[2], "historial": hist}