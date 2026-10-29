import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Button, Input } from '@chakra-ui/react'
import { ArrowLeft, BookOpen, Eye, GraduationCap, Home, LogOut, Pencil, Plus, Users } from 'lucide-react'
import { api, authToken, type Student, type Teacher } from '../core/api'

export default function App() {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [checkingSession, setCheckingSession] = useState(true)
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!authToken.get()) { setCheckingSession(false); return }
    api.me()
      .then(({ teacher: current }) => setTeacher(current))
      .catch(() => authToken.clear())
      .finally(() => setCheckingSession(false))
  }, [])

  useEffect(() => {
    if (!teacher) { setStudents([]); return }
    api.students().then(({ students: records }) => setStudents(records)).catch((error: Error) => setNotice(error.message))
  }, [teacher])

  async function login(email: string, password: string) {
    const result = await api.login(email, password)
    authToken.set(result.token)
    setTeacher(result.teacher)
    navigate('/notas')
  }

  function logout() { authToken.clear(); setTeacher(null); setStudents([]); navigate('/') }

  async function addStudent(input: Pick<Student, 'name' | 'registration' | 'classroom'>) {
    const { student } = await api.createStudent(input)
    setStudents((current) => [...current, student])
    setNotice('Aluno cadastrado.')
    navigate('/alunos')
  }

  async function saveGrades(id: string, grade1: number, grade2: number) {
    const { student } = await api.updateGrades(id, grade1, grade2)
    setStudents((current) => current.map((item) => item.id === id ? student : item))
    setNotice('Notas atualizadas.')
    navigate(`/alunos/${id}`)
  }

  const protectedPage = (page: ReactNode) => {
    if (checkingSession) return <div className="page-loading">Carregando…</div>
    if (!teacher) return <Navigate to="/login" replace />
    return <Shell teacher={teacher} onLogout={logout} notice={notice} clearNotice={() => setNotice('')}>{page}</Shell>
  }

  return <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={teacher ? <Navigate to="/notas" replace /> : <LoginPage onLogin={login} />} />
    <Route path="/notas" element={protectedPage(<Dashboard students={students} />)} />
    <Route path="/alunos" element={protectedPage(<StudentsPage students={students} />)} />
    <Route path="/alunos/novo" element={protectedPage(<StudentForm onSave={addStudent} />)} />
    <Route path="/alunos/:id" element={protectedPage(<StudentDetails students={students} />)} />
    <Route path="/alunos/:id/editar" element={protectedPage(<GradeForm students={students} onSave={saveGrades} />)} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

function Shell({ children, teacher, onLogout, notice, clearNotice }: { children: ReactNode; teacher: Teacher; onLogout: () => void; notice: string; clearNotice: () => void }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" to="/notas"><span className="brand-icon"><GraduationCap size={20}/></span><span>EduNotas<small>ÁREA DO PROFESSOR</small></span></Link>
      <div className="nav-label">MENU</div>
      <Link className="nav-link" to="/notas"><Home size={17}/>Resumo</Link>
      <Link className="nav-link" to="/alunos"><Users size={17}/>Alunos</Link>
      <div className="sidebar-bottom">
        <div className="teacher-card"><div className="avatar">{teacher.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><b>{teacher.name}</b><small>Professor(a)</small></div></div>
        <Button unstyled className="nav-link logout" onClick={onLogout}><LogOut size={16}/>Sair</Button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><span>Registro de avaliações</span><span className="top-user">{teacher.name}</span></header>
      <div className="content">
        {notice && <div className="toast" role="status">{notice}<button aria-label="Fechar" onClick={clearNotice}>×</button></div>}
        {children}
      </div>
    </main>
  </div>
}

function HomePage() {
  return <div className="landing">
    <header className="landing-nav"><Link className="brand" to="/"><span className="brand-icon"><GraduationCap size={20}/></span>EduNotas</Link><Link className="button button-primary" to="/login">Entrar</Link></header>
    <main className="hero">
      <div className="hero-copy">
        <div className="eyebrow">SISTEMA DE NOTAS PARA PROFESSORES</div>
        <h1>Notas da turma,<br/>organizadas num só lugar.</h1>
        <p>Cadastre seus alunos, registre duas avaliações e consulte a média de cada um.</p>
        <Link className="button button-primary" to="/login">Acessar área do professor <span>→</span></Link>
        <div className="hero-note">Projeto acadêmico · Dados de demonstração</div>
      </div>
      <section className="home-panel" aria-label="O que o sistema oferece">
        <div className="panel-title"><span>EDUNOTAS</span><b>O que você encontra</b></div>
        <div className="home-feature"><span>01</span><div><b>Lista de alunos</b><small>Nome, matrícula, turma e média.</small></div></div>
        <div className="home-feature"><span>02</span><div><b>Duas avaliações</b><small>Notas de zero a dez.</small></div></div>
        <div className="home-feature"><span>03</span><div><b>Média automática</b><small>A média aritmética das avaliações.</small></div></div>
      </section>
    </main>
    <footer className="landing-footer"><span>EduNotas · Projeto acadêmico</span><span>Registro de notas da turma</span></footer>
  </div>
}

function LoginPage({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try { await onLogin(email, password) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.') } finally { setBusy(false) }
  }
  return <div className="login-page">
    <Link to="/" className="back-home"><ArrowLeft size={16}/> Início</Link>
    <div className="login-card">
      <Link className="brand login-brand" to="/"><span className="brand-icon"><GraduationCap size={20}/></span>EduNotas</Link>
      <h1>Acesso do professor</h1><p>Entre com os dados da sua conta.</p>
      <form onSubmit={submit}>
        <label>E-mail<Input unstyled autoComplete="username" type="email" required placeholder="professor@escola.com" value={email} onChange={(event) => setEmail(event.target.value)}/></label>
        <label>Senha<Input unstyled autoComplete="current-password" type="password" required placeholder="Sua senha" value={password} onChange={(event) => setPassword(event.target.value)}/></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <Button unstyled className="button button-primary login-submit" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
      </form>
      <p className="demo-hint">Use a conta do professor criada na configuração do projeto.</p>
    </div>
  </div>
}

function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

function Dashboard({ students }: { students: Student[] }) {
  const classCount = new Set(students.map((student) => student.classroom)).size
  const average = students.length ? students.reduce((sum, student) => sum + student.average, 0) / students.length : 0
  return <>
    <PageTitle eyebrow="RESUMO" title="Resumo da turma" subtitle="Alunos e médias registrados." action={<Link className="button button-primary" to="/alunos/novo"><Plus size={16}/>Novo aluno</Link>}/>
    <div className="stats-grid"><Stat icon={<Users/>} label="Alunos" value={students.length}/><Stat icon={<BookOpen/>} label="Turmas" value={classCount}/><Stat icon={<GraduationCap/>} label="Média geral" value={students.length ? average.toFixed(1).replace('.', ',') : '—'}/></div>
    <div className="section-heading"><div><h2>Alunos</h2><p>Últimos registros.</p></div><Link className="text-link" to="/alunos">Ver lista <span>→</span></Link></div>
    <StudentTable students={[...students].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5)}/>
  </>
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return <div className="stat-card"><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span><strong>{value}</strong></div>
}

function StudentTable({ students }: { students: Student[] }) {
  return <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Matrícula</th><th>Turma</th><th>Média</th><th>Ações</th></tr></thead><tbody>
    {students.map((student) => <tr key={student.id}>
      <td><span className="student-avatar">{student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><b>{student.name}</b></td>
      <td>{student.registration}</td><td>{student.classroom}</td>
      <td><span className={`grade-pill ${student.average >= 7 ? 'good' : ''}`}>{student.average.toFixed(1).replace('.', ',')}</span></td>
      <td><div className="row-actions"><Link aria-label={`Ver notas de ${student.name}`} to={`/alunos/${student.id}`}><Eye size={16}/></Link><Link aria-label={`Editar notas de ${student.name}`} to={`/alunos/${student.id}/editar`}><Pencil size={15}/></Link></div></td>
    </tr>)}
  </tbody></table>{students.length === 0 && <div className="empty-state">Nenhum aluno cadastrado. <Link to="/alunos/novo">Cadastrar aluno</Link></div>}</div>
}

function StudentsPage({ students }: { students: Student[] }) {
  const [query, setQuery] = useState('')
  const filtered = students.filter((student) => `${student.name} ${student.registration} ${student.classroom}`.toLowerCase().includes(query.toLowerCase()))
  return <>
    <PageTitle eyebrow="ALUNOS" title="Lista de alunos" subtitle="Consulte os dados e as médias." action={<Link className="button button-primary" to="/alunos/novo"><Plus size={16}/>Cadastrar aluno</Link>}/>
    <div className="list-tools"><span>{filtered.length} {filtered.length === 1 ? 'aluno' : 'alunos'}</span><Input unstyled aria-label="Buscar aluno" placeholder="Buscar nome, matrícula ou turma" value={query} onChange={(event) => setQuery(event.target.value)}/></div>
    <StudentTable students={[...filtered].sort((a, b) => a.name.localeCompare(b.name))}/>
  </>
}

function StudentForm({ onSave }: { onSave: (student: Pick<Student, 'name' | 'registration' | 'classroom'>) => Promise<void> }) {
  const [name, setName] = useState(''); const [registration, setRegistration] = useState(''); const [classroom, setClassroom] = useState(''); const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    try { await onSave({ name: name.trim(), registration: registration.trim(), classroom: classroom.trim() }) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível cadastrar o aluno.') }
  }
  return <>
    <Link className="breadcrumb" to="/alunos"><ArrowLeft size={15}/>Voltar para alunos</Link>
    <PageTitle eyebrow="NOVO REGISTRO" title="Cadastrar aluno" subtitle="Informe os dados básicos do aluno."/>
    <form className="form-card" onSubmit={submit}>
      <label>Nome completo<Input unstyled autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do aluno"/></label>
      <label>Matrícula<Input unstyled required maxLength={40} value={registration} onChange={(event) => setRegistration(event.target.value)} placeholder="Número de matrícula"/></label>
      <label>Turma<Input unstyled required maxLength={40} value={classroom} onChange={(event) => setClassroom(event.target.value)} placeholder="Ex.: 9º ano A"/></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="form-actions"><Link className="button button-quiet" to="/alunos">Cancelar</Link><Button unstyled className="button button-primary" type="submit">Cadastrar</Button></div>
    </form>
  </>
}

function StudentDetails({ students }: { students: Student[] }) {
  const { id } = useParams(); const student = students.find((item) => item.id === id)
  if (!student) return <NotFoundStudent/>
  return <>
    <Link className="breadcrumb" to="/alunos"><ArrowLeft size={15}/>Voltar para alunos</Link>
    <PageTitle eyebrow="BOLETIM" title={student.name} subtitle={`Matrícula ${student.registration} · ${student.classroom}`} action={<Link className="button button-primary" to={`/alunos/${student.id}/editar`}><Pencil size={15}/>Editar notas</Link>}/>
    <div className="grade-summary"><span>Média aritmética</span><strong>{student.average.toFixed(1).replace('.', ',')} <small>/ 10</small></strong></div>
    <div className="grades-grid"><GradeCard title="Avaliação 1" value={student.grade1}/><GradeCard title="Avaliação 2" value={student.grade2}/></div>
    <p className="info-note">A média é calculada pelas duas notas. Ela não é salva separadamente.</p>
  </>
}

function GradeCard({ title, value }: { title: string; value: number }) {
  return <div className="grade-card"><span>{title}</span><strong>{value.toFixed(1).replace('.', ',')} <small>/ 10</small></strong><div className="grade-track"><i style={{ width: `${value * 10}%` }}/></div></div>
}

function GradeForm({ students, onSave }: { students: Student[]; onSave: (id: string, grade1: number, grade2: number) => Promise<void> }) {
  const { id } = useParams(); const student = students.find((item) => item.id === id)
  const [grade1, setGrade1] = useState(student?.grade1 ?? 0); const [grade2, setGrade2] = useState(student?.grade2 ?? 0); const [error, setError] = useState('')
  useEffect(() => { if (student) { setGrade1(student.grade1); setGrade2(student.grade2) } }, [student?.id, student?.grade1, student?.grade2])
  if (!student) return <NotFoundStudent/>
  const selectedStudent = student
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (grade1 < 0 || grade1 > 10 || grade2 < 0 || grade2 > 10) { setError('As notas devem ficar entre 0 e 10.'); return }
    try { await onSave(selectedStudent.id, Number(grade1), Number(grade2)) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar as notas.') }
  }
  return <>
    <Link className="breadcrumb" to={`/alunos/${student.id}`}><ArrowLeft size={15}/>Voltar para o boletim</Link>
    <PageTitle eyebrow="AVALIAÇÕES" title="Editar notas" subtitle={`${student.name} · ${student.classroom}`}/>
    <form className="form-card" onSubmit={submit}>
      <label>Avaliação 1<div className="grade-input-wrap"><Input unstyled type="number" min="0" max="10" step="0.1" required value={grade1} onChange={(event) => setGrade1(Number(event.target.value))}/><span>de 10</span></div></label>
      <label>Avaliação 2<div className="grade-input-wrap"><Input unstyled type="number" min="0" max="10" step="0.1" required value={grade2} onChange={(event) => setGrade2(Number(event.target.value))}/><span>de 10</span></div></label>
      <div className="average-preview"><span>Média calculada</span><strong>{((Number(grade1) + Number(grade2)) / 2).toFixed(1).replace('.', ',')}</strong></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="form-actions"><Link className="button button-quiet" to={`/alunos/${student.id}`}>Cancelar</Link><Button unstyled className="button button-primary" type="submit">Salvar notas</Button></div>
    </form>
  </>
}

function NotFoundStudent() { return <div className="empty-state">Aluno não encontrado. <Link to="/alunos">Voltar para a lista.</Link></div> }
