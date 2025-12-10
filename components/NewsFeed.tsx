import React, { useState } from 'react';
import { Rss, ExternalLink, RefreshCw, Clock, X, FileText } from 'lucide-react';
import { NewsItem } from '../types';

interface NewsFeedProps {
  news: NewsItem[];
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news, loading, error, onRefresh }) => {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // Helper to calculate relative time
  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString('es-AR');
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 min-h-[500px] relative">
      
      {/* MODAL OVERLAY */}
      {selectedNews && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedNews(null)}>
          <div className="bg-neutral-900 border border-neutral-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
             
             {/* Modal Header */}
             <div className="p-6 border-b border-neutral-800 flex justify-between items-start sticky top-0 bg-neutral-900/95 backdrop-blur z-10">
                <div>
                   <span className="inline-block px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-900/50 text-[10px] font-black uppercase tracking-wider mb-2">
                      {selectedNews.source}
                   </span>
                   <h2 className="text-xl md:text-2xl font-black text-white uppercase leading-tight">{selectedNews.title}</h2>
                   <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500 font-mono">
                      <Clock className="w-3 h-3" /> {selectedNews.pubDate}
                   </div>
                </div>
                <button onClick={() => setSelectedNews(null)} className="text-neutral-500 hover:text-white p-2">
                   <X className="w-6 h-6" />
                </button>
             </div>

             {/* Modal Body */}
             <div className="p-6 space-y-4">
                {/* Bajada */}
                <div className="text-neutral-300 font-medium text-lg leading-relaxed border-l-4 border-red-600 pl-4 italic">
                   {selectedNews.description}
                </div>
                
                {/* Cuerpo (Content) */}
                <div className="text-neutral-400 text-sm leading-relaxed space-y-4 font-serif">
                   {/* We assume content might be HTML, but for safety we strip heavy tags or just render summary if content is same */}
                   {selectedNews.content && selectedNews.content !== selectedNews.description ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedNews.content }} className="prose prose-invert prose-sm max-w-none" />
                   ) : (
                      <p>Para leer el desarrollo completo de la noticia, visite la fuente original.</p>
                   )}
                </div>
             </div>

             {/* Modal Footer */}
             <div className="p-6 border-t border-neutral-800 bg-neutral-950">
                <a 
                  href={selectedNews.link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  Leer en Fuente Original <ExternalLink className="w-4 h-4" />
                </a>
             </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex justify-between items-center">
        <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
          <Rss className="w-5 h-5 text-red-600" /> Cables de Noticias
        </h3>
        <button onClick={onRefresh} disabled={loading} className="text-neutral-500 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-0">
        {loading && (
          <div className="p-8 text-center text-neutral-500 font-mono animate-pulse">
            RECUPERANDO INFORMACIÓN DE MEDIOS SINDICALES...
          </div>
        )}

        {!loading && error && (
            <div className="p-8 text-center">
                <p className="text-red-500 font-bold mb-2">ERROR DE CONEXIÓN</p>
                <p className="text-neutral-500 text-sm mb-4">No se pudo conectar con los feeds RSS.</p>
                <div className="grid gap-2 max-w-sm mx-auto">
                   <p className="text-xs text-neutral-600">Verifique su conexión a internet.</p>
                </div>
            </div>
        )}

        {!loading && !error && (
          <div className="divide-y divide-neutral-800">
            {news.map((item, idx) => (
              <div key={idx} className="p-5 hover:bg-neutral-800/50 transition-colors group cursor-pointer" onClick={() => setSelectedNews(item)}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                     <span className="inline-block px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-900/50 text-[10px] font-black uppercase tracking-wider">
                        {item.source}
                     </span>
                     <span className="text-neutral-500 text-[10px] font-bold uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(item.pubDate)}
                     </span>
                  </div>
                </div>
                
                <h4 className="text-white font-bold text-lg leading-tight uppercase mb-2 group-hover:text-red-500 transition-colors">
                   {item.title}
                </h4>
                
                <p className="text-neutral-400 text-sm leading-relaxed line-clamp-2 mb-3">
                  {item.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-white uppercase tracking-wider">
                  <FileText className="w-3 h-3" /> Ver Detalle
                </span>
              </div>
            ))}
            {news.length === 0 && !loading && (
                 <div className="p-8 text-center text-neutral-600 italic">No hay cables recientes disponibles.</div>
            )}
          </div>
        )}
      </div>

      {/* Static Links fallback/addition */}
      <div className="bg-neutral-950 p-4 border-t border-neutral-800">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Fuentes Directas</h4>
        <div className="flex flex-wrap gap-3">
            <a href="https://www.infogremiales.com.ar/" target="_blank" rel="noreferrer" className="text-xs text-neutral-400 hover:text-red-500 uppercase font-bold flex items-center gap-1">InfoGremiales <ExternalLink className="w-3 h-3"/></a>
            <a href="http://www.infosindical.com.ar/" target="_blank" rel="noreferrer" className="text-xs text-neutral-400 hover:text-red-500 uppercase font-bold flex items-center gap-1">InfoSindical <ExternalLink className="w-3 h-3"/></a>
            <a href="https://mundogremial.com/" target="_blank" rel="noreferrer" className="text-xs text-neutral-400 hover:text-red-500 uppercase font-bold flex items-center gap-1">Mundo Gremial <ExternalLink className="w-3 h-3"/></a>
            <a href="https://gestionsindical.com/" target="_blank" rel="noreferrer" className="text-xs text-neutral-400 hover:text-red-500 uppercase font-bold flex items-center gap-1">Gestión Sindical <ExternalLink className="w-3 h-3"/></a>
        </div>
      </div>
    </div>
  );
};

export default NewsFeed;