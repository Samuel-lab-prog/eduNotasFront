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

O proxy mantém as chamadas no mesmo host do frontend e evita depender de CORS no navegador. `VITE_API_BASE_URL` é o prefixo usado pela aplicação e deve continuar como `/api` quando servido pelo proxy; a base externa pode ser configurada em `API_PROXY_TARGET` durante o desenvolvimento local.

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

Rotas da interface: `/` (resumo), `/estudantes` (lista), `/estudantes/novo` (cadastro), `/estudantes/:id` (boletim) e `/estudantes/:id/editar` (edição). A versão atual deixa de usar o login, matrícula, duas notas e o backend próprio da versão anterior, que fica separado e não é consultado pelo frontend.

## Verificação do serviço

Em 10/11/2026, `GET /estudantes` respondeu `200` com um array JSON; os campos usados pela interface estavam presentes e tipados como esperado. A API não expõe OpenAPI/Swagger nos caminhos comuns verificados. O preflight CORS observado permite `http://localhost:3000`, por isso o navegador chama o proxy local, Vercel ou Nginx em `/api`. A consulta de um ID inexistente respondeu `500`; essa resposta do servidor não foi alterada pelo frontend. POST, PATCH e DELETE não foram executados contra a base remota.

## Docker e Render

O Dockerfile constrói os assets e serve a SPA pelo Nginx na porta `10000`. O Nginx encaminha `/api/*` ao endereço configurado em `API_PROXY_BASE`, cujo padrão aponta para a API da disciplina. No Render, `render.yaml` já declara essa variável; para trocar a API, atualize o valor para a base completa terminada em `/`.

O health check é `GET /healthz`. O fallback da SPA permite abrir diretamente as rotas `/estudantes` e `/estudantes/:id`.

## Vercel

O arquivo `vercel.json` encaminha `/api/*` para a API da disciplina e mantém o fallback das rotas da aplicação. Não é necessária variável de ambiente no Vercel para usar a API fornecida.

## CI

O workflow do GitHub Actions instala as dependências travadas, verifica tipos, roda os testes Bun e o fluxo Playwright com respostas simuladas, executa o build e constrói a imagem Docker. Os testes de navegador usam somente dados em memória e não alteram registros da API do professor. O projeto não tinha uma configuração de lint; typecheck e build são executados separadamente.
