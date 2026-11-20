import { AppState, INITIAL_SEED_DATA } from './projectLogic';

export type GradeOption = '1' | '2' | '3' | '4' | '5';
export type SectionOption = 'A' | 'B' | 'C';

export const GRADE_OPTIONS: GradeOption[] = ['1', '2', '3', '4', '5'];
export const SECTION_OPTIONS: SectionOption[] = ['A', 'B', 'C'];

export interface StudentAccount {
  id: string;
  displayName: string;
  email: string;
  gradeLevel?: GradeOption;
  sectionLetter?: SectionOption;
  gradeCourse: string;
  authProvider: 'google' | 'student-account';
  password?: string;
  createdAt: string;
}

export const ACCOUNTS_STORAGE_KEY = 'actividades_juntos_student_accounts_v2';
export const ACTIVE_SESSION_STORAGE_KEY = 'actividades_juntos_active_student_v2';

export const BLUEPRINT_LIMITS = {
  DISPLAY_NAME_MAX: 80,
  GRADE_COURSE_MAX: 80,
  EMAIL_MAX: 160,
  ID_MAX: 128,
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
} as const;

export function formatGradeAndSection(
  grade: string,
  section: string
): string {
  const cleanGrade = GRADE_OPTIONS.includes(grade as GradeOption)
    ? grade
    : '5';
  const cleanSection = SECTION_OPTIONS.includes(
    section.toUpperCase() as SectionOption
  )
    ? section.toUpperCase()
    : 'A';
  return `${cleanGrade}° Secundaria · Sección ${cleanSection}`;
}

export const DEFAULT_STUDENT_ACCOUNTS: StudentAccount[] = [
  {
    id: 'stu-valeria-01',
    displayName: 'Valeria Rojas',
    email: 'valeria.rojas@colegio.edu.pe',
    gradeLevel: '5',
    sectionLetter: 'A',
    gradeCourse: formatGradeAndSection('5', 'A'),
    authProvider: 'student-account',
    password: 'estudiante123',
    createdAt: '2026-11-10T14:00:00.000Z',
  },
  {
    id: 'stu-mateo-02',
    displayName: 'Mateo Quispe',
    email: 'mateo.quispe@colegio.edu.pe',
    gradeLevel: '5',
    sectionLetter: 'B',
    gradeCourse: formatGradeAndSection('5', 'B'),
    authProvider: 'student-account',
    password: 'estudiante123',
    createdAt: '2026-11-10T14:15:00.000Z',
  },
];

export function getStudentWorkspaceStorageKey(studentId: string): string {
  const safeId = studentId.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  return `actividades_juntos_workspace_v2_${safeId}`;
}

export function isValidStudentEmail(rawEmail: string): boolean {
  const trimmed = rawEmail.trim();
  if (trimmed.length < 3 || trimmed.length > BLUEPRINT_LIMITS.EMAIL_MAX) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateStudentRegistration(payload: {
  displayName: string;
  email: string;
  gradeCourse: string;
  gradeLevel?: string;
  sectionLetter?: string;
  password: string;
}): { valid: boolean; error?: string } {
  const name = payload.displayName.trim();
  const email = payload.email.trim().toLowerCase();
  const grade = payload.gradeCourse.trim();
  const password = payload.password.trim();

  if (!name) {
    return { valid: false, error: 'Ingresa tu nombre y apellido completo.' };
  }
  if (name.length > BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) {
    return {
      valid: false,
      error: `El nombre no puede superar ${BLUEPRINT_LIMITS.DISPLAY_NAME_MAX} caracteres.`,
    };
  }
  if (!email || !isValidStudentEmail(email)) {
    return {
      valid: false,
      error: 'Ingresa un correo electrónico válido (ej. nombre@colegio.edu.pe).',
    };
  }
  if (
    payload.gradeLevel !== undefined &&
    !GRADE_OPTIONS.includes(payload.gradeLevel as GradeOption)
  ) {
    return {
      valid: false,
      error: 'Selecciona un grado válido entre 1 y 5.',
    };
  }
  if (
    payload.sectionLetter !== undefined &&
    !SECTION_OPTIONS.includes(payload.sectionLetter as SectionOption)
  ) {
    return {
      valid: false,
      error: 'Selecciona una sección válida (A, B o C).',
    };
  }
  if (!grade) {
    return {
      valid: false,
      error: 'Selecciona tu grado (1 a 5) y sección (A a C).',
    };
  }
  if (grade.length > BLUEPRINT_LIMITS.GRADE_COURSE_MAX) {
    return {
      valid: false,
      error: `El grado no puede superar ${BLUEPRINT_LIMITS.GRADE_COURSE_MAX} caracteres.`,
    };
  }
  if (password.length < 6) {
    return {
      valid: false,
      error: 'La contraseña debe tener al menos 6 caracteres.',
    };
  }

  return { valid: true };
}

export function validateStudentLogin(payload: {
  email: string;
  password: string;
}): { valid: boolean; error?: string } {
  const email = payload.email.trim().toLowerCase();
  const password = payload.password.trim();

  if (!email || !isValidStudentEmail(email)) {
    return {
      valid: false,
      error: 'Ingresa tu correo electrónico registrado.',
    };
  }
  if (!password) {
    return {
      valid: false,
      error: 'Ingresa tu contraseña para continuar.',
    };
  }

  return { valid: true };
}

export function registerStudentInList(
  accounts: StudentAccount[],
  payload: {
    displayName: string;
    email: string;
    gradeCourse?: string;
    gradeLevel?: GradeOption;
    sectionLetter?: SectionOption;
    password: string;
    id?: string;
    nowIso?: string;
  }
): {
  accounts: StudentAccount[];
  account?: StudentAccount;
  error?: string;
} {
  const resolvedGrade: GradeOption =
    payload.gradeLevel && GRADE_OPTIONS.includes(payload.gradeLevel)
      ? payload.gradeLevel
      : '5';
  const resolvedSection: SectionOption =
    payload.sectionLetter && SECTION_OPTIONS.includes(payload.sectionLetter)
      ? payload.sectionLetter
      : 'A';
  const resolvedGradeCourse =
    payload.gradeCourse?.trim() ||
    formatGradeAndSection(resolvedGrade, resolvedSection);

  const validation = validateStudentRegistration({
    ...payload,
    gradeCourse: resolvedGradeCourse,
  });
  if (!validation.valid) {
    return { accounts, error: validation.error };
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const exists = accounts.some(
    (acc) => acc.email.trim().toLowerCase() === normalizedEmail
  );
  if (exists) {
    return {
      accounts,
      error:
        'Ya existe una cuenta con este correo. Cambia a "Iniciar Sesión" para entrar.',
    };
  }

  const cleanId = (payload.id || `stu-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, BLUEPRINT_LIMITS.ID_MAX);

  const newAccount: StudentAccount = {
    id: cleanId,
    displayName: payload.displayName
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
    email: normalizedEmail.slice(0, BLUEPRINT_LIMITS.EMAIL_MAX),
    gradeLevel: resolvedGrade,
    sectionLetter: resolvedSection,
    gradeCourse: resolvedGradeCourse.slice(0, BLUEPRINT_LIMITS.GRADE_COURSE_MAX),
    authProvider: 'student-account',
    password: payload.password.trim(),
    createdAt: payload.nowIso || new Date().toISOString(),
  };

  return {
    accounts: [...accounts, newAccount],
    account: newAccount,
  };
}

export function authenticateStudentFromList(
  accounts: StudentAccount[],
  payload: { email: string; password: string }
): { account?: StudentAccount; error?: string } {
  const validation = validateStudentLogin(payload);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const cleanPassword = payload.password.trim();

  const found = accounts.find(
    (acc) => acc.email.trim().toLowerCase() === normalizedEmail
  );
  if (!found) {
    return {
      error:
        'No encontramos una cuenta con ese correo. Puedes crear una gratis en la pestaña "Crear Cuenta".',
    };
  }

  if (found.password && found.password !== cleanPassword) {
    return {
      error: 'Contraseña incorrecta. Verifica tus datos e inténtalo de nuevo.',
    };
  }

  return { account: found };
}

/**
 * Generates an initial workspace tailored for the student so their own name
 * is immediately included in their project groups.
 */
export function buildPersonalizedInitialWorkspace(
  studentName: string
): AppState {
  const cleanName = studentName.trim();
  if (!cleanName) {
    return JSON.parse(JSON.stringify(INITIAL_SEED_DATA)) as AppState;
  }

  const cloned = JSON.parse(JSON.stringify(INITIAL_SEED_DATA)) as AppState;

  return {
    ...cloned,
    groups: cloned.groups.map((group, groupIdx) => {
      const alreadyMember = group.members.some(
        (m) => m.trim().toLowerCase() === cleanName.toLowerCase()
      );
      const updatedMembers = alreadyMember
        ? group.members
        : [cleanName, ...group.members];

      const updatedTasks = alreadyMember
        ? group.tasks
        : group.tasks.map((task, idx) =>
            groupIdx === 0 && idx === 4
              ? { ...task, assignee: cleanName }
              : task
          );

      return {
        ...group,
        members: updatedMembers,
        tasks: updatedTasks,
      };
    }),
  };
}
