import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { runGmailSync } from '../lib/gmailSync';

// Minimum gap between syncs (frontend throttle)
const MIN_GAP_MS    = 20 * 60 * 1000; // 20 min
const INTERVAL_MS   = 30 * 60 * 1000; // poll every 30 min while app is open

function lastSyncAt(): number {
  return parseInt(localStorage.getItem('nexo_last_gmail_sync') ?? '0', 10);
}
function markSynced() {
  localStorage.setItem('nexo_last_gmail_sync', String(Date.now()));
}

export function useAutoGmailSync(
  userId: string | null,
  onNewTransactions?: () => void,
) {
  const [newCount, setNewCount] = useState(0);
  const [syncing, setSyncing]   = useState(false);

  // Keep latest callback in a ref so closures below never go stale
  const cbRef      = useRef(onNewTransactions);
  const syncingRef = useRef(false);
  const userRef    = useRef(userId);

  useEffect(() => { cbRef.current    = onNewTransactions; }, [onNewTransactions]);
  useEffect(() => { userRef.current  = userId; },           [userId]);

  useEffect(() => {
    if (!userId) return;
    if (localStorage.getItem('nexo_gmail_connected') !== '1') return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    async function sync(bypassThrottle = false) {
      const uid = userRef.current;
      if (!uid || syncingRef.current) return;
      if (!bypassThrottle && Date.now() - lastSyncAt() < MIN_GAP_MS) return;

      syncingRef.current = true;
      setSyncing(true);
      try {
        const { data } = await supabase
          .from('accounts')
          .select('id, institution, account_suffix, account_holder, initial_balance_set_at')
          .eq('user_id', uid)
          .eq('is_active', true);

        const result = await runGmailSync(uid, data ?? []);
        markSynced();

        if (result.created > 0) {
          setNewCount(n => n + result.created);
          cbRef.current?.();

          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('ORIA · Nuevos movimientos', {
              body: `${result.created} movimiento${result.created !== 1 ? 's' : ''} importado${result.created !== 1 ? 's' : ''} automáticamente desde Gmail`,
              icon: '/favicon.png',
            });
          }
        }
      } catch {
        // Silent — never disrupt the user
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    }

    // 1. Sync immediately on mount (bypass throttle — first open of the session)
    void sync(true);

    // 2. Sync when user returns to the tab after being away
    function onVisibility() {
      if (document.visibilityState === 'visible') void sync();
    }
    document.addEventListener('visibilitychange', onVisibility);

    // 3. Poll every 30 min while app stays open
    const timer = setInterval(() => void sync(), INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(timer);
    };
  }, [userId]); // userId is intentionally the only dep — callbacks use refs

  return { newCount, syncing, clearCount: () => setNewCount(0) };
}
