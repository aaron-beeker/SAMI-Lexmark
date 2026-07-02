import React, { useState } from "react";
import { useDataContext } from '../contexts/DataContext';


export default function ReplenishmentView() {
  const { printers, repuestos } = useDataContext();

  const [onlyShowWithLacks, setOnlyShowWithLacks] = useState(false);

  // Get all unique models from printers and stock
  const allModels = Array.from(
    new Set([
      ...printers.map((p) => p.modelo),
      ...repuestos.map((r) => r.modelo),
    ])
  ).filter(Boolean);

  const modelsData = allModels.map((model) => {
    const modelPrinters = printers.filter((p) => p.modelo === model);
    
    // Count low levels (<= 15%)
    const lowToner = modelPrinters.filter(
      (p) =>
        p.consumibles?.toner_nivel !== undefined &&
        p.consumibles?.toner_nivel !== null &&
        p.consumibles?.toner_nivel <= 15
    ).length;

    const lowUnit = modelPrinters.filter(
      (p) =>
        p.consumibles?.unidad_imagen_nivel !== undefined &&
        p.consumibles?.unidad_imagen_nivel !== null &&
        p.consumibles?.unidad_imagen_nivel <= 15
    ).length;

    const lowMaint = modelPrinters.filter(
      (p) =>
        p.consumibles?.mantenimiento_kit_nivel !== undefined &&
        p.consumibles?.mantenimiento_kit_nivel !== null &&
        p.consumibles?.mantenimiento_kit_nivel <= 15
    ).length;

    // Find stock matching this model
    const stockItem = repuestos.find((r) => r.modelo === model) || {
      toner_hospital: 0,
      toner_deposito: 0,
      unidad_hospital: 0,
      unidad_deposito: 0,
      mantenimiento_hospital: 0,
      mantenimiento_deposito: 0,
    };

    const stockToner = (stockItem.toner_hospital || 0) + (stockItem.toner_deposito || 0);
    const stockUnit = (stockItem.unidad_hospital || 0) + (stockItem.unidad_deposito || 0);
    const stockMaint = (stockItem.mantenimiento_hospital || 0) + (stockItem.mantenimiento_deposito || 0);

    // Calculate lack / what needs to be bought
    const lackToner = Math.max(0, lowToner - stockToner);
    const lackUnit = Math.max(0, lowUnit - stockUnit);
    const lackMaint = Math.max(0, lowMaint - stockMaint);

    const hasNeeds = lowToner > 0 || lowUnit > 0 || lowMaint > 0;
    const hasLacks = lackToner > 0 || lackUnit > 0 || lackMaint > 0;

    return {
      model,
      toner: { needed: lowToner, stock: stockToner, lack: lackToner },
      unit: { needed: lowUnit, stock: stockUnit, lack: lackUnit },
      maint: { needed: lowMaint, stock: stockMaint, lack: lackMaint },
      hasNeeds,
      hasLacks,
    };
  });

  // Filter based on state toggle
  const filteredModels = onlyShowWithLacks
    ? modelsData.filter((m) => m.hasLacks)
    : modelsData;

  const totalBuyToner = modelsData.reduce((acc, m) => acc + m.toner.lack, 0);
  const totalBuyUnit = modelsData.reduce((acc, m) => acc + m.unit.lack, 0);
  const totalBuyMaint = modelsData.reduce((acc, m) => acc + m.maint.lack, 0);
  const grandTotalToBuy = totalBuyToner + totalBuyUnit + totalBuyMaint;

  return (
    <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-xs font-black text-outline uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
          Análisis de Compras
        </h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyShowWithLacks(!onlyShowWithLacks)}
            className={`text-xs font-bold px-3 py-1.5 border transition-all flex items-center gap-1 bg-surface ${
              onlyShowWithLacks
                ? "border-primary text-primary bg-primary/5"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {onlyShowWithLacks ? "filter_alt" : "filter_alt_off"}
            </span>
            {onlyShowWithLacks ? "Solo con Faltantes" : "Ver Todos"}
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        grandTotalToBuy > 0 
          ? "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-100" 
          : "bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-100"
      }`}>
        <div className="flex items-center gap-3">
          <span className={`material-symbols-outlined text-3xl ${
            grandTotalToBuy > 0 ? "text-amber-500 animate-pulse-subtle" : "text-emerald-500"
          }`}>
            {grandTotalToBuy > 0 ? "shopping_basket" : "check_circle"}
          </span>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tight">
              {grandTotalToBuy > 0 
                ? `Faltan ${grandTotalToBuy} consumibles`
                : "Cobertura de Stock al 100%"}
            </span>
            <span className="text-[10px] uppercase font-bold opacity-70 tracking-wider">
              Equipos Agotados (≤15%) vs Stock Disponible
            </span>
          </div>
        </div>

        {grandTotalToBuy > 0 && (
          <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
            {totalBuyToner > 0 && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-md">
                Tóner: {totalBuyToner}
              </span>
            )}
            {totalBuyUnit > 0 && (
              <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-md">
                U. Imagen: {totalBuyUnit}
              </span>
            )}
            {totalBuyMaint > 0 && (
              <span className="px-2 py-1 bg-tertiary/10 text-tertiary rounded-md">
                Mant: {totalBuyMaint}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid of models */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModels.length === 0 ? (
          <div className="col-span-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-6 text-center text-outline font-bold text-xs uppercase tracking-wider">
            No se requieren compras
          </div>
        ) : (
          filteredModels.map((item) => {
            const hasLacks = item.hasLacks;
            return (
              <div 
                key={item.model} 
                className={`bg-surface-container-low rounded-xl border p-4 transition-all flex flex-col justify-between ${
                  hasLacks 
                    ? "border-amber-500/30 hover:border-amber-500/50 hover:shadow-sm" 
                    : "border-outline-variant/30 hover:border-outline-variant/60"
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3 pb-3 border-b border-outline-variant/20">
                  <div className="flex flex-col">
                    <span className="font-black text-sm text-on-surface tracking-tight">{item.model}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                    hasLacks 
                      ? "bg-amber-500/10 text-amber-600 animate-pulse-subtle" 
                      : "bg-emerald-500/10 text-emerald-600"
                  }`}>
                    {hasLacks ? "Comprar" : "OK"}
                  </span>
                </div>

                {/* Body Table */}
                <div className="space-y-2">
                  {/* Table headers */}
                  <div className="grid grid-cols-12 text-[10px] font-bold text-outline uppercase tracking-wider pb-1">
                    <span className="col-span-5">Consumible</span>
                    <span className="col-span-2 text-center">Bajo</span>
                    <span className="col-span-2 text-center">Stock</span>
                    <span className="col-span-3 text-right">Comprar</span>
                  </div>

                  {/* Consumable Rows */}
                  {[
                    { 
                      name: "Tóner", 
                      icon: "layers", 
                      color: "text-primary",
                      data: item.toner 
                    },
                    { 
                      name: "Kit Mant.", 
                      icon: "build", 
                      color: "text-tertiary",
                      data: item.maint 
                    },
                    { 
                      name: "Unid. Imagen", 
                      icon: "photo_size_select_actual", 
                      color: "text-secondary",
                      data: item.unit 
                    }
                  ].map((row) => {
                    const buyColor = row.data.lack > 0 ? "text-error font-extrabold bg-error-container/40 px-1.5 py-0.5" : "text-emerald-600 font-bold";
                    return (
                      <div 
                        key={row.name} 
                        className="grid grid-cols-12 items-center text-xs py-1.5 border-t border-outline-variant/15 last:border-b-0"
                      >
                        {/* Name + Icon */}
                        <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                          <span className={`material-symbols-outlined text-sm ${row.color}`}>
                            {row.icon}
                          </span>
                          <span className="font-semibold truncate text-on-surface">
                            {row.name}
                          </span>
                        </div>

                        {/* Needed (Bajo en Equipos) */}
                        <span className="col-span-2 text-center font-medium text-on-surface-variant">
                          {row.data.needed}
                        </span>

                        {/* Stock available */}
                        <span className="col-span-2 text-center font-medium text-on-surface-variant">
                          {row.data.stock}
                        </span>

                        {/* To buy count */}
                        <div className="col-span-3 text-right">
                          <span className={`${buyColor}`}>
                            {row.data.lack > 0 ? `+${row.data.lack}` : "OK"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
