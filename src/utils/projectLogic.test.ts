import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SEED_DATA,
  validateTaskTransition,
  calculateGroupProgress,
  calculateMemberWorkloads,
  evaluateWorkloadEquity,
  transitionTaskStatus,
  attachTaskEvidence,
  reviewTaskEvidence,
  createTaskInGroup,
  createNewGroup,
  joinGroupByInviteCode,
  groupTasksByDeadline,
  addResourceToGroup,
  removeResourceFromGroup,
  toggleSubtaskInGroup,
  addSubtaskToTask,
  formatShortDate,
} from './projectLogic';
import {
  DEFAULT_STUDENT_ACCOUNTS,
  registerStudentInList,
  authenticateStudentFromList,
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
