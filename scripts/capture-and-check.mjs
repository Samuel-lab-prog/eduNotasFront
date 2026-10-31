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
let students = [
  { _id: 'e2e-ana', nome: 'Ana Clara Souza', turma: '9º ano A', nota1: 8, nota2: 7, nota3: 9 },
  { _id: 'e2e-bruno', nome: 'Bruno Lima', turma: '9º ano A', nota1: 6, nota2: 8, nota3: 7 },
]

await page.route('**/api/estudantes**', async (route) => {
  const request = route.request()
  const url = new URL(request.url())
  const id = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) || '')
  if (request.method() === 'GET' && id === 'estudantes') return route.fulfill({ json: students })
  if (request.method() === 'GET') {
    const record = students.find((student) => student._id === id)
    return route.fulfill({ status: record ? 200 : 404, json: record ?? { message: 'Estudante não encontrado.' } })
  }
  if (request.method() === 'POST') {
    const created = { ...request.postDataJSON(), _id: `e2e-${Date.now()}` }
    students.push(created)
    return route.fulfill({ status: 201, json: created })
  }
  if (request.method() === 'PATCH') {
    students = students.map((student) => student._id === id ? { ...student, ...request.postDataJSON() } : student)
    return route.fulfill({ status: 204, body: '' })
  }
  if (request.method() === 'DELETE') {
    students = students.filter((student) => student._id !== id)
    return route.fulfill({ status: 204, body: '' })
  }
  return route.fulfill({ status: 405, json: { message: 'Método não permitido.' } })
})

try {
  await page.goto(baseUrl)
  await page.getByRole('heading', { name: 'Estudantes e notas' }).waitFor()
  await page.getByText('Ana Clara Souza').waitFor()
  await shot('01-resumo')
  assert((await page.locator('.grade-pill').first().innerText()).includes('8'), 'média da lista é calculada pela interface')

  await page.getByRole('link', { name: 'Cadastrar estudante' }).click()
  await page.getByRole('heading', { name: 'Cadastrar estudante' }).waitFor()
  await shot('02-cadastro')
  await page.getByLabel('Nome do estudante').fill('Teste de Cadastro')
  await page.getByLabel('Turma').fill('9º ano B')
  await page.getByLabel('Nota 1').fill('6')
  await page.getByLabel('Nota 2').fill('8')
  await page.getByLabel('Nota 3').fill('7')
  await page.getByRole('button', { name: 'Cadastrar estudante' }).click()
  await page.getByText('Teste de Cadastro').waitFor()
  assert(students.some((student) => student.nome === 'Teste de Cadastro'), 'cadastro envia os campos definidos pela API')

  await page.getByRole('link', { name: 'Ver estudante Ana Clara Souza' }).click()
  await page.getByRole('heading', { name: 'Ana Clara Souza' }).waitFor()
  await shot('03-detalhe')
  await page.getByRole('link', { name: 'Editar estudante Ana Clara Souza' }).click()
  await page.getByRole('heading', { name: 'Editar estudante' }).waitFor()
  await page.getByLabel('Nota 1').fill('6')
  await page.getByLabel('Nota 2').fill('8')
  await page.getByLabel('Nota 3').fill('7')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await page.getByRole('heading', { name: 'Ana Clara Souza' }).waitFor()
  assert(students.find((student) => student._id === 'e2e-ana').nota1 === 6, 'edição usa PATCH e recarrega o estudante')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Excluir' }).click()
  await page.getByRole('heading', { name: 'Lista de estudantes' }).waitFor()
  assert(!students.some((student) => student._id === 'e2e-ana'), 'exclusão usa DELETE após confirmação')
  console.log(`Screenshots: ${out}`)
} finally {
  await browser.close()
}
