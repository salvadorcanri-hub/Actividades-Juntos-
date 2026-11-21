import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  ExternalLink,
  Link2,
  Trash2,
  CheckCircle2,
  Clock,
  CircleDashed,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Calendar,
  LayoutGrid,
  Users,
  Bookmark,
  UserPlus,
  Scale,
  AlertTriangle,
  Copy,
  ShieldCheck,
  AlertCircle,
  Pencil,
  MessageSquarePlus,
  Lock,
  Trophy,
  UserMinus,
  CalendarPlus,
  Download,
} from 'lucide-react';
import {
  Group,
  Task,
  TaskStatus,
  PROJECT_LIMITS,
  sanitizeSafeHttpUrl,
  calculateGroupProgress,
  calculateMemberWorkloads,
  evaluateWorkloadEquity,
  formatShortDate,
  formatExactTimeWithSeconds,
  groupTasksByDeadline,
  getDeadlineBadgeInfo,
  isGroupCreator,
  isTaskRejected,
  canEditTask,
  getVisibleTaskEditHistory,
  buildGoogleCalendarUrl,
  buildTaskIcsContent,
  buildGroupIcsContent,
} from '../utils/projectLogic';
import { StudentAccount } from '../utils/authLogic';
import { WorkspaceTab } from './LeftSidebar';
import { RightResourcesPanel } from './RightResourcesPanel';
import { ActivityTimelinePanel } from './ActivityTimelinePanel';
import { PerformancePanel } from './PerformancePanel';
import {
  StudentAvatar,
  GroupCoverBanner,
  getGroupCoverUrl,
} from './visualAssets';

interface KanbanBoardProps {
  currentStudent: StudentAccount;
  activeGroup: Group;
  activeTab: WorkspaceTab;
  selectedMemberFilter: string | null;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSelectMemberFilter: (member: string | null) => void;
  onOpenNewTaskModal: (defaultStatus?: TaskStatus) => void;
  onOpenAddResourceModal: () => void;
  onAttemptStatusChange: (task: Task, targetStatus: TaskStatus) => void;
  onOpenAttachEvidenceModal: (task: Task) => void;
  onOpenEditTaskModal: (task: Task) => void;
  onOpenCoordinatorNoteModal: (task: Task) => void;
  onOpenTeacherGradeModal: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, text: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteResource: (resourceId: string) => void;
  onAddMemberToActiveGroup: (memberName: string) => void;
  onKickMember: (memberName: string) => void;
  onCopyInviteCode: (code: string) => void;
  onOpenDissolveGroupModal: () => void;
}

const COLUMNS: Array<{
  status: TaskStatus;
  title: string;
}> = [
  { status: 'Por Hacer', title: 'Por Hacer' },
  { status: 'En Progreso', title: 'En Progreso' },
  { status: 'Terminado', title: 'Terminado' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  currentStudent,
  activeGroup,
  activeTab,
  selectedMemberFilter,
  onSelectTab,
  onSelectMemberFilter,
  onOpenNewTaskModal,
  onOpenAddResourceModal,
  onAttemptStatusChange,
  onOpenAttachEvidenceModal,
  onOpenEditTaskModal,
  onOpenCoordinatorNoteModal,
  onOpenTeacherGradeModal,
  onToggleSubtask,
  onAddSubtask,
  onDeleteTask,
  onDeleteResource,
  onAddMemberToActiveGroup,
  onKickMember,
  onCopyInviteCode,
  onOpenDissolveGroupModal,
}) => {
  const [expandedTaskIds, setExpandedTaskIds] = useState<
    Record<string, boolean>
  >({});
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<
    Record<string, boolean>
  >({});
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<
    Record<string, string>
  >({});
  const [newMemberName, setNewMemberName] = useState('');
  const [confirmKickMember, setConfirmKickMember] = useState<string | null>(
    null
  );
  const [mobileStatusTab, setMobileStatusTab] =
    useState<TaskStatus>('Por Hacer');

  const isCreator = isGroupCreator(activeGroup, currentStudent);
  const creatorName =
    activeGroup.creatorName || activeGroup.members[0] || 'Creador';

  const downloadIcsFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toggleExpandHistory = (taskId: string) => {
    setExpandedHistoryIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const progress = calculateGroupProgress(activeGroup.tasks);
  const workloads = calculateMemberWorkloads(
    activeGroup.members,
    activeGroup.tasks
  );
  const equity = evaluateWorkloadEquity(activeGroup.members, activeGroup.tasks);
  const deadlineBuckets = groupTasksByDeadline(activeGroup.tasks);
  const coverUrl = getGroupCoverUrl(
    activeGroup.id,
    activeGroup.name,
    activeGroup.coverUrl
  );
  const inviteCode = activeGroup.inviteCode || 'EPT-104';

  const filteredTasks = activeGroup.tasks.filter((task) => {
    if (!selectedMemberFilter) return true;
    return task.assignee.toLowerCase() === selectedMemberFilter.toLowerCase();
  });

  const toggleExpandChecklist = (taskId: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent, taskId: string) => {
    e.preventDefault();
    const text = (newSubtaskInputs[taskId] || '').trim();
    if (!text) return;
    onAddSubtask(taskId, text);
    setNewSubtaskInputs((prev) => ({ ...prev, [taskId]: '' }));
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: true }));
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    onAddMemberToActiveGroup(newMemberName.trim());
    setNewMemberName('');
  };

  const getColumnIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Por Hacer':
        return <CircleDashed className="w-4 h-4 text-slate-400 shrink-0" />;
      case 'En Progreso':
        return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Terminado':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
  };

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progress.percentage / 100) * circumference;

  return (
    <main
      aria-label="Espacio de trabajo del grupo activo"
      className="relative z-10 flex-1 bg-transparent flex flex-col min-w-0 overflow-hidden"
    >
      {/* Portada Visual del Curso con Scrim de Contraste + Progreso Animado */}
      <header className="relative border-b border-slate-800/80 overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none">
          <GroupCoverBanner
            src={coverUrl}
            alt={`Portada del curso ${activeGroup.name}`}
            className="w-full h-full opacity-50 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F17]/95 via-[#0B0F17]/75 to-[#0B0F17]/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/30 to-transparent" />
        </div>

        <div className="relative z-10 px-4 py-3.5 sm:px-6 lg:pt-5 lg:pb-4 space-y-3 lg:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-sky-300/90">
                <span className="font-medium truncate">
                  {activeGroup.course}
                </span>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="group-creator-indicator"
                  className="text-slate-300 truncate"
                >
                  Creador: {creatorName}
                </span>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="current-user-rank"
                  className={
                    isCreator
                      ? 'text-emerald-300 font-medium'
                      : 'text-slate-400'
                  }
                >
                  {isCreator ? 'Tu rango: Creador' : 'Integrante'}
                </span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => onCopyInviteCode(inviteCode)}
                  title="Copiar código de invitación del grupo"
                  data-testid="group-invite-code-btn"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-300 hover:text-sky-300 transition-colors cursor-pointer shrink-0"
                >
                  <span>Código: {inviteCode}</span>
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="hidden lg:flex items-center gap-3">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
                  {activeGroup.name}
                </h1>
                {/* Pila de avatares del equipo */}
                <div
                  className="hidden sm:flex items-center -space-x-2 pl-1"
                  aria-label="Integrantes del grupo"
                >
                  {activeGroup.members.slice(0, 5).map((member) => (
                    <StudentAvatar
                      key={member}
                      name={member}
                      size="sm"
                      className="ring-2 ring-[#0B0F17]"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Tarjeta de Progreso con Anillo Animado y Barra */}
            <div
              aria-label="Progreso general del proyecto"
              className="flex items-center gap-3 bg-[#11192B]/90 backdrop-blur-md border border-slate-700/70 px-3.5 py-2 lg:px-4 lg:py-2.5 rounded-2xl w-full sm:w-auto sm:min-w-[280px] shadow-lg"
            >
              <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                  <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="rgba(51, 65, 85, 0.5)"
                    strokeWidth="3.5"
                  />
                  <motion.circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke={progress.percentage === 100 ? '#10B981' : '#38BDF8'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={false}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                </svg>
                <span
                  data-testid="group-progress-percentage"
                  className={`absolute font-mono text-[11px] font-bold tabular-nums ${
                    progress.percentage === 100
                      ? 'text-emerald-400'
                      : 'text-sky-300'
                  }`}
                >
                  {progress.percentage}%
                </span>
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-slate-200 font-semibold">
                    Avance del equipo
                  </span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {progress.completed}/{progress.total} listas
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={progress.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progreso del grupo ${activeGroup.name}`}
                  className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"
                >
                  <motion.div
                    initial={false}
                    animate={{ width: `${progress.percentage}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={`h-full ${
                      progress.percentage === 100
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-sky-400 to-indigo-400'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Chip de filtro por integrante en móvil (si hay filtro activo) */}
          {selectedMemberFilter && activeTab === 'tareas' && (
            <div className="flex lg:hidden items-center justify-between gap-2 pt-0.5">
              <span className="text-xs text-slate-400">
                Mostrando tareas de{' '}
                <strong className="text-sky-300">{selectedMemberFilter}</strong>
              </span>
              <button
                type="button"
                onClick={() => onSelectMemberFilter(null)}
                className="px-2.5 py-1 text-xs text-sky-300 bg-sky-500/15 border border-sky-500/30 rounded-lg hover:bg-sky-500/25 cursor-pointer whitespace-nowrap"
              >
                Ver todas ✕
              </button>
            </div>
          )}

          {/* Barra de Pestañas en Escritorio (en celular viven en el menú lateral de 3 rayitas) */}
          <div className="hidden lg:flex flex-wrap items-center justify-between gap-3 pt-1">
            <div
              role="tablist"
              aria-label="Vistas del proyecto"
              className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0F17]/90 backdrop-blur-xs border border-slate-800/90 rounded-xl"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'tareas'}
                onClick={() => onSelectTab('tareas')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'tareas'
                    ? 'bg-[#182338] text-sky-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tareas ({activeGroup.tasks.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'entregas'}
                onClick={() => onSelectTab('entregas')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'entregas'
                    ? 'bg-[#182338] text-sky-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Entregas (
                  {deadlineBuckets.urgentOrSoon.length +
                    deadlineBuckets.upcoming.length}
                  )
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'cronologia'}
                onClick={() => onSelectTab('cronologia')}
                data-testid="desktop-tab-cronologia"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'cronologia'
                    ? 'bg-[#182338] text-sky-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Cronología</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'desempeno'}
                onClick={() => onSelectTab('desempeno')}
                data-testid="desktop-tab-desempeno"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'desempeno'
                    ? 'bg-[#182338] text-sky-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Desempeño</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'equipo'}
                onClick={() => onSelectTab('equipo')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'equipo'
                    ? 'bg-[#182338] text-sky-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Equipo ({activeGroup.members.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'recursos'}
                onClick={() => onSelectTab('recursos')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'recursos'
                    ? 'bg-[#182338] text-sky-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Recursos ({activeGroup.resources.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedMemberFilter && activeTab === 'tareas' && (
                <button
                  type="button"
                  onClick={() => onSelectMemberFilter(null)}
                  className="px-3 py-1.5 text-xs text-sky-300 bg-sky-500/15 border border-sky-500/30 rounded-lg hover:bg-sky-500/25 cursor-pointer whitespace-nowrap"
                >
                  Filtro: {selectedMemberFilter} ✕
                </button>
              )}

              {activeTab === 'recursos' ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onOpenAddResourceModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Añadir Enlace</span>
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onOpenNewTaskModal('Por Hacer')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Nueva Tarea</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA CON ANIMACIÓN SUAVE */}
      <div className="flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'tareas' && (
            <motion.div
              key="tab-tareas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 md:space-y-0"
            >
              {/* Selector de Estado de Tareas en Celular (1 columna limpia a la vez) */}
              <div
                role="tablist"
                aria-label="Seleccionar estado de tareas"
                data-testid="mobile-status-selector"
                className="grid grid-cols-3 gap-1 p-1 bg-[#0F1623]/95 border border-slate-800/90 rounded-xl md:hidden"
              >
                {COLUMNS.map((col) => {
                  const count = filteredTasks.filter(
                    (t) => t.status === col.status
                  ).length;
                  const isActive = mobileStatusTab === col.status;
                  return (
                    <button
                      key={col.status}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setMobileStatusTab(col.status)}
                      className={`min-h-[44px] px-2 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-[#18253C] text-sky-300 shadow-xs border border-sky-500/30'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <span className="truncate">{col.title}</span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-sky-200' : 'text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {COLUMNS.map((col) => {
                const columnTasks = filteredTasks.filter(
                  (t) => t.status === col.status
                );
                const isVisibleOnMobile = mobileStatusTab === col.status;

                return (
                  <section
                    key={col.status}
                    aria-label={`Columna ${col.title}`}
                    data-testid={`kanban-col-${col.status}`}
                    className={`${
                      isVisibleOnMobile ? 'flex' : 'hidden md:flex'
                    } rounded-2xl bg-[#0F1623]/75 backdrop-blur-md border border-slate-800/80 flex-col min-h-[260px] md:min-h-[420px]`}
                  >
                    <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getColumnIcon(col.status)}
                        <h2 className="font-display text-sm font-semibold text-slate-100">
                          {col.title}
                        </h2>
                      </div>
                      <span className="font-mono text-xs font-semibold tabular-nums text-slate-400 px-2 py-0.5 bg-slate-800/60 rounded-md">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="p-3.5 space-y-3 flex-1">
                      <AnimatePresence initial={false}>
                        {columnTasks.length === 0 ? (
                          <motion.div
                            key="empty-col"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-6 text-center rounded-xl border border-dashed border-slate-800/70 space-y-2"
                          >
                            <p className="text-xs text-slate-400">
                              Sin tareas en {col.title}
                            </p>
                            {col.status !== 'Terminado' && (
                              <button
                                type="button"
                                onClick={() => onOpenNewTaskModal(col.status)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Agregar tarea</span>
                              </button>
                            )}
                          </motion.div>
                        ) : (
                          columnTasks.map((task) => {
                            const safeEvidenceUrl = sanitizeSafeHttpUrl(
                              task.evidenceUrl
                            );
                            const hasEvidence = Boolean(safeEvidenceUrl);
                            const subtasks = task.subtasks || [];
                            const doneSubtasks = subtasks.filter(
                              (s) => s.completed
                            ).length;
                            const subtaskPct =
                              subtasks.length === 0
                                ? 0
                                : Math.round(
                                    (doneSubtasks / subtasks.length) * 100
                                  );
                            const isExpanded = Boolean(
                              expandedTaskIds[task.id]
                            );
                            const reviewState =
                              task.evidenceReviewStatus || 'pendiente';
                            const rejected = isTaskRejected(task);
                            const canEdit = canEditTask(
                              activeGroup,
                              task,
                              currentStudent
                            );
                            const visibleEdits = getVisibleTaskEditHistory(
                              task,
                              activeGroup,
                              currentStudent
                            );
                            const isHistoryExpanded = Boolean(
                              expandedHistoryIds[task.id]
                            );

                            return (
                              <motion.article
                                layout
                                key={task.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                whileHover={{ y: -2 }}
                                transition={{ duration: 0.18 }}
                                data-testid={`task-card-${task.id}`}
                                data-rejected={rejected ? 'true' : 'false'}
                                className={
                                  rejected
                                    ? 'task-rejected-pulse p-4 rounded-xl bg-rose-950/35 border-2 border-rose-500/80 transition-colors space-y-3 shadow-xs'
                                    : 'p-4 rounded-xl bg-[#151F32] border border-slate-800/90 hover:border-sky-500/35 transition-colors space-y-3 shadow-xs'
                                }
                              >
                                {/* Alerta visual roja si la entrega fue rechazada (#7) */}
                                {rejected && (
                                  <div
                                    data-testid={`rejected-banner-${task.id}`}
                                    className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-start justify-between gap-2"
                                  >
                                    <div className="min-w-0 space-y-0.5">
                                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-200">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                        <span>
                                          Rechazada · requiere corrección
                                        </span>
                                      </span>
                                      {task.evidenceReviewNote && (
                                        <p className="text-[11px] text-rose-200/90 leading-snug">
                                          “{task.evidenceReviewNote}”
                                        </p>
                                      )}
                                    </div>
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onOpenEditTaskModal(task)
                                        }
                                        className="min-h-[34px] px-2.5 py-1 rounded-md bg-rose-500 hover:bg-rose-400 text-[11px] font-semibold text-white transition-colors shrink-0 cursor-pointer"
                                      >
                                        Corregir
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* 1. Título y acciones de edición / nota / eliminar */}
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-display text-sm font-semibold text-slate-100 leading-snug">
                                    {task.title}
                                  </h3>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onOpenEditTaskModal(task)
                                        }
                                        aria-label={`Corregir o editar tarea ${task.title}`}
                                        title="Corregir tarea enviada"
                                        data-testid={`edit-task-btn-${task.id}`}
                                        className="p-1.5 rounded-md text-slate-400 hover:text-sky-300 hover:bg-slate-800/70 transition-colors cursor-pointer"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {isCreator && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onOpenCoordinatorNoteModal(task)
                                        }
                                        aria-label={`Dejar nota del creador en ${task.title}`}
                                        title="Dejar nota para el estudiante"
                                        data-testid={`note-task-btn-${task.id}`}
                                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                          task.coordinatorNote
                                            ? 'text-sky-300 hover:bg-sky-500/15'
                                            : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800/70'
                                        }`}
                                      >
                                        <MessageSquarePlus className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {isCreator && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteTask(task.id)}
                                        aria-label={`Eliminar tarea ${task.title}`}
                                        className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* 2. Avatar + Responsable y Fecha */}
                                <div className="flex items-center justify-between gap-2 text-xs text-slate-400 whitespace-nowrap">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <StudentAvatar
                                      name={task.assignee}
                                      size="sm"
                                    />
                                    <span className="text-slate-200 font-medium truncate">
                                      {task.assignee}
                                    </span>
                                  </div>
                                  <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-slate-400 shrink-0">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    <span>{formatShortDate(task.dueDate)}</span>
                                  </span>
                                </div>

                                {/* Nota del creador para el estudiante (#3) */}
                                {task.coordinatorNote && (
                                  <div
                                    data-testid={`coordinator-note-${task.id}`}
                                    className="p-2.5 rounded-lg bg-[#0D1526] border border-sky-500/25 space-y-0.5"
                                  >
                                    <span className="text-[10px] font-semibold text-sky-300 block">
                                      Nota de{' '}
                                      {task.coordinatorNoteBy || creatorName}
                                    </span>
                                    <p className="text-[11px] text-slate-200 leading-snug">
                                      {task.coordinatorNote}
                                    </p>
                                  </div>
                                )}

                                {/* 3. Subtareas / Checklist Rápida */}
                                <div className="pt-0.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleExpandChecklist(task.id)
                                      }
                                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                    >
                                      <CheckSquare className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                      {subtasks.length > 0 ? (
                                        <span className="font-mono text-[11px] tabular-nums">
                                          Pasos: {doneSubtasks}/
                                          {subtasks.length}
                                        </span>
                                      ) : (
                                        <span className="text-[11px]">
                                          + Agregar pasos (checklist)
                                        </span>
                                      )}
                                      {isExpanded ? (
                                        <ChevronUp className="w-3 h-3" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3" />
                                      )}
                                    </button>

                                    {subtasks.length > 0 && (
                                      <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden shrink-0">
                                        <motion.div
                                          initial={false}
                                          animate={{ width: `${subtaskPct}%` }}
                                          className={`h-full ${
                                            subtaskPct === 100
                                              ? 'bg-emerald-400'
                                              : 'bg-sky-400'
                                          }`}
                                        />
                                      </div>
                                    )}
                                  </div>

                                  <AnimatePresence initial={false}>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.16 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="mt-2 pt-2 border-t border-slate-800/70 space-y-1.5">
                                          {subtasks.map((st) => (
                                            <button
                                              key={st.id}
                                              type="button"
                                              onClick={() =>
                                                onToggleSubtask(task.id, st.id)
                                              }
                                              className="w-full flex items-center gap-2 text-left text-xs py-1 text-slate-300 hover:text-white cursor-pointer"
                                            >
                                              {st.completed ? (
                                                <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                              ) : (
                                                <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                              )}
                                              <span
                                                className={
                                                  st.completed
                                                    ? 'line-through text-slate-500'
                                                    : ''
                                                }
                                              >
                                                {st.text}
                                              </span>
                                            </button>
                                          ))}

                                          <form
                                            onSubmit={(e) =>
                                              handleAddSubtaskSubmit(e, task.id)
                                            }
                                            className="flex gap-1.5 pt-1"
                                          >
                                            <input
                                              type="text"
                                              maxLength={
                                                PROJECT_LIMITS.SUBTASK_MAX
                                              }
                                              value={
                                                newSubtaskInputs[task.id] || ''
                                              }
                                              onChange={(e) =>
                                                setNewSubtaskInputs((prev) => ({
                                                  ...prev,
                                                  [task.id]: e.target.value,
                                                }))
                                              }
                                              placeholder="Nuevo paso..."
                                              aria-label={`Nuevo paso para ${task.title}`}
                                              className="flex-1 px-2.5 py-1 text-xs bg-[#0B0F17] border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                                            />
                                            <button
                                              type="submit"
                                              className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-md cursor-pointer shrink-0"
                                            >
                                              +
                                            </button>
                                          </form>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* Historial Privado de Modificaciones (#4: solo visible al editor y al creador) */}
                                {visibleEdits.length > 0 && (
                                  <div
                                    data-testid={`private-history-toggle-${task.id}`}
                                    className="pt-1"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleExpandHistory(task.id)
                                      }
                                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-sky-300/90 hover:text-sky-200 cursor-pointer"
                                    >
                                      <Lock className="w-3 h-3 shrink-0" />
                                      <span>
                                        Historial privado ({visibleEdits.length}
                                        )
                                      </span>
                                      {isHistoryExpanded ? (
                                        <ChevronUp className="w-3 h-3" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3" />
                                      )}
                                    </button>
                                    {isHistoryExpanded && (
                                      <div className="mt-2 p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800 space-y-2">
                                        <span className="text-[10px] text-slate-500 block">
                                          Solo visible para quien editó y el
                                          creador del grupo
                                        </span>
                                        {visibleEdits.slice(0, 4).map((rec) => (
                                          <div
                                            key={rec.id}
                                            className="text-[11px] space-y-0.5 border-t border-slate-800/70 pt-1.5 first:border-t-0 first:pt-0"
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="font-medium text-slate-200 truncate">
                                                {rec.editorName}
                                              </span>
                                              <span className="font-mono text-[10px] tabular-nums text-sky-300 shrink-0">
                                                {formatExactTimeWithSeconds(
                                                  rec.editedAt
                                                )}
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 leading-snug">
                                              {rec.summary}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Nota de revisión si existe y no está ya mostrada en el banner rojo */}
                                {!rejected &&
                                  hasEvidence &&
                                  task.evidenceReviewNote && (
                                    <p className="text-[11px] text-slate-400 italic truncate">
                                      “{task.evidenceReviewNote}”
                                    </p>
                                  )}

                                {/* 4. Botón de Evidencia / Revisión y Cambio de Columna (solo creador) */}
                                <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                                  {safeEvidenceUrl ? (
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <a
                                        href={safeEvidenceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                                      >
                                        <span>Ver evidencia</span>
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onOpenAttachEvidenceModal(task)
                                        }
                                        aria-label={`Revisar o cambiar evidencia de ${task.title}`}
                                        title={
                                          isCreator
                                            ? 'Aprobar, rechazar o cambiar evidencia'
                                            : 'Ver estado o cambiar evidencia'
                                        }
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors cursor-pointer shrink-0 ${
                                          reviewState === 'verificada'
                                            ? 'text-emerald-300 hover:bg-emerald-500/15'
                                            : rejected
                                            ? 'text-rose-300 hover:bg-rose-500/15'
                                            : 'text-sky-300 hover:bg-sky-500/15'
                                        }`}
                                      >
                                        {reviewState === 'verificada' ? (
                                          <>
                                            <ShieldCheck className="w-3 h-3" />
                                            <span>Aprobada</span>
                                          </>
                                        ) : rejected ? (
                                          <>
                                            <AlertCircle className="w-3 h-3" />
                                            <span>Rechazada</span>
                                          </>
                                        ) : (
                                          <>
                                            <Link2 className="w-3 h-3" />
                                            <span>
                                              {isCreator
                                                ? 'Revisar'
                                                : 'Cambiar'}
                                            </span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onOpenAttachEvidenceModal(task)
                                      }
                                      className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 cursor-pointer"
                                    >
                                      <Link2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>+ Evidencia</span>
                                    </button>
                                  )}

                                  {isCreator ? (
                                    <div className="flex items-center gap-1">
                                      {(
                                        [
                                          'Por Hacer',
                                          'En Progreso',
                                          'Terminado',
                                        ] as TaskStatus[]
                                      )
                                        .filter((st) => st !== task.status)
                                        .map((targetSt) => (
                                          <button
                                            key={targetSt}
                                            type="button"
                                            onClick={() =>
                                              onAttemptStatusChange(
                                                task,
                                                targetSt
                                              )
                                            }
                                            aria-label={`Mover "${task.title}" a ${targetSt}`}
                                            className={`min-h-[32px] px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                              targetSt === 'Terminado'
                                                ? hasEvidence
                                                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                                  : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                          >
                                            {targetSt}
                                          </button>
                                        ))}
                                    </div>
                                  ) : (
                                    <span
                                      data-testid={`member-status-locked-${task.id}`}
                                      className="text-[10px] text-slate-500"
                                    >
                                      Solo el creador cambia estado
                                    </span>
                                  )}
                                </div>
                              </motion.article>
                            );
                          })
                        )}
                      </AnimatePresence>
                    </div>
                  </section>
                );
              })}
              </div>
            </motion.div>
          )}

          {/* PESTAÑA 2: CALENDARIO Y PRÓXIMAS ENTREGAS */}
          {activeTab === 'entregas' && (
            <motion.div
              key="tab-entregas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              data-testid="calendar-entregas-view"
              className="max-w-4xl mx-auto space-y-6"
            >
              {/* Barra de Exportación al Calendario del Celular (#8) */}
              <div className="p-4 rounded-2xl bg-[#111827]/90 border border-sky-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <h2 className="font-display text-sm font-bold text-slate-100">
                    Guardar fechas en el calendario de tu celular
                  </h2>
                  <p className="text-xs text-slate-400">
                    Compatible con Google Calendar, Apple y Samsung, con
                    recordatorio automático 1 día antes.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="export-group-ics-btn"
                  onClick={() => {
                    const slug = activeGroup.name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                    downloadIcsFile(
                      `entregas-${slug || 'grupo'}.ics`,
                      buildGroupIcsContent(activeGroup)
                    );
                  }}
                  className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shrink-0 active:scale-95"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Guardar todas (.ics)</span>
                </button>
              </div>

              {/* Resumen Cronológico */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#111827]/90 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">
                      Entregas próximas (≤ 3 días)
                    </span>
                    <span className="font-display text-lg font-bold text-amber-300 mt-0.5 block">
                      {deadlineBuckets.urgentOrSoon.length} por entregar
                    </span>
                  </div>
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                </div>

                <div className="p-4 rounded-2xl bg-[#111827]/90 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">
                      Programadas más adelante
                    </span>
                    <span className="font-display text-lg font-bold text-sky-300 mt-0.5 block">
                      {deadlineBuckets.upcoming.length} en agenda
                    </span>
                  </div>
                  <Calendar className="w-5 h-5 text-sky-400 shrink-0" />
                </div>

                <div className="p-4 rounded-2xl bg-[#111827]/90 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">
                      Entregas terminadas
                    </span>
                    <span className="font-display text-lg font-bold text-emerald-400 mt-0.5 block">
                      {deadlineBuckets.completed.length} con evidencia
                    </span>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                </div>
              </div>

              {/* Lista Cronológica de Entregas */}
              {[
                {
                  id: 'urgent',
                  title: 'Próximas a vencer (Prioridad inmediata)',
                  subtitle: 'Tareas con fecha límite en los próximos 3 días',
                  items: deadlineBuckets.urgentOrSoon,
                },
                {
                  id: 'upcoming',
                  title: 'Siguientes entregas de la semana',
                  subtitle: 'Avances programados con más tiempo',
                  items: deadlineBuckets.upcoming,
                },
                {
                  id: 'completed',
                  title: 'Entregas completadas y verificadas',
                  subtitle: 'Trabajos con enlace de evidencia adjunto',
                  items: deadlineBuckets.completed,
                },
              ].map((section) => (
                <section
                  key={section.id}
                  aria-label={section.title}
                  className="rounded-2xl bg-[#0F1623]/85 border border-slate-800/90 overflow-hidden"
                >
                  <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-sm font-bold text-slate-100">
                        {section.title}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {section.subtitle}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold tabular-nums text-slate-400">
                      {section.items.length}
                    </span>
                  </div>

                  {section.items.length === 0 ? (
                    <div className="p-5 text-xs text-slate-400 text-center">
                      No hay tareas en este grupo de fechas.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/70">
                      {section.items.map((task) => {
                        const badge = getDeadlineBadgeInfo(
                          task.dueDate,
                          task.status
                        );
                        const hasEvidence = Boolean(
                          sanitizeSafeHttpUrl(task.evidenceUrl)
                        );
                        const reviewState =
                          task.evidenceReviewStatus || 'pendiente';
                        const rejected = isTaskRejected(task);
                        const gcalUrl = buildGoogleCalendarUrl(
                          task,
                          activeGroup
                        );

                        return (
                          <div
                            key={task.id}
                            className={`px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors ${
                              rejected
                                ? 'bg-rose-950/25 hover:bg-rose-950/35'
                                : 'hover:bg-[#141E30]/60'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Fecha Destacada */}
                              <div className="w-16 text-center py-1.5 px-2 rounded-xl bg-[#152036] border border-slate-700/70 shrink-0">
                                <span className="font-mono text-xs font-bold text-sky-300 block tabular-nums">
                                  {formatShortDate(task.dueDate)}
                                </span>
                                <span
                                  className={`text-[10px] font-medium block ${
                                    badge.tone === 'urgent' ||
                                    badge.tone === 'soon'
                                      ? 'text-amber-300'
                                      : badge.tone === 'done'
                                      ? 'text-emerald-400'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {badge.label}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <h3 className="font-display text-sm font-semibold text-slate-100 truncate">
                                  {task.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                                  <span className="inline-flex items-center gap-1.5 text-slate-300">
                                    <StudentAvatar
                                      name={task.assignee}
                                      size="xs"
                                    />
                                    <span>{task.assignee}</span>
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{task.status}</span>
                                  {rejected ? (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-rose-300 font-medium">
                                        Rechazada
                                      </span>
                                    </>
                                  ) : (
                                    hasEvidence && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span
                                          className={
                                            reviewState === 'verificada'
                                              ? 'text-emerald-400 font-medium'
                                              : 'text-sky-300'
                                          }
                                        >
                                          {reviewState === 'verificada'
                                            ? 'Aprobada'
                                            : 'Por revisar'}
                                        </span>
                                      </>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Acciones optimizadas para pulgar en celular (#8) */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {task.status !== 'Terminado' && (
                                <>
                                  <a
                                    href={gcalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`gcal-link-${task.id}`}
                                    className="min-h-[44px] sm:min-h-[34px] flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-[#162238] hover:bg-[#1D2D49] border border-sky-500/30 text-xs font-medium text-sky-300 transition-colors whitespace-nowrap"
                                  >
                                    <CalendarPlus className="w-3.5 h-3.5 shrink-0" />
                                    <span>Google Calendar</span>
                                  </a>
                                  <button
                                    type="button"
                                    data-testid={`ics-btn-${task.id}`}
                                    onClick={() =>
                                      downloadIcsFile(
                                        `entrega-${task.id}.ics`,
                                        buildTaskIcsContent(task, activeGroup)
                                      )
                                    }
                                    className="min-h-[44px] sm:min-h-[34px] inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    <Download className="w-3.5 h-3.5 shrink-0" />
                                    <span>.ics</span>
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenAttachEvidenceModal(task)
                                }
                                className="min-h-[44px] sm:min-h-[34px] px-3 py-2 sm:py-1.5 rounded-lg bg-[#162238] hover:bg-[#1D2D49] border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                {hasEvidence
                                  ? isCreator
                                    ? 'Revisar'
                                    : 'Ver evidencia'
                                  : '+ Evidencia'}
                              </button>
                              {isCreator && task.status !== 'Terminado' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onAttemptStatusChange(task, 'Terminado')
                                  }
                                  className="min-h-[44px] sm:min-h-[34px] px-3 py-2 sm:py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-semibold text-emerald-300 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  Terminar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </motion.div>
          )}

          {/* PESTAÑA 3 (#5): CRONOLOGÍA DE FECHAS Y HORAS DEL PROYECTO */}
          {activeTab === 'cronologia' && (
            <motion.div
              key="tab-cronologia"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <ActivityTimelinePanel activeGroup={activeGroup} />
            </motion.div>
          )}

          {/* PESTAÑA 4 (#6): DESEMPEÑO, PUNTUALIDAD Y CALIFICACIONES DEL PROFESOR */}
          {activeTab === 'desempeno' && (
            <motion.div
              key="tab-desempeno"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <PerformancePanel
                activeGroup={activeGroup}
                isCreator={isCreator}
                onOpenTeacherGradeModal={onOpenTeacherGradeModal}
              />
            </motion.div>
          )}

          {/* PESTAÑA 5: EQUIPO Y REPARTO DE TAREAS CON CONTROL DEL CREADOR (#3) */}
          {activeTab === 'equipo' && (
            <motion.div
              key="tab-equipo"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="p-4 rounded-2xl bg-[#0F1623] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {equity.isBalanced ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <h2 className="font-display text-sm font-bold text-slate-100">
                      {equity.label}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Creador del grupo:{' '}
                      <strong className="text-sky-300">{creatorName}</strong> ·
                      Solo el creador puede mover estados, aprobar entregas o
                      expulsar integrantes.
                    </p>
                  </div>
                </div>
                <Scale className="w-5 h-5 text-slate-500 hidden sm:block" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {workloads.map((w) => {
                  const isMemberCreator =
                    w.member.trim().toLowerCase() ===
                    creatorName.trim().toLowerCase();
                  const isConfirmingKick = confirmKickMember === w.member;

                  return (
                    <motion.div
                      key={w.member}
                      whileHover={{ y: -2 }}
                      className="p-4 rounded-2xl bg-[#131C2E] border border-slate-800/90 space-y-3.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <StudentAvatar name={w.member} size="lg" />
                          <div className="min-w-0">
                            <span className="font-display font-semibold text-base text-slate-100 block truncate">
                              {w.member}
                            </span>
                            <span
                              className={`text-xs block ${
                                isMemberCreator
                                  ? 'text-sky-300 font-medium'
                                  : 'text-slate-400'
                              }`}
                            >
                              {isMemberCreator
                                ? 'Creador del grupo · Rango máximo'
                                : 'Integrante del equipo'}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-sm font-bold text-sky-400 tabular-nums shrink-0">
                          {w.totalAssigned}{' '}
                          {w.totalAssigned === 1 ? 'tarea' : 'tareas'}
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={false}
                          animate={{ width: `${w.sharePercentage}%` }}
                          transition={{ duration: 0.35 }}
                          className="h-full bg-sky-400"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono tabular-nums">
                        <span>
                          {w.completed} listas · {w.inProgress} en curso ·{' '}
                          {w.todo} pend.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectMemberFilter(w.member);
                            onSelectTab('tareas');
                          }}
                          className="text-sky-400 hover:underline font-sans cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          Ver tareas →
                        </button>
                      </div>

                      {/* Expulsar estudiante (permiso exclusivo del creador, #3) */}
                      {isCreator && !isMemberCreator && (
                        <div className="pt-2.5 border-t border-slate-800/80">
                          {isConfirmingKick ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-rose-300">
                                ¿Expulsar del grupo?
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setConfirmKickMember(null)}
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white bg-slate-800 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  data-testid={`confirm-kick-${w.member}`}
                                  onClick={() => {
                                    onKickMember(w.member);
                                    setConfirmKickMember(null);
                                  }}
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-rose-500 hover:bg-rose-400 cursor-pointer"
                                >
                                  Confirmar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              data-testid={`kick-member-btn-${w.member}`}
                              onClick={() => setConfirmKickMember(w.member)}
                              className="min-h-[38px] w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-medium text-rose-300 transition-colors cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5 shrink-0" />
                              <span>Expulsar del grupo</span>
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {isCreator ? (
                <form
                  onSubmit={handleAddMemberSubmit}
                  className="p-4 rounded-2xl bg-[#0F1623] border border-slate-800 flex flex-wrap items-center gap-3"
                >
                  <UserPlus className="w-4 h-4 text-sky-400 shrink-0" />
                  <label htmlFor="add-team-member-input" className="sr-only">
                    Nombre del nuevo integrante
                  </label>
                  <input
                    id="add-team-member-input"
                    type="text"
                    maxLength={PROJECT_LIMITS.MEMBER_NAME_MAX}
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Agregar otro integrante al grupo (Nombre y apellido)..."
                    className="flex-1 min-w-[200px] px-3 py-2.5 text-xs bg-[#0B0F17] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    + Añadir Integrante
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-[#0F1623]/70 border border-slate-800/80 text-xs text-slate-400 text-center">
                  Solo el creador del grupo ({creatorName}) puede añadir o
                  expulsar integrantes.
                </div>
              )}

              {/* Zona de Disolución del Grupo (exclusivo del creador) */}
              {isCreator && (
                <div
                  data-testid="dissolve-group-zone"
                  className="p-4 sm:p-5 rounded-2xl bg-rose-950/20 border border-rose-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-display text-sm font-bold text-rose-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Disolver grupo</span>
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Elimina permanentemente este grupo, todas sus tareas, evidencias y el código de invitación para todo el equipo. Solo disponible para ti como creador.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="dissolve-group-btn"
                    onClick={onOpenDissolveGroupModal}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/50 text-xs font-semibold text-rose-200 hover:text-white transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>Disolver grupo</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* PESTAÑA 4: RECURSOS FIJOS DEL CURSO */}
          {activeTab === 'recursos' && (
            <motion.div
              key="tab-recursos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <RightResourcesPanel
                activeGroup={activeGroup}
                onOpenAddResourceModal={onOpenAddResourceModal}
                onDeleteResource={onDeleteResource}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};
