import { useState, useEffect } from "react";
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

export function checkPrinterAlerts(p) {
  if (!p) return false;
  
  if (p.estado_funcionamiento_manual === true && p.estado_funcionamiento === "Advertencia") {
    return true;
  }
  
  if (p.estado_funcionamiento_manual === true && (p.estado_funcionamiento === "Inoperativo" || p.estado_funcionamiento === "En Mantenimiento")) {
    return false;
  }
  
  const area = p.area_actual || "";
  const toner = p.consumibles?.toner_nivel ?? 100;
  const unit = p.consumibles?.unidad_imagen_nivel ?? 100;
  const maintenance = p.consumibles?.mantenimiento_kit_nivel ?? 100;
  const observaciones = p.observaciones || "";
  const ubicacion = p.ubicacion_entidad || "Hospital";

  const cleanArea = area.toLowerCase().trim();
  const cleanObs = observaciones.toLowerCase().trim();
  const cleanUbicacion = ubicacion.toLowerCase().trim();
  
  const isNonServiceArea = cleanArea.includes("soporte") || 
                           cleanArea.includes("mur") || 
                           cleanUbicacion.includes("mur");
  
  const tonerVal = Number(toner);
  const unitVal = Number(unit);
  const maintVal = Number(maintenance);

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

  const hasWarningObs = cleanObs.includes("traba") ||
                        cleanObs.includes("atasco") ||
                        cleanObs.includes("mantenimiento") ||
                        cleanObs.includes("limpieza") ||
                        cleanObs.includes("detalles");

  const levelIsLow = tonerVal <= 15 || unitVal <= 15 || maintVal <= 15;

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterCriticidad]);

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
    } else {
      setSelectedPrinterHistory([]);
    }
    return () => {
      if (unsubscribeSelectedHistory) unsubscribeSelectedHistory();
    };
  }, [db, selectedPrinter]);

  const calculatePrinterStatus = (area, toner, unit, maintenance, observaciones, ubicacion = "Hospital") => {
    const cleanArea = (area || "").toLowerCase().trim();
    const cleanObs = (observaciones || "").toLowerCase().trim();
    const cleanUbicacion = (ubicacion || "").toLowerCase().trim();
    
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
    const toner = p.consumibles?.toner_nivel ?? 100;
    const unit = p.consumibles?.unidad_imagen_nivel ?? 100;
    const maint = p.consumibles?.mantenimiento_kit_nivel ?? 100;
    const status = calculatePrinterStatus(p.area_actual, toner, unit, maint, p.observaciones, p.ubicacion_entidad);
    if (status === "Advertencia") {
      return "Operativo";
    }
    if (status === "Inoperativo") {
      return "En Mantenimiento";
    }
    return status;
  };

  const isPrinterInoperative = (p) => {
    return getPrinterStatus(p) === "En Mantenimiento";
  };

  // Reactively calculate functioning status when form inputs change if auto-calculate is enabled
  useEffect(() => {
    if (editFuncionamientoAuto) {
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
  }, [editArea, editToner, editUnit, editMantenimiento, editObservaciones, editUbicacion, editFuncionamientoAuto]);

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
    setEditFuncionamiento("Operativo");
    setEditFuncionamientoAuto(true);
    setSelectedPrinterHistory([]);
    setIsModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsModalOpen(false);
    setSelectedPrinter(null);
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
          prediccion: prediction
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
            prediccion: prediction
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
            prediccion: prediction
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

  const handleDownloadReport = () => {
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yy = String(today.getFullYear()).slice(-2);
      const dateStr = `${dd}/${mm}/${yy}`;

      const areaHeader = `AREA ACTUAL ${dateStr}`;

      const sortedPrinters = [...printers].sort((a, b) => {
        const aInop = isPrinterInoperative(a);
        const bInop = isPrinterInoperative(b);

        if (aInop && !bInop) return 1;
        if (!aInop && bInop) return -1;

        const areaA = (a.area_actual || "").trim();
        const areaB = (b.area_actual || "").trim();
        return areaA.localeCompare(areaB, "es", { sensitivity: "base" });
      });

      const reportRows = sortedPrinters.map((p, idx) => ({
        "N°": idx + 1,
        "IMPRESORA/MODELO": p.modelo || "MX431ADN",
        [areaHeader]: p.area_actual || "Soporte",
        SERIE: p.id_serie,
        OBS: p.observaciones || "",
        CASO: p.codigo_caso_cas || ""
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportRows);

      const colWidths = [
        { wch: 6 }, // N°
        { wch: 20 }, // IMPRESORA / MODELO
        { wch: 35 }, // AREA ACTUAL
        { wch: 18 }, // SERIE
        { wch: 55 }, // OBS
        { wch: 25 } // CASO
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "TI HNCH");
      XLSX.writeFile(wb, `IMPRESORAS_ALQUILADAS_${dateStr.replace(/\//g, "-")}.xlsx`);
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
    const ns = norm(status);
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
      if (filterCriticidad !== "all") {
        if (filterCriticidad === "Advertencia") {
          if (status !== "Operativo" || !checkPrinterAlerts(p)) return false;
        } else if (status !== filterCriticidad) {
          return false;
        }
      }

      const raw = searchText.trim();
      if (!raw) return true;

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
  const kpiOperativas = printers.filter((p) => getPrinterStatus(p) === "Operativo").length;
  const kpiAdvertencias = printers.filter((p) => getPrinterStatus(p) === "Operativo" && checkPrinterAlerts(p)).length;
  const kpiInoperativas = printers.filter((p) => getPrinterStatus(p) === "En Mantenimiento").length;

  const isInSoporte = (p) => (p.area_actual || "").toLowerCase().includes("soporte");
  const kpiHospitalTotal = printers.filter((p) => (p.ubicacion_entidad || "Hospital") === "Hospital").length;
  const kpiHospitalEnServicio = printers.filter(
    (p) =>
      (p.ubicacion_entidad || "Hospital") === "Hospital" &&
      !isInSoporte(p) &&
      getPrinterStatus(p) !== "En Mantenimiento"
  ).length;
  const kpiHospitalEnSoporte = printers.filter(
    (p) => (p.ubicacion_entidad || "Hospital") === "Hospital" && isInSoporte(p)
  ).length;
  const kpiMurTotal = printers.filter((p) => p.ubicacion_entidad === "MUR").length;

  const totalPages = Math.ceil(filteredPrinters.length / pageSize) || 1;
  const paginatedPrinters = filteredPrinters.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedPrinters
  };
}
