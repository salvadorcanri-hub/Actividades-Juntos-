import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { AppState, Group, Task, AnchoredResource } from './utils/projectLogic';

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

function sanitizeFirestoreId(rawId: string, fallbackPrefix: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  if (!cleaned || !ID_PATTERN.test(cleaned)) {
    return `${fallbackPrefix}-${Date.now()}`;
  }
  return cleaned;
}

/**
 * Synchronizes the authenticated Firebase student profile and workspace to Firestore
 * adhering strictly to the volumetric and structural rules in firebase-blueprint.json.
 */
export async function syncStudentToFirestore(params: {
  uid: string;
  displayName: string;
  email: string;
  gradeCourse: string;
  state: AppState;
}): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== params.uid) return;
  if (!auth.currentUser.emailVerified) return;

  const userId = sanitizeFirestoreId(params.uid, 'usr');
  const activeGroupId = sanitizeFirestoreId(
    params.state.activeGroupId || 'grp-ept-01',
    'grp'
  );
  const safeDisplayName = (params.displayName || 'Estudiante')
    .trim()
    .slice(0, 80);
  const safeGradeCourse = (params.gradeCourse || '5to Secundaria')
    .trim()
    .slice(0, 80);
  const safeEmail = (params.email || 'estudiante@colegio.edu.pe')
    .trim()
    .slice(0, 160);

  const userPath = `users/${userId}`;
  try {
    const existingProfile = await getDoc(doc(db, 'users', userId));
    if (!existingProfile.exists()) {
      await setDoc(doc(db, 'users', userId), {
        ownerId: userId,
        displayName: safeDisplayName,
        gradeCourse: safeGradeCourse,
        activeGroupId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const prevData = existingProfile.data();
      await setDoc(doc(db, 'users', userId), {
        ownerId: userId,
        displayName: safeDisplayName,
        gradeCourse: safeGradeCourse,
        activeGroupId,
        createdAt: prevData.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  const privatePath = `users/${userId}/private/info`;
  try {
    const existingPrivate = await getDoc(
      doc(db, 'users', userId, 'private', 'info')
    );
    if (!existingPrivate.exists()) {
      await setDoc(doc(db, 'users', userId, 'private', 'info'), {
        ownerId: userId,
        email: safeEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }

  for (const group of params.state.groups) {
    await syncGroupDocToFirestore(userId, group);
  }
}

async function syncGroupDocToFirestore(
  userId: string,
  group: Group
): Promise<void> {
  const groupId = sanitizeFirestoreId(group.id, 'grp');
  const groupPath = `users/${userId}/groups/${groupId}`;

  try {
    const existingGroup = await getDoc(
      doc(db, 'users', userId, 'groups', groupId)
    );
    if (!existingGroup.exists()) {
      await setDoc(doc(db, 'users', userId, 'groups', groupId), {
        ownerId: userId,
        name: (group.name || 'Grupo').trim().slice(0, 100),
        course: (group.course || 'Curso').trim().slice(0, 100),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, groupPath);
  }

  for (const task of group.tasks.slice(0, 15)) {
    await syncTaskDocToFirestore(userId, groupId, task);
  }

  for (const resource of group.resources.slice(0, 15)) {
    await syncResourceDocToFirestore(userId, groupId, resource);
  }
}

async function syncTaskDocToFirestore(
  userId: string,
  groupId: string,
  task: Task
): Promise<void> {
  const taskId = sanitizeFirestoreId(task.id, 'tsk');
  const taskPath = `users/${userId}/groups/${groupId}/tasks/${taskId}`;
  const safeEvidence = (task.evidenceUrl || '').trim().slice(0, 500);
  const safeColumn =
    task.status === 'Terminado' && !safeEvidence ? 'En Progreso' : task.status;

  try {
    const existingTask = await getDoc(
      doc(db, 'users', userId, 'groups', groupId, 'tasks', taskId)
    );
    if (!existingTask.exists()) {
      await setDoc(
        doc(db, 'users', userId, 'groups', groupId, 'tasks', taskId),
        {
          ownerId: userId,
          groupId,
          title: (task.title || 'Tarea').trim().slice(0, 160),
          assignee: (task.assignee || 'Integrante').trim().slice(0, 80),
          dueDate: (task.dueDate || '2026-11-22').trim().slice(0, 30),
          priority: ['Alta', 'Media', 'Baja'].includes(task.priority)
            ? task.priority
            : 'Media',
          kanbanColumn: safeColumn,
          evidenceUrl: safeEvidence,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, taskPath);
  }
}

async function syncResourceDocToFirestore(
  userId: string,
  groupId: string,
  resource: AnchoredResource
): Promise<void> {
  const resourceId = sanitizeFirestoreId(resource.id, 'res');
  const resPath = `users/${userId}/groups/${groupId}/resources/${resourceId}`;

  try {
    const existingRes = await getDoc(
      doc(db, 'users', userId, 'groups', groupId, 'resources', resourceId)
    );
    if (!existingRes.exists()) {
      await setDoc(
        doc(db, 'users', userId, 'groups', groupId, 'resources', resourceId),
        {
          ownerId: userId,
          groupId,
          title: (resource.title || 'Recurso').trim().slice(0, 160),
          category: (resource.category || 'Enlace').trim().slice(0, 60),
          url: (resource.url || 'https://drive.google.com').trim().slice(0, 500),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, resPath);
  }
}
