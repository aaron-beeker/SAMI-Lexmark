import React from "react";

export default function ChatView({
  chatMessages,
  isChatLoading,
  chatInput,
  setChatInput,
  pendingAttachments,
  removeAttachment,
  handleChatPaste,
  handleSendChatMessage,
  fileInputRef,
  pdfInputRef,
  cameraInputRef,
  excelFileInputRef,
  chatEndRef,
  chatTextareaRef,
  handleImageChange,
  handlePdfChange,
  handleExcelUpload,
  showReviewModal,
  editableFields,
  setEditableFields,
  handleConfirmSend,
  handleCancelSend,
  printers = []
}) {

  return (
    <div className="space-y-4 flex flex-col h-[75vh] max-w-4xl mx-auto w-full animate-fade-in bg-surface-container border border-outline-variant rounded-3xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 bg-primary text-on-primary flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined animate-pulse-subtle">smart_toy</span>
          <h2 className="font-headline-md text-base font-bold">SAMI-Lexmark AI</h2>
        </div>
        <span className="text-[10px] font-label-sm opacity-80 uppercase tracking-widest">Gemini 1.5 Flash</span>
      </div>

      {/* Message History */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-hide flex flex-col">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] space-y-1 ${msg.sender === "user" ? "self-end" : "self-start"}`}
          >
            <div className={`p-3 rounded-2xl shadow-sm text-sm ${
              msg.sender === "user"
                ? "bg-primary text-on-primary rounded-tr-none"
                : "bg-surface-container-high text-on-surface-variant rounded-tl-none border border-outline-variant"
            }`}>
              {/* Multiple images */}
              {msg.images && msg.images.length > 0 && (
                <div className={`mb-2 flex gap-1.5 flex-wrap ${msg.images.length > 1 ? 'grid grid-cols-2' : ''}`}>
                  {msg.images.map((src, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border border-black/10 max-h-32">
                      <img src={src} alt={`Adjunto ${i + 1}`} className="w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              {/* Backward compat: single image */}
              {msg.image && !msg.images && (
                <div className="mb-2 relative rounded-lg overflow-hidden border border-black/10 max-h-40">
                  <img src={msg.image} alt="Adjunto" className="w-full object-cover" />
                </div>
              )}
              {/* PDF files */}
              {msg.files && msg.files.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {msg.files.map((name, i) => (
                    <span key={i} className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[10px] font-semibold">
                      <span className="material-symbols-outlined text-[12px]">picture_as_pdf</span>
                      {name}
                    </span>
                  ))}
                </div>
              )}
              <div className="whitespace-pre-line leading-relaxed">
                {msg.text}
              </div>
            </div>
            <span className={`text-[10px] text-outline block ${msg.sender === "user" ? "text-right" : "text-left"}`}>
              {msg.sender === "user" ? "Técnico" : "Gemini AI"} • {msg.timestamp}
            </span>
          </div>
        ))}

        {isChatLoading && (
          <div className="self-start max-w-[80%] space-y-1">
            <div className="bg-surface-container-high text-on-surface-variant p-4 rounded-2xl rounded-tl-none border border-outline-variant shadow-sm flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-lg animate-spin">sync</span>
              <span className="text-xs font-semibold animate-pulse">Analizando y actualizando la información...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input & Form */}
      <form onSubmit={handleSendChatMessage} className="p-4 bg-surface border-t border-outline-variant">
        {/* Pending attachments queue */}
        {pendingAttachments.length > 0 && (
          <div className="mb-3 p-2 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
            <span className="text-[9px] font-bold text-outline uppercase tracking-wider block">
              {pendingAttachments.length} archivo{pendingAttachments.length !== 1 ? 's' : ''} adjunto{pendingAttachments.length !== 1 ? 's' : ''} — listos para enviar
            </span>
            <div className="flex flex-wrap gap-2">
              {pendingAttachments.map((att, idx) => (
                <div key={idx} className="relative group">
                  {att.type === "image" ? (
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-outline-variant">
                      <img src={att.preview} alt={att.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-surface-container-high px-2 py-1.5 rounded-lg border border-outline-variant text-[10px] font-semibold text-on-surface-variant max-w-[120px]">
                      <span className="material-symbols-outlined text-error text-sm">picture_as_pdf</span>
                      <span className="truncate">{att.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-error text-on-error shadow text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <textarea
            ref={chatTextareaRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onPaste={handleChatPaste}
            placeholder="Escribe el reporte o pega una imagen (Ctrl+V)..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-primary focus:border-primary resize-none p-3 h-16 font-body-md"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendChatMessage(e);
              }
            }}
          />

          <input type="file" accept="image/*" multiple onChange={handleImageChange} ref={fileInputRef} className="hidden" />
          <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} ref={cameraInputRef} className="hidden" />
          <input type="file" accept=".pdf" multiple onChange={handlePdfChange} ref={pdfInputRef} className="hidden" />
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} ref={excelFileInputRef} className="hidden" />

          <div className="grid grid-cols-5 gap-1.5 w-full">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary-container/80 active:scale-95 transition-all text-[10px]"
            >
              <span className="material-symbols-outlined text-base">photo_camera</span>
              <span>Cámara</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary-container/80 active:scale-95 transition-all text-[10px]"
            >
              <span className="material-symbols-outlined text-base">image</span>
              <span>Fotos</span>
            </button>
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary-container/80 active:scale-95 transition-all text-[10px]"
            >
              <span className="material-symbols-outlined text-base">picture_as_pdf</span>
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={() => excelFileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary-container/80 active:scale-95 transition-all text-[10px]"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>Excel</span>
            </button>
            <button
              type="submit"
              disabled={(!chatInput.trim() && pendingAttachments.length === 0) || isChatLoading}
              className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-container disabled:opacity-50 active:scale-95 transition-all text-[10px] shadow-md"
            >
              <span className="material-symbols-outlined text-base">send</span>
              <span>Enviar</span>
            </button>
          </div>
        </div>
      </form>

      {/* Review & Edit Modal */}
      {showReviewModal && editableFields && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-surface rounded-3xl shadow-2xl border border-outline-variant max-w-2xl w-full overflow-hidden flex flex-col my-8">
            {/* Header */}
            <div className="px-6 py-4 bg-primary text-on-primary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">fact_check</span>
                <h3 className="font-bold text-base">Revisar Datos Extraídos por la IA</h3>
              </div>
              <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                {editableFields._provider || "Offline Fallback"}
              </span>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <p className="text-xs text-on-surface-variant font-medium">
                Por favor, verifique y corrija los datos detectados por el motor de análisis antes de guardarlos en Firestore.
              </p>

              {editableFields.accion === "actualizar_stock" ? (
                /* Stock Updates Form */
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">
                    Actualizaciones de Inventario de Repuestos
                  </span>
                  <div className="space-y-3">
                    {editableFields.stock_updates.map((update, idx) => (
                      <div key={idx} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <div>
                          <label className="text-[10px] font-bold text-outline block mb-1">Modelo</label>
                          <select
                            value={update.modelo}
                            onChange={(e) => {
                              const newUpdates = [...editableFields.stock_updates];
                              newUpdates[idx].modelo = e.target.value;
                              setEditableFields({ ...editableFields, stock_updates: newUpdates });
                            }}
                            className="w-full text-xs bg-surface border border-outline-variant rounded-lg p-1.5 focus:ring-1 focus:ring-primary focus:border-primary"
                          >
                            <option value="MX431ADN">MX431ADN</option>
                            <option value="MX632ADWE">MX632ADWE</option>
                            <option value="MX722ADHE">MX722ADHE</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-bold text-outline block mb-1">Insumo</label>
                          <select
                            value={update.insumo}
                            onChange={(e) => {
                              const newUpdates = [...editableFields.stock_updates];
                              newUpdates[idx].insumo = e.target.value;
                              setEditableFields({ ...editableFields, stock_updates: newUpdates });
                            }}
                            className="w-full text-xs bg-surface border border-outline-variant rounded-lg p-1.5 focus:ring-1 focus:ring-primary focus:border-primary"
                          >
                            <option value="toner">Tóner</option>
                            <option value="mantenimiento">Kit de Mantenimiento</option>
                            <option value="unidad_imagen">Unidad de Imagen</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-outline block mb-1">Hospital (Cant)</label>
                          <input
                            type="number"
                            min="0"
                            value={update.cantidad_hospital}
                            onChange={(e) => {
                              const newUpdates = [...editableFields.stock_updates];
                              newUpdates[idx].cantidad_hospital = parseInt(e.target.value) || 0;
                              setEditableFields({ ...editableFields, stock_updates: newUpdates });
                            }}
                            className="w-full text-xs bg-surface border border-outline-variant rounded-lg p-1.5 focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-outline block mb-1">Depósito (Cant)</label>
                          <input
                            type="number"
                            min="0"
                            value={update.cantidad_deposito}
                            onChange={(e) => {
                              const newUpdates = [...editableFields.stock_updates];
                              newUpdates[idx].cantidad_deposito = parseInt(e.target.value) || 0;
                              setEditableFields({ ...editableFields, stock_updates: newUpdates });
                            }}
                            className="w-full text-xs bg-surface border border-outline-variant rounded-lg p-1.5 focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-outline block mb-1">Observaciones / Resumen</label>
                    <textarea
                      value={editableFields.observaciones}
                      onChange={(e) => setEditableFields({ ...editableFields, observaciones: e.target.value })}
                      className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 h-16 resize-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="Notas de actualización de stock..."
                    />
                  </div>
                </div>
              ) : editableFields.accion === "actualizar_multiples" ? (
                /* Batch/Multiple Printers Form - Simplified Summary View */
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                      Resumen de Cambios
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {editableFields.impresoras.length} Equipos a actualizar
                    </span>
                  </div>
                  
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {editableFields.impresoras.map((printer, idx) => {
                      const matched = printers.find(p => p.id_serie.toUpperCase() === printer.id_serie.toUpperCase());
                      
                      const changes = [];
                      if (!matched) {
                        changes.push({ field: "Registro", text: "Nueva impresora a registrar en el sistema" });
                        if (printer.modelo) changes.push({ field: "Modelo", text: printer.modelo });
                        if (printer.area_actual) changes.push({ field: "Área", text: printer.area_actual });
                        if (printer.ip) changes.push({ field: "Dirección IP", text: printer.ip });
                        if (printer.toner_nivel !== undefined && printer.toner_nivel !== null) changes.push({ field: "Tóner", text: `${printer.toner_nivel}%` });
                        if (printer.mantenimiento_kit_nivel !== undefined && printer.mantenimiento_kit_nivel !== null) changes.push({ field: "Kit Mantenimiento", text: `${printer.mantenimiento_kit_nivel}%` });
                        if (printer.unidad_imagen_nivel !== undefined && printer.unidad_imagen_nivel !== null) changes.push({ field: "Unidad Imagen", text: `${printer.unidad_imagen_nivel}%` });
                      } else {
                        if (printer.modelo && printer.modelo !== matched.modelo) {
                          changes.push({ field: "Modelo", from: matched.modelo, to: printer.modelo });
                        }
                        if (printer.area_actual && printer.area_actual !== matched.area_actual) {
                          changes.push({ field: "Área", from: matched.area_actual, to: printer.area_actual });
                        }
                        if (printer.ip !== undefined && printer.ip !== matched.ip) {
                          changes.push({ field: "Dirección IP", from: matched.ip || "Ninguna", to: printer.ip || "Ninguna" });
                        }
                        if (printer.ubicacion_entidad && printer.ubicacion_entidad !== matched.ubicacion_entidad) {
                          changes.push({ field: "Ubicación", from: matched.ubicacion_entidad, to: printer.ubicacion_entidad });
                        }
                        if (printer.codigo_caso_cas !== undefined && printer.codigo_caso_cas !== (matched.codigo_caso_cas || "")) {
                          changes.push({ field: "Caso CAS", from: matched.codigo_caso_cas || "Ninguno", to: printer.codigo_caso_cas || "Ninguno" });
                        }
                        if (printer.detalle_caso !== undefined && printer.detalle_caso !== (matched.detalle_caso || "")) {
                          changes.push({ field: "Detalle Caso", from: matched.detalle_caso || "Ninguno", to: printer.detalle_caso || "Ninguno" });
                        }
                        if (printer.toner_nivel !== undefined && printer.toner_nivel !== null && Number(printer.toner_nivel) !== (matched.consumibles?.toner_nivel)) {
                          changes.push({ field: "Tóner", from: `${matched.consumibles?.toner_nivel ?? 100}%`, to: `${printer.toner_nivel}%` });
                        }
                        if (printer.mantenimiento_kit_nivel !== undefined && printer.mantenimiento_kit_nivel !== null && Number(printer.mantenimiento_kit_nivel) !== (matched.consumibles?.mantenimiento_kit_nivel)) {
                          changes.push({ field: "Kit Mantenimiento", from: `${matched.consumibles?.mantenimiento_kit_nivel ?? 100}%`, to: `${printer.mantenimiento_kit_nivel}%` });
                        }
                        if (printer.unidad_imagen_nivel !== undefined && printer.unidad_imagen_nivel !== null && Number(printer.unidad_imagen_nivel) !== (matched.consumibles?.unidad_imagen_nivel)) {
                          changes.push({ field: "Unidad Imagen", from: `${matched.consumibles?.unidad_imagen_nivel ?? 100}%`, to: `${printer.unidad_imagen_nivel}%` });
                        }
                        if (printer.observaciones !== undefined && printer.observaciones !== (matched.observaciones || "")) {
                          changes.push({ field: "Observaciones", from: matched.observaciones || "Vacío", to: printer.observaciones || "Vacío" });
                        }
                      }

                      return (
                        <div key={idx} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1 mb-1">
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-primary text-xs font-bold">tag</span>
                              <span className="font-mono font-bold text-xs text-on-surface">S/N: {printer.id_serie}</span>
                            </div>
                            {matched ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 uppercase">
                                Actualizar ({matched.modelo})
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 uppercase">
                                Nuevo Registro
                              </span>
                            )}
                          </div>
                          
                          {changes.length === 0 ? (
                            <div className="text-[10px] text-outline italic">
                              Sin cambios (los valores coinciden con la base de datos).
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {changes.map((chg, cIdx) => (
                                <div key={cIdx} className="text-[11px] flex flex-wrap items-center gap-1 text-on-surface">
                                  <span className="font-bold text-outline mr-1">{chg.field}:</span>
                                  {chg.from !== undefined ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-outline/70 line-through bg-surface-container-high px-1 rounded">{chg.from}</span>
                                      <span className="text-primary material-symbols-outlined text-xs">arrow_forward</span>
                                      <span className="text-on-surface font-semibold bg-primary/5 text-primary px-1.5 rounded">{chg.to}</span>
                                    </div>
                                  ) : (
                                    <span className="text-on-surface font-semibold bg-primary/5 text-primary px-1.5 rounded">{chg.text}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Printer Action Form */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Action & Serial */}
                  <div>
                    <label className="text-[10px] font-bold text-outline block mb-1">Acción Requerida</label>
                    <select
                      value={editableFields.accion}
                      onChange={(e) => setEditableFields({ ...editableFields, accion: e.target.value })}
                      className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      <option value="actualizar">Actualizar Impresora Existente</option>
                      <option value="crear">Crear / Registrar Nueva Impresora</option>
                      <option value="eliminar">Eliminar Impresora del Inventario</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-outline block mb-1">Número de Serie (S/N)</label>
                    <input
                      type="text"
                      value={editableFields.id_serie}
                      onChange={(e) => setEditableFields({ ...editableFields, id_serie: e.target.value.toUpperCase() })}
                      disabled={editableFields.accion === "eliminar"}
                      className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 font-mono focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                      placeholder="Ej: 701925110FD89"
                    />
                  </div>

                  {/* Model & Area */}
                  <div>
                    <label className="text-[10px] font-bold text-outline block mb-1">Modelo de Impresora</label>
                    <select
                      value={editableFields.modelo}
                      onChange={(e) => setEditableFields({ ...editableFields, modelo: e.target.value })}
                      disabled={editableFields.accion === "eliminar"}
                      className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                    >
                      <option value="MX431ADN">MX431ADN</option>
                      <option value="MX632ADWE">MX632ADWE</option>
                      <option value="MX722ADHE">MX722ADHE</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-outline block mb-1">Área de Ubicación</label>
                    <input
                      type="text"
                      value={editableFields.area_actual}
                      onChange={(e) => setEditableFields({ ...editableFields, area_actual: e.target.value })}
                      disabled={editableFields.accion === "eliminar"}
                      className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                      placeholder="Ej: UCI, Emergencias, Admisión 10"
                    />
                  </div>

                  {/* Entity & IP */}
                  <div>
                    <label className="text-[10px] font-bold text-outline block mb-1">Entidad / Ubicación Física</label>
                    <select
                      value={editableFields.ubicacion_entidad}
                      onChange={(e) => setEditableFields({ ...editableFields, ubicacion_entidad: e.target.value })}
                      disabled={editableFields.accion === "eliminar"}
                      className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                    >
                      <option value="Hospital">Hospital</option>
                      <option value="MUR">MUR</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-outline block mb-1">Dirección IP o Conexión</label>
                    <input
                      type="text"
                      value={editableFields.ip}
                      onChange={(e) => setEditableFields({ ...editableFields, ip: e.target.value })}
                      disabled={editableFields.accion === "eliminar"}
                      className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 font-mono focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                      placeholder="Ej: 192.168.24.120 o USB"
                    />
                  </div>

                  {/* Consumibles Levels */}
                  {editableFields.accion !== "eliminar" && (
                    <div className="col-span-1 md:col-span-2 p-4 bg-surface-container-low border border-outline-variant/60 rounded-2xl grid grid-cols-3 gap-3">
                      <div className="col-span-3">
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Niveles de Consumibles (%)</span>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-on-surface-variant block mb-0.5">Tóner</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editableFields.toner_nivel}
                          onChange={(e) => setEditableFields({ ...editableFields, toner_nivel: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs bg-surface border border-outline-variant rounded-lg p-1.5 focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-on-surface-variant block mb-0.5">Kit Mant.</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editableFields.mantenimiento_kit_nivel}
                          onChange={(e) => setEditableFields({ ...editableFields, mantenimiento_kit_nivel: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs bg-surface border border-outline-variant rounded-lg p-1.5 focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-on-surface-variant block mb-0.5">U. Imagen</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editableFields.unidad_imagen_nivel}
                          onChange={(e) => setEditableFields({ ...editableFields, unidad_imagen_nivel: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs bg-surface border border-outline-variant rounded-lg p-1.5 focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* CAS & Details */}
                  {editableFields.accion !== "eliminar" && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-outline block mb-1">Código de Caso CAS</label>
                        <input
                          type="text"
                          value={editableFields.codigo_caso_cas}
                          onChange={(e) => setEditableFields({ ...editableFields, codigo_caso_cas: e.target.value })}
                          className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 focus:ring-1 focus:ring-primary focus:border-primary"
                          placeholder="Ej: CAS-6013278-V6N2C5"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-outline block mb-1">Detalle del Caso</label>
                        <input
                          type="text"
                          value={editableFields.detalle_caso}
                          onChange={(e) => setEditableFields({ ...editableFields, detalle_caso: e.target.value })}
                          className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 focus:ring-1 focus:ring-primary focus:border-primary"
                          placeholder="Ej: Faltan rodillos de arrastre..."
                        />
                      </div>
                    </>
                  )}

                  {/* Observations */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-outline block mb-1">Observaciones Técnicas / Fallos</label>
                    <textarea
                      value={editableFields.observaciones}
                      onChange={(e) => setEditableFields({ ...editableFields, observaciones: e.target.value })}
                      className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 h-16 resize-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="Fallas físicas, atascamiento de papel, etc. (Evitar escribir consumibles aquí)..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex gap-3 p-4 border-t border-outline-variant bg-surface-container-low">
              <button
                type="button"
                onClick={handleCancelSend}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-xs font-bold hover:bg-surface-container-high active:scale-95 transition-all"
              >
                Rechazar / Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                Confirmar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
