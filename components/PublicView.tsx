import React, { useState } from 'react';
import { SindicatoData, AccionGremial, AcuerdoParitario, NewsItem } from '../types';
import UnionCard from './UnionCard';
import NewsFeed from './NewsFeed';
import { ChevronLeft, ExternalLink, FileText, Users, Megaphone, Calendar, ShieldAlert, Users2, AlertOctagon, Clock, LayoutGrid, Radio, CheckCircle2, CloudSun } from 'lucide-react';

interface PublicViewProps {
  unions: SindicatoData[];
  news: NewsItem[];
  newsLoading: boolean;
  newsError: boolean;
  onRefreshNews: () => void;
}

type MainTab = 'monitor' | 'sindicatos' | 'noticias';
type DetailTab = 'agenda' | 'historial' | 'paritarias';

// Header Widget Component (Internal)
const HeaderWidget = () => {
    const [dateTime, setDateTime] = useState(new Date());
    const [weather, setWeather] = useState<{temp: number | null, city: string | null}>({ temp: null, city: null });

    React.useEffect(() => {
        const timer = setInterval(() => setDateTime(new Date()), 1000);
        const fetchWeather = async () => {
            try {
                const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
                const geoData = await geoRes.json();
                if (geoData.latitude && geoData.longitude) {
                    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current=temperature_2m`);
                    const weatherData = await weatherRes.json();
                    setWeather({ temp: Math.round(weatherData.current.temperature_2m), city: geoData.city });
                }
            } catch (e) { console.error("Weather error", e); }
        };
        fetchWeather();
        return () => clearInterval(timer);
    }, []);

    const dateStr = dateTime.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();
    const timeStr = dateTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-3 text-white font-bold text-sm tracking-widest font-mono">
                <span>{dateStr}</span>
                <span className="text-red-500">{timeStr}</span>
            </div>
            {weather.temp !== null && (
                <div className="flex items-center gap-1 text-xs text-neutral-500 font-mono uppercase">
                    <CloudSun className="w-3 h-3" />
                    <span>{weather.city || 'LOCAL'}: {weather.temp}°C</span>
                </div>
            )}
        </div>
    );
}

const PublicView: React.FC<PublicViewProps> = ({ unions, news, newsLoading, newsError, onRefreshNews }) => {
  const [selectedUnion, setSelectedUnion] = useState<SindicatoData | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('monitor');
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('agenda');

  // --- Date Logic ---
  const today = new Date().toISOString().split('T')[0];
  const isUpcoming = (dateStr: string) => dateStr >= today;

  const getAllActions = () => {
    const all: Array<{ action: AccionGremial; unionName: string; unionSlug: string; uuid: string }> = [];
    unions.forEach(union => {
        const acciones = (union.acciones || {}) as Record<string, AccionGremial>;
        Object.entries(acciones).forEach(([uuid, action]) => {
            all.push({ action, unionName: union.nombre, unionSlug: union.slug, uuid });
        });
    });
    return all;
  };

  const allActions = getAllActions();

  // Filter Global Lists
  const upcomingActions = allActions
    .filter(item => isUpcoming(item.action.fecha))
    .sort((a, b) => new Date(a.action.fecha).getTime() - new Date(b.action.fecha).getTime());

  const pastActions = allActions
    .filter(item => !isUpcoming(item.action.fecha))
    .sort((a, b) => new Date(b.action.fecha).getTime() - new Date(a.action.fecha).getTime())
    .slice(0, 20);

  const getActionIcon = (type: string) => {
    switch (type) {
        case 'medida-fuerza': return <ShieldAlert className="w-5 h-5" />;
        case 'movilizacion': return <Megaphone className="w-5 h-5" />;
        case 'asamblea': return <Users2 className="w-5 h-5" />;
        default: return <Calendar className="w-5 h-5" />;
    }
  }

  const getTypeLabel = (type: string) => {
    if (!type) return 'ACCIÓN';
    const labels: Record<string, string> = {
        'medida-fuerza': 'MEDIDA DE FUERZA',
        'movilizacion': 'MOVILIZACIÓN',
        'asamblea': 'ASAMBLEA',
        'reunion': 'REUNIÓN',
        'denuncia': 'DENUNCIA',
        'otro': 'ACCIÓN'
    };
    return labels[type] || type.toUpperCase();
  }

  // --- RENDER DETAIL VIEW (INFORME) ---
  if (selectedUnion) {
    const accionesMap = (selectedUnion.acciones || {}) as Record<string, AccionGremial>;
    
    // Filter actions by Date
    const agendaActions = Object.entries(accionesMap)
      .filter(([, a]) => isUpcoming(a.fecha))
      .sort(([, a], [, b]) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const historialActions = Object.entries(accionesMap)
      .filter(([, a]) => !isUpcoming(a.fecha))
      .sort(([, a], [, b]) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return (
      <div className="container mx-auto px-4 py-8">
        <button 
          onClick={() => setSelectedUnion(null)}
          className="mb-8 flex items-center text-neutral-500 hover:text-red-500 transition-colors uppercase font-bold text-sm tracking-widest"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver al Tablero
        </button>

        {/* Header */}
        <div className="bg-neutral-900 border-l-4 border-red-600 p-8 mb-8 shadow-2xl relative">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 relative z-10">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter leading-none flex items-center gap-4">
                {selectedUnion.datosBasicos.logo && (
                    <img 
                        src={selectedUnion.datosBasicos.logo} 
                        alt="Logo" 
                        className="h-16 w-16 md:h-24 md:w-24 object-contain bg-white rounded-full border-4 border-neutral-800 p-1"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                )}
                {selectedUnion.nombre}
              </h1>
              <div className="flex flex-wrap gap-6 text-sm text-neutral-300 font-mono">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-500" />
                  <span className="font-bold text-red-500 uppercase">Conducción:</span> 
                  {selectedUnion.comisionDirectiva.find(m => m.cargo.toLowerCase().includes('general'))?.nombre || 'Secretariado General'}
                </div>
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-red-500" />
                  <a href={selectedUnion.datosBasicos.sitioWeb} target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">
                    Sitio Oficial
                  </a>
                </div>
              </div>
            </div>
            <div className="bg-neutral-950 px-4 py-2 border border-neutral-800">
               <span className="text-xs text-neutral-500 uppercase block text-center mb-1">Identificador</span>
               <span className="text-xl font-black text-white tracking-widest">{selectedUnion.slug ? selectedUnion.slug.toUpperCase() : 'SIN ID'}</span>
            </div>
          </div>
        </div>

        <div className="flex border-b border-neutral-800 mb-8 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveDetailTab('agenda')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeDetailTab === 'agenda' ? 'border-red-600 text-red-500 bg-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`}
          >
            <Megaphone className="w-4 h-4" /> Agenda de Lucha
          </button>
          <button 
            onClick={() => setActiveDetailTab('historial')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeDetailTab === 'historial' ? 'border-red-600 text-red-500 bg-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`}
          >
            <Clock className="w-4 h-4" /> Historial / Pasadas
          </button>
          <button 
            onClick={() => setActiveDetailTab('paritarias')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeDetailTab === 'paritarias' ? 'border-red-600 text-red-500 bg-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`}
          >
            <FileText className="w-4 h-4" /> Paritarias
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4 max-w-5xl">
          
          {/* 1. AGENDA DE LUCHA (FUTURO) */}
          {activeDetailTab === 'agenda' && (
             <div className="grid gap-6">
                <div className="bg-red-950/20 border border-red-900/30 p-4 mb-4 text-red-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4" /> Próximas Medidas y Eventos
                </div>
                {agendaActions.map(([uuid, accion]) => (
                    <div key={uuid} className="bg-neutral-900 p-6 border border-l-4 border-l-red-600 border-neutral-800 shadow-xl shadow-red-900/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-black px-3 py-1 uppercase tracking-widest">
                             EN AGENDA
                        </div>
                         <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-900/20 text-red-500 border border-red-900/30">
                                {getActionIcon(accion.tipo)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                     <span className="text-red-400 text-xs font-bold uppercase tracking-wider">
                                        {getTypeLabel(accion.tipo)}
                                     </span>
                                     <span className="text-neutral-600 text-xs">•</span>
                                     <span className="text-white text-xs font-mono font-bold flex items-center gap-1 bg-red-900/50 px-2 py-0.5 rounded-sm">
                                        <Calendar className="w-3 h-3" /> {accion.fecha}
                                     </span>
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 uppercase leading-none tracking-tight">{accion.titulo}</h3>
                                <p className="text-neutral-300 mb-4 leading-relaxed font-medium">{accion.descripcion}</p>
                                
                                <div className="flex flex-wrap items-center gap-4 text-sm border-t border-neutral-800 pt-3">
                                    <span className="text-neutral-400 font-bold bg-neutral-950 border border-neutral-800 px-2 py-1 text-xs uppercase">
                                        LUGAR: {accion.lugar}
                                    </span>
                                    {accion.fuente && (
                                        <a href={accion.fuente} target="_blank" rel="noreferrer" className="text-red-500 hover:underline text-xs font-bold uppercase flex items-center gap-1">
                                            Fuente Oficial <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {agendaActions.length === 0 && <p className="text-neutral-600 font-mono text-center py-12 border border-dashed border-neutral-800">No hay acciones programadas en agenda.</p>}
             </div>
          )}

          {/* 2. HISTORIAL (PASADO) */}
          {activeDetailTab === 'historial' && (
             <div className="grid gap-6">
                 <div className="bg-neutral-900 border border-neutral-800 p-4 mb-4 text-neutral-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Registro de Acciones Realizadas
                </div>
                {historialActions.map(([uuid, accion]) => (
                    <div key={uuid} className="bg-neutral-900 p-6 border border-neutral-800 opacity-90 hover:opacity-100 transition-opacity">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-neutral-800 text-neutral-400">
                                {getActionIcon(accion.tipo)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                     <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">
                                        {getTypeLabel(accion.tipo)}
                                     </span>
                                     <span className="text-neutral-600 text-xs">•</span>
                                     <span className="text-neutral-500 text-xs font-mono flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {accion.fecha}
                                     </span>
                                </div>
                                <h3 className="text-xl font-bold text-neutral-200 mb-2 uppercase leading-snug">{accion.titulo}</h3>
                                <p className="text-neutral-400 mb-4 leading-relaxed text-sm">{accion.descripcion}</p>
                                
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <span className="text-neutral-500 font-bold text-xs uppercase">
                                        LUGAR: {accion.lugar}
                                    </span>
                                    {accion.fuente && (
                                        <a href={accion.fuente} target="_blank" rel="noreferrer" className="text-neutral-600 hover:text-white text-xs font-bold uppercase flex items-center gap-1">
                                            Fuente <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {historialActions.length === 0 && <p className="text-neutral-600 font-mono text-center py-12 border border-dashed border-neutral-800">No hay historial reciente registrado.</p>}
             </div>
          )}

          {/* 3. PARITARIAS */}
          {activeDetailTab === 'paritarias' && (
            <div className="grid gap-6">
              {Object.entries((selectedUnion.paritarias || {}) as Record<string, AcuerdoParitario>).map(([uuid, acuerdo]) => (
                <div key={uuid} className="bg-neutral-900 p-8 border border-neutral-800 relative overflow-hidden group hover:border-green-900 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                     <FileText className="w-40 h-40 text-green-500" />
                  </div>
                  <div className="relative z-10">
                    <div className="inline-block bg-green-900/20 text-green-500 border border-green-900/40 px-3 py-1 text-xs font-bold uppercase mb-4 tracking-wider">
                      Acuerdo {acuerdo.periodo}
                    </div>
                    <div className="text-6xl font-black text-white mb-6 tracking-tighter">{acuerdo.porcentajeAumento}</div>
                    <div className="bg-neutral-950 p-6 border border-neutral-800 mb-6">
                         <p className="text-neutral-300 text-sm leading-relaxed font-mono">{acuerdo.detalleTexto}</p>
                    </div>
                    <div className="flex items-center gap-6 text-xs font-mono text-neutral-500 border-t border-neutral-800 pt-4">
                      <span className="flex items-center gap-2"><Clock className="w-3 h-3"/> FIRMA: {acuerdo.fechaFirma}</span>
                      <a href={acuerdo.enlaceFuente} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-400 hover:underline font-bold flex items-center gap-1">
                        VER DOCUMENTO OFICIAL <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
               {Object.keys(selectedUnion.paritarias || {}).length === 0 && <p className="text-neutral-600 font-mono text-center py-12 border border-dashed border-neutral-800">Sin información paritaria reciente.</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER MAIN DASHBOARD VIEW ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Inserted Header Widget in Dashboard if needed, but usually in Nav */}
      <div className="md:hidden mb-6 flex justify-end">
          <HeaderWidget />
      </div>

      <div className="mb-4"></div>

      {/* 3 MAIN SECTIONS NAV */}
      <div className="flex flex-col md:flex-row gap-4 mb-10 border-b border-neutral-800 pb-1">
          <button 
            onClick={() => setActiveMainTab('monitor')}
            className={`flex-1 py-6 px-4 border border-b-0 flex flex-col items-center justify-center gap-2 transition-all group ${activeMainTab === 'monitor' ? 'bg-red-700 border-red-700 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800'}`}
          >
              <AlertOctagon className={`w-8 h-8 ${activeMainTab === 'monitor' ? 'text-white' : 'text-red-600 group-hover:scale-110 transition-transform'}`} />
              <span className="font-black uppercase tracking-widest text-sm">1. Monitoreo Conflictividad</span>
          </button>

          <button 
             onClick={() => setActiveMainTab('sindicatos')}
             className={`flex-1 py-6 px-4 border border-b-0 flex flex-col items-center justify-center gap-2 transition-all group ${activeMainTab === 'sindicatos' ? 'bg-neutral-100 border-white text-neutral-900' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800'}`}
          >
              <LayoutGrid className={`w-8 h-8 ${activeMainTab === 'sindicatos' ? 'text-neutral-900' : 'text-neutral-400 group-hover:scale-110 transition-transform'}`} />
              <span className="font-black uppercase tracking-widest text-sm">2. Sindicatos</span>
          </button>

          <button 
             onClick={() => setActiveMainTab('noticias')}
             className={`flex-1 py-6 px-4 border border-b-0 flex flex-col items-center justify-center gap-2 transition-all group ${activeMainTab === 'noticias' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800'}`}
          >
              <Radio className={`w-8 h-8 ${activeMainTab === 'noticias' ? 'text-blue-500' : 'text-neutral-400 group-hover:scale-110 transition-transform'}`} />
              <span className="font-black uppercase tracking-widest text-sm">3. Cables de Noticias</span>
          </button>
      </div>

      <div className="min-h-[400px]">
          
          {/* SECCIÓN 1: MONITOREO DE CONFLICTIVIDAD */}
          {activeMainTab === 'monitor' && (
             <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* COLUMNA 1: ÚLTIMAS ACCIONES (PASADAS) */}
                <div className="bg-neutral-900 border border-neutral-800 p-0 flex flex-col h-full shadow-2xl">
                    <div className="bg-neutral-800 p-4 border-b border-neutral-700 flex items-center justify-between">
                         <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-5 h-5 text-neutral-400" /> Historial Reciente
                         </h3>
                         <span className="text-xs font-mono text-neutral-500">ÚLTIMOS REPORTES</span>
                    </div>
                    <div className="divide-y divide-neutral-800">
                        {pastActions.length > 0 ? (
                             pastActions.map((item, i) => (
                                <div key={i} className="p-4 hover:bg-neutral-800/50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="inline-block px-1.5 py-0.5 bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-black uppercase tracking-wider">
                                            {item.unionSlug}
                                        </span>
                                        <span className="text-neutral-500 text-xs font-mono">{item.action.fecha}</span>
                                    </div>
                                    <h4 className="text-white font-bold leading-tight uppercase mb-1">{item.action.titulo}</h4>
                                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                                        <span className="text-neutral-400 font-bold">{getTypeLabel(item.action.tipo)}</span>
                                        <span>•</span>
                                        <span>{item.action.lugar}</span>
                                    </div>
                                    {item.action.fuente && (
                                        <a href={item.action.fuente} target="_blank" rel="noreferrer" className="text-neutral-600 hover:text-red-500 text-[10px] uppercase font-bold flex items-center gap-1">
                                            Fuente <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                             ))
                        ) : (
                            <div className="p-12 text-center text-neutral-600 italic">No hay acciones recientes registradas.</div>
                        )}
                    </div>
                </div>

                {/* COLUMNA 2: PRÓXIMAS ACCIONES (FUTURAS) */}
                <div className="bg-neutral-900 border-2 border-red-900/50 p-0 flex flex-col h-full relative overflow-hidden shadow-2xl shadow-red-900/10">
                    <div className="absolute top-0 right-0 w-2 h-full bg-red-600"></div>
                    <div className="bg-red-950/30 p-4 border-b border-red-900/30 flex items-center justify-between">
                         <h3 className="text-lg font-black text-red-500 uppercase tracking-wider flex items-center gap-2">
                            <Megaphone className="w-5 h-5" /> Agenda de Lucha
                         </h3>
                         <span className="text-xs font-mono text-red-400 animate-pulse font-bold">EN CURSO / PRÓXIMO</span>
                    </div>
                    <div className="divide-y divide-red-900/20">
                         {upcomingActions.length > 0 ? (
                             upcomingActions.map((item, i) => (
                                <div key={i} className="p-4 bg-red-950/10 hover:bg-red-900/20 transition-colors relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="inline-block px-1.5 py-0.5 bg-red-900 text-red-100 text-[10px] font-black uppercase tracking-wider">
                                            {item.unionSlug}
                                        </span>
                                        <span className="text-red-400 text-xs font-mono font-bold">{item.action.fecha}</span>
                                    </div>
                                    <h4 className="text-white font-bold leading-tight uppercase mb-1">{item.action.titulo}</h4>
                                    <p className="text-neutral-400 text-sm mb-2 line-clamp-2">{item.action.descripcion}</p>
                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                        <span className="text-red-400 uppercase font-bold">{getTypeLabel(item.action.tipo)}</span>
                                        <span>•</span>
                                        <span>{item.action.lugar}</span>
                                    </div>
                                </div>
                             ))
                        ) : (
                            <div className="p-12 text-center text-neutral-600 italic">No hay medidas de fuerza programadas próximamente.</div>
                        )}
                    </div>
                </div>
             </div>
          )}

          {/* SECCIÓN 2: SINDICATOS */}
          {activeMainTab === 'sindicatos' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {unions.length === 0 ? (
                    <div className="text-center py-24 bg-neutral-900 border border-dashed border-neutral-800 rounded-none">
                    <h3 className="text-xl text-neutral-300 font-bold mb-2 uppercase">Sin datos en el sistema</h3>
                    <p className="text-neutral-500 text-sm">El personal de inteligencia debe cargar informes en la Sala de Situación.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {unions.map((union, idx) => (
                        <UnionCard key={idx} data={union} onSelect={setSelectedUnion} />
                        ))}
                    </div>
                )}
              </div>
          )}

          {/* SECCIÓN 3: NOTICIAS (RSS) */}
          {activeMainTab === 'noticias' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <NewsFeed 
                    news={news} 
                    loading={newsLoading} 
                    error={newsError}
                    onRefresh={onRefreshNews}
                  />
              </div>
          )}
      </div>
    </div>
  );
};

export default PublicView;