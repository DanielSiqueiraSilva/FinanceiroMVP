/** Contrato de tipos + fallback para verificação estática (tsc).
 * O bundler usa quickUnlock.native.ts em Android/iOS e quickUnlock.web.ts no navegador.
 */
export type StoredQuickCredential = { userId: string; refreshToken: string };
export type QuickUnlockCheck = { ok: boolean; message: string };
export const isNativeQuickUnlock = false;
export async function checkQuickUnlock(): Promise<QuickUnlockCheck> {
  return { ok: false, message: 'Entrada biométrica disponível somente no aplicativo instalado.' };
}
export async function getQuickUserId(): Promise<string | null> { return null; }
export async function enableQuickUnlock(_userId: string, _refreshToken: string): Promise<void> {
  throw new Error('Entrada biométrica indisponível nesta plataforma.');
}
export async function readQuickCredential(): Promise<StoredQuickCredential> {
  throw new Error('Entrada biométrica indisponível nesta plataforma.');
}
export async function updateQuickCredential(_userId: string, _refreshToken: string): Promise<void> { return; }
export async function disableQuickUnlock(_userId: string): Promise<void> { return; }
