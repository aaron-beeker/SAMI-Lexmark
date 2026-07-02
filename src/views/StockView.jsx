import React from "react";
import { useAuthContext } from '../contexts/AuthContext';
import { useDataContext } from '../contexts/DataContext';


export default function StockView() {
  const { isAuthenticated } = useAuthContext();
  const { repuestos, handleDecrementStockClick, updateManualStock } = useDataContext();

  const renderStockControls = (itemId, field, value, textColor = "") => {
    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleDecrementStockClick(itemId, field, value || 0)}
            className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
          >-</button>
          <span className={`font-bold min-w-[12px] text-center ${textColor}`}>{value ?? 0}</span>
          <button
            type="button"
            onClick={() => updateManualStock(itemId, field, (value || 0) + 1)}
            className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
          >+</button>
        </div>
      );
    }
    return <span className={`font-bold min-w-[12px] text-center pr-1.5 ${textColor}`}>{value ?? 0}</span>;
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-md text-lg text-on-background font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">inventory_2</span>
          Repuestos en Stock
        </h2>
        <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">
          Depósito & Hospital
        </span>
      </div>

      <div className="bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm space-y-4">
        {repuestos.length === 0 ? (
          <p className="text-xs text-outline text-center py-4">Cargando stock...</p>
        ) : (
          repuestos.map(item => (
            <div key={item.id} className="border-b border-outline-variant/30 last:border-0 pb-3 last:pb-0 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-on-background">{item.modelo}</span>
                <span className="text-[10px] text-outline font-medium">Stock de Repuestos</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Toner Stock Card */}
                <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20 space-y-1.5">
                  <span className="text-[9px] font-bold text-outline block uppercase tracking-wider text-center">Tóner</span>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-on-surface-variant">Hosp:</span>
                    {renderStockControls(item.id, "toner_hospital", item.toner_hospital)}
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-on-surface-variant">Dep:</span>
                    {renderStockControls(item.id, "toner_deposito", item.toner_deposito, "text-primary")}
                  </div>
                </div>

                {/* Maintenance Kit Stock Card */}
                <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20 space-y-1.5">
                  <span className="text-[9px] font-bold text-outline block uppercase tracking-wider text-center">Kit Mant.</span>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-on-surface-variant">Hosp:</span>
                    {renderStockControls(item.id, "mantenimiento_hospital", item.mantenimiento_hospital)}
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-on-surface-variant">Dep:</span>
                    {renderStockControls(item.id, "mantenimiento_deposito", item.mantenimiento_deposito, "text-tertiary")}
                  </div>
                </div>

                {/* Image Unit Stock Card */}
                <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20 space-y-1.5">
                  <span className="text-[9px] font-bold text-outline block uppercase tracking-wider text-center">Unid. Imagen</span>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-on-surface-variant">Hosp:</span>
                    {renderStockControls(item.id, "unidad_hospital", item.unidad_hospital)}
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-on-surface-variant">Dep:</span>
                    {renderStockControls(item.id, "unidad_deposito", item.unidad_deposito, "text-secondary")}
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
