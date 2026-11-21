export type Priority = 'Alta' | 'Media' | 'Baja';
export type TaskStatus = 'Por Hacer' | 'En Progreso' | 'Terminado';
export type EvidenceReviewStatus =
  | 'pendiente'
  | 'verificada'
  | 'observada'
  | 'rechazada';

export interface ActorInfo {
  id?: string;
  displayName: string;
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskEditChange {
  field: string;
  from: string;
  to: string;
}

export interface TaskEditRecord {
  id: string;
  editorId?: string;
  editorName: string;
  editedAt: string;
  summary: string;
  changes: TaskEditChange[];
}

export type ActivityLogType =
  | 'group_created'
  | 'task_created'
  | 'task_started'
  | 'task_completed'
  | 'task_reopened'
  | 'evidence_attached'
  | 'evidence_verified'
  | 'evidence_rejected'
  | 'coordinator_note'
  | 'teacher_graded'
  | 'member_joined'
  | 'member_kicked';

export interface ActivityLogEntry {
  id: string;
  type: ActivityLogType;
  actorName: string;
  taskId?: string;
  taskTitle?: string;
  detail: string;
  timestamp: string;
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
  coordinatorNote?: string;
  coordinatorNoteBy?: string;
  coordinatorNoteUpdatedAt?: string;
  teacherRating?: number;
  teacherComment?: string;
  startedAt?: string;
  completedAt?: string;
  editHistory?: TaskEditRecord[];
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
  creatorId?: string;
  creatorName?: string;
  inviteCode?: string;
  coverUrl?: string;
  memberIds?: string[];
  members: string[];
  tasks: Task[];
  resources: AnchoredResource[];
  activityLog?: ActivityLogEntry[];
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

export interface MemberPerformanceStats {
  member: string;
  totalAssigned: number;
  completedCount: number;
  earlyCount: number;
  earlyDeliveryPct: number;
  averageDaysEarly: number;
  completionPct: number;
  gradedCount: number;
  highGradeCount: number;
  averageTeacherGrade: number | null;
  latestTeacherComment: string;
  performanceScore: number;
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

export const PROJECT_LIMITS = {
  GROUP_NAME_MAX: 100,
  GROUP_COURSE_MAX: 100,
  TASK_TITLE_MAX: 160,
  MEMBER_NAME_MAX: 80,
  RESOURCE_TITLE_MAX: 160,
  RESOURCE_CATEGORY_MAX: 60,
  URL_MAX: 500,
  SUBTASK_MAX: 120,
  REVIEW_NOTE_MAX: 120,
  COORDINATOR_NOTE_MAX: 240,
  TEACHER_COMMENT_MAX: 200,
  MAX_SUBTASKS_PER_TASK: 25,
  MAX_MEMBERS_PER_GROUP: 20,
  MAX_EDIT_HISTORY_PER_TASK: 40,
  MAX_ACTIVITY_LOG_PER_GROUP: 80,
} as const;

/**
 * Returns today's local date in ISO YYYY-MM-DD format.
 */
export function getTodayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a date offset by `daysOffset` from today in ISO YYYY-MM-DD format.
 */
export function getOffsetIsoDate(daysOffset: number, now = new Date()): string {
  const target = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  return getTodayIsoDate(target);
}

/**
 * Generates a clean 6-character invite code for a group (e.g. "HIS-304").
 */
export function generateGroupInviteCode(groupName: string, seedNum?: number): string {
  const letters = groupName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'G');
  const num =
    seedNum !== undefined
      ? Math.max(100, Math.min(999, Math.floor(seedNum)))
      : Math.floor(100 + Math.random() * 900);
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

const SPANISH_SHORT_MONTHS = [
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

/**
 * Formats an ISO timestamp into readable exact date & hour:min (e.g. "20 nov 2026 · 17:45").
 */
export function formatExactDateTime(isoStr?: string): string {
  if (!isoStr || !isoStr.trim()) return 'Sin registro';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  const day = date.getDate();
  const month = SPANISH_SHORT_MONTHS[date.getMonth()] || '';
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hh}:${mm}`;
}

/**
 * Formats an ISO timestamp with exact seconds for private change audit logs (e.g. "20 nov 2026 · 17:45:09").
 */
export function formatExactTimeWithSeconds(isoStr?: string): string {
  if (!isoStr || !isoStr.trim()) return 'Sin registro';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  const day = date.getDate();
  const month = SPANISH_SHORT_MONTHS[date.getMonth()] || '';
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hh}:${mm}:${ss}`;
}

/**
 * Determines whether the given student is the creator (highest rank) of the group.
 */
export function isGroupCreator(
  group: Pick<Group, 'creatorId' | 'creatorName' | 'members'>,
  actor?: ActorInfo | null
): boolean {
  if (!actor) return false;
  if (group.creatorId && actor.id && group.creatorId === actor.id) {
    return true;
  }
  const effectiveCreatorName = group.creatorName || group.members[0] || '';
  if (!effectiveCreatorName || !actor.displayName) return false;
  return (
    effectiveCreatorName.trim().toLowerCase() ===
    actor.displayName.trim().toLowerCase()
  );
}

/**
 * Returns true if the task delivery was rejected / marked for correction by the group creator.
 */
export function isTaskRejected(
  task: Pick<Task, 'evidenceReviewStatus'>
): boolean {
  return (
    task.evidenceReviewStatus === 'rechazada' ||
    task.evidenceReviewStatus === 'observada'
  );
}

/**
 * Returns true if the actor is allowed to edit/correct a submitted task (either its assignee or the group creator).
 */
export function canEditTask(
  group: Pick<Group, 'creatorId' | 'creatorName' | 'members'>,
  task: Pick<Task, 'assignee'>,
  actor?: ActorInfo | null
): boolean {
  if (!actor) return false;
  if (isGroupCreator(group, actor)) return true;
  return (
    task.assignee.trim().toLowerCase() === actor.displayName.trim().toLowerCase()
  );
}

/**
 * Privacy rule (#4): Only the student who made a modification and the group creator
 * can see that task's edit history. Other teammates receive an empty list.
 */
export function getVisibleTaskEditHistory(
  task: Pick<Task, 'editHistory'>,
  group: Pick<Group, 'creatorId' | 'creatorName' | 'members'>,
  viewer?: ActorInfo | null
): TaskEditRecord[] {
  const history = task.editHistory || [];
  if (!viewer || history.length === 0) return [];
  if (isGroupCreator(group, viewer)) {
    return history;
  }
  const viewerNameLower = viewer.displayName.trim().toLowerCase();
  return history.filter((record) => {
    if (record.editorId && viewer.id && record.editorId === viewer.id) {
      return true;
    }
    return record.editorName.trim().toLowerCase() === viewerNameLower;
  });
}

function appendActivityLog(
  group: Group,
  entry: Omit<ActivityLogEntry, 'id'>
): ActivityLogEntry[] {
  const fullEntry: ActivityLogEntry = {
    ...entry,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  return [fullEntry, ...(group.activityLog || [])].slice(
    0,
    PROJECT_LIMITS.MAX_ACTIVITY_LOG_PER_GROUP
  );
}

/**
 * Calculates days difference and human-readable deadline urgency relative to a reference date.
 */
export function getDeadlineBadgeInfo(
  dueDateStr: string,
  status: TaskStatus,
  referenceDateStr?: string
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

  const effectiveRefDate = referenceDateStr || getTodayIsoDate();
  const refTime = Date.parse(`${effectiveRefDate}T00:00:00Z`);
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
  referenceDateStr?: string
): DeadlineBuckets {
  const effectiveRefDate = referenceDateStr || getTodayIsoDate();
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
      effectiveRefDate
    );
    if (badge.tone === 'urgent' || badge.tone === 'soon') {
      urgentOrSoon.push(task);
    } else {
      upcoming.push(task);
    }
  }

  return { urgentOrSoon, upcoming, completed };
}

const DANGEROUS_SCHEME_PATTERN =
  /^\s*(javascript|data|vbscript|file|blob|about)\s*:/i;

/**
 * Strictly validates and sanitizes external URLs to prevent XSS/protocol injection
 * (blocks javascript:, data:, vbscript:, file:, blob:, and non-HTTP(S) schemes).
 */
export function sanitizeSafeHttpUrl(rawUrl: string): string | null {
  if (typeof rawUrl !== 'string') return null;
  // Strip invisible control characters that could evade naive scheme checks
  const cleaned = rawUrl.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned || cleaned.length > PROJECT_LIMITS.URL_MAX) return null;
  if (DANGEROUS_SCHEME_PATTERN.test(cleaned)) return null;

  // Reject any explicit non-http(s) protocol (e.g. ftp:, mailto:, custom:)
  const explicitSchemeMatch = cleaned.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (
    explicitSchemeMatch &&
    explicitSchemeMatch[1].toLowerCase() !== 'http' &&
    explicitSchemeMatch[1].toLowerCase() !== 'https'
  ) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return null;
    }
    if (parsed.href.length > PROJECT_LIMITS.URL_MAX) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Normalizes a safe HTTP/HTTPS URL string. Returns '' if empty or unsafe.
 */
export function normalizeUrl(rawUrl: string): string {
  const safe = sanitizeSafeHttpUrl(rawUrl);
  return safe || '';
}

/**
 * Checks whether an evidence or resource URL is a valid, safe HTTP/HTTPS URL.
 */
export function isValidEvidenceUrl(rawUrl: string): boolean {
  return sanitizeSafeHttpUrl(rawUrl) !== null;
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
    memberIds?: string[];
    creatorId?: string;
    creatorName?: string;
    coverUrl?: string;
    inviteCode?: string;
    id?: string;
    nowIso?: string;
  }
): AppState {
  const cleanName = payload.name.trim().slice(0, PROJECT_LIMITS.GROUP_NAME_MAX);
  const cleanCourse = (payload.course.trim() || cleanName).slice(
    0,
    PROJECT_LIMITS.GROUP_COURSE_MAX
  );
  const cleanMembers = Array.from(
    new Set(
      payload.members
        .map((m) => m.trim().slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX))
        .filter(Boolean)
    )
  ).slice(0, PROJECT_LIMITS.MAX_MEMBERS_PER_GROUP);

  if (!cleanName || cleanMembers.length === 0) {
    return state;
  }

  const now = payload.nowIso || new Date().toISOString();
  const resolvedCreatorName = (
    payload.creatorName?.trim() || cleanMembers[0]
  ).slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX);
  const resolvedMemberIds = payload.memberIds
    ? Array.from(new Set(payload.memberIds.filter(Boolean))).slice(
        0,
        PROJECT_LIMITS.MAX_MEMBERS_PER_GROUP
      )
    : payload.creatorId
    ? [payload.creatorId]
    : [];

  const newGroup: Group = {
    id: payload.id || `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    course: cleanCourse,
    creatorId: payload.creatorId,
    creatorName: resolvedCreatorName,
    inviteCode:
      payload.inviteCode?.trim().toUpperCase().slice(0, 12) ||
      generateGroupInviteCode(cleanName),
    coverUrl: payload.coverUrl,
    memberIds: resolvedMemberIds,
    members: cleanMembers,
    tasks: [],
    resources: [],
    activityLog: [
      {
        id: `act-init-${Date.now()}`,
        type: 'group_created',
        actorName: resolvedCreatorName,
        detail: `Creó el grupo "${cleanName}" (${cleanCourse})`,
        timestamp: now,
      },
    ],
    createdAt: now,
  };

  return {
    groups: [...state.groups, newGroup],
    activeGroupId: newGroup.id,
  };
}

export function addMemberToGroup(
  state: AppState,
  groupId: string,
  memberName: string,
  actor?: ActorInfo,
  nowIso?: string
): AppState {
  const cleanMember = memberName.trim().slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX);
  if (!cleanMember) return state;
  const now = nowIso || new Date().toISOString();

  return {
    ...state,
    groups: state.groups.map((group) => {
      if (group.id !== groupId) return group;
      if (actor && !isGroupCreator(group, actor)) return group;
      if (group.members.length >= PROJECT_LIMITS.MAX_MEMBERS_PER_GROUP) {
        return group;
      }
      const exists = group.members.some(
        (m) => m.toLowerCase() === cleanMember.toLowerCase()
      );
      if (exists) return group;
      return {
        ...group,
        members: [...group.members, cleanMember],
        activityLog: appendActivityLog(group, {
          type: 'member_joined',
          actorName: actor?.displayName || cleanMember,
          detail: `${cleanMember} se unió al equipo`,
          timestamp: now,
        }),
      };
    }),
  };
}

/**
 * Creator-only (#3): Removes (kicks) a student from the group.
 */
export function kickMemberFromGroup(
  state: AppState,
  groupId: string,
  targetMemberName: string,
  actor: ActorInfo,
  nowIso?: string
): { state: AppState; error?: string } {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    return { state, error: 'Grupo no encontrado.' };
  }
  if (!isGroupCreator(group, actor)) {
    return {
      state,
      error: 'Solo el creador del grupo tiene permiso para expulsar integrantes.',
    };
  }
  const cleanTarget = targetMemberName.trim();
  if (!cleanTarget) {
    return { state, error: 'Selecciona un integrante válido.' };
  }
  const creatorName = (group.creatorName || group.members[0] || '').trim();
  if (cleanTarget.toLowerCase() === creatorName.toLowerCase()) {
    return {
      state,
      error: 'El creador del grupo no puede expulsarse a sí mismo.',
    };
  }
  const exists = group.members.some(
    (m) => m.toLowerCase() === cleanTarget.toLowerCase()
  );
  if (!exists) {
    return { state, error: 'El estudiante no pertenece a este grupo.' };
  }

  const now = nowIso || new Date().toISOString();
  const nextState: AppState = {
    ...state,
    groups: state.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            members: g.members.filter(
              (m) => m.toLowerCase() !== cleanTarget.toLowerCase()
            ),
            activityLog: appendActivityLog(g, {
              type: 'member_kicked',
              actorName: actor.displayName,
              detail: `Expulsó a ${cleanTarget} del grupo`,
              timestamp: now,
            }),
          }
    ),
  };

  return { state: nextState };
}

/**
 * Creator-only: Permanently dissolves (deletes) a group and shifts activeGroupId
 * safely to the next remaining group or '' when no groups remain.
 */
export function dissolveGroup(
  state: AppState,
  groupId: string,
  actor: ActorInfo
): { state: AppState; dissolvedGroup?: Group; error?: string } {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    return { state, error: 'Grupo no encontrado.' };
  }
  if (!isGroupCreator(group, actor)) {
    return {
      state,
      error: 'Solo el creador del grupo tiene permiso para disolverlo.',
    };
  }

  const remainingGroups = state.groups.filter((g) => g.id !== groupId);
  const nextActiveGroupId =
    state.activeGroupId === groupId
      ? remainingGroups[0]?.id || ''
      : remainingGroups.some((g) => g.id === state.activeGroupId)
      ? state.activeGroupId
      : remainingGroups[0]?.id || '';

  return {
    state: {
      groups: remainingGroups,
      activeGroupId: nextActiveGroupId,
    },
    dissolvedGroup: group,
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
    actorName?: string;
  }
): { state: AppState; error?: string } {
  const cleanTitle = payload.title.trim().slice(0, PROJECT_LIMITS.TASK_TITLE_MAX);
  const cleanAssignee = payload.assignee
    .trim()
    .slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX);
  const targetStatus: TaskStatus = payload.status || 'Por Hacer';
  const rawEvidence = (payload.evidenceUrl || '').trim();
  const safeEvidence = rawEvidence ? sanitizeSafeHttpUrl(rawEvidence) : '';

  if (!cleanTitle) {
    return { state, error: 'Escribe el título de la tarea.' };
  }
  if (!cleanAssignee) {
    return { state, error: 'Selecciona un integrante responsable.' };
  }
  if (rawEvidence && !safeEvidence) {
    return {
      state,
      error:
        'El enlace de evidencia no es seguro o válido. Usa una dirección web real (https://...).',
    };
  }

  const normalizedEvidence = safeEvidence || '';
  const validation = validateTaskTransition(
    { title: cleanTitle, evidenceUrl: normalizedEvidence },
    targetStatus
  );
  if (!validation.valid) {
    return { state, error: validation.error };
  }

  const now = payload.nowIso || new Date().toISOString();
  const initialSubtasks: Subtask[] = (payload.subtasks || [])
    .map((s) => s.trim().slice(0, PROJECT_LIMITS.SUBTASK_MAX))
    .filter(Boolean)
    .slice(0, PROJECT_LIMITS.MAX_SUBTASKS_PER_TASK)
    .map((text, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      text,
      completed: false,
    }));

  const newTask: Task = {
    id: payload.id || `tsk-${Date.now()}`,
    title: cleanTitle,
    description: payload.description?.trim().slice(0, 300) || '',
    assignee: cleanAssignee,
    dueDate: payload.dueDate?.trim().slice(0, 30) || getOffsetIsoDate(3),
    priority: payload.priority || 'Media',
    status: targetStatus,
    evidenceUrl: normalizedEvidence,
    evidenceReviewStatus: normalizedEvidence ? 'pendiente' : undefined,
    evidenceReviewNote: '',
    startedAt:
      targetStatus === 'En Progreso' || targetStatus === 'Terminado'
        ? now
        : undefined,
    completedAt: targetStatus === 'Terminado' ? now : undefined,
    editHistory: [],
    subtasks: initialSubtasks,
    createdAt: now,
    updatedAt: now,
  };

  const nextState: AppState = {
    ...state,
    groups: state.groups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            tasks: [newTask, ...group.tasks],
            activityLog: appendActivityLog(group, {
              type: 'task_created',
              actorName: payload.actorName || cleanAssignee,
              taskId: newTask.id,
              taskTitle: newTask.title,
              detail: `Creó la tarea "${newTask.title}" asignada a ${cleanAssignee}`,
              timestamp: now,
            }),
          }
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
  const cleanText = text.trim().slice(0, PROJECT_LIMITS.SUBTASK_MAX);
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
            tasks: g.tasks.map((t) => {
              if (t.id !== taskId) return t;
              const current = t.subtasks || [];
              if (current.length >= PROJECT_LIMITS.MAX_SUBTASKS_PER_TASK) {
                return t;
              }
              return {
                ...t,
                subtasks: [...current, newSubtask],
              };
            }),
          }
    ),
  };
}

export function transitionTaskStatus(
  state: AppState,
  groupId: string,
  taskId: string,
  targetStatus: TaskStatus,
  nowIso?: string,
  actor?: ActorInfo
): { state: AppState; error?: string; blockedTask?: Task } {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    return { state, error: 'Grupo no encontrado.' };
  }

  if (actor && !isGroupCreator(group, actor)) {
    return {
      state,
      error:
        'Solo el creador del grupo puede mover tareas entre Por Hacer, En Progreso y Terminado.',
    };
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
  const nextStartedAt =
    targetStatus === 'En Progreso' || targetStatus === 'Terminado'
      ? task.startedAt || now
      : task.startedAt;
  const nextCompletedAt =
    targetStatus === 'Terminado' ? now : undefined;

  const logType: ActivityLogType =
    targetStatus === 'Terminado'
      ? 'task_completed'
      : targetStatus === 'En Progreso'
      ? 'task_started'
      : 'task_reopened';

  const logDetail =
    targetStatus === 'Terminado'
      ? `Marcó "${task.title}" como Terminado`
      : targetStatus === 'En Progreso'
      ? `Inició / pasó "${task.title}" a En Progreso`
      : `Movió "${task.title}" de vuelta a Por Hacer`;

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
                    status: targetStatus,
                    startedAt: nextStartedAt,
                    completedAt: nextCompletedAt,
                    updatedAt: now,
                  }
                : t
            ),
            activityLog: appendActivityLog(g, {
              type: logType,
              actorName: actor?.displayName || task.assignee,
              taskId: task.id,
              taskTitle: task.title,
              detail: logDetail,
              timestamp: now,
            }),
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
  nowIso?: string,
  actor?: ActorInfo
): { state: AppState; error?: string } {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    return { state, error: 'Grupo no encontrado.' };
  }
  const existingTask = group.tasks.find((t) => t.id === taskId);
  if (!existingTask) {
    return { state, error: 'Tarea no encontrada.' };
  }

  if (moveToCompleted && actor && !isGroupCreator(group, actor)) {
    return {
      state,
      error:
        'Solo el creador del grupo puede mover la tarea a Terminado. Puedes guardar tu evidencia para revisión.',
    };
  }

  const trimmed = evidenceUrl.trim();
  const safeUrl = trimmed ? sanitizeSafeHttpUrl(trimmed) : '';

  if (moveToCompleted && !safeUrl) {
    return {
      state,
      error:
        'Pega un enlace seguro y válido (ej. https://docs.google.com/...) para terminar la tarea.',
    };
  }

  if (trimmed && !safeUrl) {
    return {
      state,
      error:
        'El enlace no es válido o usa un protocolo no permitido. Ejemplo: https://docs.google.com/...',
    };
  }

  const normalized = safeUrl || '';
  const now = nowIso || new Date().toISOString();
  const urlChanged = existingTask.evidenceUrl !== normalized;
  const wasRejected = isTaskRejected(existingTask);

  const editRecord: TaskEditRecord | null =
    urlChanged && actor && existingTask.evidenceUrl
      ? {
          id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          editorId: actor.id,
          editorName: actor.displayName,
          editedAt: now,
          summary: 'Corrigió el enlace de evidencia',
          changes: [
            {
              field: 'Enlace de evidencia',
              from: existingTask.evidenceUrl || '(vacío)',
              to: normalized || '(eliminado)',
            },
          ],
        }
      : null;

  const nextState: AppState = {
    ...state,
    groups: state.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            tasks: g.tasks.map((t) => {
              if (t.id !== taskId) return t;
              const nextReviewStatus: EvidenceReviewStatus | undefined =
                !normalized
                  ? undefined
                  : wasRejected && urlChanged
                  ? 'pendiente'
                  : t.evidenceReviewStatus || 'pendiente';
              return {
                ...t,
                evidenceUrl: normalized,
                evidenceReviewStatus: nextReviewStatus,
                status: moveToCompleted ? 'Terminado' : t.status,
                startedAt:
                  moveToCompleted || normalized
                    ? t.startedAt || now
                    : t.startedAt,
                completedAt: moveToCompleted ? now : t.completedAt,
                editHistory: editRecord
                  ? [editRecord, ...(t.editHistory || [])].slice(
                      0,
                      PROJECT_LIMITS.MAX_EDIT_HISTORY_PER_TASK
                    )
                  : t.editHistory,
                updatedAt: now,
              };
            }),
            activityLog: normalized
              ? appendActivityLog(g, {
                  type: moveToCompleted ? 'task_completed' : 'evidence_attached',
                  actorName: actor?.displayName || existingTask.assignee,
                  taskId: existingTask.id,
                  taskTitle: existingTask.title,
                  detail: moveToCompleted
                    ? `Adjuntó evidencia y completó "${existingTask.title}"`
                    : `Envió enlace de evidencia en "${existingTask.title}"`,
                  timestamp: now,
                })
              : g.activityLog,
          }
    ),
  };

  return { state: nextState };
}

/**
 * Allows the task assignee or group creator to edit/fix a submitted task (#4).
 * Records the exact date and time in `task.editHistory` (privately visible ONLY to the editor and the creator).
 */
export function editTaskInGroup(
  state: AppState,
  groupId: string,
  taskId: string,
  updates: {
    title?: string;
    assignee?: string;
    dueDate?: string;
    evidenceUrl?: string;
    priority?: Priority;
  },
  actor: ActorInfo,
  nowIso?: string
): { state: AppState; error?: string; recordedEdit?: TaskEditRecord } {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    return { state, error: 'Grupo no encontrado.' };
  }
  const task = group.tasks.find((t) => t.id === taskId);
  if (!task) {
    return { state, error: 'Tarea no encontrada.' };
  }
  if (!canEditTask(group, task, actor)) {
    return {
      state,
      error:
        'Solo el estudiante responsable de esta tarea o el creador del grupo pueden corregirla.',
    };
  }

  const isCreator = isGroupCreator(group, actor);
  const nextTitle =
    updates.title !== undefined
      ? updates.title.trim().slice(0, PROJECT_LIMITS.TASK_TITLE_MAX)
      : task.title;
  if (!nextTitle) {
    return { state, error: 'El título de la tarea no puede quedar vacío.' };
  }

  const nextAssignee =
    updates.assignee !== undefined && isCreator
      ? updates.assignee.trim().slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX)
      : task.assignee;
  if (!nextAssignee) {
    return { state, error: 'Selecciona un integrante responsable.' };
  }

  const nextDueDate =
    updates.dueDate !== undefined
      ? updates.dueDate.trim().slice(0, 30) || task.dueDate
      : task.dueDate;

  const nextPriority = updates.priority || task.priority;

  let nextEvidenceUrl = task.evidenceUrl;
  if (updates.evidenceUrl !== undefined) {
    const trimmedUrl = updates.evidenceUrl.trim();
    if (trimmedUrl) {
      const safe = sanitizeSafeHttpUrl(trimmedUrl);
      if (!safe) {
        return {
          state,
          error:
            'El enlace de evidencia no es válido o usa un protocolo no permitido. Ejemplo: https://docs.google.com/...',
        };
      }
      nextEvidenceUrl = safe;
    } else {
      if (task.status === 'Terminado') {
        return {
          state,
          error:
            'Una tarea terminada debe conservar un enlace de evidencia válido.',
        };
      }
      nextEvidenceUrl = '';
    }
  }

  const changes: TaskEditChange[] = [];
  if (nextTitle !== task.title) {
    changes.push({ field: 'Título', from: task.title, to: nextTitle });
  }
  if (nextAssignee !== task.assignee) {
    changes.push({
      field: 'Responsable',
      from: task.assignee,
      to: nextAssignee,
    });
  }
  if (nextDueDate !== task.dueDate) {
    changes.push({
      field: 'Fecha de entrega',
      from: formatShortDate(task.dueDate),
      to: formatShortDate(nextDueDate),
    });
  }
  if (nextEvidenceUrl !== task.evidenceUrl) {
    changes.push({
      field: 'Enlace de evidencia',
      from: task.evidenceUrl || '(sin enlace)',
      to: nextEvidenceUrl || '(eliminado)',
    });
  }
  if (nextPriority !== task.priority) {
    changes.push({
      field: 'Prioridad',
      from: task.priority,
      to: nextPriority,
    });
  }

  if (changes.length === 0) {
    return { state, error: 'No realizaste ningún cambio para guardar.' };
  }

  const now = nowIso || new Date().toISOString();
  const fieldNames = changes.map((c) => c.field.toLowerCase()).join(', ');
  const editRecord: TaskEditRecord = {
    id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    editorId: actor.id,
    editorName: actor.displayName,
    editedAt: now,
    summary: `Corrigió: ${fieldNames}`,
    changes,
  };

  // If the task was rejected and the assignee updated it, reset review status to 'pendiente'
  const wasRejected = isTaskRejected(task);
  const nextReviewStatus: EvidenceReviewStatus | undefined = !nextEvidenceUrl
    ? undefined
    : wasRejected
    ? 'pendiente'
    : task.evidenceReviewStatus || 'pendiente';

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
                    title: nextTitle,
                    assignee: nextAssignee,
                    dueDate: nextDueDate,
                    priority: nextPriority,
                    evidenceUrl: nextEvidenceUrl,
                    evidenceReviewStatus: nextReviewStatus,
                    editHistory: [editRecord, ...(t.editHistory || [])].slice(
                      0,
                      PROJECT_LIMITS.MAX_EDIT_HISTORY_PER_TASK
                    ),
                    updatedAt: now,
                  }
            ),
          }
    ),
  };

  return { state: nextState, recordedEdit: editRecord };
}

/**
 * Creator-only (#3): Leaves or updates a direct guidance note for the student working on a task.
 */
export function setTaskCoordinatorNote(
  state: AppState,
  groupId: string,
  taskId: string,
  note: string,
  actor: ActorInfo,
  nowIso?: string
): { state: AppState; error?: string } {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    return { state, error: 'Grupo no encontrado.' };
  }
  if (!isGroupCreator(group, actor)) {
    return {
      state,
      error:
        'Solo el creador del grupo puede dejar notas de coordinación en las tareas.',
    };
  }
  const task = group.tasks.find((t) => t.id === taskId);
  if (!task) {
    return { state, error: 'Tarea no encontrada.' };
  }

  const cleanNote = note.trim().slice(0, PROJECT_LIMITS.COORDINATOR_NOTE_MAX);
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
                    coordinatorNote: cleanNote,
                    coordinatorNoteBy: cleanNote ? actor.displayName : undefined,
                    coordinatorNoteUpdatedAt: cleanNote ? now : undefined,
                    updatedAt: now,
                  }
            ),
            activityLog: cleanNote
              ? appendActivityLog(g, {
                  type: 'coordinator_note',
                  actorName: actor.displayName,
                  taskId: task.id,
                  taskTitle: task.title,
                  detail: `Dejó una nota para ${task.assignee} en "${task.title}"`,
                  timestamp: now,
                })
              : g.activityLog,
          }
    ),
  };

  return { state: nextState };
}

/**
 * Reviews attached evidence (Verificada / Rechazada / Pendiente) with a short note.
 * When `actor` is provided, only the group creator may verify or reject.
 */
export function reviewTaskEvidence(
  state: AppState,
  groupId: string,
  taskId: string,
  reviewStatus: EvidenceReviewStatus,
  reviewNote = '',
  nowIso?: string,
  actor?: ActorInfo
): { state: AppState; error?: string } {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    return { state, error: 'Grupo no encontrado.' };
  }
  if (actor && !isGroupCreator(group, actor)) {
    return {
      state,
      error: 'Solo el creador del grupo puede aprobar o rechazar entregas.',
    };
  }
  const task = group.tasks.find((t) => t.id === taskId);
  if (!task) {
    return { state, error: 'Tarea no encontrada.' };
  }
  const isRejection =
    reviewStatus === 'rechazada' || reviewStatus === 'observada';
  if (!isRejection && !task.evidenceUrl.trim()) {
    return {
      state,
      error:
        'Primero se debe adjuntar un enlace de evidencia antes de revisarlo.',
    };
  }

  const cleanNote = reviewNote.trim().slice(0, PROJECT_LIMITS.REVIEW_NOTE_MAX);
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
                    // If rejected while already Terminado, move back to En Progreso so the student corrects it
                    status:
                      isRejection && t.status === 'Terminado'
                        ? 'En Progreso'
                        : t.status,
                    updatedAt: now,
                  }
            ),
            activityLog:
              reviewStatus === 'verificada' || isRejection
                ? appendActivityLog(g, {
                    type:
                      reviewStatus === 'verificada'
                        ? 'evidence_verified'
                        : 'evidence_rejected',
                    actorName: actor?.displayName || group.creatorName || 'Creador',
                    taskId: task.id,
                    taskTitle: task.title,
                    detail:
                      reviewStatus === 'verificada'
                        ? `Aprobó la evidencia de "${task.title}"`
                        : `Rechazó "${task.title}" para corrección`,
                    timestamp: now,
                  })
                : g.activityLog,
          }
    ),
  };

  return { state: nextState };
}

/**
 * Creator-only (#6): Records or updates the teacher's grade (0-20) and feedback on a task.
 */
export function setTaskTeacherGrade(
  state: AppState,
  groupId: string,
  taskId: string,
  rating: number,
  comment: string,
  actor: ActorInfo,
  nowIso?: string
): { state: AppState; error?: string } {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    return { state, error: 'Grupo no encontrado.' };
  }
  if (!isGroupCreator(group, actor)) {
    return {
      state,
      error:
        'Solo el creador del grupo puede registrar la calificación del profesor.',
    };
  }
  const task = group.tasks.find((t) => t.id === taskId);
  if (!task) {
    return { state, error: 'Tarea no encontrada.' };
  }
  if (typeof rating !== 'number' || isNaN(rating) || rating < 0 || rating > 20) {
    return {
      state,
      error: 'Ingresa una calificación válida entre 0 y 20.',
    };
  }

  const roundedRating = Math.round(rating * 10) / 10;
  const cleanComment = comment
    .trim()
    .slice(0, PROJECT_LIMITS.TEACHER_COMMENT_MAX);
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
                    teacherRating: roundedRating,
                    teacherComment: cleanComment,
                    updatedAt: now,
                  }
            ),
            activityLog: appendActivityLog(g, {
              type: 'teacher_graded',
              actorName: actor.displayName,
              taskId: task.id,
              taskTitle: task.title,
              detail: `Registró nota del profesor (${roundedRating}/20) en "${task.title}"`,
              timestamp: now,
            }),
          }
    ),
  };

  return { state: nextState };
}

/**
 * Calculates team performance rankings (#6): who delivers ahead of deadline (%)
 * and who has received strong teacher grades demonstrating good performance.
 */
export function calculateTeamPerformance(
  members: string[],
  tasks: Task[]
): MemberPerformanceStats[] {
  const stats = members.map((member) => {
    const memberTasks = tasks.filter(
      (t) => t.assignee.trim().toLowerCase() === member.trim().toLowerCase()
    );
    const totalAssigned = memberTasks.length;
    const completedTasks = memberTasks.filter((t) => t.status === 'Terminado');
    const completedCount = completedTasks.length;

    let earlyCount = 0;
    let totalDaysEarly = 0;

    for (const t of completedTasks) {
      const dueTime = Date.parse(`${t.dueDate.trim()}T23:59:59Z`);
      const doneIso = t.completedAt || t.updatedAt;
      const doneTime = Date.parse(doneIso);
      if (!isNaN(dueTime) && !isNaN(doneTime)) {
        const diffDays = (dueTime - doneTime) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0) {
          earlyCount += 1;
          totalDaysEarly += Math.floor(diffDays);
        }
      }
    }

    const earlyDeliveryPct =
      completedCount === 0
        ? 0
        : Math.round((earlyCount / completedCount) * 100);
    const averageDaysEarly =
      earlyCount === 0
        ? 0
        : Math.round((totalDaysEarly / earlyCount) * 10) / 10;
    const completionPct =
      totalAssigned === 0
        ? 0
        : Math.round((completedCount / totalAssigned) * 100);

    const gradedTasks = memberTasks.filter(
      (t) => typeof t.teacherRating === 'number' && !isNaN(t.teacherRating)
    );
    const gradedCount = gradedTasks.length;
    const highGradeCount = gradedTasks.filter(
      (t) => (t.teacherRating || 0) >= 17
    ).length;
    const averageTeacherGrade =
      gradedCount === 0
        ? null
        : Math.round(
            (gradedTasks.reduce((sum, t) => sum + (t.teacherRating || 0), 0) /
              gradedCount) *
              10
          ) / 10;

    const latestCommentTask = gradedTasks.find(
      (t) => (t.teacherComment || '').trim().length > 0
    );
    const latestTeacherComment = latestCommentTask?.teacherComment || '';

    const gradeScore =
      averageTeacherGrade !== null ? (averageTeacherGrade / 20) * 100 : 0;
    const performanceScore = Math.round(
      earlyDeliveryPct * 0.45 + gradeScore * 0.35 + completionPct * 0.2
    );

    return {
      member,
      totalAssigned,
      completedCount,
      earlyCount,
      earlyDeliveryPct,
      averageDaysEarly,
      completionPct,
      gradedCount,
      highGradeCount,
      averageTeacherGrade,
      latestTeacherComment,
      performanceScore,
    };
  });

  return stats.sort(
    (a, b) =>
      b.performanceScore - a.performanceScore ||
      b.earlyDeliveryPct - a.earlyDeliveryPct ||
      (b.averageTeacherGrade ?? -1) - (a.averageTeacherGrade ?? -1) ||
      b.completedCount - a.completedCount
  );
}

function formatIcsDateOnly(isoDate: string): string {
  const parts = isoDate.trim().split('-');
  if (parts.length !== 3) {
    const today = getTodayIsoDate().replace(/-/g, '');
    return today;
  }
  return `${parts[0]}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`;
}

function addOneDayIcs(isoDate: string): string {
  const parsed = Date.parse(`${isoDate.trim()}T00:00:00Z`);
  if (isNaN(parsed)) {
    return formatIcsDateOnly(getOffsetIsoDate(1));
  }
  const next = new Date(parsed + 24 * 60 * 60 * 1000);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Builds a mobile-ready Google Calendar deep link for a single task deadline (#8).
 */
export function buildGoogleCalendarUrl(task: Task, group: Group): string {
  const startDate = formatIcsDateOnly(task.dueDate);
  const endDate = addOneDayIcs(task.dueDate);
  const title = `[${group.name}] ${task.title}`;
  const details = [
    `Curso: ${group.course}`,
    `Responsable: ${task.assignee}`,
    `Estado: ${task.status}`,
    task.evidenceUrl ? `Evidencia: ${task.evidenceUrl}` : '',
    'Organizado con Actividades Juntos',
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startDate}/${endDate}`,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an RFC 5545 .ics calendar file for a single task with a 1-day-before mobile reminder (#8).
 */
export function buildTaskIcsContent(task: Task, group: Group): string {
  const dtStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const dtStart = formatIcsDateOnly(task.dueDate);
  const dtEnd = addOneDayIcs(task.dueDate);
  const summary = escapeIcsText(`[${group.name}] ${task.title}`);
  const description = escapeIcsText(
    `Curso: ${group.course}\nResponsable: ${task.assignee}\nEstado: ${task.status}`
  );

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Actividades Juntos//Entregas Escolares//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${task.id}@actividadesjuntos.app`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Mañana vence: ${summary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generates a single RFC 5545 .ics file containing all pending deadlines for a group (#8).
 */
export function buildGroupIcsContent(group: Group): string {
  const pendingTasks = group.tasks.filter((t) => t.status !== 'Terminado');
  const targetTasks = pendingTasks.length > 0 ? pendingTasks : group.tasks;
  const dtStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

  const events = targetTasks.map((task) => {
    const dtStart = formatIcsDateOnly(task.dueDate);
    const dtEnd = addOneDayIcs(task.dueDate);
    const summary = escapeIcsText(`[${group.name}] ${task.title}`);
    const description = escapeIcsText(
      `Curso: ${group.course}\nResponsable: ${task.assignee}\nEstado: ${task.status}`
    );
    return [
      'BEGIN:VEVENT',
      `UID:${task.id}@actividadesjuntos.app`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Mañana vence: ${summary}`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Actividades Juntos//Entregas Escolares//ES',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcsText(group.name)}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function deleteTask(
  state: AppState,
  groupId: string,
  taskId: string,
  actor?: ActorInfo
): AppState {
  return {
    ...state,
    groups: state.groups.map((g) => {
      if (g.id !== groupId) return g;
      if (actor && !isGroupCreator(g, actor)) return g;
      return {
        ...g,
        tasks: g.tasks.filter((t) => t.id !== taskId),
      };
    }),
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
  const cleanTitle = payload.title
    .trim()
    .slice(0, PROJECT_LIMITS.RESOURCE_TITLE_MAX);
  const cleanCategory = (payload.category.trim() || 'Recurso').slice(
    0,
    PROJECT_LIMITS.RESOURCE_CATEGORY_MAX
  );
  const safeUrl = sanitizeSafeHttpUrl(payload.url);

  if (!cleanTitle) {
    return { state, error: 'Escribe el nombre del enlace.' };
  }
  if (!safeUrl) {
    return {
      state,
      error:
        'Ingresa una dirección web válida y segura (ej. https://drive.google.com/...).',
    };
  }

  const newResource: AnchoredResource = {
    id: payload.id || `res-${Date.now()}`,
    title: cleanTitle,
    category: cleanCategory,
    url: safeUrl,
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

/**
 * Defensively validates and sanitizes a deserialized AppState (e.g. from localStorage)
 * so tampered or corrupted storage payloads never crash the UI or inject malicious URLs.
 */
export function sanitizeAppState(raw: unknown, fallback: AppState): AppState {
  if (!raw || typeof raw !== 'object') return fallback;
  const candidate = raw as Partial<AppState>;
  if (!Array.isArray(candidate.groups) || candidate.groups.length === 0) {
    return fallback;
  }

  const validStatuses: TaskStatus[] = ['Por Hacer', 'En Progreso', 'Terminado'];
  const validPriorities: Priority[] = ['Alta', 'Media', 'Baja'];
  const validReviewStates: EvidenceReviewStatus[] = [
    'pendiente',
    'verificada',
    'observada',
    'rechazada',
  ];

  const cleanGroups: Group[] = [];

  for (const rawGroup of candidate.groups) {
    if (!rawGroup || typeof rawGroup !== 'object') continue;
    const g = rawGroup as Partial<Group>;
    if (typeof g.id !== 'string' || !g.id.trim() || typeof g.name !== 'string') {
      continue;
    }

    const cleanMembers = Array.isArray(g.members)
      ? Array.from(
          new Set(
            g.members
              .filter((m): m is string => typeof m === 'string')
              .map((m) => m.trim().slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX))
              .filter(Boolean)
          )
        ).slice(0, PROJECT_LIMITS.MAX_MEMBERS_PER_GROUP)
      : [];

    const cleanTasks: Task[] = Array.isArray(g.tasks)
      ? g.tasks
          .filter((t): t is Task => Boolean(t && typeof t === 'object' && typeof t.id === 'string' && typeof t.title === 'string'))
          .map((t) => {
            const safeEvidence = t.evidenceUrl
              ? sanitizeSafeHttpUrl(t.evidenceUrl) || ''
              : '';
            const rawStatus = validStatuses.includes(t.status)
              ? t.status
              : 'Por Hacer';
            const status: TaskStatus =
              rawStatus === 'Terminado' && !safeEvidence
                ? 'En Progreso'
                : rawStatus;

            const cleanSubtasks: Subtask[] = Array.isArray(t.subtasks)
              ? t.subtasks
                  .filter(
                    (st): st is Subtask =>
                      Boolean(st && typeof st === 'object' && typeof st.id === 'string' && typeof st.text === 'string')
                  )
                  .slice(0, PROJECT_LIMITS.MAX_SUBTASKS_PER_TASK)
                  .map((st) => ({
                    id: st.id,
                    text: st.text.trim().slice(0, PROJECT_LIMITS.SUBTASK_MAX),
                    completed: Boolean(st.completed),
                  }))
              : [];

            const cleanEditHistory: TaskEditRecord[] = Array.isArray(t.editHistory)
              ? t.editHistory
                  .filter(
                    (eh): eh is TaskEditRecord =>
                      Boolean(
                        eh &&
                          typeof eh === 'object' &&
                          typeof eh.id === 'string' &&
                          typeof eh.editorName === 'string' &&
                          typeof eh.editedAt === 'string'
                      )
                  )
                  .slice(0, PROJECT_LIMITS.MAX_EDIT_HISTORY_PER_TASK)
                  .map((eh) => ({
                    id: eh.id,
                    editorId:
                      typeof eh.editorId === 'string'
                        ? eh.editorId.slice(0, 128)
                        : undefined,
                    editorName: eh.editorName
                      .trim()
                      .slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX),
                    editedAt: eh.editedAt,
                    summary:
                      typeof eh.summary === 'string'
                        ? eh.summary.slice(0, 180)
                        : 'Editó la tarea',
                    changes: Array.isArray(eh.changes)
                      ? eh.changes
                          .filter(
                            (c): c is TaskEditChange =>
                              Boolean(
                                c &&
                                  typeof c.field === 'string' &&
                                  typeof c.from === 'string' &&
                                  typeof c.to === 'string'
                              )
                          )
                          .slice(0, 10)
                      : [],
                  }))
              : [];

            const rawReview =
              t.evidenceReviewStatus &&
              validReviewStates.includes(t.evidenceReviewStatus)
                ? t.evidenceReviewStatus
                : undefined;

            const reviewState: EvidenceReviewStatus | undefined =
              rawReview === 'rechazada' || rawReview === 'observada'
                ? rawReview
                : safeEvidence
                ? rawReview || 'pendiente'
                : undefined;

            return {
              id: t.id,
              title: t.title.trim().slice(0, PROJECT_LIMITS.TASK_TITLE_MAX) || 'Tarea',
              description:
                typeof t.description === 'string'
                  ? t.description.trim().slice(0, 300)
                  : '',
              assignee:
                typeof t.assignee === 'string' && t.assignee.trim()
                  ? t.assignee.trim().slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX)
                  : cleanMembers[0] || 'Integrante',
              dueDate:
                typeof t.dueDate === 'string' && t.dueDate.trim()
                  ? t.dueDate.trim().slice(0, 30)
                  : getOffsetIsoDate(3),
              priority: validPriorities.includes(t.priority) ? t.priority : 'Media',
              status,
              evidenceUrl: safeEvidence,
              evidenceReviewStatus: reviewState,
              evidenceReviewNote:
                typeof t.evidenceReviewNote === 'string'
                  ? t.evidenceReviewNote.trim().slice(0, PROJECT_LIMITS.REVIEW_NOTE_MAX)
                  : '',
              coordinatorNote:
                typeof t.coordinatorNote === 'string'
                  ? t.coordinatorNote.trim().slice(0, PROJECT_LIMITS.COORDINATOR_NOTE_MAX)
                  : undefined,
              coordinatorNoteBy:
                typeof t.coordinatorNoteBy === 'string'
                  ? t.coordinatorNoteBy.trim().slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX)
                  : undefined,
              coordinatorNoteUpdatedAt:
                typeof t.coordinatorNoteUpdatedAt === 'string'
                  ? t.coordinatorNoteUpdatedAt
                  : undefined,
              teacherRating:
                typeof t.teacherRating === 'number' &&
                !isNaN(t.teacherRating) &&
                t.teacherRating >= 0 &&
                t.teacherRating <= 20
                  ? t.teacherRating
                  : undefined,
              teacherComment:
                typeof t.teacherComment === 'string'
                  ? t.teacherComment.trim().slice(0, PROJECT_LIMITS.TEACHER_COMMENT_MAX)
                  : undefined,
              startedAt:
                typeof t.startedAt === 'string' ? t.startedAt : undefined,
              completedAt:
                typeof t.completedAt === 'string' ? t.completedAt : undefined,
              editHistory: cleanEditHistory,
              subtasks: cleanSubtasks,
              createdAt:
                typeof t.createdAt === 'string'
                  ? t.createdAt
                  : new Date().toISOString(),
              updatedAt:
                typeof t.updatedAt === 'string'
                  ? t.updatedAt
                  : new Date().toISOString(),
            };
          })
      : [];

    const cleanResources: AnchoredResource[] = Array.isArray(g.resources)
      ? g.resources
          .filter(
            (r): r is AnchoredResource =>
              Boolean(
                r &&
                  typeof r === 'object' &&
                  typeof r.id === 'string' &&
                  typeof r.title === 'string' &&
                  typeof r.url === 'string'
              )
          )
          .map((r) => {
            const safeUrl = sanitizeSafeHttpUrl(r.url);
            if (!safeUrl) return null;
            return {
              id: r.id,
              title: r.title.trim().slice(0, PROJECT_LIMITS.RESOURCE_TITLE_MAX),
              category:
                typeof r.category === 'string' && r.category.trim()
                  ? r.category.trim().slice(0, PROJECT_LIMITS.RESOURCE_CATEGORY_MAX)
                  : 'Recurso',
              url: safeUrl,
              createdAt:
                typeof r.createdAt === 'string'
                  ? r.createdAt
                  : new Date().toISOString(),
            };
          })
          .filter((r): r is AnchoredResource => r !== null)
      : [];

    const cleanActivityLog: ActivityLogEntry[] = Array.isArray(g.activityLog)
      ? g.activityLog
          .filter(
            (a): a is ActivityLogEntry =>
              Boolean(
                a &&
                  typeof a === 'object' &&
                  typeof a.id === 'string' &&
                  typeof a.detail === 'string' &&
                  typeof a.timestamp === 'string'
              )
          )
          .slice(0, PROJECT_LIMITS.MAX_ACTIVITY_LOG_PER_GROUP)
      : [];

    const resolvedMembers = cleanMembers.length > 0 ? cleanMembers : ['Estudiante'];

    cleanGroups.push({
      id: g.id.trim().slice(0, 128),
      name: g.name.trim().slice(0, PROJECT_LIMITS.GROUP_NAME_MAX) || 'Grupo',
      course:
        typeof g.course === 'string' && g.course.trim()
          ? g.course.trim().slice(0, PROJECT_LIMITS.GROUP_COURSE_MAX)
          : 'Curso Escolar',
      creatorId:
        typeof g.creatorId === 'string' ? g.creatorId.slice(0, 128) : undefined,
      creatorName:
        typeof g.creatorName === 'string' && g.creatorName.trim()
          ? g.creatorName.trim().slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX)
          : resolvedMembers[0],
      inviteCode:
        typeof g.inviteCode === 'string' && g.inviteCode.trim()
          ? g.inviteCode.trim().toUpperCase().slice(0, 12)
          : generateGroupInviteCode(g.name),
      coverUrl:
        typeof g.coverUrl === 'string' &&
        (g.coverUrl.startsWith('/src/assets/images/') ||
          sanitizeSafeHttpUrl(g.coverUrl) !== null)
          ? g.coverUrl
          : undefined,
      memberIds: Array.isArray(g.memberIds)
        ? g.memberIds
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            .slice(0, PROJECT_LIMITS.MAX_MEMBERS_PER_GROUP)
        : undefined,
      members: resolvedMembers,
      tasks: cleanTasks,
      resources: cleanResources,
      activityLog: cleanActivityLog,
      createdAt:
        typeof g.createdAt === 'string'
          ? g.createdAt
          : new Date().toISOString(),
    });
  }

  if (cleanGroups.length === 0) return fallback;

  const activeGroupId =
    typeof candidate.activeGroupId === 'string' &&
    cleanGroups.some((g) => g.id === candidate.activeGroupId)
      ? candidate.activeGroupId
      : cleanGroups[0].id;

  return {
    groups: cleanGroups,
    activeGroupId,
  };
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
    creatorName: 'Elena Gómez',
    inviteCode: 'CYT-305',
    members: ['Elena Gómez', 'Gabriel Soto', 'Lucía Fernández'],
    createdAt: '2026-11-12T10:00:00.000Z',
    activityLog: [
      {
        id: 'act-cyt-2',
        type: 'task_completed',
        actorName: 'Elena Gómez',
        taskId: 'tsk-cyt-1',
        taskTitle: 'Hipótesis y variables del biofiltro casero',
        detail: 'Completó "Hipótesis y variables del biofiltro casero" con evidencia verificada',
        timestamp: '2026-11-14T15:00:00.000Z',
      },
      {
        id: 'act-cyt-1',
        type: 'group_created',
        actorName: 'Elena Gómez',
        detail: 'Creó el grupo "Feria de Ciencias: Biofiltro"',
        timestamp: '2026-11-12T10:00:00.000Z',
      },
    ],
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
        teacherRating: 19,
        teacherComment: 'Planteamiento científico claro y entregado 2 días antes.',
        startedAt: '2026-11-12T11:30:00.000Z',
        completedAt: '2026-11-14T15:00:00.000Z',
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
        startedAt: '2026-11-13T10:15:00.000Z',
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
    creatorName: 'Sebastián Mendoza',
    inviteCode: 'HIS-412',
    members: ['Sebastián Mendoza', 'Camila Vargas'],
    createdAt: '2026-11-13T08:00:00.000Z',
    activityLog: [
      {
        id: 'act-his-1',
        type: 'group_created',
        actorName: 'Sebastián Mendoza',
        detail: 'Creó el grupo "Podcast Historia del Perú"',
        timestamp: '2026-11-13T08:00:00.000Z',
      },
    ],
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
        startedAt: '2026-11-13T09:40:00.000Z',
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
      creatorName: 'Valeria Rojas',
      inviteCode: 'EPT-104',
      members: [
        'Valeria Rojas',
        'Mateo Quispe',
        'Lucía Fernández',
        'Diego Paredes',
      ],
      createdAt: '2026-11-10T14:00:00.000Z',
      activityLog: [
        {
          id: 'act-ept-4',
          type: 'evidence_attached',
          actorName: 'Diego Paredes',
          taskId: 'tsk-ept-4',
          taskTitle: 'Encuesta a 20 compañeros con gráficos',
          detail: 'Adjuntó avance de encuesta en Google Forms',
          timestamp: '2026-11-14T19:00:00.000Z',
        },
        {
          id: 'act-ept-3',
          type: 'task_completed',
          actorName: 'Mateo Quispe',
          taskId: 'tsk-ept-2',
          taskTitle: 'Tabla de costos y presupuesto en Excel',
          detail: 'Terminó "Tabla de costos y presupuesto en Excel" 2 días antes de la fecha límite',
          timestamp: '2026-11-13T11:40:00.000Z',
        },
        {
          id: 'act-ept-2',
          type: 'task_completed',
          actorName: 'Valeria Rojas',
          taskId: 'tsk-ept-1',
          taskTitle: 'Lienzo Lean Canvas en Canva',
          detail: 'Terminó "Lienzo Lean Canvas en Canva" 2 días antes de la fecha límite',
          timestamp: '2026-11-12T18:20:00.000Z',
        },
        {
          id: 'act-ept-1',
          type: 'group_created',
          actorName: 'Valeria Rojas',
          detail: 'Creó el proyecto "Proyecto EPT" (Educación para el Trabajo)',
          timestamp: '2026-11-10T14:00:00.000Z',
        },
      ],
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
          teacherRating: 20,
          teacherComment:
            'Excelente propuesta de valor y entrega puntual 2 días antes.',
          startedAt: '2026-11-10T16:00:00.000Z',
          completedAt: '2026-11-12T18:20:00.000Z',
          editHistory: [],
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
          teacherRating: 19,
          teacherComment:
            'Cálculos ordenados, margen de ganancia claro y entregado con anticipación.',
          startedAt: '2026-11-11T10:00:00.000Z',
          completedAt: '2026-11-13T11:40:00.000Z',
          editHistory: [],
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
          coordinatorNote:
            'Recuerda incluir fotos con buena luz de la parte lateral y medidas exactas.',
          coordinatorNoteBy: 'Valeria Rojas',
          coordinatorNoteUpdatedAt: '2026-11-14T16:15:00.000Z',
          startedAt: '2026-11-12T10:30:00.000Z',
          editHistory: [],
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
          startedAt: '2026-11-12T15:00:00.000Z',
          editHistory: [],
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
          editHistory: [],
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
          editHistory: [],
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
      creatorName: 'Camila Vargas',
      inviteCode: 'COM-208',
      members: ['Camila Vargas', 'Sebastián Mendoza', 'Andrea Torres'],
      createdAt: '2026-11-11T10:00:00.000Z',
      activityLog: [
        {
          id: 'act-com-3',
          type: 'evidence_rejected',
          actorName: 'Camila Vargas',
          taskId: 'tsk-com-2',
          taskTitle: 'Respuestas a posibles preguntas del otro equipo',
          detail: 'Rechazó "Respuestas a posibles preguntas del otro equipo" por falta de datos de respaldo',
          timestamp: '2026-11-14T15:10:00.000Z',
        },
        {
          id: 'act-com-2',
          type: 'task_completed',
          actorName: 'Camila Vargas',
          taskId: 'tsk-com-1',
          taskTitle: '3 argumentos principales con fuentes APA',
          detail: 'Completó "3 argumentos principales con fuentes APA" 2 días antes',
          timestamp: '2026-11-13T17:30:00.000Z',
        },
        {
          id: 'act-com-1',
          type: 'group_created',
          actorName: 'Camila Vargas',
          detail: 'Creó el grupo "Debate Comunicación"',
          timestamp: '2026-11-11T10:00:00.000Z',
        },
      ],
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
          teacherRating: 19,
          teacherComment:
            'Excelente rigor bibliográfico y entrega anticipada.',
          startedAt: '2026-11-11T11:30:00.000Z',
          completedAt: '2026-11-13T17:30:00.000Z',
          editHistory: [],
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
          evidenceUrl:
            'https://docs.google.com/document/d/borrador-contraargumentos',
          evidenceReviewStatus: 'rechazada',
          evidenceReviewNote:
            'Faltan 2 fuentes confiables para respaldar el segundo contraargumento.',
          coordinatorNote:
            'Por favor agrega las estadísticas del INEI antes de volver a enviarlo.',
          coordinatorNoteBy: 'Camila Vargas',
          coordinatorNoteUpdatedAt: '2026-11-14T15:10:00.000Z',
          startedAt: '2026-11-12T09:45:00.000Z',
          editHistory: [],
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
          editHistory: [],
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
          editHistory: [],
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
