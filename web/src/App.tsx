import React, { useState, useEffect } from 'react';
import { LoginScreen }          from './screens/LoginScreen';
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
  const [userId, setUserId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen]   = useState<Screen>('dashboard');
  const [showAdd, setShowAdd] = useState(false);

  // Restore session on mount (persisted by Supabase in localStorage)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setLoading(false);
    });
    // Keep session in sync when it changes (token refresh, sign-out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#070B14', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'#22C55E', fontSize:32, fontWeight:800, letterSpacing:4 }}>NEXO</div>
      </div>
    );
  }

  if (!userId) return <LoginScreen onLogin={setUserId} />;

  function handleTab(id: string) {
    if (id === 'add') { setShowAdd(true); return; }
    setScreen(id as Screen);
  }

  return (
    <div style={{ position:'relative', width:'100%', maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#070B14', overflowX:'hidden' }}>
      {screen === 'dashboard'    && <DashboardScreen />}
      {screen === 'transactions' && <TransactionsScreen />}
      {screen === 'goals'        && <GoalsScreen />}
      {screen === 'ai'           && <AiChatScreen />}
      {screen === 'settings'     && <SettingsScreen userId={userId} />}

      <TabBar active={screen} onTab={handleTab} />

      {showAdd && <AddTransactionScreen onClose={() => setShowAdd(false)} />}
    </div>
  );
}
