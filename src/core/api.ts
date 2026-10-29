export type Teacher = { id: string; name: string; email: string }
export type Student = {
  id: string
  name: string
  registration: string
  classroom: string
  grade1: number
  grade2: number
  average: number
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const TOKEN_KEY = 'edunotas.accessToken'

export const authToken = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  const token = authToken.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `Falha na requisição (${response.status}).`)
  return data
}

export const api = {
  login: (email: string, password: string) => request<{ token: string; teacher: Teacher }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<{ teacher: Teacher }>('/auth/me'),
  students: () => request<{ students: Student[] }>('/students'),
  student: (id: string) => request<{ student: Student }>(`/students/${id}`),
  createStudent: (student: Pick<Student, 'name' | 'registration' | 'classroom'>) => request<{ student: Student }>('/students', { method: 'POST', body: JSON.stringify(student) }),
  updateGrades: (id: string, grade1: number, grade2: number) => request<{ student: Student }>(`/students/${id}/grades`, { method: 'PUT', body: JSON.stringify({ grade1, grade2 }) }),
}
