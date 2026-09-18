# Status do Projeto

O FinanMVP é um projeto de controle financeiro. A ideia principal é permitir que o usuário cadastre receitas e despesas, veja o resumo do mês e acompanhe um limite de gastos.

Hoje o projeto já tem uma tela principal funcionando, com formulário, lista de lançamentos, resumo mensal, filtros e limite mensal. Também existe uma pasta `backend`, onde ficam as rotas da API que fazem a comunicação com o banco.

## O que já está no projeto

- Cadastro de receitas e despesas.
- Listagem por mês e ano.
- Edição e exclusão de lançamentos.
- Resumo com saldo, entradas e saídas.
- Limite mensal.
- Filtro por texto e categoria.
- Backend com rotas em `backend/api`.
- Scripts SQL para o Supabase.

## O que ainda precisa conferir

- Se o backend está publicado e acessível por URL pública.
- Se o frontend está publicado e apontando para a API correta.
- Se as variáveis de ambiente foram configuradas nas plataformas.
- Se o Supabase está com as tabelas criadas.
- Se as operações funcionam depois do deploy.

## Observação

O banco escolhido no projeto é o Supabase, usando PostgreSQL. Como o enunciado permite usar outro banco em nuvem além do MongoDB Atlas, essa escolha faz sentido para a P1.
