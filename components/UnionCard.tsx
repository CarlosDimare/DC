import React from 'react';
import { SindicatoData, AccionGremial } from '../types';
import { ArrowRight, MapPin, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';

interface UnionCardProps {
  data: SindicatoData;
  onSelect: (data: SindicatoData) => void;
}

const UnionCard: React.FC<UnionCardProps> = ({ data, onSelect }) => {
  const accionesArray = Object.values((data.acciones || {}) as Record<string, AccionGremial>);
  
  // Helper: Upcoming = Date >= Today
  const today = new Date().toISOString().split('T')[0];
  const isUpcoming = (dateStr: string) => dateStr >= today;

  // Find top 2 upcoming actions
  const upcomingActions = accionesArray
    .filter(a => isUpcoming(a.fecha))
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(0, 2);

  // Find top 2 recent past actions
  const pastActions = accionesArray
    .filter(a => !isUpcoming(a.fecha))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 2);

  return (
    <div className="group bg-neutral-900 border border-neutral-800 rounded-none hover:border-red-600 transition-colors duration-300 flex flex-col h-full relative overflow-hidden shadow-lg">
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-neutral-800 group-hover:bg-red-600 transition-colors duration-300"></div>
      
      <div className="p-6 flex-1 pl-7 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="inline-block px-2 py-0.5 bg-neutral-800 text-neutral-300 text-xs font-black tracking-widest uppercase mb-3 border border-neutral-700">
              {data.slug}
            </span>
            <div className="flex items-center gap-3">
              {data.datosBasicos.logo && (
                <div className="w-12 h-12 bg-white rounded-full p-1 flex items-center justify-center shrink-0 border-2 border-neutral-700">
                  <img 
                    src={data.datosBasicos.logo} 
                    alt={`${data.nombre} logo`} 
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <h3 className="text-xl md:text-2xl font-black text-white leading-none uppercase tracking-tight">{data.nombre}</h3>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm text-neutral-400 mb-6 font-mono">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            <span className="truncate">{data.datosBasicos.sedePrincipal}</span>
          </div>
        </div>

        <div className="mt-auto space-y-4 border-t border-neutral-800 pt-4">
            {/* Upcoming Highlights */}
            {upcomingActions.length > 0 ? (
                <div className="bg-red-900/20 border-l-2 border-red-600 p-2 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Próximas Acciones</span>
                    </div>
                    {upcomingActions.map((action, idx) => (
                        <div key={idx} className="border-b border-red-900/30 last:border-0 pb-1 last:pb-0">
                            <div className="flex justify-between items-center text-[10px] text-red-300 font-mono mb-0.5">
                                <span>{action.fecha}</span>
                                <span className="uppercase">{action.tipo}</span>
                            </div>
                            <p className="text-white text-xs font-bold leading-tight line-clamp-1">{action.titulo}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-2 opacity-50">
                     <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3 h-3 text-neutral-500" />
                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Sin agenda próxima</span>
                    </div>
                </div>
            )}

            {/* Past Highlights */}
            {pastActions.length > 0 && (
                 <div className="pl-2 border-l-2 border-neutral-700 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-3 h-3 text-neutral-500" />
                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Últimas Acciones</span>
                    </div>
                    {pastActions.map((action, idx) => (
                         <div key={idx}>
                            <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono mb-0.5">
                                <span>{action.fecha}</span>
                            </div>
                            <p className="text-neutral-400 text-xs leading-tight line-clamp-1">{action.titulo}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      <div className="bg-neutral-950 p-4 border-t border-neutral-800 flex items-center justify-end pl-7">
        <button 
          onClick={() => onSelect(data)}
          className="text-red-500 text-sm font-bold uppercase tracking-wider flex items-center gap-2 hover:text-red-400 transition-all"
        >
          VER INFORME COMPLETO <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UnionCard;