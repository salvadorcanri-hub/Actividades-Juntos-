import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SEED_DATA,
  sanitizeSafeHttpUrl,
  sanitizeAppState,
  validateTaskTransition,
  calculateGroupProgress,
  calculateMemberWorkloads,
  evaluateWorkloadEquity,
  transitionTaskStatus,
  attachTaskEvidence,
  reviewTaskEvidence,
  createTaskInGroup,
  createNewGroup,
  dissolveGroup,
  joinGroupByInviteCode,
  groupTasksByDeadline,
  addResourceToGroup,
  removeResourceFromGroup,
  toggleSubtaskInGroup,
  addSubtaskToTask,
  formatShortDate,
  isGroupCreator,
  isTaskRejected,
  canEditTask,
  getVisibleTaskEditHistory,
  kickMemberFromGroup,
  editTaskInGroup,
  setTaskCoordinatorNote,
  setTaskTeacherGrade,
  calculateTeamPerformance,
  buildGoogleCalendarUrl,
  buildTaskIcsContent,
  buildGroupIcsContent,
} from './projectLogic';
import {
  DEFAULT_STUDENT_ACCOUNTS,
  registerStudentInList,
  authenticateStudentFromList,
  migrateAndSanitizeAccounts,
  sanitizeAccountForSession,
  buildPersonalizedInitialWorkspace,
  getStudentWorkspaceStorageKey,
  formatGradeAndSection,
} from './authLogic';

test('Regla Anti-Paseos: bloquea mover tarea a Terminado si evidenceUrl está vacío', () => {
  const resultEmpty = validateTaskTransition(
    { title: 'Boceto y maqueta', evidenceUrl: '' },
    'Terminado'
  );
  assert.equal(resultEmpty.valid, false);
  assert.ok(resultEmpty.error?.includes('evidencia'));

  const resultWhitespace = validateTaskTransition(
    { title: 'Boceto y maqueta', evidenceUrl: '   ' },
    'Terminado'
  );
  assert.equal(resultWhitespace.valid, false);
});

test('Regla Anti-Paseos: permite mover a En Progreso o Por Hacer sin evidencia, y a Terminado con evidencia válida', () => {
  const toInProgress = validateTaskTransition(
    { title: 'Encuesta', evidenceUrl: '' },
    'En Progreso'
  );
  assert.equal(toInProgress.valid, true);

  const toCompletedValid = validateTaskTransition(
    {
      title: 'Encuesta',
      evidenceUrl: 'https://docs.google.com/document/d/12345',
    },
    'Terminado'
  );
  assert.equal(toCompletedValid.valid, true);
});

test('Cálculo automático de progreso: (Tareas Terminadas / Total de Tareas) * 100', () => {
  const eptGroup = INITIAL_SEED_DATA.groups[0];
  const progress = calculateGroupProgress(eptGroup.tasks);
  assert.equal(progress.completed, 2);
  assert.equal(progress.total, 6);
  assert.equal(progress.percentage, 33);

  const debateGroup = INITIAL_SEED_DATA.groups[1];
  const debateProgress = calculateGroupProgress(debateGroup.tasks);
  assert.equal(debateProgress.completed, 1);
  assert.equal(debateProgress.total, 4);
  assert.equal(debateProgress.percentage, 25);
});

test('Conteo de tareas por integrante y cálculo de equidad del equipo', () => {
  const eptGroup = INITIAL_SEED_DATA.groups[0];
  const workloads = calculateMemberWorkloads(eptGroup.members, eptGroup.tasks);

  const valeria = workloads.find((w) => w.member === 'Valeria Rojas');
  const mateo = workloads.find((w) => w.member === 'Mateo Quispe');
  const lucia = workloads.find((w) => w.member === 'Lucía Fernández');
  const diego = workloads.find((w) => w.member === 'Diego Paredes');

  assert.equal(valeria?.totalAssigned, 2);
  assert.equal(mateo?.totalAssigned, 1);
  assert.equal(lucia?.totalAssigned, 2);
  assert.equal(diego?.totalAssigned, 1);

  const equity = evaluateWorkloadEquity(eptGroup.members, eptGroup.tasks);
  assert.equal(equity.isBalanced, true);
  assert.equal(equity.maxDiff, 1);
});

test('Subtareas (Checklist) y formato de fecha corta funcionan para proyectos pequeños y grandes', () => {
  assert.equal(formatShortDate('2026-11-20'), '20 nov');

  const toggledState = toggleSubtaskInGroup(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-3',
    's-5'
  );
  const taskAfterToggle = toggledState.groups[0].tasks.find(
    (t) => t.id === 'tsk-ept-3'
  )!;
  const sub5 = taskAfterToggle.subtasks.find((s) => s.id === 's-5')!;
  assert.equal(sub5.completed, true);

  const withAddedSub = addSubtaskToTask(
    toggledState,
    'grp-ept-01',
    'tsk-ept-2',
    'Verificar suma de costos fijos'
  );
  const task2 = withAddedSub.groups[0].tasks.find((t) => t.id === 'tsk-ept-2')!;
  assert.equal(task2.subtasks.length, 1);
  assert.equal(task2.subtasks[0].text, 'Verificar suma de costos fijos');
});

test('Transición de estado de tarea y adjunto de evidencia actualizan el estado inmutablemente', () => {
  const blockedAttempt = transitionTaskStatus(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-3',
    'Terminado'
  );
  assert.ok(blockedAttempt.error);
  assert.equal(blockedAttempt.blockedTask?.id, 'tsk-ept-3');

  const withEvidence = attachTaskEvidence(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-3',
    'canva.com/design/prototipo-3d-bambu',
    true
  );
  assert.equal(withEvidence.error, undefined);
  const updatedGroup = withEvidence.state.groups.find(
    (g) => g.id === 'grp-ept-01'
  )!;
  const updatedTask = updatedGroup.tasks.find((t) => t.id === 'tsk-ept-3')!;
  assert.equal(updatedTask.status, 'Terminado');
  assert.equal(
    updatedTask.evidenceUrl,
    'https://canva.com/design/prototipo-3d-bambu'
  );

  const newProgress = calculateGroupProgress(updatedGroup.tasks);
  assert.equal(newProgress.percentage, 50);
});

test('Aislamiento de contexto: crear tarea con subtareas, añadir/borrar recurso y crear grupo mantienen contenedores aislados', () => {
  const addedRes = addResourceToGroup(INITIAL_SEED_DATA, 'grp-com-02', {
    title: 'Repositorio de Fuentes INEI',
    category: 'Fuente Investigación',
    url: 'inei.gob.pe/estadisticas-educacion',
    id: 'res-test-99',
  });
  assert.equal(addedRes.error, undefined);
  const comGroup = addedRes.state.groups.find((g) => g.id === 'grp-com-02')!;
  const eptGroup = addedRes.state.groups.find((g) => g.id === 'grp-ept-01')!;
  assert.equal(comGroup.resources.length, 3);
  assert.equal(eptGroup.resources.length, 3);

  const afterRemove = removeResourceFromGroup(
    addedRes.state,
    'grp-com-02',
    'res-test-99'
  );
  assert.equal(
    afterRemove.groups.find((g) => g.id === 'grp-com-02')!.resources.length,
    2
  );

  const withNewGroup = createNewGroup(afterRemove, {
    id: 'grp-cyt-03',
    name: 'Indagación Biología',
    course: 'Ciencia y Tecnología',
    members: ['Elena Gómez', 'Gabriel Soto'],
  });
  assert.equal(withNewGroup.groups.length, 3);
  assert.equal(withNewGroup.activeGroupId, 'grp-cyt-03');
  assert.ok(withNewGroup.groups[2].inviteCode);

  const createdTask = createTaskInGroup(withNewGroup, 'grp-cyt-03', {
    title: 'Bitácora de germinación semana 1',
    assignee: 'Elena Gómez',
    dueDate: '2026-11-25',
    subtasks: ['Medir tallo día 3', 'Tomar foto día 7'],
  });
  assert.equal(createdTask.error, undefined);
  const bioTasks = createdTask.state.groups.find((g) => g.id === 'grp-cyt-03')!
    .tasks;
  assert.equal(bioTasks.length, 1);
  assert.equal(bioTasks[0].subtasks.length, 2);
});

test('Autenticación de estudiantes con opciones de Grado (1-5) y Sección (A-C)', () => {
  assert.equal(formatGradeAndSection('3', 'B'), '3° Secundaria · Sección B');

  const invalidReg = registerStudentInList(DEFAULT_STUDENT_ACCOUNTS, {
    displayName: 'Sofía Mendoza',
    email: 'correo-invalido',
    gradeLevel: '4',
    sectionLetter: 'C',
    password: '123',
  });
  assert.ok(invalidReg.error);

  const validReg = registerStudentInList(DEFAULT_STUDENT_ACCOUNTS, {
    id: 'stu-sofia-03',
    displayName: 'Sofía Mendoza',
    email: 'sofia.mendoza@colegio.edu.pe',
    gradeLevel: '4',
    sectionLetter: 'C',
    password: 'clave123',
  });
  assert.equal(validReg.error, undefined);
  assert.equal(validReg.accounts.length, 3);
  assert.equal(validReg.account?.gradeLevel, '4');
  assert.equal(validReg.account?.sectionLetter, 'C');
  assert.equal(validReg.account?.gradeCourse, '4° Secundaria · Sección C');

  const rightLogin = authenticateStudentFromList(validReg.accounts, {
    email: 'sofia.mendoza@colegio.edu.pe',
    password: 'clave123',
  });
  assert.equal(rightLogin.error, undefined);
  assert.equal(rightLogin.account?.id, 'stu-sofia-03');
});

test('Espacio de trabajo personalizado por estudiante incluye al alumno en sus grupos y aísla su clave de guardado', () => {
  const sofiaKey = getStudentWorkspaceStorageKey('stu-sofia-03');
  const valeriaKey = getStudentWorkspaceStorageKey('stu-valeria-01');
  assert.notEqual(sofiaKey, valeriaKey);

  const sofiaWorkspace = buildPersonalizedInitialWorkspace('Sofía Mendoza');
  assert.ok(sofiaWorkspace.groups[0].members.includes('Sofía Mendoza'));
  assert.ok(sofiaWorkspace.groups[1].members.includes('Sofía Mendoza'));
});

test('Calendario de Entregas, Código de Invitación y Revisión de Evidencias funcionan correctamente', () => {
  // 1. Deadline grouping
  const buckets = groupTasksByDeadline(
    INITIAL_SEED_DATA.groups[0].tasks,
    '2026-11-16'
  );
  assert.equal(buckets.completed.length, 2);
  assert.equal(buckets.urgentOrSoon.length, 2); // due Nov 17 and Nov 18
  assert.equal(buckets.upcoming.length, 2); // due Nov 21 and Nov 22

  // 2. Join shared group by invite code CYT-305
  const joined = joinGroupByInviteCode(
    INITIAL_SEED_DATA,
    'cyt-305',
    'Valeria Rojas'
  );
  assert.equal(joined.error, undefined);
  assert.equal(joined.state.groups.length, 3);
  assert.equal(joined.state.activeGroupId, 'grp-cyt-305');
  assert.ok(joined.joinedGroup?.members.includes('Valeria Rojas'));

  // 3. Peer Evidence Review on task tsk-ept-4
  const reviewed = reviewTaskEvidence(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-4',
    'verificada',
    'Gráficos claros y completos.'
  );
  assert.equal(reviewed.error, undefined);
  const reviewedTask = reviewed.state.groups[0].tasks.find(
    (t) => t.id === 'tsk-ept-4'
  )!;
  assert.equal(reviewedTask.evidenceReviewStatus, 'verificada');
  assert.equal(reviewedTask.evidenceReviewNote, 'Gráficos claros y completos.');
});

test('Seguridad XSS: bloquea URLs peligrosas (javascript:, data:, vbscript:, file:) en evidencias y recursos', () => {
  const maliciousUrls = [
    'javascript:alert(1)',
    '  JAVASCRIPT:alert(document.cookie)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'blob:https://example.com/1234',
  ];

  for (const badUrl of maliciousUrls) {
    assert.equal(sanitizeSafeHttpUrl(badUrl), null, `Debe bloquear: ${badUrl}`);

    const evRes = attachTaskEvidence(
      INITIAL_SEED_DATA,
      'grp-ept-01',
      'tsk-ept-3',
      badUrl,
      true
    );
    assert.ok(evRes.error, `attachTaskEvidence debe rechazar ${badUrl}`);

    const resAdd = addResourceToGroup(INITIAL_SEED_DATA, 'grp-ept-01', {
      title: 'Enlace sospechoso',
      category: 'Rúbrica PDF',
      url: badUrl,
    });
    assert.ok(resAdd.error, `addResourceToGroup debe rechazar ${badUrl}`);
  }

  assert.equal(
    sanitizeSafeHttpUrl('docs.google.com/document/d/abc'),
    'https://docs.google.com/document/d/abc'
  );
});

test('Seguridad Auth: almacena hashes SHA-256 con sal, migra cuentas antiguas, limpia sesión y bloquea bypass sin contraseña', () => {
  const reg = registerStudentInList(DEFAULT_STUDENT_ACCOUNTS, {
    id: 'stu-seguro-01',
    displayName: 'Camila Seguridad',
    email: 'camila.sec@colegio.edu.pe',
    gradeLevel: '4',
    sectionLetter: 'B',
    password: 'MiClaveSegura2026',
  });

  assert.equal(reg.error, undefined);
  const stored = reg.accounts.find((a) => a.id === 'stu-seguro-01')!;
  assert.equal('password' in stored, false);
  assert.equal(stored.passwordHash?.length, 64);
  assert.ok((stored.passwordSalt?.length || 0) >= 16);
  assert.notEqual(stored.passwordHash, 'MiClaveSegura2026');

  // Session payload must never include hash or salt
  assert.equal(reg.account?.passwordHash, undefined);
  assert.equal(reg.account?.passwordSalt, undefined);
  const cleanSession = sanitizeAccountForSession(stored);
  assert.equal(cleanSession.passwordHash, undefined);
  assert.equal(cleanSession.passwordSalt, undefined);

  // Wrong password fails with generic message
  const wrongLogin = authenticateStudentFromList(reg.accounts, {
    email: 'camila.sec@colegio.edu.pe',
    password: 'otra-password',
  });
  assert.ok(wrongLogin.error);
  assert.equal(wrongLogin.account, undefined);

  // Empty-password bypass against account lacking passwordHash must fail
  const brokenAccounts = [
    {
      id: 'stu-no-hash',
      displayName: 'Sin Hash',
      email: 'sinhash@colegio.edu.pe',
      gradeCourse: '5° Secundaria · Sección A',
      authProvider: 'student-account' as const,
      createdAt: '2026-11-10T00:00:00Z',
    },
  ];
  const bypassAttempt = authenticateStudentFromList(brokenAccounts, {
    email: 'sinhash@colegio.edu.pe',
    password: 'cualquier-cosa',
  });
  assert.ok(bypassAttempt.error);
  assert.equal(bypassAttempt.account, undefined);

  // Legacy plaintext migration converts plaintext password into salted hash
  const legacyRaw = [
    {
      id: 'stu-legacy-1',
      displayName: 'Legacy User',
      email: 'legacy@colegio.edu.pe',
      gradeCourse: '3° Secundaria · Sección A',
      authProvider: 'student-account',
      password: 'viejaClave123',
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];
  const migrated = migrateAndSanitizeAccounts(legacyRaw);
  assert.equal('password' in migrated[0], false);
  assert.equal(migrated[0].passwordHash?.length, 64);
  const legacyLogin = authenticateStudentFromList(migrated, {
    email: 'legacy@colegio.edu.pe',
    password: 'viejaClave123',
  });
  assert.equal(legacyLogin.error, undefined);
  assert.equal(legacyLogin.account?.id, 'stu-legacy-1');
});

test('Sanitización defensiva de localStorage: recupera de JSON corrupto y neutraliza URLs maliciosas', () => {
  const tamperedPayload = {
    activeGroupId: 'grp-inexistente',
    groups: [
      {
        id: 'grp-tampered',
        name: 'Grupo Alterado',
        course: 'Historia',
        members: null, // corrupted
        tasks: [
          {
            id: 'tsk-bad-url',
            title: 'Tarea con link inyectado',
            assignee: 'Alumno',
            dueDate: '2026-11-25',
            priority: 'INVALID',
            status: 'Terminado',
            evidenceUrl: 'javascript:alert(1)',
            subtasks: null,
          },
        ],
        resources: [
          {
            id: 'res-bad',
            title: 'Recurso XSS',
            category: 'PDF',
            url: 'javascript:void(0)',
          },
          {
            id: 'res-good',
            title: 'Recurso Seguro',
            category: 'PDF',
            url: 'https://drive.google.com/file/d/safe',
          },
        ],
      },
    ],
  };

  const sanitized = sanitizeAppState(tamperedPayload, INITIAL_SEED_DATA);
  assert.equal(sanitized.activeGroupId, 'grp-tampered');
  const grp = sanitized.groups[0];
  assert.ok(Array.isArray(grp.members) && grp.members.length > 0);
  assert.equal(grp.tasks[0].evidenceUrl, '');
  // Downgraded from Terminado because malicious evidence was stripped
  assert.equal(grp.tasks[0].status, 'En Progreso');
  assert.equal(grp.tasks[0].priority, 'Media');
  assert.ok(Array.isArray(grp.tasks[0].subtasks));
  // Malicious resource stripped, safe resource kept
  assert.equal(grp.resources.length, 1);
  assert.equal(grp.resources[0].id, 'res-good');
});

test('Permisos exclusivos del Creador (#3): solo el creador mueve estados, deja notas, aprueba/rechaza y expulsa integrantes', () => {
  const creator = { id: 'stu-valeria', displayName: 'Valeria Rojas' };
  const teammate = { id: 'stu-mateo', displayName: 'Mateo Quispe' };
  const eptGroup = INITIAL_SEED_DATA.groups[0];

  assert.equal(isGroupCreator(eptGroup, creator), true);
  assert.equal(isGroupCreator(eptGroup, teammate), false);

  // Non-creator blocked from status transition
  const memberMove = transitionTaskStatus(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-1',
    'En Progreso',
    '2026-11-16T10:00:00Z',
    teammate
  );
  assert.ok(memberMove.error);

  // Creator allowed to move status
  const creatorMove = transitionTaskStatus(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-1',
    'En Progreso',
    '2026-11-16T10:00:00Z',
    creator
  );
  assert.equal(creatorMove.error, undefined);

  // Non-creator blocked from coordinator notes & kicking
  const memberNote = setTaskCoordinatorNote(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-2',
    'No debería poder',
    teammate
  );
  assert.ok(memberNote.error);

  const memberKick = kickMemberFromGroup(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'Diego Paredes',
    teammate
  );
  assert.ok(memberKick.error);

  // Creator can leave note and kick teammate, but cannot kick self
  const creatorNote = setTaskCoordinatorNote(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-2',
    'Agrega el costo del envío en la tabla.',
    creator,
    '2026-11-16T11:30:00Z'
  );
  assert.equal(creatorNote.error, undefined);
  const notedTask = creatorNote.state.groups[0].tasks.find(
    (t) => t.id === 'tsk-ept-2'
  )!;
  assert.equal(notedTask.coordinatorNote, 'Agrega el costo del envío en la tabla.');
  assert.equal(notedTask.coordinatorNoteBy, 'Valeria Rojas');

  const selfKick = kickMemberFromGroup(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'Valeria Rojas',
    creator
  );
  assert.ok(selfKick.error);

  const validKick = kickMemberFromGroup(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'Diego Paredes',
    creator,
    '2026-11-16T12:00:00Z'
  );
  assert.equal(validKick.error, undefined);
  assert.equal(
    validKick.state.groups[0].members.includes('Diego Paredes'),
    false
  );
});

test('Corrección de tareas e historial privado (#4): solo visible para el editor y el creador, oculto a terceros', () => {
  const creator = { id: 'stu-valeria', displayName: 'Valeria Rojas' };
  const assignee = { id: 'stu-mateo', displayName: 'Mateo Quispe' };
  const thirdMember = { id: 'stu-diego', displayName: 'Diego Paredes' };

  const eptGroup = INITIAL_SEED_DATA.groups[0];
  const mateoTask = eptGroup.tasks.find((t) => t.id === 'tsk-ept-2')!;
  assert.equal(canEditTask(eptGroup, mateoTask, assignee), true);
  assert.equal(canEditTask(eptGroup, mateoTask, creator), true);
  assert.equal(canEditTask(eptGroup, mateoTask, thirdMember), false);

  // Third teammate cannot edit Mateo's task
  const blockedEdit = editTaskInGroup(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-2',
    { title: 'Cambio no autorizado' },
    thirdMember
  );
  assert.ok(blockedEdit.error);

  // Assignee corrects their task with exact timestamp
  const edited = editTaskInGroup(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-2',
    {
      title: 'Tabla de costos y presupuesto final',
      evidenceUrl: 'https://docs.google.com/spreadsheets/d/costos-corregidos',
    },
    assignee,
    '2026-11-16T16:42:19.000Z'
  );
  assert.equal(edited.error, undefined);
  assert.equal(edited.recordedEdit?.editedAt, '2026-11-16T16:42:19.000Z');
  assert.equal(edited.recordedEdit?.changes.length, 2);

  const updatedGroup = edited.state.groups[0];
  const updatedTask = updatedGroup.tasks.find((t) => t.id === 'tsk-ept-2')!;

  // Privacy enforcement: editor sees it, creator sees it, 3rd teammate sees []
  assert.equal(
    getVisibleTaskEditHistory(updatedTask, updatedGroup, assignee).length,
    1
  );
  assert.equal(
    getVisibleTaskEditHistory(updatedTask, updatedGroup, creator).length,
    1
  );
  assert.equal(
    getVisibleTaskEditHistory(updatedTask, updatedGroup, thirdMember).length,
    0
  );
});

test('Cronología (#5), Desempeño y Notas (#6), Tarjeta Rechazada (#7) y Calendario Móvil (#8)', () => {
  const creator = { id: 'stu-valeria', displayName: 'Valeria Rojas' };
  const diego = { id: 'stu-diego', displayName: 'Diego Paredes' };

  // #5: startedAt, completedAt, and activityLog updated automatically
  const started = transitionTaskStatus(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-5',
    'En Progreso',
    '2026-11-16T09:15:00.000Z',
    creator
  );
  const startedTask = started.state.groups[0].tasks.find(
    (t) => t.id === 'tsk-ept-5'
  )!;
  assert.equal(startedTask.startedAt, '2026-11-16T09:15:00.000Z');
  assert.ok(
    (started.state.groups[0].activityLog || []).some(
      (entry) =>
        entry.type === 'task_started' &&
        entry.timestamp === '2026-11-16T09:15:00.000Z'
    )
  );

  // #7: Rejection flags card as rejected and resets to pendiente upon edit
  const rejected = reviewTaskEvidence(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-4',
    'rechazada',
    'Falta el gráfico de barras final',
    '2026-11-16T14:00:00.000Z',
    creator
  );
  assert.equal(rejected.error, undefined);
  const rejTask = rejected.state.groups[0].tasks.find(
    (t) => t.id === 'tsk-ept-4'
  )!;
  assert.equal(isTaskRejected(rejTask), true);
  assert.equal(rejTask.status, 'En Progreso');

  const fixed = editTaskInGroup(
    rejected.state,
    'grp-ept-01',
    'tsk-ept-4',
    { evidenceUrl: 'https://docs.google.com/forms/d/encuesta-corregida' },
    diego,
    '2026-11-16T15:00:00.000Z'
  );
  assert.equal(fixed.error, undefined);
  const fixedTask = fixed.state.groups[0].tasks.find(
    (t) => t.id === 'tsk-ept-4'
  )!;
  assert.equal(isTaskRejected(fixedTask), false);
  assert.equal(fixedTask.evidenceReviewStatus, 'pendiente');

  // #6: Teacher grade & performance calculation
  const nonCreatorGrade = setTaskTeacherGrade(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-5',
    19,
    'Muy bien',
    diego
  );
  assert.ok(nonCreatorGrade.error);

  const invalidGrade = setTaskTeacherGrade(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-5',
    25,
    'Fuera de rango',
    creator
  );
  assert.ok(invalidGrade.error);

  const graded = setTaskTeacherGrade(
    INITIAL_SEED_DATA,
    'grp-ept-01',
    'tsk-ept-5',
    20,
    'Excelente redacción entregada antes de tiempo.',
    creator
  );
  assert.equal(graded.error, undefined);
  const perf = calculateTeamPerformance(
    graded.state.groups[0].members,
    graded.state.groups[0].tasks
  );
  const valeriaPerf = perf.find((p) => p.member === 'Valeria Rojas')!;
  assert.equal(valeriaPerf.earlyDeliveryPct, 100);
  assert.equal(valeriaPerf.averageTeacherGrade, 20);

  // #8: Google Calendar URL and RFC 5545 .ics export with 1-day-before alarm
  const group = INITIAL_SEED_DATA.groups[0];
  const task = group.tasks[0];
  const gcalUrl = buildGoogleCalendarUrl(task, group);
  assert.ok(gcalUrl.startsWith('https://calendar.google.com/calendar/render?'));
  assert.ok(gcalUrl.includes('action=TEMPLATE'));

  const singleIcs = buildTaskIcsContent(task, group);
  assert.ok(singleIcs.includes('BEGIN:VCALENDAR'));
  assert.ok(singleIcs.includes('BEGIN:VEVENT'));
  assert.ok(singleIcs.includes('TRIGGER:-P1D'));

  const groupIcs = buildGroupIcsContent(group);
  assert.ok(groupIcs.includes('BEGIN:VCALENDAR'));
  assert.ok(groupIcs.includes('X-WR-CALNAME:'));
});

test('Disolver grupo: exclusivo del creador, cambia activeGroupId al siguiente grupo y limpia estado si era el último', () => {
  const creator = { id: 'stu-valeria', displayName: 'Valeria Rojas' };
  const teammate = { id: 'stu-mateo', displayName: 'Mateo Quispe' };

  // Non-creator cannot dissolve group
  const blocked = dissolveGroup(INITIAL_SEED_DATA, 'grp-ept-01', teammate);
  assert.ok(blocked.error);
  assert.equal(blocked.state.groups.length, 2);

  // Creator dissolves active group -> activeGroupId moves to remaining group
  const afterFirst = dissolveGroup(INITIAL_SEED_DATA, 'grp-ept-01', creator);
  assert.equal(afterFirst.error, undefined);
  assert.equal(afterFirst.dissolvedGroup?.id, 'grp-ept-01');
  assert.equal(afterFirst.state.groups.length, 1);
  assert.equal(afterFirst.state.activeGroupId, 'grp-com-02');

  // Dissolving the last remaining group leaves clean empty workspace
  const remaining = afterFirst.state.groups[0];
  const comCreator = {
    id: remaining.creatorId || 'stu-valeria',
    displayName: remaining.creatorName || remaining.members[0],
  };
  const afterLast = dissolveGroup(afterFirst.state, 'grp-com-02', comCreator);
  assert.equal(afterLast.error, undefined);
  assert.equal(afterLast.state.groups.length, 0);
  assert.equal(afterLast.state.activeGroupId, '');
});

