import React, { useState, useEffect, useRef } from 'react';
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
  const containerRef          = useRef<HTMLDivElement>(null);

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

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#070B14', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'#22C55E', fontSize:32, fontWeight:800, letterSpacing:4 }}>NEXO</div>
      </div>
    );
  }

  if (!userId) return <LoginScreen onLogin={setUserId} />;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [screen]);

  function handleTab(id: string) {
    if (id === 'add') { setShowAdd(true); return; }
    setScreen(id as Screen);
  }

  // Screens stay mounted (display:none when inactive) to avoid re-fetching data on every navigation
  const hide = (s: Screen): React.CSSProperties => ({ display: screen === s ? 'block' : 'none' });

  return (
    <div ref={containerRef} style={{ position:'relative', width:'100%', maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#070B14', overflowX:'hidden' }}>
      <div style={hide('dashboard')}>    <DashboardScreen /> </div>
      <div style={hide('transactions')}> <TransactionsScreen /> </div>
      <div style={hide('goals')}>        <GoalsScreen /> </div>
      <div style={hide('ai')}>           <AiChatScreen /> </div>
      <div style={hide('settings')}>     <SettingsScreen userId={userId} /> </div>

      <TabBar active={screen} onTab={handleTab} />

      {showAdd && <AddTransactionScreen onClose={() => setShowAdd(false)} />}
    </div>
  );
}
