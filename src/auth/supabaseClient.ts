import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// São valores públicos. A chave secreta NUNCA vai no aplicativo.
// A configuração é verificada na tela de entrada antes de autenticar.
export const authConfigured = Boolean(url && publishableKey);

export const supabaseAuth = createClient(
  url || 'https://configuracao-invalida.supabase.co',
  publishableKey || 'configuracao-ausente',
  {
    auth: {
      persistSession: false, // A prova exige nova entrada ao sair/reabrir.
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
