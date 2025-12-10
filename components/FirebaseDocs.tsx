import React from 'react';

const FirebaseDocs: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg my-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2">Documentación Técnica: Configuración Firebase</h2>
      
      <div className="space-y-8">
        {/* Section 1: Function Code */}
        <section>
          <h3 className="text-lg font-semibold text-blue-700 mb-3">1. Código de Firebase Function (Node.js)</h3>
          <p className="text-sm text-slate-600 mb-3">
            Este código debe implementarse en <code>functions/index.js</code> o <code>functions/src/index.ts</code>.
          </p>
          <pre className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-x-auto text-xs font-mono">
{`const { onCall } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");

const API_KEY = process.env.API_KEY_GEMINI; // Definir en secretos de Firebase
const ai = new GoogleGenAI({ apiKey: API_KEY });

exports.generarContenidoSindical = onCall(async (request) => {
  // Solo usuarios autenticados pueden llamar
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar logueado.');
  }

  const { sindicatoNombre } = request.data;
  const model = "gemini-2.5-flash";

  const systemInstruction = \`... (Insertar prompt definido en la sección 2) ...\`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: \`Investiga y genera JSON para: \${sindicatoNombre}\`,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.1 // Baja temperatura para mayor determinismo
      }
    });

    const text = response.text || "{}";
    const cleanJson = text.replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '').trim();
    
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("Error en Gemini:", error);
    throw new HttpsError('internal', 'Error generando contenido IA');
  }
});`}
          </pre>
        </section>

        {/* Section 2: Optimized Prompt */}
        <section>
          <h3 className="text-lg font-semibold text-blue-700 mb-3">2. Prompt Optimizado para Gemini</h3>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-sm text-slate-800 font-mono whitespace-pre-wrap">
{`Eres un asistente experto en análisis sindical. Tu tarea es generar un objeto JSON estricto para una base de datos Firebase.

ENTRADA: Nombre del Sindicato.

INSTRUCCIONES:
1. Utiliza Google Search para encontrar: Comisión Directiva actual, Sede, Web, 3 Noticias recientes, Próximas acciones y Última Paritaria.
2. Estructura la respuesta EXCLUSIVAMENTE como el siguiente JSON.
3. Para cada dato, DEBES incluir el campo "enlaceFuente" con la URL de donde obtuviste la información.

SCHEMA JSON OBJETIVO:
{
  "nombre": "string",
  "slug": "string-url-safe",
  "comisionDirectiva": [{ "nombre": "string", "cargo": "string" }],
  "datosBasicos": { "sedePrincipal": "string", "sitioWeb": "url" },
  "noticias": {
    "UUID": { "titulo": "string", "fechaPublicacion": "YYYY-MM-DD", "contenidoResumen": "string", "enlaceFuente": "url", "tipo": "accion-pasada" }
  },
  "accionesProximas": {
    "UUID": { "titulo": "string", "fechaEvento": "YYYY-MM-DD", "lugar": "string", "enlaceFuente": "url", "tipo": "accion-proxima" }
  },
  "acuerdosParitarios": {
    "UUID": { "periodo": "string", "porcentajeAumento": "string", "fechaFirma": "YYYY-MM-DD", "detalleTexto": "string", "enlaceFuente": "url" }
  }
}`}
          </div>
        </section>

        {/* Section 3: Security Rules */}
        <section>
          <h3 className="text-lg font-semibold text-blue-700 mb-3">3. Reglas de Seguridad (Firebase Realtime Database)</h3>
          <p className="text-sm text-slate-600 mb-3">
            Guarde esto en su archivo <code>database.rules.json</code>.
          </p>
          <pre className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-x-auto text-xs font-mono">
{`{
  "rules": {
    "sindicatos": {
      ".read": true,  // Lectura pública para el dashboard
      ".write": "auth != null", // Solo editores autenticados pueden escribir/aprobar
      "$slug": {
        ".validate": "newData.hasChildren(['nombre', 'datosBasicos'])"
      }
    }
  }
}`}
          </pre>
        </section>
      </div>
    </div>
  );
};

export default FirebaseDocs;
