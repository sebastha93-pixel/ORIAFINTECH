import React, { useState, useEffect } from 'react';
import { OriaIcon } from '../components/OriaIcon';

interface Props {
  onStart: () => void;
  onLogin: () => void;
}

// PWA install prompt (Android / Chrome)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const BENEFITS = [
  {
    icon: '📧',
    title: 'Importación automática desde Gmail',
    desc: 'Conecta tu correo y ORIA lee las notificaciones de Bancolombia, Davivienda y Nequi. Tus movimientos aparecen solos, sin capturas de pantalla ni ingreso manual.',
  },
  {
    icon: '🤖',
    title: 'IA que entiende tus finanzas',
    desc: 'Habla con ORIA en lenguaje natural. Pregúntale en qué gastas más, cuándo alcanzarás tus metas o cómo mejorar tu tasa de ahorro. Respuestas basadas en tus datos reales.',
  },
  {
    icon: '💳',
    title: 'Control total de tarjetas de crédito',
    desc: 'Registra tus tarjetas, monitorea la deuda actual, el cupo disponible y el porcentaje de utilización. Tu patrimonio neto calculado en tiempo real.',
  },
  {
    icon: '🎯',
    title: 'Metas de ahorro con seguimiento',
    desc: 'Crea metas para fondo de emergencia, vacaciones o cualquier objetivo. Visualiza tu progreso y recibe proyecciones de cuándo las alcanzarás.',
  },
  {
    icon: '📊',
    title: 'Informes mensuales en Excel',
    desc: 'Descarga un informe completo cada mes: todos tus movimientos organizados, desglose por categoría y análisis de gastos. Guarda tu historial mes a mes.',
  },
  {
    icon: '🔒',
    title: 'Seguro y privado',
    desc: 'Cifrado end-to-end, autenticación OAuth 2.0. ORIA nunca accede a tus contraseñas bancarias ni puede mover tu dinero.',
  },
];

const STEPS = [
  { n: '01', title: 'Crea tu cuenta gratis', desc: 'Solo necesitas tu correo electrónico. Sin tarjeta de crédito, sin compromisos.' },
  { n: '02', title: 'Agrega tus cuentas', desc: 'Registra tus cuentas bancarias y tarjetas de crédito. Opcionalmente conecta tu Gmail para importación automática.' },
  { n: '03', title: 'ORIA analiza y te guía', desc: 'La IA categoriza tus gastos, calcula tu patrimonio y te da recomendaciones personalizadas desde el primer día.' },
];

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

export function LandingScreen({ onStart, onLogin }: Props) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isInStandaloneMode);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstalled(true); setInstallPrompt(null); }
  }

  return (
    <div style={{ background:'#060E1E', color:'#F7F9FC', fontFamily:'Inter,system-ui,sans-serif', overflowX:'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{ position:'sticky', top:0, zIndex:50, background:'rgba(6,14,30,0.85)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <OriaIcon size={32} active />
            <span style={{ fontSize:17, fontWeight:900, letterSpacing:4 }}>ORIA</span>
            <span style={{ color:'#31D67B', fontSize:9, fontWeight:700, letterSpacing:2, marginLeft:2, opacity:.8 }}>FINTECH</span>
          </div>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <button onClick={onLogin} style={{ padding:'8px 20px', borderRadius:999, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#CBD5E1', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Iniciar sesión
            </button>
            <button onClick={onStart} style={{ padding:'8px 20px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#31D67B,#22A85A)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              Comenzar gratis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position:'relative', overflow:'hidden', padding:'80px 24px 100px' }}>
        {/* Glow blobs */}
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'#1D4ED8', opacity:.07, top:-200, left:'30%', transform:'translateX(-50%)', filter:'blur(100px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'#31D67B', opacity:.05, bottom:-100, right:'10%', filter:'blur(80px)', pointerEvents:'none' }} />

        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', gap:60, flexWrap:'wrap' }}>
          {/* Text */}
          <div style={{ flex:'1 1 400px', minWidth:0 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(49,214,123,0.1)', border:'1px solid rgba(49,214,123,0.25)', borderRadius:999, padding:'5px 14px', marginBottom:24 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#31D67B' }} />
              <span style={{ color:'#31D67B', fontSize:12, fontWeight:700, letterSpacing:1 }}>TU ASESORA FINANCIERA CON IA</span>
            </div>

            <h1 style={{ fontSize:'clamp(32px,5vw,58px)', fontWeight:900, lineHeight:1.1, margin:'0 0 24px', letterSpacing:-1.5 }}>
              Entiende tu dinero.<br />
              <span style={{ background:'linear-gradient(135deg,#31D67B,#22C55E)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                Construye tu futuro.
              </span>
            </h1>

            <p style={{ color:'#94A3B8', fontSize:17, lineHeight:1.8, margin:'0 0 36px', maxWidth:480 }}>
              ORIA importa tus movimientos bancarios automáticamente, los categoriza con inteligencia artificial y te da una visión clara y completa de tu patrimonio. Todo en tu celular.
            </p>

            <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:20 }}>
              <button onClick={onStart}
                style={{ padding:'15px 36px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#31D67B,#22A85A)', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', boxShadow:'0 8px 32px rgba(49,214,123,0.3)' }}>
                Comenzar gratis →
              </button>
              {!installed && installPrompt && (
                <button onClick={handleInstall}
                  style={{ padding:'15px 28px', borderRadius:14, border:'1px solid rgba(59,130,246,0.4)', background:'rgba(59,130,246,0.1)', color:'#60A5FA', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
                  📲 Instalar app
                </button>
              )}
              {installed && (
                <div style={{ padding:'15px 20px', borderRadius:14, border:'1px solid rgba(49,214,123,0.3)', background:'rgba(49,214,123,0.08)', color:'#31D67B', fontSize:14, fontWeight:600 }}>
                  ✓ App instalada
                </div>
              )}
            </div>
            <p style={{ color:'#475569', fontSize:12, margin:0 }}>Sin tarjeta de crédito · Gratis para empezar</p>
          </div>

          {/* Phone mockup */}
          <div style={{ flex:'0 0 auto', display:'flex', justifyContent:'center' }}>
            <div style={{ width:260, height:520, borderRadius:44, border:'8px solid #1E293B', background:'#0B1629', boxShadow:'0 40px 80px rgba(0,0,0,0.6)', overflow:'hidden', position:'relative' }}>
              {/* Notch */}
              <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:80, height:26, background:'#1E293B', borderRadius:'0 0 16px 16px', zIndex:2 }} />
              {/* App preview */}
              <div style={{ padding:'36px 16px 16px', height:'100%', boxSizing:'border-box' }}>
                <div style={{ color:'#64748B', fontSize:10, fontWeight:600, letterSpacing:1, marginBottom:4 }}>BUENOS DÍAS, SEBASTIÁN</div>
                <div style={{ color:'#F1F5F9', fontSize:18, fontWeight:800, marginBottom:16 }}>Mi Finanzas</div>
                {/* Balance card */}
                <div style={{ background:'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.06))', border:'1px solid rgba(59,130,246,0.25)', borderRadius:16, padding:'14px 14px', marginBottom:10 }}>
                  <div style={{ color:'#94A3B8', fontSize:9, letterSpacing:1, marginBottom:6 }}>PATRIMONIO NETO</div>
                  <div style={{ color:'#F1F5F9', fontSize:22, fontWeight:900 }}>$8.240.000</div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                    <div><div style={{ color:'#64748B', fontSize:8 }}>Activos</div><div style={{ color:'#31D67B', fontSize:11, fontWeight:700 }}>$10.4M</div></div>
                    <div><div style={{ color:'#64748B', fontSize:8 }}>Deuda TC</div><div style={{ color:'#EF4444', fontSize:11, fontWeight:700 }}>$2.16M</div></div>
                  </div>
                </div>
                {/* Tx items */}
                {[
                  { icon:'🛒', name:'Éxito', cat:'Alimentación', amt:'-$85.000', col:'#F1F5F9' },
                  { icon:'💰', name:'Nómina', cat:'Salario', amt:'+$4.500.000', col:'#31D67B' },
                  { icon:'⛽', name:'Terpel', cat:'Gasolina', amt:'-$120.000', col:'#F1F5F9' },
                ].map(t => (
                  <div key={t.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>{t.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ color:'#E2E8F0', fontSize:10, fontWeight:600 }}>{t.name}</div>
                      <div style={{ color:'#475569', fontSize:9 }}>{t.cat}</div>
                    </div>
                    <div style={{ color:t.col, fontSize:10, fontWeight:700 }}>{t.amt}</div>
                  </div>
                ))}
                {/* Tab bar mockup */}
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:44, background:'#0F172A', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-around', alignItems:'center', padding:'0 4px' }}>
                  {['🏠','💳','🤖','🎯','⚙️'].map(ic => (
                    <div key={ic} style={{ fontSize:14, opacity: ic==='🏠'?1:0.35 }}>{ic}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ── */}
      <section style={{ padding:'80px 24px', background:'rgba(255,255,255,0.015)', borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <h2 style={{ fontSize:'clamp(24px,4vw,38px)', fontWeight:900, margin:'0 0 12px', letterSpacing:-0.5 }}>
              Todo lo que necesitas para<br />controlar tus finanzas
            </h2>
            <p style={{ color:'#64748B', fontSize:15, margin:0, maxWidth:480, marginLeft:'auto', marginRight:'auto' }}>
              Diseñado para colombianos que quieren dejar de adivinar en qué se fue el sueldo
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
            {BENEFITS.map(b => (
              <div key={b.title} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'28px 24px', transition:'border-color 0.2s' }}>
                <div style={{ fontSize:36, marginBottom:16 }}>{b.icon}</div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:10, color:'#F1F5F9' }}>{b.title}</div>
                <div style={{ fontSize:14, color:'#64748B', lineHeight:1.7 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section style={{ padding:'80px 24px' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <h2 style={{ fontSize:'clamp(24px,4vw,38px)', fontWeight:900, margin:'0 0 12px', letterSpacing:-0.5 }}>¿Cómo funciona?</h2>
            <p style={{ color:'#64748B', fontSize:15, margin:0 }}>Empieza a ver tus finanzas claras en menos de 5 minutos</p>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ display:'flex', gap:24, padding:'28px 0', borderBottom: i < STEPS.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ fontSize:'clamp(28px,5vw,48px)', fontWeight:900, color:'rgba(59,130,246,0.3)', letterSpacing:-2, flexShrink:0, lineHeight:1 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, marginBottom:8, color:'#F1F5F9' }}>{s.title}</div>
                  <div style={{ fontSize:14, color:'#64748B', lineHeight:1.7, maxWidth:540 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESCARGA ── */}
      <section id="descargar" style={{ padding:'80px 24px', background:'rgba(29,78,216,0.05)', borderTop:'1px solid rgba(59,130,246,0.12)', borderBottom:'1px solid rgba(59,130,246,0.12)' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize:'clamp(24px,4vw,38px)', fontWeight:900, margin:'0 0 12px', letterSpacing:-0.5 }}>
              Instala ORIA en tu celular
            </h2>
            <p style={{ color:'#64748B', fontSize:15, margin:'0 auto', maxWidth:500 }}>
              Funciona como una app nativa, sin pasar por el App Store. Gratis, sin actualizaciones manuales.
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20, marginBottom:40 }}>
            {/* Android */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'28px 24px' }}>
              <div style={{ fontSize:32, marginBottom:16 }}>🤖</div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:16, color:'#F1F5F9' }}>Android (Chrome)</div>
              {['Abre oriafintech.com en Chrome', 'Toca el menú ⋮ (tres puntos)', 'Selecciona "Instalar app" o "Añadir a pantalla de inicio"', '¡Listo! Abre ORIA como cualquier app'].map((step, i) => (
                <div key={i} style={{ display:'flex', gap:12, marginBottom:12, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:6, background:'rgba(49,214,123,0.15)', border:'1px solid rgba(49,214,123,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#31D67B', flexShrink:0 }}>{i+1}</div>
                  <div style={{ color:'#94A3B8', fontSize:13, lineHeight:1.5 }}>{step}</div>
                </div>
              ))}
            </div>

            {/* iOS */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'28px 24px' }}>
              <div style={{ fontSize:32, marginBottom:16 }}>🍎</div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:16, color:'#F1F5F9' }}>iPhone / iPad (Safari)</div>
              {['Abre oriafintech.com en Safari', 'Toca el botón compartir □↑ (barra inferior)', 'Desplázate y toca "Añadir a pantalla de inicio"', 'Confirma el nombre y toca "Añadir"'].map((step, i) => (
                <div key={i} style={{ display:'flex', gap:12, marginBottom:12, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:6, background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#60A5FA', flexShrink:0 }}>{i+1}</div>
                  <div style={{ color:'#94A3B8', fontSize:13, lineHeight:1.5 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Install button or iOS notice */}
          <div style={{ textAlign:'center' }}>
            {installed ? (
              <div style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'14px 28px', borderRadius:14, background:'rgba(49,214,123,0.1)', border:'1px solid rgba(49,214,123,0.3)', color:'#31D67B', fontSize:15, fontWeight:600 }}>
                ✓ ORIA ya está instalada en tu dispositivo
              </div>
            ) : installPrompt ? (
              <button onClick={handleInstall}
                style={{ padding:'16px 40px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#3B82F6,#1D4ED8)', color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(59,130,246,0.3)', display:'inline-flex', alignItems:'center', gap:10 }}>
                📲 Instalar ORIA ahora
              </button>
            ) : isIOS ? (
              <div style={{ color:'#64748B', fontSize:14 }}>
                En iPhone: toca el ícono <strong style={{ color:'#94A3B8' }}>□↑</strong> en Safari y luego <strong style={{ color:'#94A3B8' }}>"Añadir a pantalla de inicio"</strong>
              </div>
            ) : (
              <button onClick={onStart}
                style={{ padding:'16px 40px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#31D67B,#22A85A)', color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(49,214,123,0.3)' }}>
                Usar ORIA desde el navegador →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding:'80px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}><OriaIcon size={64} active /></div>
          <h2 style={{ fontSize:'clamp(24px,4vw,36px)', fontWeight:900, margin:'0 0 16px', letterSpacing:-0.5 }}>
            Toma el control de tus finanzas hoy
          </h2>
          <p style={{ color:'#64748B', fontSize:15, lineHeight:1.7, margin:'0 0 36px' }}>
            Únete y descubre exactamente en qué se va tu dinero, cuánto puedes ahorrar y cómo alcanzar tus metas más rápido.
          </p>
          <button onClick={onStart}
            style={{ padding:'16px 48px', borderRadius:16, border:'none', background:'linear-gradient(135deg,#31D67B,#22A85A)', color:'#fff', fontSize:16, fontWeight:800, cursor:'pointer', boxShadow:'0 10px 40px rgba(49,214,123,0.3)' }}>
            Crear cuenta gratis — Es gratis
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'32px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <OriaIcon size={24} active />
            <span style={{ fontSize:14, fontWeight:800, letterSpacing:3 }}>ORIA</span>
            <span style={{ color:'#334155', fontSize:13 }}>· oriafintech.com</span>
          </div>
          <div style={{ display:'flex', gap:20 }}>
            <a href="/privacidad.html" style={{ color:'#475569', fontSize:13, textDecoration:'none' }}>Privacidad</a>
            <button onClick={onLogin} style={{ background:'none', border:'none', color:'#475569', fontSize:13, cursor:'pointer', padding:0 }}>Iniciar sesión</button>
            <button onClick={onStart} style={{ background:'none', border:'none', color:'#31D67B', fontSize:13, fontWeight:600, cursor:'pointer', padding:0 }}>Registrarse</button>
          </div>
          <div style={{ color:'#1E293B', fontSize:12 }}>© {new Date().getFullYear()} ORIA Fintech. Todos los derechos reservados.</div>
        </div>
      </footer>
    </div>
  );
}
