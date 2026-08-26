import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
} from 'react-native';

export default function App() {
  // Estados dos campos
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');

  // Estado do total de despesas
  const [total, setTotal] = useState(0);

  // Estado do contador
  const [contador, setContador] = useState(0);

  // Estado para mostrar a última despesa cadastrada
  const [resultado, setResultado] = useState('');

  // Função para adicionar uma despesa
  function adicionarDespesa() {
    // Validação dos campos
    if (descricao.trim() === '' || valor.trim() === '') {
      alert('Preencha todos os campos!');
      return;
    }

    // Converte o valor digitado para número
    const valorNumerico = Number(valor.replace(',', '.'));

    // Verifica se o valor é válido
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      alert('Digite um valor válido!');
      return;
    }

    // Adiciona o valor ao total
    setTotal(total + valorNumerico);

    // Aumenta o contador
    setContador(contador + 1);

    // Exibe a despesa cadastrada
    setResultado(
      `Despesa: ${descricao}\nValor: R$ ${valorNumerico
        .toFixed(2)
        .replace('.', ',')}`
    );

    // Limpa os campos
    setDescricao('');
    setValor('');
  }

  // Função para limpar os dados
  function limpar() {
    setDescricao('');
    setValor('');
    setTotal(0);
    setContador(0);
    setResultado('');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titulo}>FinanMVP</Text>

        <Text style={styles.descricao}>
          Controle suas despesas de forma simples
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Descrição da despesa"
          value={descricao}
          onChangeText={setDescricao}
        />

        <TextInput
          style={styles.input}
          placeholder="Valor da despesa"
          value={valor}
          onChangeText={setValor}
          keyboardType="numeric"
        />

        <View style={styles.botao}>
          <Button
            title="Adicionar despesa"
            color="#168a45"
            onPress={adicionarDespesa}
          />
        </View>

        <View style={styles.resumo}>
          <Text style={styles.resumoTitulo}>
            Resumo financeiro
          </Text>

          <Text style={styles.total}>
            Total de despesas: R$ {total.toFixed(2).replace('.', ',')}
          </Text>

          <Text style={styles.contador}>
            Despesas cadastradas: {contador}
          </Text>
        </View>

        {resultado !== '' && (
          <View style={styles.resultado}>
            <Text style={styles.resultadoTitulo}>
              Última despesa cadastrada
            </Text>

            <Text style={styles.resultadoTexto}>
              {resultado}
            </Text>
          </View>
        )}

        <View style={styles.botao}>
          <Button
            title="Limpar"
            color="#666666"
            onPress={limpar}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#eaf7ee',
    padding: 20,
  },

  card: {
    backgroundColor: '#ffffff',
    padding: 25,
    borderRadius: 12,
  },

  titulo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#168a45',
    textAlign: 'center',
    marginBottom: 10,
  },

  descricao: {
    fontSize: 17,
    color: '#444444',
    textAlign: 'center',
    marginBottom: 25,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#168a45',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#ffffff',
  },

  botao: {
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },

  resumo: {
    backgroundColor: '#d9f2e2',
    borderWidth: 1,
    borderColor: '#168a45',
    borderRadius: 10,
    padding: 20,
    marginTop: 10,
    marginBottom: 15,
  },

  resumoTitulo: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#126b37',
    textAlign: 'center',
    marginBottom: 15,
  },

  total: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#126b37',
    textAlign: 'center',
    marginBottom: 10,
  },

  contador: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },

  resultado: {
    backgroundColor: '#eef5ff',
    borderWidth: 1,
    borderColor: '#3b73b9',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },

  resultadoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#24558c',
    textAlign: 'center',
    marginBottom: 10,
  },

  resultadoTexto: {
    fontSize: 17,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 28,
  },
});
