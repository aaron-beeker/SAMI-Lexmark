import React from "react";
import { useAuthContext } from '../contexts/AuthContext';
import { useUIContext } from '../contexts/UIContext';
import { useDataContext } from '../contexts/DataContext';

export default function InventoryView() {
  const { isAuthenticated } = useAuthContext();
  const { filterCriticidad, setFilterCriticidad } = useUIContext();
  const { 
    searchText, setSearchText, 
    filteredPrinters, loadingPrinters, 
    handleDownloadReport, handleOpenCreateModal, 
    copiedSerialId, handleCopySerial, 
    handleOpenEditModal, getPrinterStatus, checkPrinterAlerts, 
    currentPage, setCurrentPage, totalPages, paginatedPrinters 
  } = useDataContext();
  const renderWarrantyBadge = (printer) => {
    if (!printer.garantia_vencimiento) return null;
    const isExpired = new Date() > new Date(printer.garantia_vencimiento + "T23:59:59");
    if (isExpired) {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 bg-red-500/10 text-red-600 border border-red-500/20" title={`Venció: ${printer.garantia_vencimiento}`}>
          <span className="material-symbols-outlined text-[10px]">security</span>Vencida
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title={`Vence: ${printer.garantia_vencimiento}`}>
        <span className="material-symbols-outlined text-[10px]">security</span>Activa
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-md text-2xl text-on-background font-black tracking-tight">Inventario</h2>
          <p className="text-sm text-outline font-medium mt-1">Gestiona el estado y consumibles de tus equipos</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={handleDownloadReport}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-high text-on-surface-variant rounded-xl font-bold text-sm hover:bg-outline-variant/30 transition-all shadow-sm border border-outline-variant active:scale-95"
            title="Descargar Excel"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            <span>Exportar</span>
          </button>
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary-container transition-all shadow-sm shadow-primary/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Nueva Impresora</span>
            </button>
          )}
        </div>
      </div>

      {/* Minimalist Filter Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-2 shadow-sm flex flex-col xl:flex-row gap-2">
        <div className="relative flex-grow min-w-[280px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary material-symbols-outlined font-bold">search</span>
          <input
            type="text"
            placeholder="Buscar serie, IP, área..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-surface-container border-none rounded-xl pl-12 pr-10 py-3 text-sm focus:ring-2 focus:ring-primary/50 text-on-surface font-bold placeholder:text-outline/70 transition-all"
          />
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-outline-variant/30 text-on-surface hover:bg-outline-variant/60 transition-colors"
            >
              <span className="material-symbols-outlined text-sm font-bold">close</span>
            </button>
          )}
        </div>
        
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0 items-center px-1">
          {[
            { id: "all", label: "Todos", count: filteredPrinters.length },
            { id: "En Servicio", label: "Operativos", icon: "check_circle", color: "emerald" },
            { id: "Advertencia", label: "Alertas", icon: "warning", color: "amber" },
            { id: "En Mantenimiento", label: "En Mant.", icon: "build", color: "blue" }
          ].map(tab => {
            const isSelected = filterCriticidad === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterCriticidad(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all border shrink-0 ${
                  isSelected
                    ? "bg-primary text-on-primary border-primary shadow-sm"
                    : "bg-surface-container-low text-outline hover:text-on-surface hover:bg-surface-container-high border-outline-variant/50"
                }`}
              >
                {tab.icon && <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>}
                {tab.label}
                {tab.id === "all" && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ml-1 ${isSelected ? 'bg-on-primary/20 text-on-primary' : 'bg-outline-variant/30 text-on-surface'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {loadingPrinters ? (
          <div className="py-20 flex flex-col items-center justify-center text-outline-variant gap-3">
             <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
             <p className="font-bold text-sm">Sincronizando inventario...</p>
          </div>
        ) : filteredPrinters.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-outline-variant bg-surface-container-lowest border border-outline-variant/50 rounded-3xl border-dashed">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-50">search_off</span>
            <p className="font-bold text-on-surface-variant text-lg">Sin resultados</p>
            <p className="text-sm text-outline mt-1">Prueba eliminando los filtros o cambiando tu búsqueda.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Clean & Minimalist) */}
            <div className="hidden md:block bg-surface border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead className="bg-surface-container-low border-b border-outline-variant">
                    <tr className="text-[11px] font-black text-outline uppercase tracking-wider">
                      <th className="px-5 py-4 w-[280px]">Dispositivo</th>
                      <th className="px-5 py-4 w-[240px]">Estado & Ubicación</th>
                      <th className="px-5 py-4 min-w-[200px]">Consumibles</th>
                      <th className="px-5 py-4 w-[180px]">Notas Adicionales</th>
                      <th className="px-5 py-4 text-center w-[80px]">Opciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50 font-medium">
                    {paginatedPrinters.map((printer) => {
                      const toner  = printer.consumibles?.toner_nivel ?? null;
                      const unit   = printer.consumibles?.unidad_imagen_nivel ?? null;
                      const maint  = printer.consumibles?.mantenimiento_kit_nivel ?? null;
                      const status = getPrinterStatus(printer);
                      const hasAlerts = checkPrinterAlerts(printer);
                      const isDisconnected = printer.estado_funcionamiento?.toLowerCase().includes("conexion") || printer.estado_funcionamiento?.toLowerCase().includes("conexión");
                      
                      const statusColor = status === "En Mantenimiento"
                        ? { badge: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: "build" }
                        : hasAlerts
                          ? { badge: "bg-amber-500/10 text-amber-700 border-amber-500/30", icon: "warning" }
                          : { badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: "check_circle" };

                      return (
                        <tr
                          key={printer.id_serie}
                          onClick={() => handleOpenEditModal(printer)}
                          className="group hover:bg-surface-container-lowest/80 transition-colors cursor-pointer"
                        >
                          {/* 1. DISPOSITIVO */}
                          <td className="px-5 py-4 align-middle">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded border bg-surface-container-high border-outline-variant/50 text-[10px] font-black text-on-surface-variant">
                                  {printer.modelo}
                                </span>
                                <span className="font-mono font-black text-sm text-on-background">
                                  {printer.id_serie}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopySerial(printer.id_serie); }}
                                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-outline-variant/30 text-outline opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {copiedSerialId === printer.id_serie ? "done" : "content_copy"}
                                  </span>
                                </button>
                                {renderWarrantyBadge(printer)}
                              </div>
                              <div className="flex items-center gap-2 text-xs flex-wrap">
                                {printer.ip && printer.ip.trim() !== "" ? (
                                  printer.ip.trim().toLowerCase() === "usb" ? (
                                    <span className="text-emerald-600 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">usb</span>USB</span>
                                  ) : (
                                    <span className="text-outline font-mono font-semibold flex items-center gap-1">
                                      <span className={`w-1.5 h-1.5 rounded-full ${isDisconnected ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                      {printer.ip}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-red-500/70 font-semibold flex items-center gap-1 text-[11px]"><span className="material-symbols-outlined text-[14px]">wifi_off</span>Offline</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. ESTADO Y UBICACIÓN */}
                          <td className="px-5 py-4 align-middle">
                             <div className="flex flex-col items-start gap-2">
                               <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${statusColor.badge}`}>
                                  <span className="material-symbols-outlined text-[14px]">{statusColor.icon}</span>
                                  {status}
                               </span>
                               <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1 truncate max-w-[200px]" title={printer.area_actual}>
                                 <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                                 {printer.area_actual || "Sin asignar"}
                               </span>
                             </div>
                          </td>

                          {/* 3. CONSUMIBLES (MINIMALISTA) */}
                          <td className="px-5 py-4 align-middle">
                            <div className="flex flex-col gap-2 max-w-[200px]">
                              {[
                                { label: "T", value: toner, color: "bg-primary" },
                                { label: "K", value: maint, color: "bg-tertiary" },
                                { label: "U", value: unit,  color: "bg-secondary" }
                              ].map(({label, value, color}) => (
                                <div key={label} className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-outline w-3">{label}</span>
                                  <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${value <= 15 ? 'bg-error' : color}`} style={{ width: value === null ? '0%' : `${value}%` }} />
                                  </div>
                                  <span className={`text-[10px] font-bold w-7 text-right ${value <= 15 ? 'text-error' : 'text-on-surface'}`}>
                                    {value === null ? '-' : `${value}%`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* 4. NOTAS ADICIONALES */}
                          <td className="px-5 py-4 align-middle whitespace-normal">
                            {printer.codigo_caso_cas ? (
                              <div className="mb-1">
                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-black uppercase tracking-wider">CAS: {printer.codigo_caso_cas}</span>
                              </div>
                            ) : null}
                            <p className="text-xs text-outline italic line-clamp-2 leading-snug" title={printer.observaciones}>
                              {printer.observaciones || "- Ninguna -"}
                            </p>
                          </td>

                          {/* 5. OPCIONES */}
                          <td className="px-5 py-4 align-middle text-center">
                            <div className="flex justify-center">
                               <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-on-primary transition-all shadow-sm">
                                 <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                               </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View (Minimalist) */}
            <div className="md:hidden space-y-3">
              {paginatedPrinters.map(printer => {
                 const status = getPrinterStatus(printer);
                 const hasAlerts = checkPrinterAlerts(printer);
                 const toner = printer.consumibles?.toner_nivel ?? null;
                 const statusColor = status === "En Mantenimiento" ? "text-blue-500 bg-blue-500/10" : hasAlerts ? "text-amber-500 bg-amber-500/10" : "text-emerald-500 bg-emerald-500/10";
                 
                 return (
                   <div 
                     key={printer.id_serie} 
                     onClick={() => handleOpenEditModal(printer)}
                     className="bg-surface-container-lowest border border-outline-variant/60 p-4 rounded-2xl flex flex-col gap-3 active:scale-95 transition-transform shadow-sm"
                   >
                     <div className="flex justify-between items-start">
                       <div className="flex flex-col gap-1">
                         <span className="text-[10px] font-bold text-outline uppercase">{printer.modelo}</span>
                         <div className="flex items-center gap-2">
                           <span className="font-mono font-black text-base text-on-surface">{printer.id_serie}</span>
                           {renderWarrantyBadge(printer)}
                         </div>
                       </div>
                       <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${statusColor}`}>
                         {status}
                       </span>
                     </div>
                     <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium bg-surface-container-low p-2 rounded-xl">
                       <span className="material-symbols-outlined text-base text-primary">location_on</span>
                       <span className="truncate">{printer.area_actual || "Área no asignada"}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-outline uppercase">Tóner</span>
                        <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                          <div className={`h-full ${toner <= 15 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${toner || 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-on-surface">{toner ?? '-'}%</span>
                     </div>
                   </div>
                 )
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-4 mt-6 text-sm font-semibold shadow-sm select-none">
                <span className="text-outline">
                  Pág. <strong className="text-on-surface font-black">{currentPage}</strong> de <strong className="text-on-surface font-black">{totalPages}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-surface-container-low text-on-surface-variant rounded-full border border-outline-variant hover:bg-outline-variant/50 disabled:opacity-30 transition-all"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="w-10 h-10 flex items-center justify-center bg-surface-container-low text-on-surface-variant rounded-full border border-outline-variant hover:bg-outline-variant/50 disabled:opacity-30 transition-all"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
