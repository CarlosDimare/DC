import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface DolarData {
  casa: string;
  compra: number;
  venta: number;
  nombre: string;
}

const EconomicTicker: React.FC = () => {
  const [dolares, setDolares] = useState<DolarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // PRIMARY API
        const response = await fetch('https://dolarapi.com/v1/dolares');
        if (!response.ok) throw new Error("Primary API failed");
        
        const data = await response.json();
        const relevant = data.filter((d: any) => ['oficial', 'blue', 'bolsa'].includes(d.casa));
        setDolares(relevant);
        setLoading(false);
        setError(false);

      } catch (err) {
        console.warn("Primary economic API failed, attempting backup...", err);
        
        try {
            // BACKUP API: Bluelytics
            const resBackup = await fetch('https://api.bluelytics.com.ar/v2/latest');
            if (!resBackup.ok) throw new Error("Backup API failed");
            
            const dataBackup = await resBackup.json();
            
            // Map Bluelytics structure to our DolarData interface
            const mapped: DolarData[] = [
                { 
                    casa: 'oficial', 
                    nombre: 'Oficial', 
                    compra: dataBackup.oficial.value_buy, 
                    venta: dataBackup.oficial.value_sell 
                },
                { 
                    casa: 'blue', 
                    nombre: 'Blue', 
                    compra: dataBackup.blue.value_buy, 
                    venta: dataBackup.blue.value_sell 
                }
            ];
            setDolares(mapped);
            setLoading(false);
            setError(false);

        } catch (err2) {
            console.error("All economic data providers failed.", err2);
            setError(true);
            setLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="h-8 bg-red-900 w-full animate-pulse"></div>;

  // Fallback UI in case of error
  if (error || dolares.length === 0) {
      return (
        <div className="bg-red-900 border-b border-red-950 text-white text-xs font-mono py-2 px-4 flex items-center justify-between">
            <span className="font-bold text-red-200 tracking-widest uppercase flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> INDICADORES
            </span>
            <span className="flex items-center gap-2 opacity-50">
                <AlertCircle className="w-3 h-3" />
                <span>Datos de mercado no disponibles</span>
            </span>
        </div>
      );
  }

  return (
    <div className="bg-red-900 border-b border-red-950 text-white text-xs font-mono py-2 overflow-hidden relative shadow-inner">
      <div className="ticker-wrap flex items-center">
        <div className="ticker inline-flex gap-8 items-center px-4">
          <span className="font-bold text-red-200 tracking-widest uppercase flex items-center gap-1">
             <TrendingUp className="w-3 h-3" /> MERCADO DE CAMBIOS
          </span>
          {dolares.map((d) => (
            <span key={d.casa} className="flex items-center gap-2">
              <span className="uppercase text-red-200 font-bold">{d.nombre}:</span>
              <span className="text-white">C: ${d.compra} / V: ${d.venta}</span>
            </span>
          ))}
          <span className="text-red-300">|</span>
          <span className="flex items-center gap-2">
            <span className="uppercase text-red-200 font-bold">INFLACIÓN (EST):</span>
            <span className="text-white">4.2% MENSUAL</span>
          </span>
           <span className="text-red-300">|</span>
           <span className="flex items-center gap-2">
            <span className="uppercase text-red-200 font-bold">RIESGO PAÍS:</span>
            <span className="text-white">1450 PB</span>
          </span>
           {/* Duplicate content for seamless loop */}
           <span className="text-red-300 mx-4">///</span>
           {dolares.map((d) => (
            <span key={`${d.casa}-dup`} className="flex items-center gap-2">
              <span className="uppercase text-red-200 font-bold">{d.nombre}:</span>
              <span className="text-white">C: ${d.compra} / V: ${d.venta}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EconomicTicker;