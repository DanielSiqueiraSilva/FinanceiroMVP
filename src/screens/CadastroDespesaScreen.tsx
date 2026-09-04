import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

import DespesaItem, {
  Despesa,
} from "../components/DespesaItem";

type Cotacao = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

const MOEDAS = [
  { codigo: "USD", nome: "Dólar americano" },
  { codigo: "EUR", nome: "Euro" },
  { codigo: "GBP", nome: "Libra esterlina" },
  { codigo: "BRL", nome: "Real brasileiro" },
];

export default function CadastroDespesaScreen() {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  const [despesas, setDespesas] = useState<Despesa[]>([]);

  const [moedaOrigem, setMoedaOrigem] =
    useState("USD");

  const [moedaDestino, setMoedaDestino] =
    useState("BRL");

  const [cotacao, setCotacao] =
    useState<Cotacao | null>(null);

  const [carregandoCotacao, setCarregandoCotacao] =
    useState(false);

  const [erroCotacao, setErroCotacao] =
    useState("");

  function adicionarDespesa() {
    const descricaoTratada = descricao.trim();
    const valorTratado = valor
      .trim()
      .replace(",", ".");

    if (descricaoTratada === "") {
      Alert.alert(
        "Atenção",
        "Digite a descrição da despesa."
      );
      return;
    }

    if (valorTratado === "") {
      Alert.alert(
        "Atenção",
        "Digite o valor da despesa."
      );
      return;
    }

    const valorNumerico = Number(valorTratado);

    if (
      Number.isNaN(valorNumerico) ||
      valorNumerico <= 0
    ) {
      Alert.alert(
        "Atenção",
        "Digite um valor válido maior que zero."
      );
      return;
    }

    const novaDespesa: Despesa = {
      id: Date.now().toString(),
      descricao: descricaoTratada,
      valor: valorNumerico,
    };

    setDespesas((listaAtual) => [
      ...listaAtual,
      novaDespesa,
    ]);

    setDescricao("");
    setValor("");
  }

  function removerDespesa(id: string) {
    setDespesas((listaAtual) =>
      listaAtual.filter(
        (despesa) => despesa.id !== id
      )
    );
  }

  async function buscarCotacao() {
    if (moedaOrigem === moedaDestino) {
      Alert.alert(
        "Atenção",
        "Escolha duas moedas diferentes."
      );
      return;
    }

    try {
      setCarregandoCotacao(true);
      setErroCotacao("");
      setCotacao(null);

      const resposta = await fetch(
        `https://api.frankfurter.dev/v2/rate/${moedaOrigem}/${moedaDestino}`
      );

      if (!resposta.ok) {
        throw new Error(
          `Erro HTTP ${resposta.status}`
        );
      }

      const dados: Cotacao =
        await resposta.json();

      setCotacao(dados);
    } catch (erro) {
      if (erro instanceof Error) {
        setErroCotacao(erro.message);
      } else {
        setErroCotacao(
          "Não foi possível consultar a cotação."
        );
      }
    } finally {
      setCarregandoCotacao(false);
    }
  }

  function trocarMoedas() {
    const atual = moedaOrigem;

    setMoedaOrigem(moedaDestino);
    setMoedaDestino(atual);

    setCotacao(null);
    setErroCotacao("");
  }

  const total = despesas.reduce(
    (soma, despesa) =>
      soma + despesa.valor,
    0
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={despesas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DespesaItem
            item={item}
            onRemover={removerDespesa}
          />
        )}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.conteudo}
        ListHeaderComponent={
          <View>
            <Text style={styles.titulo}>
              Minhas Despesas
            </Text>

            <Text style={styles.subtitulo}>
              Controle suas despesas e acompanhe
              informações financeiras.
            </Text>

            {/* CADASTRO */}

            <View style={styles.card}>
              <Text style={styles.tituloCard}>
                Nova despesa
              </Text>

              <Text style={styles.label}>
                Descrição
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Ex: Mercado"
                placeholderTextColor="#9ca3af"
                value={descricao}
                onChangeText={setDescricao}
              />

              <Text style={styles.label}>
                Valor
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Ex: 150,50"
                placeholderTextColor="#9ca3af"
                value={valor}
                onChangeText={setValor}
                keyboardType="decimal-pad"
                onSubmitEditing={
                  adicionarDespesa
                }
              />

              <TouchableOpacity
                style={styles.botao}
                onPress={adicionarDespesa}
              >
                <Text style={styles.textoBotao}>
                  Adicionar despesa
                </Text>
              </TouchableOpacity>
            </View>

            {/* RESUMO */}

            <View style={styles.resumo}>
              <View>
                <Text style={styles.resumoLabel}>
                  Total
                </Text>

                <Text style={styles.total}>
                  R${" "}
                  {total
                    .toFixed(2)
                    .replace(".", ",")}
                </Text>
              </View>

              <View
                style={styles.contadorContainer}
              >
                <Text style={styles.resumoLabel}>
                  Despesas
                </Text>

                <Text style={styles.contador}>
                  {despesas.length}
                </Text>
              </View>
            </View>

            {/* CONVERSOR */}

            <View style={styles.apiCard}>
              <Text style={styles.apiTitulo}>
                Conversor de moedas
              </Text>

              <Text style={styles.apiSubtitulo}>
                Consulte a cotação entre duas moedas.
              </Text>

              <View style={styles.moedasLinha}>
                {/* MOEDA ORIGEM */}

                <View style={styles.moedaContainer}>
                  <Text style={styles.label}>
                    De
                  </Text>

                  <View style={styles.seletor}>
                    {MOEDAS.map((moeda) => (
                      <TouchableOpacity
                        key={moeda.codigo}
                        style={[
                          styles.moedaBotao,
                          moedaOrigem ===
                            moeda.codigo &&
                            styles.moedaSelecionada,
                        ]}
                        onPress={() =>
                          setMoedaOrigem(
                            moeda.codigo
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.moedaTexto,
                            moedaOrigem ===
                              moeda.codigo &&
                              styles.moedaTextoSelecionada,
                          ]}
                        >
                          {moeda.codigo}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* BOTÃO TROCAR */}

                <TouchableOpacity
                  style={styles.trocarBotao}
                  onPress={trocarMoedas}
                >
                  <Text style={styles.trocarTexto}>
                    ⇄
                  </Text>
                </TouchableOpacity>

                {/* MOEDA DESTINO */}

                <View style={styles.moedaContainer}>
                  <Text style={styles.label}>
                    Para
                  </Text>

                  <View style={styles.seletor}>
                    {MOEDAS.map((moeda) => (
                      <TouchableOpacity
                        key={moeda.codigo}
                        style={[
                          styles.moedaBotao,
                          moedaDestino ===
                            moeda.codigo &&
                            styles.moedaSelecionada,
                        ]}
                        onPress={() =>
                          setMoedaDestino(
                            moeda.codigo
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.moedaTexto,
                            moedaDestino ===
                              moeda.codigo &&
                              styles.moedaTextoSelecionada,
                          ]}
                        >
                          {moeda.codigo}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.botaoCotacao}
                onPress={buscarCotacao}
                disabled={carregandoCotacao}
              >
                <Text
                  style={
                    styles.textoBotaoCotacao
                  }
                >
                  {carregandoCotacao
                    ? "Consultando..."
                    : "Consultar cotação"}
                </Text>
              </TouchableOpacity>

              {carregandoCotacao && (
                <ActivityIndicator
                  size="small"
                  color="#2563eb"
                  style={styles.loading}
                />
              )}

              {erroCotacao !== "" && (
                <View style={styles.erroBox}>
                  <Text style={styles.erroTexto}>
                    Não foi possível consultar a
                    cotação.
                  </Text>

                  <TouchableOpacity
                    onPress={buscarCotacao}
                  >
                    <Text
                      style={
                        styles.tentarNovamente
                      }
                    >
                      Tentar novamente
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {cotacao && (
                <View
                  style={styles.cotacaoResultado}
                >
                  <Text
                    style={styles.cotacaoLabel}
                  >
                    1 {cotacao.base} equivale a
                  </Text>

                  <Text
                    style={styles.cotacaoValor}
                  >
                    {cotacao.rate
                      .toFixed(4)
                      .replace(".", ",")}{" "}
                    {cotacao.quote}
                  </Text>

                  <Text
                    style={styles.cotacaoData}
                  >
                    Data da cotação:{" "}
                    {cotacao.date}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.tituloLista}>
              Despesas cadastradas
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.listaVazia}>
            Nenhuma despesa cadastrada.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 50,
  },

  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },

  subtitulo: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 5,
    marginBottom: 22,
    lineHeight: 22,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  tituloCard: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    marginBottom: 14,
  },

  botao: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  textoBotao: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },

  resumo: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  resumoLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },

  total: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#dc2626",
  },

  contadorContainer: {
    alignItems: "flex-end",
  },

  contador: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#111827",
  },

  apiCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  apiTitulo: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#1e3a8a",
  },

  apiSubtitulo: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 18,
  },

  moedasLinha: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },

  moedaContainer: {
    flex: 1,
  },

  seletor: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },

  moedaBotao: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },

  moedaSelecionada: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },

  moedaTexto: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "600",
  },

  moedaTextoSelecionada: {
    color: "#ffffff",
  },

  trocarBotao: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  trocarTexto: {
    color: "#2563eb",
    fontSize: 22,
    fontWeight: "bold",
  },

  botaoCotacao: {
    backgroundColor: "#2563eb",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 18,
  },

  textoBotaoCotacao: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },

  loading: {
    marginTop: 14,
  },

  cotacaoResultado: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    marginTop: 14,
  },

  cotacaoLabel: {
    color: "#64748b",
    fontSize: 14,
  },

  cotacaoValor: {
    color: "#16a34a",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 5,
  },

  cotacaoData: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 7,
  },

  erroBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },

  erroTexto: {
    color: "#991b1b",
    fontSize: 13,
    marginBottom: 6,
  },

  tentarNovamente: {
    color: "#dc2626",
    fontWeight: "bold",
    fontSize: 13,
  },

  tituloLista: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },

  listaVazia: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 15,
    paddingVertical: 20,
  },
});
