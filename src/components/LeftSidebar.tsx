import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderKanban,
  Plus,
  RotateCcw,
  Users,
  Bookmark,
  LogOut,
  KeyRound,
  Calendar,
  LayoutGrid,
  X,
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
  isMobileOpen: boolean;
  onCloseMobile: () => void;
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
  isMobileOpen,
  onCloseMobile,
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
  const pendingDeliveriesCount = activeGroup.tasks.filter(
    (t) => t.status !== 'Terminado'
  ).length;

  // Close mobile drawer on Escape key and prevent background scroll while open
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen, onCloseMobile]);

  const handleNavSelectTab = (tab: WorkspaceTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const handleNavSelectGroup = (groupId: string) => {
    onSelectGroup(groupId);
    onCloseMobile();
  };

  const handleNavMemberFilter = (member: string, isFiltered: boolean) => {
    onSelectTab('tareas');
    onSelectMemberFilter(isFiltered ? null : member);
    onCloseMobile();
  };

  const handleNavOpenNewGroup = () => {
    onCloseMobile();
    onOpenNewGroupModal();
  };

  const handleNavOpenJoinCode = () => {
    onCloseMobile();
    onOpenJoinCodeModal();
  };

  const handleNavResetSeed = () => {
    onResetSeedData();
    onCloseMobile();
  };

  const handleNavLogout = () => {
    onCloseMobile();
    onLogout();
  };

  const viewNavItems: Array<{
    id: WorkspaceTab;
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    {
      id: 'tareas',
      label: 'Tablero de Tareas',
      count: activeGroup.tasks.length,
      icon: <LayoutGrid className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'entregas',
      label: 'Calendario de Entregas',
      count: pendingDeliveriesCount,
      icon: <Calendar className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'equipo',
      label: 'Equipo y Reparto',
      count: activeGroup.members.length,
      icon: <Users className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'recursos',
      label: 'Recursos Fijos',
      count: activeGroup.resources.length,
      icon: <Bookmark className="w-4 h-4 shrink-0" />,
    },
  ];

  const renderSidebarContent = (isDrawer: boolean) => (
    <div className="flex flex-col justify-between h-full">
      <div className="p-4 space-y-5 overflow-y-auto flex-1">
        {/* Encabezado de Marca + Botón Cerrar en Celular */}
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

          {isDrawer && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Cerrar menú"
              data-testid="mobile-drawer-close-btn"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/70 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* SECCIÓN 1: PERFIL DEL ESTUDIANTE */}
        <section
          aria-label="Perfil del estudiante"
          data-testid={isDrawer ? 'mobile-section-perfil' : 'active-student-card'}
          className="space-y-2"
        >
          <h2 className="text-xs font-semibold text-slate-400">Perfil</h2>
          <div className="p-2.5 rounded-xl bg-[#131C2E]/90 border border-slate-800/90 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <StudentAvatar name={currentStudent.displayName} size="sm" />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white block truncate">
                  {currentStudent.displayName}
                </span>
                <span
                  data-testid={
                    isDrawer
                      ? 'mobile-student-profile-grade-section'
                      : 'student-profile-grade-section'
                  }
                  className="text-[11px] text-sky-300/90 block truncate"
                >
                  {currentStudent.gradeCourse}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNavLogout}
              title="Cerrar sesión o cambiar de estudiante"
              aria-label="Cerrar sesión"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-medium text-slate-300 hover:text-rose-300 bg-slate-800/70 hover:bg-rose-500/15 border border-slate-700/70 hover:border-rose-500/30 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </section>

        {/* SECCIÓN 2: VISTAS DEL PROYECTO */}
        <section
          aria-label="Vistas del proyecto"
          data-testid={isDrawer ? 'mobile-section-vistas' : 'desktop-section-vistas'}
          className="pt-4 border-t border-slate-800/80 space-y-2"
        >
          <h2 className="text-xs font-semibold text-slate-400">
            Vistas del Proyecto
          </h2>
          <nav aria-label="Secciones del proyecto activo" className="space-y-1.5">
            {viewNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between gap-2 px-3 ${
                    isDrawer ? 'min-h-[44px] py-2.5' : 'py-2'
                  } rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-200'
                      : 'bg-[#111827]/60 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0 truncate">
                    <span className={isActive ? 'text-sky-300' : 'text-sky-400/80'}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-slate-400 shrink-0">
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </section>

        {/* SECCIÓN 3: MIS GRUPOS */}
        <section
          aria-label="Mis Grupos"
          data-testid={isDrawer ? 'mobile-section-grupos' : 'desktop-section-grupos'}
          className="pt-4 border-t border-slate-800/80 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-400">
              Mis Grupos ({groups.length})
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleNavOpenJoinCode}
                title="Unirse a un grupo con código"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <KeyRound className="w-3 h-3 text-sky-400" />
                <span>Código</span>
              </button>
              <button
                type="button"
                onClick={handleNavOpenNewGroup}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo</span>
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
                  onClick={() => handleNavSelectGroup(group.id)}
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

        {/* SECCIÓN 4: FILTRAR POR INTEGRANTE */}
        <section
          aria-label="Filtrar tareas por integrante"
          className="pt-4 border-t border-slate-800/80 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Filtro por Equipo ({activeGroup.members.length})</span>
            </h2>
            {selectedMemberFilter && (
              <button
                type="button"
                onClick={() => {
                  onSelectMemberFilter(null);
                  onCloseMobile();
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                Limpiar
              </button>
            )}
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
                    onClick={() =>
                      handleNavMemberFilter(item.member, isFiltered)
                    }
                    className={`flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer ${
                      isDrawer ? 'min-h-[36px]' : ''
                    }`}
                    title={`Filtrar tareas de ${item.member}`}
                  >
                    <StudentAvatar name={item.member} size="xs" />
                    <span className="truncate">{item.member}</span>
                  </button>
                  <span
                    data-testid={
                      isDrawer
                        ? `mobile-member-count-${item.member}`
                        : `member-count-${item.member}`
                    }
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
      </div>

      {/* Pie Minimalista */}
      <div className="px-4 py-3 border-t border-slate-800/80 bg-[#0B0F17]/60 flex items-center justify-between gap-2 text-xs text-slate-400 whitespace-nowrap shrink-0">
        <span>Autoguardado</span>
        <button
          type="button"
          onClick={handleNavResetSeed}
          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 py-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Demo</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Barra Lateral Fija en Escritorio (lg+) */}
      <aside
        aria-label="Menú de cursos y resumen del equipo"
        className="hidden lg:flex relative z-10 w-72 bg-[#0D1320]/80 backdrop-blur-xl border-r border-slate-800/80 flex-col justify-between shrink-0 select-none"
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Menú Lateral Deslizable de 3 Rayitas en Celular y Tablet (< lg) */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Fondo oscuro al abrir el cajón */}
            <motion.div
              key="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onCloseMobile}
              aria-hidden="true"
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            />

            {/* Cajón deslizable izquierdo */}
            <motion.aside
              key="mobile-drawer-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Menú principal móvil"
              data-testid="mobile-nav-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-[86vw] max-w-[320px] h-full bg-[#0D1320] border-r border-slate-800 shadow-2xl select-none"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

