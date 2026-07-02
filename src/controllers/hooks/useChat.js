import { useState, useEffect, useRef } from "react";
import { analizarEvidenciaSuministros } from "../../services/GeminiService";
import { calcularFechasPredictivas } from "../../services/PredictionService";

export function useChat() {
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: "👋 ¡Hola! Soy tu asistente de impresoras.\n\nPuedes enviarme:\n• 📷 Fotos del panel de control de una impresora\n• 📄 Archivos PDF con reportes\n• 📝 Texto con los niveles de tóner\n\nAnalizo la información y actualizo los registros automáticamente. ¡Puedes adjuntar varios archivos a la vez antes de enviar!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingAiResult, setPendingAiResult] = useState(null);
  const [editableFields, setEditableFields] = useState(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatTextareaRef = useRef(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  const addFilesToQueue = (files) => {
    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingAttachments((prev) => [
          ...prev,
          {
            base64: reader.result.split(",")[1],
            mimeType: file.type,
            preview: isImage ? reader.result : null,
            name: file.name,
            type: isImage ? "image" : "pdf"
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = (e) => {
    if (e.target.files?.length) addFilesToQueue(e.target.files);
    e.target.value = "";
  };

  const handlePdfChange = (e) => {
    if (e.target.files?.length) addFilesToQueue(e.target.files);
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChatPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter((i) => i.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();
    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (file) addFilesToQueue([file]);
    });
  };

  const handleSendChatMessage = async (e, printers) => {
    if (e) e.preventDefault();
    if ((!chatInput.trim() && pendingAttachments.length === 0) || isChatLoading) return;

    const userMsgText = chatInput;
    const attachments = [...pendingAttachments];

    setChatInput("");
    setPendingAttachments([]);

    const userMsgId = Date.now().toString();
    const previewImages = attachments.filter((a) => a.type === "image").map((a) => a.preview);
    setChatMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text: userMsgText,
        images: previewImages,
        files: attachments.filter((a) => a.type === "pdf").map((a) => a.name),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);

    setIsChatLoading(true);

    const adjuntosArr = attachments
      .filter((a) => a.base64 && a.mimeType)
      .map((a) => ({ base64: a.base64, mimeType: a.mimeType, name: a.name }));

    try {
      const result = await analizarEvidenciaSuministros(userMsgText, adjuntosArr, printers);
      console.log("Gemini parse result:", result);

      if (result.accion === "conversar") {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: result.respuesta_chat || "No entendí la consulta, ¿podrías repetirla?",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        setIsChatLoading(false);
      } else {
        setPendingAiResult(result);
        if (result.accion === "actualizar_stock") {
          setEditableFields({
            accion: "actualizar_stock",
            observaciones: result.observaciones || "",
            _provider: result._provider || "",
            stock_updates: (result.stock_updates || []).map(u => ({
              modelo: u.modelo || "MX431ADN",
              insumo: u.insumo || "toner",
              cantidad_hospital: u.cantidad_hospital !== undefined && u.cantidad_hospital !== null ? Number(u.cantidad_hospital) : 0,
              cantidad_deposito: u.cantidad_deposito !== undefined && u.cantidad_deposito !== null ? Number(u.cantidad_deposito) : 0
            }))
          });
        } else if (result.accion === "actualizar_multiples") {
          setEditableFields({
            accion: "actualizar_multiples",
            observaciones: result.observaciones || "",
            _provider: result._provider || "",
            impresoras: (result.impresoras || []).map((p) => {
              const idSerieUpper = p.id_serie ? p.id_serie.toUpperCase() : "";
              
              // Find matching printer
              let matchedPrinter = null;
              if (idSerieUpper) {
                const cleanInput = idSerieUpper.replace(/[^A-Z0-9]/g, "");
                if (cleanInput) {
                  matchedPrinter = printers.find(
                    (pr) => pr.id_serie.replace(/[^A-Z0-9]/g, "").toUpperCase() === cleanInput
                  );
                  if (!matchedPrinter && cleanInput.length >= 4) {
                    matchedPrinter = printers.find((pr) =>
                      pr.id_serie.replace(/[^A-Z0-9]/g, "").toUpperCase().endsWith(cleanInput)
                    );
                  }
                }
              }

              const modelDefault = matchedPrinter ? matchedPrinter.modelo : (p.modelo || "MX431ADN");
              const areaDefault = matchedPrinter ? matchedPrinter.area_actual : (p.area_actual || "Soporte");
              const entidadDefault = matchedPrinter ? matchedPrinter.ubicacion_entidad : (p.ubicacion_entidad || "Hospital");
              const ipDefault = matchedPrinter ? (matchedPrinter.ip || "") : (p.ip || "");
              const tonerDefault = matchedPrinter ? (matchedPrinter.consumibles?.toner_nivel ?? 100) : (p.toner_nivel !== undefined && p.toner_nivel !== null ? Number(p.toner_nivel) : 100);
              const maintDefault = matchedPrinter ? (matchedPrinter.consumibles?.mantenimiento_kit_nivel ?? 100) : (p.mantenimiento_kit_nivel !== undefined && p.mantenimiento_kit_nivel !== null ? Number(p.mantenimiento_kit_nivel) : 100);
              const imgDefault = matchedPrinter ? (matchedPrinter.consumibles?.unidad_imagen_nivel ?? 100) : (p.unidad_imagen_nivel !== undefined && p.unidad_imagen_nivel !== null ? Number(p.unidad_imagen_nivel) : 100);
              const estadoDefault = matchedPrinter ? matchedPrinter.estado_funcionamiento : (p.estado_funcionamiento || "Operativo");
              const obsDefault = matchedPrinter ? (matchedPrinter.observaciones || "") : (p.observaciones || "");
              const casDefault = matchedPrinter ? (matchedPrinter.codigo_caso_cas || "") : (p.codigo_caso_cas || "");
              const detDefault = matchedPrinter ? (matchedPrinter.detalle_caso || "") : (p.detalle_caso || "");

              return {
                id_serie: p.id_serie || "",
                modelo: p.modelo !== undefined && p.modelo !== null && p.modelo !== "" ? p.modelo : modelDefault,
                area_actual: p.area_actual !== undefined && p.area_actual !== null && p.area_actual !== "" ? p.area_actual : areaDefault,
                ubicacion_entidad: p.ubicacion_entidad !== undefined && p.ubicacion_entidad !== null && p.ubicacion_entidad !== "" ? p.ubicacion_entidad : entidadDefault,
                ip: p.ip !== undefined && p.ip !== null ? p.ip : ipDefault,
                toner_nivel: p.toner_nivel !== undefined && p.toner_nivel !== null ? Number(p.toner_nivel) : tonerDefault,
                mantenimiento_kit_nivel: p.mantenimiento_kit_nivel !== undefined && p.mantenimiento_kit_nivel !== null ? Number(p.mantenimiento_kit_nivel) : maintDefault,
                unidad_imagen_nivel: p.unidad_imagen_nivel !== undefined && p.unidad_imagen_nivel !== null ? Number(p.unidad_imagen_nivel) : imgDefault,
                estado_funcionamiento: p.estado_funcionamiento !== undefined && p.estado_funcionamiento !== null && p.estado_funcionamiento !== "" ? p.estado_funcionamiento : estadoDefault,
                observaciones: p.observaciones !== undefined && p.observaciones !== null ? p.observaciones : obsDefault,
                codigo_caso_cas: p.codigo_caso_cas !== undefined && p.codigo_caso_cas !== null ? p.codigo_caso_cas : casDefault,
                detalle_caso: p.detalle_caso !== undefined && p.detalle_caso !== null ? p.detalle_caso : detDefault
              };
            })
          });
        } else {
          // Locate matching printer for single actions
          const idSerieUpper = result.id_serie ? result.id_serie.toUpperCase() : "";
          let matchedPrinter = null;

          if (idSerieUpper) {
            const cleanInput = idSerieUpper.replace(/[^A-Z0-9]/g, "");
            if (cleanInput) {
              matchedPrinter = printers.find(
                (p) => p.id_serie.replace(/[^A-Z0-9]/g, "").toUpperCase() === cleanInput
              );

              if (!matchedPrinter && cleanInput.length >= 4) {
                matchedPrinter = printers.find((p) =>
                  p.id_serie.replace(/[^A-Z0-9]/g, "").toUpperCase().endsWith(cleanInput)
                );
              }

              if (!matchedPrinter) {
                for (let len of [6, 5, 4]) {
                  if (cleanInput.length >= len) {
                    const suffix = cleanInput.slice(-len);
                    const match = printers.find((p) =>
                      p.id_serie.replace(/[^A-Z0-9]/g, "").toUpperCase().endsWith(suffix)
                    );
                    if (match) {
                      matchedPrinter = match;
                      break;
                    }
                  }
                }
              }

              if (!matchedPrinter && cleanInput.length >= 3) {
                const suffix = cleanInput.slice(-3);
                const candidates = printers.filter((p) =>
                  p.id_serie.replace(/[^A-Z0-9]/g, "").toUpperCase().endsWith(suffix)
                );
                if (candidates.length === 1) {
                  matchedPrinter = candidates[0];
                }
              }
            }
          }

          if (!matchedPrinter && result.area_actual) {
            const normalizeArea = (str) => {
              if (!str) return "";
              let clean = str
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim();
              clean = clean.replace(/^(c\.e\s*|c\.\s*e\.\s*|unidad\s+de\s+|unidad\s+)/g, "");
              return clean.trim();
            };

            const targetAreaNorm = normalizeArea(result.area_actual);

            if (targetAreaNorm) {
              matchedPrinter = printers.find((p) => normalizeArea(p.area_actual) === targetAreaNorm);

              if (!matchedPrinter) {
                matchedPrinter = printers.find((p) =>
                  normalizeArea(p.area_actual).includes(targetAreaNorm)
                );
              }
            }
          }

          const modelDefault = matchedPrinter ? matchedPrinter.modelo : (result.modelo || "MX431ADN");
          const areaDefault = matchedPrinter ? matchedPrinter.area_actual : (result.area_actual || "Soporte");
          const entidadDefault = matchedPrinter ? matchedPrinter.ubicacion_entidad : (result.ubicacion_entidad || "Hospital");
          const ipDefault = matchedPrinter ? (matchedPrinter.ip || "") : (result.ip || "");
          const tonerDefault = matchedPrinter ? (matchedPrinter.consumibles?.toner_nivel ?? 100) : (result.toner_nivel !== undefined && result.toner_nivel !== null ? Number(result.toner_nivel) : 100);
          const maintDefault = matchedPrinter ? (matchedPrinter.consumibles?.mantenimiento_kit_nivel ?? 100) : (result.mantenimiento_kit_nivel !== undefined && result.mantenimiento_kit_nivel !== null ? Number(result.mantenimiento_kit_nivel) : 100);
          const imgDefault = matchedPrinter ? (matchedPrinter.consumibles?.unidad_imagen_nivel ?? 100) : (result.unidad_imagen_nivel !== undefined && result.unidad_imagen_nivel !== null ? Number(result.unidad_imagen_nivel) : 100);
          const estadoDefault = matchedPrinter ? matchedPrinter.estado_funcionamiento : (result.estado_funcionamiento || "Operativo");
          const obsDefault = matchedPrinter ? (matchedPrinter.observaciones || "") : (result.observaciones || "");
          const casDefault = matchedPrinter ? (matchedPrinter.codigo_caso_cas || "") : (result.codigo_caso_cas || "");
          const detDefault = matchedPrinter ? (matchedPrinter.detalle_caso || "") : (result.detalle_caso || "");

          setEditableFields({
            accion: result.accion || (matchedPrinter ? "actualizar" : "crear"),
            id_serie: result.id_serie || (matchedPrinter ? matchedPrinter.id_serie : ""),
            modelo: result.modelo !== undefined && result.modelo !== null && result.modelo !== "" ? result.modelo : modelDefault,
            area_actual: result.area_actual !== undefined && result.area_actual !== null && result.area_actual !== "" ? result.area_actual : areaDefault,
            ubicacion_entidad: result.ubicacion_entidad !== undefined && result.ubicacion_entidad !== null && result.ubicacion_entidad !== "" ? result.ubicacion_entidad : entidadDefault,
            ip: result.ip !== undefined && result.ip !== null ? result.ip : ipDefault,
            toner_nivel: result.toner_nivel !== undefined && result.toner_nivel !== null ? Number(result.toner_nivel) : tonerDefault,
            mantenimiento_kit_nivel: result.mantenimiento_kit_nivel !== undefined && result.mantenimiento_kit_nivel !== null ? Number(result.mantenimiento_kit_nivel) : maintDefault,
            unidad_imagen_nivel: result.unidad_imagen_nivel !== undefined && result.unidad_imagen_nivel !== null ? Number(result.unidad_imagen_nivel) : imgDefault,
            estado_funcionamiento: result.estado_funcionamiento !== undefined && result.estado_funcionamiento !== null && result.estado_funcionamiento !== "" ? result.estado_funcionamiento : estadoDefault,
            observaciones: result.observaciones !== undefined && result.observaciones !== null ? result.observaciones : obsDefault,
            codigo_caso_cas: result.codigo_caso_cas !== undefined && result.codigo_caso_cas !== null ? result.codigo_caso_cas : casDefault,
            detalle_caso: result.detalle_caso !== undefined && result.detalle_caso !== null ? result.detalle_caso : detDefault,
            _provider: result._provider || ""
          });
        }
        setShowReviewModal(true);
        setIsChatLoading(false);
      }
    } catch (error) {
      console.error("Chat message error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `⚠️ **Error al procesar:** ${error.message}. Por favor intente de nuevo detallando más o revisando la API Key en Ajustes.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      setIsChatLoading(false);
    }
  };

  const handleCancelReviewedData = () => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "ai",
        text: `❌ **Actualización Cancelada:** Se rechazaron los datos propuestos por la IA. No se realizaron cambios en la base de datos.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
    setShowReviewModal(false);
    setPendingAiResult(null);
    setEditableFields(null);
  };

  const handleConfirmSend = async (
    db,
    printers,
    repuestos,
    updateStock,
    createPrinterDoc,
    updatePrinterDoc,
    deletePrinterDoc,
    addPrinterHistoryItem,
    addGeneralHistoryLog,
    calculateStatus
  ) => {
    if (!editableFields) return;
    const result = editableFields;

    setShowReviewModal(false);
    setIsChatLoading(true);

    try {
      let action = result.accion || "actualizar";

      // 1. Handle Stock Updates
      if (action === "actualizar_stock") {
        if (!result.stock_updates || result.stock_updates.length === 0) {
          throw new Error("No se detectaron actualizaciones de stock válidas en el reporte.");
        }

        const auditLogs = [];

        for (const update of result.stock_updates) {
          let modelToUpdate = update.modelo || "";

          if (!modelToUpdate && result.id_serie) {
            const printerMatch = printers.find(
              (p) => p.id_serie.toLowerCase() === result.id_serie.toLowerCase()
            );
            if (printerMatch) {
              modelToUpdate = printerMatch.modelo;
            }
          }

          if (!modelToUpdate) {
            modelToUpdate = "MX431ADN";
          }

          let modeloNorm = "MX431ADN";
          if (
            modelToUpdate.includes("632") ||
            modelToUpdate === "632" ||
            modelToUpdate.toLowerCase().includes("mx632")
          ) {
            modeloNorm = "MX632ADWE";
          } else if (
            modelToUpdate.includes("722") ||
            modelToUpdate === "722" ||
            modelToUpdate.toLowerCase().includes("mx722")
          ) {
            modeloNorm = "MX722ADHE";
          }

          const insumo = update.insumo || "toner";

          const matchedStock = repuestos.find((r) => r.id === modeloNorm) || {
            toner_hospital: 0,
            toner_deposito: 0,
            unidad_hospital: 0,
            unidad_deposito: 0,
            mantenimiento_hospital: 0,
            mantenimiento_deposito: 0
          };

          const updateObj = {};
          let logHospital = null;
          let logDeposito = null;

          if (insumo === "toner") {
            if (update.cantidad_hospital !== undefined && update.cantidad_hospital !== null) {
              updateObj.toner_hospital = Number(update.cantidad_hospital);
              logHospital = updateObj.toner_hospital;
            }
            if (update.cantidad_deposito !== undefined && update.cantidad_deposito !== null) {
              updateObj.toner_deposito = Number(update.cantidad_deposito);
              logDeposito = updateObj.toner_deposito;
            }
            if (update.cantidad_hospital === undefined && update.cantidad_deposito === undefined) {
              const qty = Number(update.cantidad !== undefined ? update.cantidad : 0);
              updateObj.toner_hospital = qty;
              logHospital = qty;
            }
          } else if (insumo === "mantenimiento") {
            if (update.cantidad_hospital !== undefined && update.cantidad_hospital !== null) {
              updateObj.mantenimiento_hospital = Number(update.cantidad_hospital);
              logHospital = updateObj.mantenimiento_hospital;
            }
            if (update.cantidad_deposito !== undefined && update.cantidad_deposito !== null) {
              updateObj.mantenimiento_deposito = Number(update.cantidad_deposito);
              logDeposito = updateObj.mantenimiento_deposito;
            }
            if (update.cantidad_hospital === undefined && update.cantidad_deposito === undefined) {
              const qty = Number(update.cantidad !== undefined ? update.cantidad : 0);
              updateObj.mantenimiento_hospital = qty;
              logHospital = qty;
            }
          } else {
            if (update.cantidad_hospital !== undefined && update.cantidad_hospital !== null) {
              updateObj.unidad_hospital = Number(update.cantidad_hospital);
              logHospital = updateObj.unidad_hospital;
            }
            if (update.cantidad_deposito !== undefined && update.cantidad_deposito !== null) {
              updateObj.unidad_deposito = Number(update.cantidad_deposito);
              logDeposito = updateObj.unidad_deposito;
            }
            if (update.cantidad_hospital === undefined && update.cantidad_deposito === undefined) {
              const qty = Number(update.cantidad !== undefined ? update.cantidad : 0);
              updateObj.unidad_hospital = qty;
              logHospital = qty;
            }
          }

          await updateStock(db, modeloNorm, updateObj);

          const labelInsumo =
            insumo === "toner"
              ? "Tóner"
              : insumo === "mantenimiento"
              ? "Kit de Mantenimiento"
              : "Unidad de Imagen";
          const hVal =
            logHospital !== null
              ? logHospital
              : insumo === "toner"
              ? matchedStock.toner_hospital ?? 0
              : insumo === "mantenimiento"
              ? matchedStock.mantenimiento_hospital ?? 0
              : matchedStock.unidad_hospital ?? 0;
          const dVal =
            logDeposito !== null
              ? logDeposito
              : insumo === "toner"
              ? matchedStock.toner_deposito ?? 0
              : insumo === "mantenimiento"
              ? matchedStock.mantenimiento_deposito ?? 0
              : matchedStock.unidad_deposito ?? 0;

          if (logHospital !== null) {
            const prevVal =
              insumo === "toner"
                ? matchedStock.toner_hospital ?? 0
                : insumo === "mantenimiento"
                ? matchedStock.mantenimiento_hospital ?? 0
                : matchedStock.unidad_hospital ?? 0;
            await addGeneralHistoryLog(db, {
              tipo: "stock",
              modelo: modeloNorm,
              insumo: labelInsumo,
              origen: "Hospital",
              cantidad_anterior: Number(prevVal),
              cantidad_nueva: Number(logHospital),
              tipo_actualizacion: `${result._provider || "Chat AI"} (Stock)`,
              observaciones:
                result.observaciones ||
                `Se actualizó el stock de ${labelInsumo} (Hospital) vía chat de IA.`
            });
          }

          if (logDeposito !== null) {
            const prevVal =
              insumo === "toner"
                ? matchedStock.toner_deposito ?? 0
                : insumo === "mantenimiento"
                ? matchedStock.mantenimiento_deposito ?? 0
                : matchedStock.unidad_deposito ?? 0;
            await addGeneralHistoryLog(db, {
              tipo: "stock",
              modelo: modeloNorm,
              insumo: labelInsumo,
              origen: "Depósito",
              cantidad_anterior: Number(prevVal),
              cantidad_nueva: Number(logDeposito),
              tipo_actualizacion: `${result._provider || "Chat AI"} (Stock)`,
              observaciones:
                result.observaciones ||
                `Se actualizó el stock de ${labelInsumo} (Depósito) vía chat de IA.`
            });
          }

          auditLogs.push(
            `- **${modeloNorm}** (${labelInsumo}): Hospital = ${hVal}, Depósito = ${dVal}`
          );
        }

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `📦 **Stock de Repuestos Actualizado:** He procesado el reporte de inventario de repuestos y actualizado Firestore.\n\n${auditLogs.join(
              "\n"
            )}\n\n*Notas: ${result.observaciones || "Actualización de stock realizada."}*\n\n*(Procesado con ${result._provider || "Chat AI"})*`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        setIsChatLoading(false);
        return;
      }

      // 1.5 Handle Multiple Printers Update (Batch)
      if (action === "actualizar_multiples") {
        if (!result.impresoras || result.impresoras.length === 0) {
          throw new Error("No se detectaron impresoras válidas en el reporte.");
        }

        const auditLogs = [];

        for (const printerData of result.impresoras) {
          if (!printerData.id_serie) continue;
          
          const idSerieUpper = printerData.id_serie.toUpperCase();
          const matchedPrinter = printers.find(
            (p) => p.id_serie.toUpperCase() === idSerieUpper
          );

          // Get fields from printerData, fallback to matchedPrinter or default
          const tonerVal =
            printerData.toner_nivel !== undefined && printerData.toner_nivel !== null
              ? Number(printerData.toner_nivel)
              : matchedPrinter
              ? (matchedPrinter.consumibles?.toner_nivel ?? 100)
              : 100;
          const unitVal =
            printerData.unidad_imagen_nivel !== undefined && printerData.unidad_imagen_nivel !== null
              ? Number(printerData.unidad_imagen_nivel)
              : matchedPrinter
              ? (matchedPrinter.consumibles?.unidad_imagen_nivel ?? 100)
              : 100;
          const maintVal =
            printerData.mantenimiento_kit_nivel !== undefined && printerData.mantenimiento_kit_nivel !== null
              ? Number(printerData.mantenimiento_kit_nivel)
              : matchedPrinter
              ? (matchedPrinter.consumibles?.mantenimiento_kit_nivel ?? 100)
              : 100;

          const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);
          const computedFuncionamiento = calculateStatus(
            printerData.area_actual || (matchedPrinter ? matchedPrinter.area_actual : "Soporte"),
            tonerVal,
            unitVal,
            maintVal,
            printerData.observaciones || (matchedPrinter ? matchedPrinter.observaciones : ""),
            printerData.ubicacion_entidad || (matchedPrinter ? matchedPrinter.ubicacion_entidad : "Hospital")
          );

          const printerDoc = {
            modelo: printerData.modelo || (matchedPrinter ? matchedPrinter.modelo : "MX431ADN"),
            area_actual: printerData.area_actual || (matchedPrinter ? matchedPrinter.area_actual : "Soporte"),
            codigo_caso_cas:
              printerData.codigo_caso_cas !== undefined && printerData.codigo_caso_cas !== null
                ? printerData.codigo_caso_cas
                : (matchedPrinter ? matchedPrinter.codigo_caso_cas || "" : ""),
            detalle_caso:
              printerData.detalle_caso !== undefined && printerData.detalle_caso !== null
                ? printerData.detalle_caso
                : (matchedPrinter ? matchedPrinter.detalle_caso || "" : ""),
            estado_funcionamiento: computedFuncionamiento,
            observaciones: printerData.observaciones || (matchedPrinter ? matchedPrinter.observaciones || "" : ""),
            ubicacion_entidad: printerData.ubicacion_entidad || (matchedPrinter ? printerData.ubicacion_entidad : "Hospital"),
            ip: printerData.ip !== undefined && printerData.ip !== null ? printerData.ip : (matchedPrinter ? matchedPrinter.ip || null : null),
            consumibles: {
              toner_nivel: tonerVal,
              unidad_imagen_nivel: unitVal,
              mantenimiento_kit_nivel: maintVal,
              ultima_lectura: new Date()
            },
            prediccion: prediction
          };

          // Save printer doc
          await createPrinterDoc(db, idSerieUpper, printerDoc);

          // Add printer history item
          await addPrinterHistoryItem(db, idSerieUpper, {
            toner_nivel: tonerVal,
            unidad_imagen_nivel: unitVal,
            mantenimiento_kit_nivel: maintVal,
            estado_funcionamiento: computedFuncionamiento,
            observaciones: printerDoc.observaciones,
            codigo_caso_cas: printerDoc.codigo_caso_cas,
            detalle_caso: printerDoc.detalle_caso,
            ubicacion_entidad: printerDoc.ubicacion_entidad,
            area_actual: printerDoc.area_actual,
            fecha_lectura: new Date(),
            tipo_actualizacion: `${result._provider || "Chat AI"} (Lote)`
          });

          // Add general history log
          await addGeneralHistoryLog(db, {
            tipo: "impresora",
            id_serie: idSerieUpper,
            modelo: printerDoc.modelo,
            area_actual: printerDoc.area_actual,
            toner_nivel: tonerVal,
            unidad_imagen_nivel: unitVal,
            mantenimiento_kit_nivel: maintVal,
            estado_funcionamiento: computedFuncionamiento,
            observaciones: printerDoc.observaciones || "",
            codigo_caso_cas: printerDoc.codigo_caso_cas || "",
            detalle_caso: printerDoc.detalle_caso || "",
            tipo_actualizacion: `${result._provider || "Chat AI"} (Lote)`
          });

          auditLogs.push(
            `- **${printerDoc.modelo}** (S/N: ${idSerieUpper}) en **${printerDoc.area_actual}**`
          );
        }

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `📊 **Actualización por Lote Completada:** He actualizado ${result.impresoras.length} impresoras en Firestore.\n\n**Equipos procesados:**\n${auditLogs.join("\n")}\n\n*(Procesado con ${result._provider || "Chat AI"})*`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        setIsChatLoading(false);
        return;
      }

      // 2. Handle Printer Actions
      if (!result.id_serie && !result.area_actual) {
        throw new Error(
          "La IA no pudo determinar el Número de Serie ni el Área del dispositivo."
        );
      }

      const idSerieUpper = result.id_serie ? result.id_serie.toUpperCase() : "";
      let matchedPrinter = null;

      if (idSerieUpper) {
        const cleanInput = idSerieUpper.replace(/[^A-Z0-9]/g, "");
        if (cleanInput) {
          matchedPrinter = printers.find(
            (p) => p.id_serie.replace(/[^A-Z0-9]/g, "").toUpperCase() === cleanInput
          );

          if (!matchedPrinter && cleanInput.length >= 4) {
            matchedPrinter = printers.find((p) =>
              p.id_serie.replace(/[^A-Z0-9]/g, "").toUpperCase().endsWith(cleanInput)
            );
          }

          if (!matchedPrinter) {
            for (let len of [6, 5, 4]) {
              if (cleanInput.length >= len) {
                const suffix = cleanInput.slice(-len);
                const match = printers.find((p) =>
                  p.id_serie.replace(/[^A-Z0-9]/g, "").toUpperCase().endsWith(suffix)
                );
                if (match) {
                  matchedPrinter = match;
                  break;
                }
              }
            }
          }

          if (!matchedPrinter && cleanInput.length >= 3) {
            const suffix = cleanInput.slice(-3);
            const candidates = printers.filter((p) =>
              p.id_serie.replace(/[^A-Z0-9]/g, "").toUpperCase().endsWith(suffix)
            );
            if (candidates.length === 1) {
              matchedPrinter = candidates[0];
            }
          }
        }
      }

      if (!matchedPrinter && result.area_actual) {
        const normalizeArea = (str) => {
          if (!str) return "";
          let clean = str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
          clean = clean.replace(/^(c\.e\s*|c\.\s*e\.\s*|unidad\s+de\s+|unidad\s+)/g, "");
          return clean.trim();
        };

        const targetAreaNorm = normalizeArea(result.area_actual);

        if (targetAreaNorm) {
          matchedPrinter = printers.find((p) => normalizeArea(p.area_actual) === targetAreaNorm);

          if (!matchedPrinter) {
            matchedPrinter = printers.find((p) =>
              normalizeArea(p.area_actual).includes(targetAreaNorm)
            );
          }
        }
      }

      if (!matchedPrinter && !idSerieUpper) {
        throw new Error(
          "La IA no pudo determinar el Número de Serie del dispositivo. Por favor, asegúrese de que el reporte incluya el número de serie o el área exacta."
        );
      }

      action = result.accion || (matchedPrinter ? "actualizar" : "crear");
      if (action === "crear" && matchedPrinter) {
        action = "actualizar";
      }

      if (action === "eliminar") {
        if (!matchedPrinter) {
          throw new Error(
            `No se puede eliminar: El número de serie ${idSerieUpper} no está registrado en el inventario.`
          );
        }

        await deletePrinterDoc(db, matchedPrinter.id_serie);

        await addGeneralHistoryLog(db, {
          tipo: "impresora",
          id_serie: matchedPrinter.id_serie,
          modelo: matchedPrinter.modelo,
          area_actual: matchedPrinter.area_actual || "Soporte",
          toner_nivel: 0,
          unidad_imagen_nivel: 0,
          mantenimiento_kit_nivel: 0,
          estado_funcionamiento: "En Mantenimiento",
          estado_criticidad: "Eliminado",
          observaciones: `Impresora eliminada vía chat de IA.`,
          codigo_caso_cas: matchedPrinter.codigo_caso_cas || "",
          tipo_actualizacion: `${result._provider || "Chat AI"} (Eliminado)`
        });

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `🗑️ **Impresora Eliminada:** El equipo **${matchedPrinter.modelo}** (S/N: ${matchedPrinter.id_serie}) en el área **${matchedPrinter.area_actual}** ha sido removido de la base de datos Firestore exitosamente.\n\n*(Procesado con ${result._provider || "Chat AI"})*`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        setIsChatLoading(false);
        return;
      }

      if (action === "crear") {
        if (matchedPrinter) {
          throw new Error(
            `El número de serie ${idSerieUpper} ya existe en el inventario. Se omitió la creación.`
          );
        }

        const tonerVal =
          result.toner_nivel !== undefined && result.toner_nivel !== null
            ? Number(result.toner_nivel)
            : 100;
        const unitVal =
          result.unidad_imagen_nivel !== undefined && result.unidad_imagen_nivel !== null
            ? Number(result.unidad_imagen_nivel)
            : 100;
        const maintVal =
          result.mantenimiento_kit_nivel !== undefined && result.mantenimiento_kit_nivel !== null
            ? Number(result.mantenimiento_kit_nivel)
            : 100;
        const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);
        const computedFuncionamiento = calculateStatus(
          result.area_actual || "Soporte",
          tonerVal,
          unitVal,
          maintVal,
          result.observaciones || "",
          result.ubicacion_entidad || "Hospital"
        );

        const newPrinter = {
          modelo: result.modelo || "MX431ADN",
          area_actual: result.area_actual || "Soporte",
          codigo_caso_cas: result.codigo_caso_cas || "",
          detalle_caso: result.detalle_caso || "",
          estado_funcionamiento: computedFuncionamiento,
          observaciones: result.observaciones || "",
          ubicacion_entidad: result.ubicacion_entidad || "Hospital",
          consumibles: {
            toner_nivel: tonerVal,
            unidad_imagen_nivel: unitVal,
            mantenimiento_kit_nivel: maintVal,
            ultima_lectura: new Date()
          },
          prediccion: prediction
        };

        await createPrinterDoc(db, idSerieUpper, newPrinter);

        await addPrinterHistoryItem(db, idSerieUpper, {
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: newPrinter.observaciones,
          codigo_caso_cas: newPrinter.codigo_caso_cas,
          detalle_caso: newPrinter.detalle_caso,
          ubicacion_entidad: newPrinter.ubicacion_entidad,
          area_actual: newPrinter.area_actual,
          fecha_lectura: new Date(),
          tipo_actualizacion: `${result._provider || "Chat AI"} (Creado)`
        });

        await addGeneralHistoryLog(db, {
          tipo: "impresora",
          id_serie: idSerieUpper,
          modelo: newPrinter.modelo,
          area_actual: newPrinter.area_actual,
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: newPrinter.observaciones,
          codigo_caso_cas: newPrinter.codigo_caso_cas,
          detalle_caso: newPrinter.detalle_caso,
          tipo_actualizacion: `${result._provider || "Chat AI"} (Creado)`
        });

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `➕ **Nueva Impresora Registrada:** Se ha guardado en Firestore el equipo **${newPrinter.modelo}** (S/N: ${idSerieUpper}) en el área **${newPrinter.area_actual}**.
            
**Valores iniciales:**
- Nivel de Tóner: ${tonerVal}% (Cambio est.: ${prediction.fecha_cambio_toner.toLocaleDateString('es-PE')})
- Unidad de Imagen: ${unitVal}% (Cambio est.: ${prediction.fecha_cambio_unidad.toLocaleDateString('es-PE')})
- Kit de Mantenimiento: ${maintVal}% (Cambio est.: ${prediction.fecha_cambio_mantenimiento.toLocaleDateString('es-PE')})
- Estado: ${newPrinter.estado_funcionamiento}
- Notas: "${newPrinter.observaciones}"\n\n*(Procesado con ${result._provider || "Chat AI"})*`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        setIsChatLoading(false);
        return;
      }

      // Default: Action is actualizar
      if (!matchedPrinter) {
        const tonerVal =
          result.toner_nivel !== undefined && result.toner_nivel !== null
            ? Number(result.toner_nivel)
            : 100;
        const unitVal =
          result.unidad_imagen_nivel !== undefined && result.unidad_imagen_nivel !== null
            ? Number(result.unidad_imagen_nivel)
            : 100;
        const maintVal =
          result.mantenimiento_kit_nivel !== undefined && result.mantenimiento_kit_nivel !== null
            ? Number(result.mantenimiento_kit_nivel)
            : 100;
        const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);
        const computedFuncionamiento = calculateStatus(
          result.area_actual || "Soporte",
          tonerVal,
          unitVal,
          maintVal,
          result.observaciones || "",
          result.ubicacion_entidad || "Hospital"
        );

        const newPrinter = {
          modelo: result.modelo || "MX431ADN",
          area_actual: result.area_actual || "Soporte",
          codigo_caso_cas: result.codigo_caso_cas || "",
          detalle_caso: result.detalle_caso || "",
          estado_funcionamiento: computedFuncionamiento,
          observaciones: result.observaciones || "",
          ubicacion_entidad: result.ubicacion_entidad || "Hospital",
          consumibles: {
            toner_nivel: tonerVal,
            unidad_imagen_nivel: unitVal,
            mantenimiento_kit_nivel: maintVal,
            ultima_lectura: new Date()
          },
          prediccion: prediction
        };

        await createPrinterDoc(db, idSerieUpper, newPrinter);

        await addPrinterHistoryItem(db, idSerieUpper, {
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: newPrinter.observaciones,
          codigo_caso_cas: newPrinter.codigo_caso_cas,
          detalle_caso: newPrinter.detalle_caso,
          ubicacion_entidad: newPrinter.ubicacion_entidad,
          area_actual: newPrinter.area_actual,
          fecha_lectura: new Date(),
          tipo_actualizacion: `${result._provider || "Chat AI"} (Auto-creado)`
        });

        await addGeneralHistoryLog(db, {
          tipo: "impresora",
          id_serie: idSerieUpper,
          modelo: newPrinter.modelo,
          area_actual: newPrinter.area_actual,
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: newPrinter.observaciones,
          codigo_caso_cas: newPrinter.codigo_caso_cas,
          detalle_caso: newPrinter.detalle_caso,
          tipo_actualizacion: `${result._provider || "Chat AI"} (Auto-creado)`
        });

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `➕ **Impresora Auto-registrada:** El S/N **${idSerieUpper}** no existía en el inventario, por lo que fue creada en Firestore automáticamente.
            
**Valores:**
- Modelo: ${newPrinter.modelo}
- Área: ${newPrinter.area_actual}
- Nivel de Tóner: ${tonerVal}% (Cambio est.: ${prediction.fecha_cambio_toner.toLocaleDateString('es-PE')})
- Unidad de Imagen: ${unitVal}% (Cambio est.: ${prediction.fecha_cambio_unidad.toLocaleDateString('es-PE')})
- Kit de Mantenimiento: ${maintVal}% (Cambio est.: ${prediction.fecha_cambio_mantenimiento.toLocaleDateString('es-PE')})
- Estado: ${newPrinter.estado_funcionamiento}\n\n*(Procesado con ${result._provider || "Chat AI"})*`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } else {
        const tonerVal =
          result.toner_nivel !== undefined && result.toner_nivel !== null
            ? Number(result.toner_nivel)
            : matchedPrinter.consumibles?.toner_nivel ?? 100;
        const unitVal =
          result.unidad_imagen_nivel !== undefined && result.unidad_imagen_nivel !== null
            ? Number(result.unidad_imagen_nivel)
            : matchedPrinter.consumibles?.unidad_imagen_nivel ?? 100;
        const maintVal =
          result.mantenimiento_kit_nivel !== undefined && result.mantenimiento_kit_nivel !== null
            ? Number(result.mantenimiento_kit_nivel)
            : matchedPrinter.consumibles?.mantenimiento_kit_nivel ?? 100;
        const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);
        const computedFuncionamiento = calculateStatus(
          result.area_actual || matchedPrinter.area_actual || "Soporte",
          tonerVal,
          unitVal,
          maintVal,
          result.observaciones || matchedPrinter.observaciones || "",
          result.ubicacion_entidad || matchedPrinter.ubicacion_entidad || "Hospital"
        );

        const obsVal = result.observaciones || matchedPrinter.observaciones || "";

        const updateData = {
          modelo: result.modelo || matchedPrinter.modelo,
          area_actual: result.area_actual || matchedPrinter.area_actual,
          ubicacion_entidad: result.ubicacion_entidad || matchedPrinter.ubicacion_entidad || "Hospital",
          codigo_caso_cas:
            result.codigo_caso_cas !== undefined
              ? result.codigo_caso_cas
              : matchedPrinter.codigo_caso_cas || "",
          detalle_caso:
            result.detalle_caso !== undefined
              ? result.detalle_caso
              : matchedPrinter.detalle_caso || "",
          estado_funcionamiento: computedFuncionamiento,
          observaciones: obsVal,
          "consumibles.toner_nivel": tonerVal,
          "consumibles.unidad_imagen_nivel": unitVal,
          "consumibles.mantenimiento_kit_nivel": maintVal,
          "consumibles.ultima_lectura": new Date(),
          prediccion: prediction
        };

        await updatePrinterDoc(db, matchedPrinter.id_serie, updateData);

        await addPrinterHistoryItem(db, matchedPrinter.id_serie, {
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: updateData.observaciones,
          codigo_caso_cas: updateData.codigo_caso_cas,
          detalle_caso: updateData.detalle_caso,
          ubicacion_entidad: updateData.ubicacion_entidad,
          area_actual: updateData.area_actual,
          fecha_lectura: new Date(),
          tipo_actualizacion: result._provider || "Chat AI"
        });

        await addGeneralHistoryLog(db, {
          tipo: "impresora",
          id_serie: matchedPrinter.id_serie,
          modelo: updateData.modelo,
          area_actual: updateData.area_actual,
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: updateData.observaciones || "",
          codigo_caso_cas: updateData.codigo_caso_cas || "",
          detalle_caso: updateData.detalle_caso || "",
          tipo_actualizacion: result._provider || "Chat AI"
        });

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `🔄 **Impresora Actualizada:** El equipo **${matchedPrinter.modelo}** (S/N: ${
              matchedPrinter.id_serie
            }) ha sido actualizado exitosamente en Firestore.
            
**Valores modificados:**
- Área: ${updateData.area_actual}
- Nivel de Tóner: ${tonerVal}% (Autonomía: ${prediction.dias_restantes_toner} días)
- Unidad de Imagen: ${unitVal}% (Autonomía: ${prediction.dias_restantes_unidad} días)
- Kit de Mantenimiento: ${maintVal}% (Autonomía: ${prediction.dias_restantes_mantenimiento} días)
- Estado: ${updateData.estado_funcionamiento}
- Notas: "${updateData.observaciones || "Sin observaciones"}"\n\n*(Procesado con ${result._provider || "Chat AI"})*`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      }
    } catch (error) {
      console.error("Chat message error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `⚠️ **Error al procesar:** ${error.message}. Por favor intente de nuevo detallando más o revisando la API Key en Ajustes.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsChatLoading(false);
      setEditableFields(null);
      setPendingAiResult(null);
    }
  };

  return {
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    pendingAttachments,
    showReviewModal,
    setShowReviewModal,
    editableFields,
    setEditableFields,
    isChatLoading,
    fileInputRef,
    pdfInputRef,
    cameraInputRef,
    chatEndRef,
    chatTextareaRef,
    addFilesToQueue,
    handleImageChange,
    handlePdfChange,
    removeAttachment,
    handleChatPaste,
    handleSendChatMessage,
    handleConfirmSend,
    handleCancelReviewedData
  };
}
