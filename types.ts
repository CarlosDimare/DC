
export interface ComisionMiembro {
  nombre: string;
  cargo: string;
}

export interface DatosBasicos {
  sedePrincipal: string;
  sitioWeb: string;
  logo?: string;
  [key: string]: any; // Allow custom fields
}

export interface AccionGremial {
  titulo: string;
  tipo: "medida-fuerza" | "asamblea" | "reunion" | "denuncia" | "movilizacion" | "otro";
  fecha: string; // YYYY-MM-DD
  lugar: string;
  fuente: string; // Link obligatorio
  descripcion: string;
  [key: string]: any; // Allow custom fields
}

export interface AcuerdoParitario {
  periodo: string;
  porcentajeAumento: string;
  fechaFirma: string;
  detalleTexto: string;
  enlaceFuente: string;
  [key: string]: any; // Allow custom fields
}

export interface SindicatoData {
  nombre: string;
  slug: string;
  comisionDirectiva: ComisionMiembro[];
  datosBasicos: DatosBasicos;
  acciones: Record<string, AccionGremial>; 
  paritarias: Record<string, AcuerdoParitario>; 
  [key: string]: any; // Allow custom fields at root if needed
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  content?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isAction?: boolean; // True if the message resulted in a DB update
}

export type ViewMode = 'public' | 'editor';

// --- CONFIGURATION TYPES ---

export interface NewsSource {
  name: string;
  url: string;
}

export interface CustomField {
  id: string;
  key: string; // The property name in JSON
  label: string; // Human readable label
  section: 'datosBasicos' | 'root' | 'acciones' | 'paritarias';
  type: 'text' | 'number' | 'date' | 'textarea';
}

export interface AppConfig {
  geminiApiKey?: string; // Stored in DB to avoid env var issues in deployment
  prompts: {
    investigation?: string;
    linkAnalysis?: string;
    newsAnalysis?: string;
    chatAgent?: string;
    // Granular prompts
    comision?: string;
    paritarias?: string;
    acciones?: string;
  };
  newsSources: NewsSource[];
  customFields: CustomField[];
}
