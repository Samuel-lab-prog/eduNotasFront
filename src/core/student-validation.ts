import type { StudentInput } from './api'

export type StudentFormValues = {
  nome: string
  turma: string
  nota1: string
  nota2: string
  nota3: string
}

export type StudentValidation =
  | { valid: true; value: StudentInput }
  | { valid: false; message: string }

export function validateStudent(values: StudentFormValues): StudentValidation {
  if (!values.nome.trim()) {
    return { valid: false, message: 'Informe o nome do estudante.' }
  }

  const rawGrades = [values.nota1, values.nota2, values.nota3]
  if (rawGrades.some((value) => !value.trim())) {
    return { valid: false, message: 'Informe as três notas entre 0 e 10.' }
  }

  const grades = rawGrades.map(Number)
  if (grades.some((value) => !Number.isFinite(value) || value < 0 || value > 10)) {
    return { valid: false, message: 'Informe as três notas entre 0 e 10.' }
  }

  return {
    valid: true,
    value: {
      nome: values.nome.trim(),
      turma: values.turma.trim(),
      nota1: grades[0],
      nota2: grades[1],
      nota3: grades[2],
    },
  }
}
