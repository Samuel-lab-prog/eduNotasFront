import { describe, expect, test } from 'bun:test'
import { averageOf, createApiClient, formatScore, type StudentInput } from '../src/core/api'
import { validateStudent } from '../src/core/student-validation'

describe('média local das três notas', () => {
  test('preserva os extremos zero e dez', () => {
    expect(averageOf({ nota1: 0, nota2: 0, nota3: 0 })).toBe(0)
    expect(averageOf({ nota1: 10, nota2: 10, nota3: 10 })).toBe(10)
  })

  test('calcula decimais sem arredondar o valor interno', () => {
    expect(averageOf({ nota1: 7.25, nota2: 8.5, nota3: 9.75 })).toBe(8.5)
    expect(averageOf({ nota1: 7, nota2: 8, nota3: 8 })).toBe(23 / 3)
  })

  test('exibe pontuação com uma casa decimal em pt-BR', () => {
    expect(formatScore(23 / 3)).toBe('7,7')
    expect(formatScore(10)).toBe('10,0')
  })
})

describe('validação do formulário', () => {
  const validValues = { nome: ' Ana Silva ', turma: '', nota1: '0', nota2: '5.25', nota3: '10' }

  test('aceita zero e dez, preserva decimais e turma vazia', () => {
    expect(validateStudent(validValues)).toEqual({
      valid: true,
      value: { nome: 'Ana Silva', turma: '', nota1: 0, nota2: 5.25, nota3: 10 },
    })
  })

  test('não converte nota vazia em zero', () => {
    const result = validateStudent({ ...validValues, nota1: '' })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.message).toContain('três notas')
  })

  test('rejeita notas fora do intervalo e valores não numéricos', () => {
    for (const nota1 of ['-0.01', '10.01', 'abc']) {
      expect(validateStudent({ ...validValues, nota1 }).valid).toBe(false)
    }
  })

  test('rejeita nome vazio', () => {
    expect(validateStudent({ ...validValues, nome: '   ' })).toEqual({
      valid: false,
      message: 'Informe o nome do estudante.',
    })
  })
})

describe('cliente HTTP da API do professor', () => {
  const input: StudentInput = { nome: 'Ana Silva', turma: '', nota1: 0, nota2: 5.25, nota3: 10 }

  test('lista e consulta usam os caminhos oficiais de estudantes', async () => {
    const record = { ...input, _id: 'abc-123' }
    const requestedUrls: string[] = []
    const client = createApiClient('/api/', async (url) => {
      requestedUrls.push(String(url))
      return new Response(JSON.stringify(requestedUrls.length === 1 ? [record] : record), { status: 200 })
    })

    await expect(client.students()).resolves.toEqual([record])
    await expect(client.student('abc-123')).resolves.toEqual(record)
    expect(requestedUrls).toEqual(['/api/estudantes', '/api/estudantes/abc-123'])
  })

  test('junta a base sem barra duplicada e envia JSON no cadastro', async () => {
    let requestedUrl = ''
    let requestedInit: RequestInit | undefined
    const client = createApiClient('https://api.example.test/progweb-api/', async (url, init) => {
      requestedUrl = String(url)
      requestedInit = init
      return new Response(JSON.stringify({ ...input, _id: 'db-1' }), { status: 201 })
    })

    await expect(client.createStudent(input)).resolves.toEqual({ ...input, _id: 'db-1' })
    expect(requestedUrl).toBe('https://api.example.test/progweb-api/estudantes')
    expect(requestedInit?.method).toBe('POST')
    expect(requestedInit?.headers).toBeInstanceOf(Headers)
    expect((requestedInit?.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(requestedInit?.body))).toEqual(input)
  })

  test('trata PATCH e DELETE 204 sem ler corpo de resposta', async () => {
    let call = 0
    const noContent = {
      status: 204,
      ok: true,
      text: () => { throw new Error('corpo 204 não deve ser lido') },
    } as Response
    const client = createApiClient('/api/', async () => {
      call += 1
      return noContent
    })

    await expect(client.updateStudent('id/1', input)).resolves.toBeUndefined()
    await expect(client.deleteStudent('id/1')).resolves.toBeUndefined()
    expect(call).toBe(2)
  })

  test('decodifica erros JSON sem esconder o status', async () => {
    const client = createApiClient('/api', async () => new Response(JSON.stringify({ message: 'Registro inválido.' }), { status: 422 }))
    await expect(client.students()).rejects.toThrow('Registro inválido.')
  })
})
