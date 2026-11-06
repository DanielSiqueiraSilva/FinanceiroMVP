import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { supabaseAuth } from '../../auth/supabaseClient';
import { useProfileSession } from '../auth/ProtectedFinance';
import { useNotifications } from '../../notifications/NotificationsContext';
import { TransactionForm } from '../finance/TransactionForm';
import { PeriodSelector } from '../finance/PeriodSelector';
import type { Lancamento, LancamentoInput } from '../../types/finance';
import {
  getSharedWallet, walletAction, updateSharedWallet, closeSharedWallet,
  olderWalletHistory, type WalletDetailsResponse, type WalletMessage,
  type WalletTransaction, type WalletTransactionInput,
} from '../../services/shared-wallets-api';

const money = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
const timeLabel = (value: string) => {
  try { return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return ''; }
};
function normalForm(value: LancamentoInput): WalletTransactionInput {
  return {
    type: value.tipo, amount: value.valor, category: value.categoria,
    description: value.descricao, entry_date: value.data,
  };
}
function toPersonal(value: WalletTransaction): Lancamento {
  return {
    id: value.id, descricao: value.description, categoria: value.category,
    valor: Number(value.amount), data: value.entry_date, tipo: value.type,
  };
}

export function WalletDetails({
  walletId, onBack, onRevoked,
}: {
  walletId: string; onBack: () => void; onRevoked: () => void;
}) {
  const session = useProfileSession()?.session;
  const userId = session?.user.id ?? null;
  const notifications = useNotifications();
  const styles = useAccessibleStyles(base);
  const { isDark } = useAccessibility();
  const [details, setDetails] = useState<WalletDetailsResponse | null>(null);
  const [status, setStatus] = useState('Conectando...');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const chatOpenRef = useRef(false);
  const onRevokedRef = useRef(onRevoked);
  onRevokedRef.current = onRevoked;
  const [draft, setDraft] = useState('');
  const [invitationEmail, setInvitationEmail] = useState('');
  const [editWallet, setEditWallet] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletDescription, setWalletDescription] = useState('');
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [closeText, setCloseText] = useState('');
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removeText, setRemoveText] = useState('');
  const [deleteTransaction, setDeleteTransaction] = useState<string | null>(null);
  const [editing, setEditing] = useState<WalletTransaction | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [olderMessages, setOlderMessages] = useState<WalletMessage[]>([]);
  const [olderTransactions, setOlderTransactions] = useState<WalletTransaction[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);
  const [allTransactionsLoaded, setAllTransactionsLoaded] = useState(false);
  const chatScrollRef = useRef<ScrollView | null>(null);
  const alive = useRef(true);
  const currentRequest = useRef(0);

  const refresh = useCallback(async (initial = false) => {
    if (!userId) return;
    const reqId = ++currentRequest.current;
    if (initial) setLoading(true);
    try {
      const data = await getSharedWallet(walletId);
      if (!alive.current || reqId !== currentRequest.current) return;
      setDetails(data);
      setError('');
    } catch (e) {
      if (!alive.current || reqId !== currentRequest.current) return;
      const description = e instanceof Error ? e.message : 'Não foi possível carregar esta carteira.';
      if (/não encontrada|acesso revogado|não possui permissão|403|404/i.test(description)) {
        setDetails(null); setOlderMessages([]); setOlderTransactions([]);
        onRevokedRef.current();
        return;
      }
      setError(description);
    } finally {
      if (alive.current && reqId === currentRequest.current) setLoading(false);
    }
  }, [userId, walletId]);

  useEffect(() => {
    alive.current = true;
    void refresh(true);
    return () => { alive.current = false; currentRequest.current++; };
  }, [refresh]);

  const markRead = useCallback(async () => {
    try { await walletAction<{ success: boolean }>(walletId, 'mark_read'); }
    catch { /* Indicação de leitura não deve impedir uso do chat. */ }
  }, [walletId]);

  useEffect(() => {
    if (!userId || !session?.access_token) return;
    void supabaseAuth.realtime.setAuth(session.access_token);
    let active = true;
    const sync = () => { if (active) void refresh(); };
    const chatMessage = () => {
      if (!active) return;
      sync();
      if (chatOpenRef.current) void markRead();
    };
    const channel = supabaseAuth.channel('shared-wallet-' + walletId, { config: { private: true } })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'shared_wallet_transactions',
        filter: 'wallet_id=eq.' + walletId,
      }, sync)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'shared_wallet_messages',
        filter: 'wallet_id=eq.' + walletId,
      }, chatMessage)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'shared_wallet_members',
        filter: 'wallet_id=eq.' + walletId,
      }, sync)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'shared_wallets',
        filter: 'id=eq.' + walletId,
      }, sync)
      // O aviso privado de remoção fecha a tela sem esperar a próxima consulta
      // periódica. Nenhum dado da carteira é enviado por esse canal.
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notification_items',
        filter: 'user_id=eq.' + userId,
      }, sync)
      .subscribe(next => { if (active) setStatus(next === 'SUBSCRIBED' ? 'Em tempo real' : 'Reconectando...'); });

    // Em uma conexão perdida, a próxima consulta valida RLS e revoga a tela.
    const interval = setInterval(sync, 10000);
    return () => {
      active = false;
      clearInterval(interval);
      void supabaseAuth.removeChannel(channel);
    };
  }, [userId, session?.access_token, walletId, refresh, markRead]);

  const joinedMessages = useMemo(() => {
    const data = [...olderMessages, ...(details?.messages ?? [])];
    return [...new Map(data.map(value => [value.id, value])).values()]
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  }, [olderMessages, details?.messages]);
  const joinedTransactions = useMemo(() => {
    const data = [...(details?.transactions ?? []), ...olderTransactions];
    return [...new Map(data.map(value => [value.id, value])).values()]
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at));
  }, [details?.transactions, olderTransactions]);
  const periodTransactions = joinedTransactions.filter(item => {
    const [y, m] = item.entry_date.split('-').map(Number);
    return y === year && m === month;
  });
  const isOwner = details?.wallet.owner_id === userId;
  const myRead = details?.reads.find(read => read.user_id === userId)?.last_read_at;
  const unreadCount = joinedMessages.filter(msg =>
    msg.sender_id !== userId && msg.created_at > (myRead ?? '')).length;

  function switchTab(chat: boolean) {
    setChatOpen(chat);
    chatOpenRef.current = chat;
    if (chat) {
      void markRead().then(() => void refresh());
    }
  }

  async function run(action: string, args: object, confirmation?: string) {
    if (busy) return false;
    setBusy(true); setError('');
    try {
      await walletAction(walletId, action, args);
      if (confirmation) notifications?.feedback('notice', confirmation);
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir a ação.');
      return false;
    } finally { setBusy(false); }
  }

  async function saveTransaction(input: LancamentoInput) {
    const action = editing ? 'update_transaction' : 'create_transaction';
    const ok = await run(action, {
      transaction: normalForm(input), ...(editing ? { transaction_id: editing.id } : {}),
    }, editing ? 'Movimentação atualizada' : 'Movimentação registrada');
    if (!ok) throw new Error('Não foi possível salvar o lançamento compartilhado.');
    setEditing(null);
  }
  async function removeTransaction(id: string) {
    const ok = await run('delete_transaction', { transaction_id: id }, 'Movimentação excluída');
    if (ok) setDeleteTransaction(null);
  }

  async function sendMessage() {
    if (busy || !draft.trim() || draft.trim().length > 1200) return;
    const body = draft.trim();
    const ok = await run('send_message', { body });
    if (ok) { setDraft(''); void markRead(); }
  }
  async function loadOlder(kind: 'messages' | 'transactions') {
    if (loadingOlder || !details) return;
    const src = kind === 'messages' ? joinedMessages : joinedTransactions;
    if (!src.length) return;
    const oldest = src.reduce((min, x) => x.created_at < min ? x.created_at : min, src[0].created_at);
    setLoadingOlder(true);
    try {
      if (kind === 'messages') {
        const items = await olderWalletHistory<WalletMessage>(walletId, kind, oldest);
        setOlderMessages(prev => [...items, ...prev]);
        if (items.length < 80) setAllMessagesLoaded(true);
      } else {
        const items = await olderWalletHistory<WalletTransaction>(walletId, kind, oldest);
        setOlderTransactions(prev => [...prev, ...items]);
        if (items.length < 80) setAllTransactionsLoaded(true);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar o histórico.'); }
    finally { setLoadingOlder(false); }
  }

  function moveMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    setMonth(date.getMonth() + 1); setYear(date.getFullYear());
    setEditing(null);
  }

  if (loading && !details) return (
    <View style={styles.card}>
      <ActivityIndicator color="#7C3AED" /><Text style={styles.subtitle}>Carregando carteira...</Text>
    </View>
  );
  if (!details) return (
    <View style={styles.card}>
      <Text style={styles.error}>{error || 'Não foi possível acessar a carteira.'}</Text>
      <Pressable onPress={onBack} style={styles.secondaryButton}><Text style={styles.secondaryText}>Voltar</Text></Pressable>
    </View>
  );
  const { wallet } = details;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <Text style={styles.secondaryText}>‹ Todas as carteiras</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>{wallet.name}</Text>
          <Text style={styles.subtitle}>{wallet.description || 'Carteira compartilhada'} · {isOwner ? 'Proprietário' : 'Participante'}</Text>
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.connection}>{status}</Text>
      </View>

      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Saldo da carteira</Text>
          <Text style={styles.summaryValue}>{money(details.totals.saldo)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Receitas</Text>
          <Text style={[styles.summaryValue, styles.positive]}>{money(details.totals.total_receitas)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Despesas</Text>
          <Text style={[styles.summaryValue, styles.negative]}>{money(details.totals.total_despesas)}</Text>
        </View>
      </View>
      <Text style={styles.hint}>Totais acumulados de todos os períodos, separados das finanças pessoais.</Text>

      <View style={styles.tabRow} accessibilityRole="tablist">
        <Pressable onPress={() => switchTab(false)} accessibilityRole="tab"
          accessibilityState={{ selected: !chatOpen }} style={[styles.tab, !chatOpen && styles.activeTab]}>
          <Text style={[styles.tabText, !chatOpen && styles.activeTabText]}>Movimentações</Text>
        </Pressable>
        <Pressable onPress={() => switchTab(true)} accessibilityRole="tab"
          accessibilityState={{ selected: chatOpen }} style={[styles.tab, chatOpen && styles.activeTab]}>
          <Text style={[styles.tabText, chatOpen && styles.activeTabText]}>
            Chat{!chatOpen && unreadCount > 0 ? ' (' + unreadCount + ')' : ''}
          </Text>
        </Pressable>
      </View>

      {chatOpen ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Chat de {wallet.name}</Text>
            <Text style={styles.hint}>{status} · Apenas participantes</Text>
          </View>
          <Text style={styles.subtitle}>Mensagens de texto salvas com histórico privado da carteira.</Text>
          <ScrollView ref={chatScrollRef} style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => {
              if (olderMessages.length === 0) chatScrollRef.current?.scrollToEnd({ animated: true });
            }}
            nestedScrollEnabled>
            {details.messages.length >= 100 && !allMessagesLoaded && (
              <Pressable disabled={loadingOlder} accessibilityRole="button"
                style={styles.secondaryButton} onPress={() => void loadOlder('messages')}>
                <Text style={styles.secondaryText}>{loadingOlder ? 'Carregando...' : 'Carregar mensagens antigas'}</Text>
              </Pressable>
            )}
            {joinedMessages.length === 0 && <Text style={styles.subtitle}>Nenhuma mensagem. Inicie a conversa.</Text>}
            {joinedMessages.map(msg => {
              const mine = msg.sender_id === userId;
              return (
                <View key={msg.id} style={[styles.message, mine && styles.myMessage]}>
                  <Text style={styles.messageSender}>{mine ? 'Você' : msg.sender_name}</Text>
                  <Text style={styles.messageBody}>{msg.body}</Text>
                  <Text style={styles.messageDate}>{timeLabel(msg.created_at)}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.messageComposer}>
            <TextInput accessibilityLabel="Escrever mensagem para a carteira"
              style={[styles.input, styles.chatInput]} multiline maxLength={1200}
              placeholder="Escreva uma mensagem..." value={draft} onChangeText={setDraft}
              placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
            <Pressable accessibilityRole="button" disabled={busy || !draft.trim()}
              style={[styles.primary, (busy || !draft.trim()) && styles.disabled]}
              onPress={() => void sendMessage()}>
              <Text style={styles.primaryText}>{busy ? 'Enviando...' : 'Enviar'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <PeriodSelector mes={month} ano={year} onAnterior={() => moveMonth(-1)} onProximo={() => moveMonth(1)} />
          <TransactionForm key={String(editing?.id ?? 'new') + String(month) + String(year)}
            mes={month} ano={year}
            lancamentoEmEdicao={editing ? toPersonal(editing) : null}
            salvando={busy} onSalvar={saveTransaction} onCancelarEdicao={() => setEditing(null)} />
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Histórico de lançamentos</Text>
            {periodTransactions.length === 0 && <Text style={styles.subtitle}>Sem lançamentos neste período.</Text>}
            {periodTransactions.map(tx => (
              <View style={styles.transaction} key={tx.id}>
                <View style={styles.transactionCopy}>
                  <Text style={styles.itemTitle}>{tx.description}</Text>
                  <Text style={styles.subtitle}>
                    {tx.category} · {tx.entry_date.split('-').reverse().join('/')}
                  </Text>
                  <Text style={styles.hint}>
                    Criado por {tx.created_by_name}{tx.updated_at !== tx.created_at ?
                      ' · alterado por ' + tx.updated_by_name : ''}
                  </Text>
                </View>
                <Text style={[styles.amount, tx.type === 'receita' ? styles.positive : styles.negative]}>
                  {tx.type === 'receita' ? '+' : '-'}{money(tx.amount)}
                </Text>
                <View style={styles.rowActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={'Editar ' + tx.description}
                    onPress={() => {
                      setEditing(tx);
                      const [y, m] = tx.entry_date.split('-').map(Number);
                      setMonth(m); setYear(y);
                    }} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>Editar</Text>
                  </Pressable>
                  {deleteTransaction === tx.id ? (
                    <Pressable accessibilityRole="button" disabled={busy}
                      onPress={() => void removeTransaction(tx.id)} style={styles.dangerButton}>
                      <Text style={styles.dangerButtonText}>Confirmar exclusão</Text>
                    </Pressable>
                  ) : (
                    <Pressable accessibilityRole="button"
                      onPress={() => setDeleteTransaction(tx.id)} style={styles.secondaryButton}>
                      <Text style={styles.dangerText}>Excluir</Text>
                    </Pressable>
                  )}
                  {deleteTransaction === tx.id && (
                    <Pressable onPress={() => setDeleteTransaction(null)} style={styles.secondaryButton}>
                      <Text style={styles.secondaryText}>Cancelar</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
            {details.transactions.length >= 300 && !allTransactionsLoaded && (
              <Pressable accessibilityRole="button" disabled={loadingOlder}
                onPress={() => void loadOlder('transactions')} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>{loadingOlder ? 'Carregando...' : 'Carregar lançamentos antigos'}</Text>
              </Pressable>
            )}
          </View>
        </>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle} accessibilityRole="header">Participantes ({details.members.length})</Text>
        {details.members.map(member => (
          <View style={styles.member} key={member.user_id}>
            <View style={styles.memberInfo}>
              <Text style={styles.itemTitle}>{member.display_name}</Text>
              <Text style={styles.subtitle}>{member.role === 'owner' ? 'Proprietário' : 'Participante'}</Text>
            </View>
            {isOwner && member.role === 'member' && (
              removeTarget === member.user_id ? (
                <View style={styles.confirmActions}>
                  <TextInput style={[styles.input, styles.shortInput]} autoCapitalize="characters"
                    value={removeText} onChangeText={setRemoveText} maxLength={7}
                    placeholder="REMOVER" accessibilityLabel="Digite REMOVER para confirmar"
                    placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
                  <Pressable accessibilityRole="button" disabled={busy || removeText !== 'REMOVER'}
                    onPress={() => void run('remove_member', {
                      user_id: member.user_id, confirmation: 'REMOVER',
                    }, 'Participante removido').then(ok => {
                      if (ok) { setRemoveTarget(null); setRemoveText(''); }
                    })}
                    style={[styles.dangerButton, (busy || removeText !== 'REMOVER') && styles.disabled]}>
                    <Text style={styles.dangerButtonText}>Confirmar</Text>
                  </Pressable>
                  <Pressable onPress={() => { setRemoveTarget(null); setRemoveText(''); }}
                    style={styles.secondaryButton}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
                </View>
              ) : (
                <Pressable accessibilityRole="button"
                  onPress={() => setRemoveTarget(member.user_id)} style={styles.secondaryButton}>
                  <Text style={styles.dangerText}>Remover</Text>
                </Pressable>
              )
            )}
          </View>
        ))}

        {isOwner && (
          <>
            <Text style={styles.label}>Convidar pelo e-mail cadastrado</Text>
            <View style={styles.rowActions}>
              <TextInput value={invitationEmail} onChangeText={setInvitationEmail}
                accessibilityLabel="E-mail do participante" keyboardType="email-address"
                autoCapitalize="none" autoComplete="email" maxLength={254}
                style={[styles.input, styles.flexInput]} placeholder="email@exemplo.com"
                placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
              <Pressable accessibilityRole="button" disabled={busy}
                onPress={() => void run('invite', { email: invitationEmail.trim() }, 'Convite enviado')
                  .then(ok => { if (ok) setInvitationEmail(''); })}
                style={[styles.primary, busy && styles.disabled]}>
                <Text style={styles.primaryText}>Convidar</Text>
              </Pressable>
            </View>
            {details.invitations.filter(inv => inv.status === 'pending').length > 0 && (
              <Text style={styles.hint}>
                {details.invitations.filter(inv => inv.status === 'pending').length} convite(s) pendente(s).
              </Text>
            )}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Gerenciar carteira</Text>
        {isOwner ? (
          <>
            <Pressable accessibilityRole="button" onPress={() => {
              setWalletName(wallet.name); setWalletDescription(wallet.description); setEditWallet(value => !value);
            }} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Editar nome e descrição</Text>
            </Pressable>
            {editWallet && (
              <View style={styles.form}>
                <TextInput style={styles.input} value={walletName} onChangeText={setWalletName}
                  maxLength={80} placeholder="Nome da carteira"
                  accessibilityLabel="Novo nome da carteira"
                  placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
                <TextInput style={styles.input} value={walletDescription} onChangeText={setWalletDescription}
                  maxLength={300} placeholder="Descrição" accessibilityLabel="Descrição da carteira"
                  placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
                <Pressable accessibilityRole="button" disabled={busy} style={styles.primary}
                  onPress={() => {
                    setBusy(true); setError('');
                    void updateSharedWallet(walletId, walletName.trim(), walletDescription.trim())
                      .then(() => { setEditWallet(false); void refresh(); })
                      .catch(e => setError(e instanceof Error ? e.message : 'Erro ao salvar.'))
                      .finally(() => setBusy(false));
                  }}>
                  <Text style={styles.primaryText}>Salvar alterações</Text>
                </Pressable>
              </View>
            )}
            {closeConfirm ? (
              <View style={styles.form}>
                <Text style={styles.warning}>O encerramento apaga permanentemente a carteira, lançamentos e chat.</Text>
                <TextInput style={styles.input} value={closeText} onChangeText={setCloseText}
                  maxLength={8} autoCapitalize="characters"
                  accessibilityLabel="Digite ENCERRAR para apagar a carteira"
                  placeholder="Digite ENCERRAR" placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
                <View style={styles.rowActions}>
                  <Pressable accessibilityRole="button" disabled={busy || closeText !== 'ENCERRAR'}
                    style={[styles.dangerButton, (busy || closeText !== 'ENCERRAR') && styles.disabled]}
                    onPress={() => {
                      setBusy(true); setError('');
                      void closeSharedWallet(walletId).then(() => {
                        notifications?.feedback('notice', 'Carteira encerrada');
                        onBack();
                      }).catch(e => setError(e instanceof Error ? e.message : 'Não foi possível encerrar.'))
                        .finally(() => setBusy(false));
                    }}>
                    <Text style={styles.dangerButtonText}>Encerrar definitivamente</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => { setCloseConfirm(false); setCloseText(''); }}
                    style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>Cancelar</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setCloseConfirm(true)}
                style={styles.secondaryButton}>
                <Text style={styles.dangerText}>Encerrar carteira...</Text>
              </Pressable>
            )}
          </>
        ) : (
          <Pressable accessibilityRole="button" disabled={busy}
            onPress={() => void run('leave', {}, 'Você saiu da carteira').then(ok => { if (ok) onBack(); })}
            style={styles.secondaryButton}>
            <Text style={styles.dangerText}>Sair da carteira</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const base = StyleSheet.create({
  container: { gap: 18, width: '100%' },
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, minWidth: 200, gap: 4 },
  title: { fontSize: 25, fontWeight: '900', color: '#111827' },
  subtitle: { color: '#6B7280', fontSize: 13, lineHeight: 19 },
  hint: { color: '#6B7280', fontSize: 11, lineHeight: 17 },
  connection: { fontSize: 12, fontWeight: '700', color: '#5B21B6' },
  error: { color: '#B91C1C', fontSize: 13 },
  warning: { color: '#B91C1C', fontSize: 13, lineHeight: 19 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryItem: { flexGrow: 1, flexBasis: 155, padding: 17, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#ECE8F1', borderRadius: 16, gap: 6 },
  summaryLabel: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  summaryValue: { color: '#111827', fontSize: 22, fontWeight: '900' },
  positive: { color: '#15803D' },
  negative: { color: '#B91C1C' },
  tabRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: { minHeight: 45, borderWidth: 1, borderRadius: 12, borderColor: '#DDD6E6',
    paddingHorizontal: 18, paddingVertical: 12, backgroundColor: '#FFFFFF' },
  activeTab: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  tabText: { fontSize: 13, fontWeight: '800', color: '#4B5563' },
  activeTabText: { color: '#5B21B6' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1,
    borderColor: '#ECE8F1', padding: 18, gap: 12, width: '100%' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  cardHeader: { flexDirection: 'row', gap: 12, flexWrap: 'wrap',
    justifyContent: 'space-between', alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  itemTitle: { fontSize: 14, color: '#111827', fontWeight: '700' },
  chatScroll: { minHeight: 190, maxHeight: 365, borderRadius: 14,
    backgroundColor: '#FCFBFD', borderWidth: 1, borderColor: '#ECE8F1' },
  chatContent: { gap: 9, padding: 12, flexGrow: 1 },
  message: { padding: 11, borderRadius: 13, borderWidth: 1,
    borderColor: '#DDD6E6', backgroundColor: '#FFFFFF', alignSelf: 'flex-start',
    maxWidth: '90%', gap: 3 },
  myMessage: { backgroundColor: '#EDE9FE', borderColor: '#A78BFA', alignSelf: 'flex-end' },
  messageSender: { color: '#5B21B6', fontSize: 11, fontWeight: '800' },
  messageBody: { color: '#111827', fontSize: 14, lineHeight: 21 },
  messageDate: { color: '#6B7280', fontSize: 10, textAlign: 'right' },
  messageComposer: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  input: { borderWidth: 1, borderRadius: 12, borderColor: '#DDD6E6',
    backgroundColor: '#FCFBFD', color: '#111827', minHeight: 46,
    fontSize: 15, paddingHorizontal: 12, paddingVertical: 10 },
  chatInput: { flexGrow: 1, flexBasis: 230, minHeight: 58, maxHeight: 140, textAlignVertical: 'top' },
  form: { gap: 10 }, label: { color: '#374151', fontSize: 13, fontWeight: '700' },
  primary: { minHeight: 45, backgroundColor: '#7C3AED', borderRadius: 10,
    paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 13, color: '#FFFFFF', fontWeight: '800' },
  secondaryButton: { borderWidth: 1, borderColor: '#DDD6E6', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center',
    alignSelf: 'flex-start' },
  secondaryText: { color: '#5B21B6', fontSize: 13, fontWeight: '700' },
  dangerText: { color: '#B91C1C', fontSize: 13, fontWeight: '700' },
  dangerButton: { backgroundColor: '#B91C1C', borderRadius: 10, padding: 11,
    minHeight: 44, justifyContent: 'center' },
  dangerButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  member: { borderBottomWidth: 1, borderBottomColor: '#ECE8F1',
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 10 },
  memberInfo: { flexGrow: 1, flexBasis: 120, gap: 4 },
  confirmActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  shortInput: { width: 100 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  flexInput: { flexGrow: 1, flexBasis: 180 },
  transaction: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ECE8F1' },
  transactionCopy: { flex: 1, flexBasis: 170, gap: 4 },
  amount: { fontSize: 14, fontWeight: '900' },
});
