import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Menu,
  Plus,
  FolderPlus,
  KeyRound,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import {
  AppState,
  PROJECT_LIMITS,
  Priority,
  Task,
  TaskStatus,
  EvidenceReviewStatus,
  selectActiveGroup,
  isGroupCreator,
  createNewGroup,
  dissolveGroup,
  addMemberToGroup,
  kickMemberFromGroup,
  createTaskInGroup,
  transitionTaskStatus,
  attachTaskEvidence,
  editTaskInGroup,
  setTaskCoordinatorNote,
  setTaskTeacherGrade,
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
  formatGradeAndSection,
} from './utils/authLogic';
import {
  auth,
  googleProvider,
  RegistrationProfileOverride,
  loadOrCreateUserProfile,
  updateUserProfileInFirestore,
  updateUserActiveGroupInFirestore,
  subscribeToUserGroups,
  createGroupInFirestore,
  joinGroupByInviteCodeInFirestore,
  dissolveGroupInFirestore,
  updateGroupMembersInFirestore,
  createTaskInFirestore,
  updateTaskInFirestore,
  updateTaskSubtasksInFirestore,
  deleteTaskInFirestore,
  createResourceInFirestore,
  deleteResourceInFirestore,
  formatFriendlyFirestoreError,
} from './firebase';
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
  EditTaskModal,
  CoordinatorNoteModal,
  TeacherGradeModal,
  DissolveGroupModal,
  ProfileSetupModal,
} from './components/Modals';

const EMPTY_APP_STATE: AppState = {
  activeGroupId: '',
  groups: [],
};

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentAccount | null>(
    null
  );
  const [appState, setAppState] = useState<AppState>(EMPTY_APP_STATE);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tareas');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<
    string | null
  >(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const preferredGroupIdRef = useRef<string>('');
  const pendingRegistrationRef = useRef<RegistrationProfileOverride | null>(
    null
  );

  // Modal states
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskDefaultStatus, setNewTaskDefaultStatus] =
    useState<TaskStatus>('Por Hacer');
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [isDissolveGroupOpen, setIsDissolveGroupOpen] = useState(false);
  const [isDissolvingGroup, setIsDissolvingGroup] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileRequired, setIsProfileRequired] = useState(false);

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

  // Modales de Corrección (#4), Nota del Creador (#3) y Calificación del Profesor (#6)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [noteModalTaskId, setNoteModalTaskId] = useState<string | null>(null);
  const [gradeModalTaskId, setGradeModalTaskId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3400);
  };

  // Listen to Firebase Auth state and load user profile + live Firestore groups
  useEffect(() => {
    let groupsUnsub: (() => void) | null = null;
    let isCancelled = false;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (groupsUnsub) {
        groupsUnsub();
        groupsUnsub = null;
      }

      if (!firebaseUser) {
        if (!isCancelled) {
          setCurrentStudent(null);
          setAppState(EMPTY_APP_STATE);
          setGroupsLoaded(false);
          setIsProfileModalOpen(false);
          setIsProfileRequired(false);
          setIsDissolveGroupOpen(false);
          preferredGroupIdRef.current = '';
          setAuthReady(true);
        }
        return;
      }

      try {
        const regOverride = pendingRegistrationRef.current;
        pendingRegistrationRef.current = null;
        const profile = await loadOrCreateUserProfile(
          firebaseUser,
          regOverride
        );
        if (isCancelled) return;

        preferredGroupIdRef.current = profile.activeGroupId;
        setCurrentStudent(profile.account);
        if (profile.needsProfileSetup) {
          setIsProfileRequired(true);
          setIsProfileModalOpen(true);
        }
        setAuthReady(true);

        groupsUnsub = subscribeToUserGroups(
          firebaseUser.uid,
          (liveGroups) => {
            if (isCancelled) return;
            setGroupsLoaded(true);
            setAppState((prev) => {
              const currentValid = liveGroups.some(
                (g) => g.id === prev.activeGroupId
              );
              const preferredValid = liveGroups.some(
                (g) => g.id === preferredGroupIdRef.current
              );
              const nextActiveId = currentValid
                ? prev.activeGroupId
                : preferredValid
                ? preferredGroupIdRef.current
                : liveGroups[0]?.id || '';
              return {
                activeGroupId: nextActiveId,
                groups: liveGroups,
              };
            });
          },
          (err) => {
            if (isCancelled) return;
            setGroupsLoaded(true);
            showToast(formatFriendlyFirestoreError(err));
          }
        );
      } catch (err) {
        if (!isCancelled) {
          setAuthReady(true);
          showToast(formatFriendlyFirestoreError(err));
        }
      }
    });

    return () => {
      isCancelled = true;
      authUnsub();
      if (groupsUnsub) groupsUnsub();
    };
  }, []);

  const mapFirebaseAuthError = (error: unknown): string => {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code || '')
        : '';
    const msg = error instanceof Error ? error.message : String(error);
    const combined = `${code} ${msg}`;

    if (combined.includes('auth/operation-not-allowed')) {
      return 'El inicio con correo y contraseña aún no está activado en Firebase Console. Habilita "Correo electrónico/contraseña" en Authentication → Sign-in method.';
    }
    if (combined.includes('auth/email-already-in-use')) {
      return 'Este correo ya tiene una cuenta registrada. Cambia a "Iniciar sesión" para ingresar.';
    }
    if (
      combined.includes('auth/invalid-credential') ||
      combined.includes('auth/wrong-password') ||
      combined.includes('auth/user-not-found')
    ) {
      return 'Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.';
    }
    if (combined.includes('auth/weak-password')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (combined.includes('auth/invalid-email')) {
      return 'Ingresa un correo electrónico válido.';
    }
    if (combined.includes('auth/too-many-requests')) {
      return 'Demasiados intentos seguidos. Espera unos minutos e intenta de nuevo.';
    }
    return 'No se pudo completar la autenticación en este momento. Intenta de nuevo.';
  };

  const handleGoogleSignIn = async (): Promise<{ error?: string }> => {
    try {
      await signInWithPopup(auth, googleProvider);
      return {};
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('auth/popup-closed-by-user')) {
        return { error: 'Cerraste la ventana de Google antes de terminar.' };
      }
      if (msg.includes('auth/popup-blocked')) {
        return {
          error:
            'Tu navegador bloqueó la ventana emergente de Google. Permite ventanas emergentes e intenta otra vez.',
        };
      }
      return {
        error:
          'No se pudo iniciar sesión con Google en este momento. Intenta de nuevo.',
      };
    }
  };

  const handleEmailSignIn = async (payload: {
    email: string;
    password: string;
  }): Promise<{ error?: string }> => {
    try {
      await signInWithEmailAndPassword(
        auth,
        payload.email.trim().toLowerCase(),
        payload.password
      );
      return {};
    } catch (error) {
      return { error: mapFirebaseAuthError(error) };
    }
  };

  const handleEmailRegister = async (payload: {
    displayName: string;
    email: string;
    gradeLevel: GradeOption;
    sectionLetter: SectionOption;
    password: string;
  }): Promise<{ error?: string }> => {
    const cleanName = payload.displayName.trim().slice(0, 80);
    pendingRegistrationRef.current = {
      displayName: cleanName,
      gradeLevel: payload.gradeLevel,
      sectionLetter: payload.sectionLetter,
    };
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        payload.email.trim().toLowerCase(),
        payload.password
      );
      if (cleanName) {
        updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
      }
      return {};
    } catch (error) {
      pendingRegistrationRef.current = null;
      return { error: mapFirebaseAuthError(error) };
    }
  };

  const handleLogout = () => {
    signOut(auth).catch(() => {});
    setCurrentStudent(null);
    setAppState(EMPTY_APP_STATE);
    setSelectedMemberFilter(null);
    setIsMobileMenuOpen(false);
    setIsDissolveGroupOpen(false);
    setActiveTab('tareas');
  };

  const handleSaveProfile = async (payload: {
    displayName: string;
    gradeLevel: GradeOption;
    sectionLetter: SectionOption;
  }) => {
    if (!currentStudent) return;
    await updateUserProfileInFirestore(currentStudent.id, payload);
    setCurrentStudent((prev) =>
      prev
        ? {
            ...prev,
            displayName: payload.displayName,
            gradeLevel: payload.gradeLevel,
            sectionLetter: payload.sectionLetter,
            gradeCourse: formatGradeAndSection(
              payload.gradeLevel,
              payload.sectionLetter
            ),
          }
        : null
    );
    setIsProfileRequired(false);
    showToast('Perfil escolar actualizado');
  };

  // Loading splash while Firebase Auth resolves
  if (!authReady) {
    return (
      <div className="min-h-screen w-full bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6 relative isolate">
        <AmbientBackground />
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
          <p className="font-display text-sm font-semibold text-slate-200">
            Cargando tu espacio colaborativo...
          </p>
        </div>
      </div>
    );
  }

  // Show clean Production Auth Screen if no user is signed in
  if (!currentStudent) {
    return (
      <AuthScreen
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSignIn={handleEmailSignIn}
        onEmailRegister={handleEmailRegister}
      />
    );
  }

  const activeGroup =
    appState.groups.length > 0
      ? selectActiveGroup(appState) || appState.groups[0]
      : null;

  const actor = {
    id: currentStudent.id,
    displayName: currentStudent.displayName,
  };
  const isActiveGroupCreator = activeGroup
    ? isGroupCreator(activeGroup, actor)
    : false;

  const editingTask =
    activeGroup && editingTaskId
      ? activeGroup.tasks.find((t) => t.id === editingTaskId) || null
      : null;
  const noteModalTask =
    activeGroup && noteModalTaskId
      ? activeGroup.tasks.find((t) => t.id === noteModalTaskId) || null
      : null;
  const gradeModalTask =
    activeGroup && gradeModalTaskId
      ? activeGroup.tasks.find((t) => t.id === gradeModalTaskId) || null
      : null;

  const handleSelectGroup = (groupId: string) => {
    setSelectedMemberFilter(null);
    preferredGroupIdRef.current = groupId;
    setAppState((prev) => ({
      ...prev,
      activeGroupId: groupId,
    }));
    updateUserActiveGroupInFirestore(currentStudent.id, groupId).catch(() => {});
  };

  const handleCreateGroup = async (payload: {
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

    const computedState = createNewGroup(appState, {
      ...payload,
      members: membersWithStudent,
      creatorId: currentStudent.id,
      creatorName: currentStudent.displayName,
    });
    const newGroup = computedState.groups[computedState.groups.length - 1];
    if (!newGroup) return;

    try {
      const savedGroup = await createGroupInFirestore(
        newGroup,
        currentStudent.id
      );
      preferredGroupIdRef.current = savedGroup.id;
      setAppState((prev) => {
        const exists = prev.groups.some((g) => g.id === savedGroup.id);
        return {
          activeGroupId: savedGroup.id,
          groups: exists ? prev.groups : [...prev.groups, savedGroup],
        };
      });
      updateUserActiveGroupInFirestore(currentStudent.id, savedGroup.id).catch(
        () => {}
      );
      showToast(
        `Grupo "${savedGroup.name}" creado · código ${savedGroup.inviteCode}`
      );
    } catch (err) {
      showToast(formatFriendlyFirestoreError(err));
    }
  };

  const handleJoinGroupByCode = async (
    code: string
  ): Promise<{ error?: string }> => {
    try {
      const res = await joinGroupByInviteCodeInFirestore(
        code,
        currentStudent.id,
        currentStudent.displayName
      );
      if (res.error) {
        return { error: res.error };
      }
      if (res.groupId) {
        preferredGroupIdRef.current = res.groupId;
        setSelectedMemberFilter(null);
        setActiveTab('tareas');
        setAppState((prev) => ({
          ...prev,
          activeGroupId: res.groupId!,
        }));
        updateUserActiveGroupInFirestore(currentStudent.id, res.groupId).catch(
          () => {}
        );
      }
      showToast(
        `Te uniste al grupo "${res.groupName || code.trim().toUpperCase()}"`
      );
      return {};
    } catch (err) {
      return { error: formatFriendlyFirestoreError(err) };
    }
  };

  const handleConfirmDissolveActiveGroup = async () => {
    if (!activeGroup) return;
    const targetGroup = activeGroup;
    const validation = dissolveGroup(appState, targetGroup.id, actor);
    if (validation.error) {
      showToast(validation.error);
      setIsDissolveGroupOpen(false);
      return;
    }

    setIsDissolvingGroup(true);
    try {
      await dissolveGroupInFirestore(targetGroup);
      const nextActiveId = validation.state.activeGroupId;
      preferredGroupIdRef.current = nextActiveId;
      setAppState(validation.state);
      setSelectedMemberFilter(null);
      setActiveTab('tareas');
      setIsDissolveGroupOpen(false);
      updateUserActiveGroupInFirestore(currentStudent.id, nextActiveId).catch(
        () => {}
      );
      showToast(`El grupo "${targetGroup.name}" fue disuelto permanentemente`);
    } catch (err) {
      showToast(formatFriendlyFirestoreError(err));
    } finally {
      setIsDissolvingGroup(false);
    }
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
    if (!activeGroup) return;
    if (!isActiveGroupCreator) {
      showToast('Solo el creador del grupo puede agregar integrantes');
      return;
    }
    const cleanName = memberName
      .trim()
      .slice(0, PROJECT_LIMITS.MEMBER_NAME_MAX);
    if (!cleanName) return;
    if (
      activeGroup.members.some(
        (m) => m.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      showToast(`"${cleanName}" ya forma parte del grupo`);
      return;
    }
    if (activeGroup.members.length >= PROJECT_LIMITS.MAX_MEMBERS_PER_GROUP) {
      showToast(
        `Límite alcanzado: máximo ${PROJECT_LIMITS.MAX_MEMBERS_PER_GROUP} integrantes por grupo`
      );
      return;
    }
    const nextState = addMemberToGroup(appState, activeGroup.id, cleanName, actor);
    const updatedGroup = nextState.groups.find((g) => g.id === activeGroup.id);
    if (!updatedGroup) return;

    setAppState(nextState);
    const memberIds =
      updatedGroup.memberIds && updatedGroup.memberIds.length > 0
        ? updatedGroup.memberIds
        : [activeGroup.creatorId || currentStudent.id];
    updateGroupMembersInFirestore(
      activeGroup.id,
      updatedGroup.members,
      memberIds,
      updatedGroup.activityLog || []
    ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    showToast(`${cleanName} fue añadido(a) al equipo`);
  };

  const handleKickMember = (memberName: string) => {
    if (!activeGroup) return;
    const result = kickMemberFromGroup(
      appState,
      activeGroup.id,
      memberName,
      actor
    );
    if (result.error) {
      showToast(result.error);
      return;
    }
    const updatedGroup = result.state.groups.find(
      (g) => g.id === activeGroup.id
    );
    if (!updatedGroup) return;

    // Also remove the kicked student's UID from memberIds if indices align (never removing creatorId)
    const creatorUid = activeGroup.creatorId || currentStudent.id;
    let nextMemberIds =
      activeGroup.memberIds && activeGroup.memberIds.length > 0
        ? [...activeGroup.memberIds]
        : [creatorUid];
    const kickedIdx = activeGroup.members.findIndex(
      (m) => m.toLowerCase() === memberName.trim().toLowerCase()
    );
    if (
      kickedIdx >= 0 &&
      nextMemberIds.length === activeGroup.members.length &&
      nextMemberIds[kickedIdx] !== creatorUid
    ) {
      nextMemberIds.splice(kickedIdx, 1);
    }
    if (!nextMemberIds.includes(creatorUid)) {
      nextMemberIds = [creatorUid, ...nextMemberIds];
    }

    setAppState(result.state);
    if (
      selectedMemberFilter &&
      selectedMemberFilter.toLowerCase() === memberName.toLowerCase()
    ) {
      setSelectedMemberFilter(null);
    }
    updateGroupMembersInFirestore(
      activeGroup.id,
      updatedGroup.members,
      nextMemberIds,
      updatedGroup.activityLog || []
    ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    showToast(`${memberName} fue expulsado(a) del grupo`);
  };

  const handleOpenNewTaskModal = (defaultStatus: TaskStatus = 'Por Hacer') => {
    if (!activeGroup) return;
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
    if (!activeGroup) return { error: 'Selecciona o crea un grupo primero.' };
    const result = createTaskInGroup(appState, activeGroup.id, {
      ...payload,
      actorName: currentStudent.displayName,
    });
    if (result.error) {
      return { error: result.error };
    }
    const updatedGroup = result.state.groups.find(
      (g) => g.id === activeGroup.id
    );
    const createdTask = updatedGroup?.tasks[0];
    setAppState(result.state);
    setActiveTab('tareas');

    if (createdTask && updatedGroup) {
      createTaskInFirestore(
        activeGroup.id,
        createdTask,
        currentStudent.id,
        updatedGroup.activityLog
      ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    }
    showToast(`Tarea asignada a ${payload.assignee}`);
    return {};
  };

  const handleAttemptStatusChange = (task: Task, targetStatus: TaskStatus) => {
    if (!activeGroup) return;
    const result = transitionTaskStatus(
      appState,
      activeGroup.id,
      task.id,
      targetStatus,
      undefined,
      actor
    );

    if (result.error) {
      if (result.blockedTask) {
        setEvidenceModalState({
          isOpen: true,
          task: result.blockedTask,
          mode: 'blocked-alert',
          alertMessage: result.error,
        });
      } else {
        showToast(result.error);
      }
      return;
    }

    const updatedGroup = result.state.groups.find(
      (g) => g.id === activeGroup.id
    );
    const updatedTask = updatedGroup?.tasks.find((t) => t.id === task.id);
    setAppState(result.state);

    if (updatedTask && updatedGroup) {
      updateTaskInFirestore(
        activeGroup.id,
        updatedTask,
        isActiveGroupCreator,
        updatedGroup.activityLog
      ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    }
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
    if (!activeGroup) return { error: 'Grupo no encontrado.' };
    const attachResult = attachTaskEvidence(
      appState,
      activeGroup.id,
      taskId,
      evidenceUrl,
      moveToCompleted,
      undefined,
      actor
    );
    if (attachResult.error) {
      return { error: attachResult.error };
    }

    let nextState = attachResult.state;
    if (isActiveGroupCreator && reviewStatus) {
      const reviewResult = reviewTaskEvidence(
        nextState,
        activeGroup.id,
        taskId,
        reviewStatus,
        reviewNote || '',
        undefined,
        actor
      );
      if (reviewResult.error) {
        return { error: reviewResult.error };
      }
      nextState = reviewResult.state;
    }

    const updatedGroup = nextState.groups.find((g) => g.id === activeGroup.id);
    const updatedTask = updatedGroup?.tasks.find((t) => t.id === taskId);
    setAppState(nextState);

    if (updatedTask && updatedGroup) {
      updateTaskInFirestore(
        activeGroup.id,
        updatedTask,
        isActiveGroupCreator,
        updatedGroup.activityLog
      ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    }

    showToast(
      moveToCompleted
        ? '¡Evidencia adjuntada y tarea terminada!'
        : reviewStatus === 'rechazada' || reviewStatus === 'observada'
        ? 'Entrega rechazada: el recuadro parpadeará en rojo para corrección'
        : reviewStatus === 'verificada'
        ? '¡Evidencia aprobada por el creador del grupo!'
        : 'Enlace de evidencia guardado'
    );
    return {};
  };

  const handleEditTask = (
    taskId: string,
    updates: {
      title: string;
      assignee: string;
      dueDate: string;
      priority: Priority;
      evidenceUrl: string;
    }
  ): { error?: string } => {
    if (!activeGroup) return { error: 'Grupo no encontrado.' };
    const result = editTaskInGroup(
      appState,
      activeGroup.id,
      taskId,
      updates,
      actor
    );
    if (result.error) {
      return { error: result.error };
    }
    const updatedGroup = result.state.groups.find(
      (g) => g.id === activeGroup.id
    );
    const updatedTask = updatedGroup?.tasks.find((t) => t.id === taskId);
    setAppState(result.state);

    if (updatedTask && updatedGroup) {
      updateTaskInFirestore(
        activeGroup.id,
        updatedTask,
        isActiveGroupCreator,
        updatedGroup.activityLog
      ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    }
    showToast(
      'Corrección guardada en el historial privado con fecha y hora exacta'
    );
    return {};
  };

  const handleSaveCoordinatorNote = (
    taskId: string,
    note: string
  ): { error?: string } => {
    if (!activeGroup) return { error: 'Grupo no encontrado.' };
    const result = setTaskCoordinatorNote(
      appState,
      activeGroup.id,
      taskId,
      note,
      actor
    );
    if (result.error) {
      return { error: result.error };
    }
    const updatedGroup = result.state.groups.find(
      (g) => g.id === activeGroup.id
    );
    const updatedTask = updatedGroup?.tasks.find((t) => t.id === taskId);
    setAppState(result.state);

    if (updatedTask && updatedGroup) {
      updateTaskInFirestore(
        activeGroup.id,
        updatedTask,
        isActiveGroupCreator,
        updatedGroup.activityLog
      ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    }
    showToast(
      note.trim()
        ? 'Nota del creador guardada para el estudiante'
        : 'Nota del creador eliminada'
    );
    return {};
  };

  const handleSaveTeacherGrade = (
    taskId: string,
    rating: number,
    comment: string
  ): { error?: string } => {
    if (!activeGroup) return { error: 'Grupo no encontrado.' };
    const result = setTaskTeacherGrade(
      appState,
      activeGroup.id,
      taskId,
      rating,
      comment,
      actor
    );
    if (result.error) {
      return { error: result.error };
    }
    const updatedGroup = result.state.groups.find(
      (g) => g.id === activeGroup.id
    );
    const updatedTask = updatedGroup?.tasks.find((t) => t.id === taskId);
    setAppState(result.state);

    if (updatedTask && updatedGroup) {
      updateTaskInFirestore(
        activeGroup.id,
        updatedTask,
        isActiveGroupCreator,
        updatedGroup.activityLog
      ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    }
    showToast(
      `Calificación ${rating}/20 registrada en el panel de desempeño`
    );
    return {};
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    if (!activeGroup) return;
    const nextState = toggleSubtaskInGroup(
      appState,
      activeGroup.id,
      taskId,
      subtaskId
    );
    const updatedTask = nextState.groups
      .find((g) => g.id === activeGroup.id)
      ?.tasks.find((t) => t.id === taskId);
    setAppState(nextState);
    if (updatedTask) {
      updateTaskSubtasksInFirestore(
        activeGroup.id,
        taskId,
        updatedTask.subtasks
      ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    }
  };

  const handleAddSubtask = (taskId: string, text: string) => {
    if (!activeGroup) return;
    const nextState = addSubtaskToTask(appState, activeGroup.id, taskId, text);
    const updatedTask = nextState.groups
      .find((g) => g.id === activeGroup.id)
      ?.tasks.find((t) => t.id === taskId);
    setAppState(nextState);
    if (updatedTask) {
      updateTaskSubtasksInFirestore(
        activeGroup.id,
        taskId,
        updatedTask.subtasks
      ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (!activeGroup) return;
    if (!isActiveGroupCreator) {
      showToast('Solo el creador del grupo puede eliminar tareas');
      return;
    }
    setAppState((prev) => deleteTask(prev, activeGroup.id, taskId, actor));
    deleteTaskInFirestore(activeGroup.id, taskId).catch((err) =>
      showToast(formatFriendlyFirestoreError(err))
    );
  };

  const handleAddResource = (payload: {
    title: string;
    category: string;
    url: string;
  }): { error?: string } => {
    if (!activeGroup) return { error: 'Grupo no encontrado.' };
    const result = addResourceToGroup(appState, activeGroup.id, payload);
    if (result.error) {
      return { error: result.error };
    }
    const updatedGroup = result.state.groups.find(
      (g) => g.id === activeGroup.id
    );
    const createdResource =
      updatedGroup?.resources[updatedGroup.resources.length - 1];
    setAppState(result.state);
    if (createdResource) {
      createResourceInFirestore(
        activeGroup.id,
        createdResource,
        currentStudent.id
      ).catch((err) => showToast(formatFriendlyFirestoreError(err)));
    }
    showToast(`Enlace "${payload.title}" fijado`);
    return {};
  };

  const handleDeleteResource = (resourceId: string) => {
    if (!activeGroup) return;
    setAppState((prev) =>
      removeResourceFromGroup(prev, activeGroup.id, resourceId)
    );
    deleteResourceInFirestore(activeGroup.id, resourceId).catch((err) =>
      showToast(formatFriendlyFirestoreError(err))
    );
  };

  const activeTabLabel: Record<WorkspaceTab, string> = {
    tareas: 'Tareas',
    entregas: 'Calendario de Entregas',
    cronologia: 'Cronología y Horarios',
    desempeno: 'Desempeño y Notas',
    equipo: 'Equipo y Reparto',
    recursos: 'Recursos Fijos',
  };

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#0B0F17] text-slate-100 flex flex-col lg:flex-row overflow-x-hidden lg:overflow-hidden relative isolate">
      {/* Fondo Sutil con Gradiente Animado y Partículas Flotantes */}
      <AmbientBackground />

      {/* Barra Superior Compacta en Celular (3 rayitas · Grupo activo · Acción rápida) */}
      <header
        aria-label="Barra superior móvil"
        data-testid="mobile-top-bar"
        className="lg:hidden sticky top-0 z-30 h-14 px-3 bg-[#0D1320]/95 backdrop-blur-xl border-b border-slate-800/90 flex items-center justify-between gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={isMobileMenuOpen}
          data-testid="mobile-menu-trigger"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/70 hover:bg-slate-700/80 text-slate-100 border border-slate-700/80 transition-colors cursor-pointer shrink-0 active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1 text-left px-1">
          <span
            data-testid="mobile-header-group-name"
            className="font-display text-sm font-bold text-white block truncate leading-tight"
          >
            {activeGroup ? activeGroup.name : 'Actividades Juntos'}
          </span>
          <span className="text-[11px] text-sky-300/90 block truncate leading-tight mt-0.5">
            {activeGroup ? activeTabLabel[activeTab] : 'Sin grupos todavía'}
          </span>
        </div>

        {!activeGroup ? (
          <button
            type="button"
            onClick={() => setIsNewGroupOpen(true)}
            data-testid="mobile-quick-action-btn"
            className="inline-flex items-center gap-1 min-h-[40px] px-3 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-95 shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Grupo</span>
          </button>
        ) : activeTab === 'recursos' ? (
          <button
            type="button"
            onClick={() => setIsAddResourceOpen(true)}
            data-testid="mobile-quick-action-btn"
            className="inline-flex items-center gap-1 min-h-[40px] px-3 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-95 shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Enlace</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleOpenNewTaskModal('Por Hacer')}
            data-testid="mobile-quick-action-btn"
            className="inline-flex items-center gap-1 min-h-[40px] px-3 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-95 shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Tarea</span>
          </button>
        )}
      </header>

      {/* Barra Lateral Izquierda (Fija en escritorio · Menú deslizable de 3 rayitas en celular) */}
      <LeftSidebar
        currentStudent={currentStudent}
        groups={appState.groups}
        activeGroup={activeGroup}
        activeTab={activeTab}
        selectedMemberFilter={selectedMemberFilter}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onSelectGroup={handleSelectGroup}
        onSelectTab={setActiveTab}
        onSelectMemberFilter={setSelectedMemberFilter}
        onOpenNewGroupModal={() => setIsNewGroupOpen(true)}
        onOpenJoinCodeModal={() => setIsJoinCodeOpen(true)}
        onOpenEditProfileModal={() => {
          setIsProfileRequired(false);
          setIsProfileModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Área Principal: Estado Vacío Limpio o Tablero Colaborativo */}
      {!groupsLoaded ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
            <p className="text-xs text-slate-400">
              Sincronizando tus grupos en la nube...
            </p>
          </div>
        </main>
      ) : !activeGroup ? (
        <main
          data-testid="empty-workspace-state"
          className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-lg rounded-2xl bg-[#111827]/90 backdrop-blur-md border border-slate-800/90 p-6 sm:p-8 text-center space-y-6 shadow-2xl"
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-sky-400" />
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                ¡Hola, {currentStudent.displayName}!
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                Aún no perteneces a ningún grupo de trabajo. Crea uno nuevo como
                coordinador o únete usando el código que te compartió tu equipo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsNewGroupOpen(true)}
                data-testid="empty-create-group-btn"
                className="min-h-[48px] px-4 py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Crear mi primer grupo</span>
              </button>

              <button
                type="button"
                onClick={() => setIsJoinCodeOpen(true)}
                data-testid="empty-join-code-btn"
                className="min-h-[48px] px-4 py-3 rounded-xl bg-[#0B0F17] hover:bg-slate-800/80 border border-slate-700 hover:border-sky-500/50 text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <KeyRound className="w-4 h-4 text-sky-400" />
                <span>Unirme con código</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Todos tus grupos, tareas y evidencias se sincronizan en tiempo real
              con tus compañeros.
            </p>
          </motion.div>
        </main>
      ) : (
        <KanbanBoard
          currentStudent={currentStudent}
          activeGroup={activeGroup}
          activeTab={activeTab}
          selectedMemberFilter={selectedMemberFilter}
          onSelectTab={setActiveTab}
          onSelectMemberFilter={setSelectedMemberFilter}
          onOpenNewTaskModal={handleOpenNewTaskModal}
          onOpenAddResourceModal={() => setIsAddResourceOpen(true)}
          onAttemptStatusChange={handleAttemptStatusChange}
          onOpenAttachEvidenceModal={handleOpenAttachEvidenceModal}
          onOpenEditTaskModal={(task) => setEditingTaskId(task.id)}
          onOpenCoordinatorNoteModal={(task) => setNoteModalTaskId(task.id)}
          onOpenTeacherGradeModal={(task) => setGradeModalTaskId(task.id)}
          onToggleSubtask={handleToggleSubtask}
          onAddSubtask={handleAddSubtask}
          onDeleteTask={handleDeleteTask}
          onDeleteResource={handleDeleteResource}
          onAddMemberToActiveGroup={handleAddMemberToActiveGroup}
          onKickMember={handleKickMember}
          onCopyInviteCode={handleCopyInviteCode}
          onOpenDissolveGroupModal={() => setIsDissolveGroupOpen(true)}
        />
      )}

      {/* Notificación Flotante Animada (Toast) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            role="status"
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-5 sm:right-5 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#162238] border border-sky-400/40 text-xs font-medium text-slate-100 shadow-xl"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modales Globales */}
      <NewGroupModal
        isOpen={isNewGroupOpen}
        creatorName={currentStudent.displayName}
        onClose={() => setIsNewGroupOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      <JoinGroupByCodeModal
        isOpen={isJoinCodeOpen}
        onClose={() => setIsJoinCodeOpen(false)}
        onJoinGroupByCode={handleJoinGroupByCode}
      />

      <ProfileSetupModal
        isOpen={isProfileModalOpen}
        initialName={currentStudent.displayName}
        initialGrade={currentStudent.gradeLevel || '5'}
        initialSection={currentStudent.sectionLetter || 'A'}
        isRequired={isProfileRequired}
        onClose={() => setIsProfileModalOpen(false)}
        onSaveProfile={handleSaveProfile}
      />

      {/* Modales dependientes de grupo activo */}
      {activeGroup && (
        <>
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
            isCreator={isActiveGroupCreator}
            alertMessage={evidenceModalState.alertMessage}
            onClose={() =>
              setEvidenceModalState((prev) => ({ ...prev, isOpen: false }))
            }
            onSaveEvidence={handleSaveEvidence}
          />

          <EditTaskModal
            isOpen={Boolean(editingTask)}
            task={editingTask}
            group={activeGroup}
            currentStudent={currentStudent}
            onClose={() => setEditingTaskId(null)}
            onSaveEdit={handleEditTask}
          />

          <CoordinatorNoteModal
            isOpen={Boolean(noteModalTask)}
            task={noteModalTask}
            onClose={() => setNoteModalTaskId(null)}
            onSaveNote={handleSaveCoordinatorNote}
          />

          <TeacherGradeModal
            isOpen={Boolean(gradeModalTask)}
            task={gradeModalTask}
            onClose={() => setGradeModalTaskId(null)}
            onSaveGrade={handleSaveTeacherGrade}
          />

          <DissolveGroupModal
            isOpen={isDissolveGroupOpen}
            groupName={activeGroup.name}
            isDeleting={isDissolvingGroup}
            onClose={() => setIsDissolveGroupOpen(false)}
            onConfirmDissolve={handleConfirmDissolveActiveGroup}
          />
        </>
      )}
    </div>
  );
}
