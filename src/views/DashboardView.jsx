import React from "react";
import StockView from "./StockView";
import HospitalMapView from "./HospitalMapView";
import BillingChartView from "./BillingChartView";

export default function DashboardView({
  printers,
  loadingPrinters,
  repuestos,
  kpiTotal,
  kpiOperativas,
  kpiAdvertencias,
  kpiInoperativas,
  kpiHospitalTotal,
  kpiHospitalEnServicio,
  kpiHospitalEnSoporte,
  kpiMurTotal,
  kpiLexmarkTotal,
  getPrinterStatus,
  checkPrinterAlerts,
  setCurrentTab,
  setFilterCriticidad,
  handleOpenEditModal,
  handleDecrementStockClick,
  updateManualStock,
  isAuthenticated,
  billingCycles,
  loadingBilling,
  closeMonth,
  setSearchText
}) {
  const totalHojas = printers.reduce((acc, p) => acc + (p.estadisticas?.hojas_impresas?.total || 0), 0);
  const totalCaras = printers.reduce((acc, p) => acc + (p.estadisticas?.caras_impresas?.total || 0), 0);
  const totalCarasCargadas = printers.reduce((acc, p) => acc + (p.estadisticas?.caras_cargadas?.total || 0), 0);

  const handleCloseMonth = async () => {
    if (!window.confirm("¿Confirmas que deseas registrar el corte de este mes con los totales actuales?")) return;
    try {
      await closeMonth(totalHojas, totalCaras);
      alert("Corte mensual registrado exitosamente.");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setFilterCriticidad("all");
            setCurrentTab("inventario");
          }}
          className="p-5 bg-surface border border-outline-variant rounded-2xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.97] relative overflow-hidden group"
        >
          <div className="absolute right-3 top-3 text-primary/10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl">print</span>
          </div>
          <p className="text-on-surface-variant font-semibold text-xs flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            Total de Equipos Contratados
          </p>
          <span className="text-3xl font-extrabold text-primary">41</span>
        </div>

        <div
          onClick={() => {
            setFilterCriticidad("En Servicio");
            setSearchText("");
            setCurrentTab("inventario");
          }}
          className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.97]"
        >
          <p className="text-emerald-600 font-semibold flex items-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            En Servicio
          </p>
          <span className="text-3xl font-extrabold text-emerald-700">{loadingPrinters ? "..." : kpiHospitalEnServicio}</span>
        </div>

        <div
          onClick={() => {
            setFilterCriticidad("Advertencia");
            setCurrentTab("inventario");
          }}
          className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.97]"
        >
          <p className="text-blue-600 font-semibold flex items-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-sm">content_paste_search</span>
            Vigilancia Predictiva
          </p>
          <span className="text-3xl font-extrabold text-blue-700">{loadingPrinters ? "..." : kpiAdvertencias}</span>
        </div>

        <div
          onClick={() => {
            setFilterCriticidad("all");
            setSearchText("Soporte");
            setCurrentTab("inventario");
          }}
          className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.97]"
        >
          <p className="text-blue-600 font-semibold flex items-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-sm">build</span>
            Equipo de Backup En Oficina de Soporte
          </p>
          <span className="text-3xl font-extrabold text-blue-700">{loadingPrinters ? "..." : printers.filter(p => (p.area_actual || "").toLowerCase().includes("soporte")).length}</span>
        </div>
      </section>

      {/* Estadísticas Globales de Impresión */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-lg text-on-background font-bold">Estadísticas Globales de Impresión</h2>
          {isAuthenticated && (
            <button
              onClick={handleCloseMonth}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-md hover:bg-primary-container hover:text-on-primary-container active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              Registrar Cierre (Día 19)
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-surface-container-low border border-outline-variant/60 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-outline uppercase tracking-widest font-extrabold text-[10px] mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">description</span>
                Total Hojas Impresas
              </p>
              <span className="text-2xl font-black text-on-surface">
                {loadingPrinters ? "..." : totalHojas.toLocaleString("es-PE")}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
          </div>
          <div className="p-5 bg-surface-container-low border border-outline-variant/60 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-outline uppercase tracking-widest font-extrabold text-[10px] mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                Total Caras Impresas
              </p>
              <span className="text-2xl font-black text-on-surface">
                {loadingPrinters ? "..." : totalCaras.toLocaleString("es-PE")}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">auto_stories</span>
            </div>
          </div>
          <div className="p-5 bg-surface-container-low border border-outline-variant/60 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-outline uppercase tracking-widest font-extrabold text-[10px] mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">scanner</span>
                Total Caras Cargadas
              </p>
              <span className="text-2xl font-black text-on-surface">
                {loadingPrinters ? "..." : totalCarasCargadas.toLocaleString("es-PE")}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">scanner</span>
            </div>
          </div>
        </div>

        {/* Evolución Histórica */}
        <BillingChartView billingCycles={billingCycles} loadingBilling={loadingBilling} />
      </section>

      {/* Módulo de Geolocalización Hospitalaria */}
      <HospitalMapView
        printers={printers}
        getPrinterStatus={getPrinterStatus}
        checkPrinterAlerts={checkPrinterAlerts}
        handleOpenEditModal={handleOpenEditModal}
        isAuthenticated={isAuthenticated}
      />

      {/* Desktop Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Main Stats & Alertas) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Ubicación y Estados de Servicio Grid */}
          <section className="bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">location_on</span>
              Ubicación Física y Estado de Servicio
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {/* Hospital Card */}
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 flex flex-col justify-between space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary text-sm">local_hospital</span>
                    Hospital
                  </span>
                  <span className="text-lg font-black text-primary">{loadingPrinters ? "..." : kpiHospitalTotal}</span>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-outline-variant/20">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      En Servicio:
                    </span>
                    <span className="font-bold">{loadingPrinters ? "..." : kpiHospitalEnServicio}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-subtle"></span>
                      En Soporte:
                    </span>
                    <span className="font-bold">{loadingPrinters ? "..." : kpiHospitalEnSoporte}</span>
                  </div>
                </div>
              </div>

              {/* MUR Card */}
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 flex flex-col justify-between space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-secondary text-sm">corporate_fare</span>
                    MUR
                  </span>
                  <span className="text-lg font-black text-secondary">{loadingPrinters ? "..." : kpiMurTotal}</span>
                </div>
                <p className="text-[10px] text-outline pt-2 border-t border-outline-variant/20 leading-tight">
                  Equipos en taller externo de MUR.
                </p>
              </div>

              {/* Lexmark Card */}
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 flex flex-col justify-between space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-purple-600 text-sm">precision_manufacturing</span>
                    Lexmark
                  </span>
                  <span className="text-lg font-black text-purple-600">{loadingPrinters ? "..." : kpiLexmarkTotal}</span>
                </div>
                <p className="text-[10px] text-outline pt-2 border-t border-outline-variant/20 leading-tight">
                  Equipos en taller oficial de Lexmark.
                </p>
              </div>
            </div>
          </section>

          {/* Quick Summary Section (Alertas) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-lg text-on-background font-bold">Resumen de Alertas</h2>
              <button
                onClick={() => {
                  setFilterCriticidad("all");
                  setCurrentTab("inventario");
                }}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Ver todo
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>

            <div className="space-y-3">
              {loadingPrinters ? (
                <div className="p-8 text-center text-outline-variant">Cargando datos...</div>
              ) : printers.filter(p => getPrinterStatus(p) === "Operativo" && checkPrinterAlerts(p)).length === 0 ? (
                <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
                  <p className="font-semibold">No hay equipos con alertas activas</p>
                </div>
              ) : (
                printers
                  .filter(p => getPrinterStatus(p) === "Operativo" && checkPrinterAlerts(p))
                  .slice(0, 5)
                  .map((printer) => {
                    const status = getPrinterStatus(printer);
                    const toner  = printer.consumibles?.toner_nivel ?? null;
                    const unit   = printer.consumibles?.unidad_imagen_nivel ?? null;
                    const maint  = printer.consumibles?.mantenimiento_kit_nivel ?? null;
                    const isInSoporteAlert = (printer.area_actual || "").toLowerCase().includes("soporte");
                    const isMurAlert = (printer.ubicacion_entidad || "Hospital").toUpperCase() === "MUR";

                    const alertColor = { stripe: "bg-amber-500",  badge: "bg-amber-500/10 text-amber-600 border-amber-500/25", icon: "warning", pulse: "",                     bg: "bg-surface-container-lowest border-outline-variant" };

                    return (
                      <div
                        key={printer.id_serie}
                        onClick={() => handleOpenEditModal(printer)}
                        className={`flex border rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:bg-surface-container-low active:scale-[0.98] transition-all ${alertColor.bg}`}
                      >
                        {/* Left status stripe */}
                        <div className={`w-1.5 shrink-0 ${alertColor.stripe} ${alertColor.pulse}`} />

                        {/* Card body */}
                        <div className="flex-1 p-3.5 space-y-3 min-w-0">
                          {/* TOP ROW: Serial + Status badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="material-symbols-outlined text-primary text-[14px]">tag</span>
                                <span className="font-mono font-black text-base text-on-background tracking-wider leading-none">
                                  {printer.id_serie}
                                </span>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${alertColor.badge} ${alertColor.pulse}`}>
                              <span className="material-symbols-outlined text-[11px]">{alertColor.icon}</span>
                              {status} {status === "Operativo" && checkPrinterAlerts(printer) && <span className="text-[9px] lowercase italic font-normal ml-0.5">(con alertas)</span>}
                            </span>
                          </div>

                          {/* MIDDLE ROW: Model, Area, IP */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded-lg border border-outline-variant/40">
                              {printer.modelo}
                            </span>
                            <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px] text-outline">location_on</span>
                              {printer.area_actual}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                              isMurAlert
                                ? "bg-secondary-fixed/30 text-secondary border border-secondary/20"
                                : isInSoporteAlert
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-primary-fixed/30 text-primary border border-primary/10"
                            }`}>
                              <span className="material-symbols-outlined text-[11px]">
                                {isMurAlert ? "corporate_fare" : isInSoporteAlert ? "build" : "local_hospital"}
                              </span>
                              {isMurAlert ? "MUR" : isInSoporteAlert ? "En Soporte" : "En Servicio"}
                            </span>
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

                          {/* Observations */}
                          {printer.observaciones && (
                            <p className="text-[10px] italic text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-lg border border-dashed border-outline-variant/30 leading-tight">
                              {printer.observaciones}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </section>
        </div>

        {/* Right Column (AI Quick Link & Stock) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Gemini Callout */}
          {isAuthenticated && (
            <section
              onClick={() => setCurrentTab("chat")}
              className="p-5 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-between"
            >
              <div className="space-y-1 flex-1 pr-4">
                <h3 className="font-bold text-base flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-lg animate-pulse-subtle">smart_toy</span>
                  Consultar SAMI AI
                </h3>
                <p className="text-xs text-on-primary-container/90">Sube foto de panel de control o reporta estado de consumibles por texto.</p>
              </div>
              <span className="material-symbols-outlined text-2xl opacity-80">chevron_right</span>
            </section>
          )}

          {/* Stock / Repuestos Section */}
          <StockView
            repuestos={repuestos}
            handleDecrementStockClick={handleDecrementStockClick}
            updateManualStock={updateManualStock}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </div>
  );
}

