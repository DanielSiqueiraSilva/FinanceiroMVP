import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export type Despesa = {
  id: string;
  descricao: string;
  valor: number;
};

type DespesaItemProps = {
  item: Despesa;
  onRemover: (id: string) => void;
};

export default function DespesaItem({
  item,
  onRemover,
}: DespesaItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.informacoes}>
        <Text style={styles.descricao}>{item.descricao}</Text>

        <Text style={styles.valor}>
          R$ {item.valor.toFixed(2).replace(".", ",")}
        </Text>
      </View>
      

      <TouchableOpacity
        style={styles.botaoRemover}
        onPress={() => onRemover(item.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.textoBotao}>Remover</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  informacoes: {
    flex: 1,
    marginRight: 12,
  },

  descricao: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },

  valor: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#dc2626",
  },

  botaoRemover: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  textoBotao: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
});
