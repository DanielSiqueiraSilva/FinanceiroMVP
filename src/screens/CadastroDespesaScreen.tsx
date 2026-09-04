import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
} from "react-native";

import DespesaItem, {
  Despesa,
} from "../components/DespesaItem";

export default function CadastroDespesaScreen() {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [despesas, setDespesas] = useState<Despesa[]>([]);

  function adicionarDespesa() {
    const descricaoTratada = descricao.trim();
    const valorTratado = valor.trim().replace(",", ".");

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

  const total = despesas.reduce(
    (soma, despesa) => soma + despesa.valor,
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
        persistentScrollbar={true}
        contentContainerStyle={styles.conteudo}
        ListHeaderComponent={
          <View>
            <Text style={styles.titulo}>
              Minhas Despesas
            </Text>

            <Text style={styles.subtitulo}>
              Cadastre e acompanhe suas despesas.
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
              returnKeyType="next"
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
              returnKeyType="done"
              onSubmitEditing={adicionarDespesa}
            />

            <TouchableOpacity
              style={styles.botao}
              onPress={adicionarDespesa}
              activeOpacity={0.8}
            >
              <Text style={styles.textoBotao}>
                Adicionar despesa
              </Text>
            </TouchableOpacity>

            <View style={styles.resumo}>
              <View>
                <Text style={styles.resumoLabel}>
                  Total
                </Text>

                <Text style={styles.total}>
                  R$ {total.toFixed(2).replace(".", ",")}
                </Text>
              </View>

              <View style={styles.contadorContainer}>
                <Text style={styles.resumoLabel}>
                  Despesas
                </Text>

                <Text style={styles.contador}>
                  {despesas.length}
                </Text>
              </View>
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
    paddingBottom: 40,
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
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#ffffff",
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
    marginBottom: 20,
  },

  textoBotao: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },

  resumo: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 18,
    marginBottom: 22,
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
    fontSize: 22,
    fontWeight: "bold",
    color: "#dc2626",
  },

  contadorContainer: {
    alignItems: "flex-end",
  },

  contador: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
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
