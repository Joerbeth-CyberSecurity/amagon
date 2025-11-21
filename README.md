# Sistema de Consulta Odontológica - React + TypeScript + Supabase

Sistema de consulta de pacientes odontológicos construído com:

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Supabase** (banco de dados PostgreSQL)
- 100% Frontend (sem backend Node.js)

## 🚀 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Copie .env.example para .env e configure sua ANON KEY do Supabase
cp .env.example .env
```

## ⚙️ Configuração

Edite o arquivo `.env` e adicione suas credenciais do Supabase:

```bash
VITE_SUPABASE_URL=https://fjuujaciffjlzkiitppa.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_key_aqui
```

Para obter a ANON KEY:

1. Acesse https://supabase.com/dashboard/project/fjuujaciffjlzkiitppa/settings/api
2. Copie a chave "anon public"

## 🏃 Executar

```bash
# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📦 Deploy

A aplicação é 100% frontend e pode ser hospedada em qualquer serviço de hospedagem estática:

- **Vercel**: `vercel --prod`
- **Netlify**: arraste a pasta `dist/` para o Netlify
- **GitHub Pages**: configure no repositório
- **Servidor próprio**: sirva a pasta `dist/` com Nginx/Apache

### Importante para Deploy

1. Configure as variáveis de ambiente no serviço de hospedagem
2. Certifique-se de que as políticas RLS do Supabase estão configuradas
3. Execute `npm run build` para gerar a pasta `dist/`

## 🔒 Segurança (Supabase RLS)

Como a aplicação conecta diretamente ao Supabase, é necessário configurar Row Level Security (RLS):

```sql
-- Exemplo: permitir leitura pública nas tabelas (ajuste conforme necessidade)
ALTER TABLE sis_pessoa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON sis_pessoa FOR SELECT USING (true);

-- Repita para todas as tabelas usadas
```

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes reutilizáveis
│   ├── SearchScreen.tsx
│   └── PatientScreen.tsx
├── lib/                 # Configurações (Supabase)
├── services/            # Serviços de acesso a dados
├── types/               # Definições TypeScript
├── utils/               # Funções utilitárias
├── App.tsx              # Componente principal
└── main.tsx             # Entry point
```

## 🎯 Funcionalidades

- Busca de pacientes por nome ou CPF
- Visualização completa de dados do paciente:
  - Cadastro
  - Agendamentos
  - Dados Clínicos
  - Financeiro
  - Anamnese
  - Ortodontia
  - Imagens/Raios-X
  - Corpo Clínico

## 🛠️ Tecnologias

- React 18.2
- TypeScript 5.3
- Vite 5.0
- Supabase JS Client 2.39
- CSS Modules

## 📝 Licença

ISC
