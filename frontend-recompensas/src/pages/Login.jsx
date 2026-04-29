import { useState } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Login({ onLoginExitoso }) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const res = await api.post('/login', { correo, contrasena });
      
      // Guardamos el "pase VIP" en el navegador
      localStorage.setItem('token_profesora', res.data.token);
      localStorage.setItem('nombre_profesora', res.data.nombre);
      
      Swal.fire({
        title: `¡Bienvenida, ${res.data.nombre}!`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      onLoginExitoso(); // Le avisa a la app que ya puede mostrar el contenido
    } catch (error) {
      Swal.fire({
        title: 'Acceso Denegado',
        text: 'El correo o la contraseña son incorrectos.',
        icon: 'error',
        confirmButtonColor: '#6366F1'
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '50px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        
        <div style={{ backgroundColor: '#6366F1', width: '80px', height: '80px', borderRadius: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px auto', fontSize: '2.5rem', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
          🍎
        </div>
        
        <h1 style={{ color: '#1E293B', fontSize: '1.8rem', margin: '0 0 10px 0', fontWeight: '900' }}>ClassRewards</h1>
        <p style={{ color: '#64748B', marginBottom: '30px' }}>Inicia sesión para gestionar tu clase</p>

        <form onSubmit={manejarLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontWeight: '700', color: '#475569', marginBottom: '8px', fontSize: '0.9rem' }}>Correo Electrónico</label>
            <input 
              type="email" 
              value={correo} 
              onChange={(e) => setCorreo(e.target.value)} 
              placeholder="astrid@colegio.com"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #E2E8F0', backgroundColor: '#F8FAFC', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontWeight: '700', color: '#475569', marginBottom: '8px', fontSize: '0.9rem' }}>Contraseña</label>
            <input 
              type="password" 
              value={contrasena} 
              onChange={(e) => setContrasena(e.target.value)} 
              placeholder="••••••••"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #E2E8F0', backgroundColor: '#F8FAFC', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            style={{ padding: '16px', backgroundColor: '#6366F1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '1.1rem', cursor: cargando ? 'not-allowed' : 'pointer', marginTop: '10px', transition: 'transform 0.1s', opacity: cargando ? 0.7 : 1 }}
          >
            {cargando ? 'Verificando...' : 'Entrar a mi cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}