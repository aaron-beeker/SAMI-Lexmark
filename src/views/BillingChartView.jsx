import React from "react";
import { useDataContext } from '../contexts/DataContext';
import {  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function BillingChartView() {
  const { billingCycles, loadingBilling } = useDataContext();

  if (loadingBilling) {
    return (
      <div className="bg-surface border border-outline-variant rounded-2xl shadow-sm p-8 text-center text-outline-variant animate-pulse">
        <span className="material-symbols-outlined text-4xl mb-2">hourglass_empty</span>
        <p className="font-semibold">Cargando historial de facturación...</p>
      </div>
    );
  }

  if (!billingCycles || billingCycles.length === 0) {
    return (
      <div className="bg-surface border border-outline-variant rounded-2xl shadow-sm p-8 text-center text-outline-variant">
        <span className="material-symbols-outlined text-4xl mb-2">auto_graph</span>
        <p className="font-semibold text-sm">Aún no hay cortes mensuales registrados.</p>
        <p className="text-xs text-outline mt-1">
          Utiliza el botón "Cerrar Mes" para registrar el histórico del primer periodo.
        </p>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = billingCycles.map(cycle => ({
    name: cycle.periodo,
    Hojas: cycle.total_hojas || 0,
    Caras: cycle.total_caras || 0
  }));

  return (
    <div className="bg-surface border border-outline-variant rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">monitoring</span>
          Evolución Histórica (Cierres Día 19)
        </h3>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#757684' }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#757684' }} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(value) => new Intl.NumberFormat('es-PE', { notation: "compact", compactDisplay: "short" }).format(value)}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '0px', border: '1px solid #dcdce4', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ fontWeight: 800, fontSize: '12px' }}
              labelStyle={{ fontWeight: 700, fontSize: '10px', color: '#757684', marginBottom: '4px' }}
              formatter={(value) => new Intl.NumberFormat('es-PE').format(value)}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} 
              iconType="circle"
            />
            <Line 
              type="monotone" 
              dataKey="Hojas" 
              stroke="#2563eb" 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2 }} 
              activeDot={{ r: 6 }} 
            />
            <Line 
              type="monotone" 
              dataKey="Caras" 
              stroke="#db2777" 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2 }} 
              activeDot={{ r: 6 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
