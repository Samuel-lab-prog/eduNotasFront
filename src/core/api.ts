export type Student = {
  _id: string
  nome: string
  turma?: string
  nota1: number
  nota2: number
  nota3: number
}

export type StudentInput = Omit<Student, '_id'>

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new Error('Não foi possível conectar à API. Confira sua conexão e tente novamente.')
  }

  if (response.status === 204) return undefined as T

  const raw = await response.text()
  let payload: unknown
  try {
    payload = raw ? JSON.parse(raw) : undefined
  } catch {
    payload = raw
  }

  if (!response.ok) {
    if (typeof payload === 'string' && payload.trim()) throw new Error(payload)
    if (payload && typeof payload === 'object') {
      const body = payload as { error?: unknown; message?: unknown }
      if (typeof body.error === 'string') throw new Error(body.error)
      if (typeof body.message === 'string') throw new Error(body.message)
    }
    throw new Error(`A API respondeu com erro (${response.status}).`)
  }

  return payload as T
}

export const api = {
  students: () => request<Student[]>('/estudantes'),
  student: (id: string) => request<Student>(`/estudantes/${encodeURIComponent(id)}`),
  createStudent: (student: StudentInput) => request<Student>('/estudantes', {
    method: 'POST',
    body: JSON.stringify(student),
  }),
  updateStudent: (id: string, student: StudentInput) => request<void>(`/estudantes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(student),
  }),
  deleteStudent: (id: string) => request<void>(`/estudantes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
}

export function averageOf(student: Pick<Student, 'nota1' | 'nota2' | 'nota3'>): number {
  return (Number(student.nota1) + Number(student.nota2) + Number(student.nota3)) / 3
}

export function formatScore(value: number): string {
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}
