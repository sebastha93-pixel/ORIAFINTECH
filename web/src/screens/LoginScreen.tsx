import React, { useState } from 'react';
import { C, gradAccent } from '../theme';
import { OriaLogo } from '../components/OriaLogo';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'register' | 'reset';

export function LoginScreen({ onLogin }: { onLogin: (userId: string) => void }) {
  const [mode, setMode]       = useState<Mode>('login');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');

  async function handleSubmit() {
    if (!email || (mode !== 'reset' && !password)) {
      setError('Completa todos los campos.');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');

    if (mode === 'login') {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(translateError(err.message)); }
      else if (data.user) { onLogin(data.user.id); }

    } else if (mode === 'register') {
      const { data, error: err } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) { setError(translateError(err.message)); }
      else if (data.user?.identities?.length === 0) {
        setError('Este correo ya está registrado. Inicia sesión.');
      } else {
        setInfo('✅ Cuenta creada. Revisa tu correo para confirmarla, luego inicia sesión.');
        setMode('login');
      }

    } else {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?reset=1`,
      });
      if (err) { setError(translateError(err.message)); }
      else { setInfo('✅ Te enviamos un enlace para restablecer tu contraseña.'); }
    }

    setLoading(false);
  }

  function translateError(msg: string): string {
    if (/invalid.*credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
    if (/email.*confirmed/i.test(msg))     return 'Confirma tu correo antes de iniciar sesión.';
    if (/already.*registered/i.test(msg))  return 'Este correo ya está registrado.';
    if (/password.*6/i.test(msg))          return 'La contraseña debe tener al menos 6 caracteres.';
    return msg;
  }

  const titles: Record<Mode, string> = {
    login:    'Iniciar sesión',
    register: 'Crear cuenta',
    reset:    'Recuperar contraseña',
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#060F20,#081426)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:320, height:320, borderRadius:'50%', background:'#1E3A8A', opacity:.1, top:-100, left:-100, filter:'blur(50px)' }} />
      <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'#31D67B', opacity:.07, bottom:80, right:-60, filter:'blur(50px)' }} />

      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
            <OriaLogo size={68} />
          </div>
          <div style={{ color:C.textSec, fontSize:13, lineHeight:1.7 }}>
            Entiende tu dinero.<br/>Construye tu futuro.
          </div>
        </div>

        <div style={{ background:C.surface, borderRadius:28, padding:24, border:`1px solid ${C.border}` }}>
          <div style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:20 }}>{titles[mode]}</div>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:12, padding:'10px 14px', marginBottom:16, color:'#EF4444', fontSize:13 }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ background:'rgba(49,214,123,0.1)', border:'1px solid rgba(49,214,123,0.3)', borderRadius:12, padding:'10px 14px', marginBottom:16, color:C.accent, fontSize:13 }}>
              {info}
            </div>
          )}

          <div style={{ ...inputWrap, marginBottom:12 }}>
            <span style={{ marginRight:10, fontSize:16 }}>✉️</span>
            <input style={inputStyle} placeholder="Correo electrónico" value={email}
              onChange={e=>setEmail(e.target.value)} type="email"
              onKeyDown={e=>e.key==='Enter'&&handleSubmit()} />
          </div>

          {mode !== 'reset' && (
            <div style={{ ...inputWrap, marginBottom: mode === 'login' ? 8 : 20 }}>
              <span style={{ marginRight:10, fontSize:16 }}>🔒</span>
              <input style={{ ...inputStyle, flex:1 }} placeholder="Contraseña (mín. 6 caracteres)" value={password}
                onChange={e=>setPass(e.target.value)} type={show?'text':'password'}
                onKeyDown={e=>e.key==='Enter'&&handleSubmit()} />
              <button onClick={()=>setShow(!show)} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, fontSize:14 }}>
                {show?'🙈':'👁️'}
              </button>
            </div>
          )}

          {mode === 'login' && (
            <div style={{ textAlign:'right', marginBottom:20 }}>
              <button onClick={()=>{setMode('reset');setError('');setInfo('');}}
                style={{ background:'none', border:'none', color:C.primaryGlow, fontSize:13, cursor:'pointer', padding:0 }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', background: loading ? C.border : gradAccent, color:'#fff', fontSize:15, fontWeight:700, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? '⏳ Cargando…' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
          </button>

          <div style={{ textAlign:'center', marginTop:16, fontSize:13 }}>
            {mode === 'login' ? (
              <button onClick={()=>{setMode('register');setError('');setInfo('');}}
                style={{ background:'none', border:'none', cursor:'pointer', padding:0, fontSize:13 }}>
                <span style={{ color:C.textSec }}>¿No tienes cuenta? </span>
                <span style={{ color:C.accent, fontWeight:600 }}>Regístrate gratis</span>
              </button>
            ) : (
              <button onClick={()=>{setMode('login');setError('');setInfo('');}}
                style={{ background:'none', border:'none', color:C.accent, fontWeight:600, cursor:'pointer', fontSize:13, padding:0 }}>
                ← Volver a iniciar sesión
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:16, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <span style={{ fontSize:12 }}>🔒</span>
          <span style={{ color:C.textMuted, fontSize:11 }}>Cifrado end-to-end · OAuth 2.0 · Sin acceso a tus contraseñas bancarias</span>
        </div>
      </div>
    </div>
  );
}

const inputWrap: React.CSSProperties = {
  display:'flex', alignItems:'center',
  background:'#112035', borderRadius:14,
  border:`1px solid ${C.border}`, padding:'0 14px', height:52,
};
const inputStyle: React.CSSProperties = {
  flex:1, background:'none', border:'none', outline:'none',
  color:'#F7F9FC', fontSize:15,
};
