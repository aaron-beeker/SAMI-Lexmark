import React from "react";

export default function PrinterModal({
  handleSavePrinterChanges,
  handleCloseEditModal,
  selectedPrinter,
  isCreateMode,
  editIdSerie,
  setEditIdSerie,
  editModelo,
  setEditModelo,
  editArea,
  setEditArea,
  editUbicacion,
  setEditUbicacion,
  editToner,
  setEditToner,
  editUnit,
  setEditUnit,
  editMantenimiento,
  setEditMantenimiento,
  editObservaciones,
  setEditObservaciones,
  editCasCode,
  setEditCasCode,
  editDetalleCaso,
  setEditDetalleCaso,
  editIp,
  setEditIp,
  editFuncionamiento,
  setEditFuncionamiento,
  editFuncionamientoAuto,
  setEditFuncionamientoAuto,
  selectedPrinterHistory,
  handleDeleteHistoryItem,
  handleDeletePrinter,
  savingEdit
}) {

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity" onClick={handleCloseEditModal}></div>

      {/* Modal Container */}
      <form
        onSubmit={handleSavePrinterChanges}
        className="absolute bottom-0 left-0 w-full bg-surface rounded-t-3xl p-6 shadow-2xl transition-transform max-w-lg mx-auto left-1/2 -translate-x-1/2 flex flex-col max-h-[85vh] overflow-y-auto scrollbar-hide border border-outline-variant/30 z-10"
      >
        <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mb-6 shrink-0"></div>

        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="font-headline-lg text-lg text-primary font-bold">
              {isCreateMode ? "Registrar Nueva Impresora" : "Editar Impresora"}
            </h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              {!isCreateMode && selectedPrinter && (
                <>
                  <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">S/N: {selectedPrinter.id_serie}</span>
                  <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">{selectedPrinter.modelo}</span>
                </>
              )}
              {isCreateMode && (
                <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">{editModelo}</span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                editFuncionamiento === "Inoperativo"
                  ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                  : editFuncionamiento === "Advertencia"
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                }`}>
                <span className="material-symbols-outlined text-[11px]">
                  {editFuncionamiento === "Inoperativo" ? "cancel" : editFuncionamiento === "Advertencia" ? "warning" : "check_circle"}
                </span>
                {editFuncionamiento} {editFuncionamiento !== "Inoperativo" ? ((editUbicacion || "Hospital") === "Hospital" && !(editArea || "").toLowerCase().includes("soporte") ? " • En Servicio" : " • Sin Servicio") : ""}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high active:scale-90"
            onClick={handleCloseEditModal}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4 mb-6 flex-grow">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Número de Serie</label>
              <input
                type="text"
                value={editIdSerie}
                onChange={(e) => setEditIdSerie(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm uppercase"
                placeholder="Ej. 701924410D8X7"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Modelo</label>
              <select
                value={editModelo}
                onChange={(e) => setEditModelo(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm text-on-surface"
              >
                <option value="MX431ADN">MX431ADN</option>
                <option value="MX632ADWE">MX632ADWE</option>
                <option value="MX722ADHE">MX722ADHE</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Área de Ubicación</label>
              <input
                type="text"
                value={editArea}
                onChange={(e) => setEditArea(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm"
                placeholder="Ej. Soporte, C.E Otorrino..."
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Ubicación Física</label>
              <select
                value={editUbicacion}
                onChange={(e) => setEditUbicacion(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm text-on-surface"
              >
                <option value="Hospital">Hospital</option>
                <option value="MUR">MUR</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">% Tóner</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editToner}
                  onChange={(e) => setEditToner(Number(e.target.value))}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 pr-8 focus:ring-primary focus:border-primary font-body-md text-xs"
                  required
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline font-bold text-[10px]">%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">% Kit Mant.</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editMantenimiento}
                  onChange={(e) => setEditMantenimiento(Number(e.target.value))}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 pr-8 focus:ring-primary focus:border-primary font-body-md text-xs"
                  required
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline font-bold text-[10px]">%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">% U. Imagen</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editUnit}
                  onChange={(e) => setEditUnit(Number(e.target.value))}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 pr-8 focus:ring-primary focus:border-primary font-body-md text-xs"
                  required
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline font-bold text-[10px]">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Dirección IP</label>
              <input
                type="text"
                value={editIp}
                onChange={(e) => setEditIp(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm"
                placeholder="Ej. 192.168.1.15 (Opcional)"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Código de Caso CAS</label>
              <input
                type="text"
                value={editCasCode}
                onChange={(e) => setEditCasCode(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm"
                placeholder="Ej. CAS-6013278-V6N2C5 (Opcional)"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider font-extrabold text-primary">Detalle del Caso CAS</label>
            <textarea
              value={editDetalleCaso}
              onChange={(e) => setEditDetalleCaso(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm h-16 resize-none"
              placeholder="Escribe aquí los detalles, diagnóstico o notas para este caso CAS (Opcional)..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Observaciones</label>
            <textarea
              value={editObservaciones}
              onChange={(e) => setEditObservaciones(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm resize-none h-16"
              placeholder="Notas o fallas (Ej. Se traba papel...)"
            />
          </div>

          {/* Operational Status Override Controls */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[11.5px] font-bold text-outline uppercase tracking-wider">
                Estado de Funcionamiento
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-primary select-none">
                <input
                  type="checkbox"
                  checked={editFuncionamientoAuto}
                  onChange={(e) => setEditFuncionamientoAuto(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5"
                />
                Auto-calcular
              </label>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                disabled={editFuncionamientoAuto}
                onClick={() => setEditFuncionamiento("Operativo")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  editFuncionamiento === "Operativo"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 font-extrabold"
                    : "bg-surface text-on-surface-variant border-outline-variant opacity-60"
                } ${editFuncionamientoAuto ? "cursor-not-allowed opacity-50 bg-emerald-500/5 border-emerald-500/10 text-emerald-600/70" : "active:scale-[0.98]"}`}
              >
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                Operativo
              </button>
              <button
                type="button"
                disabled={editFuncionamientoAuto}
                onClick={() => setEditFuncionamiento("Advertencia")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  editFuncionamiento === "Advertencia"
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-700 font-extrabold"
                    : "bg-surface text-on-surface-variant border-outline-variant opacity-60"
                } ${editFuncionamientoAuto ? "cursor-not-allowed opacity-50 bg-amber-500/5 border-amber-500/10 text-amber-600/70" : "active:scale-[0.98]"}`}
              >
                <span className="material-symbols-outlined text-[15px]">warning</span>
                Advertencia
              </button>
              <button
                type="button"
                disabled={editFuncionamientoAuto}
                onClick={() => setEditFuncionamiento("Inoperativo")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  editFuncionamiento === "Inoperativo"
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-700 font-extrabold"
                    : "bg-surface text-on-surface-variant border-outline-variant opacity-60"
                } ${editFuncionamientoAuto ? "cursor-not-allowed opacity-50 bg-rose-500/5 border-rose-500/10 text-rose-600/70" : "active:scale-[0.98]"}`}
              >
                <span className="material-symbols-outlined text-[15px]">cancel</span>
                Inoperativo
              </button>
            </div>
          </div>

          {/* Individual History Timeline in modal */}
          {selectedPrinterHistory.length > 0 && (
            <div className="pt-4 border-t border-outline-variant/30 space-y-2">
              <h4 className="text-[11px] font-bold text-outline uppercase tracking-wider">Historial Reciente del Equipo</h4>
              <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                {selectedPrinterHistory.map((hist) => (
                  <div key={hist.id} className="bg-surface-container-low p-3 rounded-xl text-[11px] border border-outline-variant/20 space-y-1.5 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {String(hist.tipo_actualizacion || "").toLowerCase().includes("ia") || String(hist.tipo_actualizacion || "").toLowerCase().includes("gemini") ? (
                          <span className="flex items-center gap-0.5 text-[8px] bg-primary-fixed text-primary px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[10px]">smart_toy</span>
                            IA
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[8px] bg-outline-variant/30 text-on-surface-variant px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[10px]">person</span>
                            Manual
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border ${
                          (hist.estado_funcionamiento || hist.estado_criticidad) === "Inoperativo" || (hist.estado_funcionamiento || hist.estado_criticidad) === "Crítico"
                            ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            : (hist.estado_funcionamiento || hist.estado_criticidad) === "Advertencia"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          }`}>
                          {hist.estado_funcionamiento || hist.estado_criticidad || "Operativo"}
                        </span>
                        <span className="text-[10px] text-outline font-medium">
                          {hist.tipo_actualizacion || "Manual"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-outline font-mono font-medium text-right">
                          {hist.fecha_lectura instanceof Date
                            ? `${hist.fecha_lectura.toLocaleDateString("es-PE")} ${hist.fecha_lectura.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}`
                            : hist.fecha_lectura?.toDate
                              ? `${hist.fecha_lectura.toDate().toLocaleDateString("es-PE")} ${hist.fecha_lectura.toDate().toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}`
                              : hist.fecha_lectura 
                                ? `${new Date(hist.fecha_lectura).toLocaleDateString("es-PE")} ${new Date(hist.fecha_lectura).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}`
                                : ""
                          }
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryItem(hist.id)}
                          className="text-error hover:bg-error/10 p-0.5 rounded-full transition-colors active:scale-90 flex items-center justify-center"
                          title="Eliminar de historial"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Change details */}
                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-outline-variant/20 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-outline block uppercase">Niveles Registrados</span>
                        <span className="font-semibold text-on-surface">
                          Tóner: <span className={hist.toner_nivel <= 15 ? "text-error" : "text-primary"}>{hist.toner_nivel}%</span> | 
                          Unidad: <span className={hist.unidad_imagen_nivel <= 15 ? "text-error" : "text-secondary"}>{hist.unidad_imagen_nivel}%</span> | 
                          Kit: <span className={(hist.mantenimiento_kit_nivel ?? 100) <= 15 ? "text-error" : "text-tertiary"}>{hist.mantenimiento_kit_nivel ?? 100}%</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-outline block uppercase">Ubicación y Área</span>
                        <span className="font-semibold text-on-surface">
                          {hist.ubicacion_entidad || "Hospital"}{hist.area_actual ? ` - ${hist.area_actual}` : ""}
                        </span>
                      </div>
                    </div>

                    {hist.codigo_caso_cas && (
                      <div className="text-[9px] font-bold text-primary bg-primary-fixed/40 px-1.5 py-0.5 rounded w-fit">
                        CAS: {hist.codigo_caso_cas}
                      </div>
                    )}

                    {hist.observaciones && (
                      <p className="text-[10px] italic text-on-surface-variant bg-surface-container-high/50 px-2 py-1 rounded border border-dashed border-outline-variant/30 leading-snug">
                        <strong>Obs:</strong> {hist.observaciones}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pb-8 shrink-0">
          <div className="flex gap-3">
            {!isCreateMode && (
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleDeletePrinter}
                className="flex-1 py-3.5 bg-error-container text-on-error-container border border-error/20 font-bold rounded-2xl active:scale-95 transition-all hover:bg-error-container/80 text-sm flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>Eliminar</span>
              </button>
            )}
            <button
              type="button"
              className="flex-1 py-3.5 border border-outline-variant text-on-surface-variant font-bold rounded-2xl active:scale-95 transition-all hover:bg-surface-container-low text-sm"
              onClick={handleCloseEditModal}
            >
              Cancelar
            </button>
          </div>
          <button
            type="submit"
            disabled={savingEdit}
            className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-2xl shadow-lg active:scale-95 hover:bg-primary-container transition-all text-sm flex items-center justify-center gap-1.5"
          >
            {savingEdit ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                Guardando...
              </>
            ) : (
              <>
                <span>Guardar Cambios</span>
                <span className="material-symbols-outlined text-sm">save</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
