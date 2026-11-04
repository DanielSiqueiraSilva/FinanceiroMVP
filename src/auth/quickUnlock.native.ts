import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import type { QuickUnlockCheck, StoredQuickCredential } from './quickUnlock';

const LAST_ACCOUNT = 'native:last_account'; // Somente UUID; NÃO é segredo.
const pref = (userId: string) => `native:${userId}`;
const secureKey = (userId: string) => `finanmvp.native.${userId}.refresh`;
const secureOptions: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Confirmar identidade para acessar o FinanMVP',
};
export const isNativeQuickUnlock = true;

export async function checkQuickUnlock(): Promise<QuickUnlockCheck> {
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    if (!hardware || !enrolled || types.length === 0) {
      return { ok: false, message: 'Cadastre uma digital ou reconhecimento facial nas configurações do aparelho.' };
    }
    return { ok: true, message: '' };
  } catch {
    return { ok: false, message: 'Não foi possível verificar a biometria do aparelho.' };
  }
}

export async function getQuickUserId(): Promise<string | null> {
  const last = await AsyncStorage.getItem(LAST_ACCOUNT);
  if (!last) return null;
  return (await AsyncStorage.getItem(pref(last))) === 'enabled' ? last : null;
}

export async function enableQuickUnlock(userId: string, refreshToken: string): Promise<void> {
  const check = await checkQuickUnlock();
  if (!check.ok) throw new Error(check.message);
  // Ativação voluntária: confirmação explícita, mesmo no iOS onde a criação
  // de item seguro não necessariamente mostra o prompt nativo.
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Ativar entrada biométrica no FinanMVP',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  if (!result.success) throw new Error('Ativação cancelada ou biometria não reconhecida.');
  // Na plataforma Android esta gravação também pode mostrar um prompt.
  await SecureStore.setItemAsync(secureKey(userId), refreshToken, secureOptions);
  // O marcador só é salvo DEPOIS do armazenamento protegido ter funcionado.
  await AsyncStorage.setItem(pref(userId), 'enabled');
  await AsyncStorage.setItem(LAST_ACCOUNT, userId);
}

export async function readQuickCredential(): Promise<StoredQuickCredential> {
  const userId = await getQuickUserId();
  if (!userId) throw new Error('Entrada rápida não ativada neste aparelho.');
  const check = await checkQuickUnlock();
  if (!check.ok) throw new Error(check.message);
  // O sistema apresenta o diálogo biométrico AO LER o refresh token.
  // Se cancelar, rejeitar ou trocar as digitais, nunca devolve credencial.
  const refreshToken = await SecureStore.getItemAsync(secureKey(userId), secureOptions);
  if (!refreshToken) throw new Error('Credencial biométrica indisponível. Entre com e-mail e senha e ative novamente.');
  return { userId, refreshToken };
}

export async function updateQuickCredential(userId: string, refreshToken: string): Promise<void> {
  if ((await getQuickUserId()) !== userId) return;
  // Refresh tokens são rotativos no Supabase. Sob Android a atualização da
  // credencial protegida pode solicitar uma nova autenticação nativa.
  await SecureStore.setItemAsync(secureKey(userId), refreshToken, secureOptions);
}

export async function disableQuickUnlock(userId: string): Promise<void> {
  // Desativa imediatamente mesmo que não seja possível apagar o Keychain.
  await AsyncStorage.removeItem(pref(userId));
  const last = await AsyncStorage.getItem(LAST_ACCOUNT);
  if (last === userId) await AsyncStorage.removeItem(LAST_ACCOUNT);
  await SecureStore.deleteItemAsync(secureKey(userId));
}
