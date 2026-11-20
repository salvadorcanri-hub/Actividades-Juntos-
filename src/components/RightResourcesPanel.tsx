import React from 'react';
import {
  Bookmark,
  Plus,
  ExternalLink,
  Trash2,
  FileText,
  FolderOpen,
  Globe,
} from 'lucide-react';
import { Group, AnchoredResource } from '../utils/projectLogic';

interface RightResourcesPanelProps {
  activeGroup: Group;
  onOpenAddResourceModal: () => void;
  onDeleteResource: (resourceId: string) => void;
}

export const RightResourcesPanel: React.FC<RightResourcesPanelProps> = ({
  activeGroup,
  onOpenAddResourceModal,
  onDeleteResource,
}) => {
  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (
      lower.includes('pdf') ||
      lower.includes('rúbrica') ||
      lower.includes('guía')
    ) {
      return <FileText className="w-4 h-4 text-sky-400 shrink-0" />;
    }
    if (lower.includes('drive') || lower.includes('carpeta')) {
      return <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    return <Globe className="w-4 h-4 text-indigo-400 shrink-0" />;
  };

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  return (
    <section
      aria-label="Recursos y enlaces fijos del grupo"
      className="max-w-3xl mx-auto space-y-5"
    >
      <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-sm font-bold text-slate-100">
            Enlaces y Documentos Fijos de {activeGroup.name}
          </h2>
          <p className="text-xs text-slate-400">
            Rúbricas, carpetas de Google Drive y plantillas que todo el grupo
            necesita tener a mano.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddResourceModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Añadir Enlace</span>
        </button>
      </div>

      {activeGroup.resources.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center space-y-3">
          <Bookmark className="w-6 h-6 text-slate-500 mx-auto" />
          <p className="text-xs text-slate-300">
            Aún no hay enlaces fijados en este curso.
          </p>
          <button
            type="button"
            onClick={onOpenAddResourceModal}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Fijar primer enlace</span>
          </button>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          role="list"
          aria-label={`Recursos anclados de ${activeGroup.name}`}
        >
          {activeGroup.resources.map((res: AnchoredResource) => (
            <div
              key={res.id}
              role="listitem"
              data-testid={`resource-item-${res.id}`}
              className="group p-4 rounded-xl bg-[#131C2E] border border-slate-800 hover:border-sky-500/40 transition-all flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  {getCategoryIcon(res.category)}
                  <span className="font-medium text-slate-300">
                    {res.category}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteResource(res.id)}
                  aria-label={`Borrar recurso ${res.title}`}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block space-y-1 group-hover:text-sky-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-slate-100 group-hover:text-sky-300 leading-snug">
                    {res.title}
                  </span>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-400 shrink-0 mt-0.5" />
                </div>
                <span className="block font-mono text-xs text-slate-400 truncate">
                  {getHostname(res.url)}
                </span>
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
