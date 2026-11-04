import type { QuickUnlockCheck, StoredQuickCredential } from './quickUnlock';
export const isNativeQuickUnlock = false;
export async function checkQuickUnlock(): Promise<QuickUnlockCheck> {
  return { ok: false, message: 'Entrada biométrica disponível somente no aplicativo instalado.' };
}
export async function getQuickUserId(): Promise<string | null> { return null; }
export async function enableQuickUnlock(_userId: string, _refreshToken: string): Promise<void> { throw new Error('Biometria indisponível na web.'); }
export async function readQuickCredential(): Promise<StoredQuickCredential> { throw new Error('Biometria indisponível na web.'); }
export async function updateQuickCredential(_userId: string, _refreshToken: string): Promise<void> { return; }
export async function disableQuickUnlock(_userId: string): Promise<void> { return; }
