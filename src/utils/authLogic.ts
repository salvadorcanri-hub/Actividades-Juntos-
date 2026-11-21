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
  /** Salted SHA-256 digest (never stored in active session) */
  passwordHash?: string;
  /** Per-account random salt (never stored in active session) */
  passwordSalt?: string;
  createdAt: string;
}

export const ACCOUNTS_STORAGE_KEY = 'actividades_juntos_student_accounts_v2';
export const ACTIVE_SESSION_STORAGE_KEY = 'actividades_juntos_active_student_v2';

export const BLUEPRINT_LIMITS = {
  DISPLAY_NAME_MAX: 80,
  GRADE_COURSE_MAX: 80,
  EMAIL_MAX: 160,
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 128,
  ID_MAX: 128,
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
} as const;

/**
 * Pure TypeScript SHA-256 implementation (FIPS 180-4) so password hashing
 * works identically and synchronously in browsers and Node test environments
 * without storing plaintext passwords in localStorage.
 */
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256Hex(message: string): string {
  const utf8 = new TextEncoder().encode(message);
  const bitLen = utf8.length * 8;
  const paddedLen = Math.ceil((utf8.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(utf8);
  padded[utf8.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 =
        rightRotate(w[i - 15], 7) ^
        rightRotate(w[i - 15], 18) ^
        (w[i - 15] >>> 3);
      const s1 =
        rightRotate(w[i - 2], 17) ^
        rightRotate(w[i - 2], 19) ^
        (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((val) => val.toString(16).padStart(8, '0'))
    .join('');
}

export function generatePasswordSalt(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256Hex(`${Date.now()}-${Math.random()}`).slice(0, 32);
}

/**
 * Computes an iterated salted SHA-256 digest to protect student credentials at rest.
 */
export function hashPasswordWithSalt(password: string, salt: string): string {
  let digest = sha256Hex(`aj-v1:${salt}:${password}`);
  for (let round = 0; round < 32; round++) {
    digest = sha256Hex(`${salt}:${digest}:${round}`);
  }
  return digest;
}

/**
 * Constant-time string equality check to avoid timing side channels.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Strips credential secrets (passwordHash, passwordSalt, or legacy password)
 * before persisting an active session or exposing account state to UI.
 */
export function sanitizeAccountForSession(
  account: StudentAccount & { password?: string }
): StudentAccount {
  return {
    id: String(account.id || '').replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, BLUEPRINT_LIMITS.ID_MAX) || 'stu-session',
    displayName: String(account.displayName || 'Estudiante').trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
    email: String(account.email || '').trim().toLowerCase().slice(0, BLUEPRINT_LIMITS.EMAIL_MAX),
    gradeLevel: GRADE_OPTIONS.includes(account.gradeLevel as GradeOption)
      ? account.gradeLevel
      : '5',
    sectionLetter: SECTION_OPTIONS.includes(account.sectionLetter as SectionOption)
      ? account.sectionLetter
      : 'A',
    gradeCourse:
      String(account.gradeCourse || '').trim().slice(0, BLUEPRINT_LIMITS.GRADE_COURSE_MAX) ||
      formatGradeAndSection(account.gradeLevel || '5', account.sectionLetter || 'A'),
    authProvider: account.authProvider === 'google' ? 'google' : 'student-account',
    createdAt: typeof account.createdAt === 'string' ? account.createdAt : new Date().toISOString(),
  };
}

/**
 * Migrates any legacy localStorage accounts that stored plaintext passwords
 * into salted SHA-256 hashes and removes the plaintext field immediately.
 */
export function migrateAndSanitizeAccounts(raw: unknown): StudentAccount[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_STUDENT_ACCOUNTS;
  }

  const sanitized: StudentAccount[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Partial<StudentAccount> & { password?: string };
    if (typeof rec.id !== 'string' || typeof rec.email !== 'string' || typeof rec.displayName !== 'string') {
      continue;
    }

    const base = sanitizeAccountForSession(rec as StudentAccount);
    let passwordHash = typeof rec.passwordHash === 'string' && rec.passwordHash.length === 64 ? rec.passwordHash : undefined;
    let passwordSalt = typeof rec.passwordSalt === 'string' && rec.passwordSalt.length >= 8 ? rec.passwordSalt : undefined;

    if (!passwordHash && typeof rec.password === 'string' && rec.password.trim().length > 0) {
      passwordSalt = generatePasswordSalt();
      passwordHash = hashPasswordWithSalt(rec.password.trim(), passwordSalt);
    }

    sanitized.push({
      ...base,
      ...(passwordHash && passwordSalt ? { passwordHash, passwordSalt } : {}),
    });
  }

  return sanitized.length > 0 ? sanitized : DEFAULT_STUDENT_ACCOUNTS;
}

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

const DEMO_SALT_VALERIA = 'aj-demo-salt-valeria-2026';
const DEMO_SALT_MATEO = 'aj-demo-salt-mateo-2026';

export const DEFAULT_STUDENT_ACCOUNTS: StudentAccount[] = [
  {
    id: 'stu-valeria-01',
    displayName: 'Valeria Rojas',
    email: 'valeria.rojas@colegio.edu.pe',
    gradeLevel: '5',
    sectionLetter: 'A',
    gradeCourse: formatGradeAndSection('5', 'A'),
    authProvider: 'student-account',
    passwordSalt: DEMO_SALT_VALERIA,
    passwordHash: hashPasswordWithSalt('estudiante123', DEMO_SALT_VALERIA),
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
    passwordSalt: DEMO_SALT_MATEO,
    passwordHash: hashPasswordWithSalt('estudiante123', DEMO_SALT_MATEO),
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
  if (password.length < BLUEPRINT_LIMITS.PASSWORD_MIN) {
    return {
      valid: false,
      error: `La contraseña debe tener al menos ${BLUEPRINT_LIMITS.PASSWORD_MIN} caracteres.`,
    };
  }
  if (password.length > BLUEPRINT_LIMITS.PASSWORD_MAX) {
    return {
      valid: false,
      error: `La contraseña no puede superar ${BLUEPRINT_LIMITS.PASSWORD_MAX} caracteres.`,
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
  if (!password || password.length > BLUEPRINT_LIMITS.PASSWORD_MAX) {
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

  const salt = generatePasswordSalt();
  const passwordHash = hashPasswordWithSalt(payload.password.trim(), salt);

  const storedAccount: StudentAccount = {
    id: cleanId,
    displayName: payload.displayName
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
    email: normalizedEmail.slice(0, BLUEPRINT_LIMITS.EMAIL_MAX),
    gradeLevel: resolvedGrade,
    sectionLetter: resolvedSection,
    gradeCourse: resolvedGradeCourse.slice(0, BLUEPRINT_LIMITS.GRADE_COURSE_MAX),
    authProvider: 'student-account',
    passwordSalt: salt,
    passwordHash,
    createdAt: payload.nowIso || new Date().toISOString(),
  };

  return {
    accounts: [...accounts, storedAccount],
    account: sanitizeAccountForSession(storedAccount),
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

  // Use a uniform generic error message to prevent account/email enumeration
  const genericCredentialError =
    'Correo o contraseña incorrectos. Verifica tus datos o crea una cuenta nueva.';

  if (!found) {
    return { error: genericCredentialError };
  }

  if (found.authProvider === 'google') {
    return {
      error:
        'Esta cuenta usa inicio de sesión con Google. Usa el botón "Continuar con Google".',
    };
  }

  // Hard security gate: reject login if account lacks valid salted hash (prevents empty-password bypass)
  if (!found.passwordHash || !found.passwordSalt) {
    return { error: genericCredentialError };
  }

  const candidateHash = hashPasswordWithSalt(cleanPassword, found.passwordSalt);
  if (!constantTimeEqual(found.passwordHash, candidateHash)) {
    return { error: genericCredentialError };
  }

  return { account: sanitizeAccountForSession(found) };
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

      // Group 0 ("Proyecto EPT"): logged-in student is the Creator (full permissions)
      // Group 1 ("Debate Comunicación"): another student is Creator so user can also test Member role
      const creatorName =
        groupIdx === 0
          ? cleanName
          : group.creatorName &&
            group.creatorName.toLowerCase() !== cleanName.toLowerCase()
          ? group.creatorName
          : 'Sebastián Mendoza';

      const updatedTasks = group.tasks.map((task, idx) => {
        if (!alreadyMember && groupIdx === 0 && idx === 4) {
          return { ...task, assignee: cleanName };
        }
        if (groupIdx === 1 && idx === 3 && creatorName.toLowerCase() !== cleanName.toLowerCase()) {
          return { ...task, assignee: cleanName };
        }
        return task;
      });

      return {
        ...group,
        creatorName,
        members: updatedMembers,
        tasks: updatedTasks,
      };
    }),
  };
}

