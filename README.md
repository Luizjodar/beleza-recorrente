# Beleza Recorrente

Sistema SaaS para gestão de salões de beleza, com agenda, clientes, assinantes, pacotes, pagamentos, funcionários, produtos, promoções e dashboard.

## Tecnologias usadas

* Next.js
* React
* TypeScript
* Supabase
* Stripe
* Resend
* Tailwind CSS
* Vercel

## Como rodar o projeto

### 1. Clonar o repositório

```bash
git clone https://github.com/Luizjodar/beleza-recorrente.git
cd beleza-recorrente
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Criar o arquivo `.env.local`

Na raiz do projeto, crie um arquivo chamado:

```bash
.env.local
```

Use o arquivo `env.example` como modelo.

Exemplo:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_SITE_URL=http://localhost:3000

CRON_SECRET=
RESEND_API_KEY=
```

Atenção: nunca coloque chaves reais no GitHub.

### 4. Rodar o projeto

```bash
npm run dev
```

Depois acesse:

```bash
http://localhost:3000
```

## Observações

Para o sistema funcionar corretamente, é necessário configurar as variáveis de ambiente do Supabase, Stripe e Resend.

O arquivo `.env.local` deve ficar apenas no computador de quem está rodando o projeto e não deve ser enviado para o GitHub.

## Deploy

O projeto pode ser publicado na Vercel.

As variáveis de ambiente também precisam ser cadastradas em:

Vercel → Project → Settings → Environment Variables

