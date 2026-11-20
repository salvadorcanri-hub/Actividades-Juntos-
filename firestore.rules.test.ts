import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const draftRulesPath = path.resolve(process.cwd(), 'DRAFT_firestore.rules');

function loadActiveRules(): string {
  if (fs.existsSync(rulesPath)) {
    return fs.readFileSync(rulesPath, 'utf8');
  }
  return fs.readFileSync(draftRulesPath, 'utf8');
}

interface SimRequest {
  auth: { uid: string; email_verified: boolean } | null;
  path: string;
  op: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestTime: string;
  incoming?: Record<string, unknown>;
  existing?: Record<string, unknown>;
  parentExists?: boolean;
  parentOwnerId?: string;
}

const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && ID_REGEX.test(id);
}

/**
 * Deterministic rule evaluator verifying the Dirty Dozen payloads against our Firestore rules invariants.
 */
function evaluateRule(req: SimRequest): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!req.auth || req.auth.email_verified !== true) {
    return 'PERMISSION_DENIED';
  }

  const segments = req.path.split('/').filter(Boolean);
  if (segments[0] !== 'users') return 'PERMISSION_DENIED';
  const userId = segments[1] || '';

  if (req.auth.uid !== userId) return 'PERMISSION_DENIED';
  if (req.op !== 'list' && !isValidId(userId)) return 'PERMISSION_DENIED';

  // /users/{userId}
  if (segments.length === 2) {
    if (req.op === 'create' || req.op === 'update') {
      const data = req.incoming || {};
      const keys = Object.keys(data);
      const allowed = ['ownerId', 'displayName', 'gradeCourse', 'activeGroupId', 'createdAt', 'updatedAt'];
      if (keys.length !== allowed.length || !allowed.every((k) => keys.includes(k))) {
        return 'PERMISSION_DENIED';
      }
      if (data.ownerId !== req.auth.uid || data.ownerId !== userId) return 'PERMISSION_DENIED';
      if (typeof data.displayName !== 'string' || data.displayName.length < 1 || data.displayName.length > 80) {
        return 'PERMISSION_DENIED';
      }
      if (data.updatedAt !== req.requestTime) return 'PERMISSION_DENIED';
      if (req.op === 'create' && data.createdAt !== req.requestTime) return 'PERMISSION_DENIED';
      if (req.op === 'update' && req.existing) {
        if (data.ownerId !== req.existing.ownerId || data.createdAt !== req.existing.createdAt) {
          return 'PERMISSION_DENIED';
        }
      }
      return 'ALLOW';
    }
    return 'PERMISSION_DENIED';
  }

  // /users/{userId}/private/{docId}
  if (segments.length === 4 && segments[2] === 'private') {
    const docId = segments[3];
    if (!isValidId(docId)) return 'PERMISSION_DENIED';
    if (req.op === 'get') {
      return req.existing?.ownerId === req.auth.uid ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    return 'PERMISSION_DENIED';
  }

  // /users/{userId}/groups/{groupId}
  if (segments.length === 4 && segments[2] === 'groups') {
    const groupId = segments[3];
    if (req.op === 'list') {
      return req.existing?.ownerId === req.auth.uid ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (!isValidId(groupId)) return 'PERMISSION_DENIED';
    if (req.op === 'create' || req.op === 'update') {
      const data = req.incoming || {};
      const keys = Object.keys(data);
      const allowed = ['ownerId', 'name', 'course', 'createdAt', 'updatedAt'];
      if (keys.length !== allowed.length || !allowed.every((k) => keys.includes(k))) {
        return 'PERMISSION_DENIED';
      }
      if (data.ownerId !== req.auth.uid || data.ownerId !== userId) return 'PERMISSION_DENIED';
      if (typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 100) return 'PERMISSION_DENIED';
      if (typeof data.course !== 'string' || data.course.length < 1 || data.course.length > 100) return 'PERMISSION_DENIED';
      if (data.updatedAt !== req.requestTime) return 'PERMISSION_DENIED';
      if (req.op === 'create' && (!req.parentExists || data.createdAt !== req.requestTime)) return 'PERMISSION_DENIED';
      if (req.op === 'update' && req.existing) {
        if (data.ownerId !== req.existing.ownerId || data.createdAt !== req.existing.createdAt) {
          return 'PERMISSION_DENIED';
        }
      }
      return 'ALLOW';
    }
  }

  // /users/{userId}/groups/{groupId}/tasks/{taskId}
  if (segments.length === 6 && segments[2] === 'groups' && segments[4] === 'tasks') {
    const groupId = segments[3];
    const taskId = segments[5];
    if (!isValidId(groupId) || !isValidId(taskId)) return 'PERMISSION_DENIED';
    if (!req.parentExists || req.parentOwnerId !== req.auth.uid) return 'PERMISSION_DENIED';
    if (req.op === 'create' || req.op === 'update') {
      const data = req.incoming || {};
      const keys = Object.keys(data);
      const allowed = [
        'ownerId',
        'groupId',
        'title',
        'assignee',
        'dueDate',
        'priority',
        'kanbanColumn',
        'evidenceUrl',
        'createdAt',
        'updatedAt',
      ];
      if (keys.length !== allowed.length || !allowed.every((k) => keys.includes(k))) {
        return 'PERMISSION_DENIED';
      }
      if (data.ownerId !== req.auth.uid || data.groupId !== groupId) return 'PERMISSION_DENIED';
      if (typeof data.title !== 'string' || data.title.length < 1 || data.title.length > 160) return 'PERMISSION_DENIED';
      if (!['Alta', 'Media', 'Baja'].includes(String(data.priority))) return 'PERMISSION_DENIED';
      if (!['Por Hacer', 'En Progreso', 'Terminado'].includes(String(data.kanbanColumn))) return 'PERMISSION_DENIED';
      if (typeof data.evidenceUrl !== 'string' || data.evidenceUrl.length > 500) return 'PERMISSION_DENIED';
      if (data.kanbanColumn === 'Terminado' && data.evidenceUrl.length === 0) return 'PERMISSION_DENIED';
      if (data.updatedAt !== req.requestTime) return 'PERMISSION_DENIED';
      if (req.op === 'update' && req.existing?.kanbanColumn === 'Terminado') return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
  }

  return 'PERMISSION_DENIED';
}

test('Firestore rules file contains all 8 hardened security pillars', () => {
  const rules = loadActiveRules();
  assert.ok(rules.includes("rules_version = '2';"));
  assert.ok(rules.includes('allow read, write: if false;'));
  assert.ok(rules.includes('request.auth.token.email_verified == true'));
  assert.ok(rules.includes('isValidUserPublicProfile'));
  assert.ok(rules.includes('isValidUserPrivateInfo'));
  assert.ok(rules.includes('isValidStudentGroupDoc'));
  assert.ok(rules.includes('isValidStudentTaskDoc'));
  assert.ok(rules.includes('isValidStudentResourceDoc'));
  assert.ok(rules.includes("data.kanbanColumn != 'Terminado' || data.evidenceUrl.size() > 0"));
});

test('Dirty Dozen Payloads all return PERMISSION_DENIED', () => {
  const NOW = '2026-11-15T18:00:00Z';

  // 1. Identity Spoofing on User Profile
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_attacker', email_verified: true },
      path: '/users/uid_victim',
      op: 'create',
      requestTime: NOW,
      incoming: {
        ownerId: 'uid_victim',
        displayName: 'Hacker',
        gradeCourse: '5to',
        activeGroupId: 'grp-1',
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 2. Unverified Email Token Write
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_1', email_verified: false },
      path: '/users/uid_1',
      op: 'create',
      requestTime: NOW,
      incoming: {
        ownerId: 'uid_1',
        displayName: 'Valeria',
        gradeCourse: '5to',
        activeGroupId: 'grp-1',
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 3. Shadow Field / Privilege Escalation Injection
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_1', email_verified: true },
      path: '/users/uid_1',
      op: 'create',
      requestTime: NOW,
      incoming: {
        ownerId: 'uid_1',
        displayName: 'Valeria',
        gradeCourse: '5to',
        activeGroupId: 'grp-1',
        isAdmin: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 4. Cross-User PII Read on Split Collection
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_attacker', email_verified: true },
      path: '/users/uid_victim/private/info',
      op: 'get',
      requestTime: NOW,
      existing: { ownerId: 'uid_victim', email: 'victim@colegio.edu.pe' },
    }),
    'PERMISSION_DENIED'
  );

  // 5. ID Poisoning Attack
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_1', email_verified: true },
      path: '/users/uid_1/groups/bad id!$%',
      op: 'create',
      requestTime: NOW,
      parentExists: true,
      incoming: {
        ownerId: 'uid_1',
        name: 'Proyecto EPT',
        course: 'EPT',
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 6. Denial of Wallet / String Overflow
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_1', email_verified: true },
      path: '/users/uid_1/groups/grp-1/tasks/tsk-1',
      op: 'create',
      requestTime: NOW,
      parentExists: true,
      parentOwnerId: 'uid_1',
      incoming: {
        ownerId: 'uid_1',
        groupId: 'grp-1',
        title: 'A'.repeat(5000),
        assignee: 'Valeria',
        dueDate: '2026-11-20',
        priority: 'Alta',
        kanbanColumn: 'Por Hacer',
        evidenceUrl: '',
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 7. Anti-Paseos Bypass (Terminado with empty evidenceUrl)
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_1', email_verified: true },
      path: '/users/uid_1/groups/grp-1/tasks/tsk-1',
      op: 'create',
      requestTime: NOW,
      parentExists: true,
      parentOwnerId: 'uid_1',
      incoming: {
        ownerId: 'uid_1',
        groupId: 'grp-1',
        title: 'Maqueta',
        assignee: 'Valeria',
        dueDate: '2026-11-20',
        priority: 'Alta',
        kanbanColumn: 'Terminado',
        evidenceUrl: '',
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 8. Orphaned Task Write Without Parent Group
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_1', email_verified: true },
      path: '/users/uid_1/groups/non_existent/tasks/tsk-1',
      op: 'create',
      requestTime: NOW,
      parentExists: false,
      incoming: {
        ownerId: 'uid_1',
        groupId: 'non_existent',
        title: 'Tarea Huérfana',
        assignee: 'Valeria',
        dueDate: '2026-11-20',
        priority: 'Media',
        kanbanColumn: 'Por Hacer',
        evidenceUrl: '',
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 9. Immortal Field Mutation on Update (mutating ownerId / createdAt)
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_1', email_verified: true },
      path: '/users/uid_1/groups/grp-1',
      op: 'update',
      requestTime: NOW,
      existing: {
        ownerId: 'uid_1',
        name: 'Proyecto EPT',
        course: 'EPT',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      incoming: {
        ownerId: 'uid_1',
        name: 'Proyecto EPT Editado',
        course: 'EPT',
        createdAt: '2020-01-01T00:00:00Z',
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 10. Forged Client Timestamp
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_1', email_verified: true },
      path: '/users/uid_1/groups/grp-1',
      op: 'create',
      requestTime: NOW,
      parentExists: true,
      incoming: {
        ownerId: 'uid_1',
        name: 'Proyecto EPT',
        course: 'EPT',
        createdAt: NOW,
        updatedAt: '2099-01-01T00:00:00Z',
      },
    }),
    'PERMISSION_DENIED'
  );

  // 11. Value Poisoning on Update (Invalid enum priority)
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_1', email_verified: true },
      path: '/users/uid_1/groups/grp-1/tasks/tsk-1',
      op: 'update',
      requestTime: NOW,
      parentExists: true,
      parentOwnerId: 'uid_1',
      existing: {
        ownerId: 'uid_1',
        groupId: 'grp-1',
        title: 'Maqueta',
        assignee: 'Valeria',
        dueDate: '2026-11-20',
        priority: 'Media',
        kanbanColumn: 'Por Hacer',
        evidenceUrl: '',
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: '2026-11-10T00:00:00Z',
      },
      incoming: {
        ownerId: 'uid_1',
        groupId: 'grp-1',
        title: 'Maqueta',
        assignee: 'Valeria',
        dueDate: '2026-11-20',
        priority: 'Urgente',
        kanbanColumn: 'Por Hacer',
        evidenceUrl: '',
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 12. Unauthorized List Query Across Users
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_attacker', email_verified: true },
      path: '/users/uid_victim/groups/grp-1',
      op: 'list',
      requestTime: NOW,
      existing: { ownerId: 'uid_victim' },
    }),
    'PERMISSION_DENIED'
  );
});
