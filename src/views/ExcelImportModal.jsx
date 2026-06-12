import React from "react";

export default function ExcelImportModal({
  isExcelImportModalOpen,
  excelFileName,
  isExcelLoading,
  excelData,
  handleConfirmExcelImport,
  setIsExcelImportModalOpen,
  setExcelData,
  setExcelFileName
}) {

  if (!isExcelImportModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={() => { if (!isExcelLoading) setIsExcelImportModalOpen(false); }}
      ></div>

      {/* Modal Container */}
      <div className="absolute bottom-0 left-0 w-full bg-surface rounded-t-3xl p-6 shadow-2xl transition-transform max-w-lg mx-auto left-1/2 -translate-x-1/2 flex flex-col max-h-[90vh] overflow-hidden border border-outline-variant/30 z-10">
        <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mb-6 shrink-0"></div>

        <div className="flex justify-between items-center mb-4 shrink-0">
          <div>
            <h2 className="font-headline-lg text-lg text-primary font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">upload_file</span>
              Importar Inventario Excel
            </h2>
            <p className="text-xs text-outline font-semibold truncate max-w-[280px]">Archivo: {excelFileName}</p>
          </div>
          {!isExcelLoading && (
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-high active:scale-90"
              onClick={() => {
                setIsExcelImportModalOpen(false);
                setExcelData(null);
                setExcelFileName("");
              }}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1 pb-4">
          {isExcelLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <span className="material-symbols-outlined text-primary text-5xl animate-spin">sync</span>
              <div className="space-y-1">
                <p className="font-bold text-sm text-on-surface">Analizando con Gemini AI...</p>
                <p className="text-xs text-outline">Leyendo celdas, normalizando áreas y clasificando criticidad en tiempo real.</p>
              </div>
            </div>
          ) : excelData ? (
            <div className="space-y-4">
              {/* AI Report Card */}
              <div className="p-4 bg-primary-fixed-dim/20 border border-primary/20 rounded-2xl space-y-2">
                <h3 className="text-xs font-bold text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm animate-pulse-subtle">smart_toy</span>
                  Análisis de la IA
                </h3>
                <div className="text-xs text-on-surface-variant whitespace-pre-line leading-relaxed italic bg-surface/50 p-3 rounded-xl border border-outline-variant/20 max-h-40 overflow-y-auto">
                  {excelData.reporte_resumen}
                </div>
              </div>

              {/* Table Preview */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-outline uppercase tracking-wider">Vista Previa de Equipos ({excelData.equipos_normalizados?.length || 0})</h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {excelData.equipos_normalizados?.map((eq) => (
                    <div key={eq.id_serie} className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-on-surface">{eq.modelo}</span>
                          <span className="text-[10px] text-outline font-mono">S/N: {eq.id_serie}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                          <span className="material-symbols-outlined text-[10px]">
                            {eq.ubicacion_entidad === "Hospital" ? "local_hospital" : "corporate_fare"}
                          </span>
                          <span>{eq.ubicacion_entidad} ({eq.area_actual})</span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div className="text-[10px] font-semibold text-outline text-right">
                          <div>T: {eq.toner_nivel}%</div>
                          <div>U: {eq.unidad_imagen_nivel}%</div>
                          <div>K: {eq.mantenimiento_kit_nivel ?? 100}%</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase shrink-0 ${(eq.estado_funcionamiento || eq.estado_criticidad) === "Inoperativo" || (eq.estado_funcionamiento || eq.estado_criticidad) === "Crítico"
                          ? "bg-error-container text-error border border-error/20"
                          : (eq.estado_funcionamiento || eq.estado_criticidad) === "Advertencia"
                            ? "bg-tertiary-fixed text-tertiary border border-tertiary/20"
                            : "bg-green-100 text-green-800 border border-green-200"
                          }`}>
                          {eq.estado_funcionamiento || eq.estado_criticidad || "Operativo"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-outline text-xs">
              Ocurrió un error al cargar los datos del archivo Excel.
            </div>
          )}
        </div>

        {/* Actions */}
        {!isExcelLoading && excelData && (
          <div className="flex gap-3 pb-4 shrink-0 border-t border-outline-variant/20 pt-4 bg-surface">
            <button
              type="button"
              className="flex-1 py-3 border border-outline-variant text-on-surface-variant font-bold rounded-xl active:scale-95 transition-all text-xs"
              onClick={() => {
                setIsExcelImportModalOpen(false);
                setExcelData(null);
                setExcelFileName("");
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmExcelImport}
              className="flex-[2] py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg active:scale-95 hover:bg-primary-container transition-all text-xs flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">cloud_upload</span>
              <span>Confirmar e Importar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
