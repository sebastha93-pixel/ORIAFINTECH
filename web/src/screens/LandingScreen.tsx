import React, { useState, useEffect } from 'react';
import { OriaLogo } from '../components/OriaLogo';

interface Props {
  onStart: () => void;
  onLogin: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandaloneMode = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

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
    <div style={{ background: '#060D1A', color: '#F7F9FC', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(6,13,26,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <OriaLogo size={34} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={onLogin} style={{ padding: '9px 22px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94A3B8', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Iniciar sesión
            </button>
            <button onClick={onStart} style={{ padding: '9px 22px', borderRadius: 999, border: 'none', background: '#31D67B', color: '#041A0D', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Comenzar gratis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '100px 24px 120px' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(49,214,123,0.07) 0%, transparent 65%)', top: -300, left: '50%', transform: 'translateX(-20%)' }} />
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 65%)', bottom: -100, right: '5%' }} />
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 80, flexWrap: 'wrap' }}>
          {/* Left: headline + CTAs */}
          <div style={{ flex: '1 1 420px', minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(49,214,123,0.08)', border: '1px solid rgba(49,214,123,0.2)', borderRadius: 999, padding: '6px 16px', marginBottom: 32 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#31D67B', boxShadow: '0 0 8px #31D67B' }} />
              <span style={{ color: '#31D67B', fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>ASESORA FINANCIERA CON INTELIGENCIA ARTIFICIAL</span>
            </div>

            <h1 style={{ fontSize: 'clamp(36px, 5.5vw, 64px)', fontWeight: 900, lineHeight: 1.05, margin: '0 0 28px', letterSpacing: -2 }}>
              Entiende tu dinero.<br />
              <span style={{ background: 'linear-gradient(120deg, #31D67B 0%, #60A5FA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Construye tu futuro.
              </span>
            </h1>

            <p style={{ color: '#64748B', fontSize: 18, lineHeight: 1.75, margin: '0 0 40px', maxWidth: 460 }}>
              ORIA importa y categoriza tus movimientos con inteligencia artificial, calcula tu patrimonio en tiempo real y responde tus dudas financieras basándose en tus datos reales.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
              <button onClick={onStart} style={{ padding: '16px 40px', borderRadius: 14, border: 'none', background: '#31D67B', color: '#041A0D', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 40px rgba(49,214,123,0.22)', letterSpacing: -0.2 }}>
                Comenzar gratis
              </button>
              <button onClick={onLogin} style={{ padding: '16px 32px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#CBD5E1', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
                Ver demo →
              </button>
            </div>

            <p style={{ color: '#334155', fontSize: 12, margin: 0, letterSpacing: 0.3 }}>Sin tarjeta de crédito · Configuración en 3 minutos</p>
          </div>

          {/* Right: phone mockup */}
          <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(49,214,123,0.1) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
            <div style={{ width: 268, height: 546, borderRadius: 48, border: '1.5px solid rgba(255,255,255,0.1)', background: 'linear-gradient(180deg, #0B1629 0%, #060D1A 100%)', boxShadow: '0 60px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
              {/* Status bar */}
              <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#475569', fontSize: 10, fontWeight: 600 }}>9:41</span>
                <div style={{ width: 14, height: 7, borderRadius: 2, border: '1px solid #475569', position: 'relative' }}>
                  <div style={{ width: '70%', height: '100%', background: '#31D67B', borderRadius: 1 }} />
                </div>
              </div>
              {/* Content */}
              <div style={{ padding: '8px 16px 80px', boxSizing: 'border-box', overflowY: 'hidden', height: 'calc(100% - 44px)' }}>
                <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, letterSpacing: 0.8, marginBottom: 2 }}>BUENOS DÍAS</div>
                <div style={{ color: '#F1F5F9', fontSize: 17, fontWeight: 800, marginBottom: 18, letterSpacing: -0.3 }}>Sebastián</div>
                {/* Net worth card */}
                <div style={{ background: 'linear-gradient(135deg, rgba(49,214,123,0.1) 0%, rgba(96,165,250,0.07) 100%)', border: '1px solid rgba(49,214,123,0.18)', borderRadius: 18, padding: '16px', marginBottom: 14 }}>
                  <div style={{ color: '#475569', fontSize: 9, letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>PATRIMONIO NETO</div>
                  <div style={{ color: '#F1F5F9', fontSize: 23, fontWeight: 900, marginBottom: 12, letterSpacing: -0.5 }}>$8.240.000</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: '#475569', fontSize: 8, marginBottom: 2 }}>Activos</div>
                      <div style={{ color: '#31D67B', fontSize: 11, fontWeight: 700 }}>$10.4M</div>
                    </div>
                    <div>
                      <div style={{ color: '#475569', fontSize: 8, marginBottom: 2 }}>Deudas</div>
                      <div style={{ color: '#F87171', fontSize: 11, fontWeight: 700 }}>$2.16M</div>
                    </div>
                    <div>
                      <div style={{ color: '#475569', fontSize: 8, marginBottom: 2 }}>Ahorro</div>
                      <div style={{ color: '#60A5FA', fontSize: 11, fontWeight: 700 }}>28%</div>
                    </div>
                  </div>
                </div>
                {/* Transactions */}
                <div style={{ color: '#334155', fontSize: 9, fontWeight: 600, letterSpacing: 0.8, marginBottom: 10 }}>ÚLTIMOS MOVIMIENTOS</div>
                {[
                  { name: 'Nómina julio', cat: 'Salario', amt: '+$4.500.000', col: '#31D67B' },
                  { name: 'Éxito · Mercado', cat: 'Alimentación', amt: '-$185.000', col: '#94A3B8' },
                  { name: 'Netflix', cat: 'Suscripciones', amt: '-$23.900', col: '#94A3B8' },
                  { name: 'Rappi Express', cat: 'Restaurantes', amt: '-$67.000', col: '#94A3B8' },
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#CBD5E1', fontSize: 10, fontWeight: 600, marginBottom: 1 }}>{t.name}</div>
                      <div style={{ color: '#334155', fontSize: 9 }}>{t.cat}</div>
                    </div>
                    <div style={{ color: t.col, fontSize: 10, fontWeight: 700 }}>{t.amt}</div>
                  </div>
                ))}
              </div>
              {/* Tab bar */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 62, background: 'rgba(6,13,26,0.96)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 8px 6px' }}>
                {[
                  { label: 'Inicio', active: true },
                  { label: 'Movim.', active: false },
                  { label: 'ORIA', active: false },
                  { label: 'Metas', active: false },
                  { label: 'Ajustes', active: false },
                ].map(tab => (
                  <div key={tab.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: tab.active ? 'rgba(49,214,123,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${tab.active ? 'rgba(49,214,123,0.3)' : 'rgba(255,255,255,0.06)'}` }} />
                    <div style={{ color: tab.active ? '#31D67B' : '#334155', fontSize: 7, fontWeight: tab.active ? 700 : 500 }}>{tab.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLARITY ── */}
      <section style={{ padding: '120px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#334155', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 36 }}>El problema real</p>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 900, lineHeight: 1.25, letterSpacing: -1, margin: '0 0 32px', color: '#F1F5F9' }}>
            La mayoría de las personas no tienen<br />
            un problema de dinero.<br />
            Tienen un <span style={{ color: '#31D67B' }}>problema de claridad.</span>
          </h2>
          <p style={{ color: '#475569', fontSize: 17, lineHeight: 1.85, margin: '0 0 72px' }}>
            Sabes que gastas, pero no sabes exactamente cuánto ni en qué. Tienes ingresos, pero no sabes a dónde van. ORIA convierte ese caos en claridad total.
          </p>

          {/* Connecting diagram */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap', rowGap: 24 }}>
            {/* Input nodes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Ingresos', 'Gastos', 'Deudas', 'Inversiones', 'Metas'].map(label => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <div style={{ padding: '8px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748B', fontSize: 12, fontWeight: 600, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{label}</div>
                  <div style={{ width: 48, height: 1, background: 'linear-gradient(90deg, rgba(100,116,139,0.3) 0%, rgba(49,214,123,0.5) 100%)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
            {/* Center logo */}
            <div style={{ padding: '22px', borderRadius: '50%', background: 'rgba(49,214,123,0.05)', border: '1px solid rgba(49,214,123,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 4px', flexShrink: 0 }}>
              <OriaLogo size={44} showWordmark={false} />
            </div>
            {/* Output nodes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Patrimonio neto', 'Tasa de ahorro', 'Proyecciones', 'Alertas', 'Consejos IA'].map(label => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <div style={{ width: 48, height: 1, background: 'linear-gradient(90deg, rgba(49,214,123,0.5) 0%, rgba(96,165,250,0.4) 100%)', flexShrink: 0 }} />
                  <div style={{ padding: '8px 18px', borderRadius: 999, background: 'rgba(49,214,123,0.05)', border: '1px solid rgba(49,214,123,0.14)', color: '#31D67B', fontSize: 12, fontWeight: 600, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PHILOSOPHY ── */}
      <section style={{ padding: '100px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ maxWidth: 640, marginBottom: 64 }}>
            <p style={{ color: '#334155', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>Filosofía</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 900, lineHeight: 1.12, letterSpacing: -1.2, margin: '0 0 20px' }}>
              No rastreamos gastos.<br />
              <span style={{ color: '#60A5FA' }}>Interpretamos tu vida financiera.</span>
            </h2>
            <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.85, margin: 0 }}>
              Otras apps cuentan transacciones. ORIA las interpreta. Entiende el contexto, detecta patrones y te da una perspectiva que va mucho más allá de los números.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
            {[
              { word: 'Entiende', color: '#31D67B', highlight: true, desc: 'Cada movimiento tiene contexto: cuándo, por qué y cómo impacta tu patrimonio de manera global.' },
              { word: 'Decide', color: '#F1F5F9', highlight: false, desc: 'Información clara en el momento de cada decisión: ¿puedo permitirme esto? ¿vale realmente la pena?' },
              { word: 'Crece', color: '#F1F5F9', highlight: false, desc: 'Metas inteligentes basadas en tu capacidad real de ahorro, no en cifras arbitrarias o genéricas.' },
              { word: 'Avanza', color: '#F1F5F9', highlight: false, desc: 'Seguimiento constante. Ves tu progreso semana a semana, mes a mes, año a año sin esfuerzo.' },
            ].map(card => (
              <div key={card.word} style={{ padding: '40px 32px', background: card.highlight ? 'rgba(49,214,123,0.04)' : 'transparent', borderRadius: 20, border: `1px solid ${card.highlight ? 'rgba(49,214,123,0.12)' : 'rgba(255,255,255,0.05)'}` }}>
                <div style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, marginBottom: 16, letterSpacing: -0.5, color: card.color }}>{card.word}</div>
                <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.75 }}>{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI ORIA ── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 80, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px' }}>
            <p style={{ color: '#334155', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>IA conversacional</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, lineHeight: 1.12, letterSpacing: -1, margin: '0 0 20px' }}>
              Pregúntale a ORIA.<br />
              <span style={{ color: '#60A5FA' }}>Ella ya conoce tus finanzas.</span>
            </h2>
            <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.85, margin: 0 }}>
              No una IA genérica. Una asesora que conoce tu historial completo: ingresos, deudas y metas. Sus respuestas se basan en tus datos reales, no en suposiciones.
            </p>
          </div>

          {/* Chat mockup */}
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, overflow: 'hidden' }}>
              {/* Chat header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(49,214,123,0.08)', border: '1px solid rgba(49,214,123,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <OriaLogo size={20} showWordmark={false} />
                </div>
                <div>
                  <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700 }}>ORIA</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#31D67B' }} />
                    <span style={{ color: '#31D67B', fontSize: 10, fontWeight: 600 }}>Activa</span>
                  </div>
                </div>
              </div>
              {/* Messages */}
              <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { role: 'user', text: '¿Puedo comprar un apartamento este año?' },
                  { role: 'ai', text: 'Con tu tasa de ahorro del 28% y patrimonio neto de $8.2M, podrías tener cuota inicial de $50M en 18 meses si mantienes el ritmo. Antes te recomiendo cerrar la deuda de tu tarjeta Visa.' },
                  { role: 'user', text: '¿Qué deuda debería pagar primero?' },
                  { role: 'ai', text: 'Tu tarjeta Visa tiene la tasa más alta (2.2% MV). Liquidarla antes te ahorra $340.000 en intereses anuales. Redirige el 30% de lo que gastas en restaurantes y la cierras en 4 meses.' },
                ].map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '82%', padding: '11px 15px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? 'rgba(49,214,123,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${msg.role === 'user' ? 'rgba(49,214,123,0.18)' : 'rgba(255,255,255,0.06)'}`, color: msg.role === 'user' ? '#A7F3D0' : '#94A3B8', fontSize: 12.5, lineHeight: 1.65 }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {/* Input bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ color: '#334155', fontSize: 12, flex: 1 }}>¿Estoy ahorrando suficiente?</span>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: '#31D67B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M6 3l2 2-2 2" stroke="#041A0D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AUDIENCES ── */}
      <section style={{ padding: '100px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#334155', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>Para quién es ORIA</p>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, letterSpacing: -0.8, margin: '0 0 16px', lineHeight: 1.15 }}>
              Diseñada para personas que<br />toman sus finanzas en serio
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { audience: 'Profesionales', desc: 'Generan buen ingreso y quieren saber exactamente qué pasa con él mes a mes, sin sorpresas.' },
              { audience: 'Empresarios', desc: 'Necesitan claridad absoluta entre las finanzas del negocio y las personales. Sin mezclas.' },
              { audience: 'Familias', desc: 'Quieren un control conjunto del presupuesto familiar con metas compartidas y visibilidad total.' },
              { audience: 'Emprendedores', desc: 'En etapa de crecimiento, necesitan máxima claridad en el flujo de caja personal cada día.' },
            ].map((a, i) => (
              <div key={a.audience} style={{ padding: '32px 28px', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(49,214,123,0.07)', border: '1px solid rgba(49,214,123,0.14)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${['#31D67B','#60A5FA','#34D399','#818CF8'][i]}`, opacity: 0.8 }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: '#F1F5F9', letterSpacing: -0.3 }}>{a.audience}</div>
                <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.75 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#334155', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>Seguridad</p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, lineHeight: 1.12, letterSpacing: -1, margin: '0 0 20px' }}>
            Tu información<br />
            <span style={{ color: '#60A5FA' }}>siempre te pertenece.</span>
          </h2>
          <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.85, margin: '0 0 60px' }}>
            ORIA no accede a tus contraseñas bancarias, no puede mover tu dinero y nunca vende tus datos.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, textAlign: 'left' }}>
            {[
              { title: 'Cifrado end-to-end', desc: 'Tus datos viajan y se almacenan siempre cifrados. En tránsito y en reposo.' },
              { title: 'OAuth 2.0', desc: 'Autenticación estándar de la industria. Sin contraseñas en texto plano nunca.' },
              { title: 'Sin acceso bancario', desc: 'ORIA solo lee notificaciones de correo. Nunca toca ni accede a tu banco.' },
              { title: 'Tus datos, tus reglas', desc: 'Exporta todo en cualquier momento. Tu historial financiero es completamente tuyo.' },
            ].map(s => (
              <div key={s.title} style={{ padding: '24px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#31D67B', marginBottom: 16, boxShadow: '0 0 10px rgba(49,214,123,0.45)' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 8 }}>{s.title}</div>
                <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTALAR ── */}
      <section id="instalar" style={{ padding: '80px 24px', background: 'rgba(96,165,250,0.03)', borderTop: '1px solid rgba(96,165,250,0.08)', borderBottom: '1px solid rgba(96,165,250,0.08)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: -0.5 }}>
              Instala ORIA en tu celular
            </h2>
            <p style={{ color: '#475569', fontSize: 15, margin: 0 }}>
              Sin App Store. Sin actualizaciones manuales. Se instala directo desde el navegador.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 36 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 24px' }}>
              <div style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Android · Chrome</div>
              {['Abre oriafintech.com en Chrome', 'Toca el menú ⋮ (tres puntos arriba a la derecha)', 'Selecciona "Instalar app" o "Añadir a pantalla de inicio"', 'ORIA queda en tu pantalla de inicio, lista para usar'].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(49,214,123,0.08)', border: '1px solid rgba(49,214,123,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#31D67B', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>{step}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 24px' }}>
              <div style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>iPhone / iPad · Safari</div>
              {['Abre oriafintech.com en Safari', 'Toca el botón □↑ en la barra inferior de Safari', 'Desplázate y selecciona "Añadir a pantalla de inicio"', 'Confirma el nombre y toca "Añadir". Listo.'].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#60A5FA', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            {installed ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 14, background: 'rgba(49,214,123,0.07)', border: '1px solid rgba(49,214,123,0.22)', color: '#31D67B', fontSize: 14, fontWeight: 600 }}>
                ORIA ya está instalada en tu dispositivo
              </div>
            ) : installPrompt ? (
              <button onClick={handleInstall} style={{ padding: '15px 40px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 32px rgba(59,130,246,0.22)' }}>
                Instalar ORIA ahora
              </button>
            ) : isIOS ? (
              <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>
                En iPhone: toca <strong style={{ color: '#94A3B8' }}>□↑</strong> en Safari y luego <strong style={{ color: '#94A3B8' }}>"Añadir a pantalla de inicio"</strong>
              </p>
            ) : (
              <button onClick={onStart} style={{ padding: '15px 40px', borderRadius: 14, border: 'none', background: '#31D67B', color: '#041A0D', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Usar desde el navegador →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: '120px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(49,214,123,0.05) 0%, transparent 65%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <OriaLogo size={52} />
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 46px)', fontWeight: 900, lineHeight: 1.12, letterSpacing: -1, margin: '0 0 20px' }}>
            Tu futuro financiero tiene una dirección.<br />
            <span style={{ color: '#31D67B' }}>ORIA te ayuda a construirlo.</span>
          </h2>
          <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.85, margin: '0 0 40px' }}>
            Únete. Entiende tu dinero. Toma mejores decisiones. Avanza.
          </p>
          <button onClick={onStart} style={{ padding: '18px 56px', borderRadius: 16, border: 'none', background: '#31D67B', color: '#041A0D', fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 48px rgba(49,214,123,0.22)', letterSpacing: -0.3 }}>
            Comenzar gratis
          </button>
          <p style={{ color: '#1E293B', fontSize: 12, marginTop: 18 }}>Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <OriaLogo size={30} />
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="/privacidad.html" style={{ color: '#334155', fontSize: 13, textDecoration: 'none' }}>Privacidad</a>
            <button onClick={onLogin} style={{ background: 'none', border: 'none', color: '#334155', fontSize: 13, cursor: 'pointer', padding: 0 }}>Iniciar sesión</button>
            <button onClick={onStart} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', padding: 0 }}>Registrarse</button>
          </div>
          <p style={{ color: '#1E293B', fontSize: 12, margin: 0 }}>© {new Date().getFullYear()} ORIA. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
