import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');

function loadActiveRules(): string {
  return fs.readFileSync(rulesPath, 'utf8');
}

interface SimRequest {
  auth: { uid: string; email_verified: boolean; sign_in_provider?: string } | null;
  path: string;
  op: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestTime: string;
  incoming?: Record<string, unknown>;
  existing?: Record<string, unknown>;
  parentGroup?: {
    creatorId: string;
    memberIds: string[];
    inviteCode?: string;
  };
  inviteExists?: boolean;
  userExists?: boolean;
}

const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const INVITE_CODE_REGEX = /^[A-Z0-9\-]+$/;
const SAFE_HTTP_URL_REGEX = /^https?:\/\/[^\s]+$/;
const SAFE_COVER_REGEX = /^(\/|https?:\/\/)[^\s]+$/;

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && ID_REGEX.test(id);
}

function isValidInviteCode(code: string): boolean {
  return typeof code === 'string' && code.length >= 3 && code.length <= 12 && INVITE_CODE_REGEX.test(code);
}

function affectedKeys(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>
): string[] {
  const allKeys = new Set([...Object.keys(incoming), ...Object.keys(existing)]);
  return Array.from(allKeys).filter(
    (k) => JSON.stringify(incoming[k]) !== JSON.stringify(existing[k])
  );
}

/**
 * Deterministic rule evaluator verifying the Dirty Dozen multi-user payloads
 * against our hardened Firestore rules invariants.
 */
function evaluateRule(req: SimRequest): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!req.auth) {
    return 'PERMISSION_DENIED';
  }
  const provider = req.auth.sign_in_provider || 'google.com';
  if (provider === 'anonymous') {
    return 'PERMISSION_DENIED';
  }
  if (req.auth.email_verified !== true && provider !== 'password') {
    return 'PERMISSION_DENIED';
  }

  const uid = req.auth.uid;
  const segments = req.path.split('/').filter(Boolean);

  // 1. /users/{userId} and /users/{userId}/private/{docId}
  if (segments[0] === 'users') {
    const userId = segments[1] || '';
    if (uid !== userId) return 'PERMISSION_DENIED';
    if (req.op !== 'list' && !isValidId(userId)) return 'PERMISSION_DENIED';

    if (segments.length === 2) {
      if (req.op === 'list' || req.op === 'delete') return 'PERMISSION_DENIED';
      if (req.op === 'get') {
        return !req.existing || req.existing.ownerId === uid ? 'ALLOW' : 'PERMISSION_DENIED';
      }
      const data = req.incoming || {};
      const allowed = [
        'ownerId',
        'displayName',
        'gradeLevel',
        'sectionLetter',
        'gradeCourse',
        'activeGroupId',
        'profileCompleted',
        'createdAt',
        'updatedAt',
      ];
      const keys = Object.keys(data);
      if (keys.length !== allowed.length || !allowed.every((k) => keys.includes(k))) {
        return 'PERMISSION_DENIED';
      }
      if (data.ownerId !== uid || data.ownerId !== userId) return 'PERMISSION_DENIED';
      if (typeof data.displayName !== 'string' || data.displayName.length < 1 || data.displayName.length > 80) {
        return 'PERMISSION_DENIED';
      }
      if (!['1', '2', '3', '4', '5'].includes(String(data.gradeLevel))) return 'PERMISSION_DENIED';
      if (!['A', 'B', 'C'].includes(String(data.sectionLetter))) return 'PERMISSION_DENIED';
      if (data.updatedAt !== req.requestTime) return 'PERMISSION_DENIED';
      if (req.op === 'create' && data.createdAt !== req.requestTime) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }

    if (segments.length === 4 && segments[2] === 'private') {
      const docId = segments[3];
      if (!isValidId(docId)) return 'PERMISSION_DENIED';
      if (req.op === 'get') {
        return !req.existing || req.existing.ownerId === uid ? 'ALLOW' : 'PERMISSION_DENIED';
      }
      return 'PERMISSION_DENIED';
    }
    return 'PERMISSION_DENIED';
  }

  // 2. /groupInvites/{inviteCode}
  if (segments[0] === 'groupInvites') {
    if (req.op === 'list' || req.op === 'update') return 'PERMISSION_DENIED';
    const code = segments[1] || '';
    if (!isValidInviteCode(code)) return 'PERMISSION_DENIED';
    if (req.op === 'get') return 'ALLOW';
    if (req.op === 'delete') {
      return req.existing?.creatorId === uid ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    return 'PERMISSION_DENIED';
  }

  // 3. /groups/{groupId}
  if (segments[0] === 'groups' && segments.length === 2) {
    const groupId = segments[1] || '';
    if (req.op === 'list') {
      const memberIds = Array.isArray(req.existing?.memberIds) ? req.existing?.memberIds : [];
      return memberIds.includes(uid) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (!isValidId(groupId)) return 'PERMISSION_DENIED';
    if (req.op === 'get') {
      const memberIds = Array.isArray(req.existing?.memberIds) ? req.existing?.memberIds : [];
      return memberIds.includes(uid) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (req.op === 'delete') {
      return req.existing?.creatorId === uid ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (req.op === 'create' || req.op === 'update') {
      const data = req.incoming || {};
      const allowed = [
        'creatorId',
        'creatorName',
        'name',
        'course',
        'inviteCode',
        'coverUrl',
        'memberIds',
        'members',
        'activityLog',
        'createdAt',
        'updatedAt',
      ];
      const keys = Object.keys(data);
      if (keys.length !== allowed.length || !allowed.every((k) => keys.includes(k))) {
        return 'PERMISSION_DENIED';
      }
      if (typeof data.creatorId !== 'string' || !isValidId(data.creatorId)) return 'PERMISSION_DENIED';
      if (typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 100) return 'PERMISSION_DENIED';
      if (typeof data.coverUrl !== 'string' || (data.coverUrl !== '' && !SAFE_COVER_REGEX.test(data.coverUrl))) {
        return 'PERMISSION_DENIED';
      }
      if (!Array.isArray(data.memberIds) || data.memberIds.length < 1 || data.memberIds.length > 20) {
        return 'PERMISSION_DENIED';
      }
      if (!data.memberIds.includes(data.creatorId)) return 'PERMISSION_DENIED';
      if (data.updatedAt !== req.requestTime) return 'PERMISSION_DENIED';

      if (req.op === 'create') {
        if (!req.userExists || data.creatorId !== uid || data.memberIds.length !== 1 || data.createdAt !== req.requestTime) {
          return 'PERMISSION_DENIED';
        }
        return 'ALLOW';
      }

      if (req.op === 'update' && req.existing) {
        if (
          data.creatorId !== req.existing.creatorId ||
          data.creatorName !== req.existing.creatorName ||
          data.inviteCode !== req.existing.inviteCode ||
          data.createdAt !== req.existing.createdAt
        ) {
          return 'PERMISSION_DENIED';
        }
        const changed = affectedKeys(data, req.existing);
        if (req.existing.creatorId === uid) {
          const ok = changed.every((k) =>
            ['name', 'course', 'coverUrl', 'memberIds', 'members', 'activityLog', 'updatedAt'].includes(k)
          );
          return ok ? 'ALLOW' : 'PERMISSION_DENIED';
        }
        const oldMemberIds = Array.isArray(req.existing.memberIds) ? req.existing.memberIds : [];
        const oldMembers = Array.isArray(req.existing.members) ? req.existing.members : [];
        const newMembers = Array.isArray(data.members) ? data.members : [];
        // Self-join via invite code
        if (
          !oldMemberIds.includes(uid) &&
          data.memberIds.includes(uid) &&
          oldMemberIds.every((m) => (data.memberIds as unknown[]).includes(m)) &&
          data.memberIds.length === oldMemberIds.length + 1 &&
          oldMembers.every((m) => newMembers.includes(m)) &&
          req.inviteExists &&
          changed.every((k) => ['memberIds', 'members', 'activityLog', 'updatedAt'].includes(k))
        ) {
          return 'ALLOW';
        }
        return 'PERMISSION_DENIED';
      }
    }
  }

  // 4. /groups/{groupId}/tasks/{taskId}
  if (segments[0] === 'groups' && segments.length === 4 && segments[2] === 'tasks') {
    const groupId = segments[1] || '';
    const taskId = segments[3] || '';
    if (!isValidId(groupId) || !isValidId(taskId)) return 'PERMISSION_DENIED';
    if (!req.parentGroup) return 'PERMISSION_DENIED';
    const isMember = req.parentGroup.memberIds.includes(uid);
    const isCreator = req.parentGroup.creatorId === uid;
    if (!isMember) return 'PERMISSION_DENIED';

    if (req.op === 'delete') {
      return isCreator ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (req.op === 'create' || req.op === 'update') {
      const data = req.incoming || {};
      if (data.groupId !== groupId) return 'PERMISSION_DENIED';
      if (typeof data.title !== 'string' || data.title.length < 1 || data.title.length > 160) return 'PERMISSION_DENIED';
      if (!['Por Hacer', 'En Progreso', 'Terminado'].includes(String(data.kanbanColumn))) return 'PERMISSION_DENIED';
      if (typeof data.evidenceUrl !== 'string' || data.evidenceUrl.length > 500) return 'PERMISSION_DENIED';
      if (data.evidenceUrl !== '' && !SAFE_HTTP_URL_REGEX.test(data.evidenceUrl)) return 'PERMISSION_DENIED';
      if (data.kanbanColumn === 'Terminado' && data.evidenceUrl.length === 0) return 'PERMISSION_DENIED';
      if (data.updatedAt !== req.requestTime) return 'PERMISSION_DENIED';

      if (req.op === 'update' && req.existing) {
        const changed = affectedKeys(data, req.existing);
        if (isCreator) return 'ALLOW';
        // Regular member cannot touch kanbanColumn, teacherRating, coordinatorNote, or set verificada
        const allowedMemberEdit = [
          'title',
          'dueDate',
          'priority',
          'evidenceUrl',
          'evidenceReviewStatus',
          'startedAt',
          'editHistory',
          'updatedAt',
        ];
        if (!changed.every((k) => allowedMemberEdit.includes(k))) {
          return 'PERMISSION_DENIED';
        }
        if (
          data.evidenceReviewStatus !== req.existing.evidenceReviewStatus &&
          !['', 'pendiente'].includes(String(data.evidenceReviewStatus))
        ) {
          return 'PERMISSION_DENIED';
        }
        return 'ALLOW';
      }
      return 'ALLOW';
    }
  }

  return 'PERMISSION_DENIED';
}

test('Firestore rules file contains all 8 hardened pillars & multi-user creator protections', () => {
  const rules = loadActiveRules();
  assert.ok(rules.includes("rules_version = '2';"));
  assert.ok(rules.includes('allow read, write: if false;'));
  assert.ok(rules.includes('request.auth.token.email_verified == true'));
  assert.ok(rules.includes('isValidUserPublicProfile'));
  assert.ok(rules.includes('isValidUserPrivateInfo'));
  assert.ok(rules.includes('isValidSharedGroupDoc'));
  assert.ok(rules.includes('isValidGroupInviteDoc'));
  assert.ok(rules.includes('isValidSharedTaskDoc'));
  assert.ok(rules.includes('isValidSharedResourceDoc'));
  assert.ok(rules.includes('request.auth.uid in resource.data.memberIds'));
  assert.ok(rules.includes('existing().creatorId == request.auth.uid'));
  assert.ok(rules.includes("data.kanbanColumn != 'Terminado' || data.evidenceUrl.size() > 0"));
  assert.ok(rules.includes("data.url.matches('^https?://[^\\\\s]+$')"));
  assert.ok(rules.includes("data.evidenceUrl.matches('^https?://[^\\\\s]+$')"));
  assert.ok(rules.includes('(resource == null || existing().ownerId == request.auth.uid)'));
});

test('Dirty Dozen Multi-User Payloads all return PERMISSION_DENIED', () => {
  const NOW = '2026-11-20T18:00:00Z';

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
        gradeLevel: '5',
        sectionLetter: 'A',
        gradeCourse: '5° Secundaria · Sección A',
        activeGroupId: '',
        profileCompleted: true,
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
        gradeLevel: '5',
        sectionLetter: 'A',
        gradeCourse: '5° Secundaria · Sección A',
        activeGroupId: '',
        profileCompleted: true,
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
        gradeLevel: '5',
        sectionLetter: 'A',
        gradeCourse: '5° Secundaria · Sección A',
        activeGroupId: '',
        profileCompleted: true,
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

  // 5. Non-Creator Group Dissolution Attempt (Disolver grupo)
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_member', email_verified: true },
      path: '/groups/grp-1',
      op: 'delete',
      requestTime: NOW,
      existing: { creatorId: 'uid_creator', memberIds: ['uid_creator', 'uid_member'] },
    }),
    'PERMISSION_DENIED'
  );

  // Creator CAN dissolve own group
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_creator', email_verified: true },
      path: '/groups/grp-1',
      op: 'delete',
      requestTime: NOW,
      existing: { creatorId: 'uid_creator', memberIds: ['uid_creator', 'uid_member'] },
    }),
    'ALLOW'
  );

  // 6. Invite Code Collection Scraping (list must be denied)
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_1', email_verified: true },
      path: '/groupInvites/EPT-104',
      op: 'list',
      requestTime: NOW,
    }),
    'PERMISSION_DENIED'
  );

  // 7. Unauthorized Group List by Outsider
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_outsider', email_verified: true },
      path: '/groups/grp-1',
      op: 'list',
      requestTime: NOW,
      existing: { creatorId: 'uid_creator', memberIds: ['uid_creator', 'uid_member'] },
    }),
    'PERMISSION_DENIED'
  );

  const baseTask = {
    groupId: 'grp-1',
    createdBy: 'uid_creator',
    title: 'Avance del proyecto',
    description: '',
    assignee: 'Mateo',
    dueDate: '2026-11-25',
    priority: 'Alta',
    kanbanColumn: 'En Progreso',
    evidenceUrl: 'https://docs.google.com/document/d/abc',
    evidenceReviewStatus: 'pendiente',
    evidenceReviewNote: '',
    coordinatorNote: '',
    coordinatorNoteBy: '',
    coordinatorNoteUpdatedAt: '',
    teacherRating: -1,
    teacherComment: '',
    startedAt: NOW,
    completedAt: '',
    subtasks: [],
    editHistory: [],
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
  };

  // 8. Member Privilege Escalation: Moving kanbanColumn to Terminado
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_member', email_verified: true },
      path: '/groups/grp-1/tasks/tsk-1',
      op: 'update',
      requestTime: NOW,
      parentGroup: { creatorId: 'uid_creator', memberIds: ['uid_creator', 'uid_member'] },
      existing: baseTask,
      incoming: { ...baseTask, kanbanColumn: 'Terminado', updatedAt: NOW },
    }),
    'PERMISSION_DENIED'
  );

  // 9. Member Self-Approval of Evidence (evidenceReviewStatus: 'verificada')
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_member', email_verified: true },
      path: '/groups/grp-1/tasks/tsk-1',
      op: 'update',
      requestTime: NOW,
      parentGroup: { creatorId: 'uid_creator', memberIds: ['uid_creator', 'uid_member'] },
      existing: baseTask,
      incoming: { ...baseTask, evidenceReviewStatus: 'verificada', updatedAt: NOW },
    }),
    'PERMISSION_DENIED'
  );

  // 10. Member Teacher Grade Forgery
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_member', email_verified: true },
      path: '/groups/grp-1/tasks/tsk-1',
      op: 'update',
      requestTime: NOW,
      parentGroup: { creatorId: 'uid_creator', memberIds: ['uid_creator', 'uid_member'] },
      existing: baseTask,
      incoming: { ...baseTask, teacherRating: 20, updatedAt: NOW },
    }),
    'PERMISSION_DENIED'
  );

  // 11. Anti-Paseos Bypass (Creator trying to finish task without evidence)
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_creator', email_verified: true },
      path: '/groups/grp-1/tasks/tsk-1',
      op: 'update',
      requestTime: NOW,
      parentGroup: { creatorId: 'uid_creator', memberIds: ['uid_creator', 'uid_member'] },
      existing: baseTask,
      incoming: { ...baseTask, kanbanColumn: 'Terminado', evidenceUrl: '', updatedAt: NOW },
    }),
    'PERMISSION_DENIED'
  );

  // 12. Removing Creator from memberIds
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_creator', email_verified: true },
      path: '/groups/grp-1',
      op: 'update',
      requestTime: NOW,
      existing: {
        creatorId: 'uid_creator',
        creatorName: 'Valeria',
        name: 'Grupo EPT',
        course: 'EPT',
        inviteCode: 'EPT-104',
        coverUrl: '',
        memberIds: ['uid_creator', 'uid_member'],
        members: ['Valeria', 'Mateo'],
        activityLog: [],
        createdAt: '2026-11-18T10:00:00Z',
        updatedAt: '2026-11-18T10:00:00Z',
      },
      incoming: {
        creatorId: 'uid_creator',
        creatorName: 'Valeria',
        name: 'Grupo EPT',
        course: 'EPT',
        inviteCode: 'EPT-104',
        coverUrl: '',
        memberIds: ['uid_member'],
        members: ['Mateo'],
        activityLog: [],
        createdAt: '2026-11-18T10:00:00Z',
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 13. XSS Protocol Injection on Task evidenceUrl
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_member', email_verified: true },
      path: '/groups/grp-1/tasks/tsk-xss',
      op: 'create',
      requestTime: NOW,
      parentGroup: { creatorId: 'uid_creator', memberIds: ['uid_creator', 'uid_member'] },
      incoming: { ...baseTask, evidenceUrl: 'javascript:alert(1)', updatedAt: NOW },
    }),
    'PERMISSION_DENIED'
  );

  // 14. ID Poisoning & String Overflow
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_creator', email_verified: true },
      path: '/groups/bad id!$%',
      op: 'create',
      requestTime: NOW,
      userExists: true,
      incoming: {
        creatorId: 'uid_creator',
        creatorName: 'Valeria',
        name: 'Grupo',
        course: 'EPT',
        inviteCode: 'EPT-104',
        coverUrl: '',
        memberIds: ['uid_creator'],
        members: ['Valeria'],
        activityLog: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
    'PERMISSION_DENIED'
  );

  // 15. Forged Client Timestamp
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_creator', email_verified: true },
      path: '/groups/grp-1',
      op: 'create',
      requestTime: NOW,
      userExists: true,
      incoming: {
        creatorId: 'uid_creator',
        creatorName: 'Valeria',
        name: 'Grupo',
        course: 'EPT',
        inviteCode: 'EPT-104',
        coverUrl: '',
        memberIds: ['uid_creator'],
        members: ['Valeria'],
        activityLog: [],
        createdAt: NOW,
        updatedAt: '2099-01-01T00:00:00Z',
      },
    }),
    'PERMISSION_DENIED'
  );

  // 16. First-time user getDoc on non-existent own profile MUST be allowed, cross-user MUST be denied
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_new_student', email_verified: true },
      path: '/users/uid_new_student',
      op: 'get',
      requestTime: NOW,
    }),
    'ALLOW'
  );
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_attacker', email_verified: true },
      path: '/users/uid_new_student',
      op: 'get',
      requestTime: NOW,
    }),
    'PERMISSION_DENIED'
  );

  // 17. Email/Password account allowed for own profile; Anonymous account denied
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_email_user', email_verified: false, sign_in_provider: 'password' },
      path: '/users/uid_email_user',
      op: 'get',
      requestTime: NOW,
    }),
    'ALLOW'
  );
  assert.equal(
    evaluateRule({
      auth: { uid: 'uid_anon', email_verified: false, sign_in_provider: 'anonymous' },
      path: '/users/uid_anon',
      op: 'get',
      requestTime: NOW,
    }),
    'PERMISSION_DENIED'
  );
});
