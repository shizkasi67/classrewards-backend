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

# 1. CONFIGURACIÓN INICIAL
load_dotenv()
DB_CONNECTION_STRING = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

app = FastAPI(title="Backend ClassRewards")

# 2. CORS (Asegúrate de que FRONTEND_URL en Render esté bien o usa "*" para pruebas)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
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
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

def get_db_connection():
    return psycopg2.connect(DB_CONNECTION_STRING)

# 4. MODELOS DE DATOS
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
# 5. RUTAS DE AUTENTICACIÓN
# ==========================================
@app.post("/login")
def login(req: dict):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT ProfesorID, Nombre, Contrasena FROM Profesores WHERE Correo = %s", (req['correo'],))
    profesor = cursor.fetchone()
    if profesor and pwd_context.verify(req['contrasena'], profesor[2]):
        token = create_access_token(data={"sub": req['correo'], "nombre": profesor[1]})
        return {"token": token, "nombre": profesor[1]}
    raise HTTPException(status_code=401, detail="Error de login")

# ==========================================
# 6. RUTAS DE CURSOS Y ALUMNOS
# ==========================================
@app.get("/cursos")
def obtener_cursos(u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT CursoID, NombreCurso, Seccion FROM Cursos ORDER BY NombreCurso ASC")
    cursos = [{"id": r[0], "nombre": f"{r[1]} {r[2]}".strip()} for r in cursor.fetchall()]
    cursor.close(); conn.close()
    return cursos

@app.post("/cursos")
def crear_curso(req: NuevoCursoRequest, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("INSERT INTO Cursos (NombreCurso, Seccion) VALUES (%s, %s)", (req.nombre, req.seccion))
    conn.commit(); conn.close()
    return {"ok": True}

@app.get("/cursos/{curso_id}/alumnos")
def alumnos_por_curso(curso_id: int, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT AlumnoID, Nombre, Apellido, Puntos FROM Alumnos WHERE CursoID = %s ORDER BY Apellido ASC", (curso_id,))
    res = [{"id": r[0], "nombre": f"{r[1]} {r[2]}", "puntos": r[3]} for r in cursor.fetchall()]
    cursor.close(); conn.close()
    return res

@app.post("/alumnos")
def crear_alumno(req: NuevoAlumnoRequest, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("INSERT INTO Alumnos (Nombre, Apellido, CursoID, Puntos) VALUES (%s, %s, %s, 0)", (req.nombre, req.apellido, req.curso_id))
    conn.commit(); conn.close()
    return {"ok": True}

@app.delete("/alumnos/{id}")
def borrar_alumno(id: int, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("DELETE FROM HistorialPuntos WHERE AlumnoID = %s", (id,))
    cursor.execute("DELETE FROM HistorialCanjes WHERE AlumnoID = %s", (id,))
    cursor.execute("DELETE FROM Alumnos WHERE AlumnoID = %s", (id,))
    conn.commit(); conn.close()
    return {"ok": True}

# ==========================================
# 7. GESTIÓN DE PUNTOS
# ==========================================
@app.post("/alumnos/modificar-puntos")
def puntos(req: ModificarPuntosRequest, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    if req.alumno_id:
        cursor.execute("UPDATE Alumnos SET Puntos = Puntos + %s WHERE AlumnoID = %s", (req.cantidad, req.alumno_id))
        cursor.execute("INSERT INTO HistorialPuntos (AlumnoID, CursoID, Cantidad, Motivo) SELECT %s, CursoID, %s, 'Ajuste' FROM Alumnos WHERE AlumnoID = %s", (req.alumno_id, req.cantidad, req.alumno_id))
    elif req.curso_id:
        cursor.execute("UPDATE Alumnos SET Puntos = Puntos + %s WHERE CursoID = %s", (req.cantidad, req.curso_id))
        cursor.execute("INSERT INTO HistorialPuntos (CursoID, Cantidad, Motivo) VALUES (%s, %s, 'Grupal')", (req.curso_id, req.cantidad))
    conn.commit(); conn.close()
    return {"ok": True}

@app.get("/cursos/{id}/historial-puntos")
def historial_puntos(id: int, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT h.HistorialID, COALESCE(a.Nombre || ' ' || a.Apellido, 'Grupo'), h.Cantidad, h.Motivo, h.Fecha FROM HistorialPuntos h LEFT JOIN Alumnos a ON h.AlumnoID = a.AlumnoID WHERE h.CursoID = %s ORDER BY h.Fecha DESC", (id,))
    res = [{"id": r[0], "beneficiario": r[1], "cantidad": r[2], "motivo": r[3], "fecha": r[4].strftime("%d/%m/%Y %H:%M")} for r in cursor.fetchall()]
    conn.close()
    return res

# ==========================================
# 8. TIENDA Y CANJES (SOLUCIÓN ELEGIBLES)
# ==========================================
@app.get("/recompensas")
def tienda_lista(u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT RecompensaID, NombreRecompensa, CostoPuntos, Descripcion FROM Recompensas ORDER BY CostoPuntos ASC")
    res = [{"id": r[0], "nombre": r[1], "costo": r[2], "descripcion": r[3]} for r in cursor.fetchall()]
    conn.close()
    return res

@app.post("/recompensas")
def crear_premio(req: NuevaRecompensaRequest, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("INSERT INTO Recompensas (NombreRecompensa, CostoPuntos, Descripcion) VALUES (%s, %s, %s)", (req.nombre, req.costo, req.descripcion))
    conn.commit(); conn.close()
    return {"ok": True}

@app.get("/tienda/recompensas/{rec_id}/elegibles")
def elegibles(rec_id: int, curso_id: int, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT CostoPuntos FROM Recompensas WHERE RecompensaID = %s", (rec_id,))
    costo = cursor.fetchone()[0]
    cursor.execute("SELECT AlumnoID, Nombre, Apellido, Puntos FROM Alumnos WHERE CursoID = %s AND Puntos >= %s", (curso_id, costo))
    res = [{"id": r[0], "nombre": f"{r[1]} {r[2]}", "puntos": r[3]} for r in cursor.fetchall()]
    conn.close()
    return res

@app.post("/tienda/comprar")
def comprar(req: CompraRequest, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT CostoPuntos FROM Recompensas WHERE RecompensaID = %s", (req.recompensa_id,))
    costo = cursor.fetchone()[0]
    cursor.execute("UPDATE Alumnos SET Puntos = Puntos - %s WHERE AlumnoID = %s AND Puntos >= %s", (costo, req.alumno_id, costo))
    if cursor.rowcount > 0:
        cursor.execute("INSERT INTO HistorialCanjes (AlumnoID, RecompensaID, EstadoCanje, FechaObtencion) VALUES (%s, %s, 'Disponible', CURRENT_TIMESTAMP)", (req.alumno_id, req.recompensa_id))
        conn.commit(); conn.close()
        return {"ok": True}
    conn.close()
    raise HTTPException(status_code=400, detail="Puntos insuficientes")

# ==========================================
# 9. RUTAS PIZARRA (RESTURADAS)
# ==========================================
@app.post("/recompensas/clase/seleccionar")
def pizarra_selec(req: SeleccionPizarraRequest, u=Depends(verificar_token)):
    return {"ok": True}

@app.get("/recompensas/clase")
def pizarra_obtener(u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT RecompensaID, NombreRecompensa, CostoPuntos FROM Recompensas ORDER BY RANDOM() LIMIT 5")
    res = [{"id": r[0], "nombre": r[1], "costo": r[2]} for r in cursor.fetchall()]
    conn.close()
    return res

@app.post("/recompensas/azar")
def pizarra_azar(u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT RecompensaID, NombreRecompensa, CostoPuntos FROM Recompensas ORDER BY RANDOM() LIMIT 3")
    res = [{"id": r[0], "nombre": r[1], "costo": r[2]} for r in cursor.fetchall()]
    conn.close()
    return res

# ==========================================
# 10. PERFIL E INVENTARIO
# ==========================================
@app.get("/alumnos/{id}/perfil")
def perfil(id: int, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("SELECT Nombre, Apellido, Puntos FROM Alumnos WHERE AlumnoID = %s", (id,))
    al = cursor.fetchone()
    cursor.execute("SELECT h.CanjeID, r.NombreRecompensa, h.FechaObtencion, h.FechaUso, h.EstadoCanje FROM HistorialCanjes h JOIN Recompensas r ON h.RecompensaID = r.RecompensaID WHERE h.AlumnoID = %s ORDER BY h.FechaObtencion DESC", (id,))
    hist = [{"canje_id": r[0], "recompensa": r[1], "fecha_obtencion": r[2].strftime("%d/%m/%Y %H:%M"), "fecha_uso": r[3].strftime("%d/%m/%Y %H:%M") if r[3] else "Pendiente", "estado": r[4]} for r in cursor.fetchall()]
    conn.close()
    return {"nombre": f"{al[0]} {al[1]}", "puntos": al[2], "historial": hist}

@app.post("/canjes/{id}/usar")
def usar(id: int, u=Depends(verificar_token)):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("UPDATE HistorialCanjes SET EstadoCanje = 'Usado', FechaUso = CURRENT_TIMESTAMP WHERE CanjeID = %s", (id,))
    conn.commit(); conn.close()
    return {"ok": True}