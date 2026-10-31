# EduNotas — interface web

Aplicação React, TypeScript e Vite para cadastrar, consultar, editar e excluir estudantes pela API fornecida na disciplina. O sistema exibe as notas 1, 2 e 3 e calcula a média no navegador.

## Desenvolvimento local

Requer Bun e Node.js compatível com o Vite.

```sh
bun install
```

Copie `.env.example` para `.env.local` se quiser configurar o destino da API. O Vite encaminha `/api/*` ao serviço indicado por `API_PROXY_TARGET`; por padrão, usa `https://ads.osorio.ifrs.edu.br/progweb-api`.

```sh
bun run dev
```

O proxy mantém as chamadas no mesmo host do frontend e evita depender de CORS no navegador. `VITE_API_URL` é o prefixo usado pela aplicação e deve continuar como `/api` quando servido pelo proxy.

## API consumida

Base: `https://ads.osorio.ifrs.edu.br/progweb-api`

| Método | Caminho | Ação |
| --- | --- | --- |
| GET | `/estudantes` | Lista estudantes |
| GET | `/estudantes/:id` | Consulta estudante |
| POST | `/estudantes` | Cria estudante |
| PATCH | `/estudantes/:id` | Atualiza estudante (204) |
| DELETE | `/estudantes/:id` | Exclui estudante (204) |

O payload usa `_id`, `nome`, `turma` (opcional) e `nota1`, `nota2`, `nota3`. As notas são números de 0 a 10; `_id` é gerado pelo banco. A média é calculada pela interface e não é enviada à API. Não há fluxo de autenticação nesta API.

## Docker e Render

O Dockerfile constrói os assets e serve a SPA pelo Nginx na porta `10000`. O Nginx encaminha `/api/*` ao endereço configurado em `API_PROXY_BASE`, cujo padrão aponta para a API da disciplina. No Render, `render.yaml` já declara essa variável; para trocar a API, atualize o valor para a base completa terminada em `/`.

O health check é `GET /healthz`. O fallback da SPA permite abrir diretamente as rotas `/estudantes` e `/estudantes/:id`.

## Vercel

O arquivo `vercel.json` encaminha `/api/*` para a API da disciplina e mantém o fallback das rotas da aplicação. Não é necessária variável de ambiente no Vercel para usar a API fornecida.

## CI

O workflow do GitHub Actions instala as dependências travadas, executa o build e constrói a imagem Docker. A verificação da imagem consulta `/healthz` e a rota da aplicação. O script `bun run test:e2e` intercepta `/api` com dados em memória para exercitar cadastro, consulta, edição e exclusão sem alterar dados da API do professor; exige a aplicação Vite em execução.
