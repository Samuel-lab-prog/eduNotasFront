import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Button, Input } from '@chakra-ui/react'
import { ArrowLeft, BookOpen, Eye, GraduationCap, Home, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { api, averageOf, formatScore, type Student, type StudentInput } from '../core/api'

type Feedback = { kind: 'success' | 'error'; message: string }

export default function App() {
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [studentsError, setStudentsError] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const navigate = useNavigate()

  async function loadStudents() {
    setLoadingStudents(true)
    setStudentsError('')
    try {
      const records = await api.students()
      setStudents(records)
    } catch (error) {
      setStudentsError(error instanceof Error ? error.message : 'Não foi possível carregar os estudantes.')
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => { void loadStudents() }, [])

  async function createStudent(input: StudentInput) {
    const created = await api.createStudent(input)
    setStudents((current) => [...current, created])
    setFeedback({ kind: 'success', message: 'Estudante cadastrado.' })
    navigate('/estudantes')
  }

  async function updateStudent(id: string, input: StudentInput) {
    await api.updateStudent(id, input)
    const updated = await api.student(id)
    setStudents((current) => current.map((student) => student._id === id ? updated : student))
    setFeedback({ kind: 'success', message: 'Estudante atualizado.' })
    navigate(`/estudantes/${encodeURIComponent(id)}`)
  }

  async function deleteStudent(student: Student): Promise<boolean> {
    const confirmed = window.confirm(`Deseja excluir o estudante ${student.nome}?`)
    if (!confirmed) return false

    try {
      await api.deleteStudent(student._id)
      setStudents((current) => current.filter((item) => item._id !== student._id))
      setFeedback({ kind: 'success', message: 'Estudante excluído.' })
      return true
    } catch (error) {
      setFeedback({ kind: 'error', message: error instanceof Error ? error.message : 'Não foi possível excluir o estudante.' })
      return false
    }
  }

  const shell = (page: ReactNode) => (
    <Shell feedback={feedback} clearFeedback={() => setFeedback(null)}>{page}</Shell>
  )

  return <Routes>
    <Route path="/" element={shell(
      <Dashboard students={students} loading={loadingStudents} error={studentsError} onRetry={loadStudents}/>,
    )}/>
    <Route path="/estudantes" element={shell(
      <StudentsPage students={students} loading={loadingStudents} error={studentsError} onRetry={loadStudents} onDelete={deleteStudent}/>,
    )}/>
    <Route path="/estudantes/novo" element={shell(<StudentForm mode="create" onSave={createStudent}/>)} />
    <Route path="/estudantes/:id" element={shell(<StudentDetails onDelete={deleteStudent}/>)} />
    <Route path="/estudantes/:id/editar" element={shell(<StudentEditPage onSave={updateStudent}/>)} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

function Shell({ children, feedback, clearFeedback }: { children: ReactNode; feedback: Feedback | null; clearFeedback: () => void }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" to="/">
        <span className="brand-icon"><GraduationCap size={20}/></span>
        <span>EduNotas<small>GESTÃO DE ESTUDANTES</small></span>
      </Link>
      <div className="nav-label">MENU</div>
      <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/" end><Home size={17}/>Resumo</NavLink>
      <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/estudantes"><Users size={17}/>Estudantes</NavLink>
    </aside>
    <main className="main-area">
      <header className="topbar"><span>Cadastro e acompanhamento de notas</span><span className="top-user">API acadêmica</span></header>
      <div className="content">
        {feedback && <div className={`toast ${feedback.kind === 'error' ? 'toast-error' : ''}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
          {feedback.message}<button aria-label="Fechar aviso" onClick={clearFeedback}>×</button>
        </div>}
        {children}
      </div>
    </main>
  </div>
}

function Dashboard({ students, loading, error, onRetry }: { students: Student[]; loading: boolean; error: string; onRetry: () => void }) {
  const classrooms = new Set(students.map((student) => student.turma?.trim()).filter(Boolean))
  const average = students.length ? students.reduce((sum, student) => sum + averageOf(student), 0) / students.length : 0
  return <>
    <PageTitle eyebrow="RESUMO" title="Estudantes e notas" subtitle="Visão geral dos registros cadastrados." action={<Link className="button button-primary" to="/estudantes/novo"><Plus size={16}/>Novo estudante</Link>}/>
    <div className="stats-grid">
      <Stat icon={<Users/>} label="Estudantes" value={loading ? '—' : students.length}/>
      <Stat icon={<BookOpen/>} label="Turmas" value={loading ? '—' : classrooms.size}/>
      <Stat icon={<GraduationCap/>} label="Média geral" value={loading || !students.length ? '—' : formatScore(average)}/>
    </div>
    <div className="section-heading"><div><h2>Registros recentes</h2><p>Notas e médias calculadas a partir das três avaliações.</p></div><Link className="text-link" to="/estudantes">Ver todos <span>→</span></Link></div>
    {loading ? <LoadingState message="Carregando estudantes…"/> : error ? <ErrorState message={error} onRetry={onRetry}/> : <StudentTable students={[...students].sort((a, b) => a.nome.localeCompare(b.nome)).slice(0, 5)}/>}
  </>
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return <div className="stat-card"><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span><strong>{value}</strong></div>
}

function StudentsPage({ students, loading, error, onRetry, onDelete }: { students: Student[]; loading: boolean; error: string; onRetry: () => void; onDelete: (student: Student) => Promise<boolean> }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filtered = students.filter((student) => `${student.nome} ${student.turma ?? ''} ${student._id}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))

  return <>
    <PageTitle eyebrow="ESTUDANTES" title="Lista de estudantes" subtitle="Pesquise estudantes e abra as ações de cada registro." action={<Link className="button button-primary" to="/estudantes/novo"><Plus size={16}/>Cadastrar estudante</Link>}/>
    <div className="list-tools"><span>{filtered.length} {filtered.length === 1 ? 'estudante' : 'estudantes'}</span><Input unstyled aria-label="Buscar estudante" placeholder="Buscar por nome, turma ou ID" value={query} onChange={(event) => setQuery(event.target.value)}/></div>
    {loading ? <LoadingState message="Carregando estudantes…"/> : error ? <ErrorState message={error} onRetry={onRetry}/> : <StudentTable students={[...filtered].sort((a, b) => a.nome.localeCompare(b.nome))} onDelete={onDelete}/>}
  </>
}

function StudentTable({ students, onDelete }: { students: Student[]; onDelete?: (student: Student) => Promise<boolean> }) {
  if (!students.length) return <div className="table-wrap"><div className="empty-state">Nenhum estudante encontrado. <Link to="/estudantes/novo">Cadastrar estudante</Link></div></div>
  return <div className="table-wrap"><table className="students-table"><thead><tr><th>Nome</th><th>Turma</th><th>Nota 1</th><th>Nota 2</th><th>Nota 3</th><th>Média</th><th>Ações</th></tr></thead><tbody>
    {students.map((student) => <tr key={student._id}>
      <td><span className="student-avatar">{initials(student.nome)}</span><b>{student.nome}</b></td>
      <td>{student.turma?.trim() || '—'}</td>
      <td>{formatScore(student.nota1)}</td><td>{formatScore(student.nota2)}</td><td>{formatScore(student.nota3)}</td>
      <td><span className={`grade-pill ${averageOf(student) >= 7 ? 'good' : ''}`}>{formatScore(averageOf(student))}</span></td>
      <td><div className="row-actions">
        <Link aria-label={`Ver estudante ${student.nome}`} to={`/estudantes/${encodeURIComponent(student._id)}`}><Eye size={16}/></Link>
        <Link aria-label={`Editar estudante ${student.nome}`} to={`/estudantes/${encodeURIComponent(student._id)}/editar`}><Pencil size={15}/></Link>
        {onDelete && <button aria-label={`Excluir estudante ${student.nome}`} title={`Excluir ${student.nome}`} onClick={() => void onDelete(student)}><Trash2 size={15}/></button>}
      </div></td>
    </tr>)}
  </tbody></table></div>
}

function StudentForm({ mode, initial, onSave }: { mode: 'create' | 'edit'; initial?: Student; onSave: (student: StudentInput) => Promise<void> }) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [turma, setTurma] = useState(initial?.turma ?? '')
  const [nota1, setNota1] = useState(String(initial?.nota1 ?? 0))
  const [nota2, setNota2] = useState(String(initial?.nota2 ?? 0))
  const [nota3, setNota3] = useState(String(initial?.nota3 ?? 0))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isEdit = mode === 'edit'
  const cancelTo = isEdit && initial ? `/estudantes/${encodeURIComponent(initial._id)}` : '/estudantes'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const values = [nota1, nota2, nota3].map(Number)
    if (!nome.trim()) { setError('Informe o nome do estudante.'); return }
    if ([nota1, nota2, nota3].some((value) => !value.trim()) || values.some((value) => !Number.isFinite(value) || value < 0 || value > 10)) {
      setError('Informe as três notas entre 0 e 10.')
      return
    }

    setBusy(true)
    try {
      await onSave({ nome: nome.trim(), turma: turma.trim(), nota1: values[0], nota2: values[1], nota3: values[2] })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Não foi possível ${isEdit ? 'atualizar' : 'cadastrar'} o estudante.`)
    } finally {
      setBusy(false)
    }
  }

  return <>
    <Link className="breadcrumb" to={cancelTo}><ArrowLeft size={15}/>{isEdit ? 'Voltar ao estudante' : 'Voltar para estudantes'}</Link>
    <PageTitle eyebrow={isEdit ? 'EDIÇÃO' : 'NOVO REGISTRO'} title={isEdit ? 'Editar estudante' : 'Cadastrar estudante'} subtitle={isEdit ? 'Atualize os dados e as três notas.' : 'Informe o nome, a turma e as três notas.'}/>
    <form className="form-card student-form" onSubmit={submit}>
      {initial && <p className="field-help">ID do banco: <code>{initial._id}</code></p>}
      <label>Nome do estudante<Input unstyled autoFocus required value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome completo"/></label>
      <label>Turma <span className="optional-label">(opcional)</span><Input unstyled value={turma} onChange={(event) => setTurma(event.target.value)} placeholder="Ex.: 9º ano A"/></label>
      <div className="grade-input-grid">
        <GradeInput label="Nota 1" value={nota1} onChange={setNota1}/>
        <GradeInput label="Nota 2" value={nota2} onChange={setNota2}/>
        <GradeInput label="Nota 3" value={nota3} onChange={setNota3}/>
      </div>
      <div className="average-preview"><span>Média calculada</span><strong>{[nota1, nota2, nota3].every((value) => value.trim() && Number.isFinite(Number(value))) ? formatScore((Number(nota1) + Number(nota2) + Number(nota3)) / 3) : '—'}</strong></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="form-actions"><Link className="button button-quiet" to={cancelTo}>Cancelar</Link><Button unstyled className="button button-primary" type="submit" disabled={busy}>{busy ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Cadastrar estudante'}</Button></div>
    </form>
  </>
}

function GradeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label>{label}<div className="grade-input-wrap"><Input unstyled type="number" min="0" max="10" step="0.1" required value={value} onChange={(event) => onChange(event.target.value)}/><span>de 10</span></div></label>
}

function useStudent(id: string | undefined) {
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!id) { setError('ID do estudante ausente.'); setLoading(false); return }
    setLoading(true)
    setError('')
    api.student(id)
      .then((record) => { if (active) setStudent(record) })
      .catch((reason: Error) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  return { student, loading, error }
}

function StudentDetails({ onDelete }: { onDelete: (student: Student) => Promise<boolean> }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { student, loading, error } = useStudent(id)
  if (loading) return <LoadingState message="Carregando estudante…"/>
  if (error || !student) return <ErrorState message={error || 'Estudante não encontrado.'} onRetry={() => navigate('/estudantes')}/>
  const currentStudent = student

  async function remove() {
    if (await onDelete(currentStudent)) navigate('/estudantes')
  }

  return <>
    <Link className="breadcrumb" to="/estudantes"><ArrowLeft size={15}/>Voltar para estudantes</Link>
    <PageTitle eyebrow="ESTUDANTE" title={currentStudent.nome} subtitle={currentStudent.turma?.trim() || 'Turma não informada'} action={<div className="page-actions"><Link className="button button-primary" to={`/estudantes/${encodeURIComponent(currentStudent._id)}/editar`}><Pencil size={15}/>Editar</Link><Button unstyled className="button button-danger" onClick={() => void remove()}><Trash2 size={15}/>Excluir</Button></div>}/>
    <div className="grade-summary"><span>Média das três notas</span><strong>{formatScore(averageOf(currentStudent))} <small>/ 10</small></strong></div>
    <div className="grades-grid three-grade-cards"><GradeCard title="Nota 1" value={currentStudent.nota1}/><GradeCard title="Nota 2" value={currentStudent.nota2}/><GradeCard title="Nota 3" value={currentStudent.nota3}/></div>
    <p className="info-note">O ID é gerado pelo banco. A média é calculada nesta interface e não é enviada como campo do estudante.</p>
  </>
}

function StudentEditPage({ onSave }: { onSave: (id: string, student: StudentInput) => Promise<void> }) {
  const { id } = useParams()
  const { student, loading, error } = useStudent(id)
  if (loading) return <LoadingState message="Carregando estudante…"/>
  if (error || !student) return <ErrorState message={error || 'Estudante não encontrado.'} onRetry={() => window.history.back()}/>
  return <StudentForm key={student._id} mode="edit" initial={student} onSave={(input) => onSave(student._id, input)}/>
}

function GradeCard({ title, value }: { title: string; value: number }) {
  return <div className="grade-card"><span>{title}</span><strong>{formatScore(value)} <small>/ 10</small></strong><div className="grade-track"><i style={{ width: `${Math.max(0, Math.min(10, Number(value))) * 10}%` }}/></div></div>
}

function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

function LoadingState({ message }: { message: string }) {
  return <div className="empty-state" role="status">{message}</div>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="request-error" role="alert"><p>{message}</p><div className="error-actions"><Button unstyled className="button button-quiet" onClick={onRetry}>Tentar novamente</Button><Link className="text-link" to="/estudantes">Ver estudantes</Link></div></div>
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toLocaleUpperCase('pt-BR')
}
