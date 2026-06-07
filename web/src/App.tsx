import React, { useState, useEffect } from 'react';
import { LoginScreen }          from './screens/LoginScreen';
import { LandingScreen }        from './screens/LandingScreen';
import { OriaLogo }             from './components/OriaLogo';
import { DashboardScreen }      from './screens/DashboardScreen';
import { TransactionsScreen }   from './screens/TransactionsScreen';
import { GoalsScreen }          from './screens/GoalsScreen';
import { AiChatScreen }         from './screens/AiChatScreen';
import { SettingsScreen }       from './screens/SettingsScreen';
import { AddTransactionScreen } from './screens/AddTransactionScreen';
import { TabBar }               from './components/TabBar';
import { supabase }             from './lib/supabase';

type Screen = 'dashboard' | 'transactions' | 'goals' | 'ai' | 'settings';

export default function App() {
  const [userId, setUserId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [screen, setScreen]       = useState<Screen>('dashboard');
  const [showAdd, setShowAdd]     = useState(false);
  const [txReloadKey, setTxReloadKey] = useState(0);
  const [showLogin, setShowLogin] = useState(false);

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

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [screen]);

  if (loading) {
    return (
    <div style={{ minHeight:'100vh', background:'#060D1A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <OriaLogo size={52} />
    </div>
    );
  }

  if (!userId) {
    if (showLogin) return <LoginScreen onLogin={setUserId} />;
    return <LandingScreen onStart={() => setShowLogin(true)} onLogin={() => setShowLogin(true)} />;
  }

  function handleTab(id: string) {
    setScreen(id as Screen);
  }

  return (
    <div style={{ position:'relative', width:'100%', maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#070B14' }}>
      {screen === 'dashboard'    && <DashboardScreen />}
      {screen === 'transactions' && <TransactionsScreen reloadKey={txReloadKey} />}
      {screen === 'goals'        && <GoalsScreen userId={userId} />}
      {screen === 'ai'           && <AiChatScreen />}
      {screen === 'settings'     && <SettingsScreen userId={userId} />}

      <TabBar active={screen} onTab={handleTab} />

      {(screen === 'dashboard' || screen === 'transactions') && (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            position:'fixed', bottom:90, right:20,
            width:52, height:52, borderRadius:16, border:'none',
            background:'linear-gradient(135deg,#31D67B,#22A85A)',
            color:'#fff', fontSize:26, cursor:'pointer', zIndex:200,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 20px rgba(49,214,123,0.45)',
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
