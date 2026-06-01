import React, { useState } from 'react';
import { C, gradAccent, gradBlue } from '../theme';

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [show, setShow]       = useState(false);

  return (
    <div style={{ minHeight:'100vh', background:`linear-gradient(160deg,#050A18,#070B14)`, display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>
      {/* Glow orbs */}
      <div style={{ position:'absolute', width:320, height:320, borderRadius:'50%', background:'#1E3A8A', opacity:.12, top:-100, left:-100, filter:'blur(40px)' }} />
      <div style={{ position:'absolute', width:220, height:220, borderRadius:'50%', background:'#22C55E', opacity:.1, bottom:80, right:-60, filter:'blur(40px)' }} />

      <div style={{ width:'100%', maxWidth:400 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:68, height:68, borderRadius:18, background:gradAccent, display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
            <span style={{ color:'#fff', fontSize:32, fontWeight:800 }}>N</span>
          </div>
          <div style={{ color:C.text, fontSize:26, fontWeight:800, letterSpacing:4 }}>NEXO</div>
          <div style={{ color:C.textMuted, fontSize:9, letterSpacing:6, marginTop:-2, marginBottom:12 }}>FINANZAS</div>
          <div style={{ color:C.textSec, fontSize:13, lineHeight:1.6 }}>Tu dinero conectado.<br/>Tus decisiones más claras.</div>
        </div>

        {/* Card */}
        <div style={{ background:C.surface, borderRadius:28, padding:24, border:`1px solid ${C.border}` }}>
          <div style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:20 }}>Iniciar sesión</div>

          <div style={{ ...inputWrap, marginBottom:12 }}>
            <span style={{ marginRight:10, fontSize:16 }}>✉️</span>
            <input style={input} placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)} type="email" />
          </div>

          <div style={{ ...inputWrap, marginBottom:8 }}>
            <span style={{ marginRight:10, fontSize:16 }}>🔒</span>
            <input style={{ ...input, flex:1 }} placeholder="Contraseña" value={password} onChange={e=>setPass(e.target.value)} type={show?'text':'password'} />
            <button onClick={()=>setShow(!show)} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, fontSize:14 }}>{show?'🙈':'👁️'}</button>
          </div>

          <div style={{ textAlign:'right', marginBottom:20 }}>
            <span style={{ color:C.primaryGlow, fontSize:13, cursor:'pointer' }}>¿Olvidaste tu contraseña?</span>
          </div>

          <button onClick={onLogin} style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', background:gradAccent, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>
            Entrar
          </button>

          <div style={{ textAlign:'center', marginTop:16, fontSize:13 }}>
            <span style={{ color:C.textSec }}>¿No tienes cuenta? </span>
            <span style={{ color:C.accent, fontWeight:600, cursor:'pointer' }}>Regístrate gratis</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputWrap: React.CSSProperties = {
  display:'flex', alignItems:'center',
  background:'#162033', borderRadius:14,
  border:`1px solid ${C.border}`, padding:'0 14px', height:52,
};
const input: React.CSSProperties = {
  flex:1, background:'none', border:'none', outline:'none',
  color:'#F8FAFC', fontSize:15,
};
