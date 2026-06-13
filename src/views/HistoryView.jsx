import React from "react";

export default function HistoryView({ loadingPrinters, generalHistory }) {
  return (
    <div className="space-y-4 animate-fade-in max-w-4xl mx-auto w-full">
      <h2 className="font-headline-md text-xl text-on-background font-bold">Historial de Lecturas</h2>
      <p className="text-xs text-on-surface-variant -mt-2">Registro unificado de las lecturas y actualizaciones en Firestore.</p>

      <div className="space-y-3">
        {loadingPrinters ? (
          <div className="p-8 text-center text-outline-variant">Cargando registros...</div>
        ) : generalHistory.length === 0 ? (
          <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2">history</span>
            <p className="font-semibold">No hay lecturas registradas</p>
          </div>
        ) : (
          generalHistory.map((log) => {
            if (log.tipo === "stock") {
              return (
                <div
                  key={log.id}
                  className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm space-y-2 animate-fade-in"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl bg-primary-fixed/20 p-1.5 rounded-lg">
                        inventory_2
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-on-background">Ajuste de Stock: {log.modelo}</h4>
                        <p className="text-[10px] text-outline font-medium uppercase tracking-wider">{log.tipo_actualizacion}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-outline font-medium">
                      {log.timestamp instanceof Date 
                        ? `${log.timestamp.toLocaleDateString("es-PE")} ${log.timestamp.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}`
                        : log.timestamp?.toDate
                          ? `${log.timestamp.toDate().toLocaleDateString("es-PE")} ${log.timestamp.toDate().toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}`
                          : ""
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/30 text-xs">
                    <div>
                      <span className="text-[9px] font-bold text-outline block uppercase">Repuesto</span>
                      <span className="font-semibold text-on-surface text-[11px]">{log.insumo}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-outline block uppercase">Origen/Destino</span>
                      <span className="font-semibold text-on-surface text-[11px]">{log.origen}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-outline block uppercase">Cantidad</span>
                      <span className="font-semibold text-on-surface text-[11px]">
                        {log.cantidad_anterior} → {log.cantidad_nueva}
                      </span>
                    </div>
                  </div>

                  {log.observaciones && (
                    <p className="text-xs text-on-surface-variant bg-surface-container-low px-2 py-1 rounded border border-outline-variant/30 max-h-12 overflow-hidden text-ellipsis">
                      <strong className="text-[10px] uppercase font-bold text-outline mr-1">Obs:</strong>
                      {log.observaciones}
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div
                key={log.id}
                className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm space-y-2 animate-fade-in"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-xl bg-secondary-fixed/20 p-1.5 rounded-lg">
                      print
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-on-background">{log.modelo}</h4>
                      <p className="text-[10px] text-outline font-mono">S/N: {log.id_serie} • {log.tipo_actualizacion || "Lectura"}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-outline font-medium">
                    {log.timestamp instanceof Date 
                      ? `${log.timestamp.toLocaleDateString("es-PE")} ${log.timestamp.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}`
                      : log.timestamp?.toDate
                        ? `${log.timestamp.toDate().toLocaleDateString("es-PE")} ${log.timestamp.toDate().toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}`
                        : ""
                    }
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-outline-variant/30 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-outline block uppercase">Tóner</span>
                    <span className={`font-semibold ${log.toner_nivel <= 15 ? 'text-error' : 'text-on-surface'}`}>
                      {log.toner_nivel}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-outline block uppercase">U. Imagen</span>
                    <span className={`font-semibold ${log.unidad_imagen_nivel <= 15 ? 'text-error' : 'text-on-surface'}`}>
                      {log.unidad_imagen_nivel}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-outline block uppercase">Kit Mant.</span>
                    <span className={`font-semibold ${(log.mantenimiento_kit_nivel ?? 100) <= 15 ? 'text-error' : 'text-on-surface'}`}>
                      {log.mantenimiento_kit_nivel ?? 100}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-outline block uppercase">Estado</span>
                    {(() => {
                      const histStatus = log.estado_funcionamiento || log.estado_criticidad || "Operativo";
                      const isInop = histStatus === "Inoperativo" || histStatus === "Crítico" || histStatus === "En Mantenimiento";
                      const isAdv = histStatus === "Advertencia";
                      return (
                        <span className={`font-semibold ${
                          isInop
                            ? "text-blue-600 font-extrabold"
                            : isAdv
                              ? "text-amber-600 font-extrabold"
                              : "text-emerald-600 font-extrabold"
                        }`}>
                          {isInop ? "En Mantenimiento" : isAdv ? "Operativo (con alertas)" : "Operativo"}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {log.observaciones && (
                  <p className="text-xs text-on-surface-variant bg-surface-container-low px-2 py-1 rounded border border-outline-variant/30 max-h-12 overflow-hidden text-ellipsis">
                    <strong className="text-[10px] uppercase font-bold text-outline mr-1">Obs:</strong>
                    {log.observaciones}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
