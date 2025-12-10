
import React, { useState, useRef, useEffect } from 'react';
import { generarContenidoSindical, analizarFuenteExterna, analizarNoticiasMasivas, chatWithDatabaseAgent, investigarComision, investigarParitarias, investigarAcciones, buscarLogos, UrlAnalysisResult, DEFAULT_PROMPTS } from '../services/geminiService';
import { SindicatoData, AccionGremial, AcuerdoParitario, NewsItem, ComisionMiembro, ChatMessage, AppConfig, CustomField, NewsSource } from '../types';
import { Bot, Loader2, Save, Trash2, Plus, Search, AlertTriangle, Link, FileJson, Radio, CheckCircle, XCircle, User, UserPlus, X, RefreshCw, ArrowUpCircle, Layers, MessageSquare, Send, Sparkles, Image as ImageIcon, ExternalLink, Globe, Settings, Edit, Database, PlayCircle, Check, Key, Lock, Rss } from 'lucide-react';

interface EditorViewProps {
  existingUnions: SindicatoData[];
  onSave: (data: SindicatoData) => void;
  onDelete: (slug: string) => void;
  news: NewsItem[];
  config: AppConfig | null;
  onConfigUpdate: (config: AppConfig) => void;
}

// Fallback UUID generator for non-secure contexts
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const EditorView: React.FC<EditorViewProps> = ({ existingUnions, onSave, onDelete, news, config, onConfigUpdate }) => {
  // New Investigation State
  const [inputName, setInputName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  
  // URL Analysis State
  const [inputUrl, setInputUrl] = useState('');
  const [analyzingUrl, setAnalyzingUrl] = useState(false);
  const [urlMessage, setUrlMessage] = useState<string | null>(null);

  // Logo Search State
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [searchingLogos, setSearchingLogos] = useState(false);
  const [logoResults, setLogoResults] = useState<string[]>([]);
  const [logoSearchTerm, setLogoSearchTerm] = useState('');
  const [showBrowser, setShowBrowser] = useState(false); 

  // Prompt Config State
  const [promptModalOpen, setPromptModalOpen] = useState<{type: keyof AppConfig['prompts'], title: string} | null>(null);
  const [tempPrompt, setTempPrompt] = useState('');

  // Global Config State (News, Schema, API)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configTab, setConfigTab] = useState<'news' | 'fields' | 'system'>('news');
  const [tempNews, setTempNews] = useState<NewsSource[]>([]);
  
  // State for ADDING a new source specifically (UX improvement)
  const [newSourceEntry, setNewSourceEntry] = useState<NewsSource>({ name: '', url: '' });

  const [tempFields, setTempFields] = useState<CustomField[]>([]);
  const [tempApiKey, setTempApiKey] = useState('');
  const [testingFeedUrl, setTestingFeedUrl] = useState<string | null>(null); // For UI feedback
  const [feedTestResult, setFeedTestResult] = useState<string | null>(null);

  // Batch News Processing State
  const [analyzingBatch, setAnalyzingBatch] = useState(false);
  const [batchResults, setBatchResults] = useState<UrlAnalysisResult[]>([]);

  // Editor State
  const [editableData, setEditableData] = useState<SindicatoData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<{slug: string, name: string} | null>(null);

  // Bulk Update State
  const [bulkProgress, setBulkProgress] = useState<{current: number, total: number, currentName: string} | null>(null);

  // CHAT STATE
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  // Init logo search term when modal opens
  useEffect(() => {
      if (isLogoModalOpen && editableData) {
          setLogoSearchTerm(`${editableData.nombre} ${editableData.slug} logo`);
          setShowBrowser(false); // Reset to AI results on open
          handleSearchLogos(true); // Auto search on open
      }
  }, [isLogoModalOpen]);

  // --- CONFIG HANDLERS ---
  const handleOpenPromptModal = (e: React.MouseEvent, type: keyof AppConfig['prompts'], title: string) => {
      e.preventDefault();
      e.stopPropagation(); // Stop bubbling
      
      // Load current or default
      let current = config?.prompts?.[type];
      
      if (!current) {
           // Map to defaults if nothing saved yet
           if (type === 'investigation') current = DEFAULT_PROMPTS.INVESTIGATION;
           else if (type === 'linkAnalysis') current = DEFAULT_PROMPTS.LINK_ANALYSIS;
           else if (type === 'newsAnalysis') current = DEFAULT_PROMPTS.NEWS_ANALYSIS;
           else if (type === 'chatAgent') current = DEFAULT_PROMPTS.CHAT_AGENT;
           else current = ''; // Granular prompts might be empty by default
      }
      setTempPrompt(current);
      setPromptModalOpen({ type, title });
  };

  const handleSavePrompt = () => {
      if (!promptModalOpen) return;
      // If config doesn't exist yet, create structure
      const currentConfig = config || { prompts: {}, newsSources: [], customFields: [] };
      
      const newConfig = { 
          ...currentConfig, 
          prompts: { ...currentConfig.prompts, [promptModalOpen.type]: tempPrompt } 
      };
      onConfigUpdate(newConfig);
      setPromptModalOpen(null);
  };

  const handleOpenGlobalConfig = () => {
      const currentNews = config?.newsSources || [];
      const currentFields = config?.customFields || [];
      const currentApiKey = config?.geminiApiKey || '';
      
      setTempNews([...currentNews]);
      setTempFields([...currentFields]);
      setTempApiKey(currentApiKey);
      setNewSourceEntry({ name: '', url: '' }); // Reset new entry form
      
      setFeedTestResult(null);
      setIsConfigModalOpen(true);
  };

  const handleSaveGlobalConfig = () => {
      const currentConfig = config || { prompts: {}, newsSources: [], customFields: [] };
      onConfigUpdate({
          ...currentConfig,
          newsSources: tempNews,
          customFields: tempFields,
          geminiApiKey: tempApiKey // Save API key to DB
      });
      setIsConfigModalOpen(false);
  };

  // UX Improvement: Add separate function to validate and push new source
  const handleAddNewSource = () => {
      if (!newSourceEntry.name.trim() || !newSourceEntry.url.trim()) return;
      if (!newSourceEntry.url.startsWith('http')) {
          setFeedTestResult('❌ La URL debe comenzar con http:// o https://');
          return;
      }
      setTempNews([...tempNews, newSourceEntry]);
      setNewSourceEntry({ name: '', url: '' }); // Clear inputs
      setFeedTestResult(null);
  };

  const testFeedConnection = async (url: string) => {
      if (!url) return;
      setTestingFeedUrl(url);
      setFeedTestResult(null);
      try {
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
          const data = await res.json();
          if (data.status === 'ok') {
              setFeedTestResult(`✅ OK! Detectados ${data.items.length} artículos.`);
          } else {
              setFeedTestResult('❌ Error: El link no parece un RSS válido.');
          }
      } catch (e) {
          setFeedTestResult('❌ Error de conexión al probar.');
      } finally {
          setTestingFeedUrl(null);
      }
  };
  
  const addCustomField = () => {
      setTempFields([...tempFields, { id: generateUUID(), key: 'nuevo_campo', label: 'Nuevo Campo', section: 'datosBasicos', type: 'text' }]);
  }

  // --- GENERATE / INVESTIGATE ---
  const handleGenerate = async () => {
    if (!inputName.trim()) return;
    setLoading(true);
    setError(null);
    setEditableData(null); 
    setBatchResults([]); 

    try {
      // Pass stored API Key
      const data = await generarContenidoSindical(inputName, config?.prompts?.investigation, config?.geminiApiKey);
      setEditableData(data);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servicio de IA.");
    } finally {
      setLoading(false);
    }
  };

  const performSmartUpdate = async (unionData: SindicatoData) => {
      setLoading(true);
      setError(null);
      
      try {
          const freshData = await generarContenidoSindical(unionData.nombre, config?.prompts?.investigation, config?.geminiApiKey);
          const mergedData = {
              ...unionData,
              datosBasicos: freshData.datosBasicos,
              comisionDirectiva: freshData.comisionDirectiva,
              paritarias: { ...unionData.paritarias, ...freshData.paritarias },
              acciones: unionData.acciones
          };

          setEditableData(mergedData);
          setUrlMessage(`Informe de ${unionData.nombre} actualizado. Revise y guarde.`);

      } catch (err: any) {
          setError("Error al investigar datos: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleReInvestigateCurrent = () => {
      if (!editableData) return;
      performSmartUpdate(editableData);
  }

  // --- PARTIAL SECTION UPDATES ---
  const handleUpdateComision = async () => {
      if (!editableData) return;
      setLoadingSection('comision');
      try {
          const newComision = await investigarComision(editableData.nombre, config?.prompts?.comision, config?.geminiApiKey);
          setEditableData({ ...editableData, comisionDirectiva: newComision });
          setUrlMessage("Comisión Directiva actualizada con inteligencia artificial.");
      } catch (e: any) {
          setError("Error actualizando Comisión: " + e.message);
      } finally {
          setLoadingSection(null);
      }
  };

  const handleUpdateParitarias = async () => {
      if (!editableData) return;
      setLoadingSection('paritarias');
      try {
          const newParitarias = await investigarParitarias(editableData.nombre, config?.prompts?.paritarias, config?.geminiApiKey);
          setEditableData({ ...editableData, paritarias: { ...editableData.paritarias, ...newParitarias } });
          setUrlMessage("Análisis de Paritarias completado.");
      } catch (e: any) {
          setError("Error actualizando Paritarias: " + e.message);
      } finally {
          setLoadingSection(null);
      }
  };

  const handleUpdateAcciones = async () => {
      if (!editableData) return;
      setLoadingSection('acciones');
      try {
          const newAcciones = await investigarAcciones(editableData.nombre, config?.prompts?.acciones, config?.geminiApiKey);
          const combinedAcciones = { ...editableData.acciones };
          let addedCount = 0;
          
          Object.entries(newAcciones).forEach(([uuid, accion]) => {
              // Check for duplicates roughly
              const exists = Object.values(combinedAcciones).some(
                  (a: any) => a.fecha === (accion as any).fecha && a.tipo === (accion as any).tipo
              );
              if (!exists) {
                  combinedAcciones[generateUUID()] = accion as AccionGremial;
                  addedCount++;
              }
          });

          setEditableData({ ...editableData, acciones: combinedAcciones });
          setUrlMessage(`Búsqueda de acciones finalizada. Se agregaron ${addedCount} eventos nuevos.`);
      } catch (e: any) {
          setError("Error buscando acciones: " + e.message);
      } finally {
          setLoadingSection(null);
      }
  };

  // --- LOGO SEARCH ---
  const handleOpenLogoModal = () => {
      setIsLogoModalOpen(true);
  }

  const handleSearchLogos = async (isAuto = false) => {
      if (!editableData && !isAuto) return;
      setSearchingLogos(true);
      setShowBrowser(false); 
      setLogoResults([]);
      const termName = isAuto ? editableData!.nombre : logoSearchTerm;
      const termSlug = isAuto ? editableData!.slug : '';

      try {
          const results = await buscarLogos(termName, termSlug, config?.geminiApiKey);
          setLogoResults(results);
      } catch (e: any) {
          console.warn("Logo search UI error", e);
      } finally {
          setSearchingLogos(false);
      }
  };

  const handleSelectLogo = (url: string) => {
      updateField('datosBasicos.logo', url);
      setIsLogoModalOpen(false);
  }

  // --- BULK UPDATE ---
  const handleBulkUpdateAll = async () => {
      if (existingUnions.length === 0) return;
      setBulkProgress({ current: 0, total: existingUnions.length, currentName: 'Iniciando...' });
      setEditableData(null); 

      for (let i = 0; i < existingUnions.length; i++) {
          const union = existingUnions[i];
          setBulkProgress({ current: i + 1, total: existingUnions.length, currentName: union.nombre });

          try {
              const freshData = await generarContenidoSindical(union.nombre, config?.prompts?.investigation, config?.geminiApiKey);
              const mergedData = {
                  ...union,
                  datosBasicos: freshData.datosBasicos,
                  comisionDirectiva: freshData.comisionDirectiva,
                  paritarias: { ...union.paritarias, ...freshData.paritarias },
                  acciones: union.acciones 
              };
              await Promise.resolve(onSave(mergedData));
              await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (e) {
              console.error(`Error updating ${union.nombre}`, e);
          }
      }
      setBulkProgress(null);
      setUrlMessage("Actualización masiva completada.");
  };

  // --- URL ANALYSIS ---
  const handleUrlAnalysis = async () => {
    if (!inputUrl.trim()) return;
    setAnalyzingUrl(true);
    setUrlMessage(null);
    setError(null);
    setBatchResults([]);

    try {
        const dbContext = existingUnions.map(u => ({ slug: u.slug, nombre: u.nombre }));
        const result: UrlAnalysisResult = await analizarFuenteExterna(inputUrl, dbContext, config?.prompts?.linkAnalysis, config?.geminiApiKey);
        mergeAndEdit(result);
    } catch (err: any) {
        setError(err.message || "No se pudo extraer información del enlace.");
    } finally {
        setAnalyzingUrl(false);
    }
  };

  // --- BATCH CABLES ---
  const handleProcessCables = async () => {
      if (news.length === 0) {
          setError("No hay cables de noticias cargados para analizar.");
          return;
      }
      setAnalyzingBatch(true);
      setError(null);
      setBatchResults([]);
      setEditableData(null); 

      try {
          const results = await analizarNoticiasMasivas(news, config?.prompts?.newsAnalysis, config?.geminiApiKey);
          if (results.length === 0) {
              setUrlMessage("El análisis finalizó pero no se detectaron acciones sindicales relevantes.");
          } else {
              setBatchResults(results);
          }
      } catch (err: any) {
          setError(err.message || "Error al procesar el lote de cables.");
      } finally {
          setAnalyzingBatch(false);
      }
  };

  const mergeAndEdit = (result: UrlAnalysisResult) => {
        const existingIndex = existingUnions.findIndex(u => 
            u.slug === result.sindicatoMatch.slug || 
            u.nombre.toLowerCase().includes(result.sindicatoMatch.nombre.toLowerCase())
        );
        let unionToEdit: SindicatoData;

        if (existingIndex >= 0) {
            unionToEdit = JSON.parse(JSON.stringify(existingUnions[existingIndex]));
            setUrlMessage(`Sindicato detectado en base: ${unionToEdit.nombre}. Actualizando con nuevos datos.`);
        } else {
            unionToEdit = {
                nombre: result.sindicatoMatch.nombre,
                slug: result.sindicatoMatch.slug,
                comisionDirectiva: [],
                datosBasicos: { sedePrincipal: "A completar", sitioWeb: "", logo: "" },
                acciones: {},
                paritarias: {}
            };
            setUrlMessage(`Nuevo sindicato detectado: ${unionToEdit.nombre}. Registro creado.`);
        }

        const addAction = (accion: AccionGremial) => {
             const uuid = generateUUID();
             unionToEdit.acciones = unionToEdit.acciones || {};
             const exists = Object.values(unionToEdit.acciones).some(a => 
                 a.fecha === accion.fecha && a.titulo === accion.titulo
             );
             if (!exists) {
                 unionToEdit.acciones[uuid] = accion;
             }
        };

        const addParitaria = (paritaria: AcuerdoParitario) => {
             const uuid = generateUUID();
             unionToEdit.paritarias = unionToEdit.paritarias || {};
             unionToEdit.paritarias[uuid] = paritaria;
        };

        if (result.tipoDetectado === 'multi-accion' && Array.isArray(result.data)) {
            (result.data as AccionGremial[]).forEach(item => addAction(item));
            setUrlMessage(`Se extrajeron ${result.data.length} acciones distintas del enlace.`);
        } else if (result.tipoDetectado === 'accion') {
            addAction(result.data as AccionGremial);
        } else if (result.tipoDetectado === 'paritaria') {
            addParitaria(result.data as AcuerdoParitario);
        }

        setEditableData(unionToEdit);
        setInputUrl(''); 
  }

  const handleAcceptSuggestion = async (result: UrlAnalysisResult) => {
      setBatchResults(prev => prev.filter(r => r !== result));
      const exists = existingUnions.find(u => u.slug === result.sindicatoMatch.slug);

      if (exists) {
          mergeAndEdit(result);
      } else {
          setLoading(true);
          setUrlMessage(`Sindicato nuevo (${result.sindicatoMatch.nombre}). Iniciando investigación profunda...`);
          try {
              const baseData = await generarContenidoSindical(result.sindicatoMatch.nombre, config?.prompts?.investigation, config?.geminiApiKey);
              const uuid = generateUUID();
              if (result.tipoDetectado === 'accion') {
                  baseData.acciones[uuid] = result.data as AccionGremial;
              } else if (result.tipoDetectado === 'paritaria') {
                  baseData.paritarias[uuid] = result.data as AcuerdoParitario;
              }
              setEditableData(baseData);
              setUrlMessage(`Investigación completada para ${baseData.nombre}. Registro creado.`);
          } catch (e: any) {
              console.error("Auto-investigation failed", e);
              mergeAndEdit(result);
              setError("No se pudo completar la investigación automática, se creó un registro básico.");
          } finally {
              setLoading(false);
          }
      }
  };

  const handleApprove = () => {
    if (editableData) {
      onSave(editableData);
      setEditableData(null); 
      setUrlMessage(null);
      setLogoResults([]);
    }
  };

  // --- DELETE LOGIC ---
  const handleDeleteTrigger = (slug: string, name: string) => {
      setDeleteTarget({ slug, name });
  }

  const confirmDelete = () => {
      if (deleteTarget) {
          onDelete(deleteTarget.slug);
          if (editableData && editableData.slug === deleteTarget.slug) {
              setEditableData(null);
          }
          setDeleteTarget(null);
      }
  }

  const handleSelectExisting = (union: SindicatoData) => {
    if (bulkProgress) return; 
    setEditableData(JSON.parse(JSON.stringify(union)));
    setBatchResults([]);
    setLogoResults([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setError(null);
    setUrlMessage(null);
  };

  const handleDownloadDb = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(existingUnions, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "base.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  }

  // --- CHAT LOGIC ---
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = {
        id: generateUUID(),
        role: 'user',
        text: chatInput,
        timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
        const { reply, action } = await chatWithDatabaseAgent(userMsg.text, existingUnions, config?.prompts?.chatAgent, config?.geminiApiKey);
        
        if (action && action.type === 'UPDATE_UNION') {
            const targetUnion = existingUnions.find(u => u.slug === action.slug);
            if (targetUnion) {
                const updatedUnion = { ...targetUnion };
                
                if (action.field === 'comisionDirectiva') {
                    updatedUnion.comisionDirectiva = action.value;
                } else if (action.field.includes('.')) {
                    const parts = action.field.split('.');
                    if (parts[0] === 'datosBasicos') {
                        updatedUnion.datosBasicos = { ...updatedUnion.datosBasicos, [parts[1]]: action.value };
                    }
                } else {
                     (updatedUnion as any)[action.field] = action.value;
                }

                onSave(updatedUnion); 
                
                setChatMessages(prev => [...prev, {
                    id: generateUUID(),
                    role: 'system',
                    text: `ACCIÓN EJECUTADA: ${action.explanation}`,
                    timestamp: new Date(),
                    isAction: true
                }]);
            } else {
                 setChatMessages(prev => [...prev, {
                    id: generateUUID(),
                    role: 'system',
                    text: `ERROR: No encontré el sindicato con slug '${action.slug}' para actualizar.`,
                    timestamp: new Date()
                }]);
            }
        }

        setChatMessages(prev => [...prev, {
            id: generateUUID(),
            role: 'model',
            text: reply,
            timestamp: new Date()
        }]);

    } catch (e) {
        setChatMessages(prev => [...prev, {
            id: generateUUID(),
            role: 'system',
            text: "Error de conexión con el agente.",
            timestamp: new Date()
        }]);
    } finally {
        setChatLoading(false);
    }
  };

  // --- EDITING HELPERS ---
  const updateField = (path: string, value: any) => {
    if (!editableData) return;
    const newData = { ...editableData };
    const parts = path.split('.');
    let current: any = newData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setEditableData(newData);
  };

  const removeAccion = (e: React.MouseEvent, uuid: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editableData) return;
    const newAcciones = { ...editableData.acciones };
    delete newAcciones[uuid];
    setEditableData({ ...editableData, acciones: newAcciones });
  };

  const addEmptyAccion = () => {
    if (!editableData) return;
    const uuid = generateUUID();
    const newAccion: AccionGremial = {
        titulo: "Nueva Acción",
        tipo: "reunion",
        fecha: new Date().toISOString().split('T')[0],
        lugar: "A definir",
        fuente: "",
        descripcion: ""
    };
    setEditableData({
        ...editableData,
        acciones: { ...editableData.acciones, [uuid]: newAccion }
    });
  };

  const removeParitaria = (e: React.MouseEvent, uuid: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editableData) return;
    const newParitarias = { ...editableData.paritarias };
    delete newParitarias[uuid];
    setEditableData({ ...editableData, paritarias: newParitarias });
  };

  const addEmptyParitaria = () => {
      if (!editableData) return;
      const uuid = generateUUID();
      const newParitaria: AcuerdoParitario = {
          periodo: new Date().getFullYear().toString(),
          porcentajeAumento: "0%",
          fechaFirma: new Date().toISOString().split('T')[0],
          detalleTexto: "",
          enlaceFuente: ""
      };
      setEditableData({
          ...editableData,
          paritarias: { ...editableData.paritarias, [uuid]: newParitaria}
      });
  }

  const addMember = () => {
      if (!editableData) return;
      const newMember: ComisionMiembro = { nombre: '', cargo: '' };
      setEditableData({
          ...editableData,
          comisionDirectiva: [...(editableData.comisionDirectiva || []), newMember]
      });
  };

  const removeMember = (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (!editableData) return;
      const current = editableData.comisionDirectiva || [];
      const newMembers = [...current];
      newMembers.splice(index, 1);
      setEditableData({ ...editableData, comisionDirectiva: newMembers });
  };

  const updateMember = (index: number, field: keyof ComisionMiembro, value: string) => {
      if (!editableData) return;
      const newMembers = [...editableData.comisionDirectiva];
      newMembers[index] = { ...newMembers[index], [field]: value };
      setEditableData({ ...editableData, comisionDirectiva: newMembers });
  };

  const filteredUnions = existingUnions.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.slug.includes(searchTerm.toLowerCase())
  );
  
  // Custom Field Renderer
  const renderCustomFields = (section: CustomField['section'], parentPath: string) => {
      if (!config || !config.customFields) return null;
      return config.customFields
        .filter(f => f.section === section)
        .map(field => {
            const path = parentPath ? `${parentPath}.${field.key}` : field.key;
            // Get value helper
            const getValue = () => {
                if (!editableData) return '';
                if (parentPath === 'root') return editableData[field.key] || '';
                
                // For nested paths
                const parts = path.split('.');
                let current: any = editableData;
                for (const p of parts) {
                    if (current[p] === undefined) return '';
                    current = current[p];
                }
                return current;
            };

            return (
                <div key={field.id} className="mt-2">
                    <label className="label-helper text-purple-400">{field.label} (Custom)</label>
                    {field.type === 'textarea' ? (
                        <textarea className="input-dark h-20 resize-none" value={getValue()} onChange={(e) => updateField(path, e.target.value)} />
                    ) : (
                        <input type={field.type} className="input-dark" value={getValue()} onChange={(e) => updateField(path, e.target.value)} />
                    )}
                </div>
            );
        });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-100px)] relative">
      
      {/* --- MODALS (MOVED TO TOP LEVEL TO FIX Z-INDEX) --- */}
      
      {/* PROMPT EDITOR MODAL */}
      {promptModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-neutral-900 border border-neutral-700 w-full max-w-3xl flex flex-col shadow-2xl rounded-lg h-[80vh]">
                  <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
                      <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
                          <Settings className="w-5 h-5 text-orange-500" />
                          Configurar Prompt: {promptModalOpen.title}
                      </div>
                      <button onClick={() => setPromptModalOpen(null)} className="text-neutral-500 hover:text-white">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="flex-1 p-4 bg-neutral-900 overflow-hidden flex flex-col">
                      <div className="bg-orange-900/10 border border-orange-900/30 p-3 mb-4 text-xs text-orange-300">
                          <AlertTriangle className="w-3 h-3 inline mr-2" />
                          Precaución: Modificar las instrucciones del sistema puede alterar drásticamente el comportamiento de la IA.
                      </div>
                      <textarea 
                          className="flex-1 w-full bg-neutral-950 border border-neutral-800 p-4 text-sm font-mono text-green-400 focus:outline-none focus:border-orange-500 resize-none"
                          value={tempPrompt}
                          onChange={(e) => setTempPrompt(e.target.value)}
                      />
                  </div>
                  <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-2">
                      <button onClick={() => setPromptModalOpen(null)} className="px-4 py-2 text-neutral-400 hover:text-white text-xs font-bold uppercase">Cancelar</button>
                      <button onClick={handleSavePrompt} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase flex items-center gap-2">
                          <Save className="w-4 h-4" /> Guardar Prompt
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* GLOBAL CONFIG MODAL (News & Schema & API) */}
      {isConfigModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-neutral-900 border border-neutral-700 w-full max-w-4xl flex flex-col shadow-2xl rounded-lg h-[80vh]">
                   <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
                      <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
                          <Database className="w-5 h-5 text-purple-500" />
                          Configuración Global
                      </div>
                      <button onClick={() => setIsConfigModalOpen(false)} className="text-neutral-500 hover:text-white">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="flex border-b border-neutral-800">
                      <button 
                        onClick={() => setConfigTab('news')}
                        className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${configTab === 'news' ? 'border-purple-500 text-purple-400 bg-purple-900/10' : 'border-transparent text-neutral-500 hover:bg-neutral-800'}`}
                      >
                          Fuentes de Noticias
                      </button>
                      <button 
                        onClick={() => setConfigTab('fields')}
                        className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${configTab === 'fields' ? 'border-purple-500 text-purple-400 bg-purple-900/10' : 'border-transparent text-neutral-500 hover:bg-neutral-800'}`}
                      >
                          Campos Personalizados
                      </button>
                      <button 
                        onClick={() => setConfigTab('system')}
                        className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${configTab === 'system' ? 'border-purple-500 text-purple-400 bg-purple-900/10' : 'border-transparent text-neutral-500 hover:bg-neutral-800'}`}
                      >
                          Sistema / API
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/50">
                      {configTab === 'news' && (
                          <div className="space-y-6">
                              
                              {/* --- LISTA DE FUENTES EXISTENTES --- */}
                              <div>
                                  <h4 className="text-purple-400 font-bold uppercase text-xs mb-3 flex items-center gap-2">
                                      <Rss className="w-4 h-4" /> Fuentes Activas ({tempNews.length})
                                  </h4>
                                  <div className="space-y-2">
                                      {tempNews.length === 0 && <p className="text-neutral-500 text-sm italic">No hay fuentes configuradas.</p>}
                                      {tempNews.map((source, idx) => (
                                          <div key={idx} className="flex flex-col md:flex-row gap-2 items-start md:items-center bg-neutral-900 p-2 border border-neutral-800 rounded">
                                              <input 
                                                  className="input-dark w-full md:w-1/4 text-xs font-bold text-white" 
                                                  placeholder="Nombre Fuente" 
                                                  value={source.name} 
                                                  onChange={(e) => {
                                                      const n = [...tempNews];
                                                      n[idx].name = e.target.value;
                                                      setTempNews(n);
                                                  }}
                                              />
                                              <div className="flex-1 flex w-full gap-2">
                                                  <input 
                                                      className="input-dark flex-1 text-xs text-neutral-400" 
                                                      placeholder="URL RSS Feed" 
                                                      value={source.url} 
                                                      onChange={(e) => {
                                                          const n = [...tempNews];
                                                          n[idx].url = e.target.value;
                                                          setTempNews(n);
                                                      }}
                                                  />
                                                  <button 
                                                    onClick={() => setTempNews(tempNews.filter((_, i) => i !== idx))}
                                                    className="p-2 text-neutral-500 hover:text-red-500 hover:bg-neutral-800 border border-transparent hover:border-neutral-700"
                                                    title="Eliminar Fuente"
                                                  >
                                                      <Trash2 className="w-4 h-4" />
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              {/* --- AGREGAR NUEVA FUENTE --- */}
                              <div className="bg-neutral-900 border border-purple-900/30 p-4 rounded-lg mt-6">
                                  <h4 className="text-white font-bold uppercase text-xs mb-3 flex items-center gap-2">
                                      <Plus className="w-4 h-4 text-green-500" /> Agregar Nueva Fuente
                                  </h4>
                                  
                                  <div className="bg-blue-900/10 border-l-2 border-blue-500 p-3 mb-4 text-xs text-blue-200 leading-relaxed">
                                      <strong>IMPORTANTE:</strong> Debe ingresar la dirección del <strong>FEED RSS</strong> (generalmente termina en .xml o /feed), NO la dirección de la página web principal.
                                      <br/><span className="opacity-70">Ejemplo correcto: https://www.infogremiales.com.ar/feed/</span>
                                      <br/><span className="opacity-70">Ejemplo incorrecto: https://www.infogremiales.com.ar/</span>
                                  </div>

                                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                                      <div>
                                          <label className="label-helper">Nombre del Medio</label>
                                          <input 
                                              className="input-dark" 
                                              placeholder="Ej: InfoGremiales"
                                              value={newSourceEntry.name}
                                              onChange={(e) => setNewSourceEntry({...newSourceEntry, name: e.target.value})}
                                          />
                                      </div>
                                      <div>
                                          <label className="label-helper">URL del RSS / FEED</label>
                                          <div className="flex gap-2">
                                              <input 
                                                  className="input-dark" 
                                                  placeholder="https://sitio.com/feed"
                                                  value={newSourceEntry.url}
                                                  onChange={(e) => setNewSourceEntry({...newSourceEntry, url: e.target.value})}
                                              />
                                               <button
                                                  onClick={() => testFeedConnection(newSourceEntry.url)}
                                                  disabled={!!testingFeedUrl || !newSourceEntry.url}
                                                  className="px-3 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 text-xs font-bold uppercase disabled:opacity-50"
                                                  title="Probar Conexión RSS"
                                              >
                                                  {testingFeedUrl === newSourceEntry.url ? <Loader2 className="w-4 h-4 animate-spin"/> : "PROBAR"}
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  {feedTestResult && (
                                      <div className={`mb-4 p-2 text-xs font-bold border ${feedTestResult.includes('OK') ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-red-900/20 border-red-900/50 text-red-400'} flex items-center gap-2`}>
                                          <PlayCircle className="w-4 h-4" /> {feedTestResult}
                                      </div>
                                  )}

                                  <button 
                                      onClick={handleAddNewSource}
                                      disabled={!newSourceEntry.name || !newSourceEntry.url}
                                      className="w-full py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                      Agregar a la Lista
                                  </button>
                              </div>
                          </div>
                      )}

                      {configTab === 'fields' && (
                          <div className="space-y-4">
                              <p className="text-sm text-neutral-400 mb-4">Agrega campos extra a la base de datos. Estos aparecerán en el editor.</p>
                              <div className="grid grid-cols-12 gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2 px-2">
                                  <div className="col-span-3">Identificador (Key)</div>
                                  <div className="col-span-3">Etiqueta Visible</div>
                                  <div className="col-span-3">Sección</div>
                                  <div className="col-span-2">Tipo</div>
                                  <div className="col-span-1"></div>
                              </div>
                              {tempFields.map((field, idx) => (
                                  <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-neutral-900 p-2 border border-neutral-800">
                                      <div className="col-span-3">
                                          <input className="input-dark text-xs" value={field.key} onChange={(e) => {
                                              const f = [...tempFields];
                                              f[idx].key = e.target.value.toLowerCase().replace(/\s/g, '_');
                                              setTempFields(f);
                                          }} placeholder="ej: cantidad_afiliados"/>
                                      </div>
                                      <div className="col-span-3">
                                          <input className="input-dark text-xs" value={field.label} onChange={(e) => {
                                              const f = [...tempFields];
                                              f[idx].label = e.target.value;
                                              setTempFields(f);
                                          }} placeholder="Ej: Nro. Afiliados"/>
                                      </div>
                                      <div className="col-span-3">
                                          <select className="input-dark text-xs" value={field.section} onChange={(e) => {
                                              const f = [...tempFields];
                                              f[idx].section = e.target.value as any;
                                              setTempFields(f);
                                          }}>
                                              <option value="datosBasicos">Datos Básicos</option>
                                              <option value="acciones">Acciones</option>
                                              <option value="paritarias">Paritarias</option>
                                          </select>
                                      </div>
                                      <div className="col-span-2">
                                          <select className="input-dark text-xs" value={field.type} onChange={(e) => {
                                              const f = [...tempFields];
                                              f[idx].type = e.target.value as any;
                                              setTempFields(f);
                                          }}>
                                              <option value="text">Texto</option>
                                              <option value="number">Número</option>
                                              <option value="date">Fecha</option>
                                              <option value="textarea">Área Texto</option>
                                          </select>
                                      </div>
                                      <div className="col-span-1 flex justify-center">
                                          <button onClick={() => setTempFields(tempFields.filter((_, i) => i !== idx))} className="text-neutral-500 hover:text-red-500">
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>
                              ))}
                              <button onClick={addCustomField} className="text-xs bg-purple-900/20 text-purple-400 border border-purple-900/50 px-4 py-2 uppercase font-bold hover:bg-purple-900/40 flex items-center gap-2">
                                  <Plus className="w-3 h-3" /> Nuevo Campo
                              </button>
                          </div>
                      )}

                      {configTab === 'system' && (
                         <div className="space-y-6">
                            <div className="bg-red-900/10 border border-red-900/30 p-4 rounded">
                                <h4 className="text-red-400 font-bold uppercase text-xs mb-2 flex items-center gap-2">
                                    <Key className="w-4 h-4" /> API KEY de Gemini (Google AI)
                                </h4>
                                <p className="text-neutral-400 text-sm mb-4">
                                    Guarda tu clave de API aquí para evitar configurarla en variables de entorno (GitHub Secrets/Vercel/Netlify).
                                    Esta clave se almacenará de forma segura en la base de datos del sistema.
                                </p>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                        <input 
                                            type="password"
                                            className="input-dark pl-9 font-mono"
                                            placeholder="Pegar API Key aquí (AIza...)"
                                            value={tempApiKey}
                                            onChange={(e) => setTempApiKey(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-neutral-600 mt-2">
                                    Si dejas esto vacío, el sistema intentará usar la variable de entorno <code>VITE_API_KEY</code>.
                                </p>
                            </div>
                         </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-2">
                      <button onClick={() => setIsConfigModalOpen(false)} className="px-4 py-2 text-neutral-400 hover:text-white text-xs font-bold uppercase">Cancelar</button>
                      <button onClick={handleSaveGlobalConfig} className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold uppercase flex items-center gap-2 shadow-lg shadow-purple-900/20">
                          <Save className="w-4 h-4" /> Guardar & Recargar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* DELETE MODAL (Same as before) */}
      {deleteTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-neutral-900 border-2 border-red-600 p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
                  <h3 className="text-xl font-black text-white uppercase mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-red-600" /> Confirmar Eliminación
                  </h3>
                  <p className="text-neutral-400 mb-6 text-sm">
                      ¿Está seguro de eliminar a <span className="text-white font-bold">{deleteTarget.name}</span>? 
                      <br/>Esta acción eliminará todos los datos de la base de datos permanentemente.
                  </p>
                  <div className="flex gap-3 justify-end">
                      <button 
                          type="button"
                          onClick={() => setDeleteTarget(null)}
                          className="px-4 py-2 bg-neutral-800 text-white font-bold uppercase text-xs hover:bg-neutral-700 transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          type="button"
                          onClick={confirmDelete}
                          className="px-4 py-2 bg-red-600 text-white font-bold uppercase text-xs hover:bg-red-700 shadow-lg shadow-red-900/50 transition-colors flex items-center gap-2"
                      >
                          <Trash2 className="w-3 h-3" /> Sí, Eliminar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* LOGO SEARCH MODAL (Same as before) */}
      {isLogoModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-neutral-900 border border-neutral-700 w-full max-w-4xl h-[85vh] shadow-2xl relative flex flex-col rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
                      <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Search className="w-5 h-5 text-blue-500" /> Buscador de Logos
                      </h3>
                      <button onClick={() => setIsLogoModalOpen(false)} className="text-neutral-500 hover:text-white p-2">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex flex-col md:flex-row gap-3">
                      <div className="flex-1 flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-neutral-950 border border-neutral-700 text-white p-3 focus:border-blue-500 outline-none font-mono text-sm"
                            value={logoSearchTerm}
                            onChange={(e) => setLogoSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchLogos(false)}
                            placeholder="Nombre del sindicato..."
                        />
                        <button 
                            onClick={() => handleSearchLogos(false)}
                            disabled={searchingLogos}
                            className="bg-blue-700 hover:bg-blue-600 text-white px-6 font-bold uppercase text-xs tracking-wider disabled:opacity-50"
                        >
                            {searchingLogos ? <Loader2 className="w-4 h-4 animate-spin"/> : "BUSCAR IA"}
                        </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-neutral-950/50 relative">
                      {showBrowser ? (
                          <div className="w-full h-full flex flex-col">
                              <div className="bg-orange-900/20 p-2 text-xs text-orange-200 border-b border-orange-900/30 flex items-center justify-center gap-2 text-center">
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>
                                      <strong>INSTRUCCIÓN:</strong> Navegue abajo, haga <strong>Click Derecho</strong> en la imagen deseada, seleccione <strong>"Copiar dirección de imagen"</strong> y péguela en el campo "Logo Oficial" del editor.
                                  </span>
                              </div>
                              <iframe 
                                  src={`https://www.google.com/search?igu=1&tbm=isch&q=${encodeURIComponent(logoSearchTerm)}`}
                                  className="w-full h-full border-none"
                                  title="Google Images Search"
                                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                              />
                          </div>
                      ) : (
                          <div className="p-4 h-full">
                              {searchingLogos ? (
                                  <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4">
                                      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                                      <p className="text-sm font-mono animate-pulse">RASTREANDO IMÁGENES EN LA WEB...</p>
                                  </div>
                              ) : logoResults.length > 0 ? (
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                      {logoResults.map((url, idx) => (
                                          <div 
                                              key={idx} 
                                              onClick={() => handleSelectLogo(url)}
                                              className="aspect-square bg-[url('https://www.transparenttextures.com/patterns/checkerboard-cross-light.png')] bg-white/5 border-2 border-neutral-800 hover:border-blue-500 cursor-pointer relative group overflow-hidden rounded-lg transition-all"
                                          >
                                              <img 
                                                  src={url} 
                                                  alt={`Result ${idx}`} 
                                                  className="w-full h-full object-contain p-4 transition-transform group-hover:scale-110" 
                                                  loading="lazy"
                                                  onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Error'}
                                              />
                                              <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                  <span className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                                      <CheckCircle className="w-5 h-5" /> Seleccionar
                                                  </span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4">
                                      <ImageIcon className="w-16 h-16 opacity-20" />
                                      <p className="text-sm">No se encontraron resultados directos.</p>
                                      <p className="text-xs text-neutral-500">Pruebe el modo navegador abajo.</p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-neutral-800 bg-neutral-900 flex justify-between items-center">
                      <p className="text-[10px] text-neutral-500 hidden md:block">
                          {showBrowser ? "Modo Navegador Web (Google Images)" : "Modo Sugerencias IA"}
                      </p>
                      
                      <button 
                          onClick={() => setShowBrowser(!showBrowser)}
                          className={`text-xs font-bold uppercase flex items-center gap-2 px-4 py-2 border transition-colors ${
                              showBrowser 
                              ? 'bg-blue-900/20 text-blue-400 border-blue-900/50 hover:bg-blue-900/40'
                              : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                          }`}
                      >
                          {showBrowser ? (
                              <> <Bot className="w-4 h-4" /> Volver a Sugerencias IA </>
                          ) : (
                              <> <Globe className="w-4 h-4" /> Navegar Google Imágenes </>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* CHAT AGENT WIDGET (Fixed Bottom Right) */}
      <div className={`fixed bottom-4 right-4 z-[90] flex flex-col items-end transition-all ${isChatOpen ? 'w-96' : 'w-auto'}`}>
          {isChatOpen && (
              <div className="bg-neutral-900 border border-neutral-700 shadow-2xl w-full h-[500px] flex flex-col mb-4 rounded-lg overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                  <div className="bg-neutral-800 p-3 flex justify-between items-center border-b border-neutral-700">
                      <div className="flex items-center gap-2 text-white font-bold uppercase text-xs tracking-wider">
                          <Bot className="w-4 h-4 text-green-500" /> Agente Operativo
                      </div>
                      <div className="flex items-center gap-1">
                          <button onClick={(e) => handleOpenPromptModal(e, 'chatAgent', 'Agente Operativo')} className="text-neutral-500 hover:text-white p-1" title="Configurar Prompt Agente">
                            <Settings className="w-3 h-3" />
                          </button>
                          <button onClick={() => setIsChatOpen(false)} className="text-neutral-400 hover:text-white p-1">
                              <X className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/50">
                      {chatMessages.length === 0 && (
                          <div className="text-center text-neutral-600 text-xs mt-10 italic">
                              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                              <p>Hola. Soy el agente de la base de datos.</p>
                              <p>Pídeme investigar o corregir datos.</p>
                          </div>
                      )}
                      {chatMessages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-3 rounded-lg text-xs font-mono leading-relaxed ${
                                  msg.role === 'user' ? 'bg-neutral-800 text-white' : 
                                  msg.role === 'system' ? 'bg-red-900/20 text-red-400 border border-red-900/30' : 
                                  'bg-green-900/10 text-green-400 border border-green-900/20'
                              }`}>
                                  {msg.role === 'system' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                                  {msg.text}
                              </div>
                          </div>
                      ))}
                      {chatLoading && (
                          <div className="flex justify-start">
                              <div className="bg-neutral-800 p-3 rounded-lg">
                                  <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                              </div>
                          </div>
                      )}
                      <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 bg-neutral-900 border-t border-neutral-800 flex gap-2">
                      <input 
                          type="text" 
                          className="flex-1 bg-neutral-950 border border-neutral-800 text-white text-xs p-2 focus:border-green-600 outline-none rounded"
                          placeholder="Ej: 'Actualiza el secretario de Camioneros...'"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                          disabled={chatLoading}
                      />
                      <button 
                          onClick={handleChatSend} 
                          disabled={chatLoading || !chatInput.trim()}
                          className="bg-green-700 hover:bg-green-600 text-white p-2 rounded disabled:opacity-50"
                      >
                          <Send className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          )}
          
          <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="bg-green-700 hover:bg-green-600 text-white p-4 rounded-full shadow-lg shadow-green-900/50 transition-transform hover:scale-105 flex items-center gap-2 font-bold uppercase text-xs"
          >
              {isChatOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
              {!isChatOpen && <span className="mr-1">Agente IA</span>}
          </button>
      </div>

      {/* Sidebar: Existing Database */}
      <aside className="w-full md:w-80 bg-neutral-900 border-r border-neutral-800 p-4 flex flex-col">
        <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-white font-black uppercase tracking-tighter flex items-center gap-2">
                    <Search className="w-4 h-4 text-red-600" /> Base de Datos
                </h2>
                <button 
                    onClick={handleOpenGlobalConfig}
                    className="text-neutral-500 hover:text-white"
                    title="Configuración Global (Noticias, Campos)"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>
            <input 
                type="text" 
                placeholder="Buscar sindicato..." 
                className="w-full bg-neutral-950 border border-neutral-800 p-2 text-sm text-white focus:border-red-600 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!!bulkProgress}
            />
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {filteredUnions.map((union, idx) => (
                <div key={idx} className={`bg-neutral-950 p-3 border border-neutral-800 transition-colors group cursor-pointer relative ${bulkProgress ? 'opacity-50 pointer-events-none' : 'hover:border-red-600'}`} onClick={() => handleSelectExisting(union)}>
                    <div className="flex justify-between items-start">
                        <span className="text-red-600 font-bold text-xs uppercase tracking-wider">{union.slug}</span>
                        <div className="flex gap-2 relative z-10">
                             <button 
                                type="button"
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
                                    performSmartUpdate(union);
                                }}
                                className="text-neutral-600 hover:text-blue-500 p-1 transition-colors"
                                title="Actualizar Sindicato (Investigar Nuevos Datos)"
                             >
                                <RefreshCw className="w-3 h-3" />
                             </button>

                             <button 
                                type="button"
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
                                    handleDeleteTrigger(union.slug, union.nombre);
                                }}
                                className="text-neutral-600 hover:text-red-500 p-1 transition-colors"
                                title="Eliminar Sindicato"
                             >
                                <Trash2 className="w-3 h-3" />
                             </button>
                        </div>
                    </div>
                    <h3 className="text-neutral-300 font-bold text-sm leading-tight mt-1 group-hover:text-white">{union.nombre}</h3>
                </div>
            ))}
        </div>

        {/* BULK ACTIONS AREA */}
        <div className="space-y-2 mt-auto">
             {bulkProgress ? (
                 <div className="w-full bg-neutral-950 p-3 border border-blue-900/50">
                    <div className="flex justify-between text-[10px] text-blue-400 font-bold uppercase mb-1">
                        <span>Actualizando...</span>
                        <span>{bulkProgress.current} / {bulkProgress.total}</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden mb-2">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%`}}
                        ></div>
                    </div>
                    <p className="text-[10px] text-neutral-500 truncate">{bulkProgress.currentName}</p>
                 </div>
             ) : (
                <button 
                    type="button"
                    onClick={handleBulkUpdateAll}
                    disabled={existingUnions.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 hover:text-blue-200 text-xs font-bold py-3 uppercase border border-blue-900/30 transition-all disabled:opacity-50"
                >
                    <Layers className="w-4 h-4" /> ACTUALIZAR BASE COMPLETA
                </button>
             )}

            <button 
                type="button"
                onClick={handleDownloadDb}
                disabled={!!bulkProgress}
                className="w-full flex items-center justify-center gap-2 bg-green-900/20 hover:bg-green-900/40 text-green-400 hover:text-green-200 text-xs font-bold py-3 uppercase border border-green-900/30 transition-all disabled:opacity-50"
            >
                <FileJson className="w-4 h-4" /> DESCARGAR BASE.JSON
            </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* Top Controls Grid */}
        <div className={`grid lg:grid-cols-3 gap-6 mb-8 transition-opacity ${bulkProgress ? 'opacity-50 pointer-events-none' : ''}`}>
            
            {/* 1. Full Investigation */}
            <div className="bg-neutral-900 p-6 border border-neutral-800 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl group-hover:bg-red-600/10 transition-colors"></div>
                <div className="flex justify-between items-start mb-4">
                    <h1 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                        <Bot className="w-5 h-5 text-red-600" /> Investigar (Full)
                    </h1>
                    <button type="button" onClick={(e) => handleOpenPromptModal(e, 'investigation', 'Investigación General')} className="text-neutral-500 hover:text-white" title="Configurar Prompt"><Settings className="w-4 h-4"/></button>
                </div>
                <div className="flex flex-col gap-3">
                    <input
                        type="text"
                        value={inputName}
                        onChange={(e) => setInputName(e.target.value)}
                        placeholder="Nombre Sindicato..."
                        className="w-full bg-neutral-950 px-4 py-2 border border-neutral-700 text-white placeholder-neutral-600 focus:border-red-600 focus:outline-none font-bold text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={loading || !inputName.trim()}
                        className="bg-red-700 text-white px-4 py-2 font-black uppercase tracking-wider hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-xs h-10"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {loading ? 'ANALIZANDO...' : 'GENERAR INFORME'}
                    </button>
                </div>
            </div>

            {/* 2. Quick Link Analysis */}
            <div className="bg-neutral-900 p-6 border border-neutral-800 shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-colors"></div>
                 <div className="flex justify-between items-start mb-4">
                    <h1 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                        <Link className="w-5 h-5 text-blue-500" /> Link Único (IMG/DOCS)
                    </h1>
                    <button type="button" onClick={(e) => handleOpenPromptModal(e, 'linkAnalysis', 'Análisis de Enlaces')} className="text-neutral-500 hover:text-white" title="Configurar Prompt"><Settings className="w-4 h-4"/></button>
                </div>
                <div className="flex flex-col gap-3">
                     <div className="relative">
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            placeholder="Enlace (Noticia, X, FB)..."
                            className="w-full bg-neutral-950 px-4 py-2 border border-neutral-700 text-white placeholder-neutral-600 focus:border-blue-500 focus:outline-none font-bold text-sm pr-10"
                            onKeyDown={(e) => e.key === 'Enter' && handleUrlAnalysis()}
                        />
                     </div>
                    <button
                        type="button"
                        onClick={handleUrlAnalysis}
                        disabled={analyzingUrl || !inputUrl.trim()}
                        className="bg-blue-700 text-white px-4 py-2 font-black uppercase tracking-wider hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-xs h-10"
                    >
                        {analyzingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                        {analyzingUrl ? 'EXTRAYENDO...' : 'ANALIZAR'}
                    </button>
                </div>
            </div>

             {/* 3. Batch Cable Processing */}
             <div className="bg-neutral-900 p-6 border-l-4 border-l-purple-600 border border-neutral-800 shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl group-hover:bg-purple-600/10 transition-colors"></div>
                 <div className="flex justify-between items-start mb-4">
                    <h1 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                        <Radio className="w-5 h-5 text-purple-500" /> Procesar Cables
                    </h1>
                    <button type="button" onClick={(e) => handleOpenPromptModal(e, 'newsAnalysis', 'Análisis Masivo Noticias')} className="text-neutral-500 hover:text-white" title="Configurar Prompt"><Settings className="w-4 h-4"/></button>
                </div>
                <div className="flex flex-col gap-3">
                    <p className="text-neutral-500 text-xs font-mono h-[34px] flex items-center">
                        {news.length} cables disponibles en feed.
                    </p>
                    <button
                        type="button"
                        onClick={handleProcessCables}
                        disabled={analyzingBatch || news.length === 0}
                        className="bg-purple-700 text-white px-4 py-2 font-black uppercase tracking-wider hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-xs h-10 shadow-lg shadow-purple-900/20"
                    >
                        {analyzingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                        {analyzingBatch ? 'PROCESANDO...' : 'ANALIZAR FEEDS'}
                    </button>
                </div>
            </div>
        </div>

        {/* Global Messages */}
        {error && (
            <div className="mb-6 bg-red-900/20 border border-red-900/50 p-4 flex items-center gap-3 text-red-200 text-sm">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                {error}
            </div>
        )}
        {urlMessage && (
             <div className="mb-6 bg-blue-900/20 border border-blue-900/50 p-4 flex items-center gap-3 text-blue-200 text-sm animate-in fade-in">
                <Bot className="w-5 h-5 text-blue-500" />
                {urlMessage}
            </div>
        )}

        {/* Signals Intelligence Results (Batch Analysis) */}
        {batchResults.length > 0 && !editableData && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 mb-8">
                <h3 className="text-purple-400 font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                    <Radio className="w-4 h-4" /> Señales Detectadas ({batchResults.length})
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    {batchResults.map((result, idx) => (
                        <div key={idx} className="bg-neutral-900 border border-purple-900/30 p-4 hover:bg-purple-900/10 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-purple-400 font-black uppercase text-xs">{result.sindicatoMatch.slug}</span>
                                <span className="bg-purple-900/50 text-purple-200 text-[10px] px-2 py-0.5 rounded uppercase font-bold">
                                    {result.tipoDetectado === 'accion' ? (result.data as AccionGremial).tipo : 'PARITARIA'}
                                </span>
                            </div>
                            <h4 className="text-white font-bold text-sm mb-2">
                                {result.tipoDetectado === 'accion' ? (result.data as AccionGremial).titulo : `Acuerdo ${ (result.data as AcuerdoParitario).porcentajeAumento}`}
                            </h4>
                            <div className="flex gap-2 mt-4">
                                <button 
                                    type="button"
                                    onClick={() => handleAcceptSuggestion(result)}
                                    className="flex-1 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold py-2 uppercase flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-3 h-3" /> Procesar
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setBatchResults(prev => prev.filter((_, i) => i !== idx))}
                                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white px-3 py-2"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Editor Form */}
        {editableData ? (
             <div className="animate-in slide-in-from-bottom-4 duration-500 pb-20">
                <div className="flex items-center justify-between sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-sm py-4 border-b border-neutral-800 mb-6">
                    <div>
                        <span className="text-red-500 text-xs font-bold uppercase tracking-widest">
                            {existingUnions.find(u => u.slug === editableData.slug) ? 'Editando Registro' : 'Nuevo Registro'}
                        </span>
                        <h2 className="text-2xl font-black text-white uppercase leading-none">{editableData.nombre}</h2>
                    </div>
                    <div className="flex gap-2">
                         {existingUnions.find(u => u.slug === editableData.slug) && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteTrigger(editableData.slug, editableData.nombre)}
                                    className="bg-red-900/20 hover:bg-red-900/40 text-red-500 px-4 py-3 font-bold uppercase text-xs tracking-wider transition-all border border-red-900/30 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> <span className="hidden lg:inline">Eliminar Sindicato</span>
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={handleReInvestigateCurrent}
                                    disabled={loading}
                                    className="bg-blue-900/20 hover:bg-blue-900/40 text-blue-500 px-4 py-3 font-bold uppercase text-xs tracking-wider transition-all border border-blue-900/30 flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    <span className="hidden lg:inline">INVESTIGAR DATOS</span>
                                </button>
                            </>
                         )}
                        <button
                            type="button"
                            onClick={() => setEditableData(null)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white px-4 py-3 font-bold uppercase text-xs tracking-wider transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleApprove}
                            className="bg-green-700 hover:bg-green-600 text-white px-6 py-3 font-bold uppercase shadow-lg shadow-green-900/20 flex items-center gap-2 text-sm tracking-wider transition-all"
                        >
                            <Save className="w-4 h-4" /> Guardar
                        </button>
                    </div>
                </div>

                <div className="grid gap-8">
                    {/* Sección 1: Datos Básicos + Logo */}
                    <div className="bg-neutral-900 p-6 border border-neutral-800">
                        <h3 className="text-neutral-500 font-bold uppercase text-xs mb-4 tracking-widest border-b border-neutral-800 pb-2">Información Institucional</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="label-helper">Nombre Sindicato</label>
                                <input className="input-dark" value={editableData.nombre} onChange={(e) => updateField('nombre', e.target.value)} />
                            </div>
                            <div>
                                <label className="label-helper">Slug (Identificador)</label>
                                <input className="input-dark" value={editableData.slug} onChange={(e) => updateField('slug', e.target.value)} />
                            </div>
                            <div>
                                <label className="label-helper">Sede</label>
                                <input className="input-dark" value={editableData.datosBasicos.sedePrincipal} onChange={(e) => updateField('datosBasicos.sedePrincipal', e.target.value)} />
                            </div>
                            <div>
                                <label className="label-helper">Web</label>
                                <input className="input-dark" value={editableData.datosBasicos.sitioWeb} onChange={(e) => updateField('datosBasicos.sitioWeb', e.target.value)} />
                            </div>
                            
                            {renderCustomFields('datosBasicos', 'datosBasicos')}

                            {/* Logo Section */}
                            <div className="md:col-span-2 bg-neutral-950 p-4 border border-neutral-800 flex flex-col gap-4">
                                <label className="label-helper text-blue-400 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Logo Oficial
                                </label>
                                <div className="flex gap-2">
                                    <input 
                                        className="input-dark flex-1" 
                                        placeholder="https://ejemplo.com/logo.png"
                                        value={editableData.datosBasicos.logo || ''} 
                                        onChange={(e) => updateField('datosBasicos.logo', e.target.value)} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleOpenLogoModal}
                                        className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 border border-neutral-700 text-xs font-bold uppercase flex items-center gap-2"
                                    >
                                        <Search className="w-4 h-4" />
                                        Buscar Logo
                                    </button>
                                </div>

                                {/* Current Logo Preview */}
                                {editableData.datosBasicos.logo && (
                                    <div className="mt-2">
                                        <p className="text-[10px] text-neutral-500 uppercase mb-1">Vista Previa Actual:</p>
                                        <div className="w-16 h-16 bg-white p-1 rounded flex items-center justify-center border border-neutral-700">
                                            <img src={editableData.datosBasicos.logo} alt="Logo Actual" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sección 2: Comisión Directiva */}
                    <div className="bg-neutral-900 p-6 border border-neutral-800">
                         <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-4">
                            <h3 className="text-blue-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4" /> Comisión Directiva
                            </h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => handleOpenPromptModal(e, 'comision', 'Investigación Comisión')}
                                    className="text-neutral-500 hover:text-white"
                                >
                                    <Settings className="w-3 h-3" />
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleUpdateComision} 
                                    disabled={loadingSection === 'comision'}
                                    className="text-xs bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-900/50 px-3 py-1 uppercase font-bold flex items-center gap-1"
                                >
                                    {loadingSection === 'comision' ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3" />} Actualizar C.D.
                                </button>
                                <button type="button" onClick={addMember} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 uppercase font-bold flex items-center gap-1">
                                    <UserPlus className="w-3 h-3" /> Agregar
                                </button>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            {editableData.comisionDirectiva?.map((miembro, idx) => (
                                <div key={idx} className="bg-neutral-950 p-3 border border-neutral-800 flex gap-2 items-end group">
                                    <div className="flex-1">
                                        <label className="label-helper">Nombre</label>
                                        <input 
                                            className="input-dark" 
                                            value={miembro.nombre} 
                                            onChange={(e) => updateMember(idx, 'nombre', e.target.value)} 
                                            placeholder="Nombre completo"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="label-helper">Cargo</label>
                                        <input 
                                            className="input-dark" 
                                            value={miembro.cargo} 
                                            onChange={(e) => updateMember(idx, 'cargo', e.target.value)} 
                                            placeholder="Cargo"
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={(e) => removeMember(e, idx)}
                                        className="bg-neutral-800 hover:bg-red-900 text-neutral-500 hover:text-red-500 p-2 h-[38px] w-[38px] flex items-center justify-center transition-colors cursor-pointer z-10"
                                        title="Eliminar miembro"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sección 3: Acciones Gremiales */}
                    <div className="bg-neutral-900 p-6 border border-neutral-800">
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-4">
                            <h3 className="text-red-500 font-bold uppercase text-xs tracking-widest">
                                Acciones Gremiales ({Object.keys(editableData.acciones).length})
                            </h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => handleOpenPromptModal(e, 'acciones', 'Investigación Acciones')}
                                    className="text-neutral-500 hover:text-white"
                                >
                                    <Settings className="w-3 h-3" />
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleUpdateAcciones} 
                                    disabled={loadingSection === 'acciones'}
                                    className="text-xs bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 px-3 py-1 uppercase font-bold flex items-center gap-1"
                                >
                                    {loadingSection === 'acciones' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Search className="w-3 h-3" />} Buscar Nuevas
                                </button>
                                <button type="button" onClick={addEmptyAccion} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 uppercase font-bold flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Agregar
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(editableData.acciones).map(([uuid, accion]: [string, AccionGremial]) => (
                                <div key={uuid} className={`bg-neutral-900 p-4 border relative group ${accion.fecha >= new Date().toISOString().split('T')[0] ? 'border-l-4 border-l-red-600 border-y-neutral-800 border-r-neutral-800' : 'border-neutral-800'}`}>
                                     <button 
                                        type="button"
                                        onClick={(e) => removeAccion(e, uuid)} 
                                        className="absolute top-0 right-0 bg-neutral-800 text-neutral-500 hover:bg-red-700 hover:text-white p-2 transition-all z-20 cursor-pointer"
                                        title="Eliminar Acción"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    
                                    <div className="grid md:grid-cols-12 gap-4 mt-2">
                                        <div className="md:col-span-8">
                                            <label className="label-helper">Título Acción</label>
                                            <input className="input-dark font-bold text-white" value={accion.titulo} onChange={(e) => updateField(`acciones.${uuid}.titulo`, e.target.value)} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label-helper">Fecha</label>
                                            <input type="date" className="input-dark" value={accion.fecha} onChange={(e) => updateField(`acciones.${uuid}.fecha`, e.target.value)} />
                                        </div>
                                        
                                        <div className="md:col-span-2">
                                            <label className="label-helper">Tipo</label>
                                            <select className="input-dark uppercase" value={accion.tipo} onChange={(e) => updateField(`acciones.${uuid}.tipo`, e.target.value)}>
                                                <option value="medida-fuerza">Medida de Fuerza</option>
                                                <option value="movilizacion">Movilización</option>
                                                <option value="asamblea">Asamblea</option>
                                                <option value="reunion">Reunión</option>
                                                <option value="denuncia">Denuncia</option>
                                                <option value="otro">Otro</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-5">
                                            <label className="label-helper">Lugar</label>
                                            <input className="input-dark" value={accion.lugar} onChange={(e) => updateField(`acciones.${uuid}.lugar`, e.target.value)} />
                                        </div>
                                        <div className="md:col-span-7">
                                            <label className="label-helper">Fuente (Link)</label>
                                            <input className="input-dark text-blue-400 text-xs" value={accion.fuente} onChange={(e) => updateField(`acciones.${uuid}.fuente`, e.target.value)} />
                                        </div>
                                        
                                        <div className="md:col-span-12">
                                            <label className="label-helper">Descripción Breve</label>
                                            <textarea className="input-dark h-16 resize-none" value={accion.descripcion} onChange={(e) => updateField(`acciones.${uuid}.descripcion`, e.target.value)} />
                                        </div>

                                        {/* Render custom fields inside action */}
                                        <div className="md:col-span-12">
                                            {renderCustomFields('acciones', `acciones.${uuid}`)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sección 4: Paritarias */}
                    <div className="bg-neutral-900 p-6 border border-neutral-800">
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-4">
                            <h3 className="text-green-600 font-bold uppercase text-xs tracking-widest">Paritarias (Salarios)</h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => handleOpenPromptModal(e, 'paritarias', 'Investigación Paritarias')}
                                    className="text-neutral-500 hover:text-white"
                                >
                                    <Settings className="w-3 h-3" />
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleUpdateParitarias} 
                                    disabled={loadingSection === 'paritarias'}
                                    className="text-xs bg-green-900/20 hover:bg-green-900/40 text-green-400 border border-green-900/50 px-3 py-1 uppercase font-bold flex items-center gap-1"
                                >
                                    {loadingSection === 'paritarias' ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3" />} Actualizar Salarios
                                </button>
                                <button type="button" onClick={addEmptyParitaria} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 uppercase font-bold flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Agregar
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                             {Object.entries(editableData.paritarias).map(([uuid, paritaria]: [string, AcuerdoParitario]) => (
                                <div key={uuid} className="bg-neutral-950 p-4 border border-l-4 border-l-green-600 border-neutral-800 relative group">
                                     <button 
                                        type="button"
                                        onClick={(e) => removeParitaria(e, uuid)} 
                                        className="absolute top-0 right-0 bg-neutral-800 text-neutral-500 hover:bg-red-700 hover:text-white p-2 transition-all z-20 cursor-pointer"
                                        title="Eliminar Paritaria"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="grid md:grid-cols-3 gap-4 mt-2">
                                        <div>
                                            <label className="label-helper">Aumento %</label>
                                            <input className="input-dark text-green-400 font-bold" value={paritaria.porcentajeAumento} onChange={(e) => updateField(`paritarias.${uuid}.porcentajeAumento`, e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="label-helper">Periodo</label>
                                            <input className="input-dark" value={paritaria.periodo} onChange={(e) => updateField(`paritarias.${uuid}.periodo`, e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="label-helper">Fecha Firma</label>
                                            <input type="date" className="input-dark" value={paritaria.fechaFirma} onChange={(e) => updateField(`paritarias.${uuid}.fechaFirma`, e.target.value)} />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="label-helper">Detalle</label>
                                            <input className="input-dark" value={paritaria.detalleTexto} onChange={(e) => updateField(`paritarias.${uuid}.detalleTexto`, e.target.value)} />
                                        </div>
                                        <div className="md:col-span-3">
                                             <label className="label-helper">Fuente Oficial</label>
                                            <input className="input-dark text-blue-400 text-xs" value={paritaria.enlaceFuente} onChange={(e) => updateField(`paritarias.${uuid}.enlaceFuente`, e.target.value)} />
                                        </div>
                                         {/* Render custom fields inside paritaria */}
                                        <div className="md:col-span-3">
                                            {renderCustomFields('paritarias', `paritarias.${uuid}`)}
                                        </div>
                                    </div>
                                </div>
                             ))}
                        </div>
                    </div>
                </div>
             </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-600">
                {bulkProgress ? (
                    <div className="text-center animate-in fade-in zoom-in">
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Actualizando Base de Datos</h3>
                        <p className="text-blue-400 font-mono mt-2">Procesando {bulkProgress.currentName}...</p>
                        <p className="text-neutral-600 text-xs mt-4">Por favor espere, esto puede demorar unos minutos.</p>
                    </div>
                ) : (
                    <>
                        <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-mono uppercase">Seleccione un sindicato de la base de datos o inicie una investigación.</p>
                        <div className="flex gap-4 mt-6 opacity-50">
                            <div className="flex items-center gap-2 text-xs"><Bot className="w-4 h-4" /> Investigar</div>
                            <div className="flex items-center gap-2 text-xs"><Link className="w-4 h-4" /> Analizar Link</div>
                        </div>
                    </>
                )}
            </div>
        )}

      </div>
      <style>{`
        .label-helper {
          display: block;
          font-size: 0.65rem;
          color: #737373;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }
        .input-dark {
          background-color: #0a0a0a;
          border: 1px solid #262626;
          color: #e5e5e5;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          width: 100%;
          transition: all 0.2s;
        }
        .input-dark:focus {
          border-color: #dc2626;
          outline: none;
        }
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #171717; 
        }
        ::-webkit-scrollbar-thumb {
            background: #404040; 
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #525252; 
        }
      `}</style>
    </div>
  );
};

export default EditorView;
