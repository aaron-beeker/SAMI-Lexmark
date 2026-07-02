import React from "react";
import { useAuthContext } from '../contexts/AuthContext';
import { useDataContext } from '../contexts/DataContext';


export default function StockView() {
  const { isAuthenticated } = useAuthContext();
  const { repuestos, handleDecrementStockClick, updateManualStock } = useDataContext();

  const renderStockControls = (itemId, field, value, textColor = "") => {
    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-1 bg-surface rounded p-0.5 shadow-sm border border-outline-variant/20">
          <button
            type="button"
            onClick={() => handleDecrementStockClick(itemId, field, value || 0)}
            className="w-5 h-5 flex items-center justify-center bg-surface-container-lowest rounded-sm text-on-surface hover:bg-outline-variant/30 font-black active:scale-90 transition-all"
          >-</button>
          <span className={`font-black min-w-[14px] text-center text-xs ${textColor}`}>{value ?? 0}</span>
          <button
            type="button"
            onClick={() => updateManualStock(itemId, field, (value || 0) + 1)}
            className="w-5 h-5 flex items-center justify-center bg-surface-container-lowest rounded-sm text-on-surface hover:bg-outline-variant/30 font-black active:scale-90 transition-all"
          >+</button>
        </div>
      );
    }
    return <span className={`font-black min-w-[14px] text-center text-xs ${textColor}`}>{value ?? 0}</span>;
  };

  return (
    <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-outline uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">inventory_2</span>
          Inventario de Repuestos
        </h3>
        <span className="text-[9px] font-bold text-on-surface-variant px-2 py-0.5 bg-surface-container-high rounded-full uppercase tracking-wider border border-outline-variant/30">
          Depósito & Hospital
        </span>
      </div>

      <div className="space-y-3">
        {repuestos.length === 0 ? (
          <p className="text-xs text-outline text-center py-4">Cargando stock...</p>
        ) : (
          repuestos.map(item => (
            <div key={item.id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col gap-3">
              
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                <span className="font-black text-sm text-on-surface tracking-tight">{item.modelo}</span>
                <span className="text-[9px] text-outline font-bold uppercase tracking-wider flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">swap_horiz</span>
                  Depósito → Hospital
                </span>
              </div>

              {/* Grid 3-columns for Consumables */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                
                {/* Toner */}
                <div className="flex flex-col gap-1.5 p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/20">
                  <span className="text-[10px] font-bold text-on-surface flex items-center justify-center gap-1 bg-surface-container-low rounded-md py-0.5 border border-outline-variant/10">
                    <span className="material-symbols-outlined text-primary text-[12px]">layers</span>
                    Tóner
                  </span>
                  <div className="flex items-center justify-center gap-4 px-1 py-1">
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] uppercase font-bold text-outline flex items-center gap-0.5 mb-1"><span className="material-symbols-outlined text-[8px]">store</span>Dep</span>
                      {renderStockControls(item.id, "toner_deposito", item.toner_deposito, "text-primary")}
                    </div>
                    <span className="material-symbols-outlined text-outline-variant/50 text-[12px]">arrow_forward</span>
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] uppercase font-bold text-outline flex items-center gap-0.5 mb-1"><span className="material-symbols-outlined text-[8px]">local_hospital</span>Hosp</span>
                      {renderStockControls(item.id, "toner_hospital", item.toner_hospital, "text-on-surface")}
                    </div>
                  </div>
                </div>

                {/* Maintenance Kit */}
                <div className="flex flex-col gap-1.5 p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/20">
                  <span className="text-[10px] font-bold text-on-surface flex items-center justify-center gap-1 bg-surface-container-low rounded-md py-0.5 border border-outline-variant/10">
                    <span className="material-symbols-outlined text-tertiary text-[12px]">build</span>
                    Kit Mant.
                  </span>
                  <div className="flex items-center justify-center gap-4 px-1 py-1">
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] uppercase font-bold text-outline flex items-center gap-0.5 mb-1"><span className="material-symbols-outlined text-[8px]">store</span>Dep</span>
                      {renderStockControls(item.id, "mantenimiento_deposito", item.mantenimiento_deposito, "text-tertiary")}
                    </div>
                    <span className="material-symbols-outlined text-outline-variant/50 text-[12px]">arrow_forward</span>
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] uppercase font-bold text-outline flex items-center gap-0.5 mb-1"><span className="material-symbols-outlined text-[8px]">local_hospital</span>Hosp</span>
                      {renderStockControls(item.id, "mantenimiento_hospital", item.mantenimiento_hospital, "text-on-surface")}
                    </div>
                  </div>
                </div>

                {/* Image Unit */}
                <div className="flex flex-col gap-1.5 p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/20">
                  <span className="text-[10px] font-bold text-on-surface flex items-center justify-center gap-1 bg-surface-container-low rounded-md py-0.5 border border-outline-variant/10">
                    <span className="material-symbols-outlined text-secondary text-[12px]">photo_size_select_actual</span>
                    Unid. Imag.
                  </span>
                  <div className="flex items-center justify-center gap-4 px-1 py-1">
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] uppercase font-bold text-outline flex items-center gap-0.5 mb-1"><span className="material-symbols-outlined text-[8px]">store</span>Dep</span>
                      {renderStockControls(item.id, "unidad_deposito", item.unidad_deposito, "text-secondary")}
                    </div>
                    <span className="material-symbols-outlined text-outline-variant/50 text-[12px]">arrow_forward</span>
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] uppercase font-bold text-outline flex items-center gap-0.5 mb-1"><span className="material-symbols-outlined text-[8px]">local_hospital</span>Hosp</span>
                      {renderStockControls(item.id, "unidad_hospital", item.unidad_hospital, "text-on-surface")}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
