import React, { useState } from "react";

const FLOORS = {
  "Piso 1": {
    title: "Piso 1: Emergencia & Admisiones",
    rooms: [
      { id: "emergencia", label: "Emergencias & Tópicos", x: 60, y: 40, w: 310, h: 115 },
      { id: "admision", label: "Admisiones Generales", x: 400, y: 40, w: 340, h: 115 },
      { id: "atencion", label: "Atención Inmediata", x: 60, y: 225, w: 250, h: 115 },
      { id: "otros", label: "Pasillos & Hall Central", x: 340, y: 225, w: 400, h: 115 }
    ],
    corridor: { x: 60, y: 170, w: 680, h: 40, label: "Corredor Principal" }
  },
  "Piso 2": {
    title: "Piso 2: Especialidades & Oncología",
    rooms: [
      { id: "oncologia", label: "Oncología & Hospitalización", x: 60, y: 40, w: 320, h: 115 },
      { id: "hematologia", label: "Hematología & Banco de Sangre", x: 410, y: 40, w: 330, h: 115 },
      { id: "otorrino", label: "Consultorio Otorrinolaringología", x: 60, y: 225, w: 280, h: 115 },
      { id: "archivo", label: "Archivo Central", x: 370, y: 225, w: 370, h: 115 }
    ],
    corridor: { x: 60, y: 170, w: 680, h: 40, label: "Corredor Central" }
  },
  "Piso 3": {
    title: "Piso 3: Tecnología & Soporte",
    rooms: [
      { id: "soporte", label: "Soporte Técnico (Taller)", x: 60, y: 40, w: 320, h: 115 },
      { id: "oei", label: "Oficina OEI & Jefatura", x: 410, y: 40, w: 330, h: 115 },
      { id: "informatica", label: "Oficina Informática", x: 60, y: 225, w: 320, h: 115 },
      { id: "telecom", label: "Telecomunicaciones", x: 410, y: 225, w: 330, h: 115 }
    ],
    corridor: { x: 60, y: 170, w: 680, h: 40, label: "Corredor de Sistemas" }
  }
};

const mapAreaToFloorAndRoom = (areaName = "", ubicacionEntidad = "Hospital") => {
  const area = areaName.toLowerCase().trim();
  
  if (ubicacionEntidad.toUpperCase() === "MUR") {
    return { floor: "Externo", room: "external", label: "Taller Externo MUR" };
  }
  
  if (area.includes("emergencia") || area.includes("tópico") || area.includes("topico")) {
    return { floor: "Piso 1", room: "emergencia", label: "Emergencias & Tópicos" };
  }
  if (area.includes("admisión") || area.includes("admision")) {
    if (area.includes("oncologia") || area.includes("oncología")) {
      return { floor: "Piso 2", room: "oncologia", label: "Hospitalización / Admisión Oncología" };
    }
    return { floor: "Piso 1", room: "admision", label: "Admisiones Generales" };
  }
  if (area.includes("atención inmediata") || area.includes("atencion inmediata") || area.includes("inmediata")) {
    return { floor: "Piso 1", room: "atencion", label: "Atención Inmediata" };
  }
  
  if (area.includes("oncologia") || area.includes("oncología")) {
    return { floor: "Piso 2", room: "oncologia", label: "Hospitalización / Admisión Oncología" };
  }
  if (area.includes("hematología") || area.includes("hematologia") || area.includes("sangre")) {
    return { floor: "Piso 2", room: "hematologia", label: "Hematología & Banco de Sangre" };
  }
  if (area.includes("otorrinolaringología") || area.includes("otorrino")) {
    return { floor: "Piso 2", room: "otorrino", label: "Consultorio Otorrinolaringología" };
  }
  if (area.includes("archivo")) {
    return { floor: "Piso 2", room: "archivo", label: "Archivo Central" };
  }
  
  if (area.includes("soporte")) {
    return { floor: "Piso 3", room: "soporte", label: "Soporte Técnico (Taller)" };
  }
  if (area.includes("oei") || area.includes("jefatura")) {
    return { floor: "Piso 3", room: "oei", label: "Oficina OEI & Jefatura" };
  }
  if (area.includes("informática") || area.includes("informatica")) {
    return { floor: "Piso 3", room: "informatica", label: "Oficina Informática" };
  }
  if (area.includes("telecomunicaciones") || area.includes("telecom")) {
    return { floor: "Piso 3", room: "telecom", label: "Telecomunicaciones" };
  }
  
  // Default fallbacks
  if (area.includes("pendiente") || area.includes("asignacion")) {
    return { floor: "Externo", room: "external", label: "Pendientes de Asignación" };
  }
  
  return { floor: "Piso 1", room: "otros", label: "Pasillos & Hall Central" };
};

const getDotPosition = (index, total, rx, ry, rw, rh) => {
  if (total === 1) {
    return { cx: rx + rw / 2, cy: ry + rh / 2 };
  }
  const padding = 35;
  const usableWidth = rw - padding * 2;
  const step = usableWidth / (total - 1 || 1);
  const cx = rx + padding + index * step;
  const cy = ry + rh / 2;
  return { cx, cy };
};

export default function HospitalMapView({ printers, getPrinterStatus, checkPrinterAlerts, handleOpenEditModal, isAuthenticated }) {
  const [activeFloor, setActiveFloor] = useState("Piso 1");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedPrinterSn, setSelectedPrinterSn] = useState(null);

  // Group printers by floor and room
  const mappedPrinters = printers.map(p => {
    const mapping = mapAreaToFloorAndRoom(p.area_actual, p.ubicacion_entidad);
    return {
      ...p,
      mapping,
      status: getPrinterStatus(p),
      hasAlerts: checkPrinterAlerts(p)
    };
  });

  const getPrintersInRoom = (floor, roomId) => {
    return mappedPrinters.filter(p => p.mapping.floor === floor && p.mapping.room === roomId);
  };

  // Determine status color for room
  const getRoomStatusStyle = (floor, roomId) => {
    const roomPrinters = getPrintersInRoom(floor, roomId);
    if (roomPrinters.length === 0) {
      return {
        fill: "fill-slate-50 dark:fill-slate-900/10",
        stroke: "stroke-slate-200 dark:stroke-slate-800",
        text: "text-slate-400 dark:text-slate-600",
        lightGlow: "bg-slate-50 border-slate-200"
      };
    }

    const hasInoperative = roomPrinters.some(p => p.status === "En Mantenimiento");
    if (hasInoperative) {
      return {
        fill: "fill-blue-500/10 hover:fill-blue-500/15",
        stroke: "stroke-blue-500",
        text: "text-blue-700 dark:text-blue-400 font-bold",
        lightGlow: "bg-blue-50 border-blue-200"
      };
    }

    const hasWarning = roomPrinters.some(p => p.hasAlerts);
    if (hasWarning) {
      return {
        fill: "fill-amber-500/10 hover:fill-amber-500/15",
        stroke: "stroke-amber-500",
        text: "text-amber-700 dark:text-amber-400 font-bold",
        lightGlow: "bg-amber-50 border-amber-200"
      };
    }

    return {
      fill: "fill-emerald-500/5 hover:fill-emerald-500/10",
      stroke: "stroke-emerald-500/40",
      text: "text-emerald-700 dark:text-emerald-400",
      lightGlow: "bg-emerald-50 border-emerald-100"
    };
  };

  const currentFloorData = FLOORS[activeFloor];
  const printersInActiveFloor = mappedPrinters.filter(p => p.mapping.floor === activeFloor);

  const selectedRoomDetails = currentFloorData?.rooms.find(r => r.id === selectedRoomId);

  const handleRoomClick = (roomId) => {
    setSelectedRoomId(roomId === selectedRoomId ? null : roomId);
    setSelectedPrinterSn(null);
  };

  const getStatusBadgeClass = (status, hasAlerts) => {
    if (status === "En Mantenimiento") {
      return "bg-blue-500/10 text-blue-600 border border-blue-500/20";
    }
    if (hasAlerts) {
      return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
    }
    return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
  };

  return (
    <section className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
      {/* Styles for pulsing animations in SVG map */}
      <style dangerouslySetInnerHTML={{ __html: `
        .pulse-circle-blue {
          animation: svgPulseBlue 1.6s infinite ease-out;
          transform-origin: center;
        }
        .pulse-circle-amber {
          animation: svgPulseAmber 1.6s infinite ease-out;
          transform-origin: center;
        }
        @keyframes svgPulseBlue {
          0% { r: 5px; opacity: 0.9; }
          100% { r: 15px; opacity: 0; }
        }
        @keyframes svgPulseAmber {
          0% { r: 5px; opacity: 0.9; }
          100% { r: 15px; opacity: 0; }
        }
      `}} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-0.5">
          <h2 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">map</span>
            Geolocalización de Dispositivos
          </h2>
          <p className="text-xs text-on-surface-variant">
            Ubicación espacial de impresoras por pabellones y pisos en tiempo real.
          </p>
        </div>

        {/* Floor selector tabs */}
        <div className="flex bg-surface-container-high p-1 rounded-xl border border-outline-variant/60 shrink-0">
          {Object.keys(FLOORS).map((floor) => (
            <button
              key={floor}
              onClick={() => {
                setActiveFloor(floor);
                setSelectedRoomId(null);
                setSelectedPrinterSn(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFloor === floor
                  ? "bg-surface text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left pane: The Map */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative border border-outline-variant/60 rounded-2xl bg-surface-container-low p-5 flex flex-col items-center justify-center overflow-hidden shadow-sm">
            <div className="w-full flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-primary uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">floor</span>
                {currentFloorData?.title}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                {printersInActiveFloor.length} {printersInActiveFloor.length === 1 ? "Dispositivo" : "Dispositivos"}
              </span>
            </div>
            
            <svg
              viewBox="0 0 800 380"
              className="w-full h-auto max-h-[350px] font-sans antialiased text-on-surface transition-all select-none"
            >
              {/* Background Grid for blueprint aesthetic */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant/15" />
                </pattern>
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1" />
                </filter>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" rx="12" className="text-surface-container-lowest" />

              {/* Corridor */}
              {currentFloorData?.corridor && (
                <g>
                  <rect
                    x={currentFloorData.corridor.x}
                    y={currentFloorData.corridor.y}
                    width={currentFloorData.corridor.w}
                    height={currentFloorData.corridor.h}
                    fill="currentColor"
                    className="text-surface-container-high/40 stroke-outline-variant/40"
                    strokeWidth="1.5"
                    strokeDasharray="4"
                    rx="8"
                  />
                  <text
                    x={currentFloorData.corridor.x + currentFloorData.corridor.w / 2}
                    y={currentFloorData.corridor.y + 24}
                    textAnchor="middle"
                    className="text-[10px] fill-on-surface-variant/60 font-bold uppercase tracking-widest pointer-events-none"
                  >
                    {currentFloorData.corridor.label}
                  </text>
                </g>
              )}

              {/* Rooms */}
              {currentFloorData?.rooms.map((room) => {
                const style = getRoomStatusStyle(activeFloor, room.id);
                const isSelected = selectedRoomId === room.id;
                const roomPrinters = getPrintersInRoom(activeFloor, room.id);

                return (
                  <g key={room.id} className="group cursor-pointer" onClick={() => handleRoomClick(room.id)}>
                    {/* Room Area Rectangle */}
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.w}
                      height={room.h}
                      className={`${style.fill} ${style.stroke} transition-all duration-300`}
                      strokeWidth={isSelected ? 3 : 1.5}
                      rx="12"
                      filter={isSelected ? "url(#shadow)" : undefined}
                    />

                    {/* Room Name */}
                    <text
                      x={room.x + 14}
                      y={room.y + 26}
                      className={`text-xs ${style.text} pointer-events-none select-none`}
                      fontWeight="800"
                    >
                      {room.label}
                    </text>

                    {/* Room printer count badge */}
                    {roomPrinters.length > 0 && (
                      <g transform={`translate(${room.x + room.w - 32}, ${room.y + 14})`}>
                        <rect
                          width="18"
                          height="18"
                          rx="6"
                          className="fill-primary text-on-primary shadow-sm"
                        />
                        <text
                          x="9"
                          y="13"
                          textAnchor="middle"
                          className="text-[9px] font-black fill-on-primary pointer-events-none"
                        >
                          {roomPrinters.length}
                        </text>
                      </g>
                    )}

                    {/* Printer Nodes (Dots) inside the Room */}
                    {roomPrinters.map((printer, index) => {
                      const { cx, cy } = getDotPosition(index, roomPrinters.length, room.x, room.y, room.w, room.h);
                      const isPrinterSelected = selectedPrinterSn === printer.id_serie;

                      let dotColor = "fill-emerald-500 stroke-white dark:stroke-slate-950";
                      let pulseClass = null;

                      if (printer.status === "En Mantenimiento") {
                        dotColor = "fill-blue-500 stroke-white dark:stroke-slate-950";
                        pulseClass = "pulse-circle-blue fill-blue-500";
                      } else if (printer.hasAlerts) {
                        dotColor = "fill-amber-500 stroke-white dark:stroke-slate-950";
                        pulseClass = "pulse-circle-amber fill-amber-500";
                      }

                      return (
                        <g
                          key={printer.id_serie}
                          onClick={(e) => {
                            e.stopPropagation(); // Avoid room double toggle
                            setSelectedRoomId(room.id);
                            setSelectedPrinterSn(printer.id_serie);
                          }}
                        >
                          {/* Pulse background circle if warning/inoperative */}
                          {pulseClass && (
                            <circle
                              cx={cx}
                              cy={cy + 15}
                              r="5"
                              className={pulseClass}
                            />
                          )}
                          {/* Main Dot */}
                          <circle
                            cx={cx}
                            cy={cy + 15}
                            r={isPrinterSelected ? 9 : 7}
                            className={`${dotColor} transition-all duration-300 stroke-2 hover:scale-125 cursor-pointer`}
                          />
                          {/* Model text indicator */}
                          <text
                            x={cx}
                            y={cy + 34}
                            textAnchor="middle"
                            className="text-[9px] fill-on-surface-variant font-mono font-bold select-none pointer-events-none"
                          >
                            {printer.id_serie.slice(-4)}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 p-3 bg-surface-container-low/60 rounded-xl border border-outline-variant/50 text-[11px] backdrop-blur-sm shadow-sm">
            <span className="text-outline font-extrabold uppercase tracking-widest text-[9px] mr-2">Leyenda:</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900 shadow-sm"></span>
              <span className="text-on-surface font-semibold">Operativo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white dark:border-slate-900 shadow-sm animate-pulse-subtle"></span>
              <span className="text-on-surface font-semibold">Con Alertas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white dark:border-slate-900 shadow-sm animate-pulse-subtle"></span>
              <span className="text-on-surface font-semibold">En Mantenimiento</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2.5 rounded-md bg-surface-container-high border border-outline-variant shadow-sm"></span>
              <span className="text-on-surface font-semibold">Área sin Impresora</span>
            </div>
          </div>
        </div>

        {/* Right pane: Selection Details */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex-1 border border-outline-variant/60 rounded-xl p-4 bg-surface-container-lowest flex flex-col min-h-[300px]">
            {/* 1. Printer Detail Chosen */}
            {selectedPrinterSn ? (() => {
              const printer = mappedPrinters.find(p => p.id_serie === selectedPrinterSn);
              if (!printer) return null;
              const toner = printer.consumibles?.toner_nivel ?? 100;
              const unit = printer.consumibles?.unidad_imagen_nivel ?? 100;
              const maint = printer.consumibles?.mantenimiento_kit_nivel ?? 100;
              const statusClass = getStatusBadgeClass(printer.status, printer.hasAlerts);

              return (
                <div className="space-y-4 h-full flex flex-col justify-between">
                  <div className="space-y-3.5">
                    {/* Title bar */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Detalles Geolocalización</span>
                        <h4 className="font-mono font-black text-lg text-on-surface leading-none">
                          {printer.id_serie}
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${statusClass}`}>
                        {printer.status} {printer.status === "Operativo" && printer.hasAlerts && <span className="text-[8px] lowercase italic font-normal ml-0.5">(con alertas)</span>}
                      </span>
                    </div>

                    <div className="h-px bg-outline-variant/30" />

                    {/* Metadata list */}
                    <div className="grid grid-cols-2 gap-3 text-xs leading-snug">
                      <div>
                        <p className="text-outline font-semibold">Modelo:</p>
                        <p className="font-bold text-on-surface">{printer.modelo}</p>
                      </div>
                      <div>
                        <p className="text-outline font-semibold">Ubicación:</p>
                        <p className="font-bold text-on-surface">{printer.ubicacion_entidad}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-outline font-semibold">Área Actual:</p>
                        <p className="font-bold text-primary flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {printer.area_actual}
                        </p>
                      </div>
                      <div>
                        <p className="text-outline font-semibold">IP / Conexión:</p>
                        <p className="font-mono font-semibold text-on-surface">{printer.ip || "Desconectado"}</p>
                      </div>
                      {printer.codigo_caso_cas && (
                        <div>
                          <p className="text-outline font-semibold">Caso CAS:</p>
                          <p className="font-bold text-primary">{printer.codigo_caso_cas}</p>
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-outline-variant/30" />

                    {/* Consumable Levels */}
                    <div className="space-y-2.5">
                      <p className="text-[10px] uppercase font-bold text-outline tracking-wider">Nivel Consumibles</p>
                      {[
                        { label: "Tóner Negro", value: toner, color: toner <= 15 ? "bg-rose-500" : "bg-primary" },
                        { label: "Kit de Mantenimiento", value: maint, color: maint <= 15 ? "bg-rose-500" : "bg-tertiary" },
                        { label: "Unidad de Imagen", value: unit, color: unit <= 15 ? "bg-rose-500" : "bg-secondary" }
                      ].map((c) => (
                        <div key={c.label} className="space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-on-surface-variant font-medium">{c.label}</span>
                            <span className={`font-bold ${c.value <= 15 ? "text-rose-600 animate-pulse" : "text-on-surface"}`}>{c.value}%</span>
                          </div>
                          <div className="h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${c.color}`} style={{ width: `${c.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Observations */}
                    {printer.observaciones && (
                      <div className="p-2.5 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/50">
                        <p className="text-[10px] uppercase font-bold text-outline mb-0.5">Observaciones:</p>
                        <p className="text-[11px] text-on-surface-variant italic leading-relaxed">"{printer.observaciones}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => setSelectedPrinterSn(null)}
                    className="w-full mt-6 py-2.5 border border-outline-variant rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-low active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    {selectedRoomId ? "Volver a Detalles de Área" : "Volver a Vista General"}
                  </button>
                </div>
              );
            })() : selectedRoomId ? (() => {
              // 2. Room Detail Chosen
              const roomPrinters = getPrintersInRoom(activeFloor, selectedRoomId);
              return (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3.5 flex-1">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Detalles de Área</span>
                      <h4 className="font-extrabold text-base text-on-surface flex items-center gap-1.5 leading-none">
                        <span className="material-symbols-outlined text-primary">meeting_room</span>
                        {selectedRoomDetails?.label}
                      </h4>
                    </div>

                    <div className="h-px bg-outline-variant/30" />

                    {roomPrinters.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-outline-variant/60 py-12">
                        <span className="material-symbols-outlined text-4xl">print_disabled</span>
                        <p className="text-xs font-bold mt-2 text-outline">Sin impresoras asignadas</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        <p className="text-[10px] uppercase font-bold text-outline tracking-wider">Equipos en esta Área ({roomPrinters.length})</p>
                        {roomPrinters.map((printer) => {
                          const statusClass = getStatusBadgeClass(printer.status, printer.hasAlerts);
                          return (
                            <div
                              key={printer.id_serie}
                              onClick={() => setSelectedPrinterSn(printer.id_serie)}
                              className="p-3 border border-outline-variant/40 rounded-xl bg-surface hover:bg-surface-container-low transition-all cursor-pointer flex items-center justify-between shadow-sm active:scale-[0.98]"
                            >
                              <div className="space-y-0.5">
                                <span className="font-mono text-xs font-black text-on-surface block">
                                  {printer.id_serie}
                                </span>
                                <span className="text-[10px] text-outline bg-surface-container-high px-1.5 py-0.5 rounded font-bold">
                                  {printer.modelo}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${statusClass}`}>
                                {printer.status} {printer.status === "Operativo" && printer.hasAlerts && <span className="text-[8px] lowercase italic font-normal ml-0.5">(con alertas)</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setSelectedRoomId(null)}
                    className="w-full mt-4 py-2.5 border border-outline-variant rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-low active:scale-[0.98] transition-all"
                  >
                    Volver a Vista General
                  </button>
                </div>
              );
            })() : (
              // 3. Nothing Chosen Default
              <div className="flex-1 flex flex-col items-center justify-center text-center text-outline-variant/80 p-6 my-auto">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <span className="material-symbols-outlined text-2xl animate-bounce-subtle">touch_app</span>
                </div>
                <h4 className="text-xs font-extrabold text-on-surface mt-1 uppercase tracking-widest">Geolocalización</h4>
                <p className="text-[11px] text-on-surface-variant mt-2 max-w-[200px] leading-relaxed">
                  Haz clic en un área del mapa o selecciona un nodo de impresora para examinar su ficha técnica en tiempo real.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
