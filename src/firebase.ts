import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  Group,
  Task,
  TaskStatus,
  Priority,
  EvidenceReviewStatus,
  AnchoredResource,
  ActivityLogEntry,
  Subtask,
  TaskEditRecord,
  PROJECT_LIMITS,
  sanitizeSafeHttpUrl,
  generateGroupInviteCode,
} from './utils/projectLogic';
import {
  StudentAccount,
  GradeOption,
  SectionOption,
  GRADE_OPTIONS,
  SECTION_OPTIONS,
  formatGradeAndSection,
  sanitizeAccountForSession,
} from './utils/authLogic';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;
const INVITE_CODE_PATTERN = /^[A-Z0-9\-]+$/;

export function sanitizeFirestoreId(rawId: string, fallbackPrefix: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  if (!cleaned || !ID_PATTERN.test(cleaned)) {
    return `${fallbackPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return cleaned;
}

function sanitizeInviteCode(rawCode: string, groupName: string): string {
  const cleaned = rawCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '')
    .slice(0, 12);
  if (cleaned.length >= 3 && INVITE_CODE_PATTERN.test(cleaned)) {
    return cleaned;
  }
  return generateGroupInviteCode(groupName);
}

function sanitizeCoverUrl(rawCover?: string): string {
  if (!rawCover || typeof rawCover !== 'string') return '';
  const trimmed = rawCover.trim().slice(0, PROJECT_LIMITS.URL_MAX);
  if (trimmed.startsWith('/')) return trimmed;
  return sanitizeSafeHttpUrl(trimmed) || '';
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return new Date().toISOString();
}

function sanitizeActivityLogList(entries?: ActivityLogEntry[]): ActivityLogEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .slice(0, PROJECT_LIMITS.MAX_ACTIVITY_LOG_PER_GROUP - 1)
    .map((entry) => ({
      id: String(entry.id || `act-${Date.now()}`).slice(0, 64),
      type: entry.type,
      actorName: String(entry.actorName || 'Estudiante').slice(0, 80),
      ...(entry.taskId ? { taskId: String(entry.taskId).slice(0, 128) } : {}),
      ...(entry.taskTitle
        ? { taskTitle: String(entry.taskTitle).slice(0, 160) }
        : {}),
      detail: String(entry.detail || '').slice(0, 240),
      timestamp: String(entry.timestamp || new Date().toISOString()).slice(0, 40),
    }));
}

function sanitizeSubtasksList(subtasks?: Subtask[]): Subtask[] {
  if (!Array.isArray(subtasks)) return [];
  return subtasks.slice(0, PROJECT_LIMITS.MAX_SUBTASKS_PER_TASK).map((st) => ({
    id: String(st.id || `sub-${Date.now()}`).slice(0, 64),
    text: String(st.text || '').trim().slice(0, PROJECT_LIMITS.SUBTASK_MAX),
    completed: Boolean(st.completed),
  }));
}

function sanitizeEditHistoryList(history?: TaskEditRecord[]): TaskEditRecord[] {
  if (!Array.isArray(history)) return [];
  return history
    .slice(0, PROJECT_LIMITS.MAX_EDIT_HISTORY_PER_TASK)
    .map((rec) => ({
      id: String(rec.id || `edit-${Date.now()}`).slice(0, 64),
      ...(rec.editorId ? { editorId: String(rec.editorId).slice(0, 128) } : {}),
      editorName: String(rec.editorName || 'Estudiante').slice(0, 80),
      editedAt: String(rec.editedAt || new Date().toISOString()).slice(0, 40),
      summary: String(rec.summary || 'Editó la tarea').slice(0, 180),
      changes: Array.isArray(rec.changes)
        ? rec.changes.slice(0, 10).map((c) => ({
            field: String(c.field || '').slice(0, 60),
            from: String(c.from || '').slice(0, 200),
            to: String(c.to || '').slice(0, 200),
          }))
        : [],
    }));
}

export function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.toLowerCase().includes('quota exceeded') || msg.includes('resource-exhausted');
}

export function formatFriendlyFirestoreError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (isQuotaError(error)) {
    return 'Se alcanzó el límite diario de la base de datos. Inténtalo de nuevo mañana.';
  }
  if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
    return 'No tienes permiso para realizar esta acción en este grupo.';
  }
  return 'No se pudo sincronizar con la nube. Verifica tu conexión e intenta de nuevo.';
}

/* ============================================================================
   1. USER PROFILE & PRIVATE PII SYNC
   ============================================================================ */

export interface LoadedUserProfile {
  account: StudentAccount;
  activeGroupId: string;
  needsProfileSetup: boolean;
}

export interface RegistrationProfileOverride {
  displayName: string;
  gradeLevel: GradeOption;
  sectionLetter: SectionOption;
}

export async function loadOrCreateUserProfile(
  firebaseUser: User,
  registrationOverride?: RegistrationProfileOverride | null
): Promise<LoadedUserProfile> {
  const userId = sanitizeFirestoreId(firebaseUser.uid, 'usr');
  const safeDisplayName = (
    registrationOverride?.displayName ||
    firebaseUser.displayName ||
    firebaseUser.email?.split('@')[0] ||
    'Estudiante'
  )
    .trim()
    .slice(0, 80);
  const safeEmail = (firebaseUser.email || 'estudiante@colegio.edu.pe')
    .trim()
    .toLowerCase()
    .slice(0, 160);

  const initialGrade: GradeOption =
    registrationOverride && GRADE_OPTIONS.includes(registrationOverride.gradeLevel)
      ? registrationOverride.gradeLevel
      : '5';
  const initialSection: SectionOption =
    registrationOverride && SECTION_OPTIONS.includes(registrationOverride.sectionLetter)
      ? registrationOverride.sectionLetter
      : 'A';
  const initialCompleted = Boolean(registrationOverride);

  const userPath = `users/${userId}`;
  const privatePath = `users/${userId}/private/info`;

  let profileData: Record<string, unknown> | null = null;
  let docExists = false;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      docExists = true;
      profileData = snap.data() as Record<string, unknown>;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (!docExists) {
    try {
      await setDoc(doc(db, 'users', userId), {
        ownerId: userId,
        displayName: safeDisplayName,
        gradeLevel: initialGrade,
        sectionLetter: initialSection,
        gradeCourse: formatGradeAndSection(initialGrade, initialSection),
        activeGroupId: '',
        profileCompleted: initialCompleted,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      profileData = {
        ownerId: userId,
        displayName: safeDisplayName,
        gradeLevel: initialGrade,
        sectionLetter: initialSection,
        gradeCourse: formatGradeAndSection(initialGrade, initialSection),
        activeGroupId: '',
        profileCompleted: initialCompleted,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  } else if (
    profileData &&
    (typeof profileData.gradeLevel !== 'string' ||
      typeof profileData.sectionLetter !== 'string' ||
      typeof profileData.profileCompleted !== 'boolean')
  ) {
    // Migrate legacy user profile doc to include gradeLevel, sectionLetter, and profileCompleted
    const migratedGrade: GradeOption = GRADE_OPTIONS.includes(
      String(profileData.gradeLevel || '') as GradeOption
    )
      ? (String(profileData.gradeLevel) as GradeOption)
      : '5';
    const migratedSection: SectionOption = SECTION_OPTIONS.includes(
      String(profileData.sectionLetter || '') as SectionOption
    )
      ? (String(profileData.sectionLetter) as SectionOption)
      : 'A';
    const migratedCourse =
      typeof profileData.gradeCourse === 'string' && profileData.gradeCourse.trim()
        ? profileData.gradeCourse.trim().slice(0, 80)
        : formatGradeAndSection(migratedGrade, migratedSection);
    const migratedActive =
      typeof profileData.activeGroupId === 'string' &&
      ID_PATTERN.test(profileData.activeGroupId)
        ? profileData.activeGroupId
        : '';
    try {
      await updateDoc(doc(db, 'users', userId), {
        displayName:
          typeof profileData.displayName === 'string' && profileData.displayName.trim()
            ? profileData.displayName.trim().slice(0, 80)
            : safeDisplayName,
        gradeLevel: migratedGrade,
        sectionLetter: migratedSection,
        gradeCourse: migratedCourse,
        activeGroupId: migratedActive,
        profileCompleted: false,
        updatedAt: serverTimestamp(),
      });
      profileData = {
        ...profileData,
        gradeLevel: migratedGrade,
        sectionLetter: migratedSection,
        gradeCourse: migratedCourse,
        activeGroupId: migratedActive,
        profileCompleted: false,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  // Ensure isolated PII doc exists
  let privExists = false;
  try {
    const privSnap = await getDoc(doc(db, 'users', userId, 'private', 'info'));
    privExists = privSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, privatePath);
  }

  if (!privExists) {
    try {
      await setDoc(doc(db, 'users', userId, 'private', 'info'), {
        ownerId: userId,
        email: safeEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, privatePath);
    }
  }

  const rawGrade = String(profileData?.gradeLevel || '5');
  const gradeLevel: GradeOption = GRADE_OPTIONS.includes(rawGrade as GradeOption)
    ? (rawGrade as GradeOption)
    : '5';
  const rawSection = String(profileData?.sectionLetter || 'A');
  const sectionLetter: SectionOption = SECTION_OPTIONS.includes(
    rawSection as SectionOption
  )
    ? (rawSection as SectionOption)
    : 'A';
  const gradeCourse =
    typeof profileData?.gradeCourse === 'string' && profileData.gradeCourse.trim()
      ? profileData.gradeCourse.trim().slice(0, 80)
      : formatGradeAndSection(gradeLevel, sectionLetter);
  const displayName =
    typeof profileData?.displayName === 'string' && profileData.displayName.trim()
      ? profileData.displayName.trim().slice(0, 80)
      : safeDisplayName;
  const activeGroupId =
    typeof profileData?.activeGroupId === 'string' ? profileData.activeGroupId : '';
  const profileCompleted = profileData?.profileCompleted === true;

  const isGoogleAccount = firebaseUser.providerData.some(
    (p) => p.providerId === 'google.com'
  );

  const account = sanitizeAccountForSession({
    id: userId,
    displayName,
    email: safeEmail,
    gradeLevel,
    sectionLetter,
    gradeCourse,
    authProvider: isGoogleAccount ? 'google' : 'student-account',
    createdAt: timestampToIso(profileData?.createdAt),
  });

  return {
    account,
    activeGroupId,
    needsProfileSetup: !profileCompleted,
  };
}

export async function updateUserProfileInFirestore(
  uid: string,
  updates: {
    displayName: string;
    gradeLevel: GradeOption;
    sectionLetter: SectionOption;
    activeGroupId?: string;
  }
): Promise<void> {
  const userId = sanitizeFirestoreId(uid, 'usr');
  const userPath = `users/${userId}`;
  const safeName = updates.displayName.trim().slice(0, 80) || 'Estudiante';
  const gradeCourse = formatGradeAndSection(
    updates.gradeLevel,
    updates.sectionLetter
  );
  const safeActiveGroupId = updates.activeGroupId
    ? sanitizeFirestoreId(updates.activeGroupId, 'grp')
    : '';

  try {
    await updateDoc(doc(db, 'users', userId), {
      displayName: safeName,
      gradeLevel: updates.gradeLevel,
      sectionLetter: updates.sectionLetter,
      gradeCourse,
      profileCompleted: true,
      ...(updates.activeGroupId !== undefined
        ? { activeGroupId: safeActiveGroupId }
        : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function updateUserActiveGroupInFirestore(
  uid: string,
  activeGroupId: string
): Promise<void> {
  const userId = sanitizeFirestoreId(uid, 'usr');
  const userPath = `users/${userId}`;
  const safeActive = activeGroupId
    ? sanitizeFirestoreId(activeGroupId, 'grp')
    : '';

  try {
    await updateDoc(doc(db, 'users', userId), {
      activeGroupId: safeActive,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

/* ============================================================================
   2. REAL-TIME MULTI-USER GROUP, TASK & RESOURCE SUBSCRIPTION
   ============================================================================ */

function parseTaskDoc(id: string, data: Record<string, unknown>): Task {
  const safeEvidence =
    typeof data.evidenceUrl === 'string' && data.evidenceUrl
      ? sanitizeSafeHttpUrl(data.evidenceUrl) || ''
      : '';
  const validStatuses: TaskStatus[] = ['Por Hacer', 'En Progreso', 'Terminado'];
  const rawStatus = validStatuses.includes(data.kanbanColumn as TaskStatus)
    ? (data.kanbanColumn as TaskStatus)
    : 'Por Hacer';
  const status: TaskStatus =
    rawStatus === 'Terminado' && !safeEvidence ? 'En Progreso' : rawStatus;

  const validPriorities: Priority[] = ['Alta', 'Media', 'Baja'];
  const priority: Priority = validPriorities.includes(data.priority as Priority)
    ? (data.priority as Priority)
    : 'Media';

  const validReviews: EvidenceReviewStatus[] = [
    'pendiente',
    'verificada',
    'observada',
    'rechazada',
  ];
  const rawReview = validReviews.includes(
    data.evidenceReviewStatus as EvidenceReviewStatus
  )
    ? (data.evidenceReviewStatus as EvidenceReviewStatus)
    : undefined;

  const rawRating =
    typeof data.teacherRating === 'number' &&
    data.teacherRating >= 0 &&
    data.teacherRating <= 20
      ? data.teacherRating
      : undefined;

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Tarea',
    description: typeof data.description === 'string' ? data.description : '',
    assignee: typeof data.assignee === 'string' ? data.assignee : 'Integrante',
    dueDate: typeof data.dueDate === 'string' ? data.dueDate : '',
    priority,
    status,
    evidenceUrl: safeEvidence,
    evidenceReviewStatus: rawReview,
    evidenceReviewNote:
      typeof data.evidenceReviewNote === 'string' ? data.evidenceReviewNote : '',
    coordinatorNote:
      typeof data.coordinatorNote === 'string' && data.coordinatorNote
        ? data.coordinatorNote
        : undefined,
    coordinatorNoteBy:
      typeof data.coordinatorNoteBy === 'string' && data.coordinatorNoteBy
        ? data.coordinatorNoteBy
        : undefined,
    coordinatorNoteUpdatedAt:
      typeof data.coordinatorNoteUpdatedAt === 'string' &&
      data.coordinatorNoteUpdatedAt
        ? data.coordinatorNoteUpdatedAt
        : undefined,
    teacherRating: rawRating,
    teacherComment:
      typeof data.teacherComment === 'string' && data.teacherComment
        ? data.teacherComment
        : undefined,
    startedAt:
      typeof data.startedAt === 'string' && data.startedAt
        ? data.startedAt
        : undefined,
    completedAt:
      typeof data.completedAt === 'string' && data.completedAt
        ? data.completedAt
        : undefined,
    subtasks: sanitizeSubtasksList(data.subtasks as Subtask[]),
    editHistory: sanitizeEditHistoryList(data.editHistory as TaskEditRecord[]),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function parseResourceDoc(
  id: string,
  data: Record<string, unknown>
): AnchoredResource | null {
  const safeUrl =
    typeof data.url === 'string' ? sanitizeSafeHttpUrl(data.url) : null;
  if (!safeUrl) return null;
  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Recurso',
    category: typeof data.category === 'string' ? data.category : 'Recurso',
    url: safeUrl,
    createdAt: timestampToIso(data.createdAt),
  };
}

export function subscribeToUserGroups(
  uid: string,
  onGroupsUpdate: (groups: Group[]) => void,
  onError: (error: unknown) => void
): Unsubscribe {
  const userId = sanitizeFirestoreId(uid, 'usr');
  const groupsQuery = query(
    collection(db, 'groups'),
    where('memberIds', 'array-contains', userId)
  );

  const groupMetaMap = new Map<string, Omit<Group, 'tasks' | 'resources'>>();
  const groupTasksMap = new Map<string, Task[]>();
  const groupResourcesMap = new Map<string, AnchoredResource[]>();
  const subUnsubMap = new Map<string, { tasks: Unsubscribe; resources: Unsubscribe }>();
  let orderedGroupIds: string[] = [];

  const emitMerged = () => {
    const merged: Group[] = [];
    for (const gid of orderedGroupIds) {
      const meta = groupMetaMap.get(gid);
      if (!meta) continue;
      merged.push({
        ...meta,
        tasks: groupTasksMap.get(gid) || [],
        resources: groupResourcesMap.get(gid) || [],
      });
    }
    onGroupsUpdate(merged);
  };

  const unsubscribeGroups = onSnapshot(
    groupsQuery,
    (snapshot) => {
      const currentIds = new Set<string>();
      const nextOrder: string[] = [];

      snapshot.docs.forEach((docSnap) => {
        const gid = docSnap.id;
        const d = docSnap.data() as Record<string, unknown>;
        currentIds.add(gid);
        nextOrder.push(gid);

        const members = Array.isArray(d.members)
          ? (d.members.filter((m): m is string => typeof m === 'string') as string[])
          : ['Estudiante'];
        const memberIds = Array.isArray(d.memberIds)
          ? (d.memberIds.filter((m): m is string => typeof m === 'string') as string[])
          : [];

        groupMetaMap.set(gid, {
          id: gid,
          name: typeof d.name === 'string' ? d.name : 'Grupo',
          course: typeof d.course === 'string' ? d.course : 'Curso Escolar',
          creatorId: typeof d.creatorId === 'string' ? d.creatorId : undefined,
          creatorName:
            typeof d.creatorName === 'string' ? d.creatorName : members[0],
          inviteCode: typeof d.inviteCode === 'string' ? d.inviteCode : undefined,
          coverUrl:
            typeof d.coverUrl === 'string' && d.coverUrl ? d.coverUrl : undefined,
          memberIds,
          members,
          activityLog: Array.isArray(d.activityLog)
            ? (d.activityLog as ActivityLogEntry[])
            : [],
          createdAt: timestampToIso(d.createdAt),
        });

        // Attach subcollection listeners for newly seen groups
        if (!subUnsubMap.has(gid)) {
          const tasksColPath = `groups/${gid}/tasks`;
          const resColPath = `groups/${gid}/resources`;

          const tasksUnsub = onSnapshot(
            collection(db, 'groups', gid, 'tasks'),
            (taskSnap) => {
              const parsedTasks = taskSnap.docs
                .map((ts) =>
                  parseTaskDoc(ts.id, ts.data() as Record<string, unknown>)
                )
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
              groupTasksMap.set(gid, parsedTasks);
              emitMerged();
            },
            (err) => {
              // Ignore permission error if group was just dissolved/kicked and listener is tearing down
              console.warn(`Tasks listener notice (${tasksColPath}):`, err);
            }
          );

          const resourcesUnsub = onSnapshot(
            collection(db, 'groups', gid, 'resources'),
            (resSnap) => {
              const parsedRes = resSnap.docs
                .map((rs) =>
                  parseResourceDoc(rs.id, rs.data() as Record<string, unknown>)
                )
                .filter((r): r is AnchoredResource => r !== null)
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
              groupResourcesMap.set(gid, parsedRes);
              emitMerged();
            },
            (err) => {
              console.warn(`Resources listener notice (${resColPath}):`, err);
            }
          );

          subUnsubMap.set(gid, { tasks: tasksUnsub, resources: resourcesUnsub });
        }
      });

      // Clean up listeners for dissolved or left groups
      for (const [gid, unsubs] of subUnsubMap.entries()) {
        if (!currentIds.has(gid)) {
          unsubs.tasks();
          unsubs.resources();
          subUnsubMap.delete(gid);
          groupMetaMap.delete(gid);
          groupTasksMap.delete(gid);
          groupResourcesMap.delete(gid);
        }
      }

      // Sort groups chronologically (oldest first so sidebar stays stable)
      nextOrder.sort((a, b) => {
        const ca = groupMetaMap.get(a)?.createdAt || '';
        const cb = groupMetaMap.get(b)?.createdAt || '';
        return ca.localeCompare(cb);
      });
      orderedGroupIds = nextOrder;
      emitMerged();
    },
    (error) => {
      onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'groups');
      } catch {
        // Error logged with structured FirestoreErrorInfo
      }
    }
  );

  return () => {
    unsubscribeGroups();
    for (const unsubs of subUnsubMap.values()) {
      unsubs.tasks();
      unsubs.resources();
    }
    subUnsubMap.clear();
  };
}

/* ============================================================================
   3. SHARED GROUP CRUD (CREATE, JOIN BY CODE, MEMBERS, DISSOLVE GROUP)
   ============================================================================ */

export async function createGroupInFirestore(
  group: Group,
  creatorUid: string
): Promise<Group> {
  const safeCreatorId = sanitizeFirestoreId(creatorUid, 'usr');
  const safeGroupId = sanitizeFirestoreId(group.id, 'grp');
  const safeName = (group.name || 'Grupo').trim().slice(0, PROJECT_LIMITS.GROUP_NAME_MAX);
  const safeCourse = (group.course || 'Curso Escolar')
    .trim()
    .slice(0, PROJECT_LIMITS.GROUP_COURSE_MAX);
  const safeCreatorName = (group.creatorName || group.members[0] || 'Creador')
    .trim()
    .slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX);
  const safeMembers = Array.from(
    new Set(
      group.members
        .map((m) => m.trim().slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX))
        .filter(Boolean)
    )
  ).slice(0, PROJECT_LIMITS.MAX_MEMBERS_PER_GROUP);
  if (safeMembers.length === 0) {
    safeMembers.push(safeCreatorName);
  }

  // Pick a unique invite code (retry up to 4 times if already taken)
  let finalInviteCode = sanitizeInviteCode(group.inviteCode || '', safeName);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const existingInvite = await getDoc(doc(db, 'groupInvites', finalInviteCode));
      if (!existingInvite.exists()) break;
      finalInviteCode = generateGroupInviteCode(safeName);
    } catch {
      break;
    }
  }

  const safeCover = sanitizeCoverUrl(group.coverUrl);
  const safeActivity = sanitizeActivityLogList(group.activityLog);

  const batch = writeBatch(db);
  const groupRef = doc(db, 'groups', safeGroupId);
  const inviteRef = doc(db, 'groupInvites', finalInviteCode);

  batch.set(groupRef, {
    creatorId: safeCreatorId,
    creatorName: safeCreatorName,
    name: safeName,
    course: safeCourse,
    inviteCode: finalInviteCode,
    coverUrl: safeCover,
    memberIds: [safeCreatorId],
    members: safeMembers,
    activityLog: safeActivity,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(inviteRef, {
    groupId: safeGroupId,
    creatorId: safeCreatorId,
    groupName: safeName,
    course: safeCourse,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `groups/${safeGroupId}`);
  }

  return {
    ...group,
    id: safeGroupId,
    creatorId: safeCreatorId,
    creatorName: safeCreatorName,
    inviteCode: finalInviteCode,
    memberIds: [safeCreatorId],
    members: safeMembers,
  };
}

export async function joinGroupByInviteCodeInFirestore(
  rawCode: string,
  uid: string,
  displayName: string
): Promise<{ groupId?: string; groupName?: string; error?: string }> {
  const normalizedCode = rawCode.trim().toUpperCase();
  if (!normalizedCode || normalizedCode.length < 3 || !INVITE_CODE_PATTERN.test(normalizedCode)) {
    return {
      error: 'Ingresa un código de invitación válido (ej. EPT-482).',
    };
  }

  const safeUid = sanitizeFirestoreId(uid, 'usr');
  const safeName = displayName.trim().slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX) || 'Estudiante';
  const invitePath = `groupInvites/${normalizedCode}`;

  let inviteData: Record<string, unknown> | null = null;
  try {
    const inviteSnap = await getDoc(doc(db, 'groupInvites', normalizedCode));
    if (!inviteSnap.exists()) {
      return {
        error: `No encontramos ningún grupo activo con el código "${normalizedCode}". Verifica con el creador del grupo.`,
      };
    }
    inviteData = inviteSnap.data() as Record<string, unknown>;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, invitePath);
  }

  const targetGroupId =
    typeof inviteData?.groupId === 'string' ? inviteData.groupId : '';
  const targetGroupName =
    typeof inviteData?.groupName === 'string' ? inviteData.groupName : normalizedCode;
  if (!targetGroupId) {
    return { error: 'El código de invitación no apunta a un grupo válido.' };
  }

  const groupPath = `groups/${targetGroupId}`;
  const joinEntry: ActivityLogEntry = {
    id: `act-join-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'member_joined',
    actorName: safeName,
    detail: `${safeName} se unió al grupo con código ${normalizedCode}`,
    timestamp: new Date().toISOString(),
  };

  try {
    await updateDoc(doc(db, 'groups', targetGroupId), {
      memberIds: arrayUnion(safeUid),
      members: arrayUnion(safeName),
      activityLog: arrayUnion(joinEntry),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // If the student was already in the group, Firestore rules reject duplicate join as non-member; check silently
    try {
      const checkSnap = await getDoc(doc(db, 'groups', targetGroupId));
      if (checkSnap.exists()) {
        return { groupId: targetGroupId, groupName: targetGroupName };
      }
    } catch {
      // Fall through to structured error handler
    }
    handleFirestoreError(error, OperationType.UPDATE, groupPath);
  }

  return { groupId: targetGroupId, groupName: targetGroupName };
}

export async function updateGroupMembersInFirestore(
  groupId: string,
  members: string[],
  memberIds: string[],
  activityLog: ActivityLogEntry[]
): Promise<void> {
  const safeGroupId = sanitizeFirestoreId(groupId, 'grp');
  const groupPath = `groups/${safeGroupId}`;
  const safeMembers = Array.from(
    new Set(
      members
        .map((m) => m.trim().slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX))
        .filter(Boolean)
    )
  ).slice(0, PROJECT_LIMITS.MAX_MEMBERS_PER_GROUP);
  const safeMemberIds = Array.from(new Set(memberIds.filter(Boolean))).slice(
    0,
    PROJECT_LIMITS.MAX_MEMBERS_PER_GROUP
  );

  try {
    await updateDoc(doc(db, 'groups', safeGroupId), {
      members: safeMembers,
      memberIds: safeMemberIds,
      activityLog: sanitizeActivityLogList(activityLog),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, groupPath);
  }
}

export async function appendGroupActivityInFirestore(
  groupId: string,
  activityLog: ActivityLogEntry[]
): Promise<void> {
  const safeGroupId = sanitizeFirestoreId(groupId, 'grp');
  const groupPath = `groups/${safeGroupId}`;
  try {
    await updateDoc(doc(db, 'groups', safeGroupId), {
      activityLog: sanitizeActivityLogList(activityLog),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, groupPath);
  }
}

/**
 * Creator-only: Permanently dissolves (deletes) a group, its invite code,
 * and all tasks & resources inside it in Firestore.
 */
export async function dissolveGroupInFirestore(group: Group): Promise<void> {
  const safeGroupId = sanitizeFirestoreId(group.id, 'grp');
  const groupPath = `groups/${safeGroupId}`;

  try {
    const [tasksSnap, resourcesSnap] = await Promise.all([
      getDocs(collection(db, 'groups', safeGroupId, 'tasks')),
      getDocs(collection(db, 'groups', safeGroupId, 'resources')),
    ]);

    const batch = writeBatch(db);
    tasksSnap.docs.forEach((d) => batch.delete(d.ref));
    resourcesSnap.docs.forEach((d) => batch.delete(d.ref));

    if (group.inviteCode && INVITE_CODE_PATTERN.test(group.inviteCode.toUpperCase())) {
      batch.delete(doc(db, 'groupInvites', group.inviteCode.toUpperCase()));
    }
    batch.delete(doc(db, 'groups', safeGroupId));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, groupPath);
  }
}

/* ============================================================================
   4. SHARED TASKS & RESOURCES CRUD
   ============================================================================ */

function buildFullTaskPayload(groupId: string, task: Task, createdByUid: string) {
  const safeEvidence = task.evidenceUrl
    ? sanitizeSafeHttpUrl(task.evidenceUrl) || ''
    : '';
  const safeColumn: TaskStatus =
    task.status === 'Terminado' && !safeEvidence ? 'En Progreso' : task.status;
  const safeRating =
    typeof task.teacherRating === 'number' &&
    !isNaN(task.teacherRating) &&
    task.teacherRating >= 0 &&
    task.teacherRating <= 20
      ? task.teacherRating
      : -1;

  return {
    groupId,
    createdBy: sanitizeFirestoreId(createdByUid, 'usr'),
    title: (task.title || 'Tarea').trim().slice(0, PROJECT_LIMITS.TASK_TITLE_MAX),
    description: (task.description || '').trim().slice(0, 300),
    assignee: (task.assignee || 'Integrante')
      .trim()
      .slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX),
    dueDate: (task.dueDate || '2026-11-25').trim().slice(0, 30),
    priority: ['Alta', 'Media', 'Baja'].includes(task.priority)
      ? task.priority
      : 'Media',
    kanbanColumn: safeColumn,
    evidenceUrl: safeEvidence,
    evidenceReviewStatus: task.evidenceReviewStatus || '',
    evidenceReviewNote: (task.evidenceReviewNote || '')
      .trim()
      .slice(0, PROJECT_LIMITS.REVIEW_NOTE_MAX),
    coordinatorNote: (task.coordinatorNote || '')
      .trim()
      .slice(0, PROJECT_LIMITS.COORDINATOR_NOTE_MAX),
    coordinatorNoteBy: (task.coordinatorNoteBy || '')
      .trim()
      .slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX),
    coordinatorNoteUpdatedAt: (task.coordinatorNoteUpdatedAt || '').slice(0, 40),
    teacherRating: safeRating,
    teacherComment: (task.teacherComment || '')
      .trim()
      .slice(0, PROJECT_LIMITS.TEACHER_COMMENT_MAX),
    startedAt: (task.startedAt || '').slice(0, 40),
    completedAt: (task.completedAt || '').slice(0, 40),
    subtasks: sanitizeSubtasksList(task.subtasks),
    editHistory: sanitizeEditHistoryList(task.editHistory),
  };
}

export async function createTaskInFirestore(
  groupId: string,
  task: Task,
  creatorUid: string,
  nextActivityLog?: ActivityLogEntry[]
): Promise<void> {
  const safeGroupId = sanitizeFirestoreId(groupId, 'grp');
  const safeTaskId = sanitizeFirestoreId(task.id, 'tsk');
  const taskPath = `groups/${safeGroupId}/tasks/${safeTaskId}`;

  try {
    const payload = buildFullTaskPayload(safeGroupId, task, creatorUid);
    await setDoc(doc(db, 'groups', safeGroupId, 'tasks', safeTaskId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (nextActivityLog) {
      await appendGroupActivityInFirestore(safeGroupId, nextActivityLog);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, taskPath);
  }
}

export async function updateTaskSubtasksInFirestore(
  groupId: string,
  taskId: string,
  subtasks: Subtask[]
): Promise<void> {
  const safeGroupId = sanitizeFirestoreId(groupId, 'grp');
  const safeTaskId = sanitizeFirestoreId(taskId, 'tsk');
  const taskPath = `groups/${safeGroupId}/tasks/${safeTaskId}`;

  try {
    await updateDoc(doc(db, 'groups', safeGroupId, 'tasks', safeTaskId), {
      subtasks: sanitizeSubtasksList(subtasks),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, taskPath);
  }
}

export async function updateTaskInFirestore(
  groupId: string,
  task: Task,
  isCreator: boolean,
  nextActivityLog?: ActivityLogEntry[]
): Promise<void> {
  const safeGroupId = sanitizeFirestoreId(groupId, 'grp');
  const safeTaskId = sanitizeFirestoreId(task.id, 'tsk');
  const taskPath = `groups/${safeGroupId}/tasks/${safeTaskId}`;
  const full = buildFullTaskPayload(safeGroupId, task, auth.currentUser?.uid || 'usr');

  const updateFields = isCreator
    ? {
        title: full.title,
        description: full.description,
        assignee: full.assignee,
        dueDate: full.dueDate,
        priority: full.priority,
        kanbanColumn: full.kanbanColumn,
        evidenceUrl: full.evidenceUrl,
        evidenceReviewStatus: full.evidenceReviewStatus,
        evidenceReviewNote: full.evidenceReviewNote,
        coordinatorNote: full.coordinatorNote,
        coordinatorNoteBy: full.coordinatorNoteBy,
        coordinatorNoteUpdatedAt: full.coordinatorNoteUpdatedAt,
        teacherRating: full.teacherRating,
        teacherComment: full.teacherComment,
        startedAt: full.startedAt,
        completedAt: full.completedAt,
        subtasks: full.subtasks,
        editHistory: full.editHistory,
        updatedAt: serverTimestamp(),
      }
    : {
        // Strictly adheres to Tier 2B member-allowed fields in firestore.rules
        title: full.title,
        dueDate: full.dueDate,
        priority: full.priority,
        evidenceUrl: full.evidenceUrl,
        evidenceReviewStatus:
          full.evidenceReviewStatus === 'verificada' ||
          full.evidenceReviewStatus === 'rechazada' ||
          full.evidenceReviewStatus === 'observada'
            ? 'pendiente'
            : full.evidenceReviewStatus,
        startedAt: full.startedAt,
        editHistory: full.editHistory,
        updatedAt: serverTimestamp(),
      };

  try {
    await updateDoc(
      doc(db, 'groups', safeGroupId, 'tasks', safeTaskId),
      updateFields
    );
    if (nextActivityLog) {
      await appendGroupActivityInFirestore(safeGroupId, nextActivityLog);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, taskPath);
  }
}

export async function deleteTaskInFirestore(
  groupId: string,
  taskId: string
): Promise<void> {
  const safeGroupId = sanitizeFirestoreId(groupId, 'grp');
  const safeTaskId = sanitizeFirestoreId(taskId, 'tsk');
  const taskPath = `groups/${safeGroupId}/tasks/${safeTaskId}`;

  try {
    await deleteDoc(doc(db, 'groups', safeGroupId, 'tasks', safeTaskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, taskPath);
  }
}

export async function createResourceInFirestore(
  groupId: string,
  resource: AnchoredResource,
  creatorUid: string
): Promise<void> {
  const safeUrl = sanitizeSafeHttpUrl(resource.url);
  if (!safeUrl) return;
  const safeGroupId = sanitizeFirestoreId(groupId, 'grp');
  const safeResId = sanitizeFirestoreId(resource.id, 'res');
  const resPath = `groups/${safeGroupId}/resources/${safeResId}`;

  try {
    await setDoc(doc(db, 'groups', safeGroupId, 'resources', safeResId), {
      groupId: safeGroupId,
      createdBy: sanitizeFirestoreId(creatorUid, 'usr'),
      title: (resource.title || 'Recurso')
        .trim()
        .slice(0, PROJECT_LIMITS.RESOURCE_TITLE_MAX),
      category: (resource.category || 'Recurso')
        .trim()
        .slice(0, PROJECT_LIMITS.RESOURCE_CATEGORY_MAX),
      url: safeUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, resPath);
  }
}

export async function deleteResourceInFirestore(
  groupId: string,
  resourceId: string
): Promise<void> {
  const safeGroupId = sanitizeFirestoreId(groupId, 'grp');
  const safeResId = sanitizeFirestoreId(resourceId, 'res');
  const resPath = `groups/${safeGroupId}/resources/${safeResId}`;

  try {
    await deleteDoc(doc(db, 'groups', safeGroupId, 'resources', safeResId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, resPath);
  }
}
