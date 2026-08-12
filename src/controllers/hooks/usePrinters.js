import { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import * as XLSX from "xlsx";
import {
  subscribePrinterHistory,
  addPrinterHistory,
  createPrinter,
  updatePrinter,
  deletePrinterDoc,
  renamePrinter,
  deletePrinterHistoryItem as dbDeletePrinterHistoryItem
} from "../../models/PrinterModel";
import { calcularFechasPredictivas } from "../../services/PredictionService";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
export function checkPrinterAlerts(p) {
  if (!p) return false;
  
  if (p.estado_funcionamiento) {
    const statusLower = p.estado_funcionamiento.toLowerCase();
    if (statusLower.includes("advertencia") && !statusLower.includes("conexion") && !statusLower.includes("conexión")) {
      return true;
    }
  }
  
  if (p.estado_funcionamiento_manual === true && p.estado_funcionamiento === "Advertencia") {
    return true;
  }
  
  if (p.estado_funcionamiento_manual === true && (p.estado_funcionamiento === "Inoperativo" || p.estado_funcionamiento === "En Mantenimiento")) {
    return false;
  }
  
  const area = p.area_actual || "";
  const toner = p.consumibles?.toner_nivel ?? null;
  const unit = p.consumibles?.unidad_imagen_nivel ?? null;
  const maintenance = p.consumibles?.mantenimiento_kit_nivel ?? null;
  const observaciones = p.observaciones || "";
  const ubicacion = p.ubicacion_entidad || "Hospital";

  const cleanArea = area.toLowerCase().trim();
  const cleanObs = observaciones.toLowerCase().trim();
  const cleanUbicacion = ubicacion.toLowerCase().trim();
  
  const isNonServiceArea = cleanArea.includes("soporte") || 
                           cleanArea.includes("mur") || 
                           cleanUbicacion.includes("mur");
  
  const tonerVal = (toner !== null && toner !== undefined) ? Number(toner) : null;
  const unitVal = (unit !== null && unit !== undefined) ? Number(unit) : null;
  const maintVal = (maintenance !== null && maintenance !== undefined) ? Number(maintenance) : null;

  const levelIsZero = (tonerVal !== null && tonerVal === 0) || 
                      (unitVal !== null && unitVal === 0) || 
                      (maintVal !== null && maintVal === 0);

  const hasSeriousObs = cleanObs.includes("inoperativa") || 
                         cleanObs.includes("inoperativo") || 
                         cleanObs.includes("malograda") || 
                         cleanObs.includes("malogrado") || 
                         cleanObs.includes("dañada") || 
                         cleanObs.includes("dañado") || 
                         cleanObs.includes("baja") || 
                         cleanObs.includes("mal estado") || 
                         cleanObs.includes("inoperable") ||
                         cleanObs.includes("falta") ||
                         cleanObs.includes("error");

  const hasWarningObs = cleanObs.includes("traba") ||
                        cleanObs.includes("atasco") ||
                        cleanObs.includes("mantenimiento") ||
                        cleanObs.includes("limpieza") ||
                        cleanObs.includes("detalles");

  const levelIsLow = (tonerVal !== null && tonerVal <= 15) || 
                     (unitVal !== null && unitVal <= 15) || 
                     (maintVal !== null && maintVal <= 15);

  const isInoperative = isNonServiceArea && (hasSeriousObs || levelIsZero);
  
  if (isInoperative) {
    return false;
  }
  
  return levelIsLow || hasWarningObs || hasSeriousObs || levelIsZero;
}

export function usePrinters({ db, filterCriticidad, addGeneralHistoryLog }) {
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(true);

  // Search & Filter State
  const [searchText, setSearchText] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [prevSearchFilter, setPrevSearchFilter] = useState({ text: "", filter: filterCriticidad });
  if (searchText !== prevSearchFilter.text || filterCriticidad !== prevSearchFilter.filter) {
    setPrevSearchFilter({ text: searchText, filter: filterCriticidad });
    setCurrentPage(1);
  }

  // Inline Row Editing State for Desktop Excel-style Table
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingRowData, setEditingRowData] = useState({});

  // Clipboard copy state for Serial Numbers
  const [copiedSerialId, setCopiedSerialId] = useState(null);

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [selectedPrinterHistory, setSelectedPrinterHistory] = useState([]);

  // Form States
  const [editIdSerie, setEditIdSerie] = useState("");
  const [editModelo, setEditModelo] = useState("MX431ADN");
  const [editArea, setEditArea] = useState("");
  const [editToner, setEditToner] = useState(100);
  const [editUnit, setEditUnit] = useState(100);
  const [editMantenimiento, setEditMantenimiento] = useState(100);
  const [editObservaciones, setEditObservaciones] = useState("");
  const [editCasCode, setEditCasCode] = useState("");
  const [editDetalleCaso, setEditDetalleCaso] = useState("");
  const [editUbicacion, setEditUbicacion] = useState("Hospital");
  const [editFuncionamiento, setEditFuncionamiento] = useState("Operativo");
  const [editIp, setEditIp] = useState("");
  const [editGarantia, setEditGarantia] = useState("");
  const [editEstadisticas, setEditEstadisticas] = useState({
    hojas_impresas: { total: 0, imprimir: 0, copiar: 0 },
    caras_impresas: { total: 0, imprimir: 0, copiar: 0 },
    caras_cargadas: { total: 0 }
  });
  const [editFuncionamientoAuto, setEditFuncionamientoAuto] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Fetch history for selected printer when modal opens
  useEffect(() => {
    let unsubscribeSelectedHistory = null;
    if (selectedPrinter) {
      unsubscribeSelectedHistory = subscribePrinterHistory(
        db,
        selectedPrinter.id_serie,
        (historyList) => {
          setSelectedPrinterHistory(historyList);
        },
        (e) => {
          console.error("Error fetching printer history:", e);
        }
      );
    }
    return () => {
      if (unsubscribeSelectedHistory) unsubscribeSelectedHistory();
    };
  }, [db, selectedPrinter]);

  const calculatePrinterStatus = (area, toner, unit, maintenance, observaciones, ubicacion = "Hospital") => {
    const cleanArea = (area || "").toLowerCase().trim();
    const cleanObs = (observaciones || "").toLowerCase().trim();
    const cleanUbicacion = (ubicacion || "").toLowerCase().trim();
    
    if (cleanUbicacion.includes("lexmark") || cleanArea.includes("lexmark")) {
      return "En Mantenimiento";
    }

    const isNonServiceArea = cleanArea.includes("soporte") || 
                             cleanArea.includes("mur") || 
                             cleanUbicacion.includes("mur");
    
    const tonerVal = Number(toner ?? 100);
    const unitVal = Number(unit ?? 100);
    const maintVal = Number(maintenance ?? 100);

    const levelIsZero = tonerVal === 0 || unitVal === 0 || maintVal === 0;

    const hasSeriousObs = cleanObs.includes("inoperativa") || 
                           cleanObs.includes("inoperativo") || 
                           cleanObs.includes("malograda") || 
                           cleanObs.includes("malogrado") || 
                           cleanObs.includes("dañada") || 
                           cleanObs.includes("dañado") || 
                           cleanObs.includes("baja") || 
                           cleanObs.includes("mal estado") || 
                           cleanObs.includes("inoperable") ||
                           cleanObs.includes("falta") ||
                           cleanObs.includes("error");

    if (isNonServiceArea && (hasSeriousObs || levelIsZero)) {
      return "En Mantenimiento";
    }

    return "Operativo";
  };

  const getPrinterStatus = (p) => {
    const area = p.area_actual || "";
    const ubicacion = p.ubicacion_entidad || "Hospital";
    const cleanArea = area.toLowerCase().trim();
    const cleanUbicacion = ubicacion.toLowerCase().trim();

    if (cleanUbicacion.includes("lexmark") || cleanArea.includes("lexmark")) {
      return "En Mantenimiento";
    }

    const isNonServiceArea = cleanArea.includes("soporte") || 
                             cleanArea.includes("mur") || 
                             cleanUbicacion.includes("mur");

    const cleanObs = (p.observaciones || "").toLowerCase().trim();
    const hasSeriousObs = cleanObs.includes("inoperativa") || 
                           cleanObs.includes("inoperativo") || 
                           cleanObs.includes("malograda") || 
                           cleanObs.includes("malogrado") || 
                           cleanObs.includes("dañada") || 
                           cleanObs.includes("dañado") || 
                           cleanObs.includes("baja") || 
                           cleanObs.includes("mal estado") || 
                           cleanObs.includes("inoperable") ||
                           cleanObs.includes("falta") ||
                           cleanObs.includes("error");

    const tonerVal = p.consumibles?.toner_nivel ?? 100;
    const unitVal = p.consumibles?.unidad_imagen_nivel ?? 100;
    const maintVal = p.consumibles?.mantenimiento_kit_nivel ?? 100;
    const levelIsZero = tonerVal === 0 || unitVal === 0 || maintVal === 0;

    if (isNonServiceArea && (hasSeriousObs || levelIsZero)) {
      return "En Mantenimiento";
    }

    if (p.estado_funcionamiento) {
      if (p.estado_funcionamiento === "En Mantenimiento" && !hasSeriousObs && !levelIsZero) {
        return "Operativo";
      }
      const isConnectionWarning = p.estado_funcionamiento.toLowerCase().includes("conexion") || p.estado_funcionamiento.toLowerCase().includes("conexión");
      if (isConnectionWarning) {
        return "Operativo";
      }
      return p.estado_funcionamiento;
    }
    // Fallback actual si no tiene estado guardado...
    const toner = p.consumibles?.toner_nivel ?? 100;
    const unit = p.consumibles?.unidad_imagen_nivel ?? 100;
    const maint = p.consumibles?.mantenimiento_kit_nivel ?? 100;
    const status = calculatePrinterStatus(p.area_actual, toner, unit, maint, p.observaciones, p.ubicacion_entidad);
    if (status === "Advertencia") return "Operativo";
    if (status === "Inoperativo") return "En Mantenimiento";
    return status;
  };

  const getBaseStatus = (status) => {
    if (!status) return "Operativo";
    const s = status.toLowerCase();
    if (s.includes("mantenimiento") || s.includes("inoperativo")) {
      return "En Mantenimiento";
    }
    return "Operativo";
  };

  const isPrinterInoperative = (p) => {
    return getBaseStatus(getPrinterStatus(p)) === "En Mantenimiento";
  };

  const [prevAutoCalcDeps, setPrevAutoCalcDeps] = useState("");
  const currentDeps = JSON.stringify([editArea, editToner, editUnit, editMantenimiento, editObservaciones, editUbicacion, editFuncionamientoAuto]);
  
  if (editFuncionamientoAuto && currentDeps !== prevAutoCalcDeps) {
    setPrevAutoCalcDeps(currentDeps);
    const computed = calculatePrinterStatus(
      editArea,
      Number(editToner),
      Number(editUnit),
      Number(editMantenimiento),
      editObservaciones,
      editUbicacion
    );
    setEditFuncionamiento(computed);
  }

  const handleCopySerial = (serial) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerialId(serial);
    setTimeout(() => setCopiedSerialId(null), 2000);
  };

  const handleOpenEditModal = (printer) => {
    setIsCreateMode(false);
    setSelectedPrinter(printer);
    setEditIdSerie(printer.id_serie);
    setEditModelo(printer.modelo);
    setEditArea(printer.area_actual || "");
    const tonerVal = printer.consumibles?.toner_nivel ?? 100;
    const unitVal = printer.consumibles?.unidad_imagen_nivel ?? 100;
    const maintVal = printer.consumibles?.mantenimiento_kit_nivel ?? 100;
    setEditToner(tonerVal);
    setEditUnit(unitVal);
    setEditMantenimiento(maintVal);
    const obsVal = printer.observaciones || "";
    setEditObservaciones(obsVal);
    setEditCasCode(printer.codigo_caso_cas || "");
    setEditDetalleCaso(printer.detalle_caso || "");
    setEditUbicacion(printer.ubicacion_entidad || "Hospital");
    setEditIp(printer.ip || "");
    setEditGarantia(printer.garantia_vencimiento || "");
    setEditEstadisticas(printer.estadisticas || {
      hojas_impresas: { total: 0, imprimir: 0, copiar: 0 },
      caras_impresas: { total: 0, imprimir: 0, copiar: 0 },
      caras_cargadas: { total: 0 }
    });

    const storedStatus = printer.estado_funcionamiento || getPrinterStatus(printer);
    const calculated = calculatePrinterStatus(
      printer.area_actual || "",
      tonerVal,
      unitVal,
      maintVal,
      obsVal,
      printer.ubicacion_entidad || "Hospital"
    );
    setEditFuncionamiento(storedStatus);
    setEditFuncionamientoAuto(storedStatus === calculated);

    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setIsCreateMode(true);
    setSelectedPrinter(null);
    setEditIdSerie("");
    setEditModelo("MX431ADN");
    setEditArea("Soporte");
    setEditToner(100);
    setEditUnit(100);
    setEditMantenimiento(100);
    setEditObservaciones("");
    setEditCasCode("");
    setEditDetalleCaso("");
    setEditUbicacion("Hospital");
    setEditIp("");
      setEditGarantia("");
    setEditEstadisticas({
      hojas_impresas: { total: 0, imprimir: 0, copiar: 0 },
      caras_impresas: { total: 0, imprimir: 0, copiar: 0 },
      caras_cargadas: { total: 0 }
    });
    setEditFuncionamiento("Operativo");
    setEditFuncionamientoAuto(true);
    setSelectedPrinterHistory([]);
    setIsModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsModalOpen(false);
    setSelectedPrinter(null);
    setSelectedPrinterHistory([]);
  };

  const handleSavePrinterChanges = async (e) => {
    e.preventDefault();

    const cleanId = editIdSerie.trim().toUpperCase();
    if (!cleanId) {
      alert("Por favor, ingrese un número de serie.");
      return;
    }

    setSavingEdit(true);
    try {
      const computedFuncionamiento = calculatePrinterStatus(
        editArea,
        Number(editToner),
        Number(editUnit),
        Number(editMantenimiento),
        editObservaciones,
        editUbicacion
      );
      const prediction = calcularFechasPredictivas(Number(editToner), Number(editUnit), Number(editMantenimiento));

      // Lógica de Historial de Hojas Cargadas
      let updatedEstadisticas = { ...editEstadisticas };
      if (!isCreateMode && selectedPrinter) {
        const oldCargadas = selectedPrinter.estadisticas?.caras_cargadas?.total || 0;
        const newCargadas = editEstadisticas?.caras_cargadas?.total || 0;
        if (newCargadas > oldCargadas) {
          const diff = newCargadas - oldCargadas;
          const currentHist = Array.isArray(updatedEstadisticas.caras_cargadas?.historial) 
            ? updatedEstadisticas.caras_cargadas.historial 
            : [];
          updatedEstadisticas = {
            ...updatedEstadisticas,
            caras_cargadas: {
              ...updatedEstadisticas.caras_cargadas,
              historial: [
                { fecha: new Date(), cantidad: diff },
                ...currentHist
              ]
            }
          };
        }
      } else if (isCreateMode) {
        const newCargadas = editEstadisticas?.caras_cargadas?.total || 0;
        if (newCargadas > 0) {
          updatedEstadisticas = {
            ...updatedEstadisticas,
            caras_cargadas: {
              ...updatedEstadisticas.caras_cargadas,
              historial: [
                { fecha: new Date(), cantidad: newCargadas }
              ]
            }
          };
        }
      }

      if (isCreateMode) {
        const exists = printers.some((p) => p.id_serie.toUpperCase() === cleanId);
        if (exists) {
          alert(`El número de serie ${cleanId} ya está registrado en el inventario.`);
          setSavingEdit(false);
          return;
        }

        const printerDoc = {
          modelo: editModelo,
          area_actual: editArea,
          codigo_caso_cas: editCasCode,
          detalle_caso: editDetalleCaso || "",
          ip: editIp,
          estado_funcionamiento: computedFuncionamiento,
          estado_funcionamiento_manual: false,
          observaciones: editObservaciones || "",
          ubicacion_entidad: editUbicacion,
          consumibles: {
            toner_nivel: Number(editToner),
            unidad_imagen_nivel: Number(editUnit),
            mantenimiento_kit_nivel: Number(editMantenimiento),
            ultima_lectura: new Date()
          },
          prediccion: prediction,
          estadisticas: updatedEstadisticas,
          garantia_vencimiento: editGarantia || null,
          ultima_actualizacion: Timestamp.now()
        };

        await createPrinter(db, cleanId, printerDoc);

        await addPrinterHistory(db, cleanId, {
          toner_nivel: Number(editToner),
          unidad_imagen_nivel: Number(editUnit),
          mantenimiento_kit_nivel: Number(editMantenimiento),
          estado_funcionamiento: computedFuncionamiento,
          estado_funcionamiento_manual: false,
          observaciones: printerDoc.observaciones,
          codigo_caso_cas: editCasCode,
          detalle_caso: editDetalleCaso || "",
          ubicacion_entidad: editUbicacion,
          area_actual: editArea,
          fecha_lectura: new Date(),
          tipo_actualizacion: "Manual (Creado)"
        });
      } else {
        if (!selectedPrinter) return;

        const oldId = selectedPrinter.id_serie.toUpperCase();

        if (cleanId !== oldId) {
          const exists = printers.some((p) => p.id_serie.toUpperCase() === cleanId);
          if (exists) {
            alert(`El número de serie ${cleanId} ya está registrado en el inventario por otra impresora.`);
            setSavingEdit(false);
            return;
          }

          const newPrinterDoc = {
            modelo: editModelo,
            area_actual: editArea,
            codigo_caso_cas: editCasCode,
            detalle_caso: editDetalleCaso || "",
            ip: editIp,
            estado_funcionamiento: computedFuncionamiento,
            estado_funcionamiento_manual: !editFuncionamientoAuto,
            observaciones: editObservaciones || "",
            ubicacion_entidad: editUbicacion,
            consumibles: {
              toner_nivel: Number(editToner),
              unidad_imagen_nivel: Number(editUnit),
              mantenimiento_kit_nivel: Number(editMantenimiento),
              ultima_lectura: new Date()
            },
            prediccion: prediction,
            estadisticas: updatedEstadisticas,
            garantia_vencimiento: editGarantia || null,
            ultima_actualizacion: Timestamp.now()
          };

          const newHistoryDoc = {
            toner_nivel: Number(editToner),
            unidad_imagen_nivel: Number(editUnit),
            mantenimiento_kit_nivel: Number(editMantenimiento),
            estado_funcionamiento: computedFuncionamiento,
            estado_funcionamiento_manual: !editFuncionamientoAuto,
            observaciones: editObservaciones,
            codigo_caso_cas: editCasCode,
            detalle_caso: editDetalleCaso || "",
            ubicacion_entidad: editUbicacion,
            area_actual: editArea,
            fecha_lectura: new Date(),
            tipo_actualizacion: "Manual (Editado S/N)"
          };

          await renamePrinter(db, oldId, cleanId, newPrinterDoc, newHistoryDoc);
        } else {
          const updateData = {
            modelo: editModelo,
            area_actual: editArea,
            codigo_caso_cas: editCasCode,
            detalle_caso: editDetalleCaso || "",
            ip: editIp,
            estado_funcionamiento: computedFuncionamiento,
            estado_funcionamiento_manual: !editFuncionamientoAuto,
            observaciones: editObservaciones,
            ubicacion_entidad: editUbicacion,
            "consumibles.toner_nivel": Number(editToner),
            "consumibles.unidad_imagen_nivel": Number(editUnit),
            "consumibles.mantenimiento_kit_nivel": Number(editMantenimiento),
            "consumibles.ultima_lectura": new Date(),
            prediccion: prediction,
            estadisticas: updatedEstadisticas,
            garantia_vencimiento: editGarantia || null,
            ultima_actualizacion: Timestamp.now()
          };

          await updatePrinter(db, cleanId, updateData);

          await addPrinterHistory(db, cleanId, {
            toner_nivel: Number(editToner),
            unidad_imagen_nivel: Number(editUnit),
            mantenimiento_kit_nivel: Number(editMantenimiento),
            estado_funcionamiento: computedFuncionamiento,
            estado_funcionamiento_manual: false,
            observaciones: editObservaciones,
            codigo_caso_cas: editCasCode,
            detalle_caso: editDetalleCaso || "",
            ubicacion_entidad: editUbicacion,
            area_actual: editArea,
            fecha_lectura: new Date(),
            tipo_actualizacion: "Manual"
          });
        }
      }

      await addGeneralHistoryLog(db, {
        tipo: "impresora",
        id_serie: cleanId,
        modelo: editModelo,
        area_actual: editArea,
        ip: editIp,
        toner_nivel: Number(editToner),
        unidad_imagen_nivel: Number(editUnit),
        mantenimiento_kit_nivel: Number(editMantenimiento),
        estado_funcionamiento: computedFuncionamiento,
        observaciones: editObservaciones || "",
        codigo_caso_cas: editCasCode,
        detalle_caso: editDetalleCaso || "",
        tipo_actualizacion: isCreateMode ? "Manual (Creado)" : "Manual"
      });

      handleCloseEditModal();
    } catch (error) {
      console.error("Error saving printer updates:", error);
      alert("Error al guardar cambios: " + error.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRowDataChange = (field, value) => {
    setEditingRowData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRowNestedDataChange = (parentField, childField, value) => {
    setEditingRowData((prev) => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: value
      }
    }));
  };

  const handleStartRowEdit = (printer) => {
    setEditingRowId(printer.id_serie);
    setEditingRowData({ ...printer });
  };

  const handleSaveRowEdit = async (rowId) => {
    if (!editingRowData) return;
    try {
      const tonerVal = Number(editingRowData.consumibles?.toner_nivel ?? 100);
      const unitVal = Number(editingRowData.consumibles?.unidad_imagen_nivel ?? 100);
      const maintVal = Number(editingRowData.consumibles?.mantenimiento_kit_nivel ?? 100);
      const areaVal = editingRowData.area_actual || "Soporte";
      const obsVal = editingRowData.observaciones || "";
      const ipVal = editingRowData.ip || "";
      const ubicacionVal = editingRowData.ubicacion_entidad || "Hospital";

      const computedFuncionamiento = calculatePrinterStatus(
        areaVal,
        tonerVal,
        unitVal,
        maintVal,
        obsVal,
        ubicacionVal
      );
      
      const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);

      const updateData = {
        modelo: editingRowData.modelo || "MX431ADN",
        area_actual: areaVal,
        ip: ipVal,
        observaciones: obsVal,
        codigo_caso_cas: editingRowData.codigo_caso_cas || "",
        detalle_caso: editingRowData.detalle_caso || "",
        estado_funcionamiento: computedFuncionamiento,
        "consumibles.toner_nivel": tonerVal,
        "consumibles.unidad_imagen_nivel": unitVal,
        "consumibles.mantenimiento_kit_nivel": maintVal,
        "consumibles.ultima_lectura": new Date(),
        prediccion: prediction
      };

      await updatePrinter(db, rowId, updateData);

      await addPrinterHistory(db, rowId, {
        toner_nivel: tonerVal,
        unidad_imagen_nivel: unitVal,
        mantenimiento_kit_nivel: maintVal,
        estado_funcionamiento: computedFuncionamiento,
        observaciones: obsVal,
        codigo_caso_cas: editingRowData.codigo_caso_cas || "",
        detalle_caso: editingRowData.detalle_caso || "",
        area_actual: areaVal,
        fecha_lectura: new Date(),
        tipo_actualizacion: "Edición Rápida Tabla"
      });

      await addGeneralHistoryLog(db, {
        tipo: "impresora",
        id_serie: rowId,
        modelo: editingRowData.modelo || "MX431ADN",
        area_actual: areaVal,
        toner_nivel: tonerVal,
        unidad_imagen_nivel: unitVal,
        mantenimiento_kit_nivel: maintVal,
        estado_funcionamiento: computedFuncionamiento,
        observaciones: obsVal,
        codigo_caso_cas: editingRowData.codigo_caso_cas || "",
        detalle_caso: editingRowData.detalle_caso || "",
        tipo_actualizacion: "Edición Rápida Tabla"
      });

      setEditingRowId(null);
      setEditingRowData({});
    } catch (error) {
      console.error("Error saving row inline edit:", error);
      alert("Error al guardar cambios: " + error.message);
    }
  };

  const handleRowKeyDown = (e, rowId) => {
    if (e.key === "Enter") {
      handleSaveRowEdit(rowId);
    } else if (e.key === "Escape") {
      setEditingRowId(null);
      setEditingRowData({});
    }
  };

  const handleDeletePrinter = async () => {
    if (!selectedPrinter) return;

    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la impresora ${selectedPrinter.modelo} (S/N: ${selectedPrinter.id_serie})? Esta acción no se puede deshacer y eliminará permanentemente el equipo.`
    );
    if (!confirmDelete) return;

    setSavingEdit(true);
    try {
      await deletePrinterDoc(db, selectedPrinter.id_serie);
      alert("Impresora eliminada exitosamente.");
      handleCloseEditModal();
    } catch (error) {
      console.error("Error deleting printer:", error);
      alert("Error al eliminar la impresora: " + error.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteHistoryItem = async (historyId) => {
    if (!selectedPrinter) return;

    const confirmDelete = window.confirm(
      "¿Estás seguro de que deseas eliminar este registro del historial de lecturas?"
    );
    if (!confirmDelete) return;

    try {
      await dbDeletePrinterHistoryItem(db, selectedPrinter.id_serie, historyId);
      setSelectedPrinterHistory((prev) => prev.filter((h) => h.id !== historyId));
      alert("Registro de historial eliminado exitosamente.");
    } catch (error) {
      console.error("Error deleting history entry:", error);
      alert("Error al eliminar el registro de historial: " + error.message);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yy = String(today.getFullYear()).slice(-2);
      const dateStr = `${dd}/${mm}/${yy}`;

      const wb = new ExcelJS.Workbook();
      wb.creator = "SAMI Lexmark";
      wb.created = today;

      // Estilos Corporativos
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008240' } }; // Lexmark Green
      const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11, name: 'Calibri' };
      const titleFont = { color: { argb: 'FF008240' }, bold: true, size: 16, name: 'Calibri' };
      const centerAlign = { vertical: 'middle', horizontal: 'center' };
      const leftAlign = { vertical: 'middle', horizontal: 'left' };
      
      const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };

      const getStatusColor = (status) => {
        if (status.includes("MANTENIMIENTO")) return { argb: 'FFE74C3C' }; // Red
        if (status.includes("ALERTA")) return { argb: 'FFF39C12' }; // Orange
        return { argb: 'FF27AE60' }; // Green
      };

      // 1. Sort Printers
      const sortedPrinters = [...printers].sort((a, b) => {
        const modelA = (a.modelo || "MX431ADN").trim();
        const modelB = (b.modelo || "MX431ADN").trim();
        const modelCmp = modelA.localeCompare(modelB, "es", { sensitivity: "base" });
        if (modelCmp !== 0) return modelCmp;
        
        const aInop = isPrinterInoperative(a);
        const bInop = isPrinterInoperative(b);
        if (aInop && !bInop) return -1;
        if (!aInop && bInop) return 1;

        const aAlert = checkPrinterAlerts(a);
        const bAlert = checkPrinterAlerts(b);
        if (aAlert && !bAlert) return -1;
        if (!aAlert && bAlert) return 1;

        const areaA = (a.area_actual || "").trim();
        const areaB = (b.area_actual || "").trim();
        return areaA.localeCompare(areaB, "es", { sensitivity: "base" });
      });

      const sheetsData = {};
      sortedPrinters.forEach(p => {
        const ubi = p.ubicacion_entidad || "Hospital";
        if (!sheetsData[ubi]) sheetsData[ubi] = [];
        sheetsData[ubi].push(p);
      });

      // 2. Summary Sheet (Strategic)
      const wsStrategic = wb.addWorksheet("Resumen Estratégico", { views: [{ showGridLines: false }] });
      wsStrategic.columns = [
        { width: 25 }, { width: 18 }, { width: 15 }, { width: 18 }, { width: 22 }, { width: 22 }, { width: 25 }, { width: 25 }, { width: 45 }
      ];

      // Titulo
      wsStrategic.mergeCells('A1:I2');
      const titleCellStrat = wsStrategic.getCell('A1');
      titleCellStrat.value = `REPORTE ESTRATÉGICO GERENCIAL - SAMI LEXMARK (${dateStr})`;
      titleCellStrat.font = titleFont;
      titleCellStrat.alignment = centerAlign;

      // Headers Estrategico
      const stratHeaders = ["🖨️ MODELO", "📊 TOTAL EQUIPOS", "✅ OPERATIVOS", "⚠️ CON ALERTAS", "🚨 EN MANTENIMIENTO", "🛒 COMPRAR TÓNER", "🛒 COMPRAR KIT MANT.", "🛒 COMPRAR U. IMAGEN", "📍 TOP 3 ÁREAS (Mayor Vol.)"];
      const stratHeaderRow = wsStrategic.addRow(stratHeaders);
      stratHeaderRow.height = 30;
      stratHeaderRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = centerAlign;
        cell.border = thinBorder;
      });

      const models = [...new Set(printers.map(p => p.modelo || "MX431ADN"))].sort();
      let granTotalToner = 0, granTotalKit = 0, granTotalUnidad = 0;

      models.forEach(modelo => {
        const modelPrinters = printers.filter(p => (p.modelo || "MX431ADN") === modelo);
        let operativos = 0, alertas = 0, mantenimiento = 0;
        let reqToner = 0, reqKit = 0, reqUnidad = 0;
        const areasCount = {};
        
        modelPrinters.forEach(p => {
           const inop = isPrinterInoperative(p);
           const alert = checkPrinterAlerts(p);
           if (inop) mantenimiento++;
           else if (alert) alertas++;
           else operativos++;
           
           const toner = p.consumibles?.toner_nivel ?? 100;
           const kit = p.consumibles?.mantenimiento_kit_nivel ?? 100;
           const unidad = p.consumibles?.unidad_imagen_nivel ?? 100;
           
           if (toner <= 15) reqToner++;
           if (kit <= 15) reqKit++;
           if (unidad <= 15) reqUnidad++;
           
           const area = p.area_actual || "Sin Asignar";
           areasCount[area] = (areasCount[area] || 0) + 1;
        });
        
        granTotalToner += reqToner; granTotalKit += reqKit; granTotalUnidad += reqUnidad;
        
        const topAreas = Object.entries(areasCount).sort((a,b) => b[1] - a[1]).slice(0, 3).map(e => `${e[0]} (${e[1]})`).join(", ");
          
        const row = wsStrategic.addRow([
          modelo,
          modelPrinters.length,
          operativos,
          alertas,
          mantenimiento,
          reqToner > 0 ? `${reqToner} und.` : "-",
          reqKit > 0 ? `${reqKit} und.` : "-",
          reqUnidad > 0 ? `${reqUnidad} und.` : "-",
          topAreas
        ]);
        
        row.eachCell((cell, colNumber) => {
          cell.alignment = colNumber === 1 || colNumber === 9 ? leftAlign : centerAlign;
          cell.border = thinBorder;
          if (colNumber === 3 && operativos > 0) cell.font = { color: { argb: 'FF27AE60' }, bold: true };
          if (colNumber === 4 && alertas > 0) cell.font = { color: { argb: 'FFF39C12' }, bold: true };
          if (colNumber === 5 && mantenimiento > 0) cell.font = { color: { argb: 'FFE74C3C' }, bold: true };
        });
      });

      // Totalizadores
      wsStrategic.addRow([]);
      const totalRow = wsStrategic.addRow([
        "TOTAL COMPRA SUGERIDA:", "", "", "", "",
        granTotalToner > 0 ? `${granTotalToner} und.` : "-",
        granTotalKit > 0 ? `${granTotalKit} und.` : "-",
        granTotalUnidad > 0 ? `${granTotalUnidad} und.` : "-",
        ""
      ]);
      totalRow.height = 25;
      totalRow.eachCell((cell, colNum) => {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        cell.alignment = centerAlign;
        cell.border = thinBorder;
        if (colNum >= 6 && colNum <= 8 && cell.value !== "-") {
          cell.font = { bold: true, color: { argb: 'FFE74C3C' } };
        }
      });
      wsStrategic.mergeCells(`A${totalRow.number}:E${totalRow.number}`);

      // 3. Sheets por Ubicacion Fisica
      Object.keys(sheetsData).forEach(ubicacion => {
        let sheetName = ubicacion.toUpperCase() === "HOSPITAL" ? "Inventario Hospital" : `Inv. ${ubicacion}`;
        if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);
        
        const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
        ws.columns = [
          { width: 6 }, { width: 20 }, { width: 22 }, { width: 35 }, { width: 22 }, { width: 15 }, { width: 15 }, { width: 18 }, { width: 18 }, { width: 50 }
        ];

        // Titulo de la sede
        ws.mergeCells('A1:J2');
        const titleCell = ws.getCell('A1');
        titleCell.value = `INVENTARIO DE IMPRESORAS - ${ubicacion.toUpperCase()} (${dateStr})`;
        titleCell.font = titleFont;
        titleCell.alignment = centerAlign;

        // Cabeceras
        const headers = ["N°", "🖨️ MODELO", "📌 SERIE", "🏢 ÁREA ACTUAL", "📊 ESTADO", "⚫ TÓNER", "🔧 KIT", "🖼️ U. IMAGEN", "📝 CASO CAS", "🔍 OBSERVACIONES"];
        const headerRow = ws.addRow(headers);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
          cell.fill = headerFill;
          cell.font = headerFont;
          cell.alignment = centerAlign;
          cell.border = thinBorder;
        });

        // Filas
        sheetsData[ubicacion].forEach((p, idx) => {
          const inop = isPrinterInoperative(p);
          const alert = checkPrinterAlerts(p);
          const estado = inop ? "🚨 MANTENIMIENTO" : (alert ? "⚠️ ALERTA" : "✅ OPERATIVO");
          
          const areaActual = p.area_actual || "";
          let areaDisplay = areaActual || "Sin asignar";
                                
          if (ubicacion.toUpperCase() !== "HOSPITAL") {
            const isInvalidArea = !areaActual || 
                                  areaActual.toLowerCase().includes("soporte") || 
                                  areaActual.toLowerCase().includes("sin asignar") || 
                                  /^[-_\s]+$/.test(areaActual);
            if (isInvalidArea) {
              areaDisplay = ubicacion;
            } else {
              areaDisplay = `${ubicacion} - ${areaActual.trim()}`;
            }
          } else {
            areaDisplay = areaActual.trim() || "Sin asignar";
          }

          const formatLevel = (lvl) => lvl !== null && lvl !== undefined && lvl !== "-" ? `${lvl}%` : "-";

          const row = ws.addRow([
            idx + 1,
            p.modelo || "MX431ADN",
            p.id_serie,
            areaDisplay,
            estado,
            formatLevel(p.consumibles?.toner_nivel),
            formatLevel(p.consumibles?.mantenimiento_kit_nivel),
            formatLevel(p.consumibles?.unidad_imagen_nivel),
            p.codigo_caso_cas || "",
            p.observaciones || ""
          ]);

          row.eachCell((cell, colNumber) => {
            cell.alignment = centerAlign;
            cell.border = thinBorder;
            
            // Colores especiales
            if (colNumber === 4 || colNumber === 10) cell.alignment = leftAlign; // Area y Obs a la izq
            if (colNumber === 5) {
              cell.font = { bold: true, color: getStatusColor(estado) };
            }
            if (colNumber >= 6 && colNumber <= 8) {
              const val = parseInt(cell.value);
              if (!isNaN(val) && val <= 15) {
                cell.font = { bold: true, color: { argb: 'FFE74C3C' } };
              }
            }
          });
        });
        
        // Agregar filtro automático
        ws.autoFilter = {
          from: 'A3',
          to: `J${sheetsData[ubicacion].length + 3}`
        };
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `INFORME_GERENCIAL_SAMI_${dateStr.replace(/\//g, "-")}.xlsx`);
    } catch (error) {
      console.error("Error generating Excel report:", error);
      alert("Error al descargar el reporte Excel: " + error.message);
    }
  };

  // Safe include with false-positive sanitization
  const textIncludesTerm = (text, term) => {
    if (!text || !term) return false;
    let cleanText = (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const cleanTerm = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    if (["operativo", "operativa", "operativos", "operativas"].includes(cleanTerm)) {
      cleanText = cleanText
        .replace(/inoperativos/g, "")
        .replace(/inoperativas/g, "")
        .replace(/inoperativo/g, "")
        .replace(/inoperativa/g, "");
    }
    if (["conectado", "conectada", "conectados", "conectadas"].includes(cleanTerm)) {
      cleanText = cleanText
        .replace(/desconectados/g, "")
        .replace(/desconectadas/g, "")
        .replace(/desconectado/g, "")
        .replace(/desconectada/g, "");
    }
    if (["servicio", "servicios", "en servicio", "en servicios"].includes(cleanTerm)) {
      cleanText = cleanText.replace(/sin servicios/g, "").replace(/sin servicio/g, "");
    }

    return cleanText.includes(cleanTerm);
  };

  const norm = (s) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const matchesSerialField = (p, t) => norm(p.id_serie).includes(norm(t));
  const matchesModelField = (p, t) => textIncludesTerm(p.modelo, t);
  const matchesLocationField = (p, t) =>
    textIncludesTerm(p.area_actual, t) || textIncludesTerm(p.ubicacion_entidad, t);
  const matchesObsOrCaseField = (p, t) =>
    textIncludesTerm(p.observaciones, t) || textIncludesTerm(p.codigo_caso_cas, t);

  const matchesConnectionField = (p, t) => {
    const nt = norm(t);
    const ip = norm(p.ip || "");
    const hasIp = ip !== "";
    const isUsb = ip === "usb";
    const isNetIp = hasIp && !isUsb;

    if (["conectado", "conectada", "conectados", "conectadas", "red", "ip"].includes(nt)) return hasIp;
    if (["desconectado", "desconectada", "desconectados", "sin red", "sin ip", "sin conexion"].includes(nt))
      return !hasIp;
    if (nt === "usb") return isUsb;
    if (isNetIp && ip.includes(nt)) return true;
    return false;
  };

  const matchesStatusField = (p, t) => {
    const nt = norm(t);
    const status = getPrinterStatus(p);
    const baseStatus = getBaseStatus(status);
    const ns = norm(baseStatus);
    const operativoKw = [
      "operativo",
      "operativa",
      "operativos",
      "operativas",
      "operando",
      "funcionando",
      "ok",
      "activo",
      "activa"
    ];
    const advertenciaKw = ["advertencia", "advertencias", "alerta", "alertas", "critico", "critica", "criticos", "criticas"];
    const inoperativoKw = [
      "inoperativo",
      "inoperativa",
      "inoperativos",
      "inoperativa",
      "inoperante",
      "inoperantes",
      "falla",
      "fallas",
      "averia",
      "averias",
      "malogrado",
      "malograda",
      "dañada",
      "dañado",
      "mantenimiento",
      "en mantenimiento"
    ];

    if (["sin alertas", "sin alerta"].includes(nt)) {
      return ns === "operativo" && !checkPrinterAlerts(p);
    }
    if (advertenciaKw.includes(nt) || ["con alertas", "con alerta"].includes(nt)) {
      return ns === "operativo" && checkPrinterAlerts(p);
    }
    if (operativoKw.includes(nt)) return ns === "operativo";
    if (inoperativoKw.includes(nt)) return ns === "en mantenimiento";
    return false;
  };

  const matchesServiceField = (p, t) => {
    const nt = norm(t);
    const isEnServicio =
      !(p.area_actual || "").toLowerCase().includes("soporte") &&
      (p.ubicacion_entidad || "Hospital").toUpperCase() !== "MUR";

    if (["servicio", "servicios", "en servicio", "en servicios"].includes(nt)) return isEnServicio;
    if (["sin servicio", "sin servicios"].includes(nt)) return !isEnServicio;
    return false;
  };

  const termMatchesPrinter = (term, p) => {
    const nt = norm(term);

    const serviceKw = ["servicio", "servicios", "en servicio", "en servicios", "sin servicio", "sin servicios"];
    const statusKw = [
      "operativo",
      "operativa",
      "operativos",
      "operativas",
      "operando",
      "funcionando",
      "ok",
      "activo",
      "activa",
      "advertencia",
      "advertencias",
      "alerta",
      "alertas",
      "critico",
      "critica",
      "criticos",
      "criticas",
      "inoperativo",
      "inoperativa",
      "inoperativos",
      "inoperativas",
      "inoperante",
      "inoperantes",
      "falla",
      "fallas",
      "averia",
      "averias",
      "malogrado",
      "malograda",
      "sin alertas",
      "sin alerta",
      "con alertas",
      "con alerta"
    ];
    const connKw = [
      "conectado",
      "conectada",
      "conectados",
      "conectadas",
      "desconectado",
      "desconectada",
      "desconectados",
      "sin red",
      "sin ip",
      "sin conexion",
      "usb",
      "red",
      "ip"
    ];

    if (serviceKw.includes(nt)) return matchesServiceField(p, term);
    if (statusKw.includes(nt)) return matchesStatusField(p, term);
    if (connKw.includes(nt)) return matchesConnectionField(p, term);

    return (
      matchesSerialField(p, term) ||
      matchesModelField(p, term) ||
      matchesLocationField(p, term) ||
      matchesObsOrCaseField(p, term) ||
      matchesConnectionField(p, term) ||
      matchesStatusField(p, term) ||
      matchesServiceField(p, term)
    );
  };

  const filteredPrinters = printers
    .filter((p) => {
      const status = getPrinterStatus(p);
      const baseStatus = getBaseStatus(status);
      if (filterCriticidad !== "all") {
        if (filterCriticidad === "En Servicio") {
          if (baseStatus !== "Operativo" || (p.area_actual || "").toLowerCase().includes("soporte") || (p.ubicacion_entidad || "Hospital") !== "Hospital") return false;
        } else if (filterCriticidad === "Advertencia") {
          if (baseStatus !== "Operativo" || !checkPrinterAlerts(p)) return false;
        } else if (baseStatus !== filterCriticidad) {
          return false;
        }
      }

      const raw = searchText.trim();
      if (!raw) return true;

      // Special hidden command for filtering low stock from replenishment view
      if (raw.toLowerCase().startsWith("low:")) {
        const parts = raw.split(":");
        if (parts.length >= 3) {
          const type = parts[1].toLowerCase();
          const model = parts.slice(2).join(":").toUpperCase();
          
          if (p.modelo !== model) return false;
          
          if (type === "toner") return p.consumibles?.toner_nivel !== undefined && p.consumibles.toner_nivel !== null && p.consumibles.toner_nivel <= 15;
          if (type === "maint") return p.consumibles?.mantenimiento_kit_nivel !== undefined && p.consumibles.mantenimiento_kit_nivel !== null && p.consumibles.mantenimiento_kit_nivel <= 15;
          if (type === "unit") return p.consumibles?.unidad_imagen_nivel !== undefined && p.consumibles.unidad_imagen_nivel !== null && p.consumibles.unidad_imagen_nivel <= 15;
        }
      }

      const groups = raw
        .split(/\s*&\s*/i)
        .map((s) => s.trim())
        .filter(Boolean);

      const positiveGroups = groups.filter((g) => !g.startsWith("!"));
      const negativeGroups = groups
        .filter((g) => g.startsWith("!"))
        .map((g) => g.slice(1).trim())
        .filter(Boolean);

      if (negativeGroups.some((neg) => termMatchesPrinter(neg, p))) return false;

      if (positiveGroups.length === 0) return true;

      const SERVICE_KW = ["servicio", "servicios", "en servicio", "en servicios", "sin servicio", "sin servicios"];
      const STATUS_KW = [
        "operativo",
        "operativa",
        "operativos",
        "operativas",
        "operando",
        "funcionando",
        "ok",
        "activo",
        "activa",
        "advertencia",
        "advertencias",
        "alerta",
        "alertas",
        "critico",
        "critica",
        "criticos",
        "criticas",
        "inoperativo",
        "inoperativa",
        "inoperativos",
        "inoperativas",
        "inoperante",
        "inoperantes",
        "falla",
        "fallas",
        "averia",
        "averias",
        "malogrado",
        "malograda",
        "sin alertas",
        "sin alerta",
        "con alertas",
        "con alerta"
      ];
      const CONN_KW = [
        "conectado",
        "conectada",
        "conectados",
        "conectadas",
        "desconectado",
        "desconectada",
        "desconectados",
        "sin red",
        "sin ip",
        "sin conexion",
        "usb",
        "red",
        "ip"
      ];

      const categorized = { status: [], connection: [], service: [], location: [], generic: [] };

      positiveGroups.forEach((term) => {
        const nt = norm(term);
        if (SERVICE_KW.includes(nt)) categorized.service.push(term);
        else if (STATUS_KW.includes(nt)) categorized.status.push(term);
        else if (CONN_KW.includes(nt)) categorized.connection.push(term);
        else if (printers.some((q) => matchesLocationField(q, term))) categorized.location.push(term);
        else categorized.generic.push(term);
      });

      for (const terms of Object.values(categorized)) {
        if (terms.length === 0) continue;
        if (!terms.some((term) => termMatchesPrinter(term, p))) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const statusA = getPrinterStatus(a);
      const statusB = getPrinterStatus(b);
      if (statusA === "En Mantenimiento" && statusB !== "En Mantenimiento") return 1;
      if (statusA !== "En Mantenimiento" && statusB === "En Mantenimiento") return -1;
      return (
        (a.area_actual || "").localeCompare(b.area_actual || "", "es", { sensitivity: "base" }) ||
        (a.id_serie || "").localeCompare(b.id_serie || "")
      );
    });

  // KPIs
  const kpiTotal = printers.length;
  const kpiOperativas = printers.filter((p) => getBaseStatus(getPrinterStatus(p)) === "Operativo").length;
  const kpiAdvertencias = printers.filter((p) => getBaseStatus(getPrinterStatus(p)) === "Operativo" && checkPrinterAlerts(p)).length;
  const kpiInoperativas = printers.filter((p) => getBaseStatus(getPrinterStatus(p)) === "En Mantenimiento").length;

  const isInSoporte = (p) => (p.area_actual || "").toLowerCase().includes("soporte");
  const kpiHospitalTotal = printers.filter((p) => (p.ubicacion_entidad || "Hospital") === "Hospital").length;
  const kpiHospitalEnServicio = printers.filter(
    (p) =>
      (p.ubicacion_entidad || "Hospital") === "Hospital" &&
      !isInSoporte(p) &&
      getBaseStatus(getPrinterStatus(p)) !== "En Mantenimiento"
  ).length;
  const kpiHospitalEnSoporte = printers.filter(
    (p) => (p.ubicacion_entidad || "Hospital") === "Hospital" && isInSoporte(p)
  ).length;
  const kpiMurTotal = printers.filter((p) => p.ubicacion_entidad === "MUR").length;
  const kpiLexmarkTotal = printers.filter((p) => p.ubicacion_entidad === "Lexmark").length;

  const totalPages = Math.ceil(filteredPrinters.length / pageSize) || 1;
  const paginatedPrinters = filteredPrinters.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleDownloadPDF = async () => {
    try {
      const module = await import("../../utils/pdfGenerator");
      module.generatePDFReport(printers, checkPrinterAlerts, isPrinterInoperative);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Hubo un error al generar el PDF: " + err.message);
    }
  };

  return {
    printers,
    setPrinters,
    loadingPrinters,
    setLoadingPrinters,
    searchText,
    setSearchText,
    editingRowId,
    setEditingRowId,
    editingRowData,
    setEditingRowData,
    copiedSerialId,
    handleCopySerial,
    isModalOpen,
    selectedPrinter,
    selectedPrinterHistory,
    editIdSerie,
    setEditIdSerie,
    editModelo,
    setEditModelo,
    editArea,
    setEditArea,
    editToner,
    setEditToner,
    editUnit,
    setEditUnit,
    editMantenimiento,
    setEditMantenimiento,
    editObservaciones,
    setEditObservaciones,
    editCasCode,
    setEditCasCode,
    editDetalleCaso,
    setEditDetalleCaso,
    editUbicacion,
    setEditUbicacion,
    editFuncionamiento,
    setEditFuncionamiento,
    editIp,
    setEditIp,
    editGarantia,
    setEditGarantia,
    editEstadisticas,
    setEditEstadisticas,
    editFuncionamientoAuto,
    setEditFuncionamientoAuto,
    savingEdit,
    isCreateMode,
    checkPrinterAlerts,
    calculatePrinterStatus,
    getPrinterStatus,
    isPrinterInoperative,
    handleOpenEditModal,
    handleOpenCreateModal,
    handleCloseEditModal,
    handleSavePrinterChanges,
    handleRowDataChange,
    handleRowNestedDataChange,
    handleStartRowEdit,
    handleSaveRowEdit,
    handleRowKeyDown,
    handleDeletePrinter,
    handleDeleteHistoryItem,
    handleDownloadReport,
    filteredPrinters,
    kpiTotal,
    kpiOperativas,
    kpiAdvertencias,
    kpiInoperativas,
    kpiHospitalTotal,
    kpiHospitalEnServicio,
    kpiHospitalEnSoporte,
    kpiMurTotal,
    kpiLexmarkTotal,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedPrinters
  };
}
