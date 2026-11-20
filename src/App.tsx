import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  AppState,
  STORAGE_KEY,
  Task,
  TaskStatus,
  EvidenceReviewStatus,
  selectActiveGroup,
  createNewGroup,
  joinGroupByInviteCode,
  addMemberToGroup,
  createTaskInGroup,
  transitionTaskStatus,
  attachTaskEvidence,
  reviewTaskEvidence,
  toggleSubtaskInGroup,
  addSubtaskToTask,
  deleteTask,
  addResourceToGroup,
  removeResourceFromGroup,
} from './utils/projectLogic';
import {
  StudentAccount,
  GradeOption,
  SectionOption,
  ACCOUNTS_STORAGE_KEY,
  ACTIVE_SESSION_STORAGE_KEY,
  DEFAULT_STUDENT_ACCOUNTS,
  getStudentWorkspaceStorageKey,
  registerStudentInList,
  authenticateStudentFromList,
  buildPersonalizedInitialWorkspace,
} from './utils/authLogic';
import { auth, googleProvider, syncStudentToFirestore } from './firebase';
import { AuthScreen } from './components/AuthScreen';
import { LeftSidebar, WorkspaceTab } from './components/LeftSidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { AmbientBackground } from './components/AmbientBackground';
import {
  NewGroupModal,
  JoinGroupByCodeModal,
  NewTaskModal,
  AddResourceModal,
  EvidenceAlertModal,
} from './components/Modals';

function loadStudentAccounts(): StudentAccount[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        ACCOUNTS_STORAGE_KEY,
        JSON.stringify(DEFAULT_STUDENT_ACCOUNTS)
      );
      return DEFAULT_STUDENT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw) as StudentAccount[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_STUDENT_ACCOUNTS;
  } catch {
    return DEFAULT_STUDENT_ACCOUNTS;
  }
}

function loadActiveStudentSession(
  accounts: StudentAccount[]
): StudentAccount | null {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return accounts[0] || DEFAULT_STUDENT_ACCOUNTS[0];
    }
    const raw = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentAccount;
    if (parsed && typeof parsed.id === 'string' && parsed.displayName) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function loadWorkspaceForStudent(student: StudentAccount | null): AppState {
  const fallbackName = student?.displayName || 'Valeria Rojas';
  const personalizedSeed = buildPersonalizedInitialWorkspace(fallbackName);

  if (!student) {
    return personalizedSeed;
  }

  const studentKey = getStudentWorkspaceStorageKey(student.id);
  try {
    const raw = window.localStorage.getItem(studentKey);
    if (!raw) {
      window.localStorage.setItem(studentKey, JSON.stringify(personalizedSeed));
      return personalizedSeed;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (
      parsed &&
      Array.isArray(parsed.groups) &&
      parsed.groups.length > 0 &&
      typeof parsed.activeGroupId === 'string'
    ) {
      return parsed;
    }
    return personalizedSeed;
  } catch {
    return personalizedSeed;
  }
}

export default function App() {
  const [accounts, setAccounts] =
    useState<StudentAccount[]>(loadStudentAccounts);
  const [currentStudent, setCurrentStudent] = useState<StudentAccount | null>(
    () => loadActiveStudentSession(loadStudentAccounts())
  );
  const [appState, setAppState] = useState<AppState>(() =>
    loadWorkspaceForStudent(loadActiveStudentSession(loadStudentAccounts()))
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tareas');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<
    string | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskDefaultStatus, setNewTaskDefaultStatus] =
    useState<TaskStatus>('Por Hacer');
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);

  // Anti-Paseos Alert / Evidence Modal state
  const [evidenceModalState, setEvidenceModalState] = useState<{
    isOpen: boolean;
    task: Task | null;
    mode: 'blocked-alert' | 'edit-evidence';
    alertMessage?: string;
  }>({
    isOpen: false,
    task: null,
    mode: 'edit-evidence',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  // Listen to Firebase Auth state changes for Google Sign-In
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const googleStudent: StudentAccount = {
          id: firebaseUser.uid,
          displayName:
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            'Estudiante',
          email: firebaseUser.email || 'estudiante@colegio.edu.pe',
          gradeLevel: '5',
          sectionLetter: 'A',
          gradeCourse: '5° Secundaria · Sección A',
          authProvider: 'google',
          createdAt: new Date().toISOString(),
        };
        setCurrentStudent(googleStudent);
        const workspace = loadWorkspaceForStudent(googleStudent);
        setAppState(workspace);
        try {
          window.localStorage.setItem(
            ACTIVE_SESSION_STORAGE_KEY,
            JSON.stringify(googleStudent)
          );
        } catch {
          // Ignore storage quota errors
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Persist student accounts list
  useEffect(() => {
    try {
      window.localStorage.setItem(
        ACCOUNTS_STORAGE_KEY,
        JSON.stringify(accounts)
      );
    } catch {
      // Ignore storage errors
    }
  }, [accounts]);

  // Persist current student's isolated workspace to localStorage and Firestore (if Google auth)
  useEffect(() => {
    if (!currentStudent) return;
    const studentKey = getStudentWorkspaceStorageKey(currentStudent.id);
    try {
      window.localStorage.setItem(studentKey, JSON.stringify(appState));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch {
      // Ignore storage quota errors
    }

    if (currentStudent.authProvider === 'google' && auth.currentUser) {
      syncStudentToFirestore({
        uid: currentStudent.id,
        displayName: currentStudent.displayName,
        email: currentStudent.email,
        gradeCourse: currentStudent.gradeCourse,
        state: appState,
      }).catch(() => {
        // Handled by handleFirestoreError inside syncStudentToFirestore
      });
    }
  }, [appState, currentStudent]);

  const activateStudentSession = (
    student: StudentAccount,
    welcomeToast: string
  ) => {
    const workspace = loadWorkspaceForStudent(student);
    setCurrentStudent(student);
    setAppState(workspace);
    setSelectedMemberFilter(null);
    setActiveTab('tareas');
    try {
      window.localStorage.setItem(
        ACTIVE_SESSION_STORAGE_KEY,
        JSON.stringify(student)
      );
    } catch {
      // Ignore storage errors
    }
    showToast(welcomeToast);
  };

  const handleLoginSubmit = (payload: {
    email: string;
    password: string;
  }): { error?: string } => {
    const result = authenticateStudentFromList(accounts, payload);
    if (result.error || !result.account) {
      return { error: result.error || 'Error al iniciar sesión.' };
    }
    activateStudentSession(
      result.account,
      `¡Hola de nuevo, ${result.account.displayName}!`
    );
    return {};
  };

  const handleRegisterSubmit = (payload: {
    displayName: string;
    email: string;
    gradeLevel: GradeOption;
    sectionLetter: SectionOption;
    gradeCourse: string;
    password: string;
  }): { error?: string } => {
    const result = registerStudentInList(accounts, payload);
    if (result.error || !result.account) {
      return { error: result.error || 'No se pudo crear la cuenta.' };
    }
    setAccounts(result.accounts);
    activateStudentSession(
      result.account,
      `¡Cuenta creada! Bienvenido(a), ${result.account.displayName}`
    );
    return {};
  };

  const handleGoogleSignIn = async (): Promise<{ error?: string }> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      const googleStudent: StudentAccount = {
        id: user.uid,
        displayName:
          user.displayName || user.email?.split('@')[0] || 'Estudiante',
        email: user.email || 'estudiante@colegio.edu.pe',
        gradeLevel: '5',
        sectionLetter: 'A',
        gradeCourse: '5° Secundaria · Sección A',
        authProvider: 'google',
        createdAt: new Date().toISOString(),
      };
      activateStudentSession(
        googleStudent,
        `Conectado como ${googleStudent.displayName}`
      );
      return {};
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('auth/popup-closed-by-user')) {
        return { error: 'Cerraste la ventana de Google antes de terminar.' };
      }
      return {
        error:
          'No se pudo completar el acceso con Google en esta ventana. Puedes usar tu correo estudiantil o una cuenta rápida.',
      };
    }
  };

  const handleSelectDemoStudent = (account: StudentAccount) => {
    activateStudentSession(
      account,
      `Sesión iniciada como ${account.displayName}`
    );
  };

  const handleLogout = () => {
    if (currentStudent?.authProvider === 'google') {
      signOut(auth).catch(() => {});
    }
    setCurrentStudent(null);
    setSelectedMemberFilter(null);
    try {
      window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  // Show Login / Register Screen before entering the app if no student is authenticated
  if (!currentStudent) {
    return (
      <AuthScreen
        demoAccounts={accounts}
        onLoginSubmit={handleLoginSubmit}
        onRegisterSubmit={handleRegisterSubmit}
        onGoogleSignIn={handleGoogleSignIn}
        onSelectDemoStudent={handleSelectDemoStudent}
      />
    );
  }

  const activeGroup = selectActiveGroup(appState) || appState.groups[0];

  const handleSelectGroup = (groupId: string) => {
    setSelectedMemberFilter(null);
    setAppState((prev) => ({
      ...prev,
      activeGroupId: groupId,
    }));
  };

  const handleCreateGroup = (payload: {
    name: string;
    course: string;
    members: string[];
    coverUrl?: string;
  }) => {
    setSelectedMemberFilter(null);
    setActiveTab('tareas');
    const membersWithStudent = payload.members.some(
      (m) =>
        m.trim().toLowerCase() ===
        currentStudent.displayName.trim().toLowerCase()
    )
      ? payload.members
      : [currentStudent.displayName, ...payload.members];

    setAppState((prev) =>
      createNewGroup(prev, { ...payload, members: membersWithStudent })
    );
    showToast(`Grupo "${payload.name}" guardado en tu cuenta`);
  };

  const handleJoinGroupByCode = (code: string): { error?: string } => {
    const result = joinGroupByInviteCode(
      appState,
      code,
      currentStudent.displayName
    );
    if (result.error) {
      return { error: result.error };
    }
    setSelectedMemberFilter(null);
    setActiveTab('tareas');
    setAppState(result.state);
    showToast(
      `Te uniste al grupo "${result.joinedGroup?.name || code.toUpperCase()}"`
    );
    return {};
  };

  const handleCopyInviteCode = (code: string) => {
    try {
      navigator.clipboard?.writeText(code);
    } catch {
      // Ignore clipboard permission errors
    }
    showToast(`Código ${code} copiado para compartir con tu equipo`);
  };

  const handleAddMemberToActiveGroup = (memberName: string) => {
    setAppState((prev) => addMemberToGroup(prev, activeGroup.id, memberName));
    showToast(`${memberName} se unió al equipo`);
  };

  const handleOpenNewTaskModal = (defaultStatus: TaskStatus = 'Por Hacer') => {
    setNewTaskDefaultStatus(defaultStatus);
    setIsNewTaskOpen(true);
  };

  const handleCreateTask = (payload: {
    title: string;
    assignee: string;
    dueDate: string;
    status: TaskStatus;
    evidenceUrl: string;
    subtasks: string[];
  }): { error?: string } => {
    const result = createTaskInGroup(appState, activeGroup.id, payload);
    if (result.error) {
      return { error: result.error };
    }
    setAppState(result.state);
    setActiveTab('tareas');
    showToast(`Tarea asignada a ${payload.assignee}`);
    return {};
  };

  const handleAttemptStatusChange = (task: Task, targetStatus: TaskStatus) => {
    const result = transitionTaskStatus(
      appState,
      activeGroup.id,
      task.id,
      targetStatus
    );

    if (result.error) {
      setEvidenceModalState({
        isOpen: true,
        task: result.blockedTask || task,
        mode: 'blocked-alert',
        alertMessage: result.error,
      });
      return;
    }

    setAppState(result.state);
    if (targetStatus === 'Terminado') {
      showToast('¡Tarea terminada con evidencia verificada!');
    }
  };

  const handleOpenAttachEvidenceModal = (task: Task) => {
    setEvidenceModalState({
      isOpen: true,
      task,
      mode: 'edit-evidence',
    });
  };

  const handleSaveEvidence = (
    taskId: string,
    evidenceUrl: string,
    moveToCompleted: boolean,
    reviewStatus?: EvidenceReviewStatus,
    reviewNote?: string
  ): { error?: string } => {
    const attachResult = attachTaskEvidence(
      appState,
      activeGroup.id,
      taskId,
      evidenceUrl,
      moveToCompleted
    );
    if (attachResult.error) {
      return { error: attachResult.error };
    }

    let nextState = attachResult.state;
    if (evidenceUrl.trim() && reviewStatus) {
      const reviewResult = reviewTaskEvidence(
        nextState,
        activeGroup.id,
        taskId,
        reviewStatus,
        reviewNote || ''
      );
      if (!reviewResult.error) {
        nextState = reviewResult.state;
      }
    }

    setAppState(nextState);
    showToast(
      moveToCompleted
        ? '¡Evidencia adjuntada y tarea terminada!'
        : reviewStatus === 'verificada'
        ? '¡Evidencia marcada como Verificada por el equipo!'
        : 'Enlace y revisión de evidencia guardados'
    );
    return {};
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setAppState((prev) =>
      toggleSubtaskInGroup(prev, activeGroup.id, taskId, subtaskId)
    );
  };

  const handleAddSubtask = (taskId: string, text: string) => {
    setAppState((prev) =>
      addSubtaskToTask(prev, activeGroup.id, taskId, text)
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setAppState((prev) => deleteTask(prev, activeGroup.id, taskId));
  };

  const handleAddResource = (payload: {
    title: string;
    category: string;
    url: string;
  }): { error?: string } => {
    const result = addResourceToGroup(appState, activeGroup.id, payload);
    if (result.error) {
      return { error: result.error };
    }
    setAppState(result.state);
    showToast(`Enlace "${payload.title}" fijado`);
    return {};
  };

  const handleDeleteResource = (resourceId: string) => {
    setAppState((prev) =>
      removeResourceFromGroup(prev, activeGroup.id, resourceId)
    );
  };

  const handleResetSeedData = () => {
    setSelectedMemberFilter(null);
    setActiveTab('tareas');
    const personalized = buildPersonalizedInitialWorkspace(
      currentStudent.displayName
    );
    setAppState(personalized);
    const studentKey = getStudentWorkspaceStorageKey(currentStudent.id);
    try {
      window.localStorage.setItem(studentKey, JSON.stringify(personalized));
    } catch {
      // Ignore storage errors
    }
    showToast('Datos iniciales restaurados para tu cuenta');
  };

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#0B0F17] text-slate-100 flex flex-col lg:flex-row overflow-x-hidden lg:overflow-hidden relative isolate">
      {/* Fondo Sutil con Gradiente Animado y Partículas Flotantes */}
      <AmbientBackground />

      {/* Barra Lateral Izquierda Minimalista con Perfil del Estudiante */}
      <LeftSidebar
        currentStudent={currentStudent}
        groups={appState.groups}
        activeGroup={activeGroup}
        activeTab={activeTab}
        selectedMemberFilter={selectedMemberFilter}
        onSelectGroup={handleSelectGroup}
        onSelectTab={setActiveTab}
        onSelectMemberFilter={setSelectedMemberFilter}
        onOpenNewGroupModal={() => setIsNewGroupOpen(true)}
        onOpenJoinCodeModal={() => setIsJoinCodeOpen(true)}
        onResetSeedData={handleResetSeedData}
        onLogout={handleLogout}
      />

      {/* Área Principal Despejada con Portada Visual y Pestañas */}
      <KanbanBoard
        activeGroup={activeGroup}
        activeTab={activeTab}
        selectedMemberFilter={selectedMemberFilter}
        onSelectTab={setActiveTab}
        onSelectMemberFilter={setSelectedMemberFilter}
        onOpenNewTaskModal={handleOpenNewTaskModal}
        onOpenAddResourceModal={() => setIsAddResourceOpen(true)}
        onAttemptStatusChange={handleAttemptStatusChange}
        onOpenAttachEvidenceModal={handleOpenAttachEvidenceModal}
        onToggleSubtask={handleToggleSubtask}
        onAddSubtask={handleAddSubtask}
        onDeleteTask={handleDeleteTask}
        onDeleteResource={handleDeleteResource}
        onAddMemberToActiveGroup={handleAddMemberToActiveGroup}
        onCopyInviteCode={handleCopyInviteCode}
      />

      {/* Notificación Flotante Animada (Toast) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            role="status"
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#162238] border border-sky-400/40 text-xs font-medium text-slate-100 shadow-xl"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modales Simples */}
      <NewGroupModal
        isOpen={isNewGroupOpen}
        onClose={() => setIsNewGroupOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      <JoinGroupByCodeModal
        isOpen={isJoinCodeOpen}
        onClose={() => setIsJoinCodeOpen(false)}
        onJoinGroupByCode={handleJoinGroupByCode}
      />

      <NewTaskModal
        isOpen={isNewTaskOpen}
        members={activeGroup.members}
        defaultStatus={newTaskDefaultStatus}
        onClose={() => setIsNewTaskOpen(false)}
        onCreateTask={handleCreateTask}
      />

      <AddResourceModal
        isOpen={isAddResourceOpen}
        groupName={activeGroup.name}
        onClose={() => setIsAddResourceOpen(false)}
        onAddResource={handleAddResource}
      />

      <EvidenceAlertModal
        isOpen={evidenceModalState.isOpen}
        task={evidenceModalState.task}
        mode={evidenceModalState.mode}
        alertMessage={evidenceModalState.alertMessage}
        onClose={() =>
          setEvidenceModalState((prev) => ({ ...prev, isOpen: false }))
        }
        onSaveEvidence={handleSaveEvidence}
      />
    </div>
  );
}
