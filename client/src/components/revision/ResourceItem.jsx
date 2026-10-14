import React from 'react';
import { BookOpen, Video, FileText, GraduationCap, Code, ExternalLink, Sparkles } from 'lucide-react';

export const ResourceItem = ({ resource }) => {
  if (!resource) return null;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-rose-400" />;
      case 'book':
        return <BookOpen className="w-4 h-4 text-amber-400" />;
      case 'course':
        return <GraduationCap className="w-4 h-4 text-purple-400" />;
      case 'practice':
        return <Code className="w-4 h-4 text-emerald-400" />;
      case 'documentation':
      case 'article':
      default:
        return <FileText className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all flex items-center justify-between gap-3 text-xs"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-lg bg-slate-800/80 shrink-0">
          {getTypeIcon(resource.type)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-200 group-hover:text-purple-300 transition-colors truncate">
            {resource.title}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <span className="capitalize">{resource.type}</span>
            {resource.minutes > 0 && (
              <>
                <span>•</span>
                <span>~{resource.minutes} mins</span>
              </>
            )}
            {resource.aiSuggested && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-0.5 text-purple-400 text-[10px] font-medium">
                  <Sparkles className="w-3 h-3" />
                  AI Suggested
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 shrink-0 transition-colors" />
    </a>
  );
};
