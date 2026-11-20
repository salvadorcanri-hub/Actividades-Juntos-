import React from 'react';
import { motion } from 'motion/react';
import {
  FolderKanban,
  Plus,
  RotateCcw,
  Users,
  Bookmark,
  LogOut,
  KeyRound,
  Calendar,
} from 'lucide-react';
import {
  Group,
  calculateGroupProgress,
  calculateMemberWorkloads,
} from '../utils/projectLogic';
import { StudentAccount } from '../utils/authLogic';
import {
  StudentAvatar,
  GroupCoverBanner,
  getGroupCoverUrl,
} from './visualAssets';

export type WorkspaceTab = 'tareas' | 'entregas' | 'equipo' | 'recursos';

interface LeftSidebarProps {
  currentStudent: StudentAccount;
  groups: Group[];
  activeGroup: Group;
  activeTab: WorkspaceTab;
  selectedMemberFilter: string | null;
  onSelectGroup: (groupId: string) => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSelectMemberFilter: (member: string | null) => void;
  onOpenNewGroupModal: () => void;
  onOpenJoinCodeModal: () => void;
  onResetSeedData: () => void;
  onLogout: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentStudent,
  groups,
  activeGroup,
  activeTab,
  selectedMemberFilter,
  onSelectGroup,
  onSelectTab,
  onSelectMemberFilter,
  onOpenNewGroupModal,
  onOpenJoinCodeModal,
  onResetSeedData,
  onLogout,
}) => {
  const workloads = calculateMemberWorkloads(
    activeGroup.members,
    activeGroup.tasks
  );

  return (
    <aside
      aria-label="Menú de cursos y resumen del equipo"
      className="relative z-10 w-full lg:w-72 bg-[#0D1320]/80 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none"
    >
      <div className="p-4 space-y-5 overflow-y-auto">
        {/* Identidad Minimalista con Detalle Visual */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400/20 to-indigo-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0 shadow-xs">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-display text-sm font-bold tracking-tight text-slate-100 block truncate">
                Actividades Juntos
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                Tus proyectos sin chats
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta del Estudiante Activo (Grado y Sección exclusivos aquí) */}
        <section
          aria-label="Cuenta del estudiante activo"
          data-testid="active-student-card"
          className="p-2.5 rounded-xl bg-[#131C2E]/90 border border-slate-800/90 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <StudentAvatar name={currentStudent.displayName} size="sm" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-white block truncate">
                {currentStudent.displayName}
              </span>
              <span
                data-testid="student-profile-grade-section"
                className="text-[11px] text-sky-300/90 block truncate"
              >
                {currentStudent.gradeCourse}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión o cambiar de estudiante"
            aria-label="Cerrar sesión"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-300 hover:text-rose-300 bg-slate-800/70 hover:bg-rose-500/15 border border-slate-700/70 hover:border-rose-500/30 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3 h-3" />
            <span>Salir</span>
          </button>
        </section>

        {/* Lista de Cursos / Grupos con Miniaturas Fotográficas y Unión por Código */}
        <section aria-labelledby="courses-heading" className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2
              id="courses-heading"
              className="text-xs font-semibold text-slate-400"
            >
              Mis Grupos ({groups.length})
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenJoinCodeModal}
                title="Unirse a un grupo con código"
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <KeyRound className="w-3 h-3 text-sky-400" />
                <span>Código</span>
              </button>
              <button
                type="button"
                onClick={onOpenNewGroupModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nuevo Grupo</span>
              </button>
            </div>
          </div>

          <nav aria-label="Lista de grupos escolares" className="space-y-2">
            {groups.map((group) => {
              const isSelected = group.id === activeGroup.id;
              const progress = calculateGroupProgress(group.tasks);
              const coverSrc = getGroupCoverUrl(
                group.id,
                group.name,
                group.coverUrl
              );

              return (
                <motion.button
                  key={group.id}
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelectGroup(group.id)}
                  aria-current={isSelected ? 'page' : undefined}
                  className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#152036] border-sky-500/50 text-slate-100 shadow-sm'
                      : 'bg-[#111827]/50 border-slate-800/60 text-slate-300 hover:bg-[#141D2E] hover:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700/70 shrink-0">
                      <GroupCoverBanner
                        src={coverSrc}
                        alt={`Portada de ${group.name}`}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-display font-semibold text-[13px] truncate">
                          {group.name}
                        </span>
                        <span
                          className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${
                            progress.percentage === 100
                              ? 'text-emerald-400'
                              : isSelected
                              ? 'text-sky-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {progress.percentage}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {group.course}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 w-full h-1 bg-slate-800/90 rounded-full overflow-hidden">
                    <motion.div
                      initial={false}
                      animate={{ width: `${progress.percentage}%` }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className={`h-full ${
                        progress.percentage === 100
                          ? 'bg-emerald-500'
                          : 'bg-sky-400'
                      }`}
                    />
                  </div>
                </motion.button>
              );
            })}
          </nav>
        </section>

        {/* Vista Rápida de Integrantes con Avatares */}
        <section
          aria-labelledby="quick-team-heading"
          className="pt-4 border-t border-slate-800/80 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="quick-team-heading"
              className="text-xs font-semibold text-slate-400 flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Equipo ({activeGroup.members.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => onSelectTab('equipo')}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              Ver reparto
            </button>
          </div>

          <div
            className="space-y-1"
            role="list"
            aria-label="Tareas asignadas por integrante"
          >
            {workloads.map((item) => {
              const isFiltered = selectedMemberFilter === item.member;
              return (
                <div
                  key={item.member}
                  role="listitem"
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    isFiltered
                      ? 'bg-sky-500/15 text-sky-200 border border-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('tareas');
                      onSelectMemberFilter(isFiltered ? null : item.member);
                    }}
                    className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer"
                    title={`Filtrar tareas de ${item.member}`}
                  >
                    <StudentAvatar name={item.member} size="xs" />
                    <span className="truncate">{item.member}</span>
                  </button>
                  <span
                    data-testid={`member-count-${item.member}`}
                    className="font-mono text-xs tabular-nums text-slate-400 shrink-0"
                  >
                    {item.totalAssigned}{' '}
                    {item.totalAssigned === 1 ? 'tarea' : 'tareas'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Accesos Rápidos a Próximas Entregas y Recursos Fijos */}
        <section className="pt-3 border-t border-slate-800/80 space-y-2">
          <button
            type="button"
            onClick={() => onSelectTab('entregas')}
            className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'entregas'
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-200'
                : 'bg-[#111827]/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Calendario de Entregas</span>
            </span>
            <span className="font-mono tabular-nums text-slate-400 shrink-0">
              {activeGroup.tasks.filter((t) => t.status !== 'Terminado').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('recursos')}
            className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'recursos'
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-200'
                : 'bg-[#111827]/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Bookmark className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Recursos Fijos del Curso</span>
            </span>
            <span className="font-mono tabular-nums text-slate-400 shrink-0">
              {activeGroup.resources.length}
            </span>
          </button>
        </section>
      </div>

      {/* Pie Minimalista */}
      <div className="px-4 py-3 border-t border-slate-800/80 bg-[#0B0F17]/50 flex items-center justify-between gap-2 text-xs text-slate-400 whitespace-nowrap">
        <span>Autoguardado</span>
        <button
          type="button"
          onClick={onResetSeedData}
          className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restaurar Demo</span>
        </button>
      </div>
    </aside>
  );
};
