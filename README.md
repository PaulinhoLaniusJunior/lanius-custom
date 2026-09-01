# Lanius Custom — Sistema de Gestão

Sistema interno da **Lanius Custom** (pintura, reforma e lanternagem de caminhões) para
controlar estoque, custo por serviço, fornecedores e cotações de compra.

Funciona no computador da oficina e no celular, com a mesma interface.

## O que o sistema faz

| Área | O que resolve |
| --- | --- |
| **Estoque** | Cadastro de produtos, entradas com quantidade e preço, saldo e **custo médio ponderado** sempre atualizados, alerta de estoque mínimo. |
| **Serviços** | Cada serviço acumula os produtos retirados do estoque, os gastos avulsos e a mão de obra, e mostra a margem contra o valor orçado. |
| **Mão de obra** | Funcionários mensalistas: o custo do dia sai do salário dividido pelos dias úteis do mês. Também aceita diária e comissão. |
| **Fornecedores** | Cadastro simples (nome, telefone, cidade) e a tabela de preços atuais de cada produto. |
| **Cotações** | Relatório para enviar ao fornecedor (sem preços) e comparativo dos **melhores preços** já cadastrados, imprimível agrupado por fornecedor. |

## Tecnologias

- [Next.js 16](https://nextjs.org) (App Router) e TypeScript
- [Tailwind CSS 4](https://tailwindcss.com)
- [Prisma 7](https://www.prisma.io) com PostgreSQL
- Autenticação própria com sessão em cookie assinado (`jose` + `bcryptjs`)
- [Vitest](https://vitest.dev) nas regras de negócio

## Como rodar

Requisitos: **Node.js 20.9+**.

```bash
# 1. Dependências
npm install

# 2. Banco de dados local (sobe um PostgreSQL de desenvolvimento)
npm run db:dev

# 3. Configuração
cp .env.example .env
# preencha DATABASE_URL com a conexão exibida pelo passo 2
# e gere a SESSION_SECRET com: openssl rand -base64 32

# 4. Estrutura do banco
npm run db:migrate

# 5. Primeiro usuário
npm run usuario:criar

# 6. Subir o sistema
npm run dev
```

O sistema fica em <http://localhost:3000>.

Para acessar do celular na mesma rede, use o IP do computador (`http://192.168.x.x:3000`).

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o sistema em modo de desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm run lint` | Verifica o padrão do código |
| `npm run typecheck` | Verifica os tipos |
| `npm run test` | Roda os testes das regras de negócio |
| `npm run db:migrate` | Cria/aplica migrations no banco |
| `npm run db:studio` | Abre o navegador de dados do Prisma |
| `npm run db:seed` | Popula o banco com dados de demonstração |
| `npm run usuario:criar` | Cria (ou troca a senha de) um usuário |

## Estrutura

```
prisma/schema.prisma      Modelo de dados
src/app/                  Telas (App Router)
src/components/           Componentes de interface
src/lib/domain/           Regras de negócio puras, com testes
src/lib/actions/          Server Actions (gravação)
src/lib/queries/          Consultas compartilhadas
```

As contas do sistema — custo médio, custo de mão de obra, fechamento do serviço e escolha do
menor preço — ficam isoladas em `src/lib/domain/`, sem acesso ao banco, e são cobertas por
testes. As telas e as Server Actions apenas leem e gravam.

## Decisões que valem saber

- **Custo médio ponderado.** Cada entrada recalcula a média; cada baixa congela o custo do
  momento no movimento. Assim, uma compra mais cara no futuro não reescreve o custo de um
  serviço já fechado.
- **O consumo do serviço é um movimento de estoque.** Não existe tabela separada de "produtos
  do serviço" — estoque e custo do serviço nunca podem divergir.
- **Salário do funcionário é copiado para o serviço.** Aumentar o salário no cadastro não
  altera o custo de serviços antigos.
- **Dias úteis não descontam feriados.** A oficina trabalha em muitos deles e não há
  calendário municipal cadastrado. Se isso passar a importar, o ajuste é em
  `src/lib/domain/mao-de-obra.ts`.

## Licença

Uso interno da Lanius Custom.
