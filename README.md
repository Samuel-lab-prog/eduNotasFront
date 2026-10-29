# EduNotas Frontend

Interface do professor em React, TypeScript, Vite e Chakra UI. As telas consultam a API do diretório `backend`; as notas e os alunos não são mantidos no navegador.

```sh
bun install
Copy-Item .env.example .env.local
bun run dev
```

Por padrão, a interface usa `http://localhost:3000/api`. Para outra instância, defina `VITE_API_URL` antes de compilar. O build é `bun run build`.

As seis telas e jornadas são registradas em `../docs/03-design-telas/`. Para rodar Playwright, inicie a API e o Vite, semeie cinco alunos e rode `bun run test:e2e`.
