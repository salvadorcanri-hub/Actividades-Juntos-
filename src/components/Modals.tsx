import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldAlert,
  Link2,
  Trash2,
  CheckCircle2,
  FolderPlus,
  BookmarkPlus,
  ClipboardPlus,
  Image as ImageIcon,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Pencil,
  Lock,
  MessageSquarePlus,
  Award,
  AlertTriangle,
  GraduationCap,
  User,
} from 'lucide-react';
import {
  Group,
  Priority,
  Task,
  TaskStatus,
  EvidenceReviewStatus,
  PROJECT_LIMITS,
  getOffsetIsoDate,
  isGroupCreator,
  isTaskRejected,
  getVisibleTaskEditHistory,
  formatExactTimeWithSeconds,
} from '../utils/projectLogic';
import {
  StudentAccount,
  GradeOption,
  SectionOption,
  GRADE_OPTIONS,
  SECTION_OPTIONS,
  BLUEPRINT_LIMITS,
  formatGradeAndSection,
} from '../utils/authLogic';
import { COVER_PRESETS, GroupCoverBanner } from './visualAssets';

function useEscapeToClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
}

/* ============================================================================
   1. MODAL: + NUEVO GRUPO (CON SELECTOR DE PORTADA VISUAL)
   ============================================================================ */
interface NewGroupModalProps {
  isOpen: boolean;
  creatorName: string;
  onClose: () => void;
  onCreateGroup: (payload: {
    name: string;
    course: string;
    members: string[];
    coverUrl?: string;
  }) => Promise<void> | void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  creatorName,
  onClose,
  onCreateGroup,
}) => {
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [selectedCover, setSelectedCover] = useState<string>(
    COVER_PRESETS[2].url
  );
  const [memberInput, setMemberInput] = useState('');
  const [extraMembers, setExtraMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEscapeToClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCourse('');
      setSelectedCover(COVER_PRESETS[2].url);
      setMemberInput('');
      setExtraMembers([]);
      setIsSubmitting(false);
      setError('');
    }
  }, [isOpen]);

  const handleAddMember = () => {
    const clean = memberInput.trim();
    if (!clean) return;
    if (
      clean.toLowerCase() === creatorName.trim().toLowerCase() ||
      extraMembers.some((m) => m.toLowerCase() === clean.toLowerCase())
    ) {
      setError('Ese integrante ya está en la lista.');
      return;
    }
    setExtraMembers([...extraMembers, clean]);
    setMemberInput('');
    setError('');
  };

  const handleRemoveMember = (target: string) => {
    setExtraMembers(extraMembers.filter((m) => m !== target));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pendingExtra = memberInput.trim();
    const combinedExtras = pendingExtra
      ? Array.from(new Set([...extraMembers, pendingExtra]))
      : extraMembers;
    const finalMembers = Array.from(
      new Set([creatorName.trim() || 'Creador', ...combinedExtras])
    );

    if (!name.trim()) {
      setError('Escribe el nombre del grupo o trabajo.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateGroup({
        name: name.trim(),
        course: course.trim() || 'Curso Escolar',
        members: finalMembers,
        coverUrl: selectedCover,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-new-group-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-sky-400" />
                <h2
                  id="modal-new-group-title"
                  className="font-display text-base font-bold text-slate-100"
                >
                  Nuevo Grupo de Trabajo
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal de nuevo grupo"
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="group-name-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Nombre del Proyecto o Grupo *
                </label>
                <input
                  id="group-name-input"
                  type="text"
                  maxLength={PROJECT_LIMITS.GROUP_NAME_MAX}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  placeholder="Ej. Exposición Historia o Feria de Ciencias"
                  className="w-full px-3 py-2 text-sm bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="group-course-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Curso / Asignatura
                </label>
                <input
                  id="group-course-input"
                  type="text"
                  maxLength={PROJECT_LIMITS.GROUP_COURSE_MAX}
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Ej. Ciencias Sociales"
                  className="w-full px-3 py-2 text-sm bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Selector de Portada Fotográfica */}
              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Imagen de portada</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {COVER_PRESETS.map((preset) => {
                    const isPicked = selectedCover === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedCover(preset.url)}
                        className={`relative h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          isPicked
                            ? 'border-sky-400 ring-2 ring-sky-400/30'
                            : 'border-slate-800 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <GroupCoverBanner
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="group-member-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Integrantes ({1 + extraMembers.length})
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Al crear el grupo recibirás un código para que tus compañeros se unan desde su cuenta. También puedes anotar nombres ahora si deseas asignarles tareas de inmediato.
                </p>

                <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-sky-500/10 border border-sky-500/25 text-xs text-sky-200">
                  <span className="font-medium truncate">{creatorName}</span>
                  <span className="text-[11px] text-sky-300 shrink-0">Tú · Creador</span>
                </div>

                <div className="flex gap-2">
                  <input
                    id="group-member-input"
                    type="text"
                    maxLength={PROJECT_LIMITS.MEMBER_NAME_MAX}
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMember();
                      }
                    }}
                    placeholder="Agregar nombre opcional..."
                    className="flex-1 px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    + Agregar
                  </button>
                </div>

                {extraMembers.length > 0 && (
                  <div className="max-h-24 overflow-y-auto space-y-1 pt-1">
                    {extraMembers.map((m) => (
                      <div
                        key={m}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#0B0F17] border border-slate-800 text-xs text-slate-200"
                      >
                        <span>{m}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m)}
                          aria-label={`Quitar a ${m}`}
                          className="text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
   1B. MODAL: UNIRSE A GRUPO CON CÓDIGO DE INVITACIÓN REAL (FIRESTORE)
   ============================================================================ */
interface JoinGroupByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinGroupByCode: (code: string) => Promise<{ error?: string }>;
}

export const JoinGroupByCodeModal: React.FC<JoinGroupByCodeModalProps> = ({
  isOpen,
  onClose,
  onJoinGroupByCode,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  useEscapeToClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setCodeInput('');
      setIsJoining(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) {
      setError('Escribe el código que compartió el creador del grupo.');
      return;
    }
    setIsJoining(true);
    setError('');
    try {
      const res = await onJoinGroupByCode(codeInput);
      if (res.error) {
        setError(res.error);
        return;
      }
      onClose();
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-join-code-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-sky-400" />
                <h2
                  id="modal-join-code-title"
                  className="font-display text-base font-bold text-slate-100"
                >
                  Unirse a un Grupo con Código
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal de código de invitación"
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Escribe el código que te compartió el creador del grupo para sumarte en tiempo real a sus tareas, cronología y entregas.
              </p>

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="join-group-code-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Código del Grupo *
                </label>
                <input
                  id="join-group-code-input"
                  type="text"
                  maxLength={12}
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="Ej. EPT-482"
                  className="w-full px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isJoining ? 'Buscando grupo...' : 'Unirme al Grupo'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
   2. MODAL SIMPLIFICADO: + NUEVA TAREA (CON SUBTAREAS OPCIONALES)
   ============================================================================ */
interface NewTaskModalProps {
  isOpen: boolean;
  members: string[];
  defaultStatus?: TaskStatus;
  onClose: () => void;
  onCreateTask: (payload: {
    title: string;
    assignee: string;
    dueDate: string;
    status: TaskStatus;
    evidenceUrl: string;
    subtasks: string[];
  }) => { error?: string };
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  members,
  defaultStatus = 'Por Hacer',
  onClose,
  onCreateTask,
}) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(members[0] || '');
  const [dueDate, setDueDate] = useState(() => getOffsetIsoDate(3));
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [subtaskText, setSubtaskText] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [error, setError] = useState('');
  const membersRef = useRef(members);
  membersRef.current = members;

  useEscapeToClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAssignee(membersRef.current[0] || '');
      setDueDate(getOffsetIsoDate(3));
      setEvidenceUrl('');
      setSubtaskText('');
      setSubtasks([]);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && members.length > 0 && !members.includes(assignee)) {
      setAssignee(members[0]);
    }
  }, [isOpen, members, assignee]);

  const handleAddSubtaskItem = () => {
    if (!subtaskText.trim()) return;
    setSubtasks([...subtasks, subtaskText.trim()]);
    setSubtaskText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubtasks = subtaskText.trim()
      ? [...subtasks, subtaskText.trim()]
      : subtasks;

    const res = onCreateTask({
      title,
      assignee,
      dueDate,
      status: defaultStatus,
      evidenceUrl,
      subtasks: finalSubtasks,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-new-task-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardPlus className="w-4 h-4 text-sky-400" />
                <h2
                  id="modal-new-task-title"
                  className="font-display text-base font-bold text-slate-100"
                >
                  Nueva Tarea
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal de nueva tarea"
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-amber-950/70 border border-amber-500/40 flex items-start gap-2 text-xs text-amber-200"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="task-title-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  ¿Qué hay que hacer? (Título) *
                </label>
                <input
                  id="task-title-input"
                  type="text"
                  maxLength={PROJECT_LIMITS.TASK_TITLE_MAX}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError('');
                  }}
                  placeholder="Ej. Armar diapositivas o redactar introducción"
                  className="w-full px-3 py-2 text-sm bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="task-assignee-select"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Responsable *
                  </label>
                  <select
                    id="task-assignee-select"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {members.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="task-date-input"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Fecha de entrega
                  </label>
                  <input
                    id="task-date-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              {/* Checklist opcional para proyectos más grandes */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-subtask-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Dividir en pasos / subtareas (Opcional para tareas grandes)
                </label>
                <div className="flex gap-2">
                  <input
                    id="task-subtask-input"
                    type="text"
                    maxLength={PROJECT_LIMITS.SUBTASK_MAX}
                    value={subtaskText}
                    onChange={(e) => setSubtaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtaskItem();
                      }
                    }}
                    placeholder="Ej. Buscar 3 fuentes..."
                    className="flex-1 px-3 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtaskItem}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer shrink-0"
                  >
                    + Paso
                  </button>
                </div>

                {subtasks.length > 0 && (
                  <ul className="space-y-1 pt-1 max-h-24 overflow-y-auto">
                    {subtasks.map((st, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between px-2.5 py-1 text-xs bg-[#0B0F17] rounded border border-slate-800 text-slate-300"
                      >
                        <span>• {st}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSubtasks(subtasks.filter((_, i) => i !== idx))
                          }
                          className="text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="task-evidence-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Enlace de Evidencia (Opcional al crear, obligatorio al
                  terminar)
                </label>
                <input
                  id="task-evidence-input"
                  type="text"
                  maxLength={PROJECT_LIMITS.URL_MAX}
                  value={evidenceUrl}
                  onChange={(e) => {
                    setEvidenceUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="https://docs.google.com/..."
                  className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
   3. MODAL: + AÑADIR ENLACE (RECURSO FIJO)
   ============================================================================ */
interface AddResourceModalProps {
  isOpen: boolean;
  groupName: string;
  onClose: () => void;
  onAddResource: (payload: {
    title: string;
    category: string;
    url: string;
  }) => { error?: string };
}

export const AddResourceModal: React.FC<AddResourceModalProps> = ({
  isOpen,
  groupName,
  onClose,
  onAddResource,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Rúbrica PDF');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEscapeToClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCategory('Rúbrica PDF');
      setUrl('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onAddResource({ title, category, url });
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-resource-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-sky-400" />
                <h2
                  id="modal-add-resource-title"
                  className="font-display text-base font-bold text-slate-100"
                >
                  Fijar Enlace en {groupName}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal de añadir enlace"
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="resource-title-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Nombre del Recurso *
                </label>
                <input
                  id="resource-title-input"
                  type="text"
                  maxLength={PROJECT_LIMITS.RESOURCE_TITLE_MAX}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError('');
                  }}
                  placeholder="Ej. Rúbrica del Profesor o Carpeta Drive"
                  className="w-full px-3 py-2 text-sm bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="resource-category-select"
                  className="block text-xs font-medium text-slate-300"
                >
                  Tipo
                </label>
                <select
                  id="resource-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="Rúbrica PDF">Rúbrica PDF</option>
                  <option value="Carpeta Drive">Carpeta Drive</option>
                  <option value="Plantilla Canva">Plantilla Canva</option>
                  <option value="Fuente Investigación">
                    Fuente Investigación
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="resource-url-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Link (URL) *
                </label>
                <input
                  id="resource-url-input"
                  type="text"
                  maxLength={PROJECT_LIMITS.URL_MAX}
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
                >
                  Anclar Recurso
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
   4. MODAL / ALERTA: BLOQUEO ANTI-PASEOS, EVIDENCIA Y REVISIÓN EN EQUIPO
   ============================================================================ */
interface EvidenceAlertModalProps {
  isOpen: boolean;
  task: Task | null;
  mode: 'blocked-alert' | 'edit-evidence';
  isCreator: boolean;
  alertMessage?: string;
  onClose: () => void;
  onSaveEvidence: (
    taskId: string,
    evidenceUrl: string,
    moveToCompleted: boolean,
    reviewStatus?: EvidenceReviewStatus,
    reviewNote?: string
  ) => { error?: string };
}

export const EvidenceAlertModal: React.FC<EvidenceAlertModalProps> = ({
  isOpen,
  task,
  mode,
  isCreator,
  alertMessage,
  onClose,
  onSaveEvidence,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [reviewStatus, setReviewStatus] =
    useState<EvidenceReviewStatus>('pendiente');
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');

  useEscapeToClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen && task) {
      setUrlInput(task.evidenceUrl || '');
      const initialReview =
        task.evidenceReviewStatus === 'observada'
          ? 'rechazada'
          : task.evidenceReviewStatus || 'pendiente';
      setReviewStatus(initialReview);
      setReviewNote(task.evidenceReviewNote || '');
      setError('');
    }
  }, [isOpen, task]);

  const isBlockedAlert = mode === 'blocked-alert';
  const taskIsRejected = task ? isTaskRejected(task) : false;

  const handleSubmit = (e: React.FormEvent, completeImmediately: boolean) => {
    e.preventDefault();
    if (!task) return;
    const res = onSaveEvidence(
      task.id,
      urlInput,
      isCreator ? completeImmediately : false,
      isCreator ? reviewStatus : undefined,
      isCreator ? reviewNote : undefined
    );
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && task && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="modal-anti-paseos-title"
          aria-describedby="modal-anti-paseos-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-amber-500/50 shadow-2xl"
          >
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                isBlockedAlert
                  ? 'bg-amber-950/40 border-amber-500/30'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {isBlockedAlert ? (
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <Link2 className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <h2
                  id="modal-anti-paseos-title"
                  className="font-display text-base font-bold text-slate-100"
                >
                  {isBlockedAlert
                    ? 'Falta el Enlace de Evidencia'
                    : isCreator
                    ? 'Evidencia y Revisión del Creador'
                    : 'Evidencia de tu Tarea'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar alerta de evidencia"
                className="text-slate-400 hover:text-slate-200 p-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => handleSubmit(e, isBlockedAlert && isCreator)}
              className="p-5 space-y-4"
            >
              {isBlockedAlert ? (
                <div
                  id="modal-anti-paseos-desc"
                  data-testid="anti-paseos-alert-banner"
                  className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed"
                >
                  {alertMessage ||
                    `Para marcar "${task.title}" como Terminado, pega primero el link de tu trabajo (Google Docs, Canva o Drive).`}
                </div>
              ) : (
                <p
                  id="modal-anti-paseos-desc"
                  className="text-xs text-slate-400 leading-relaxed"
                >
                  Gestiona el enlace entregado por{' '}
                  <strong className="text-slate-200">{task.assignee}</strong>{' '}
                  en{' '}
                  <strong className="text-slate-200">
                    &ldquo;{task.title}&rdquo;
                  </strong>
                  .
                </p>
              )}

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="evidence-modal-url-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Enlace de Evidencia (Google Docs, Canva, Drive) *
                </label>
                <input
                  id="evidence-modal-url-input"
                  type="text"
                  maxLength={PROJECT_LIMITS.URL_MAX}
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setError('');
                  }}
                  placeholder="https://docs.google.com/document/d/..."
                  className="w-full px-3 py-2.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* Revisión exclusiva del Creador del Grupo (#3 y #7) */}
              {isCreator ? (
                <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-200">
                      Revisión del creador
                    </span>
                    <span className="text-[11px] text-sky-300/90">
                      Permiso exclusivo
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReviewStatus('verificada')}
                      className={`min-h-[40px] py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        reviewStatus === 'verificada'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Aprobar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewStatus('pendiente')}
                      className={`min-h-[40px] py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        reviewStatus === 'pendiente'
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>Por revisar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewStatus('rechazada')}
                      data-testid="review-status-reject-btn"
                      className={`min-h-[40px] py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        reviewStatus === 'rechazada' ||
                        reviewStatus === 'observada'
                          ? 'bg-rose-500 text-white'
                          : 'bg-[#131C2E] text-rose-300 hover:text-white border border-rose-500/30'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Rechazar</span>
                    </button>
                  </div>

                  {reviewStatus === 'rechazada' && (
                    <p className="text-[11px] text-rose-300 leading-relaxed">
                      El recuadro de esta tarea se marcará en rojo y parpadeará
                      hasta que el estudiante corrija su entrega.
                    </p>
                  )}

                  <div>
                    <label
                      htmlFor="evidence-review-note-input"
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      Motivo o comentario de revisión (máx. 120 caract.)
                    </label>
                    <input
                      id="evidence-review-note-input"
                      type="text"
                      maxLength={120}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Ej. Faltan las citas APA o dar acceso al enlace..."
                      className="w-full px-2.5 py-2 text-xs bg-[#111827] border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-1.5 text-xs">
                  <span className="text-slate-400 block">
                    Estado de revisión del creador:{' '}
                    <strong
                      className={
                        taskIsRejected
                          ? 'text-rose-300'
                          : task.evidenceReviewStatus === 'verificada'
                          ? 'text-emerald-300'
                          : 'text-sky-300'
                      }
                    >
                      {taskIsRejected
                        ? 'Rechazada (requiere corrección)'
                        : task.evidenceReviewStatus === 'verificada'
                        ? 'Aprobada'
                        : 'Pendiente de revisión'}
                    </strong>
                  </span>
                  {task.evidenceReviewNote && (
                    <p className="text-[11px] text-slate-300 italic">
                      “{task.evidenceReviewNote}”
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Si cambias el enlace, el creador podrá revisarlo de nuevo y
                    mover la tarea a Terminado.
                  </p>
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                {isCreator &&
                  !isBlockedAlert &&
                  task.status !== 'Terminado' && (
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, true)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Guardar y Terminar</span>
                    </button>
                  )}
                <button
                  type="submit"
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
                >
                  {isBlockedAlert && isCreator ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Adjuntar Evidencia y Terminar</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
   5. MODAL (#4): CORREGIR TAREA + HISTORIAL PRIVADO CON FECHA Y HORA EXACTA
   ============================================================================ */
interface EditTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  group: Group;
  currentStudent: StudentAccount;
  onClose: () => void;
  onSaveEdit: (
    taskId: string,
    updates: {
      title: string;
      assignee: string;
      dueDate: string;
      priority: Priority;
      evidenceUrl: string;
    }
  ) => { error?: string };
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  group,
  currentStudent,
  onClose,
  onSaveEdit,
}) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('Media');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [error, setError] = useState('');

  useEscapeToClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title);
      setAssignee(task.assignee);
      setDueDate(task.dueDate);
      setPriority(task.priority);
      setEvidenceUrl(task.evidenceUrl || '');
      setError('');
    }
  }, [isOpen, task]);

  const isCreator = isGroupCreator(group, currentStudent);
  const visibleHistory = task
    ? getVisibleTaskEditHistory(task, group, currentStudent)
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    const res = onSaveEdit(task.id, {
      title,
      assignee,
      dueDate,
      priority,
      evidenceUrl,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && task && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-edit-task-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            data-testid="edit-task-modal"
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Pencil className="w-4 h-4 text-sky-400 shrink-0" />
                <h2
                  id="modal-edit-task-title"
                  className="font-display text-base font-bold text-slate-100 truncate"
                >
                  Corregir Tarea Enviada
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal de corrección"
                className="text-slate-400 hover:text-slate-200 p-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {isTaskRejected(task) && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 leading-relaxed">
                  <strong className="block text-rose-100">
                    Esta entrega fue rechazada por el creador
                  </strong>
                  <span>
                    {task.evidenceReviewNote ||
                      'Corrige los datos o el enlace y guarda para enviarla de nuevo a revisión.'}
                  </span>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-task-title-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Título de la tarea *
                </label>
                <input
                  id="edit-task-title-input"
                  type="text"
                  maxLength={PROJECT_LIMITS.TASK_TITLE_MAX}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError('');
                  }}
                  className="w-full px-3 py-2.5 text-sm bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-task-assignee-select"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Responsable
                  </label>
                  {isCreator ? (
                    <select
                      id="edit-task-assignee-select"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                    >
                      {group.members.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-2.5 py-2.5 text-xs bg-[#0B0F17]/70 border border-slate-800 rounded-lg text-slate-300 truncate">
                      {task.assignee}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-task-date-input"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Fecha de entrega
                  </label>
                  <input
                    id="edit-task-date-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-task-priority-select"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Prioridad
                  </label>
                  <select
                    id="edit-task-priority-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-2.5 py-2.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-task-evidence-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Enlace de evidencia corregido
                </label>
                <input
                  id="edit-task-evidence-input"
                  type="text"
                  maxLength={PROJECT_LIMITS.URL_MAX}
                  value={evidenceUrl}
                  onChange={(e) => {
                    setEvidenceUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="https://docs.google.com/..."
                  className="w-full px-3 py-2.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="save-edit-task-btn"
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
                >
                  Guardar Corrección
                </button>
              </div>
            </form>

            {/* Historial privado de cambios (#4) */}
            <div
              data-testid="private-edit-history-panel"
              className="px-5 pb-5 pt-4 border-t border-slate-800/90 bg-[#0D1320]/70 space-y-3"
            >
              <div className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-slate-200">
                    Historial privado de modificaciones ({visibleHistory.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Visible únicamente para quien realizó el cambio y el creador
                    del grupo. Los demás integrantes no pueden verlo.
                  </p>
                </div>
              </div>

              {visibleHistory.length === 0 ? (
                <p className="text-[11px] text-slate-500 pl-5">
                  Aún no hay modificaciones registradas aquí. Cada corrección
                  guardará la fecha y hora exacta.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {visibleHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <span className="font-semibold text-slate-200">
                          {rec.editorName}
                        </span>
                        <span className="font-mono tabular-nums text-sky-300">
                          {formatExactTimeWithSeconds(rec.editedAt)}
                        </span>
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-400">
                        {rec.changes.map((c, idx) => (
                          <li key={idx} className="leading-snug break-all">
                            <span className="text-slate-300 font-medium">
                              {c.field}:
                            </span>{' '}
                            <span className="line-through text-slate-500">
                              {c.from}
                            </span>{' '}
                            → <span className="text-emerald-300">{c.to}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
   6. MODAL (#3): NOTA DEL CREADOR PARA EL ESTUDIANTE
   ============================================================================ */
interface CoordinatorNoteModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onSaveNote: (taskId: string, note: string) => { error?: string };
}

export const CoordinatorNoteModal: React.FC<CoordinatorNoteModalProps> = ({
  isOpen,
  task,
  onClose,
  onSaveNote,
}) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEscapeToClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen && task) {
      setNote(task.coordinatorNote || '');
      setError('');
    }
  }, [isOpen, task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    const res = onSaveNote(task.id, note);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && task && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-coordinator-note-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            data-testid="coordinator-note-modal"
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquarePlus className="w-4 h-4 text-sky-400 shrink-0" />
                <h2
                  id="modal-coordinator-note-title"
                  className="font-display text-base font-bold text-slate-100 truncate"
                >
                  Nota para {task.assignee}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal de nota del creador"
                className="text-slate-400 hover:text-slate-200 p-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Deja una indicación directa en{' '}
                <strong className="text-slate-200">
                  &ldquo;{task.title}&rdquo;
                </strong>
                . Solo el creador del grupo puede escribir o editar esta nota.
              </p>

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="coordinator-note-textarea"
                    className="font-medium text-slate-300"
                  >
                    Nota de orientación
                  </label>
                  <span className="font-mono text-[11px] tabular-nums text-slate-500">
                    {note.length}/{PROJECT_LIMITS.COORDINATOR_NOTE_MAX}
                  </span>
                </div>
                <textarea
                  id="coordinator-note-textarea"
                  rows={4}
                  maxLength={PROJECT_LIMITS.COORDINATOR_NOTE_MAX}
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setError('');
                  }}
                  placeholder="Ej. Recuerda incluir las conclusiones en la última diapositiva antes del viernes..."
                  className="w-full px-3 py-2.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                {task.coordinatorNote ? (
                  <button
                    type="button"
                    onClick={() => {
                      const res = onSaveNote(task.id, '');
                      if (!res.error) onClose();
                    }}
                    className="min-h-[40px] px-2.5 py-2 text-xs text-rose-300 hover:text-rose-200 cursor-pointer"
                  >
                    Quitar nota
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    data-testid="save-coordinator-note-btn"
                    className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Guardar Nota
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
   7. MODAL (#6): REGISTRAR CALIFICACIÓN DEL PROFESOR (0–20)
   ============================================================================ */
interface TeacherGradeModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onSaveGrade: (
    taskId: string,
    rating: number,
    comment: string
  ) => { error?: string };
}

export const TeacherGradeModal: React.FC<TeacherGradeModalProps> = ({
  isOpen,
  task,
  onClose,
  onSaveGrade,
}) => {
  const [ratingInput, setRatingInput] = useState('18');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEscapeToClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen && task) {
      setRatingInput(
        typeof task.teacherRating === 'number'
          ? String(task.teacherRating)
          : '18'
      );
      setComment(task.teacherComment || '');
      setError('');
    }
  }, [isOpen, task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    const numeric = Number(ratingInput);
    if (ratingInput.trim() === '' || isNaN(numeric)) {
      setError('Ingresa una nota numérica entre 0 y 20.');
      return;
    }
    const res = onSaveGrade(task.id, numeric, comment);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && task && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-teacher-grade-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            data-testid="teacher-grade-modal"
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                <h2
                  id="modal-teacher-grade-title"
                  className="font-display text-base font-bold text-slate-100 truncate"
                >
                  Calificación del Profesor
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal de calificación"
                className="text-slate-400 hover:text-slate-200 p-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Registra la nota que dejó el profesor a{' '}
                <strong className="text-slate-200">{task.assignee}</strong> por{' '}
                <strong className="text-slate-200">
                  &ldquo;{task.title}&rdquo;
                </strong>
                .
              </p>

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="teacher-grade-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Nota (escala 0 a 20) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="teacher-grade-input"
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={ratingInput}
                    onChange={(e) => {
                      setRatingInput(e.target.value);
                      setError('');
                    }}
                    className="w-24 px-3 py-2.5 text-sm font-mono tabular-nums bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[20, 19, 18, 17, 15].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRatingInput(String(preset))}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                          Number(ratingInput) === preset
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-[#0B0F17] border border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="teacher-comment-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Comentario del profesor (opcional)
                </label>
                <textarea
                  id="teacher-comment-input"
                  rows={3}
                  maxLength={PROJECT_LIMITS.TEACHER_COMMENT_MAX}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ej. Excelente sustentación y entrega antes de la fecha límite."
                  className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="save-teacher-grade-btn"
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
                >
                  Guardar Calificación
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
   8. MODAL: DISOLVER GRUPO (EXCLUSIVO DEL CREADOR, CONFIRMACIÓN ÚNICA)
   ============================================================================ */
interface DissolveGroupModalProps {
  isOpen: boolean;
  groupName: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirmDissolve: () => Promise<void> | void;
}

export const DissolveGroupModal: React.FC<DissolveGroupModalProps> = ({
  isOpen,
  groupName,
  isDeleting,
  onClose,
  onConfirmDissolve,
}) => {
  useEscapeToClose(isOpen && !isDeleting, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="modal-dissolve-group-title"
          aria-describedby="modal-dissolve-group-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            data-testid="dissolve-group-modal"
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-rose-500/50 shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-rose-500/25 bg-rose-950/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <h2
                  id="modal-dissolve-group-title"
                  className="font-display text-base font-bold text-white truncate"
                >
                  ¿Disolver este grupo?
                </h2>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onClose}
                aria-label="Cerrar confirmación de disolver grupo"
                className="text-slate-400 hover:text-slate-200 p-1.5 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p
                id="modal-dissolve-group-desc"
                className="text-xs text-slate-300 leading-relaxed"
              >
                ¿Estás seguro de que deseas disolver el grupo{' '}
                <strong className="text-white">&ldquo;{groupName}&rdquo;</strong>?
                Se eliminarán permanentemente todas sus tareas, enlaces de evidencia,
                calificaciones, historial y el código de invitación para todos los
                integrantes. Esta acción no se puede deshacer.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  data-testid="confirm-dissolve-group-btn"
                  onClick={onConfirmDissolve}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Disolviendo...' : 'Sí, disolver grupo'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
   9. MODAL: CONFIGURAR PERFIL ESTUDIANTIL (GRADO 1-5 Y SECCIÓN A-C)
   ============================================================================ */
interface ProfileSetupModalProps {
  isOpen: boolean;
  initialName: string;
  initialGrade: GradeOption;
  initialSection: SectionOption;
  isRequired: boolean;
  onClose: () => void;
  onSaveProfile: (payload: {
    displayName: string;
    gradeLevel: GradeOption;
    sectionLetter: SectionOption;
  }) => Promise<void>;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  initialName,
  initialGrade,
  initialSection,
  isRequired,
  onClose,
  onSaveProfile,
}) => {
  const [displayName, setDisplayName] = useState(initialName);
  const [gradeLevel, setGradeLevel] = useState<GradeOption>(initialGrade);
  const [sectionLetter, setSectionLetter] = useState<SectionOption>(initialSection);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEscapeToClose(isOpen && !isRequired && !isSaving, onClose);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(initialName);
      setGradeLevel(initialGrade);
      setSectionLetter(initialSection);
      setIsSaving(false);
      setError('');
    }
  }, [isOpen, initialName, initialGrade, initialSection]);

  const previewGrade = formatGradeAndSection(gradeLevel, sectionLetter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Ingresa tu nombre y apellido.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await onSaveProfile({
        displayName: displayName.trim(),
        gradeLevel,
        sectionLetter,
      });
      onClose();
    } catch {
      setError('No se pudo guardar tu perfil. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-profile-setup-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            data-testid="profile-setup-modal"
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="w-4 h-4 text-sky-400 shrink-0" />
                <h2
                  id="modal-profile-setup-title"
                  className="font-display text-base font-bold text-slate-100 truncate"
                >
                  {isRequired ? 'Completa tu perfil escolar' : 'Editar perfil'}
                </h2>
              </div>
              {!isRequired && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar edición de perfil"
                  className="text-slate-400 hover:text-slate-200 p-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Elige cómo te verán tus compañeros en el tablero y selecciona tu grado y sección.
              </p>

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-display-name"
                  className="block text-xs font-medium text-slate-300"
                >
                  Nombre y Apellido *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="profile-display-name"
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setError('');
                    }}
                    placeholder="Ej. Sofía Mendoza"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300">
                    Grado y Sección
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-sky-300">
                    {previewGrade}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] text-slate-400">
                    Grado (1° a 5°)
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {GRADE_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGradeLevel(g)}
                        className={`min-h-[40px] rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                          gradeLevel === g
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        {g}°
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] text-slate-400">
                    Sección (A a C)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SECTION_OPTIONS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSectionLetter(sec)}
                        className={`min-h-[40px] rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                          sectionLetter === sec
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                {!isRequired && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[42px] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  data-testid="save-profile-setup-btn"
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Perfil'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
