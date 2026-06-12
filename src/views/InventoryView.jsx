import React from "react";

export default function InventoryView({
  searchText,
  setSearchText,
  filterCriticidad,
  setFilterCriticidad,
  filteredPrinters,
  loadingPrinters,
  handleDownloadReport,
  handleOpenCreateModal,
  copiedSerialId,
  handleCopySerial,
  editingRowId,
  setEditingRowId,
  editingRowData,
  setEditingRowData,
  handleRowDataChange,
  handleRowNestedDataChange,
  handleStartRowEdit,
  handleSaveRowEdit,
  handleRowKeyDown,
  handleOpenEditModal,
  getPrinterStatus,
  currentPage,
  setCurrentPage,
  totalPages,
  paginatedPrinters
}) {

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
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1 px-3.5 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:bg-primary-container active:scale-95 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Registrar Impresora</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-grow">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Buscar serie, área, IP, estado... Usa & para AND, ! para NO (ej: operativa & !soporte)"
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
              { id: "Operativo", label: "Operativas" },
              { id: "Advertencia", label: "Advertencias" },
              { id: "Inoperativo", label: "Inoperativas" }
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
      <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-3.5 shadow-sm space-y-2.5 text-xs animate-fade-in">
        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
          <span className="font-bold text-on-surface flex items-center gap-1.5 text-xs uppercase tracking-wider text-outline">
            <span className="material-symbols-outlined text-sm text-primary">analytics</span>
            {searchText.trim() !== "" ? "Resultado de Búsqueda" : "Resumen del Listado"}
          </span>
          <span className="bg-primary-fixed text-primary px-2.5 py-0.5 rounded-full font-extrabold text-[10px]">
            {filteredPrinters.length} Impresora{filteredPrinters.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          {/* Breakdown by Status */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Por Estado</span>
            <div className="flex flex-wrap gap-1">
              <span className="bg-emerald-500/10 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold text-[10px]">
                Operativas: {filteredPrinters.filter(p => getPrinterStatus(p) === "Operativo").length}
              </span>
              <span className="bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded border border-amber-500/20 font-semibold text-[10px]">
                Advertencias: {filteredPrinters.filter(p => getPrinterStatus(p) === "Advertencia").length}
              </span>
              <span className="bg-rose-500/10 text-rose-700 px-1.5 py-0.5 rounded border border-rose-500/20 font-semibold text-[10px]">
                Inoperativas: {filteredPrinters.filter(p => getPrinterStatus(p) === "Inoperativo").length}
              </span>
            </div>
          </div>

          {/* Breakdown by Model */}
          <div className="space-y-1 border-l border-outline-variant/20 pl-3">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Por Modelo</span>
            <div className="space-y-0.5 text-on-surface-variant font-mono">
              <div className="flex justify-between">
                <span>MX431ADN:</span>
                <span className="font-bold">{filteredPrinters.filter(p => p.modelo === "MX431ADN").length}</span>
              </div>
              <div className="flex justify-between">
                <span>MX632ADWE:</span>
                <span className="font-bold">{filteredPrinters.filter(p => p.modelo === "MX632ADWE").length}</span>
              </div>
              <div className="flex justify-between">
                <span>MX722ADHE:</span>
                <span className="font-bold">{filteredPrinters.filter(p => p.modelo === "MX722ADHE").length}</span>
              </div>
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
                const toner  = printer.consumibles?.toner_nivel ?? 100;
                const unit   = printer.consumibles?.unidad_imagen_nivel ?? 100;
                const maint  = printer.consumibles?.mantenimiento_kit_nivel ?? 100;
                const status = getPrinterStatus(printer);
                const isInSoporteCard = (printer.area_actual || "").toLowerCase().includes("soporte");
                const isMurCard = (printer.ubicacion_entidad || "Hospital").toUpperCase() === "MUR";

                const statusColor = status === "Inoperativo"
                  ? { stripe: "bg-rose-500",    badge: "bg-rose-500/10 text-rose-600 border border-rose-500/25",   icon: "cancel",       pulse: "animate-pulse-subtle" }
                  : status === "Advertencia"
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
                          {status}
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

                        {/* IP / Connection */}
                        {printer.ip && printer.ip.trim() !== "" ? (
                          printer.ip.trim().toLowerCase() === "usb" ? (
                            <span className="text-[10px] font-bold text-secondary px-1.5 py-0.5 bg-secondary-fixed/50 rounded-md flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[11px]">usb</span>USB
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-secondary px-1.5 py-0.5 bg-secondary-fixed rounded-md flex items-center gap-0.5 font-mono">
                              <span className="material-symbols-outlined text-[11px]">dns</span>
                              {printer.ip}
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-outline px-1.5 py-0.5 bg-surface-container-high rounded-md flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">link_off</span>
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
                          { label: "Tóner", value: toner,  color: toner <= 15  ? "bg-error" : "bg-primary"   },
                          { label: "Kit",    value: maint,  color: maint <= 15  ? "bg-error" : "bg-tertiary"  },
                          { label: "U.Img",  value: unit,   color: unit  <= 15  ? "bg-error" : "bg-secondary" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className={`text-[9px] font-bold uppercase tracking-wide ${value <= 15 ? "text-error" : "text-outline"}`}>{label}</span>
                              <span className={`text-[10px] font-black ${value <= 15 ? "text-error" : "text-on-surface"}`}>{value}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

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

            {/* Desktop View (Excel-like Editable Table) */}
            <div className="hidden md:block bg-surface border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1150px] text-xs animate-fade-in">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-bold text-slate-700 select-none uppercase">
                      <th className="px-4 py-3 border-r border-slate-200">IMPRESORA/MODELO</th>
                      <th className="px-4 py-3 border-r border-slate-200">SERIE</th>
                      <th className="px-4 py-3 border-r border-slate-200">IP / USB</th>
                      <th className="px-4 py-3 border-r border-slate-200">ÁREA</th>
                      <th className="px-4 py-3 border-r border-slate-200">CONSUMIBLES</th>
                      <th className="px-4 py-3 border-r border-slate-200">OBSERVACIONES</th>
                      <th className="px-4 py-3 border-r border-slate-200">ESTADO</th>
                      <th className="px-4 py-3 border-r border-slate-200">CASO ASIGNADO</th>
                      <th className="px-4 py-3 border-r border-slate-200">DETALLES DEL CASO</th>
                      <th className="px-4 py-3 text-center">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPrinters.map((printer) => {
                      const isEditing = editingRowId === printer.id_serie;
                      const toner = isEditing
                        ? (editingRowData.consumibles?.toner_nivel ?? 100)
                        : (printer.consumibles?.toner_nivel ?? 100);
                      const unit = isEditing
                        ? (editingRowData.consumibles?.unidad_imagen_nivel ?? 100)
                        : (printer.consumibles?.unidad_imagen_nivel ?? 100);
                      const maint = isEditing
                        ? (editingRowData.consumibles?.mantenimiento_kit_nivel ?? 100)
                        : (printer.consumibles?.mantenimiento_kit_nivel ?? 100);

                      return (
                        <tr
                          key={printer.id_serie}
                          onDoubleClick={() => !isEditing && handleStartRowEdit(printer)}
                          className={`group hover:bg-slate-50/50 transition-colors border-b border-slate-200 ${
                            isEditing ? "bg-primary-fixed/10" : "even:bg-slate-50/10"
                          }`}
                        >
                          {/* IMPRESORA/MODELO */}
                          <td className="px-4 py-3 align-middle border-r border-b border-slate-200">
                            {isEditing ? (
                              <select
                                value={editingRowData.modelo || "MX431ADN"}
                                onChange={(e) => handleRowDataChange("modelo", e.target.value)}
                                onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                className="w-full bg-surface border border-outline-variant rounded-xl px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold text-on-surface"
                              >
                                <option value="MX431ADN">MX431ADN</option>
                                <option value="MX632ADWE">MX632ADWE</option>
                                <option value="MX722ADHE">MX722ADHE</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                                printer.modelo === "MX722ADHE"
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : printer.modelo === "MX632ADWE"
                                    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                    : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}>
                                {printer.modelo}
                              </span>
                            )}
                          </td>

                          {/* SERIE */}
                          <td className="px-4 py-3 align-middle border-r border-b border-slate-200">
                            <div className="flex items-center gap-1.5 group/serial">
                              <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded border border-slate-200/80 text-[11px] select-all">
                                {printer.id_serie}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopySerial(printer.id_serie)}
                                className="w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 opacity-0 group-hover/serial:opacity-100 transition-all duration-150 active:scale-90"
                                title="Copiar Serie"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {copiedSerialId === printer.id_serie ? "check" : "content_copy"}
                                </span>
                              </button>
                            </div>
                          </td>

                          {/* IP / USB */}
                          <td className="px-4 py-3 align-middle border-r border-b border-slate-200">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingRowData.ip || ""}
                                onChange={(e) => handleRowDataChange("ip", e.target.value)}
                                onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                placeholder="Ej. USB o IP"
                                className="w-full bg-surface border border-outline-variant rounded-xl px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-on-surface"
                              />
                            ) : (
                              <div className="font-mono">
                                {printer.ip && printer.ip.trim() !== "" ? (
                                  printer.ip.trim().toLowerCase() === "usb" ? (
                                    <span className="bg-secondary-fixed/50 text-on-secondary-container rounded-md px-2 py-0.5 flex items-center gap-1 w-max font-bold text-[10px]">
                                      <span className="material-symbols-outlined text-[12px]">usb</span>
                                      USB
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 text-on-surface font-semibold text-[11px]">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                      </span>
                                      {printer.ip}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-outline italic text-[11px]">No config</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* ÁREA */}
                          <td className="px-4 py-3 align-middle border-r border-b border-slate-200">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingRowData.area_actual || ""}
                                onChange={(e) => handleRowDataChange("area_actual", e.target.value)}
                                onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                placeholder="Ej. Soporte, C.E Otorrino..."
                                className="w-full bg-surface border border-outline-variant rounded-xl px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface"
                              />
                            ) : (
                              <span className="font-semibold text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-outline text-[14px]">location_on</span>
                                {printer.area_actual}
                              </span>
                            )}
                          </td>

                          {/* CONSUMIBLES */}
                          <td className="px-4 py-3 align-middle border-r border-b border-slate-200 w-44">
                            {isEditing ? (
                              <div className="space-y-1.5 py-1 text-[10px]">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-outline font-bold">TÓNER:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={toner}
                                    onChange={(e) => handleRowNestedDataChange("consumibles", "toner_nivel", e.target.value)}
                                    onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                    className="w-12 bg-surface border border-outline-variant rounded px-1 py-0.5 text-center text-xs text-on-surface font-bold"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-outline font-bold">KIT MANT:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={maint}
                                    onChange={(e) => handleRowNestedDataChange("consumibles", "mantenimiento_kit_nivel", e.target.value)}
                                    onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                    className="w-12 bg-surface border border-outline-variant rounded px-1 py-0.5 text-center text-xs text-on-surface font-bold"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-outline font-bold">U. IMAGEN:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={unit}
                                    onChange={(e) => handleRowNestedDataChange("consumibles", "unidad_imagen_nivel", e.target.value)}
                                    onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                    className="w-12 bg-surface border border-outline-variant rounded px-1 py-0.5 text-center text-xs text-on-surface font-bold"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {[
                                  { label: "Tóner", value: toner,  color: toner <= 15  ? "bg-error" : "bg-primary"   },
                                  { label: "Kit M.", value: maint,  color: maint <= 15  ? "bg-error" : "bg-tertiary"  },
                                  { label: "U. Img", value: unit,   color: unit  <= 15  ? "bg-error" : "bg-secondary" }
                                ].map(({ label, value, color }) => (
                                  <div key={label} className="flex items-center gap-1.5">
                                    <span className="w-9 text-[9px] font-bold text-outline shrink-0 uppercase tracking-wide text-right">{label}</span>
                                    <div className="h-1.5 flex-grow bg-slate-100 border border-slate-200/50 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
                                    </div>
                                    <span className={`w-8 text-[9px] font-black text-right ${value <= 15 ? 'text-error' : 'text-on-surface'}`}>{value}%</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* OBSERVACIONES */}
                          <td className="px-4 py-3 align-middle border-r border-b border-slate-200">
                            {isEditing ? (
                              <textarea
                                value={editingRowData.observaciones || ""}
                                onChange={(e) => handleRowDataChange("observaciones", e.target.value)}
                                onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                placeholder="Notas y observaciones..."
                                className="w-full bg-surface border border-outline-variant rounded-xl p-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface resize-y"
                                rows={2}
                              />
                            ) : (
                              <span className="text-on-surface-variant line-clamp-2 italic leading-relaxed" title={printer.observaciones}>
                                {printer.observaciones || <span className="text-slate-300">-</span>}
                              </span>
                            )}
                          </td>

                          {/* ESTADO */}
                          <td className="px-4 py-3 align-middle border-r border-b border-slate-200">
                            {isEditing ? (
                              <span className="font-extrabold text-[10px] text-outline italic">
                                Auto-calculando...
                              </span>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider border uppercase flex items-center gap-1 w-fit ${
                                getPrinterStatus(printer) === "Inoperativo"
                                  ? "bg-rose-500/10 text-rose-600 border border-rose-500/25 animate-pulse-subtle"
                                  : getPrinterStatus(printer) === "Advertencia"
                                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/25"
                                    : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25"
                              }`}>
                                <span className="material-symbols-outlined text-[10px]">
                                  {getPrinterStatus(printer) === "Inoperativo" ? "cancel" : getPrinterStatus(printer) === "Advertencia" ? "warning" : "check_circle"}
                                </span>
                                {getPrinterStatus(printer)}
                              </span>
                            )}
                          </td>

                          {/* CASO ASIGNADO */}
                          <td className="px-4 py-3 align-middle border-r border-b border-slate-200">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingRowData.codigo_caso_cas || ""}
                                onChange={(e) => handleRowDataChange("codigo_caso_cas", e.target.value)}
                                onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                placeholder="CAS-XXXX"
                                className="w-full bg-surface border border-outline-variant rounded-xl px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface font-mono font-semibold"
                              />
                            ) : (
                              printer.codigo_caso_cas ? (
                                <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono text-[10px] block w-max max-w-[130px] truncate font-bold" title={printer.codigo_caso_cas}>
                                  {printer.codigo_caso_cas}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )
                            )}
                          </td>

                          {/* DETALLES DEL CASO */}
                          <td className="px-4 py-3 align-middle border-r border-b border-slate-200">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingRowData.detalle_caso || ""}
                                onChange={(e) => handleRowDataChange("detalle_caso", e.target.value)}
                                onKeyDown={(e) => handleRowKeyDown(e, printer.id_serie)}
                                placeholder="Detalle de caso"
                                className="w-full bg-surface border border-outline-variant rounded-xl px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface-variant italic leading-tight"
                              />
                            ) : (
                              printer.detalle_caso ? (
                                <span className="text-[10px] text-slate-500 italic block max-w-[180px] truncate leading-tight" title={printer.detalle_caso}>
                                  {printer.detalle_caso}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )
                            )}
                          </td>

                          {/* ACCIONES */}
                          <td className="px-4 py-3 align-middle border-b border-slate-200 text-center">
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
                                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center border border-slate-200 transition-all active:scale-90"
                                  title="Cancelar edición"
                                >
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button
                                  type="button"
                                  onClick={() => handleStartRowEdit(printer)}
                                  className="w-7 h-7 flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:bg-outline-variant/50 active:scale-90 rounded-full transition-all border border-outline-variant"
                                  title="Edición rápida"
                                >
                                  <span className="material-symbols-outlined text-[15px]">edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(printer)}
                                  className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 active:scale-90 rounded-full transition-all border border-primary/20"
                                  title="Ver detalles e Historial"
                                >
                                  <span className="material-symbols-outlined text-[15px]">visibility</span>
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
