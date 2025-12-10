
import { GoogleGenAI } from "@google/genai";
import { SindicatoData, AccionGremial, AcuerdoParitario, NewsItem, ComisionMiembro } from "../types";

// --- DEFAULT PROMPTS (EXPORTED FOR EDITING) ---

export const DEFAULT_PROMPTS = {
    INVESTIGATION: `
Eres un AUDITOR FORENSE de acuerdos salariales (Paritarias) e inteligencia gremial.

TU OBJETIVO:
Investigar y estructurar la información del sindicato solicitado, con énfasis CRÍTICO en la evolución salarial del año en curso.

INSTRUCCIONES DE SALIDA:
- Devuelve SOLAMENTE un objeto JSON válido.
- NO uses markdown.
- Comienza con "{".

OBJETIVOS DE INVESTIGACIÓN:

1. **INSTITUCIONAL:**
   - Nombre oficial completo y SIGLAS (Slug).
   - Comisión Directiva: Secretario General y adjuntos.
   - Datos de contacto (Sede real, Sitio Web y URL de LOGO oficial en formato imagen).

2. **AUDITORÍA PARITARIA (CRÍTICO):**
   - Busca TODOS los acuerdos salariales firmados durante el año actual (${new Date().getFullYear()}).
   - NO te quedes solo con el último. Rastrea Enero, Marzo, Julio, etc.
   - **CALCULO:** Suma o acumula los porcentajes para obtener el TOTAL ANUAL PROVISORIO.
   - **FORMATO "porcentajeAumento":** Debe ser ESTRICTAMENTE un número seguido de % (Ej: "85%"). NO agregues texto como "aprox" o "anual".
   - **FORMATO "detalleTexto":** Redacta un párrafo resumen cronológico (Ej: "Se acordó un 15% en Enero, seguido de una revisión del 10% en Abril basándose en el IPC...").
   - **FORMATO "periodo":** "Año ${new Date().getFullYear()}".

3. **ACCIONES:**
   - NO busques acciones gremiales (paros, marchas). Deja el objeto "acciones" vacío.

ESTRUCTURA JSON REQUERIDA:
{
  "nombre": "Nombre Completo Sindicato",
  "slug": "siglas-minusculas",
  "comisionDirectiva": [
    { "nombre": "Nombre", "cargo": "Cargo" }
  ],
  "datosBasicos": {
    "sedePrincipal": "Dirección exacta",
    "sitioWeb": "URL oficial",
    "logo": "URL directa a imagen del logo (png/jpg)"
  },
  "acciones": {},
  "paritarias": {
    "UUID_ANUAL_CALCULADO": {
      "periodo": "Año ${new Date().getFullYear()}",
      "porcentajeAumento": "Ej: 125%",
      "fechaFirma": "YYYY-MM-DD (Fecha del último acuerdo parcial)",
      "detalleTexto": "Resumen narrativo inapelable de todos los tramos del año.",
      "enlaceFuente": "URL a acta homologada o comunicado oficial"
    }
  }
}
`,
    LINK_ANALYSIS: `
    Analiza el enlace proporcionado para extraer información sindical CRÍTICA.
    
    PARAMETROS TEMPORALES:
    - FECHA DE HOY: {{todayString}}
    - AÑO ACTUAL: {{currentYear}}
    
    CONTEXTO DE BASE DE DATOS (Sindicatos Existentes - PRIORIZAR ESTOS SLUGS):
    {{dbContextString}}
    
    REGLA DE ORO PARA REDES SOCIALES (INSTAGRAM / FACEBOOK / X):
    1. NO INTENTES ACCEDER AL CONTENIDO DEL LINK DIRECTAMENTE si es una red social (login wall).
    2. **ESTRATEGIA OBLIGATORIA:** Usa Google Search para buscar el contenido textual del post.
       - Ejemplo de búsqueda que debes hacer internamente: "instagram [nombre_sindicato] post [fecha_aprox] [palabras_clave_url]" o simplemente busca la URL exacta en Google para ver el snippet indexado.
       - Extrae la información (fechas, lugares, motivos) del snippet de búsqueda o de sitios espejo.
       - Si el post contiene "actas" (imágenes de documentos), busca en el texto del post transcrito en los resultados de búsqueda palabras como "audiencia", "fracaso", "cuarto intermedio", "acuerdo".

    REGLAS DE FECHAS (CRÍTICO - NO ALUCINAR AÑOS ANTIGUOS):
    1. Si el texto dice "Martes 4" o "Ayer", CALCULA la fecha exacta basándote en la FECHA DE HOY ({{todayString}}).
    2. **AÑO POR DEFECTO:** Si la fecha extraída no tiene año explícito, ASUME {{currentYear}}.
    3. **PROHIBIDO:** No inventes años pasados (2020, 2021, 2022) a menos que el texto diga explícitamente el año (ej: "En memoria de 2020..."). Los posts que analizamos suelen ser ACTUALES.
    4. Si hay ambigüedad entre un año viejo y el actual, ELIGE EL AÑO ACTUAL ({{currentYear}}).

    CAPACIDAD MULTI-ACCIÓN (IMPORTANTE):
    - Un solo post puede contener información sobre:
      A) Una acción PASADA (ej: "Ayer realizamos la audiencia X sin acuerdo").
      B) Una acción FUTURA (ej: "Convocamos a nueva audiencia para el día Jueves").
    - Si detectas esto, devuelve "tipoDetectado": "multi-accion" y en "data" un ARRAY de objetos AccionGremial.

    MATCHING DE SINDICATO:
    - Si el sindicato mencionado coincide (aunque sea parcialmente) con uno del CONTEXTO, USA EL SLUG Y NOMBRE DEL CONTEXTO. No crees duplicados.

    FORMATO JSON DE SALIDA:
    {
        "sindicatoMatch": { "nombre": "Nombre Exacto", "slug": "slug-exacto" },
        "tipoDetectado": "accion" | "paritaria" | "multi-accion",
        "data": { ... } OR [ { ... }, { ... } ]
    }
    
    Estructura AccionGremial:
    { "titulo": "...", "tipo": "reunion"|"medida-fuerza"|"asamblea", "fecha": "YYYY-MM-DD", "lugar": "...", "fuente": "{{url}}", "descripcion": "..." }

    Si falla todo, devuelve error explicito en JSON.
    `,
    NEWS_ANALYSIS: `
    Eres un motor de inteligencia gremial. Procesas cables de noticias y detectas acciones concretas.
    Fecha de hoy: {{today}}.

    INSTRUCCIONES CRÍTICAS:
    1. **FILTRADO:** Ignora noticias de opinión, política general o internas irrelevantes. Solo procesa: Paros, Movilizaciones, Asambleas, Acuerdos Salariales (Paritarias) o Denuncias graves.
    
    2. **DESDOBLAMIENTO TEMPORAL (ANUNCIO vs EJECUCIÓN):**
       - Si una noticia dice: "Gremio X anuncia Paro para el 9 de diciembre".
       - DEBES generar, si es posible, la ACCIÓN FUTURA.
       - Si la noticia es HOY anunciando algo FUTURO, prioriza la acción futura.
       - Si la noticia es sobre una marcha que YA ocurrió, regístrala con la fecha pasada.

    3. **FECHAS:** Calcula fechas relativas ("el próximo jueves") basándote en la fecha de la noticia o la fecha de hoy ({{today}}). NUNCA dejes fecha vacía.

    4. **FORMATO JSON (Array):**
    [
      {
        "sindicatoMatch": { "nombre": "Nombre", "slug": "slug" },
        "tipoDetectado": "accion" | "paritaria",
        "data": { 
           "titulo": "Título de la Acción (Ej: Paro Nacional 24hs)", 
           "tipo": "medida-fuerza" | "asamblea" | "movilizacion" | "reunion", 
           "fecha": "YYYY-MM-DD", 
           "lugar": "Ciudad / Lugar", 
           "fuente": "URL original", 
           "descripcion": "Resumen del evento."
        }
      }
    ]
    `,
    CHAT_AGENT: `
    Eres el "Operador de Inteligencia" de la Sala de Situación.
    Tienes acceso de lectura y escritura a la base de datos de sindicatos.
    
    BASE DE DATOS ACTUAL (Resumen): 
    {{dbSummary}}

    TU MISIÓN:
    1. Conversar con el usuario sobre los datos disponibles.
    2. Si el usuario te pide CORREGIR, INVESTIGAR o ACTUALIZAR un dato específico:
       - Usa tus herramientas (Google Search) para verificar la información si es necesario.
       - Genera una RESPUESTA DE ACCIÓN en formato JSON para ejecutar el cambio en la app.

    FORMATO DE RESPUESTA:
    
    CASO A: Conversación normal
    Solo responde con texto plano.

    CASO B: Ejecutar Acción (Corrección/Update)
    Si debes modificar la base de datos, responde EXCLUSIVAMENTE con un bloque JSON así:
    
    \`\`\`json
    {
        "type": "UPDATE_UNION",
        "slug": "slug-del-sindicato-existente",
        "field": "campo.subcampo", // Ej: "comisionDirectiva" o "datosBasicos.sedePrincipal"
        "value": "Nuevo valor (string, objeto o array)",
        "explanation": "Breve texto explicando qué hiciste."
    }
    \`\`\`

    NOTA: Para "field", usa notación de puntos. Si es "comisionDirectiva", el value debe ser el array completo.
    `
};

// Helper to get key
const getClient = (providedKey?: string) => {
    // Priority: 1. DB/Config provided key, 2. Env variable
    const key = providedKey || process.env.API_KEY;
    if (!key) {
        throw new Error("Falta API Key de Gemini. Configúrela en 'Configuración Global' > 'Sistema' o en .env");
    }
    return new GoogleGenAI({ apiKey: key });
}


// Helper to clean JSON
const cleanAndParseJson = (text: string): any => {
    let jsonString = text.trim();
    // Remove markdown code blocks
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    // Remove plain markdown code blocks if just ```
    jsonString = jsonString.replace(/```/g, '');
    
    // Find the first { (or [ for arrays) and last } (or ])
    const firstCurly = jsonString.indexOf('{');
    const firstSquare = jsonString.indexOf('[');
    
    let startIdx = -1;
    if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
        startIdx = firstCurly;
    } else if (firstSquare !== -1) {
        startIdx = firstSquare;
    }

    if (startIdx !== -1) {
        jsonString = jsonString.substring(startIdx);
        const lastCurly = jsonString.lastIndexOf('}');
        const lastSquare = jsonString.lastIndexOf(']');
        const endIdx = Math.max(lastCurly, lastSquare);
        if (endIdx !== -1) {
            jsonString = jsonString.substring(0, endIdx + 1);
        }
    } else {
        // If no brackets found, it's likely a plain text error message from the model
        throw new Error("La IA respondió con texto plano en lugar de JSON. Posible error de acceso.");
    }
    
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON:", jsonString);
        throw new Error("La respuesta de la IA no es un JSON válido.");
    }
};

export const generarContenidoSindical = async (sindicatoNombre: string, customPrompt?: string, apiKey?: string): Promise<SindicatoData> => {
  const ai = getClient(apiKey);
  const year = new Date().getFullYear();

  try {
    const model = 'gemini-2.5-flash'; 
    
    const prompt = `REALIZA UNA AUDITORÍA SALARIAL PARA: "${sindicatoNombre}".
    1. Identifica líderes, sede y URL DE LOGO.
    2. BUSCA EXHAUSTIVAMENTE TODOS LOS ACUERDOS DE ${year}.
    3. Calcula el porcentaje total acumulado del año (número exacto).
    4. Redacta el resumen de tramos.
    5. NO inventes datos. Si no hay datos oficiales, indícalo.`;

    // Use custom prompt if provided, otherwise default
    const systemInstruction = customPrompt || DEFAULT_PROMPTS.INVESTIGATION;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "{}";
    const data = cleanAndParseJson(text);
    
    if (!data.nombre || !data.slug) {
      throw new Error("La estructura generada está incompleta.");
    }

    return data;

  } catch (error) {
    console.error("Error generating union content:", error);
    throw error;
  }
};

// --- INVESTIGACIÓN GRANULAR POR SECCIÓN ---

export const investigarComision = async (sindicatoNombre: string, customPrompt?: string, apiKey?: string): Promise<ComisionMiembro[]> => {
    const ai = getClient(apiKey);

    const prompt = customPrompt || `Investiga EXCLUSIVAMENTE la Comisión Directiva ACTUAL del sindicato: "${sindicatoNombre}".
    Devuelve un JSON con un array de objetos: [{ "nombre": "Nombre Apellido", "cargo": "Cargo Exacto" }].
    Prioriza Secretario General, Adjunto, Gremial y Tesorero.
    NO incluyas markdown. Solo el JSON array.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    });

    const data = cleanAndParseJson(response.text || "[]");
    return Array.isArray(data) ? data : (data.comisionDirectiva || []);
};

export const investigarParitarias = async (sindicatoNombre: string, customPrompt?: string, apiKey?: string): Promise<Record<string, AcuerdoParitario>> => {
    const ai = getClient(apiKey);
    const year = new Date().getFullYear();

    const prompt = customPrompt || `Eres un auditor salarial. Investiga la paritaria acumulada del AÑO ${year} para el sindicato: "${sindicatoNombre}".
    
    Devuelve un JSON con un objeto donde la clave es un UUID y el valor es:
    {
      "periodo": "Año ${year}",
      "porcentajeAumento": "Número + % (Ej: 85%)",
      "fechaFirma": "YYYY-MM-DD",
      "detalleTexto": "Resumen cronológico de los tramos.",
      "enlaceFuente": "URL oficial"
    }
    
    IMPORTANTE: Calcula el acumulado anual real.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    });

    const data = cleanAndParseJson(response.text || "{}");
    // Handle if it returns structure inside 'paritarias' key or direct object
    return data.paritarias ? data.paritarias : data;
};

export const investigarAcciones = async (sindicatoNombre: string, customPrompt?: string, apiKey?: string): Promise<Record<string, AccionGremial>> => {
    const ai = getClient(apiKey);

    const prompt = customPrompt || `Investiga acciones gremiales (Paros, Movilizaciones, Asambleas, Denuncias) realizadas por "${sindicatoNombre}" en los ÚLTIMOS 60 DÍAS.
    
    Devuelve un JSON con un objeto map donde las claves son UUIDs y los valores:
    {
        "titulo": "Título Acción",
        "tipo": "medida-fuerza" | "movilizacion" | "asamblea" | "denuncia",
        "fecha": "YYYY-MM-DD",
        "lugar": "Lugar",
        "fuente": "URL",
        "descripcion": "Breve descripción"
    }
    Si no hay recientes, devuelve un objeto vacío {}.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    });

    const data = cleanAndParseJson(response.text || "{}");
    return data.acciones ? data.acciones : data;
};

export const buscarLogos = async (nombre: string, sigla: string, apiKey?: string): Promise<string[]> => {
    const ai = getClient(apiKey);

    const termSigla = sigla && sigla !== 'sin-id' ? sigla : nombre;

    // Prompt optimizado para que la IA actúe como un motor de búsqueda de imágenes
    const prompt = `Search specifically for the OFFICIAL LOGO image of the labor union: "${nombre}" (${termSigla}) in Argentina.
    
    TASK:
    1. Find 6 to 8 direct URLs to image files (png, jpg, jpeg) representing the logo.
    2. Look for official websites, twitter profiles, or wikipedia.
    3. Return strictly a JSON array of strings.
    
    Example Output:
    ["https://site.com/logo.png", "https://wikimedia.org/logo.jpg"]
    
    IF YOU CANNOT FIND IMAGES, RETURN AN EMPTY ARRAY []. DO NOT RETURN PLAIN TEXT.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }],
                // Low temp to force JSON structure adherence
                temperature: 0.2
            }
        });

        const text = response.text || "[]";
        // Attempt to parse. If it fails or isn't an array, catch block handles it.
        const data = cleanAndParseJson(text);
        return Array.isArray(data) ? data : [];
    } catch (e: any) {
        console.warn("Logo search warning:", e.message);
        return [];
    }
};


export interface UrlAnalysisResult {
    sindicatoMatch: { nombre: string; slug: string };
    tipoDetectado: 'accion' | 'paritaria' | 'general' | 'error' | 'multi-accion';
    data: AccionGremial | AcuerdoParitario | SindicatoData | AccionGremial[] | null;
    errorMessage?: string;
}

export const analizarFuenteExterna = async (url: string, dbContext: {slug: string, nombre: string}[] = [], customPrompt?: string, apiKey?: string): Promise<UrlAnalysisResult> => {
    const ai = getClient(apiKey);

    // Ensure we have a valid context string
    const dbContextString = JSON.stringify(dbContext || []);

    const today = new Date();
    const currentYear = today.getFullYear();
    const todayString = today.toISOString().split('T')[0];

    // Replace placeholders in template
    let systemPrompt = customPrompt || DEFAULT_PROMPTS.LINK_ANALYSIS;
    
    // Simple template replacement
    systemPrompt = systemPrompt.replace(/{{todayString}}/g, todayString)
                               .replace(/{{currentYear}}/g, currentYear.toString())
                               .replace(/{{dbContextString}}/g, dbContextString)
                               .replace(/{{url}}/g, url);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analiza este enlace con EXTREMA PRECISIÓN e inteligencia deductiva: ${url}`,
            config: {
                systemInstruction: systemPrompt,
                tools: [{ googleSearch: {} }],
                temperature: 0.1 // Baja temperatura para mayor precisión en datos
            }
        });

        const text = response.text || "{}";
        
        try {
            const result = cleanAndParseJson(text);
            
            if (result.tipoDetectado === 'error') {
                throw new Error(result.errorMessage || "No se pudo leer el enlace.");
            }

            if (!result.sindicatoMatch || !result.data) {
                 throw new Error("Datos no identificados en el análisis.");
            }

            // Ensure source is set correctly
            if (Array.isArray(result.data)) {
                 result.data.forEach((d: any) => d.fuente = url);
            } else if (result.data) {
                (result.data as any).fuente = url;
            }

            return result;
        } catch (parseError: any) {
            // Check specifically for generic failure in text response
            if (text.includes("no pude") || text.includes("error")) {
                 throw new Error("La IA no pudo estructurar la información. Intente copiar el texto del post manualmente.");
            }
            throw parseError;
        }

    } catch (error: any) {
        console.error("Error analyzing URL:", error);
        throw new Error(error.message || "No se pudo analizar el enlace.");
    }
};

// --- PROCESAMIENTO MASIVO DE NOTICIAS (FEED) ---
export const analizarNoticiasMasivas = async (noticias: NewsItem[], customPrompt?: string, apiKey?: string): Promise<UrlAnalysisResult[]> => {
    const ai = getClient(apiKey);

    // Limitamos a 20 noticias para contexto
    const cables = noticias.slice(0, 20).map((n, i) => `[ID_${i}] Fecha: ${n.pubDate} | Título: ${n.title} | Desc: ${n.description} | Link: ${n.link}`).join('\n\n');
    const today = new Date().toISOString().split('T')[0];

    let systemPrompt = customPrompt || DEFAULT_PROMPTS.NEWS_ANALYSIS;
    systemPrompt = systemPrompt.replace(/{{today}}/g, today);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analiza estos cables y extrae acciones:\n${cables}`,
            config: {
                systemInstruction: systemPrompt,
                // No search tools needed, context is provided
            }
        });

        const text = response.text || "[]";
        const results = cleanAndParseJson(text);

        if (!Array.isArray(results)) {
            return [];
        }

        return results;

    } catch (error) {
        console.error("Error analyzing news batch:", error);
        throw new Error("Error al procesar cables.");
    }
};

// --- CHAT AGENT (Database Operator) ---
export const chatWithDatabaseAgent = async (
    userMessage: string, 
    databaseContext: SindicatoData[],
    customPrompt?: string,
    apiKey?: string
): Promise<{ reply: string, action?: any }> => {
    const ai = getClient(apiKey);

    // Simplificar contexto DB para ahorrar tokens, solo enviamos nombres, slugs y datos clave
    const dbSummary = databaseContext.map(u => ({
        slug: u.slug,
        nombre: u.nombre,
        lider: u.comisionDirectiva?.[0]?.nombre || 'N/A',
        sede: u.datosBasicos?.sedePrincipal || 'N/A'
    }));

    let systemPrompt = customPrompt || DEFAULT_PROMPTS.CHAT_AGENT;
    systemPrompt = systemPrompt.replace(/{{dbSummary}}/g, JSON.stringify(dbSummary));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userMessage,
            config: {
                systemInstruction: systemPrompt,
                tools: [{ googleSearch: {} }] 
            }
        });

        const text = response.text || "No tengo respuesta.";
        
        // Detect JSON action
        if (text.includes("```json")) {
            const jsonPart = cleanAndParseJson(text);
            return {
                reply: jsonPart.explanation || "Acción ejecutada.",
                action: jsonPart
            };
        }

        return { reply: text };

    } catch (error) {
        console.error("Chat Error:", error);
        return { reply: "Lo siento, hubo un error de conexión con el agente." };
    }
};
