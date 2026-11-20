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
} from 'lucide-react';
import {
  Group,
  Task,
  TaskStatus,
  calculateGroupProgress,
  calculateMemberWorkloads,
  evaluateWorkloadEquity,
  formatShortDate,
  groupTasksByDeadline,
  getDeadlineBadgeInfo,
} from '../utils/projectLogic';
import { WorkspaceTab } from './LeftSidebar';
import { RightResourcesPanel } from './RightResourcesPanel';
import {
  StudentAvatar,
  GroupCoverBanner,
  getGroupCoverUrl,
} from './visualAssets';

interface KanbanBoardProps {
  activeGroup: Group;
  activeTab: WorkspaceTab;
  selectedMemberFilter: string | null;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSelectMemberFilter: (member: string | null) => void;
  onOpenNewTaskModal: (defaultStatus?: TaskStatus) => void;
  onOpenAddResourceModal: () => void;
  onAttemptStatusChange: (task: Task, targetStatus: TaskStatus) => void;
  onOpenAttachEvidenceModal: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, text: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteResource: (resourceId: string) => void;
  onAddMemberToActiveGroup: (memberName: string) => void;
  onCopyInviteCode: (code: string) => void;
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
  activeGroup,
  activeTab,
  selectedMemberFilter,
  onSelectTab,
  onSelectMemberFilter,
  onOpenNewTaskModal,
  onOpenAddResourceModal,
  onAttemptStatusChange,
  onOpenAttachEvidenceModal,
  onToggleSubtask,
  onAddSubtask,
  onDeleteTask,
  onDeleteResource,
  onAddMemberToActiveGroup,
  onCopyInviteCode,
}) => {
  const [expandedTaskIds, setExpandedTaskIds] = useState<
    Record<string, boolean>
  >({
    'tsk-ept-3': true,
  });
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<
    Record<string, string>
  >({});
  const [newMemberName, setNewMemberName] = useState('');

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

        <div className="relative z-10 px-6 pt-5 pb-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-xs text-sky-300/90">
                <span className="font-medium truncate">{activeGroup.course}</span>
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
              <div className="flex items-center gap-3">
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
              className="flex items-center gap-3.5 bg-[#11192B]/90 backdrop-blur-md border border-slate-700/70 px-4 py-2.5 rounded-2xl min-w-[250px] sm:min-w-[300px] shadow-lg"
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

          {/* Barra de Pestañas (Tareas · Entregas · Equipo · Recursos) + Acción Principal */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
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
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'entregas'
                    ? 'bg-[#182338] text-sky-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Entregas ({deadlineBuckets.urgentOrSoon.length + deadlineBuckets.upcoming.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'equipo'}
                onClick={() => onSelectTab('equipo')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'equipo'
                    ? 'bg-[#182338] text-sky-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Equipo y Reparto ({activeGroup.members.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'recursos'}
                onClick={() => onSelectTab('recursos')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'recursos'
                    ? 'bg-[#182338] text-sky-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Recursos Fijos ({activeGroup.resources.length})</span>
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
      <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'tareas' && (
            <motion.div
              key="tab-tareas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start"
            >
              {COLUMNS.map((col) => {
                const columnTasks = filteredTasks.filter(
                  (t) => t.status === col.status
                );

                return (
                  <section
                    key={col.status}
                    aria-label={`Columna ${col.title}`}
                    data-testid={`kanban-col-${col.status}`}
                    className="rounded-2xl bg-[#0F1623]/75 backdrop-blur-md border border-slate-800/80 flex flex-col min-h-[420px]"
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
                            const hasEvidence = Boolean(
                              task.evidenceUrl.trim()
                            );
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
                                className="p-4 rounded-xl bg-[#151F32] border border-slate-800/90 hover:border-sky-500/35 transition-colors space-y-3 shadow-xs"
                              >
                                {/* 1. Título y botón borrar */}
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-display text-sm font-semibold text-slate-100 leading-snug">
                                    {task.title}
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteTask(task.id)}
                                    aria-label={`Eliminar tarea ${task.title}`}
                                    className="text-slate-500 hover:text-rose-400 transition-colors p-0.5 cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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

                                {/* Nota de revisión si existe */}
                                {hasEvidence && task.evidenceReviewNote && (
                                  <p className="text-[11px] text-slate-400 italic truncate">
                                    “{task.evidenceReviewNote}”
                                  </p>
                                )}

                                {/* 4. Botón de Evidencia / Revisión y Cambio de Columna */}
                                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 whitespace-nowrap">
                                  {hasEvidence ? (
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <a
                                        href={task.evidenceUrl}
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
                                        title="Revisar o cambiar enlace de evidencia"
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors cursor-pointer shrink-0 ${
                                          reviewState === 'verificada'
                                            ? 'text-emerald-300 hover:bg-emerald-500/15'
                                            : reviewState === 'observada'
                                            ? 'text-amber-300 hover:bg-amber-500/15'
                                            : 'text-sky-300 hover:bg-sky-500/15'
                                        }`}
                                      >
                                        {reviewState === 'verificada' ? (
                                          <>
                                            <ShieldCheck className="w-3 h-3" />
                                            <span>Verificada</span>
                                          </>
                                        ) : reviewState === 'observada' ? (
                                          <>
                                            <AlertCircle className="w-3 h-3" />
                                            <span>Corregir</span>
                                          </>
                                        ) : (
                                          <>
                                            <Link2 className="w-3 h-3" />
                                            <span>Revisar</span>
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
                                          className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
                        const hasEvidence = Boolean(task.evidenceUrl.trim());
                        const reviewState =
                          task.evidenceReviewStatus || 'pendiente';

                        return (
                          <div
                            key={task.id}
                            className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-[#141E30]/60 transition-colors"
                          >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
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
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                  <span className="inline-flex items-center gap-1.5 text-slate-300">
                                    <StudentAvatar
                                      name={task.assignee}
                                      size="xs"
                                    />
                                    <span>{task.assignee}</span>
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{task.status}</span>
                                  {hasEvidence && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span
                                        className={
                                          reviewState === 'verificada'
                                            ? 'text-emerald-400 font-medium'
                                            : reviewState === 'observada'
                                            ? 'text-amber-300 font-medium'
                                            : 'text-sky-300'
                                        }
                                      >
                                        {reviewState === 'verificada'
                                          ? 'Evidencia verificada'
                                          : reviewState === 'observada'
                                          ? 'Requiere corrección'
                                          : 'Evidencia por revisar'}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenAttachEvidenceModal(task)
                                }
                                className="px-3 py-1.5 rounded-lg bg-[#162238] hover:bg-[#1D2D49] border border-slate-700 text-xs font-medium text-sky-300 transition-colors cursor-pointer"
                              >
                                {hasEvidence
                                  ? 'Revisar evidencia'
                                  : '+ Adjuntar evidencia'}
                              </button>
                              {task.status !== 'Terminado' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onAttemptStatusChange(task, 'Terminado')
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-semibold text-emerald-300 transition-colors cursor-pointer"
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

          {/* PESTAÑA 3: EQUIPO Y REPARTO DE TAREAS CON RETRATOS */}
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
                      Revisa cuántas tareas tiene cada integrante para que todos
                      colaboren por igual.
                    </p>
                  </div>
                </div>
                <Scale className="w-5 h-5 text-slate-500 hidden sm:block" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {workloads.map((w) => (
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
                          <span className="text-xs text-slate-400 block">
                            Integrante del equipo
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

                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
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
                  </motion.div>
                ))}
              </div>

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
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Agregar otro integrante al grupo (Nombre y apellido)..."
                  className="flex-1 min-w-[200px] px-3 py-2 text-xs bg-[#0B0F17] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  + Añadir Integrante
                </button>
              </form>
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
