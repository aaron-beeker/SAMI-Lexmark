import React from "react";
import { useNavigate } from 'react-router-dom';
import HospitalMapView from "./HospitalMapView";
import { useAuthContext } from '../contexts/AuthContext';
import { useUIContext } from '../contexts/UIContext';
import { useDataContext } from '../contexts/DataContext';

export default function DashboardView() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const { setFilterCriticidad } = useUIContext();
  
  const { 
    printers, loadingPrinters, 
    kpiAdvertencias, 
    kpiHospitalTotal, kpiHospitalEnServicio, 
    kpiMurTotal, kpiLexmarkTotal, 
    getPrinterStatus, checkPrinterAlerts, handleOpenEditModal, 
    setSearchText 
  } = useDataContext();

  const totalHojas = printers.reduce((acc, p) => acc + (p.estadisticas?.hojas_impresas?.total || 0), 0);
  const totalCaras = printers.reduce((acc, p) => acc + (p.estadisticas?.caras_impresas?.total || 0), 0);
  const totalCarasCargadas = printers.reduce((acc, p) => acc + (p.estadisticas?.caras_cargadas?.total || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header Minimalista */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-md text-2xl text-on-background font-black tracking-tight">Dashboard</h2>
          <p className="text-sm text-outline font-medium mt-1">Resumen general del estado del servicio de impresión</p>
        </div>
      </div>

      {/* KPI Cards Grid - Diseñado basado en la imagen provista */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Equipos */}
        <div
          onClick={() => {
            setFilterCriticidad("all");
            navigate("/inventario");
          }}
          className="p-5 bg-surface-container-lowest border border-outline-variant/50 rounded-xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] relative group"
        >
          <div className="absolute right-4 top-4 text-outline-variant opacity-30 group-hover:opacity-50 transition-all">
            <span className="material-symbols-outlined text-4xl">print</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant font-bold text-xs tracking-wide">
             <span className="material-symbols-outlined text-[16px]">inventory_2</span>
             <span>Total de Equipos Contratados</span>
          </div>
          <span className="text-4xl font-black text-primary tracking-tight">41</span>
        </div>

        {/* Card 2: En Servicio */}
        <div
          onClick={() => {
            setFilterCriticidad("En Servicio");
            setSearchText("");
            navigate("/inventario");
          }}
          className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs tracking-wide">
             <span className="material-symbols-outlined text-[16px]">check_circle</span>
             <span>En Servicio</span>
          </div>
          <span className="text-4xl font-black text-emerald-600 tracking-tight">{loadingPrinters ? "..." : kpiHospitalEnServicio}</span>
        </div>

        {/* Card 3: Vigilancia Predictiva */}
        <div
          onClick={() => {
            setFilterCriticidad("Advertencia");
            navigate("/inventario");
          }}
          className="p-5 bg-blue-50 border border-blue-100 rounded-xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs tracking-wide">
             <span className="material-symbols-outlined text-[16px]">content_paste_search</span>
             <span>Vigilancia Predictiva</span>
          </div>
          <span className="text-4xl font-black text-blue-600 tracking-tight">{loadingPrinters ? "..." : kpiAdvertencias}</span>
        </div>

        {/* Card 4: Backup Soporte */}
        <div
          onClick={() => {
            setFilterCriticidad("all");
            setSearchText("Soporte");
            navigate("/inventario");
          }}
          className="p-5 bg-slate-50 border border-slate-100 rounded-xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-start gap-2 text-blue-600 font-bold text-xs tracking-wide leading-tight max-w-[85%]">
             <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">build</span>
             <span>Equipo de Backup En Oficina de Soporte</span>
          </div>
          <span className="text-4xl font-black text-blue-600 tracking-tight">{loadingPrinters ? "..." : printers.filter(p => (p.area_actual || "").toLowerCase().includes("soporte")).length}</span>
        </div>

      </section>

      {/* Estadísticas Globales de Impresión (Minimalistas) */}
      <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 shadow-sm space-y-6">
        <h2 className="font-headline-md text-lg text-on-background font-black tracking-tight">Consumo Global (Actual)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <div className="flex flex-col">
              <span className="text-outline uppercase tracking-wider font-extrabold text-[10px]">Total Hojas</span>
              <span className="text-2xl font-black text-on-surface leading-tight">
                {loadingPrinters ? "..." : totalHojas.toLocaleString("es-PE")}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">auto_stories</span>
            </div>
            <div className="flex flex-col">
              <span className="text-outline uppercase tracking-wider font-extrabold text-[10px]">Total Caras Impresas</span>
              <span className="text-2xl font-black text-on-surface leading-tight">
                {loadingPrinters ? "..." : totalCaras.toLocaleString("es-PE")}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">scanner</span>
            </div>
            <div className="flex flex-col">
              <span className="text-outline uppercase tracking-wider font-extrabold text-[10px]">Caras Cargadas</span>
              <span className="text-2xl font-black text-on-surface leading-tight">
                {loadingPrinters ? "..." : totalCarasCargadas.toLocaleString("es-PE")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Distribución Física de Equipos (Minimalista y Horizontal) */}
      <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-outline uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <span className="material-symbols-outlined text-[16px]">share_location</span>
          Equipos por Ubicación
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 hover:shadow-sm transition-all">
            <div className="flex flex-col">
              <span className="text-sm font-bold flex items-center gap-1.5 text-on-surface"><span className="material-symbols-outlined text-primary text-[18px]">local_hospital</span>Hospital</span>
              <span className="text-[10px] text-outline mt-1 uppercase tracking-wider font-bold">Operativos: <span className="text-primary">{loadingPrinters ? "..." : kpiHospitalEnServicio}</span></span>
            </div>
            <span className="text-3xl font-black text-on-surface">{loadingPrinters ? "..." : kpiHospitalTotal}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 hover:shadow-sm transition-all">
            <div className="flex flex-col">
              <span className="text-sm font-bold flex items-center gap-1.5 text-on-surface"><span className="material-symbols-outlined text-secondary text-[18px]">corporate_fare</span>Sede MUR</span>
              <span className="text-[10px] text-outline mt-1 uppercase tracking-wider font-bold">Taller Externo</span>
            </div>
            <span className="text-3xl font-black text-secondary">{loadingPrinters ? "..." : kpiMurTotal}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 hover:shadow-sm transition-all">
            <div className="flex flex-col">
              <span className="text-sm font-bold flex items-center gap-1.5 text-on-surface"><span className="material-symbols-outlined text-purple-600 text-[18px]">precision_manufacturing</span>Lexmark</span>
              <span className="text-[10px] text-outline mt-1 uppercase tracking-wider font-bold">Taller Oficial</span>
            </div>
            <span className="text-3xl font-black text-purple-600">{loadingPrinters ? "..." : kpiLexmarkTotal}</span>
          </div>
        </div>
      </section>

      {/* Módulo de Geolocalización Hospitalaria (Abarca todo el ancho) */}
      <section className="w-full">
        <HospitalMapView
          printers={printers}
          getPrinterStatus={getPrinterStatus}
          checkPrinterAlerts={checkPrinterAlerts}
          handleOpenEditModal={handleOpenEditModal}
          isAuthenticated={isAuthenticated}
        />
      </section>
    </div>
  );
}
