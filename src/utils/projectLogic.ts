export type Priority = 'Alta' | 'Media' | 'Baja';
export type TaskStatus = 'Por Hacer' | 'En Progreso' | 'Terminado';
export type EvidenceReviewStatus = 'pendiente' | 'verificada' | 'observada';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  evidenceUrl: string;
  evidenceReviewStatus?: EvidenceReviewStatus;
  evidenceReviewNote?: string;
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export interface AnchoredResource {
  id: string;
  title: string;
  category: string;
  url: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  course: string;
  inviteCode?: string;
  coverUrl?: string;
  members: string[];
  tasks: Task[];
  resources: AnchoredResource[];
  createdAt: string;
}

export interface AppState {
  groups: Group[];
  activeGroupId: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface GroupProgress {
  completed: number;
  inProgress: number;
  todo: number;
  total: number;
  percentage: number;
  exactPercentage: number;
}

export interface MemberWorkload {
  member: string;
  totalAssigned: number;
  completed: number;
  inProgress: number;
  todo: number;
  sharePercentage: number;
}

export interface EquityReport {
  isBalanced: boolean;
  maxTasks: number;
  minTasks: number;
  maxDiff: number;
  label: string;
}

export interface DeadlineBuckets {
  urgentOrSoon: Task[];
  upcoming: Task[];
  completed: Task[];
}

export const STORAGE_KEY = 'actividades_juntos_master_state_v2';

/**
 * Generates a clean 6-character invite code for a group (e.g. "HIS-304").
 */
export function generateGroupInviteCode(groupName: string, seedNum?: number): string {
  const letters = groupName
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚ]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'G');
  const num = seedNum ?? Math.floor(100 + (groupName.length * 37) % 899);
  return `${letters}-${num}`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a friendly short Spanish date (e.g. "20 nov").
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return 'Sin fecha';
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return dateStr;
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (isNaN(day) || monthIdx < 0 || monthIdx > 11) return dateStr;
  return `${day} ${months[monthIdx]}`;
}

/**
 * Calculates days difference and human-readable deadline urgency relative to a reference date.
 */
export function getDeadlineBadgeInfo(
  dueDateStr: string,
  status: TaskStatus,
  referenceDateStr = '2026-11-16'
): {
  daysLeft: number;
  label: string;
  tone: 'urgent' | 'soon' | 'normal' | 'done';
} {
  if (status === 'Terminado') {
    return {
      daysLeft: 0,
      label: 'Entregada',
      tone: 'done',
    };
  }

  const refTime = Date.parse(`${referenceDateStr}T00:00:00Z`);
  const dueTime = Date.parse(`${dueDateStr.trim()}T00:00:00Z`);
  if (isNaN(refTime) || isNaN(dueTime)) {
    return { daysLeft: 7, label: 'Próxima', tone: 'normal' };
  }

  const diffDays = Math.round((dueTime - refTime) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return {
      daysLeft: diffDays,
      label: `Venció hace ${Math.abs(diffDays)} d`,
      tone: 'urgent',
    };
  }
  if (diffDays === 0) {
    return {
      daysLeft: 0,
      label: 'Vence hoy',
      tone: 'urgent',
    };
  }
  if (diffDays <= 3) {
    return {
      daysLeft: diffDays,
      label: `En ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`,
      tone: 'soon',
    };
  }
  return {
    daysLeft: diffDays,
    label: `En ${diffDays} días`,
    tone: 'normal',
  };
}

/**
 * Organizes tasks chronologically into deadline buckets for the Calendar / Entregas view.
 */
export function groupTasksByDeadline(
  tasks: Task[],
  referenceDateStr = '2026-11-16'
): DeadlineBuckets {
  const sorted = [...tasks].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate)
  );

  const urgentOrSoon: Task[] = [];
  const upcoming: Task[] = [];
  const completed: Task[] = [];

  for (const task of sorted) {
    if (task.status === 'Terminado') {
      completed.push(task);
      continue;
    }
    const badge = getDeadlineBadgeInfo(
      task.dueDate,
      task.status,
      referenceDateStr
    );
    if (badge.tone === 'urgent' || badge.tone === 'soon') {
      urgentOrSoon.push(task);
    } else {
      upcoming.push(task);
    }
  }

  return { urgentOrSoon, upcoming, completed };
}

/**
 * Normalizes a URL string by trimming whitespace and adding https:// if no protocol is present.
 */
export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Checks whether an evidence URL is non-empty and structurally plausible.
 */
export function isValidEvidenceUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  const normalized = normalizeUrl(trimmed);
  try {
    const parsed = new URL(normalized);
    return Boolean(parsed.hostname && parsed.hostname.includes('.'));
  } catch {
    return false;
  }
}

/**
 * Regla Técnica Obligatoria ("Anti-Paseos"):
 * Bloquea el paso de una tarea a la columna "Terminado" si el campo "Enlace de Evidencia" está vacío.
 */
export function validateTaskTransition(
  task: Pick<Task, 'evidenceUrl' | 'title'>,
  targetStatus: TaskStatus
): ValidationResult {
  if (targetStatus === 'Terminado') {
    const trimmedEvidence = (task.evidenceUrl || '').trim();
    if (!trimmedEvidence) {
      return {
        valid: false,
        error: `Para mover "${task.title}" a Terminado debes adjuntar primero el enlace de tu evidencia (Google Docs, Canva, Drive o repositorio).`,
      };
    }
    if (!isValidEvidenceUrl(trimmedEvidence)) {
      return {
        valid: false,
        error: `El enlace "${trimmedEvidence}" no es válido. Ingresa una dirección real (ej. https://docs.google.com/...).`,
      };
    }
  }
  return { valid: true };
}

/**
 * Calcula automáticamente en tiempo real el progreso del grupo:
 * (Tareas Terminadas / Total de Tareas) * 100
 */
export function calculateGroupProgress(tasks: Task[]): GroupProgress {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'Terminado').length;
  const inProgress = tasks.filter((t) => t.status === 'En Progreso').length;
  const todo = tasks.filter((t) => t.status === 'Por Hacer').length;

  if (total === 0) {
    return {
      completed: 0,
      inProgress: 0,
      todo: 0,
      total: 0,
      percentage: 0,
      exactPercentage: 0,
    };
  }

  const exactPercentage = (completed / total) * 100;
  const percentage = Math.round(exactPercentage);

  return {
    completed,
    inProgress,
    todo,
    total,
    percentage,
    exactPercentage,
  };
}

/**
 * Calcula cuántas tareas tiene asignadas cada integrante del grupo y su desglose.
 */
export function calculateMemberWorkloads(
  members: string[],
  tasks: Task[]
): MemberWorkload[] {
  const totalTasks = tasks.length;

  return members.map((member) => {
    const memberTasks = tasks.filter(
      (t) => t.assignee.trim().toLowerCase() === member.trim().toLowerCase()
    );
    const totalAssigned = memberTasks.length;
    const completed = memberTasks.filter((t) => t.status === 'Terminado').length;
    const inProgress = memberTasks.filter((t) => t.status === 'En Progreso').length;
    const todo = memberTasks.filter((t) => t.status === 'Por Hacer').length;
    const sharePercentage =
      totalTasks === 0 ? 0 : Math.round((totalAssigned / totalTasks) * 100);

    return {
      member,
      totalAssigned,
      completed,
      inProgress,
      todo,
      sharePercentage,
    };
  });
}

/**
 * Evalúa si la carga de trabajo entre los integrantes del grupo está repartida con equidad.
 */
export function evaluateWorkloadEquity(
  members: string[],
  tasks: Task[]
): EquityReport {
  if (members.length === 0 || tasks.length === 0) {
    return {
      isBalanced: true,
      maxTasks: 0,
      minTasks: 0,
      maxDiff: 0,
      label: 'Sin tareas asignadas',
    };
  }

  const workloads = calculateMemberWorkloads(members, tasks);
  const counts = workloads.map((w) => w.totalAssigned);
  const maxTasks = Math.max(...counts);
  const minTasks = Math.min(...counts);
  const maxDiff = maxTasks - minTasks;
  const isBalanced = maxDiff <= 1;

  return {
    isBalanced,
    maxTasks,
    minTasks,
    maxDiff,
    label: isBalanced
      ? 'Reparto equitativo'
      : `Desbalance (${maxDiff} tareas de diferencia)`,
  };
}

/**
 * Pure state transition helpers for immutable Master JSON State updates.
 */
export function selectActiveGroup(state: AppState): Group | undefined {
  return (
    state.groups.find((g) => g.id === state.activeGroupId) || state.groups[0]
  );
}

export function createNewGroup(
  state: AppState,
  payload: {
    name: string;
    course: string;
    members: string[];
    coverUrl?: string;
    inviteCode?: string;
    id?: string;
    nowIso?: string;
  }
): AppState {
  const cleanName = payload.name.trim();
  const cleanCourse = payload.course.trim() || cleanName;
  const cleanMembers = Array.from(
    new Set(payload.members.map((m) => m.trim()).filter(Boolean))
  );

  if (!cleanName || cleanMembers.length === 0) {
    return state;
  }

  const newGroup: Group = {
    id: payload.id || `grp-${Date.now()}`,
    name: cleanName,
    course: cleanCourse,
    inviteCode:
      payload.inviteCode?.trim().toUpperCase() ||
      generateGroupInviteCode(cleanName, 100 + state.groups.length * 111),
    coverUrl: payload.coverUrl,
    members: cleanMembers,
    tasks: [],
    resources: [],
    createdAt: payload.nowIso || new Date().toISOString(),
  };

  return {
    groups: [...state.groups, newGroup],
    activeGroupId: newGroup.id,
  };
}

export function addMemberToGroup(
  state: AppState,
  groupId: string,
  memberName: string
): AppState {
  const cleanMember = memberName.trim();
  if (!cleanMember) return state;

  return {
    ...state,
    groups: state.groups.map((group) => {
      if (group.id !== groupId) return group;
      const exists = group.members.some(
        (m) => m.toLowerCase() === cleanMember.toLowerCase()
      );
      if (exists) return group;
      return {
        ...group,
        members: [...group.members, cleanMember],
      };
    }),
  };
}

export function createTaskInGroup(
  state: AppState,
  groupId: string,
  payload: {
    title: string;
    description?: string;
    assignee: string;
    dueDate?: string;
    priority?: Priority;
    status?: TaskStatus;
    evidenceUrl?: string;
    subtasks?: string[];
    id?: string;
    nowIso?: string;
  }
): { state: AppState; error?: string } {
  const cleanTitle = payload.title.trim();
  const cleanAssignee = payload.assignee.trim();
  const targetStatus: TaskStatus = payload.status || 'Por Hacer';
  const rawEvidence = (payload.evidenceUrl || '').trim();
  const normalizedEvidence = rawEvidence ? normalizeUrl(rawEvidence) : '';

  if (!cleanTitle) {
    return { state, error: 'Escribe el título de la tarea.' };
  }
  if (!cleanAssignee) {
    return { state, error: 'Selecciona un integrante responsable.' };
  }

  const validation = validateTaskTransition(
    { title: cleanTitle, evidenceUrl: normalizedEvidence },
    targetStatus
  );
  if (!validation.valid) {
    return { state, error: validation.error };
  }

  const now = payload.nowIso || new Date().toISOString();
  const initialSubtasks: Subtask[] = (payload.subtasks || [])
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      text,
      completed: false,
    }));

  const newTask: Task = {
    id: payload.id || `tsk-${Date.now()}`,
    title: cleanTitle,
    description: payload.description?.trim() || '',
    assignee: cleanAssignee,
    dueDate: payload.dueDate?.trim() || '2026-11-22',
    priority: payload.priority || 'Media',
    status: targetStatus,
    evidenceUrl: normalizedEvidence,
    evidenceReviewStatus: normalizedEvidence ? 'pendiente' : undefined,
    evidenceReviewNote: '',
    subtasks: initialSubtasks,
    createdAt: now,
    updatedAt: now,
  };

  const nextState: AppState = {
    ...state,
    groups: state.groups.map((group) =>
      group.id === groupId
        ? { ...group, tasks: [newTask, ...group.tasks] }
        : group
    ),
  };

  return { state: nextState };
}

export function toggleSubtaskInGroup(
  state: AppState,
  groupId: string,
  taskId: string,
  subtaskId: string
): AppState {
  return {
    ...state,
    groups: state.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            tasks: g.tasks.map((t) =>
              t.id !== taskId
                ? t
                : {
                    ...t,
                    subtasks: (t.subtasks || []).map((st) =>
                      st.id === subtaskId
                        ? { ...st, completed: !st.completed }
                        : st
                    ),
                  }
            ),
          }
    ),
  };
}

export function addSubtaskToTask(
  state: AppState,
  groupId: string,
  taskId: string,
  text: string
): AppState {
  const cleanText = text.trim();
  if (!cleanText) return state;

  const newSubtask: Subtask = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: cleanText,
    completed: false,
  };

  return {
    ...state,
    groups: state.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            tasks: g.tasks.map((t) =>
              t.id !== taskId
                ? t
                : {
                    ...t,
                    subtasks: [...(t.subtasks || []), newSubtask],
                  }
            ),
          }
    ),
  };
}

export function transitionTaskStatus(
  state: AppState,
  groupId: string,
  taskId: string,
  targetStatus: TaskStatus,
  nowIso?: string
): { state: AppState; error?: string; blockedTask?: Task } {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    return { state, error: 'Grupo no encontrado.' };
  }

  const task = group.tasks.find((t) => t.id === taskId);
  if (!task) {
    return { state, error: 'Tarea no encontrada.' };
  }

  const validation = validateTaskTransition(task, targetStatus);
  if (!validation.valid) {
    return {
      state,
      error: validation.error,
      blockedTask: task,
    };
  }

  const now = nowIso || new Date().toISOString();
  const nextState: AppState = {
    ...state,
    groups: state.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            tasks: g.tasks.map((t) =>
              t.id === taskId
                ? { ...t, status: targetStatus, updatedAt: now }
                : t
            ),
          }
    ),
  };

  return { state: nextState };
}

export function attachTaskEvidence(
  state: AppState,
  groupId: string,
  taskId: string,
  evidenceUrl: string,
  moveToCompleted = false,
  nowIso?: string
): { state: AppState; error?: string } {
  const trimmed = evidenceUrl.trim();
  const normalized = trimmed ? normalizeUrl(trimmed) : '';

  if (moveToCompleted && !isValidEvidenceUrl(normalized)) {
    return {
      state,
      error:
        'Pega un enlace válido (ej. https://docs.google.com/...) para terminar la tarea.',
    };
  }

  if (normalized && !isValidEvidenceUrl(normalized)) {
    return {
      state,
      error:
        'El formato del enlace no es válido. Ejemplo: https://docs.google.com/...',
    };
  }

  const now = nowIso || new Date().toISOString();
  const nextState: AppState = {
    ...state,
    groups: state.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            tasks: g.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    evidenceUrl: normalized,
                    evidenceReviewStatus: normalized
                      ? t.evidenceReviewStatus || 'pendiente'
                      : undefined,
                    status: moveToCompleted ? 'Terminado' : t.status,
                    updatedAt: now,
                  }
                : t
            ),
          }
    ),
  };

  return { state: nextState };
}

/**
 * Permite a los compañeros revisar la evidencia adjunta (Verificada / Observada / Pendiente) con una nota breve.
 */
export function reviewTaskEvidence(
  state: AppState,
  groupId: string,
  taskId: string,
  reviewStatus: EvidenceReviewStatus,
  reviewNote = '',
  nowIso?: string
): { state: AppState; error?: string } {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    return { state, error: 'Grupo no encontrado.' };
  }
  const task = group.tasks.find((t) => t.id === taskId);
  if (!task) {
    return { state, error: 'Tarea no encontrada.' };
  }
  if (!task.evidenceUrl.trim()) {
    return {
      state,
      error: 'Primero se debe adjuntar un enlace de evidencia antes de revisarlo.',
    };
  }

  const cleanNote = reviewNote.trim().slice(0, 120);
  const now = nowIso || new Date().toISOString();

  const nextState: AppState = {
    ...state,
    groups: state.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            tasks: g.tasks.map((t) =>
              t.id !== taskId
                ? t
                : {
                    ...t,
                    evidenceReviewStatus: reviewStatus,
                    evidenceReviewNote: cleanNote,
                    updatedAt: now,
                  }
            ),
          }
    ),
  };

  return { state: nextState };
}

export function deleteTask(
  state: AppState,
  groupId: string,
  taskId: string
): AppState {
  return {
    ...state,
    groups: state.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            tasks: g.tasks.filter((t) => t.id !== taskId),
          }
    ),
  };
}

export function addResourceToGroup(
  state: AppState,
  groupId: string,
  payload: {
    title: string;
    category: string;
    url: string;
    id?: string;
    nowIso?: string;
  }
): { state: AppState; error?: string } {
  const cleanTitle = payload.title.trim();
  const cleanCategory = payload.category.trim() || 'Recurso';
  const normalizedUrl = normalizeUrl(payload.url);

  if (!cleanTitle) {
    return { state, error: 'Escribe el nombre del enlace.' };
  }
  if (!isValidEvidenceUrl(normalizedUrl)) {
    return {
      state,
      error: 'Ingresa una dirección web válida (ej. drive.google.com/...).',
    };
  }

  const newResource: AnchoredResource = {
    id: payload.id || `res-${Date.now()}`,
    title: cleanTitle,
    category: cleanCategory,
    url: normalizedUrl,
    createdAt: payload.nowIso || new Date().toISOString(),
  };

  const nextState: AppState = {
    ...state,
    groups: state.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            resources: [...g.resources, newResource],
          }
    ),
  };

  return { state: nextState };
}

export function removeResourceFromGroup(
  state: AppState,
  groupId: string,
  resourceId: string
): AppState {
  return {
    ...state,
    groups: state.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            resources: g.resources.filter((r) => r.id !== resourceId),
          }
    ),
  };
}

/**
 * Catálogo de grupos escolares compartidos disponibles para unirse mediante código de invitación.
 */
export const JOINABLE_SCHOOL_GROUPS: Group[] = [
  {
    id: 'grp-cyt-305',
    name: 'Feria de Ciencias: Biofiltro',
    course: 'Ciencia y Tecnología',
    inviteCode: 'CYT-305',
    members: ['Elena Gómez', 'Gabriel Soto', 'Lucía Fernández'],
    createdAt: '2026-11-12T10:00:00.000Z',
    tasks: [
      {
        id: 'tsk-cyt-1',
        title: 'Hipótesis y variables del biofiltro casero',
        assignee: 'Elena Gómez',
        dueDate: '2026-11-16',
        priority: 'Alta',
        status: 'Terminado',
        evidenceUrl: 'https://docs.google.com/document/d/hipotesis-biofiltro-cyt',
        evidenceReviewStatus: 'verificada',
        evidenceReviewNote: 'Variables dependiente e independiente completas.',
        subtasks: [
          { id: 'scyt-1', text: 'Redactar pregunta de indagación', completed: true },
          { id: 'scyt-2', text: 'Validar materiales con el profesor', completed: true },
        ],
        createdAt: '2026-11-12T11:00:00.000Z',
        updatedAt: '2026-11-14T15:00:00.000Z',
      },
      {
        id: 'tsk-cyt-2',
        title: 'Registro fotográfico de pruebas de filtrado',
        assignee: 'Gabriel Soto',
        dueDate: '2026-11-17',
        priority: 'Alta',
        status: 'En Progreso',
        evidenceUrl: '',
        subtasks: [
          { id: 'scyt-3', text: 'Prueba con arena fina y carbón activado', completed: true },
          { id: 'scyt-4', text: 'Medir turbidez del agua filtrada', completed: false },
        ],
        createdAt: '2026-11-13T09:00:00.000Z',
        updatedAt: '2026-11-15T12:00:00.000Z',
      },
    ],
    resources: [
      {
        id: 'res-cyt-1',
        title: 'Guía de Laboratorio Feria de Ciencias (PDF)',
        category: 'Rúbrica PDF',
        url: 'https://drive.google.com/file/d/guia-feria-ciencias-2026/view',
        createdAt: '2026-11-12T10:30:00.000Z',
      },
    ],
  },
  {
    id: 'grp-art-412',
    name: 'Podcast Historia del Perú',
    course: 'Ciencias Sociales',
    inviteCode: 'HIS-412',
    members: ['Sebastián Mendoza', 'Camila Vargas'],
    createdAt: '2026-11-13T08:00:00.000Z',
    tasks: [
      {
        id: 'tsk-his-1',
        title: 'Guion del episodio 1: Cultura Chavín y Paracas',
        assignee: 'Camila Vargas',
        dueDate: '2026-11-18',
        priority: 'Alta',
        status: 'En Progreso',
        evidenceUrl: 'https://docs.google.com/document/d/guion-podcast-historia',
        evidenceReviewStatus: 'pendiente',
        subtasks: [
          { id: 'shis-1', text: 'Intro de 1 minuto', completed: true },
          { id: 'shis-2', text: 'Preguntas de entrevista', completed: false },
        ],
        createdAt: '2026-11-13T09:00:00.000Z',
        updatedAt: '2026-11-15T10:00:00.000Z',
      },
    ],
    resources: [
      {
        id: 'res-his-1',
        title: 'Carpeta de Audios y Efectos de Sonido',
        category: 'Carpeta Drive',
        url: 'https://drive.google.com/drive/folders/audios-podcast-historia',
        createdAt: '2026-11-13T08:30:00.000Z',
      },
    ],
  },
];

/**
 * Permite a un estudiante unirse a un grupo mediante su código de invitación (ej. "CYT-305" o "EPT-104").
 */
export function joinGroupByInviteCode(
  state: AppState,
  rawCode: string,
  studentName: string
): { state: AppState; joinedGroup?: Group; error?: string } {
  const normalizedCode = rawCode.trim().toUpperCase();
  const cleanStudent = studentName.trim() || 'Estudiante';

  if (!normalizedCode) {
    return {
      state,
      error: 'Ingresa el código de invitación del grupo (ej. CYT-305).',
    };
  }

  // 1. Check if the group is already in the student's workspace
  const existingGroup = state.groups.find(
    (g) => (g.inviteCode || '').toUpperCase() === normalizedCode
  );
  if (existingGroup) {
    const hasMember = existingGroup.members.some(
      (m) => m.toLowerCase() === cleanStudent.toLowerCase()
    );
    const updatedGroup: Group = hasMember
      ? existingGroup
      : {
          ...existingGroup,
          members: [cleanStudent, ...existingGroup.members],
        };

    return {
      state: {
        groups: state.groups.map((g) =>
          g.id === existingGroup.id ? updatedGroup : g
        ),
        activeGroupId: existingGroup.id,
      },
      joinedGroup: updatedGroup,
    };
  }

  // 2. Check in the shared school groups catalog
  const sharedTemplate = JOINABLE_SCHOOL_GROUPS.find(
    (g) => (g.inviteCode || '').toUpperCase() === normalizedCode
  );
  if (!sharedTemplate) {
    return {
      state,
      error: `No se encontró ningún grupo con el código "${normalizedCode}". Prueba con CYT-305 o HIS-412.`,
    };
  }

  const clonedGroup = JSON.parse(JSON.stringify(sharedTemplate)) as Group;
  const alreadyMember = clonedGroup.members.some(
    (m) => m.toLowerCase() === cleanStudent.toLowerCase()
  );
  if (!alreadyMember) {
    clonedGroup.members = [cleanStudent, ...clonedGroup.members];
  }

  return {
    state: {
      groups: [...state.groups, clonedGroup],
      activeGroupId: clonedGroup.id,
    },
    joinedGroup: clonedGroup,
  };
}

/**
 * Datos iniciales (Seed Data) con 2 grupos escolares realistas, códigos de invitación,
 * fechas de entrega, revisión de evidencias y subtareas.
 */
export const INITIAL_SEED_DATA: AppState = {
  activeGroupId: 'grp-ept-01',
  groups: [
    {
      id: 'grp-ept-01',
      name: 'Proyecto EPT',
      course: 'Educación para el Trabajo',
      inviteCode: 'EPT-104',
      members: [
        'Valeria Rojas',
        'Mateo Quispe',
        'Lucía Fernández',
        'Diego Paredes',
      ],
      createdAt: '2026-11-10T14:00:00.000Z',
      tasks: [
        {
          id: 'tsk-ept-1',
          title: 'Lienzo Lean Canvas en Canva',
          assignee: 'Valeria Rojas',
          dueDate: '2026-11-14',
          priority: 'Alta',
          status: 'Terminado',
          evidenceUrl:
            'https://www.canva.com/design/lean-canvas-ecoempaque-ept',
          evidenceReviewStatus: 'verificada',
          evidenceReviewNote: 'Los 9 bloques están completos y revisados.',
          subtasks: [
            { id: 's-1', text: 'Definir problema y cliente', completed: true },
            { id: 's-2', text: 'Completar propuesta de valor', completed: true },
          ],
          createdAt: '2026-11-10T15:30:00.000Z',
          updatedAt: '2026-11-12T18:20:00.000Z',
        },
        {
          id: 'tsk-ept-2',
          title: 'Tabla de costos y presupuesto en Excel',
          assignee: 'Mateo Quispe',
          dueDate: '2026-11-15',
          priority: 'Alta',
          status: 'Terminado',
          evidenceUrl:
            'https://docs.google.com/spreadsheets/d/presupuesto-ept-2026',
          evidenceReviewStatus: 'verificada',
          evidenceReviewNote: 'Fórmulas verificadas.',
          subtasks: [],
          createdAt: '2026-11-11T09:15:00.000Z',
          updatedAt: '2026-11-13T11:40:00.000Z',
        },
        {
          id: 'tsk-ept-3',
          title: 'Boceto y maqueta del empaque biodegradable',
          assignee: 'Lucía Fernández',
          dueDate: '2026-11-17',
          priority: 'Alta',
          status: 'En Progreso',
          evidenceUrl: '',
          subtasks: [
            { id: 's-3', text: 'Medidas de la caja base', completed: true },
            { id: 's-4', text: 'Diseño del logo ecológico', completed: true },
            { id: 's-5', text: 'Subir fotos de la maqueta', completed: false },
          ],
          createdAt: '2026-11-12T10:00:00.000Z',
          updatedAt: '2026-11-14T16:10:00.000Z',
        },
        {
          id: 'tsk-ept-4',
          title: 'Encuesta a 20 compañeros con gráficos',
          assignee: 'Diego Paredes',
          dueDate: '2026-11-18',
          priority: 'Media',
          status: 'En Progreso',
          evidenceUrl:
            'https://docs.google.com/forms/d/resultados-validacion-ept',
          evidenceReviewStatus: 'pendiente',
          evidenceReviewNote: 'Faltan 4 respuestas para llegar a 20.',
          subtasks: [
            { id: 's-6', text: 'Crear Google Forms', completed: true },
            { id: 's-7', text: 'Capturar gráficos finales', completed: false },
          ],
          createdAt: '2026-11-12T14:20:00.000Z',
          updatedAt: '2026-11-14T19:00:00.000Z',
        },
        {
          id: 'tsk-ept-5',
          title: 'Diapositivas finales para exposición (5 min)',
          assignee: 'Valeria Rojas',
          dueDate: '2026-11-21',
          priority: 'Media',
          status: 'Por Hacer',
          evidenceUrl: '',
          subtasks: [
            { id: 's-8', text: 'Portada y problema', completed: false },
            { id: 's-9', text: 'Fotos del prototipo', completed: false },
            { id: 's-10', text: 'Conclusiones del equipo', completed: false },
          ],
          createdAt: '2026-11-13T08:00:00.000Z',
          updatedAt: '2026-11-13T08:00:00.000Z',
        },
        {
          id: 'tsk-ept-6',
          title: 'Ficha resumen de materiales reciclables',
          assignee: 'Lucía Fernández',
          dueDate: '2026-11-22',
          priority: 'Baja',
          status: 'Por Hacer',
          evidenceUrl: '',
          subtasks: [],
          createdAt: '2026-11-14T12:00:00.000Z',
          updatedAt: '2026-11-14T12:00:00.000Z',
        },
      ],
      resources: [
        {
          id: 'res-ept-1',
          title: 'Rúbrica de Evaluación del Profesor (PDF)',
          category: 'Rúbrica PDF',
          url: 'https://drive.google.com/file/d/rubrica-oficial-ept-2026/view',
          createdAt: '2026-11-10T14:05:00.000Z',
        },
        {
          id: 'res-ept-2',
          title: 'Carpeta de Google Drive del Grupo',
          category: 'Carpeta Drive',
          url: 'https://drive.google.com/drive/folders/proyecto-ept-ecoempaque',
          createdAt: '2026-11-10T14:10:00.000Z',
        },
        {
          id: 'res-ept-3',
          title: 'Plantilla Canva del Proyecto',
          category: 'Plantilla Canva',
          url: 'https://www.canva.com/design/plantilla-equipo-ept',
          createdAt: '2026-11-11T16:00:00.000Z',
        },
      ],
    },
    {
      id: 'grp-com-02',
      name: 'Debate Comunicación',
      course: 'Comunicación · 5to Sec.',
      inviteCode: 'COM-208',
      members: ['Camila Vargas', 'Sebastián Mendoza', 'Andrea Torres'],
      createdAt: '2026-11-11T10:00:00.000Z',
      tasks: [
        {
          id: 'tsk-com-1',
          title: '3 argumentos principales con fuentes APA',
          assignee: 'Camila Vargas',
          dueDate: '2026-11-15',
          priority: 'Alta',
          status: 'Terminado',
          evidenceUrl:
            'https://docs.google.com/document/d/matriz-argumentos-apa7',
          evidenceReviewStatus: 'verificada',
          evidenceReviewNote: 'Citas APA 7 verificadas.',
          subtasks: [
            { id: 'sc-1', text: 'Redactar tesis del grupo', completed: true },
            { id: 'sc-2', text: 'Citar 3 artículos confiables', completed: true },
          ],
          createdAt: '2026-11-11T11:00:00.000Z',
          updatedAt: '2026-11-13T17:30:00.000Z',
        },
        {
          id: 'tsk-com-2',
          title: 'Respuestas a posibles preguntas del otro equipo',
          assignee: 'Sebastián Mendoza',
          dueDate: '2026-11-18',
          priority: 'Alta',
          status: 'En Progreso',
          evidenceUrl: '',
          subtasks: [
            { id: 'sc-3', text: 'Anotar 3 contraargumentos', completed: true },
            { id: 'sc-4', text: 'Buscar datos de respaldo', completed: false },
          ],
          createdAt: '2026-11-12T09:30:00.000Z',
          updatedAt: '2026-11-14T15:00:00.000Z',
        },
        {
          id: 'tsk-com-3',
          title: 'Fichas de apoyo para leer en el debate',
          assignee: 'Andrea Torres',
          dueDate: '2026-11-20',
          priority: 'Media',
          status: 'Por Hacer',
          evidenceUrl: '',
          subtasks: [],
          createdAt: '2026-11-13T14:00:00.000Z',
          updatedAt: '2026-11-13T14:00:00.000Z',
        },
        {
          id: 'tsk-com-4',
          title: 'Conclusión final de 2 minutos',
          assignee: 'Camila Vargas',
          dueDate: '2026-11-21',
          priority: 'Media',
          status: 'Por Hacer',
          evidenceUrl: '',
          subtasks: [],
          createdAt: '2026-11-14T10:15:00.000Z',
          updatedAt: '2026-11-14T10:15:00.000Z',
        },
      ],
      resources: [
        {
          id: 'res-com-1',
          title: 'Reglas y Rúbrica del Debate Escolar',
          category: 'Rúbrica PDF',
          url: 'https://drive.google.com/file/d/rubrica-debate-comunicacion/view',
          createdAt: '2026-11-11T10:15:00.000Z',
        },
        {
          id: 'res-com-2',
          title: 'Documento compartido de argumentos (Docs)',
          category: 'Carpeta Drive',
          url: 'https://docs.google.com/document/d/debate-equipo-comunicacion',
          createdAt: '2026-11-11T10:25:00.000Z',
        },
      ],
    },
  ],
};
