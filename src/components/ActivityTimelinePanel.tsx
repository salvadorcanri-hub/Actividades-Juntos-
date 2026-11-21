import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  PlayCircle,
  CalendarClock,
  FileCheck2,
  AlertCircle,
  MessageSquareText,
  UserPlus,
  UserMinus,
  Award,
  FolderPlus,
} from 'lucide-react';
import {
  Group,
  ActivityLogEntry,
  formatExactDateTime,
  formatShortDate,
} from '../utils/projectLogic';
import { StudentAvatar } from './visualAssets';

interface ActivityTimelinePanelProps {
  activeGroup: Group;
}

type TimelineFilter = 'todas' | 'en-desarrollo' | 'terminadas';

export const ActivityTimelinePanel: React.FC<ActivityTimelinePanelProps> = ({
  activeGroup,
}) => {
  const [filter, setFilter] = useState<TimelineFilter>('todas');

  const inProgressTasks = activeGroup.tasks.filter(
    (t) => t.status === 'En Progreso'
  );
  const completedTasks = activeGroup.tasks.filter(
    (t) => t.status === 'Terminado'
  );

  const visibleTasks = activeGroup.tasks
    .filter((t) => {
      if (filter === 'en-desarrollo') return t.status === 'En Progreso';
      if (filter === 'terminadas') return t.status === 'Terminado';
      return true;
    })
    .sort((a, b) => {
      const timeA = Date.parse(a.completedAt || a.startedAt || a.updatedAt || a.createdAt) || 0;
      const timeB = Date.parse(b.completedAt || b.startedAt || b.updatedAt || b.createdAt) || 0;
      return timeB - timeA;
    });

  const activityEntries: ActivityLogEntry[] = [...(activeGroup.activityLog || [])].sort(
    (a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0)
  );

  const getEventIcon = (type: ActivityLogEntry['type']) => {
    switch (type) {
      case 'task_completed':
      case 'evidence_verified':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'evidence_rejected':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'task_started':
        return <PlayCircle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'evidence_attached':
        return <FileCheck2 className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'coordinator_note':
        return <MessageSquareText className="w-4 h-4 text-indigo-400 shrink-0" />;
      case 'teacher_graded':
        return <Award className="w-4 h-4 text-amber-300 shrink-0" />;
      case 'member_joined':
        return <UserPlus className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'member_kicked':
        return <UserMinus className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'group_created':
        return <FolderPlus className="w-4 h-4 text-sky-400 shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div
      data-testid="activity-timeline-panel"
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Resumen de Tiempos del Proyecto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 block">
            Inicio del proyecto
          </span>
          <span className="font-mono text-sm font-bold text-slate-100 tabular-nums block">
            {formatExactDateTime(activeGroup.createdAt)}
          </span>
          <span className="text-[11px] text-slate-400 block truncate">
            Creado por {activeGroup.creatorName || activeGroup.members[0]}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#111827]/90 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400 block">
              En desarrollo ahora
            </span>
            <span className="font-display text-lg font-bold text-amber-300 mt-0.5 block tabular-nums">
              {inProgressTasks.length}{' '}
              {inProgressTasks.length === 1 ? 'tarea activa' : 'tareas activas'}
            </span>
          </div>
          <PlayCircle className="w-5 h-5 text-amber-400 shrink-0" />
        </div>

        <div className="p-4 rounded-2xl bg-[#111827]/90 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400 block">
              Entregas finalizadas
            </span>
            <span className="font-display text-lg font-bold text-emerald-400 mt-0.5 block tabular-nums">
              {completedTasks.length} de {activeGroup.tasks.length}
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        </div>
      </div>

      {/* Registro por Tarea: Fecha y Hora de Desarrollo / Finalización */}
      <section
        aria-label="Fechas y horas de desarrollo y finalización por tarea"
        className="rounded-2xl bg-[#0F1623]/85 border border-slate-800/90 overflow-hidden"
      >
        <div className="px-4 sm:px-5 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Registro de Fechas y Horas de Trabajo</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cuándo se inició cada parte del proyecto y la fecha y hora exacta en
              que fue terminada.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filtrar estado cronológico"
            className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-[#0B0F17] border border-slate-800 rounded-xl"
          >
            {(
              [
                { id: 'todas', label: 'Todas' },
                { id: 'en-desarrollo', label: 'En curso' },
                { id: 'terminadas', label: 'Terminadas' },
              ] as Array<{ id: TimelineFilter; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                onClick={() => setFilter(tab.id)}
                className={`min-h-[38px] sm:min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filter === tab.id
                    ? 'bg-[#18253C] text-sky-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {visibleTasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No hay tareas registradas en este filtro.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {visibleTasks.map((task) => {
              const isDone = task.status === 'Terminado';
              const isDoing = task.status === 'En Progreso';

              return (
                <div
                  key={task.id}
                  data-testid={`timeline-task-${task.id}`}
                  className="px-4 sm:px-5 py-4 space-y-2.5 hover:bg-[#141E30]/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-semibold text-slate-100 leading-snug">
                        {task.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="inline-flex items-center gap-1.5 text-slate-300">
                          <StudentAvatar name={task.assignee} size="xs" />
                          <span>{task.assignee}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            isDone
                              ? 'text-emerald-400 font-medium'
                              : isDoing
                              ? 'text-amber-300 font-medium'
                              : 'text-slate-400'
                          }
                        >
                          {task.status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Fecha límite: {formatShortDate(task.dueDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tiempos exactos de inicio y finalización */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                    <div className="px-3 py-2 rounded-xl bg-[#0B0F17]/80 border border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-slate-400">En desarrollo desde</span>
                      <span className="font-mono text-slate-200 tabular-nums text-[11px] sm:text-xs">
                        {task.startedAt
                          ? formatExactDateTime(task.startedAt)
                          : task.status === 'Por Hacer'
                          ? 'Aún sin iniciar'
                          : formatExactDateTime(task.createdAt)}
                      </span>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-[#0B0F17]/80 border border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-slate-400">Terminado el</span>
                      <span
                        className={`font-mono tabular-nums text-[11px] sm:text-xs ${
                          isDone ? 'text-emerald-300 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {isDone
                          ? formatExactDateTime(task.completedAt || task.updatedAt)
                          : 'Pendiente de finalizar'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bitácora General del Proyecto */}
      <section
        aria-label="Movimientos recientes del proyecto"
        className="rounded-2xl bg-[#0F1623]/85 border border-slate-800/90 overflow-hidden"
      >
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-100">
              Bitácora de Avances del Equipo
            </h2>
            <p className="text-xs text-slate-400">
              Historial público de entregas, revisiones y avances con hora exacta.
            </p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {activityEntries.length}
          </span>
        </div>

        {activityEntries.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Aún no hay movimientos registrados en este grupo.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {activityEntries.map((entry) => (
              <div
                key={entry.id}
                className="px-4 sm:px-5 py-3 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5">{getEventIcon(entry.type)}</div>
                  <div className="min-w-0">
                    <p className="text-slate-200 leading-snug">
                      <strong className="text-white font-semibold">
                        {entry.actorName}
                      </strong>{' '}
                      {entry.detail}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                  {formatExactDateTime(entry.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
