import React from "react";
import { useAuthContext } from '../contexts/AuthContext';
import { useDataContext } from '../contexts/DataContext';


export default function PrinterModal() {
  const { isAuthenticated } = useAuthContext();
  const getWarrantyUrl = (modelo) => {
    if (modelo === "MX431ADN") return "https://support.lexmark.com/es_es/warranty-service/printer/MX431/Lexmark-MX431adn.html";
    if (modelo === "MX632ADWE") return "https://support.lexmark.com/es_es/warranty-service/printer/MX632/Lexmark-MX632adwe.html";
    if (modelo === "MX722ADHE") return "https://support.lexmark.com/es_es/warranty-service/printer/MX722/Lexmark-MX722adhe.html";
    return "https://support.lexmark.com/es_es/warranty-service.html";
  };

  const [isEditing, setIsEditing] = React.useState(false);
  const { handleSavePrinterChanges, handleCloseEditModal, selectedPrinter, isCreateMode, editIdSerie, setEditIdSerie, editModelo, setEditModelo, editArea, setEditArea, editUbicacion, setEditUbicacion, editToner, setEditToner, editUnit, setEditUnit, editMantenimiento, setEditMantenimiento, editObservaciones, setEditObservaciones, editCasCode, setEditCasCode, editDetalleCaso, setEditDetalleCaso, editIp, setEditIp, editGarantia, setEditGarantia, editEstadisticas, setEditEstadisticas, editFuncionamiento, selectedPrinterHistory, handleDeleteHistoryItem, handleDeletePrinter, savingEdit, checkPrinterAlerts } = useDataContext();

  const getCapacities = (modelo) => {
    const mod = (modelo || "").toUpperCase();
    if (mod.includes("MX431")) return { toner: '20000', mant: '100000', unit: '40000' };
    if (mod.includes("MX632")) return { toner: '31000', mant: '200000', unit: '75000' };
    if (mod.includes("MX722")) return { toner: '55000', mant: '225000', unit: '150000' };
    return { toner: '20000', mant: '100000', unit: '40000' }; // Default
  };

  const [calcValues, setCalcValues] = React.useState({
    toner: { cap: '20000', caras: '' },
    mant: { cap: '100000', caras: '' },
    unit: { cap: '40000', caras: '' }
  });

  const handleCalcChange = (type, field, value) => {
    const updated = {
      ...calcValues,
      [type]: {
        ...calcValues[type],
        [field]: value
      }
    };
    setCalcValues(updated);
    
    const cap = Number(updated[type].cap);
    
    if (cap > 0 && updated[type].caras !== '') {
      const caras = Number(updated[type].caras);
      const remaining = cap - caras;
      const percentage = Math.max(0, Math.min(100, Math.round((remaining / cap) * 100)));
      
      if (type === 'toner') setEditToner(percentage);
      if (type === 'mant') setEditMantenimiento(percentage);
      if (type === 'unit') setEditUnit(percentage);
    }
  };

  const isUsbOrOffline = !editIp || editIp.trim().toLowerCase() === "usb";

  React.useEffect(() => {
    setIsEditing(isCreateMode);
    
    const caps = getCapacities(isCreateMode ? editModelo : selectedPrinter?.modelo);
    
    if (!isCreateMode && selectedPrinter) {
      const toner = selectedPrinter.consumibles?.toner_nivel ?? 100;
      const mant = selectedPrinter.consumibles?.mantenimiento_kit_nivel ?? 100;
      const unit = selectedPrinter.consumibles?.unidad_imagen_nivel ?? 100;
      
      setCalcValues({
        toner: { cap: caps.toner, caras: String(Math.round(Number(caps.toner) - (toner * Number(caps.toner) / 100))) },
        mant: { cap: caps.mant, caras: String(Math.round(Number(caps.mant) - (mant * Number(caps.mant) / 100))) },
        unit: { cap: caps.unit, caras: String(Math.round(Number(caps.unit) - (unit * Number(caps.unit) / 100))) }
      });
    } else {
      setCalcValues({
        toner: { cap: caps.toner, caras: '' },
        mant: { cap: caps.mant, caras: '' },
        unit: { cap: caps.unit, caras: '' }
      });
    }
  }, [isCreateMode, selectedPrinter, editModelo]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity" onClick={handleCloseEditModal}></div>

      {/* Modal Container */}
      <form
        onSubmit={handleSavePrinterChanges}
        className="absolute bottom-0 sm:bottom-auto left-0 sm:left-auto w-full bg-surface rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl transition-all max-w-lg sm:max-w-2xl mx-auto sm:my-8 left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-y-auto scrollbar-hide border border-outline-variant/30 z-10"
      >
        <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mb-6 shrink-0"></div>

        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="font-headline-lg text-lg text-primary font-bold">
              {isCreateMode ? "Registrar Nueva Impresora" : (isEditing ? "Editar Impresora" : "Detalles del Equipo")}
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
              {(() => {
                let status = editFuncionamiento === "Advertencia" ? "Operativo" : editFuncionamiento;
                if (status === "Inoperativo") {
                  status = "En Mantenimiento";
                }
                const hasAlerts = editFuncionamiento === "Advertencia" || (selectedPrinter && checkPrinterAlerts(selectedPrinter));
                const isMaint = status === "En Mantenimiento";
                return (
                  <>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                      isMaint
                        ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                        : hasAlerts
                          ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      }`}>
                      <span className="material-symbols-outlined text-[11px]">
                        {isMaint ? "build" : hasAlerts ? "warning" : "check_circle"}
                      </span>
                      {status} {status === "Operativo" && hasAlerts && <span className="text-[9px] lowercase italic font-normal ml-0.5">(con alertas)</span>} {status !== "En Mantenimiento" ? ((editUbicacion || "Hospital") === "Hospital" && !(editArea || "").toLowerCase().includes("soporte") ? " • En Servicio" : " • Sin Servicio") : ""}
                    </span>
                  {!isCreateMode && selectedPrinter && selectedPrinter.garantia_vencimiento && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                      new Date() > new Date(selectedPrinter.garantia_vencimiento + "T23:59:59") 
                      ? "bg-red-500/10 text-red-600 border border-red-500/20" 
                      : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    }`}>
                      <span className="material-symbols-outlined text-[11px]">security</span>
                      {new Date() > new Date(selectedPrinter.garantia_vencimiento + "T23:59:59") ? "Garantía Vencida" : "Garantía Activa"}
                    </span>
                  )}
                  {!isCreateMode && selectedPrinter && !selectedPrinter.garantia_vencimiento && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 bg-gray-500/10 text-gray-500 border border-gray-500/20">
                      <span className="material-symbols-outlined text-[11px]">help</span>
                      Sin Garantía Reg.
                    </span>
                  )}
                  </>
                );
              })()}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Número de Serie</label>
                {!isCreateMode && (
                  <a href={getWarrantyUrl(editModelo)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">open_in_new</span> Lexmark Web
                  </a>
                )}
              </div>
              <input
                type="text"
                value={editIdSerie}
                onChange={(e) => setEditIdSerie(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm uppercase"
                placeholder="Ej. 701924410D8X7"
                required
                disabled={!isAuthenticated || !isEditing}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Modelo</label>
              <select
                value={editModelo}
                onChange={(e) => setEditModelo(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm text-on-surface"
                disabled={!isAuthenticated || !isEditing}
              >
                <option value="MX431ADN">MX431ADN</option>
                <option value="MX632ADWE">MX632ADWE</option>
                <option value="MX722ADHE">MX722ADHE</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Área de Ubicación</label>
              <input
                type="text"
                value={editUbicacion === "MUR" || editUbicacion === "Lexmark" ? "-" : editArea}
                onChange={(e) => setEditArea(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm disabled:opacity-50"
                placeholder={editUbicacion === "MUR" || editUbicacion === "Lexmark" ? "No aplica para externos" : "Ej. Soporte, C.E Otorrino..."}
                required={editUbicacion === "Hospital"}
                disabled={!isAuthenticated || !isEditing || editUbicacion === "MUR" || editUbicacion === "Lexmark"}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Ubicación Física</label>
              <select
                value={editUbicacion}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditUbicacion(val);
                  if (val === "MUR" || val === "Lexmark") setEditArea("-");
                }}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm text-on-surface"
                disabled={!isAuthenticated || !isEditing}
              >
                <option value="Hospital">Hospital</option>
                <option value="MUR">MUR</option>
                <option value="Lexmark">Lexmark</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  disabled={!isAuthenticated || !isEditing}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline font-bold text-[10px]">%</span>
              </div>
              {isUsbOrOffline && isEditing && isAuthenticated && (
                <div className="mt-2 bg-surface-variant/30 p-2 rounded-lg border border-outline-variant/30 space-y-1">
                  <span className="text-[8px] font-bold text-primary uppercase block">Cálculo Exacto</span>
                  <div className="flex gap-1.5">
                    <input type="number" min="0" placeholder="Capacidad" value={calcValues.toner.cap} onChange={(e) => handleCalcChange('toner', 'cap', e.target.value)} className="w-1/2 bg-surface text-[9px] p-1.5 border border-outline-variant rounded focus:ring-primary focus:border-primary" />
                    <input type="number" min="0" placeholder="Caras por Cons." value={calcValues.toner.caras} onChange={(e) => handleCalcChange('toner', 'caras', e.target.value)} className="w-1/2 bg-surface text-[9px] p-1.5 border border-outline-variant rounded focus:ring-primary focus:border-primary" />
                  </div>
                </div>
              )}
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
                  disabled={!isAuthenticated || !isEditing}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline font-bold text-[10px]">%</span>
              </div>
              {isUsbOrOffline && isEditing && isAuthenticated && (
                <div className="mt-2 bg-surface-variant/30 p-2 rounded-lg border border-outline-variant/30 space-y-1">
                  <span className="text-[8px] font-bold text-primary uppercase block">Cálculo Exacto</span>
                  <div className="flex gap-1.5">
                    <input type="number" min="0" placeholder="Capacidad" value={calcValues.mant.cap} onChange={(e) => handleCalcChange('mant', 'cap', e.target.value)} className="w-1/2 bg-surface text-[9px] p-1.5 border border-outline-variant rounded focus:ring-primary focus:border-primary" />
                    <input type="number" min="0" placeholder="Caras por Cons." value={calcValues.mant.caras} onChange={(e) => handleCalcChange('mant', 'caras', e.target.value)} className="w-1/2 bg-surface text-[9px] p-1.5 border border-outline-variant rounded focus:ring-primary focus:border-primary" />
                  </div>
                </div>
              )}
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
                  disabled={!isAuthenticated || !isEditing}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline font-bold text-[10px]">%</span>
              </div>
              {isUsbOrOffline && isEditing && isAuthenticated && (
                <div className="mt-2 bg-surface-variant/30 p-2 rounded-lg border border-outline-variant/30 space-y-1">
                  <span className="text-[8px] font-bold text-primary uppercase block">Cálculo Exacto</span>
                  <div className="flex gap-1.5">
                    <input type="number" min="0" placeholder="Capacidad" value={calcValues.unit.cap} onChange={(e) => handleCalcChange('unit', 'cap', e.target.value)} className="w-1/2 bg-surface text-[9px] p-1.5 border border-outline-variant rounded focus:ring-primary focus:border-primary" />
                    <input type="number" min="0" placeholder="Caras por Cons." value={calcValues.unit.caras} onChange={(e) => handleCalcChange('unit', 'caras', e.target.value)} className="w-1/2 bg-surface text-[9px] p-1.5 border border-outline-variant rounded focus:ring-primary focus:border-primary" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Dirección IP</label>
              <input
                type="text"
                value={editIp}
                onChange={(e) => setEditIp(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm"
                placeholder="Ej. 192.168.1.15 (Opcional)"
                disabled={!isAuthenticated || !isEditing}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider text-green-600">Vencimiento Garantía</label>
              <input
                type="date"
                value={editGarantia || ""}
                onChange={(e) => setEditGarantia(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm"
                disabled={!isAuthenticated || !isEditing}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Código CAS</label>
              <input
                type="text"
                value={editCasCode}
                onChange={(e) => setEditCasCode(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm"
                placeholder="Ej. CAS-6013278-V6N2C5 (Opcional)"
                disabled={!isAuthenticated || !isEditing}
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
              disabled={!isAuthenticated || !isEditing}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Observaciones</label>
            <textarea
              value={editObservaciones}
              onChange={(e) => setEditObservaciones(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm resize-none h-16"
              placeholder="Notas o fallas (Ej. Se traba papel...)"
              disabled={!isAuthenticated || !isEditing}
            />
            </div>

          {/* Page Counters Section (SNMP statistics) */}
          <div className="pt-4 border-t border-outline-variant/30 space-y-2">
            <h4 className="text-[11px] font-bold text-outline uppercase tracking-wider font-extrabold text-primary">Contadores de Páginas (SNMP)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-outline uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-[13px] text-primary">description</span>
                  <span>Hojas Impresas</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-on-surface">Total:</label>
                    <input type="number" min="0" value={editEstadisticas?.hojas_impresas?.total ?? 0} onChange={(e) => setEditEstadisticas({...editEstadisticas, hojas_impresas: {...editEstadisticas.hojas_impresas, total: Number(e.target.value)}})} className="w-24 bg-surface border border-outline-variant rounded-lg p-1.5 text-xs font-black text-primary text-right focus:ring-primary focus:border-primary" disabled={!isAuthenticated || !isEditing} />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-outline">Impresión:</label>
                    <input type="number" min="0" value={editEstadisticas?.hojas_impresas?.imprimir ?? 0} onChange={(e) => setEditEstadisticas({...editEstadisticas, hojas_impresas: {...editEstadisticas.hojas_impresas, imprimir: Number(e.target.value)}})} className="w-24 bg-surface border border-outline-variant rounded-lg p-1.5 text-[10px] text-right focus:ring-primary focus:border-primary" disabled={!isAuthenticated || !isEditing} />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-outline">Copia:</label>
                    <input type="number" min="0" value={editEstadisticas?.hojas_impresas?.copiar ?? 0} onChange={(e) => setEditEstadisticas({...editEstadisticas, hojas_impresas: {...editEstadisticas.hojas_impresas, copiar: Number(e.target.value)}})} className="w-24 bg-surface border border-outline-variant rounded-lg p-1.5 text-[10px] text-right focus:ring-primary focus:border-primary" disabled={!isAuthenticated || !isEditing} />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-outline uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-[13px] text-secondary">auto_stories</span>
                  <span>Caras Impresas</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-on-surface">Total:</label>
                    <input type="number" min="0" value={editEstadisticas?.caras_impresas?.total ?? 0} onChange={(e) => setEditEstadisticas({...editEstadisticas, caras_impresas: {...editEstadisticas.caras_impresas, total: Number(e.target.value)}})} className="w-24 bg-surface border border-outline-variant rounded-lg p-1.5 text-xs font-black text-secondary text-right focus:ring-secondary focus:border-secondary" disabled={!isAuthenticated || !isEditing} />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-outline">Impresión:</label>
                    <input type="number" min="0" value={editEstadisticas?.caras_impresas?.imprimir ?? 0} onChange={(e) => setEditEstadisticas({...editEstadisticas, caras_impresas: {...editEstadisticas.caras_impresas, imprimir: Number(e.target.value)}})} className="w-24 bg-surface border border-outline-variant rounded-lg p-1.5 text-[10px] text-right focus:ring-secondary focus:border-secondary" disabled={!isAuthenticated || !isEditing} />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-outline">Copia:</label>
                    <input type="number" min="0" value={editEstadisticas?.caras_impresas?.copiar ?? 0} onChange={(e) => setEditEstadisticas({...editEstadisticas, caras_impresas: {...editEstadisticas.caras_impresas, copiar: Number(e.target.value)}})} className="w-24 bg-surface border border-outline-variant rounded-lg p-1.5 text-[10px] text-right focus:ring-secondary focus:border-secondary" disabled={!isAuthenticated || !isEditing} />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-outline uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-[13px] text-tertiary">scanner</span>
                  <span>Caras Cargadas</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-on-surface">Total:</label>
                    <input type="number" min="0" value={editEstadisticas?.caras_cargadas?.total ?? 0} onChange={(e) => setEditEstadisticas({...editEstadisticas, caras_cargadas: {...editEstadisticas.caras_cargadas, total: Number(e.target.value)}})} className="w-[88px] bg-surface border border-outline-variant rounded-lg p-1.5 text-xs font-black text-tertiary text-right focus:ring-tertiary focus:border-tertiary" disabled={!isAuthenticated || !isEditing} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historial de Cargas de Hojas */}
          {editEstadisticas?.caras_cargadas?.historial && editEstadisticas.caras_cargadas.historial.length > 0 && (
            <div className="pt-4 border-t border-outline-variant/30 space-y-2">
              <h4 className="text-[11px] font-bold text-outline uppercase tracking-wider text-tertiary">Historial de Cargas de Papel</h4>
              <div className="max-h-32 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {editEstadisticas.caras_cargadas.historial.map((carga, idx) => (
                  <div key={idx} className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 flex justify-between items-center text-xs shadow-sm">
                    <span className="text-[10px] text-outline font-medium">
                      {carga.fecha instanceof Date
                        ? carga.fecha.toLocaleDateString("es-PE")
                        : carga.fecha?.toDate
                          ? carga.fecha.toDate().toLocaleDateString("es-PE")
                          : carga.fecha 
                            ? new Date(carga.fecha).toLocaleDateString("es-PE")
                            : ""}
                    </span>
                    <span className="font-black text-tertiary">+{carga.cantidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        ) : String(hist.tipo_actualizacion || "").toLowerCase().includes("automático") || String(hist.tipo_actualizacion || "").toLowerCase().includes("red") ? (
                          <span className="flex items-center gap-0.5 text-[8px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-blue-500/20">
                            <span className="material-symbols-outlined text-[10px]">settings_ethernet</span>
                            Red
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[8px] bg-outline-variant/30 text-on-surface-variant px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[10px]">person</span>
                            Manual
                          </span>
                        )}
                        {(() => {
                          const histStatus = hist.estado_funcionamiento || hist.estado_criticidad || "Operativo";
                          const isInop = histStatus === "Inoperativo" || histStatus === "Crítico" || histStatus === "En Mantenimiento";
                          const isAdv = histStatus === "Advertencia";
                        
                          return (
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border ${
                              isInop
                                ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                : isAdv
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              }`}>
                              {isInop ? "En Mantenimiento" : isAdv ? "Operativo (con alertas)" : "Operativo"}
                            </span>
                          );
                        })()}
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
                        {isAuthenticated && (
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryItem(hist.id)}
                            className="text-error hover:bg-error/10 p-0.5 rounded-full transition-colors active:scale-90 flex items-center justify-center"
                            title="Eliminar de historial"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        )}
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
        <div className="flex flex-col-reverse sm:flex-row-reverse gap-3 pb-4 sm:pb-0 shrink-0">
          {isAuthenticated ? (
            !isEditing ? (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setIsEditing(true); }}
                  className="w-full sm:w-auto px-6 py-3.5 bg-primary text-on-primary font-bold rounded-2xl shadow-lg active:scale-95 hover:bg-primary-container transition-all text-sm flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Editar Equipo</span>
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto px-6 py-3.5 border border-outline-variant text-on-surface-variant font-bold rounded-2xl active:scale-95 transition-all hover:bg-surface-container-low text-sm"
                  onClick={handleCloseEditModal}
                >
                  Cerrar
                </button>
              </>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full sm:w-auto px-6 py-3.5 bg-primary text-on-primary font-bold rounded-2xl shadow-lg active:scale-95 hover:bg-primary-container transition-all text-sm flex items-center justify-center gap-1.5"
                >
                  {savingEdit ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span>Guardar Cambios</span>
                      <span className="material-symbols-outlined text-sm">save</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto px-6 py-3.5 border border-outline-variant text-on-surface-variant font-bold rounded-2xl active:scale-95 transition-all hover:bg-surface-container-low text-sm"
                  onClick={() => isCreateMode ? handleCloseEditModal() : setIsEditing(false)}
                >
                  Cancelar
                </button>
                {!isCreateMode && (
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={handleDeletePrinter}
                    className="w-full sm:w-auto px-6 py-3.5 bg-error-container text-on-error-container border border-error/20 font-bold rounded-2xl active:scale-95 transition-all hover:bg-error-container/80 text-sm flex items-center justify-center gap-1.5 sm:mr-auto"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Eliminar</span>
                  </button>
                )}
              </>
            )
          ) : (
            <button
              type="button"
              className="w-full px-6 py-3.5 bg-primary text-on-primary font-bold rounded-2xl active:scale-95 transition-all hover:bg-primary/95 text-sm flex items-center justify-center gap-1.5"
              onClick={handleCloseEditModal}
            >
              <span>Cerrar</span>
              <span className="material-symbols-outlined text-sm font-bold">check</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
