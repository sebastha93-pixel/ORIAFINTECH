import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { runGmailSync } from '../lib/gmailSync';

export function useAutoGmailSync(
  userId: string | null,
  onNewTransactions?: () => void,
) {
  const [newCount, setNewCount] = useState(0);
  const [syncing, setSyncing]   = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!userId || ran.current) return;
    if (localStorage.getItem('nexo_gmail_connected') !== '1') return;
    ran.current = true;

    void (async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      setSyncing(true);
      try {
        const { data } = await supabase
          .from('accounts')
          .select('id, institution, account_suffix, account_holder, initial_balance_set_at')
          .eq('user_id', userId)
          .eq('is_active', true);

        const result = await runGmailSync(userId, data ?? []);

        if (result.created > 0) {
          setNewCount(result.created);
          onNewTransactions?.();

          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('ORIA · Nuevos movimientos', {
              body: `${result.created} movimiento${result.created !== 1 ? 's' : ''} importado${result.created !== 1 ? 's' : ''} automáticamente desde Gmail`,
              icon: '/favicon.png',
            });
          }
        }
      } catch {
        // Silent — never disrupt app startup
      } finally {
        setSyncing(false);
      }
    })();
  }, [userId]);

  return { newCount, syncing, clearCount: () => setNewCount(0) };
}
