import React, { useState } from "react";
import { useAuthContext } from '../contexts/AuthContext';
import { useDataContext } from '../contexts/DataContext';

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
      { id: "oncologia", label: "Oncología", x: 60, y: 40, w: 320, h: 115 },
      { id: "hematologia", label: "Hematología", x: 410, y: 40, w: 330, h: 115 },
      { id: "otorrino", label: "Otorrinolaringología", x: 60, y: 225, w: 280, h: 115 },
      { id: "archivo", label: "Archivo Central", x: 370, y: 225, w: 370, h: 115 }
    ],
    corridor: { x: 60, y: 170, w: 680, h: 40, label: "Corredor Central" }
  },
  "Piso 3": {
    title: "Piso 3: Tecnología & Soporte",
    rooms: [
      { id: "soporte", label: "Soporte Técnico", x: 60, y: 40, w: 320, h: 115 },
      { id: "oei", label: "Oficina OEI", x: 410, y: 40, w: 330, h: 115 },
      { id: "informatica", label: "Informática", x: 60, y: 225, w: 320, h: 115 },
      { id: "telecom", label: "Telecomunicaciones", x: 410, y: 225, w: 330, h: 115 }
    ],
    corridor: { x: 60, y: 170, w: 680, h: 40, label: "Corredor de Sistemas" }
  },
  "Externo": {
    title: "Talleres Externos",
    rooms: [
      { id: "lexmark", label: "Taller Lexmark", x: 60, y: 40, w: 320, h: 300 },
      { id: "mur", label: "Taller MUR", x: 410, y: 40, w: 330, h: 300 }
    ]
  }
};

const mapAreaToFloorAndRoom = (areaName = "", ubicacionEntidad = "Hospital") => {
  const area = areaName.toLowerCase().trim();
  const ubi = ubicacionEntidad.toLowerCase().trim();
  
  if (ubi.includes("mur") || area.includes("mur")) return { floor: "Externo", room: "mur", label: "Taller MUR" };
  if (ubi.includes("lexmark") || area.includes("lexmark")) return { floor: "Externo", room: "lexmark", label: "Taller Lexmark" };
  
  if (area.includes("emergencia") || area.includes("tópico") || area.includes("topico")) return { floor: "Piso 1", room: "emergencia", label: "Emergencias" };
  if (area.includes("admisión") || area.includes("admision")) {
    if (area.includes("oncologia") || area.includes("oncología")) return { floor: "Piso 2", room: "oncologia", label: "Oncología" };
    return { floor: "Piso 1", room: "admision", label: "Admisiones" };
  }
  if (area.includes("atención inmediata") || area.includes("inmediata")) return { floor: "Piso 1", room: "atencion", label: "Atención Inmediata" };
  
  if (area.includes("oncologia") || area.includes("oncología")) return { floor: "Piso 2", room: "oncologia", label: "Oncología" };
  if (area.includes("hematología") || area.includes("hematologia") || area.includes("sangre")) return { floor: "Piso 2", room: "hematologia", label: "Hematología" };
  if (area.includes("otorrino")) return { floor: "Piso 2", room: "otorrino", label: "Otorrinolaringología" };
  if (area.includes("archivo") || area.includes("farmacia")) return { floor: "Piso 2", room: "archivo", label: "Archivo Central" };
  
  if (area.includes("soporte") || area.includes("taller")) return { floor: "Piso 3", room: "soporte", label: "Soporte Técnico" };
  if (area.includes("oei") || area.includes("jefatura")) return { floor: "Piso 3", room: "oei", label: "Oficina OEI" };
  if (area.includes("informática") || area.includes("informatica") || area.includes("sistemas")) return { floor: "Piso 3", room: "informatica", label: "Informática" };
  if (area.includes("telecom")) return { floor: "Piso 3", room: "telecom", label: "Telecomunicaciones" };
  
  if (area.includes("pendiente") || area.includes("asignacion")) return { floor: "Externo", room: "mur", label: "Pendientes" };
  return { floor: "Piso 1", room: "otros", label: "Pasillos" };
};

const getDotPosition = (index, total, rx, ry, rw, rh) => {
  if (total === 1) return { cx: rx + rw / 2, cy: ry + rh / 2 - 10 };
  
  const paddingX = 30;
  const usableWidth = rw - paddingX * 2;
  const minSpace = 28; 
  
  // Determine max columns based on available width
  const maxCols = Math.max(1, Math.floor(usableWidth / minSpace)) + 1;
  const cols = Math.min(total, maxCols);
  const rows = Math.ceil(total / cols);
  
  const colIndex = index % cols;
  const rowIndex = Math.floor(index / cols);
  
  // Distribute items evenly in their respective row
  const itemsInThisRow = (rowIndex === rows - 1 && total % cols !== 0) ? (total % cols) : cols;
  const stepX = itemsInThisRow > 1 ? usableWidth / (itemsInThisRow - 1) : 0;
  const startX = itemsInThisRow === 1 ? (rx + rw / 2) : (rx + paddingX);
  const cx = itemsInThisRow === 1 ? startX : (startX + colIndex * stepX);
  
  // Distribute rows vertically
  const maxUsableHeight = Math.max(10, rh - 60); // safe margin for title and bottom
  const idealRowHeight = 35;
  const rowHeight = rows > 1 ? Math.min(idealRowHeight, maxUsableHeight / (rows - 1)) : idealRowHeight;
  const totalGridHeight = (rows - 1) * rowHeight;
  
  // startY is the top-most row's cy. Must not be higher than ry + 25 to avoid hitting the title.
  const idealStartY = ry + (rh / 2) - (totalGridHeight / 2) - 10;
  const startY = Math.max(ry + 30, idealStartY);
  const cy = startY + rowIndex * rowHeight;
  
  return { cx, cy };
};

export default function HospitalMapView() {
  const { isAuthenticated } = useAuthContext();
  const { printers, getPrinterStatus, checkPrinterAlerts } = useDataContext();

  const [activeFloor, setActiveFloor] = useState("Piso 1");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedPrinterSn, setSelectedPrinterSn] = useState(null);

  const mappedPrinters = printers.map(p => ({
    ...p,
    mapping: mapAreaToFloorAndRoom(p.area_actual, p.ubicacion_entidad),
    status: getPrinterStatus(p),
    hasAlerts: checkPrinterAlerts(p)
  }));

  const getPrintersInRoom = (floor, roomId) => mappedPrinters.filter(p => p.mapping.floor === floor && p.mapping.room === roomId);
  const currentFloorData = FLOORS[activeFloor];
  const printersInActiveFloor = mappedPrinters.filter(p => p.mapping.floor === activeFloor);

  const handleRoomClick = (roomId) => {
    setSelectedRoomId(roomId === selectedRoomId ? null : roomId);
    setSelectedPrinterSn(null);
  };

  const getRoomStatusStyle = (floor, roomId) => {
    const roomPrinters = getPrintersInRoom(floor, roomId);
    if (roomPrinters.length === 0) return { fill: "fill-transparent", stroke: "stroke-outline-variant/30", text: "text-outline/50" };
    if (roomPrinters.some(p => p.status === "En Mantenimiento")) return { fill: "fill-blue-500/5", stroke: "stroke-blue-500/30", text: "text-blue-600" };
    if (roomPrinters.some(p => p.hasAlerts)) return { fill: "fill-amber-500/5", stroke: "stroke-amber-500/30", text: "text-amber-600" };
    return { fill: "fill-emerald-500/5", stroke: "stroke-emerald-500/30", text: "text-emerald-600" };
  };

  return (
    <section className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-on-background tracking-tight">Geolocalización</h2>
          <p className="text-[13px] text-outline mt-0.5">Mapa interactivo de impresoras por área</p>
        </div>

        {/* Floor selector (Pill style) */}
        <div className="flex bg-surface-container-lowest p-1 rounded-full border border-outline-variant/60 shadow-sm shrink-0">
          {Object.keys(FLOORS).map((floor) => (
            <button
              key={floor}
              onClick={() => { setActiveFloor(floor); setSelectedRoomId(null); setSelectedPrinterSn(null); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeFloor === floor
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface hover:bg-surface-container-low"
              }`}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left pane: The Map */}
        <div className="lg:col-span-8">
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/40 shadow-sm relative overflow-hidden flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                {currentFloorData?.title}
              </h3>
              <span className="text-[11px] font-bold text-outline">
                {printersInActiveFloor.length} equipos
              </span>
            </div>
            
            <svg viewBox="0 0 800 380" className="w-full h-auto max-h-[380px] font-sans antialiased text-on-surface transition-all select-none">
              {/* Clean Corridor */}
              {currentFloorData?.corridor && (
                <g>
                  <rect
                    x={currentFloorData.corridor.x} y={currentFloorData.corridor.y}
                    width={currentFloorData.corridor.w} height={currentFloorData.corridor.h}
                    className="fill-surface-container-low/50 stroke-outline-variant/40"
                    strokeWidth="1" strokeDasharray="4" rx="4"
                  />
                  <text
                    x={currentFloorData.corridor.x + currentFloorData.corridor.w / 2} y={currentFloorData.corridor.y + 24}
                    textAnchor="middle" className="text-[10px] fill-outline font-bold uppercase tracking-widest pointer-events-none"
                  >
                    {currentFloorData.corridor.label}
                  </text>
                </g>
              )}

              {/* Minimalist Rooms */}
              {currentFloorData?.rooms.map((room) => {
                const style = getRoomStatusStyle(activeFloor, room.id);
                const isSelected = selectedRoomId === room.id;
                const roomPrinters = getPrintersInRoom(activeFloor, room.id);

                return (
                  <g key={room.id} className="cursor-pointer" onClick={() => handleRoomClick(room.id)}>
                    <rect
                      x={room.x} y={room.y} width={room.w} height={room.h}
                      className={`${style.fill} ${style.stroke} transition-all duration-300`}
                      strokeWidth={isSelected ? 2 : 1} rx="8"
                    />
                    <text
                      x={room.x + 14} y={room.y + 26}
                      className={`text-[11px] ${style.text} pointer-events-none select-none`} fontWeight="700"
                    >
                      {room.label}
                    </text>

                    {/* Printer Nodes */}
                    {roomPrinters.map((printer, index) => {
                      const { cx, cy } = getDotPosition(index, roomPrinters.length, room.x, room.y, room.w, room.h);
                      const isPrinterSelected = selectedPrinterSn === printer.id_serie;
                      
                      let dotColor = "fill-emerald-500";
                      if (printer.status === "En Mantenimiento") dotColor = "fill-blue-500";
                      else if (printer.hasAlerts) dotColor = "fill-amber-500";

                      return (
                        <g key={printer.id_serie} onClick={(e) => { e.stopPropagation(); setSelectedRoomId(room.id); setSelectedPrinterSn(printer.id_serie); }}>
                          <circle
                            cx={cx} cy={cy + 15}
                            r={isPrinterSelected ? 8 : 6}
                            className={`${dotColor} transition-all stroke-white dark:stroke-slate-900 stroke-2 hover:scale-125 cursor-pointer`}
                            style={{ transformOrigin: "center", transformBox: "fill-box" }}
                          />
                          <text
                            x={cx} y={cy + 32} textAnchor="middle"
                            className="text-[9px] fill-outline font-mono font-bold select-none pointer-events-none"
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

            {/* Minimal Legend */}
            <div className="w-full flex justify-center gap-6 mt-4 pt-4 border-t border-outline-variant/30 text-[10px] font-bold text-outline">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Operativo</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Alertas</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Mantenimiento</div>
            </div>
          </div>
        </div>

        {/* Right pane: Selection Details (Clean & Minimalist) */}
        <div className="lg:col-span-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/40 shadow-sm h-full flex flex-col">
            
            {/* 1. Printer Detail Chosen */}
            {selectedPrinterSn ? (() => {
              const printer = mappedPrinters.find(p => p.id_serie === selectedPrinterSn);
              if (!printer) return null;
              
              const toner = printer.consumibles?.toner_nivel ?? null;
              const unit = printer.consumibles?.unidad_imagen_nivel ?? null;
              const maint = printer.consumibles?.mantenimiento_kit_nivel ?? null;

              return (
                <div className="flex flex-col h-full">
                  <div className="flex-1 space-y-5">
                    <div>
                      <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Detalles del Equipo</span>
                      <h4 className="font-mono text-xl font-black text-on-surface mt-1">{printer.id_serie}</h4>
                      <p className="text-xs text-primary font-bold mt-1">{printer.modelo}</p>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between text-xs">
                          <span className="text-outline">Área:</span>
                          <span className="font-bold text-on-surface text-right">{printer.area_actual}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="text-outline">IP:</span>
                          <span className="font-bold font-mono text-on-surface text-right">{printer.ip || "Desconectado"}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="text-outline">Estado:</span>
                          <span className={`font-bold text-right ${printer.status === 'Operativo' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {printer.status}
                          </span>
                       </div>
                    </div>

                    {/* Consumibles minimalistas */}
                    <div className="space-y-3 pt-4 border-t border-outline-variant/40">
                      <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Consumibles</p>
                      {[
                        { label: "Tóner", value: toner, color: toner <= 15 ? "bg-error" : "bg-on-surface" },
                        { label: "Kit Mant.", value: maint, color: maint <= 15 ? "bg-error" : "bg-on-surface" },
                        { label: "U. Imagen", value: unit, color: unit <= 15 ? "bg-error" : "bg-on-surface" }
                      ].map((c) => (
                        <div key={c.label} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-outline w-16">{c.label}</span>
                          <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${c.value === null ? "bg-transparent" : c.color}`} style={{ width: c.value === null ? "0%" : `${c.value}%` }} />
                          </div>
                          <span className="text-xs font-black text-on-surface w-8 text-right">{c.value === null ? "-" : `${c.value}%`}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPrinterSn(null)}
                    className="w-full mt-6 py-2 border border-outline-variant rounded-full text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all"
                  >
                    Volver a Vista General
                  </button>
                </div>
              );
            })() : selectedRoomId ? (() => {
              // 2. Room Detail Chosen
              const roomPrinters = getPrintersInRoom(activeFloor, selectedRoomId);
              const roomName = FLOORS[activeFloor].rooms.find(r => r.id === selectedRoomId)?.label;
              return (
                <div className="flex flex-col h-full">
                  <div className="flex-1 space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Detalles de Área</span>
                      <h4 className="text-base font-black text-on-surface mt-1">{roomName}</h4>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-outline uppercase tracking-wider mt-4 mb-2">Equipos asignados ({roomPrinters.length})</p>
                      {roomPrinters.length === 0 ? (
                         <p className="text-xs text-outline italic">No hay equipos en esta área.</p>
                      ) : (
                        roomPrinters.map(printer => (
                          <div
                            key={printer.id_serie}
                            onClick={() => setSelectedPrinterSn(printer.id_serie)}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low cursor-pointer transition-all -mx-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-mono text-sm font-black text-on-surface">{printer.id_serie}</span>
                              <span className="text-[10px] text-outline font-semibold">{printer.modelo}</span>
                            </div>
                            <span className={`text-[10px] font-bold ${printer.status === 'Operativo' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {printer.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedRoomId(null)}
                    className="w-full mt-6 py-2 border border-outline-variant rounded-full text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all"
                  >
                    Volver a Vista General
                  </button>
                </div>
              );
            })() : (
              // 3. Nothing Chosen Default
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <span className="material-symbols-outlined text-4xl text-outline-variant opacity-50 mb-4">touch_app</span>
                <p className="text-sm font-bold text-on-surface">Selecciona un elemento</p>
                <p className="text-xs text-outline mt-2 leading-relaxed">
                  Haz clic en un área o impresora en el mapa para ver sus detalles en tiempo real.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
