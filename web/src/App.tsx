import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LoginScreen }          from './screens/LoginScreen';
import { LandingScreen }        from './screens/LandingScreen';
import { OriaLogo }             from './components/OriaLogo';
import { DashboardScreen }      from './screens/DashboardScreen';
import { PatrimonyScreen }      from './screens/PatrimonyScreen';
import { TransactionsScreen }   from './screens/TransactionsScreen';
import { GoalsScreen }          from './screens/GoalsScreen';
import { AiChatScreen }         from './screens/AiChatScreen';
import { SettingsScreen }       from './screens/SettingsScreen';
import { AddTransactionScreen } from './screens/AddTransactionScreen';
import { TabBar }               from './components/TabBar';
import { SyncToast }            from './components/SyncToast';
import { supabase }             from './lib/supabase';
import { useAutoGmailSync }     from './hooks/useAutoGmailSync';
import { C }                    from './theme';

type Screen = 'dashboard' | 'patrimony' | 'transactions' | 'goals' | 'ai' | 'settings';

const LOCK_MS      = 60 * 1000;        // lock after 1 min of inactivity
const LOGOUT_MS    = 30 * 60 * 1000;   // auto-logout after 30 min of inactivity

function LockScreen({ email, onUnlock, onSignOut }: { email: string; onUnlock: () => void; onSignOut: () => void }) {
  const [pwd, setPwd]       = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleUnlock() {
    if (!pwd.trim()) return;
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (err) { setError('Contraseña incorrecta'); }
    else { setPwd(''); onUnlock(); }
    setLoading(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0C0F', zIndex: 999,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 28, gap: 20,
    }}>
      <OriaLogo size={48} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }}>
          Sesión bloqueada
        </div>
        <div style={{ color: C.textMuted, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
          {email}
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="password"
          placeholder="Contraseña"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
            color: C.text, fontSize: 15, padding: '13px 14px', outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        {error && <div style={{ color: C.danger, fontSize: 12, textAlign: 'center' }}>{error}</div>}
        <button
          onClick={handleUnlock}
          disabled={loading || !pwd.trim()}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            background: (!pwd.trim() || loading) ? C.surfaceEl : C.accent,
            color: (!pwd.trim() || loading) ? C.textMuted : '#000',
            fontSize: 15, fontWeight: 700, cursor: (!pwd.trim() || loading) ? 'default' : 'pointer',
            fontFamily: "'DM Sans',sans-serif",
          }}>
          {loading ? 'Verificando…' : 'Desbloquear'}
        </button>
        <button
          onClick={onSignOut}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 12, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textMuted, fontSize: 13, cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif",
          }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [userId, setUserId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [screen, setScreen]       = useState<Screen>('dashboard');
  const [showAdd, setShowAdd]     = useState(false);
  const [txReloadKey, setTxReloadKey] = useState(0);
  const [showLogin, setShowLogin] = useState<'login' | 'register' | false>(false);
  const [locked, setLocked]       = useState(false);
  const [lockEmail, setLockEmail] = useState('');
  const inactivityTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signOut = useCallback(async () => {
    setLocked(false);
    await supabase.auth.signOut();
    setUserId(null);
  }, []);

  // Reset inactivity timer: lock after 1 min, auto-logout after 30 min
  const resetTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    inactivityTimer.current = setTimeout(() => setLocked(true), LOCK_MS);
    logoutTimer.current     = setTimeout(signOut, LOGOUT_MS);
  }, [signOut]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-logout on inactivity — only while authenticated
  // Fetch user email for lock screen
  useEffect(() => {
    if (userId) {
      supabase.auth.getUser().then(({ data }) => setLockEmail(data.user?.email ?? ''));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [userId, resetTimer]);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [screen]);

  // Auto-sync Gmail on open and reload transactions when new ones arrive
  const { newCount, clearCount } = useAutoGmailSync(
    userId,
    () => setTxReloadKey(k => k + 1),
  );

  if (loading) {
    return (
    <div style={{ minHeight:'100vh', background:'#0A0C0F', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <OriaLogo size={52} />
    </div>
    );
  }

  if (!userId) {
    if (showLogin) return <LoginScreen onLogin={setUserId} initialMode={showLogin} />;
    return <LandingScreen onStart={() => setShowLogin('register')} onLogin={() => setShowLogin('login')} />;
  }

  function handleTab(id: string) {
    setScreen(id as Screen);
  }

  return (
    <div style={{ position:'relative', width:'100%', maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#0A0C0F' }}>
      {locked && (
        <LockScreen
          email={lockEmail}
          onUnlock={() => { setLocked(false); resetTimer(); }}
          onSignOut={signOut}
        />
      )}
      {screen === 'dashboard'    && <DashboardScreen onNavigate={handleTab} />}
      {screen === 'patrimony'    && <PatrimonyScreen />}
      {screen === 'transactions' && <TransactionsScreen reloadKey={txReloadKey} />}
      {screen === 'goals'        && <GoalsScreen userId={userId} />}
      {screen === 'ai'           && <AiChatScreen />}
      {screen === 'settings'     && <SettingsScreen userId={userId} />}

      <TabBar active={screen} onTab={handleTab} />

      {newCount > 0 && <SyncToast count={newCount} onDismiss={clearCount} />}

      {(screen === 'dashboard' || screen === 'transactions') && (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            position:'fixed', bottom:'calc(90px + env(safe-area-inset-bottom))', right:20,
            width:52, height:52, borderRadius:16, border:'none',
            background:'linear-gradient(135deg,#00E5A0,#00B87A)',
            color:'#fff', fontSize:26, cursor:'pointer', zIndex:200,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 20px rgba(0,229,160,0.35)',
          }}>
          ＋
        </button>
      )}

      {showAdd && (
        <AddTransactionScreen
          userId={userId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setTxReloadKey(k => k + 1); setShowAdd(false); }}
        />
      )}
    </div>
  );
}
