import React from "react";

export default function StockModal({
  stockModal,
  setStockModal,
  stockTargetPrinterId,
  setStockTargetPrinterId,
  savingStock,
  handleConfirmStockReduction,
  printers
}) {

  if (!stockModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={() => setStockModal(prev => ({ ...prev, isOpen: false }))}
      ></div>

      {/* Modal Container */}
      <div className="absolute bottom-0 left-0 w-full bg-surface rounded-t-3xl p-6 shadow-2xl transition-transform max-w-lg mx-auto left-1/2 -translate-x-1/2 flex flex-col max-h-[85vh] overflow-hidden border border-outline-variant/30 animate-fade-in z-10">
        <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mb-6 shrink-0"></div>

        <div className="flex justify-between items-center mb-4 shrink-0">
          <div>
            <h2 className="font-headline-lg text-lg text-primary font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">inventory_2</span>
              Descontar Repuesto de Stock
            </h2>
            <p className="text-xs text-outline font-semibold">
              Modelo: {stockModal.modelo} | Tipo: {stockModal.insumo} ({stockModal.origin})
            </p>
          </div>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-high active:scale-90"
            onClick={() => setStockModal(prev => ({ ...prev, isOpen: false }))}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="space-y-4 mb-6 flex-grow overflow-y-auto pr-1">
          <div className="p-4 bg-primary-fixed-dim/20 border border-primary/20 rounded-2xl text-xs text-on-surface-variant leading-relaxed">
            Vas a reducir el stock de <strong>{stockModal.insumo}</strong> en 1 unidad (quedarán <strong>{stockModal.currentValue - 1}</strong>).
            <br /><br />
            Si este repuesto se va a instalar en una impresora del inventario, selecciónala a continuación para <strong>restaurar su nivel al 100%</strong> y registrar el cambio en su historial de forma automática.
          </div>

          {/* Printer Selection Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block">
              Asociar a Impresora ({stockModal.modelo})
            </label>
            <select
              value={stockTargetPrinterId}
              onChange={(e) => setStockTargetPrinterId(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm text-on-surface"
            >
              <option value="">-- Seleccionar impresora (opcional) --</option>
              <option value="none">Ninguna (Solo descontar del stock)</option>
              {printers
                .filter(p => (p.modelo || "").toUpperCase() === stockModal.modelo.toUpperCase())
                .map(p => {
                  let levelText = "";
                  if (stockModal.field.startsWith("toner")) {
                    levelText = `Tóner: ${p.consumibles?.toner_nivel ?? 100}%`;
                  } else if (stockModal.field.startsWith("unidad")) {
                    levelText = `U. Imagen: ${p.consumibles?.unidad_imagen_nivel ?? 100}%`;
                  } else if (stockModal.field.startsWith("mantenimiento")) {
                    levelText = `Kit: ${p.consumibles?.mantenimiento_kit_nivel ?? 100}%`;
                  }

                  return (
                    <option key={p.id_serie} value={p.id_serie}>
                      S/N: {p.id_serie} - {p.area_actual || "Soporte"} ({levelText})
                    </option>
                  );
                })}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-4 shrink-0 border-t border-outline-variant/20 pt-4 bg-surface">
          <button
            type="button"
            className="flex-1 py-3 border border-outline-variant text-on-surface-variant font-bold rounded-xl active:scale-95 transition-all text-xs"
            onClick={() => setStockModal(prev => ({ ...prev, isOpen: false }))}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={savingStock}
            onClick={handleConfirmStockReduction}
            className="flex-[2] py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg active:scale-95 hover:bg-primary-container disabled:opacity-50 transition-all text-xs flex items-center justify-center gap-1"
          >
            {savingStock ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">remove_circle</span>
                <span>Confirmar Descuento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
