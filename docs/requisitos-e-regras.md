# Requisitos e Regras

Este arquivo resume os requisitos que dá para identificar olhando o projeto atual. Não é uma especificação completa, é só uma organização do que o sistema já faz.

## Requisitos funcionais

- Cadastrar um lançamento financeiro.
- Informar se o lançamento é receita ou despesa.
- Listar lançamentos por mês e ano.
- Editar um lançamento já cadastrado.
- Excluir um lançamento.
- Mostrar o resumo mensal.
- Mostrar saldo, total de receitas e total de despesas.
- Definir ou alterar o limite mensal.
- Filtrar lançamentos por descrição e categoria.

## Requisitos não funcionais

- Usar banco de dados em nuvem.
- Não versionar arquivos `.env`.
- Manter a chave secreta do banco somente no backend.
- Ter uma API entre o frontend e o banco.
- Preparar o frontend para rodar na web.

## Regras de negócio vistas no código

- Um lançamento precisa ter descrição, categoria, valor, data e tipo.
- O valor do lançamento precisa ser maior que zero.
- O tipo só pode ser `receita` ou `despesa`.
- A data precisa estar no formato `AAAA-MM-DD`.
- O mês precisa estar entre 1 e 12.
- O resumo considera o mês e o ano escolhidos.
- O saldo é calculado por receitas menos despesas.
- O limite mensal não pode ser negativo.

## Possíveis melhorias

- Adicionar login de usuário.
- Separar dados por usuário.
- Criar testes automatizados.
- Melhorar a documentação com prints depois do deploy.
