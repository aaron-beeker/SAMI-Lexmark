import React from "react";
import { useAuthContext } from '../contexts/AuthContext';
import { useUIContext } from '../contexts/UIContext';
import { useDataContext } from '../contexts/DataContext';


export default function InventoryView() {
  const { isAuthenticated } = useAuthContext();
  const { filterCriticidad, setFilterCriticidad } = useUIContext();
  const { searchText, setSearchText, filteredPrinters, loadingPrinters, handleDownloadReport, handleOpenCreateModal, copiedSerialId, handleCopySerial, editingRowId, setEditingRowId, editingRowData, setEditingRowData, handleRowDataChange, handleRowNestedDataChange, handleStartRowEdit, handleSaveRowEdit, handleRowKeyDown, handleOpenEditModal, getPrinterStatus, checkPrinterAlerts, currentPage, setCurrentPage, totalPages, paginatedPrinters } = useDataContext();


  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header and filters */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-headline-md text-xl text-on-background font-bold">Inventario de Impresoras</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadReport}
              className="flex items-center gap-1 px-3.5 py-2 bg-surface-container-high text-on-surface-variant rounded-xl font-bold text-xs hover:bg-outline-variant/30 active:scale-95 transition-all shadow-sm border border-outline-variant"
              title="Descargar reporte Excel"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Reporte Excel</span>
            </button>
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1 px-3.5 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:bg-primary-container active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Registrar Impresora</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-grow">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Buscar por serie, modelo, área, IP o estado..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-primary focus:border-primary font-body-md"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined text-sm"
              >
                close
              </button>
            )}
          </div>

          {/* Filter Tags */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1 shrink-0">
            {[
              { id: "all", label: "Todas" },
              { id: "En Servicio", label: "En Servicio" },
              { id: "Advertencia", label: "Con Alertas" },
              { id: "En Mantenimiento", label: "En Mantenimiento" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterCriticidad(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${
                  filterCriticidad === tab.id
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface-container-lowest text-on-surface-variant border-outline-variant"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Search/Filter Summary Counter */}
      <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-4.5 shadow-sm space-y-4 text-xs animate-fade-in">
        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
          <span className="font-bold text-on-surface flex items-center gap-2 text-xs uppercase tracking-wider text-outline">
            <span className="material-symbols-outlined text-base text-primary">analytics</span>
            {searchText.trim() !== "" ? "Resultado de Búsqueda" : "Resumen del Listado"}
          </span>
          <span className="bg-primary text-on-primary px-3 py-1 rounded-full font-black text-[11px] shadow-sm">
            {filteredPrinters.length} Impresora{filteredPrinters.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Panel 1: Filter Context Card */}
          <div className="bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">print</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Visualizando</span>
              <span className="text-xs font-black text-on-surface leading-tight">
                {filterCriticidad === "all"
                  ? "Todo el Inventario"
                  : filterCriticidad === "En Servicio"
                    ? "Equipos En Servicio"
                    : filterCriticidad === "Advertencia"
                      ? "Equipos con Alertas"
                      : "Equipos en Mantenimiento"}
              </span>
            </div>
          </div>

          {/* Panel 2: Breakdown by Status */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Distribución por Estado</span>
            <div className="grid grid-cols-3 gap-2">
              {/* Card 1: En Servicio */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded-xl flex flex-col justify-between min-h-[64px]">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-tight">En Servicio</span>
                  <span className="text-base font-black text-emerald-700 leading-none">
                    {filteredPrinters.filter(p => (p.ubicacion_entidad || "Hospital") === "Hospital" && !(p.area_actual || "").toLowerCase().includes("soporte") && getPrinterStatus(p) !== "En Mantenimiento").length}
                  </span>
                </div>
                <div className="flex justify-between gap-1 text-[9px] mt-1.5 pt-1 border-t border-emerald-500/10">
                  <span className="text-emerald-600 font-semibold">OK: <strong className="font-extrabold">{filteredPrinters.filter(p => (p.ubicacion_entidad || "Hospital") === "Hospital" && !(p.area_actual || "").toLowerCase().includes("soporte") && getPrinterStatus(p) === "Operativo" && !checkPrinterAlerts(p)).length}</strong></span>
                  <span className="text-amber-600 font-semibold">Alerta: <strong className="font-extrabold">{filteredPrinters.filter(p => (p.ubicacion_entidad || "Hospital") === "Hospital" && !(p.area_actual || "").toLowerCase().includes("soporte") && getPrinterStatus(p) === "Operativo" && checkPrinterAlerts(p)).length}</strong></span>
                </div>
              </div>

              {/* Card 2: Backup (Soporte) */}
              <div className="bg-purple-500/5 border border-purple-500/20 p-2 rounded-xl flex flex-col justify-between min-h-[64px]">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-extrabold text-purple-800 uppercase tracking-tight">Backup</span>
                  <span className="text-base font-black text-purple-700 leading-none">
                    {filteredPrinters.filter(p => (p.ubicacion_entidad || "Hospital") === "Hospital" && (p.area_actual || "").toLowerCase().includes("soporte")).length}
                  </span>
                </div>
                <div className="text-[9px] text-purple-600/70 font-medium mt-1.5 pt-1 border-t border-purple-500/10 italic text-right">
                  Oficina Soporte
                </div>
              </div>

              {/* Card 3: En Mantenimiento */}
              <div className="bg-blue-500/5 border border-blue-500/20 p-2 rounded-xl flex flex-col justify-between min-h-[64px]">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-extrabold text-blue-800 uppercase tracking-tight">En Mant.</span>
                  <span className="text-base font-black text-blue-700 leading-none">
                    {filteredPrinters.filter(p => getPrinterStatus(p) === "En Mantenimiento" && !((p.ubicacion_entidad || "Hospital") === "Hospital" && (p.area_actual || "").toLowerCase().includes("soporte"))).length}
                  </span>
                </div>
                <div className="text-[9px] text-blue-600/70 font-medium mt-1.5 pt-1 border-t border-blue-500/10 italic text-right">
                  Taller/Externo
                </div>
              </div>
            </div>
          </div>

          {/* Panel 3: Breakdown by Model */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Distribución por Modelo</span>
            <div className="flex flex-col gap-1 text-[10px] font-mono">
              {[
                { name: "MX431ADN", count: filteredPrinters.filter(p => p.modelo === "MX431ADN").length },
                { name: "MX632ADWE", count: filteredPrinters.filter(p => p.modelo === "MX632ADWE").length },
                { name: "MX722ADHE", count: filteredPrinters.filter(p => p.modelo === "MX722ADHE").length }
              ].map(model => (
                <div key={model.name} className="flex justify-between items-center bg-surface-container-lowest border border-outline-variant/35 px-2.5 py-1 rounded-lg">
                  <span className="font-bold text-on-surface-variant">{model.name}</span>
                  <span className="bg-outline-variant/40 text-on-surface px-1.5 py-0.5 rounded font-black text-[9px] min-w-[16px] text-center">
                    {model.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* List (Responsive Mobile Card Grid & Desktop Excel-like Table) */}
      <div className="space-y-3">
        {loadingPrinters ? (
          <div className="p-8 text-center text-outline-variant">Cargando inventario...</div>
        ) : filteredPrinters.length === 0 ? (
          <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2">find_in_page</span>
            <p className="font-semibold">No se encontraron impresoras</p>
            <p className="text-xs text-outline mt-1">Intenta ajustando el filtro o el texto de búsqueda.</p>
          </div>
        ) : (
          <>
            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-2.5">
              {paginatedPrinters.map((printer) => {
                const toner  = printer.consumibles?.toner_nivel ?? null;
                const unit   = printer.consumibles?.unidad_imagen_nivel ?? null;
                const maint  = printer.consumibles?.mantenimiento_kit_nivel ?? null;
                const status = getPrinterStatus(printer);
                const hasAlerts = checkPrinterAlerts(printer);
                const isDisconnected = printer.estado_funcionamiento?.toLowerCase().includes("conexion") || printer.estado_funcionamiento?.toLowerCase().includes("conexión");
                const isInSoporteCard = (printer.area_actual || "").toLowerCase().includes("soporte");
                const isMurCard = (printer.ubicacion_entidad || "Hospital").toUpperCase() === "MUR";
                const statusColor = status === "En Mantenimiento"
                  ? { stripe: "bg-blue-500",    badge: "bg-blue-500/10 text-blue-600 border border-blue-500/25",   icon: "build",       pulse: "animate-pulse-subtle" }
                  : hasAlerts
                    ? { stripe: "bg-amber-500",  badge: "bg-amber-500/10 text-amber-600 border border-amber-500/25", icon: "warning",      pulse: "" }
                    : { stripe: "bg-emerald-500",badge: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25", icon: "check_circle", pulse: "" };

                return (
                  <div
                    key={printer.id_serie}
                    onClick={() => handleOpenEditModal(printer)}
                    className="flex bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:bg-surface-container-low active:scale-[0.98] transition-all"
                  >
                    {/* Left status stripe */}
                    <div className={`w-1.5 shrink-0 ${statusColor.stripe} ${statusColor.pulse}`} />

                    {/* Card body */}
                    <div className="flex-1 p-3.5 space-y-3 min-w-0">
                      {/* TOP ROW: Serial + Status badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {/* Serial */}
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="material-symbols-outlined text-primary text-[14px]">tag</span>
                            <span className="font-mono font-black text-base text-on-background tracking-wider leading-none">
                              {printer.id_serie}
                            </span>
                          </div>
                          {/* Copy hint */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleCopySerial(printer.id_serie); }}
                            className="flex items-center gap-0.5 text-[9px] text-outline hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[10px]">
                              {copiedSerialId === printer.id_serie ? "done" : "content_copy"}
                            </span>
                            {copiedSerialId === printer.id_serie ? "¡Copiado!" : "Copiar S/N"}
                          </button>
                        </div>

                        {/* Status badge */}
                        <span className={`px-2 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${statusColor.badge} ${statusColor.pulse}`}>
                          <span className="material-symbols-outlined text-[11px]">{statusColor.icon}</span>
                          {status} {status === "Operativo" && hasAlerts && <span className="text-[9px] lowercase italic font-normal ml-0.5">(con alertas)</span>}
                        </span>
                      </div>

                      {/* MIDDLE ROW: Model, Area, IP */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Model */}
                        <span className="text-[11px] font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded-lg border border-outline-variant/40">
                          {printer.modelo}
                        </span>

                        {/* Area */}
                        <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px] text-outline">location_on</span>
                          {printer.area_actual}
                        </span>

                        {/* Location tag */}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                          isMurCard
                            ? "bg-secondary-fixed/30 text-secondary border border-secondary/20"
                            : isInSoporteCard
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-primary-fixed/30 text-primary border border-primary/10"
                        }`}>
                          <span className="material-symbols-outlined text-[11px]">
                            {isMurCard ? "corporate_fare" : isInSoporteCard ? "build" : "local_hospital"}
                          </span>
                          {isMurCard ? "MUR" : isInSoporteCard ? "En Soporte" : "En Servicio"}
                        </span>

                        {printer.ip && printer.ip.trim() !== "" ? (
                          printer.ip.trim().toLowerCase() === "usb" ? (
                            <span className="text-[10px] font-bold text-secondary px-1.5 py-0.5 bg-secondary-fixed/50 rounded-md flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[11px] text-emerald-500">usb</span>USB
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-secondary px-1.5 py-0.5 bg-secondary-fixed rounded-md flex items-center gap-0.5 font-mono">
                              {isDisconnected ? (
                                <span className="relative flex h-1.5 w-1.5"><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span></span>
                              ) : (
                                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>
                              )}
                              {printer.ip}
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-outline px-1.5 py-0.5 bg-surface-container-high rounded-md flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px] text-red-500">wifi_off</span>
                            Sin conexión
                          </span>
                        )}

                        {/* CAS code if exists */}
                        {printer.codigo_caso_cas && (
                          <div className="flex flex-col gap-0.5 max-w-[120px]">
                            <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 bg-primary-fixed rounded-md truncate block w-max" title={printer.codigo_caso_cas}>
                              CAS: {printer.codigo_caso_cas}
                            </span>
                            {printer.detalle_caso && (
                              <span className="text-[9px] text-slate-500 italic truncate" title={printer.detalle_caso}>
                                {printer.detalle_caso}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* BOTTOM ROW: Consumable bars */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/20">
                        {[
                          { label: "Tóner", value: toner,  color: toner === null ? "bg-outline/25" : (toner <= 15  ? "bg-error" : "bg-primary")   },
                          { label: "Kit",    value: maint,  color: maint === null ? "bg-outline/25" : (maint <= 15  ? "bg-error" : "bg-tertiary")  },
                          { label: "U.Img",  value: unit,   color: unit === null ? "bg-outline/25" : (unit  <= 15  ? "bg-error" : "bg-secondary") },
                        ].map(({ label, value, color }) => {
                          const isNull = value === null;
                          const isLow = !isNull && value <= 15;
                          return (
                            <div key={label} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className={`text-[9px] font-bold uppercase tracking-wide ${isLow ? "text-error" : "text-outline"}`}>{label}</span>
                                <span className={`text-[10px] font-black ${isLow ? "text-error" : "text-on-surface"}`}>
                                  {isNull ? "N/A" : `${value}%`}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: isNull ? "0%" : `${value}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Statistics */}
                      {printer.estadisticas && (
                        <div className="pt-2 border-t border-outline-variant/20 grid grid-cols-3 gap-2">
                          <div className="bg-surface-container-low p-1.5 rounded-lg border border-outline-variant/40 flex flex-col">
                             <div className="flex justify-between items-center text-[9px] text-outline font-bold uppercase mb-0.5">
                               <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">description</span>Hojas</span>
                               <span className="text-on-surface font-black text-[10px]">{(printer.estadisticas.hojas_impresas?.total ?? 0).toLocaleString("es-PE")}</span>
                             </div>
                             <div className="flex justify-between text-[8px]">
                               <span className="text-primary font-semibold">Imp: {(printer.estadisticas.hojas_impresas?.imprimir ?? 0).toLocaleString("es-PE")}</span>
                               <span className="text-tertiary font-semibold">Cop: {(printer.estadisticas.hojas_impresas?.copiar ?? 0).toLocaleString("es-PE")}</span>
                             </div>
                          </div>
                          <div className="bg-surface-container-low p-1.5 rounded-lg border border-outline-variant/40 flex flex-col">
                             <div className="flex justify-between items-center text-[9px] text-outline font-bold uppercase mb-0.5">
                               <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">auto_stories</span>Caras</span>
                               <span className="text-on-surface font-black text-[10px]">{(printer.estadisticas.caras_impresas?.total ?? 0).toLocaleString("es-PE")}</span>
                             </div>
                             <div className="flex justify-between text-[8px]">
                               <span className="text-primary font-semibold">Imp: {(printer.estadisticas.caras_impresas?.imprimir ?? 0).toLocaleString("es-PE")}</span>
                               <span className="text-tertiary font-semibold">Cop: {(printer.estadisticas.caras_impresas?.copiar ?? 0).toLocaleString("es-PE")}</span>
                             </div>
                          </div>
                          <div className="bg-surface-container-low p-1.5 rounded-lg border border-outline-variant/40 flex flex-col justify-center">
                             <div className="flex justify-between items-center text-[9px] text-outline font-bold uppercase mb-0.5">
                               <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">scanner</span>C. Carg.</span>
                               <span className="text-on-surface font-black text-[10px]">{(printer.estadisticas.caras_cargadas?.total ?? 0).toLocaleString("es-PE")}</span>
                             </div>
                           </div>
                        </div>
                      )}

                      {/* Observations */}
                      {printer.observaciones && (
                        <p className="text-[10px] italic text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-lg border border-dashed border-outline-variant/30 leading-tight">
                          {printer.observaciones}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View (Consolidated Modern Table with Clear Separations) */}
            <div className="hidden md:block bg-surface border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1300px] text-xs animate-fade-in">
                  <thead className="bg-surface-container-low border-b border-outline-variant">
                    <tr className="text-[10px] font-black text-outline uppercase tracking-widest select-none">
                      <th className="px-6 py-4.5 pl-6 border-r border-outline-variant/60">Dispositivo</th>
                      <th className="px-6 py-4.5 border-r border-outline-variant/60">Ubicación y Conexión</th>
                      <th className="px-6 py-4.5 border-r border-outline-variant/60">Consumibles</th>
                      <th className="px-6 py-4.5 border-r border-outline-variant/60">Estadísticas</th>
                      <th className="px-6 py-4.5 border-r border-outline-variant/60">Estado</th>
                      <th className="px-6 py-4.5 border-r border-outline-variant/60">Caso CAS</th>
                      <th className="px-6 py-4.5 border-r border-outline-variant/60">Observaciones</th>
                      <th className="px-6 py-4.5 text-center pr-6">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant border-b border-outline-variant font-medium">
                    {paginatedPrinters.map((printer) => {
                      const isDisconnected = printer.estado_funcionamiento?.toLowerCase().includes("conexion") || printer.estado_funcionamiento?.toLowerCase().includes("conexión");
                      const isEditing = editingRowId === printer.id_serie;
                      const toner = isEditing
                        ? (editingRowData.consumibles?.toner_nivel ?? null)
                        : (printer.consumibles?.toner_nivel ?? null);
                      const unit = isEditing
                        ? (editingRowData.consumibles?.unidad_imagen_nivel ?? null)
                        : (printer.consumibles?.unidad_imagen_nivel ?? null);
                      const maint = isEditing
                        ? (editingRowData.consumibles?.mantenimiento_kit_nivel ?? null)
                        : (printer.consumibles?.mantenimiento_kit_nivel ?? null);

                      return (
                        <tr
                          key={printer.id_serie}
                          onDoubleClick={() => isAuthenticated && !isEditing && handleStartRowEdit(printer)}
                          className={`group hover:bg-surface-container-low/30 transition-colors ${
                            isEditing ? "bg-primary/5" : "even:bg-surface-container-lowest/20"
                          }`}
                        >
                          {/* DISPOSITIVO */}
                          <td className="px-6 py-5.5 pl-6 align-middle border-r border-outline-variant/30">
                            {isEditing ? (
                              <div className="space-y-2 max-w-[140px]">
                                <select
                                  value={editingRowData.modelo || "MX431ADN"}
                                  onChange={(e) => handleRowDataChange("modelo", e.target.value)}
                                  onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary font-bold text-on-surface"
                                >
                                  <option value="MX431ADN">MX431ADN</option>
                                  <option value="MX632ADWE">MX632ADWE</option>
                                  <option value="MX722ADHE">MX722ADHE</option>
                                </select>
                                <span className="font-mono text-[10px] text-outline block pl-1">
                                  S/N: {printer.id_serie}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <span className={`px-2.5 py-0.5 rounded-lg font-extrabold text-[9px] uppercase tracking-wider border inline-block w-fit ${
                                  printer.modelo === "MX722ADHE"
                                    ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                    : printer.modelo === "MX632ADWE"
                                      ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                      : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                }`}>
                                  {printer.modelo}
                                </span>
                                <div className="flex items-center gap-1 group/serial">
                                  <span className="text-[10px] font-bold text-outline font-mono">S/N:</span>
                                  <span className="font-mono text-[11px] font-black text-on-surface select-all leading-none">
                                    {printer.id_serie}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopySerial(printer.id_serie)}
                                    className="w-5 h-5 rounded-full hover:bg-surface-container-high flex items-center justify-center text-outline opacity-0 group-hover/serial:opacity-100 transition-all duration-150 active:scale-90"
                                    title="Copiar Serie"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">
                                      {copiedSerialId === printer.id_serie ? "check" : "content_copy"}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* UBICACIÓN Y CONEXIÓN */}
                          <td className="px-6 py-5.5 align-middle border-r border-outline-variant/30">
                            {isEditing ? (
                              <div className="space-y-2 max-w-[180px]">
                                <input
                                  type="text"
                                  value={editingRowData.area_actual || ""}
                                  onChange={(e) => handleRowDataChange("area_actual", e.target.value)}
                                  onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                  placeholder="Área física"
                                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary text-on-surface font-semibold"
                                />
                                <input
                                  type="text"
                                  value={editingRowData.ip || ""}
                                  onChange={(e) => handleRowDataChange("ip", e.target.value)}
                                  onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                  placeholder="IP o USB"
                                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary font-mono text-on-surface"
                                />
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <div className="font-extrabold text-on-surface flex items-center gap-1.5 text-xs">
                                  <span className="material-symbols-outlined text-primary text-[14px]">location_on</span>
                                  <span>{printer.area_actual}</span>
                                </div>
                                <div className="pl-4 mt-0.5">
                                  {printer.ip && printer.ip.trim() !== "" ? (
                                    printer.ip.trim().toLowerCase() === "usb" ? (
                                      <span className="bg-secondary-fixed/50 text-on-secondary-container rounded-md px-1.5 py-0.5 inline-flex items-center gap-0.5 font-bold text-[9px]">
                                        <span className="material-symbols-outlined text-[10px] text-emerald-500">usb</span>
                                        USB
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-outline font-mono flex items-center gap-1">
                                        {isDisconnected ? (
                                          <span className="relative flex h-1.5 w-1.5"><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span></span>
                                        ) : (
                                          <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>
                                        )}
                                        IP: {printer.ip}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-outline font-mono flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[12px] text-red-500">wifi_off</span>
                                      Sin conexión
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* CONSUMIBLES */}
                          <td className="px-6 py-5.5 align-middle border-r border-outline-variant/30 w-44">
                            {isEditing ? (
                              <div className="space-y-2 py-1 text-[10px] max-w-[120px]">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-outline font-bold">TÓNER:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={toner ?? ""}
                                    onChange={(e) => handleRowNestedDataChange("consumibles", "toner_nivel", e.target.value)}
                                    onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                    className="w-12 bg-surface-container-low border border-outline-variant rounded px-1.5 py-0.5 text-center text-xs text-on-surface font-bold"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-outline font-bold">KIT MANT:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={maint ?? ""}
                                    onChange={(e) => handleRowNestedDataChange("consumibles", "mantenimiento_kit_nivel", e.target.value)}
                                    onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                    className="w-12 bg-surface-container-low border border-outline-variant rounded px-1.5 py-0.5 text-center text-xs text-on-surface font-bold"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-outline font-bold">U. IMAGEN:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={unit ?? ""}
                                    onChange={(e) => handleRowNestedDataChange("consumibles", "unidad_imagen_nivel", e.target.value)}
                                    onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                    className="w-12 bg-surface-container-low border border-outline-variant rounded px-1.5 py-0.5 text-center text-xs text-on-surface font-bold"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {[
                                  { label: "Tóner", value: toner,  color: toner === null ? "bg-outline/25" : (toner <= 15  ? "bg-rose-500" : "bg-primary")   },
                                  { label: "Kit M.", value: maint,  color: maint === null ? "bg-outline/25" : (maint <= 15  ? "bg-rose-500" : "bg-tertiary")  },
                                  { label: "U. Img", value: unit,   color: unit === null ? "bg-outline/25" : (unit  <= 15  ? "bg-rose-500" : "bg-secondary") }
                                ].map(({ label, value, color }) => {
                                  const isNull = value === null;
                                  const isLow = !isNull && value <= 15;
                                  return (
                                    <div key={label} className="flex items-center gap-1.5 text-[9px]">
                                      <span className="w-8 text-[8px] font-bold text-outline shrink-0 uppercase tracking-wide text-right">{label}</span>
                                      <div className="h-1.5 flex-grow bg-surface-container-high rounded-full overflow-hidden border border-outline-variant/10">
                                        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: isNull ? "0%" : `${value}%` }} />
                                      </div>
                                      <span className={`w-7 text-[8px] font-extrabold text-right ${isLow ? 'text-rose-600 animate-pulse' : 'text-on-surface'}`}>
                                        {isNull ? "N/A" : `${value}%`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* ESTADÍSTICAS */}
                          <td className="px-6 py-5.5 align-middle border-r border-outline-variant/30">
                            {(() => {
                              const hasStats = printer.estadisticas;
                              const hojasTotal = printer.estadisticas?.hojas_impresas?.total ?? 0;
                              const hojasImp = printer.estadisticas?.hojas_impresas?.imprimir ?? 0;
                              const hojasCop = printer.estadisticas?.hojas_impresas?.copiar ?? 0;
                              const carasTotal = printer.estadisticas?.caras_impresas?.total ?? 0;
                              const carasImp = printer.estadisticas?.caras_impresas?.imprimir ?? 0;
                              const carasCop = printer.estadisticas?.caras_impresas?.copiar ?? 0;
                              const cargadasTotal = printer.estadisticas?.caras_cargadas?.total ?? 0;

                              return hasStats ? (
                                <div className="space-y-2 min-w-[140px]">
                                  <div className="bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 flex flex-col gap-1 shadow-sm">
                                    <div className="flex items-center justify-between text-[9px] uppercase font-bold text-outline tracking-wider">
                                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">description</span>Hojas</span>
                                      <span className="text-on-surface text-[11px] font-black">{hojasTotal.toLocaleString("es-PE")}</span>
                                    </div>
                                    <div className="flex gap-1 text-[8.5px] font-bold">
                                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-1 text-center" title="Impresas">Imp: {hojasImp.toLocaleString("es-PE")}</span>
                                      <span className="bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded flex-1 text-center" title="Copiadas">Cop: {hojasCop.toLocaleString("es-PE")}</span>
                                    </div>
                                  </div>
                                  <div className="bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 flex flex-col gap-1 shadow-sm">
                                    <div className="flex items-center justify-between text-[9px] uppercase font-bold text-outline tracking-wider">
                                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">auto_stories</span>Caras</span>
                                      <span className="text-on-surface text-[11px] font-black">{carasTotal.toLocaleString("es-PE")}</span>
                                    </div>
                                    <div className="flex gap-1 text-[8.5px] font-bold">
                                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-1 text-center" title="Impresas">Imp: {carasImp.toLocaleString("es-PE")}</span>
                                      <span className="bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded flex-1 text-center" title="Copiadas">Cop: {carasCop.toLocaleString("es-PE")}</span>
                                    </div>
                                  </div>
                                  <div className="bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 flex flex-col gap-1 shadow-sm justify-center">
                                    <div className="flex items-center justify-between text-[9px] uppercase font-bold text-outline tracking-wider">
                                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">scanner</span>Cargadas</span>
                                      <span className="text-on-surface text-[11px] font-black">{cargadasTotal.toLocaleString("es-PE")}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-outline-variant italic text-[10px]">-</span>
                              );
                            })()}
                          </td>

                          {/* ESTADO */}
                          <td className="px-6 py-5.5 align-middle border-r border-outline-variant/30">
                            {isEditing ? (
                              <span className="font-extrabold text-[10px] text-outline italic">
                                Auto-calculando...
                              </span>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider border uppercase flex items-center gap-1 w-fit shadow-sm ${
                                getPrinterStatus(printer) === "En Mantenimiento"
                                  ? "bg-blue-500/10 text-blue-600 border border-blue-500/25 animate-pulse-subtle"
                                  : checkPrinterAlerts(printer)
                                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/25"
                                    : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25"
                              }`}>
                                <span className="material-symbols-outlined text-[11px]">
                                  {getPrinterStatus(printer) === "En Mantenimiento" ? "build" : checkPrinterAlerts(printer) ? "warning" : "check_circle"}
                                </span>
                                <span>{getPrinterStatus(printer)}</span>
                                {getPrinterStatus(printer) === "Operativo" && checkPrinterAlerts(printer) && (
                                  <span className="text-[7px] lowercase italic font-normal ml-0.5">(alertas)</span>
                                )}
                              </span>
                            )}
                          </td>

                          {/* CASO CAS */}
                          <td className="px-6 py-5.5 align-middle border-r border-outline-variant/30 max-w-[200px]">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editingRowData.codigo_caso_cas || ""}
                                  onChange={(e) => handleRowDataChange("codigo_caso_cas", e.target.value)}
                                  onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                  placeholder="CAS-XXXX"
                                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary text-on-surface font-mono font-semibold"
                                />
                                <input
                                  type="text"
                                  value={editingRowData.detalle_caso || ""}
                                  onChange={(e) => handleRowDataChange("detalle_caso", e.target.value)}
                                  onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                  placeholder="Detalle del caso"
                                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary text-on-surface-variant italic"
                                />
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {printer.codigo_caso_cas ? (
                                  <>
                                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono text-[9px] inline-block font-extrabold shadow-sm">
                                      {printer.codigo_caso_cas}
                                    </span>
                                    {printer.detalle_caso && (
                                      <span className="text-[9.5px] text-on-surface-variant font-medium italic block leading-tight border-l-2 border-primary/20 pl-1.5" title={printer.detalle_caso}>
                                        {printer.detalle_caso}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-outline-variant italic text-[10px]">-</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* OBSERVACIONES */}
                          <td className="px-6 py-5.5 align-middle border-r border-outline-variant/30 max-w-[220px]">
                            {isEditing ? (
                              <textarea
                                value={editingRowData.observaciones || ""}
                                onChange={(e) => handleRowDataChange("observaciones", e.target.value)}
                                onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                placeholder="Notas y observaciones..."
                                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary text-on-surface resize-y font-medium"
                                rows={2}
                              />
                            ) : (
                              <p className="text-[10.5px] text-on-surface-variant italic line-clamp-2 leading-relaxed" title={printer.observaciones}>
                                {printer.observaciones ? `"${printer.observaciones}"` : <span className="text-outline-variant italic">-</span>}
                              </p>
                            )}
                          </td>

                          {/* ACCIONES */}
                          <td className="px-6 py-5.5 align-middle text-center pr-6">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveRowEdit(printer.id_serie)}
                                  className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow transition-all active:scale-90"
                                  title="Guardar fila"
                                >
                                  <span className="material-symbols-outlined text-base font-bold">check</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRowId(null);
                                    setEditingRowData({});
                                  }}
                                  className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-outline-variant/30 text-on-surface-variant flex items-center justify-center border border-outline-variant/60 transition-all active:scale-90"
                                  title="Cancelar edición"
                                >
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                {isAuthenticated && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartRowEdit(printer)}
                                    className="w-7 h-7 flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:bg-outline-variant/50 active:scale-90 rounded-full transition-all border border-outline-variant"
                                    title="Edición rápida"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(printer)}
                                  className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 active:scale-90 rounded-full transition-all border border-primary/20"
                                  title="Ver detalles e Historial"
                                >
                                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-surface-container-low border border-outline-variant/60 rounded-2xl p-4 mt-4 text-xs font-semibold shadow-sm select-none">
                <span className="text-outline">
                  Página <strong className="text-on-surface font-extrabold">{currentPage}</strong> de <strong className="text-on-surface font-extrabold">{totalPages}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 bg-surface-container-lowest text-on-surface-variant rounded-xl border border-outline-variant hover:bg-outline-variant/10 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                    <span>Anterior</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="flex items-center gap-1 px-3 py-1.5 bg-surface-container-lowest text-on-surface-variant rounded-xl border border-outline-variant hover:bg-outline-variant/10 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                  >
                    <span>Siguiente</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
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
