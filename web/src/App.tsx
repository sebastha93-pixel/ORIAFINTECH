import React, { useState } from 'react';
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
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('nexo_logged_in') === '1');
  const [screen, setScreen]     = useState<Screen>('dashboard');
  const [showAdd, setShowAdd]   = useState(false);

  function handleLogin() {
    localStorage.setItem('nexo_logged_in', '1');
    setLoggedIn(true);
  }

  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;

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
