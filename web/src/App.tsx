import React, { useState, useEffect } from 'react';
import { LoginScreen }          from './screens/LoginScreen';
import { DashboardScreen }      from './screens/DashboardScreen';
import { TransactionsScreen }   from './screens/TransactionsScreen';
import { GoalsScreen }          from './screens/GoalsScreen';
import { AiChatScreen }         from './screens/AiChatScreen';
import { SettingsScreen }       from './screens/SettingsScreen';
import { AddTransactionScreen } from './screens/AddTransactionScreen';
import { TabBar }               from './components/TabBar';

type Screen = 'dashboard' | 'transactions' | 'goals' | 'ai' | 'settings';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen]     = useState<Screen>('dashboard');
  const [showAdd, setShowAdd]   = useState(false);

  useEffect(() => {
    // Handles return from full-redirect OAuth (Safari / popup blocked)
    const justConnected = sessionStorage.getItem('nexo_just_connected');
    if (justConnected) {
      sessionStorage.removeItem('nexo_just_connected');
      setLoggedIn(true);
      setScreen('settings');
    }
  }, []);

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;

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
      {screen === 'settings'     && <SettingsScreen />}

      <TabBar active={screen} onTab={handleTab} />

      {showAdd && <AddTransactionScreen onClose={() => setShowAdd(false)} />}
    </div>
  );
}
