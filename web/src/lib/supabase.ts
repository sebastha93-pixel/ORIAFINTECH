import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = (import.meta.env.VITE_SUPABASE_URL  as string | undefined) ?? 'https://rwxnqogvyvpxnvcgzgri.supabase.co';
const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? 'sb_publishable_oFm9J0o3MAbxa2Oet8VxkQ_w4j-Z8WF';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
