import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'screenshots')
await mkdir(out, { recursive: true })
const shot = async (name) => page.screenshot({ path: join(out, `${name}.png`), fullPage: true })
const assert = (condition, message) => { if (!condition) throw new Error(message); console.log(`PASS ${message}`) }
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'
const email = process.env.E2E_TEACHER_EMAIL || 'professora@edunotas.com'
const password = process.env.E2E_TEACHER_PASSWORD || 'Edunotas-Local-2026!'

await page.goto(baseUrl)
await page.getByRole('heading', { name: /Notas da turma/ }).waitFor()
await shot('01-home')
await page.getByRole('link', { name: 'Entrar' }).click()
await page.getByRole('heading', { name: 'Acesso do professor' }).waitFor()
await shot('02-login')

await page.getByLabel('E-mail').fill(email)
await page.getByLabel('Senha').fill('senha-incorreta')
await page.getByRole('button', { name: 'Entrar' }).click()
await page.getByRole('alert').waitFor()
assert(page.url().endsWith('/login'), 'login inválido mostra erro')

await page.getByLabel('Senha').fill(password)
await page.getByRole('button', { name: 'Entrar' }).click()
await page.getByRole('heading', { name: 'Resumo da turma' }).waitFor()
assert(page.url().endsWith('/notas'), 'login abre a área do professor')

await page.getByRole('link', { name: 'Ver lista' }).click()
await page.getByRole('heading', { name: 'Lista de alunos' }).waitFor()
await page.getByText('Ana Clara Souza').waitFor()
await shot('03-listagem')

await page.getByRole('link', { name: 'Cadastrar aluno' }).click()
await page.getByRole('heading', { name: 'Cadastrar aluno' }).waitFor()
await shot('04-cadastro')
const registration = `E2E-${Date.now()}`
await page.getByLabel('Nome completo').fill('Teste de Cadastro')
await page.getByLabel('Matrícula').fill(registration)
await page.getByLabel('Turma').fill('7º Ano C')
await page.getByRole('button', { name: 'Cadastrar' }).click()
const createdStudentRow = page.getByRole('row').filter({ hasText: registration })
await createdStudentRow.getByText('Teste de Cadastro', { exact: true }).waitFor()
assert(await createdStudentRow.count() === 1, 'cadastro é salvo no banco e aparece na lista')

await page.getByRole('link', { name: 'Ver notas de Ana Clara Souza' }).click()
await page.getByRole('heading', { name: 'Ana Clara Souza' }).waitFor()
await shot('05-notas')
await page.getByRole('link', { name: 'Editar notas' }).click()
await page.getByRole('heading', { name: 'Editar notas' }).waitFor()
await shot('06-edicao')
await page.getByLabel('Avaliação 1').fill('6')
await page.getByLabel('Avaliação 2').fill('8')
assert((await page.locator('.average-preview').innerText()).includes('7,0'), 'média atualiza antes de salvar')
await page.getByRole('button', { name: 'Salvar notas' }).click()
await page.getByRole('heading', { name: 'Ana Clara Souza' }).waitFor()
assert((await page.locator('.grade-summary').innerText()).includes('7,0'), 'boletim exibe a nova média')
await page.reload()
await page.getByRole('heading', { name: 'Ana Clara Souza' }).waitFor()
assert((await page.locator('.grade-summary').innerText()).includes('7,0'), 'nota continua no PostgreSQL após recarregar')
await page.goto(`${baseUrl}/alunos`)
await page.getByText(registration).waitFor()
assert(true, 'aluno cadastrado também continua na lista após recarregar')

console.log(`Screenshots: ${out}`)
await browser.close()
