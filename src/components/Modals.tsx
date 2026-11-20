import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  Task,
  TaskStatus,
  EvidenceReviewStatus,
  JOINABLE_SCHOOL_GROUPS,
} from '../utils/projectLogic';
import { COVER_PRESETS, GroupCoverBanner } from './visualAssets';

/* ============================================================================
   1. MODAL: + NUEVO GRUPO (CON SELECTOR DE PORTADA VISUAL)
   ============================================================================ */
interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (payload: {
    name: string;
    course: string;
    members: string[];
    coverUrl?: string;
  }) => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
}) => {
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [selectedCover, setSelectedCover] = useState<string>(
    COVER_PRESETS[2].url
  );
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<string[]>([
    'Ana Morales',
    'Carlos Vega',
  ]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCourse('');
      setSelectedCover(COVER_PRESETS[2].url);
      setMemberInput('');
      setMembers(['Ana Morales', 'Carlos Vega']);
      setError('');
    }
  }, [isOpen]);

  const handleAddMember = () => {
    const clean = memberInput.trim();
    if (!clean) return;
    if (members.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      setError('Ese integrante ya está en la lista.');
      return;
    }
    setMembers([...members, clean]);
    setMemberInput('');
    setError('');
  };

  const handleRemoveMember = (target: string) => {
    setMembers(members.filter((m) => m !== target));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMembers = memberInput.trim()
      ? Array.from(new Set([...members, memberInput.trim()]))
      : members;

    if (!name.trim()) {
      setError('Escribe el nombre del grupo o trabajo.');
      return;
    }
    if (finalMembers.length === 0) {
      setError('Agrega al menos un integrante.');
      return;
    }

    onCreateGroup({
      name: name.trim(),
      course: course.trim() || 'Curso Escolar',
      members: finalMembers,
      coverUrl: selectedCover,
    });
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
          aria-labelledby="modal-new-group-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl overflow-hidden"
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
                  Integrantes ({members.length}) *
                </label>
                <div className="flex gap-2">
                  <input
                    id="group-member-input"
                    type="text"
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMember();
                      }
                    }}
                    placeholder="Nombre de compañero..."
                    className="flex-1 px-3 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    + Agregar
                  </button>
                </div>

                <div className="max-h-24 overflow-y-auto space-y-1 pt-1">
                  {members.map((m) => (
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
                  Crear Grupo
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
   1B. MODAL: UNIRSE A GRUPO CON CÓDIGO DE INVITACIÓN
   ============================================================================ */
interface JoinGroupByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinGroupByCode: (code: string) => { error?: string };
}

export const JoinGroupByCodeModal: React.FC<JoinGroupByCodeModalProps> = ({
  isOpen,
  onClose,
  onJoinGroupByCode,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCodeInput('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onJoinGroupByCode(codeInput);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  const handleQuickJoin = (code: string) => {
    const res = onJoinGroupByCode(code);
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
          aria-labelledby="modal-join-code-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl overflow-hidden"
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
                Escribe el código de 6 caracteres que te compartió tu equipo
                para sumarte automáticamente a sus tareas y entregas.
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
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="Ej. CYT-305 o HIS-412"
                  className="w-full px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Códigos Escolares Disponibles para Probar en 1 Clic */}
              <div className="space-y-2 pt-1">
                <span className="block text-[11px] font-medium text-slate-400">
                  Grupos compartidos disponibles en tu colegio:
                </span>
                <div className="space-y-1.5">
                  {JOINABLE_SCHOOL_GROUPS.map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => handleQuickJoin(grp.inviteCode || '')}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#152036] border border-slate-800 hover:border-sky-500/40 text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-100 block truncate">
                          {grp.name}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {grp.course} · {grp.members.length} integrantes
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-sky-400 shrink-0">
                        {grp.inviteCode}
                      </span>
                    </button>
                  ))}
                </div>
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
                  Unirme al Grupo
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
  const [dueDate, setDueDate] = useState('2026-11-22');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [subtaskText, setSubtaskText] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAssignee(members[0] || '');
      setDueDate('2026-11-22');
      setEvidenceUrl('');
      setSubtaskText('');
      setSubtasks([]);
      setError('');
    }
  }, [isOpen, members]);

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
            className="w-full max-w-md rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl overflow-hidden"
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
            className="w-full max-w-md rounded-2xl bg-[#111827] border border-slate-700/80 shadow-2xl overflow-hidden"
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
  alertMessage,
  onClose,
  onSaveEvidence,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [reviewStatus, setReviewStatus] =
    useState<EvidenceReviewStatus>('pendiente');
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && task) {
      setUrlInput(task.evidenceUrl || '');
      setReviewStatus(task.evidenceReviewStatus || 'pendiente');
      setReviewNote(task.evidenceReviewNote || '');
      setError('');
    }
  }, [isOpen, task]);

  const isBlockedAlert = mode === 'blocked-alert';

  const handleSubmit = (e: React.FormEvent, completeImmediately: boolean) => {
    e.preventDefault();
    if (!task) return;
    const res = onSaveEvidence(
      task.id,
      urlInput,
      completeImmediately,
      reviewStatus,
      reviewNote
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
            className="w-full max-w-md rounded-2xl bg-[#111827] border border-amber-500/50 shadow-2xl overflow-hidden"
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
                    : 'Evidencia y Revisión del Equipo'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar alerta de evidencia"
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => handleSubmit(e, isBlockedAlert)}
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
                  Gestiona o revisa el enlace entregado por{' '}
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
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setError('');
                  }}
                  placeholder="https://docs.google.com/document/d/..."
                  className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* Sección de Revisión de Evidencia entre Compañeros */}
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
                <span className="block text-xs font-medium text-slate-300">
                  Estado de revisión del equipo
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('verificada')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      reviewStatus === 'verificada'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Verificada</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('pendiente')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      reviewStatus === 'pendiente'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>Por revisar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('observada')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      reviewStatus === 'observada'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Corregir</span>
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="evidence-review-note-input"
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    Nota breve sobre el entregable (opcional, máx. 120 caract.)
                  </label>
                  <input
                    id="evidence-review-note-input"
                    type="text"
                    maxLength={120}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Ej. Citas APA completas o falta dar acceso al Drive..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#111827] border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                {!isBlockedAlert && task.status !== 'Terminado' && (
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Guardar y Terminar</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
                >
                  {isBlockedAlert ? (
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
