import React from 'react';
import { Award, Clock, Trophy, Star, CheckCircle2, Edit3 } from 'lucide-react';
import {
  Group,
  Task,
  calculateTeamPerformance,
  formatExactDateTime,
  formatShortDate,
} from '../utils/projectLogic';
import { StudentAvatar } from './visualAssets';

interface PerformancePanelProps {
  activeGroup: Group;
  isCreator: boolean;
  onOpenTeacherGradeModal: (task: Task) => void;
}

function getGradeLabel(grade: number): { label: string; colorClass: string } {
  if (grade >= 18) {
    return { label: 'AD · Destacado', colorClass: 'text-emerald-400' };
  }
  if (grade >= 14) {
    return { label: 'A · Logrado', colorClass: 'text-sky-300' };
  }
  if (grade >= 11) {
    return { label: 'B · En proceso', colorClass: 'text-amber-300' };
  }
  return { label: 'C · En inicio', colorClass: 'text-rose-400' };
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({
  activeGroup,
  isCreator,
  onOpenTeacherGradeModal,
}) => {
  const rankings = calculateTeamPerformance(
    activeGroup.members,
    activeGroup.tasks
  );

  const completedTasks = activeGroup.tasks.filter(
    (t) => t.status === 'Terminado'
  );
  const gradedTasks = activeGroup.tasks.filter(
    (t) => typeof t.teacherRating === 'number' && !isNaN(t.teacherRating)
  );
  const avgGroupGrade =
    gradedTasks.length === 0
      ? null
      : Math.round(
          (gradedTasks.reduce((acc, t) => acc + (t.teacherRating || 0), 0) /
            gradedTasks.length) *
            10
        ) / 10;

  const totalEarlyCompleted = rankings.reduce((acc, r) => acc + r.earlyCount, 0);
  const groupEarlyPct =
    completedTasks.length === 0
      ? 0
      : Math.round((totalEarlyCompleted / completedTasks.length) * 100);

  const topPerformer = rankings[0];

  return (
    <div
      data-testid="performance-panel"
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Resumen General del Desempeño del Grupo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#111827]/90 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400 block">
              Entregas antes de fecha
            </span>
            <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums block mt-0.5">
              {groupEarlyPct}%
            </span>
            <span className="text-[11px] text-slate-400 block">
              {totalEarlyCompleted} de {completedTasks.length} entregadas a tiempo
            </span>
          </div>
          <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
        </div>

        <div className="p-4 rounded-2xl bg-[#111827]/90 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400 block">
              Promedio del profesor
            </span>
            <span className="font-mono text-2xl font-bold text-sky-300 tabular-nums block mt-0.5">
              {avgGroupGrade !== null ? `${avgGroupGrade} / 20` : 'Sin notas'}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {gradedTasks.length}{' '}
              {gradedTasks.length === 1
                ? 'entrega calificada'
                : 'entregas calificadas'}
            </span>
          </div>
          <Award className="w-5 h-5 text-sky-400 shrink-0" />
        </div>

        <div className="p-4 rounded-2xl bg-[#111827]/90 border border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs text-slate-400 block">
              Mayor puntualidad
            </span>
            <span className="font-display text-base font-bold text-amber-300 block truncate mt-0.5">
              {topPerformer && topPerformer.completedCount > 0
                ? topPerformer.member
                : 'Aún sin entregas'}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {topPerformer && topPerformer.completedCount > 0
                ? `${topPerformer.earlyDeliveryPct}% anticipadas${
                    topPerformer.averageTeacherGrade !== null
                      ? ` · ${topPerformer.averageTeacherGrade}/20`
                      : ''
                  }`
                : 'Se actualizará al terminar tareas'}
            </span>
          </div>
          <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
        </div>
      </div>

      {/* Ranking de Puntualidad y Desempeño por Estudiante */}
      <section
        aria-label="Ranking de puntualidad y calificaciones del profesor"
        className="rounded-2xl bg-[#0F1623]/85 border border-slate-800/90 overflow-hidden"
      >
        <div className="px-4 sm:px-5 py-4 border-b border-slate-800/80">
          <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Panel de Desempeño y Entregas Anticipadas</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Porcentaje de entregas realizadas antes de la fecha límite junto con
            la calificación del profesor que respalda el esfuerzo de cada
            integrante.
          </p>
        </div>

        <div className="divide-y divide-slate-800/70">
          {rankings.map((item, idx) => {
            const gradeMeta =
              item.averageTeacherGrade !== null
                ? getGradeLabel(item.averageTeacherGrade)
                : null;

            return (
              <div
                key={item.member}
                data-testid={`performance-row-${item.member}`}
                className="px-4 sm:px-5 py-4 space-y-3 hover:bg-[#141E30]/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-400 w-5 text-center tabular-nums shrink-0">
                      #{idx + 1}
                    </span>
                    <StudentAvatar name={item.member} size="md" />
                    <div className="min-w-0">
                      <span className="font-display text-sm font-semibold text-white block truncate">
                        {item.member}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                        <span>
                          {item.completedCount}/{item.totalAssigned} terminadas
                        </span>
                        {item.earlyCount > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-400">
                              Prom. {item.averageDaysEarly} d antes
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Métricas clave alineadas */}
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-5 pl-8 sm:pl-0">
                    <div>
                      <span className="text-[11px] text-slate-400 block">
                        Entregas antes
                      </span>
                      <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                        {item.earlyDeliveryPct}%
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block">
                        Nota profesor
                      </span>
                      {item.averageTeacherGrade !== null && gradeMeta ? (
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${gradeMeta.colorClass}`}
                        >
                          {item.averageTeacherGrade}/20
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Pendiente</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Barra de entregas anticipadas */}
                <div className="pl-8 space-y-1.5">
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.earlyDeliveryPct}%` }}
                      className={`h-full transition-all duration-300 ${
                        item.earlyDeliveryPct >= 75
                          ? 'bg-emerald-400'
                          : item.earlyDeliveryPct > 0
                          ? 'bg-sky-400'
                          : 'bg-slate-700'
                      }`}
                    />
                  </div>

                  {item.latestTeacherComment && (
                    <p className="text-xs text-slate-300 flex items-start gap-1.5 pt-0.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-200 font-medium">
                          Comentario del profesor:
                        </strong>{' '}
                        “{item.latestTeacherComment}”
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detalle de Entregas Evaluadas por el Profesor */}
      <section
        aria-label="Entregas terminadas y calificación docente"
        className="rounded-2xl bg-[#0F1623]/85 border border-slate-800/90 overflow-hidden"
      >
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-100">
              Calificaciones del Profesor por Entrega
            </h2>
            <p className="text-xs text-slate-400">
              {isCreator
                ? 'Como creador del grupo, puedes registrar o actualizar la nota que dejó el profesor en cada entrega.'
                : 'Respaldo de las notas otorgadas por el docente a las entregas terminadas.'}
            </p>
          </div>
        </div>

        {completedTasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Cuando el grupo termine tareas con evidencia, aparecerán aquí para
            registrar su calificación del profesor.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {completedTasks.map((task) => {
              const hasGrade = typeof task.teacherRating === 'number';
              const gradeMeta = hasGrade
                ? getGradeLabel(task.teacherRating!)
                : null;

              return (
                <div
                  key={task.id}
                  className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <h3 className="font-display text-sm font-semibold text-slate-100 truncate">
                        {task.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 pl-6">
                      <span className="text-slate-300">{task.assignee}</span>
                      <span aria-hidden="true">·</span>
                      <span>Límite: {formatShortDate(task.dueDate)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] tabular-nums">
                        Entregada: {formatExactDateTime(task.completedAt || task.updatedAt)}
                      </span>
                    </div>
                    {task.teacherComment && (
                      <p className="text-xs text-slate-300 pl-6 italic">
                        “{task.teacherComment}”
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-6 sm:pl-0 shrink-0">
                    {hasGrade && gradeMeta ? (
                      <div className="text-left sm:text-right">
                        <span
                          className={`font-mono text-sm font-bold tabular-nums block ${gradeMeta.colorClass}`}
                        >
                          {task.teacherRating} / 20
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {gradeMeta.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Sin calificación aún
                      </span>
                    )}

                    {isCreator && (
                      <button
                        type="button"
                        onClick={() => onOpenTeacherGradeModal(task)}
                        className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg bg-[#162238] hover:bg-[#1D2D49] border border-slate-700 text-xs font-medium text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5 shrink-0" />
                        <span>{hasGrade ? 'Editar nota' : 'Poner nota'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
