import React from 'react';
import { OriaIcon } from '../components/OriaIcon';

interface Props {
  onStart: () => void;
  onLogin: () => void;
}

const FEATURES = [
  {
    icon: '📧',
    title: 'Importación automática',
    desc: 'Conecta tu Gmail y ORIA importa tus movimientos de Bancolombia, Davivienda y Nequi al instante.',
  },
  {
    icon: '🤖',
    title: 'IA financiera personal',
    desc: 'Habla con ORIA sobre tus gastos, metas y patrimonio. Respuestas basadas en tus datos reales.',
  },
  {
    icon: '🎯',
    title: 'Metas de ahorro',
    desc: 'Define tus metas y haz seguimiento visual de tu progreso mes a mes.',
  },
  {
    icon: '📊',
    title: 'Informes en Excel',
    desc: 'Descarga tu informe mensual completo con movimientos, categorías y análisis de gastos.',
  },
];

const STEPS = [
  { n: '1', title: 'Crea tu cuenta gratis', desc: 'Solo necesitas tu correo. Sin tarjeta de crédito.' },
  { n: '2', title: 'Registra tus cuentas', desc: 'Agrega tus cuentas bancarias y tarjetas de crédito.' },
  { n: '3', title: 'ORIA hace el resto', desc: 'Importa movimientos, categoriza y te da insights en segundos.' },
];

export function LandingScreen({ onStart, onLogin }: Props) {
  return (
    <div style={{ minHeight:'100vh', background:'#060E1E', color:'#F7F9FC', fontFamily:'system-ui,sans-serif', overflowX:'hidden' }}>

      {/* Nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', maxWidth:960, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <OriaIcon size={32} active />
          <span style={{ fontSize:18, fontWeight:900, letterSpacing:4, color:'#F7F9FC' }}>ORIA</span>
        </div>
        <button onClick={onLogin} style={{ padding:'8px 20px', borderRadius:999, border:'1px solid rgba(255,255,255,0.15)', background:'transparent', color:'#F7F9FC', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          Iniciar sesión
        </button>
      </nav>

      {/* Hero */}
      <section style={{ textAlign:'center', padding:'60px 24px 80px', maxWidth:640, margin:'0 auto', position:'relative' }}>
        {/* Glow blobs */}
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'#1D4ED8', opacity:.08, top:-80, left:'50%', transform:'translateX(-50%)', filter:'blur(80px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'#31D67B', opacity:.06, top:100, right:-60, filter:'blur(70px)', pointerEvents:'none' }} />

        <div style={{ display:'inline-flex', marginBottom:24 }}>
          <OriaIcon size={72} active />
        </div>

        <div style={{ display:'inline-block', background:'rgba(49,214,123,0.12)', border:'1px solid rgba(49,214,123,0.3)', borderRadius:999, padding:'4px 16px', marginBottom:20 }}>
          <span style={{ color:'#31D67B', fontSize:12, fontWeight:700, letterSpacing:1 }}>TU ASESORA FINANCIERA CON IA</span>
        </div>

        <h1 style={{ fontSize:'clamp(28px,7vw,48px)', fontWeight:900, lineHeight:1.15, margin:'0 0 20px', letterSpacing:-1 }}>
          Entiende tu dinero.<br />
          <span style={{ background:'linear-gradient(135deg,#31D67B,#22C55E)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Construye tu futuro.
          </span>
        </h1>

        <p style={{ color:'#94A3B8', fontSize:16, lineHeight:1.7, margin:'0 0 40px', maxWidth:480, marginLeft:'auto', marginRight:'auto' }}>
          ORIA importa tus movimientos bancarios automáticamente, los categoriza con IA y te da una visión clara de tu patrimonio. Todo en un solo lugar.
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
          <button onClick={onStart} style={{ padding:'16px 48px', borderRadius:16, border:'none', background:'linear-gradient(135deg,#31D67B,#22A85A)', color:'#fff', fontSize:16, fontWeight:800, cursor:'pointer', boxShadow:'0 8px 32px rgba(49,214,123,0.35)', letterSpacing:.5 }}>
            Comenzar gratis →
          </button>
          <span style={{ color:'#64748B', fontSize:12 }}>Sin tarjeta de crédito · Cancela cuando quieras</span>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:'0 24px 80px', maxWidth:960, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontSize:26, fontWeight:800, margin:'0 0 10px' }}>Todo lo que necesitas</h2>
          <p style={{ color:'#64748B', fontSize:14, margin:0 }}>Diseñado para latinoamericanos que quieren tomar el control de sus finanzas</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'24px 20px' }}>
              <div style={{ fontSize:32, marginBottom:14 }}>{f.icon}</div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:8, color:'#F1F5F9' }}>{f.title}</div>
              <div style={{ fontSize:13, color:'#64748B', lineHeight:1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding:'0 24px 80px', maxWidth:720, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontSize:26, fontWeight:800, margin:'0 0 10px' }}>¿Cómo funciona?</h2>
          <p style={{ color:'#64748B', fontSize:14, margin:0 }}>Empieza en menos de 2 minutos</p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display:'flex', alignItems:'flex-start', gap:20, padding:'20px 24px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#1D4ED8,#2563EB)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, flexShrink:0 }}>
                {s.n}
              </div>
              <div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:4, color:'#F1F5F9' }}>{s.title}</div>
                <div style={{ fontSize:13, color:'#64748B', lineHeight:1.6 }}>{s.desc}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ display:'none' }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={{ textAlign:'center', padding:'0 24px 80px' }}>
        <div style={{ maxWidth:480, margin:'0 auto', background:'linear-gradient(135deg,rgba(29,78,216,0.2),rgba(49,214,123,0.08))', border:'1px solid rgba(59,130,246,0.25)', borderRadius:28, padding:'48px 32px' }}>
          <div style={{ fontSize:36, marginBottom:16 }}>
            <OriaIcon size={56} active />
          </div>
          <h2 style={{ fontSize:24, fontWeight:800, margin:'0 0 12px' }}>Empieza hoy sin costo</h2>
          <p style={{ color:'#94A3B8', fontSize:14, lineHeight:1.7, margin:'0 0 28px' }}>
            Únete y toma el control de tus finanzas personales con inteligencia artificial.
          </p>
          <button onClick={onStart} style={{ padding:'14px 40px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#31D67B,#22A85A)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 6px 24px rgba(49,214,123,0.3)' }}>
            Crear cuenta gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'24px', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:8 }}>
          <OriaIcon size={20} active />
          <span style={{ fontSize:13, fontWeight:700, letterSpacing:3, color:'#F7F9FC' }}>ORIA</span>
        </div>
        <p style={{ color:'#334155', fontSize:12, margin:0 }}>
          © {new Date().getFullYear()} oriafintech.com · Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}
