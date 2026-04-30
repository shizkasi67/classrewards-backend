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
# 6. RUTAS: AUTENTICACIÓN
# ==========================================
@app.post("/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT ProfesorID, Nombre, Contrasena FROM Profesores WHERE Correo = %s", (req.correo,))
        profesor = cursor.fetchone()
        if not profesor or not pwd_context.verify(req.contrasena, profesor[2]):
            raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
        token = create_access_token(data={"sub": req.correo, "nombre": profesor[1]})
        return {"mensaje": "Login exitoso", "nombre": profesor[1], "token": token}
    finally:
        cursor.close()
        conn.close()

# ==========================================
# 7. RUTAS: CURSOS
# ==========================================
@app.get("/cursos")
def obtener_cursos(usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT CursoID, NombreCurso, Seccion FROM Cursos")
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
    finally:
        cursor.close()
        conn.close()

# ==========================================
# 8. RUTAS: ALUMNOS, PUNTOS E HISTORIAL
# ==========================================
@app.get("/cursos/{curso_id}/alumnos")
def obtener_alumnos_por_curso(curso_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Traemos ID, Nombre, Apellido y Puntos
    cursor.execute("SELECT AlumnoID, Nombre, Apellido, Puntos FROM Alumnos WHERE CursoID = %s ORDER BY Apellido ASC", (curso_id,))
    
    alumnos = [
        {
            "id": r[0], 
            "nombre": f"{r[1]} {r[2]}",
            "apellido": r[2], 
            "puntos": r[3]
        } for r in cursor.fetchall()
    ]
    
    cursor.close()
    conn.close()
    return alumnos

@app.post("/alumnos/modificar-puntos")
def modificar_puntos(req: ModificarPuntosRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if req.alumno_id:
            # Individual
            cursor.execute("UPDATE Alumnos SET Puntos = Puntos + %s WHERE AlumnoID = %s AND (Puntos + %s) >= 0", (req.cantidad, req.alumno_id, req.cantidad))
            cursor.execute("INSERT INTO HistorialPuntos (AlumnoID, CursoID, Cantidad, Motivo) SELECT %s, CursoID, %s, 'Ajuste individual' FROM Alumnos WHERE AlumnoID = %s", (req.alumno_id, req.cantidad, req.alumno_id))
        elif req.curso_id:
            # Grupal
            cursor.execute("UPDATE Alumnos SET Puntos = Puntos + %s WHERE CursoID = %s AND (Puntos + %s) >= 0", (req.cantidad, req.curso_id, req.cantidad))
            cursor.execute("INSERT INTO HistorialPuntos (CursoID, Cantidad, Motivo) VALUES (%s, %s, 'Puntos a todo el curso')", (req.curso_id, req.cantidad))
        
        conn.commit()
        return {"mensaje": "Puntos actualizados"}
    finally:
        cursor.close()
        conn.close()

# --- RUTA QUE FALTABA (SOLUCIONA EL 404) ---
@app.get("/cursos/{curso_id}/historial-puntos")
def obtener_historial_curso(curso_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT h.HistorialID, COALESCE(a.Nombre || ' ' || a.Apellido, 'Todo el curso'), 
               h.Cantidad, h.Motivo, h.Fecha 
        FROM HistorialPuntos h
        LEFT JOIN Alumnos a ON h.AlumnoID = a.AlumnoID
        WHERE h.CursoID = %s
        ORDER BY h.Fecha DESC LIMIT 50
    """
    cursor.execute(query, (curso_id,))
    historial = [{
        "id": r[0], "beneficiario": r[1], "cantidad": r[2], 
        "motivo": r[3], "fecha": r[4].strftime("%d/%m/%Y %H:%M")
    } for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return historial

# ==========================================
# 9. RUTAS: TIENDA, RECOMPENSAS Y PERFIL
# ==========================================
@app.get("/alumnos/{alumno_id}/perfil")
def obtener_perfil_alumno(alumno_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT Nombre, Apellido, Puntos FROM Alumnos WHERE AlumnoID = %s", (alumno_id,))
    alumno_row = cursor.fetchone()
    if not alumno_row: raise HTTPException(status_code=404, detail="No encontrado")
    
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
    return {"nombre": f"{alumno_row[0]} {alumno_row[1]}", "puntos": alumno_row[2], "historial": historial}

@app.post("/alumnos")
def crear_alumno(req: NuevoAlumnoRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Alumnos (Nombre, Apellido, CursoID, Puntos) VALUES (%s, %s, %s, 0)", (req.nombre, req.apellido, req.curso_id))
        conn.commit()
        return {"mensaje": "Alumno agregado"}
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
    finally:
        cursor.close()
        conn.close()

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
    finally:
        cursor.close()
        conn.close()

@app.post("/tienda/comprar")
def comprar_recompensa(req: CompraRequest, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT CostoPuntos FROM Recompensas WHERE RecompensaID = %s", (req.recompensa_id,))
        costo = cursor.fetchone()[0]
        cursor.execute("UPDATE Alumnos SET Puntos = Puntos - %s WHERE AlumnoID = %s AND Puntos >= %s", (costo, req.alumno_id, costo))
        if cursor.rowcount == 0: raise HTTPException(status_code=400, detail="Puntos insuficientes")
        cursor.execute("INSERT INTO HistorialCanjes (AlumnoID, RecompensaID, EstadoCanje, FechaObtencion) VALUES (%s, %s, 'Disponible', CURRENT_TIMESTAMP)", (req.alumno_id, req.recompensa_id))
        conn.commit()
        return {"mensaje": "Compra exitosa"}
    finally:
        cursor.close()
        conn.close()

@app.post("/canjes/{canje_id}/usar")
def usar_recompensa(canje_id: int, usuario = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE HistorialCanjes SET EstadoCanje = 'Usado', FechaUso = CURRENT_TIMESTAMP WHERE CanjeID = %s AND EstadoCanje = 'Disponible'", (canje_id,))
        conn.commit()
        return {"mensaje": "Utilizado"}
    finally:
        cursor.close()
        conn.close()