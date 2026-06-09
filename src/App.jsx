import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDocs,
  orderBy,
  query,
  setDoc,
  deleteDoc,
  limit
} from "firebase/firestore";
import { db } from "./firebase";
import { seedPrintersIfEmpty, seedRepuestosIfEmpty } from "./services/SeedService";
import { calcularFechasPredictivas } from "./services/PredictionService";
import { analizarEvidenciaSuministros, analizarImportacionExcel } from "./services/GeminiService";
import * as XLSX from "xlsx";

export default function App() {
  // Navigation & UI tabs
  const [currentTab, setCurrentTab] = useState("dashboard"); // dashboard, inventario, chat, historial, settings

  // Printers Firestore State
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(true);

  // Repuestos (Spare parts) Stock State
  const [repuestos, setRepuestos] = useState([]);

  // Search & Filter State
  const [searchText, setSearchText] = useState("");
  const [filterCriticidad, setFilterCriticidad] = useState("all");

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [editArea, setEditArea] = useState("");
  const [editToner, setEditToner] = useState(100);
  const [editUnit, setEditUnit] = useState(100);
  const [editMantenimiento, setEditMantenimiento] = useState(100);

  const [editObservaciones, setEditObservaciones] = useState("");
  const [editCasCode, setEditCasCode] = useState("");
  const [editUbicacion, setEditUbicacion] = useState("Hospital");
  const [editFuncionamiento, setEditFuncionamiento] = useState("Operativo");
  const [editFuncionamientoAuto, setEditFuncionamientoAuto] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingStock, setSavingStock] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editIdSerie, setEditIdSerie] = useState("");
  const [editModelo, setEditModelo] = useState("MX431ADN");

  // Selected Printer History
  const [selectedPrinterHistory, setSelectedPrinterHistory] = useState([]);

  // General History Log state (assembled from recent updates)
  const [generalHistory, setGeneralHistory] = useState([]);

  // Gemini AI Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: "¡Hola! Soy SAMI-Lexmark AI. Puedes enviarme un reporte de texto o subir una foto del panel de control de una impresora (mostrando los niveles de tóner o unidad de imagen) y actualizaré la base de datos de Firestore automáticamente.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatImage, setChatImage] = useState(null); // { base64, mimeType, preview }
  const [isChatLoading, setIsChatLoading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Excel Import State
  const [excelData, setExcelData] = useState(null); // { equipos_normalizados, reporte_resumen }
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const excelFileInputRef = useRef(null);

  // Stock Subtraction Modal State
  const [stockModal, setStockModal] = useState({
    isOpen: false,
    modelo: "",
    field: "",
    insumo: "",
    origin: "",
    currentValue: 0
  });
  const [stockTargetPrinterId, setStockTargetPrinterId] = useState("");

  // Gemini API Key config
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem("sami_gemini_api_key") || "");
  const [showSettingsSaved, setShowSettingsSaved] = useState(false);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Seeding and Firestore Sync
  useEffect(() => {
    let unsubscribePrinters = null;
    let unsubscribeRepuestos = null;
    let unsubscribeHistory = null;

    const initApp = async () => {
      try {
        await seedPrintersIfEmpty(db);
        await seedRepuestosIfEmpty(db);
      } catch (err) {
        console.error("Error in seed initialization:", err);
      }

      // Setup Realtime Sync for Printers
      const printersColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "impresoras");
      unsubscribePrinters = onSnapshot(printersColRef, (snapshot) => {
        const printerList = [];
        snapshot.forEach((doc) => {
          printerList.push({
            id_serie: doc.id,
            ...doc.data()
          });
        });
        setPrinters(printerList);
        setLoadingPrinters(false);
      }, (error) => {
        console.error("Firestore onSnapshot error:", error);
        setLoadingPrinters(false);
      });

      // Setup Realtime Sync for Repuestos
      const repuestosColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "repuestos");
      unsubscribeRepuestos = onSnapshot(repuestosColRef, (snapshot) => {
        const repuestosList = [];
        snapshot.forEach((doc) => {
          repuestosList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setRepuestos(repuestosList);
      }, (error) => {
        console.error("Firestore repuestos onSnapshot error:", error);
      });

      // Setup Realtime Sync for General History Audit Logs
      const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
      const qHistory = query(generalHistoryColRef, orderBy("timestamp", "desc"), limit(50));
      unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
        const historyList = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp ? new Date(data.timestamp) : new Date());
          historyList.push({
            id: doc.id,
            ...data,
            timestamp
          });
        });
        setGeneralHistory(historyList);
      }, (error) => {
        console.error("Firestore general history onSnapshot error:", error);
      });
    };

    initApp();

    return () => {
      if (unsubscribePrinters) unsubscribePrinters();
      if (unsubscribeRepuestos) unsubscribeRepuestos();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, []);

  // Fetch history for selected printer when modal opens
  useEffect(() => {
    if (selectedPrinter) {
      const fetchHistory = async () => {
        try {
          const historyColRef = collection(
            db,
            "artifacts",
            "sami-lexmark",
            "public",
            "data",
            "impresoras",
            selectedPrinter.id_serie,
            "historial_lecturas"
          );
          const q = query(historyColRef, orderBy("fecha_lectura", "desc"));
          const snapshot = await getDocs(q);
          const historyList = [];
          snapshot.forEach((doc) => {
            historyList.push({
              id: doc.id,
              ...doc.data()
            });
          });
          setSelectedPrinterHistory(historyList);
        } catch (e) {
          console.error("Error fetching printer history:", e);
        }
      };
      fetchHistory();
    }
  }, [selectedPrinter]);

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
      return "Inoperativo";
    }

    const hasWarningObs = cleanObs.includes("traba") ||
                          cleanObs.includes("atasco") ||
                          cleanObs.includes("mantenimiento") ||
                          cleanObs.includes("limpieza") ||
                          cleanObs.includes("detalles");

    const levelIsLow = tonerVal <= 15 || unitVal <= 15 || maintVal <= 15;

    // In an active service area, a critical fault or 0% level becomes a warning (Advertencia)
    // because the printer is still assigned and in service.
    if (levelIsLow || hasWarningObs || hasSeriousObs || levelIsZero) {
      return "Advertencia";
    }

    return "Operativo";
  };

  // Helper to get unified printer status (safe check with fallback)
  const getPrinterStatus = (p) => {
    if (p.estado_funcionamiento_manual === true) {
      return p.estado_funcionamiento || "Operativo";
    }
    const toner = p.consumibles?.toner_nivel ?? 100;
    const unit = p.consumibles?.unidad_imagen_nivel ?? 100;
    const maint = p.consumibles?.mantenimiento_kit_nivel ?? 100;
    return calculatePrinterStatus(p.area_actual, toner, unit, maint, p.observaciones, p.ubicacion_entidad);
  };

  // Helper to check if a printer is inoperative (safe check with fallback)
  const isPrinterInoperative = (p) => {
    return getPrinterStatus(p) === "Inoperativo";
  };

  // Reactively calculate functioning status when form inputs change if auto-calculate is enabled
  useEffect(() => {
    if (editFuncionamientoAuto) {
      const computed = calculatePrinterStatus(editArea, Number(editToner), Number(editUnit), Number(editMantenimiento), editObservaciones, editUbicacion);
      setEditFuncionamiento(computed);
    }
  }, [editArea, editToner, editUnit, editMantenimiento, editObservaciones, editUbicacion, editFuncionamientoAuto]);

  // Compute KPI values based on unified status
  const kpiTotal = printers.length;
  const kpiOperativas = printers.filter(p => getPrinterStatus(p) === "Operativo").length;
  const kpiAdvertencias = printers.filter(p => getPrinterStatus(p) === "Advertencia").length;
  const kpiInoperativas = printers.filter(p => getPrinterStatus(p) === "Inoperativo").length;

  // Physical Location & Service breakdowns
  const kpiHospitalTotal = printers.filter(p => (p.ubicacion_entidad || "Hospital") === "Hospital").length;
  const kpiHospitalEnServicio = printers.filter(p => 
    (p.ubicacion_entidad || "Hospital") === "Hospital" && 
    p.area_actual !== "Soporte" && 
    getPrinterStatus(p) !== "Inoperativo"
  ).length;
  const kpiHospitalEnSoporte = printers.filter(p => (p.ubicacion_entidad || "Hospital") === "Hospital" && p.area_actual === "Soporte").length;
  const kpiMurTotal = printers.filter(p => p.ubicacion_entidad === "MUR").length;

  // Save Settings API Key
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem("sami_gemini_api_key", apiKeyInput);
    setShowSettingsSaved(true);
    setTimeout(() => setShowSettingsSaved(false), 3000);
  };

  // Open Edit Modal with Pre-populated data
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
    setEditUbicacion(printer.ubicacion_entidad || "Hospital");

    // Initialize functioning status and check if it matches auto-calculation
    const storedStatus = printer.estado_funcionamiento || getPrinterStatus(printer);
    const calculated = calculatePrinterStatus(printer.area_actual || "", tonerVal, unitVal, maintVal, obsVal, printer.ubicacion_entidad || "Hospital");
    setEditFuncionamiento(storedStatus);
    setEditFuncionamientoAuto(storedStatus === calculated);

    setIsModalOpen(true);
  };

  // Open Create Modal with default values
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
    setEditUbicacion("Hospital");
    setEditFuncionamiento("Operativo");
    setEditFuncionamientoAuto(true);
    setSelectedPrinterHistory([]);
    setIsModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsModalOpen(false);
    setSelectedPrinter(null);
  };


  // Submit Edit or Create Modal Changes to Firestore
  const handleSavePrinterChanges = async (e) => {
    e.preventDefault();

    const cleanId = editIdSerie.trim().toUpperCase();
    if (!cleanId) {
      alert("Por favor, ingrese un número de serie.");
      return;
    }

    setSavingEdit(true);
    try {
      const computedFuncionamiento = editFuncionamientoAuto
        ? calculatePrinterStatus(editArea, Number(editToner), Number(editUnit), Number(editMantenimiento), editObservaciones, editUbicacion)
        : editFuncionamiento;
      const prediction = calcularFechasPredictivas(Number(editToner), Number(editUnit), Number(editMantenimiento));

      const docRef = doc(
        db,
        "artifacts",
        "sami-lexmark",
        "public",
        "data",
        "impresoras",
        cleanId
      );

      if (isCreateMode) {
        // Check for duplicates
        const exists = printers.some(p => p.id_serie.toUpperCase() === cleanId);
        if (exists) {
          alert(`El número de serie ${cleanId} ya está registrado en el inventario.`);
          setSavingEdit(false);
          return;
        }

        const printerDoc = {
          modelo: editModelo,
          area_actual: editArea,
          codigo_caso_cas: editCasCode,
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

        await setDoc(docRef, printerDoc);

        // Save to History subcollection
        const historyColRef = collection(docRef, "historial_lecturas");
        await addDoc(historyColRef, {
          toner_nivel: Number(editToner),
          unidad_imagen_nivel: Number(editUnit),
          mantenimiento_kit_nivel: Number(editMantenimiento),
          estado_funcionamiento: computedFuncionamiento,
          estado_funcionamiento_manual: !editFuncionamientoAuto,
          observaciones: printerDoc.observaciones,
          codigo_caso_cas: editCasCode,
          ubicacion_entidad: editUbicacion,
          area_actual: editArea,
          fecha_lectura: new Date(),
          tipo_actualizacion: "Manual (Creado)"
        });

      } else {
        // Edit mode
        if (!selectedPrinter) return;

        const updateData = {
          modelo: editModelo,
          area_actual: editArea,
          codigo_caso_cas: editCasCode,
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

        await updateDoc(docRef, updateData);

        // Save to History subcollection
        const historyColRef = collection(docRef, "historial_lecturas");
        await addDoc(historyColRef, {
          toner_nivel: Number(editToner),
          unidad_imagen_nivel: Number(editUnit),
          mantenimiento_kit_nivel: Number(editMantenimiento),
          estado_funcionamiento: computedFuncionamiento,
          estado_funcionamiento_manual: !editFuncionamientoAuto,
          observaciones: editObservaciones,
          codigo_caso_cas: editCasCode,
          ubicacion_entidad: editUbicacion,
          area_actual: editArea,
          fecha_lectura: new Date(),
          tipo_actualizacion: "Manual"
        });
      }

      // Save to General History
      const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
      await addDoc(generalHistoryColRef, {
        tipo: "impresora",
        id_serie: cleanId,
        modelo: editModelo,
        area_actual: editArea,
        toner_nivel: Number(editToner),
        unidad_imagen_nivel: Number(editUnit),
        mantenimiento_kit_nivel: Number(editMantenimiento),
        estado_funcionamiento: computedFuncionamiento,
        observaciones: editObservaciones || "",
        codigo_caso_cas: editCasCode,
        tipo_actualizacion: isCreateMode ? "Manual (Creado)" : "Manual",
        timestamp: new Date()
      });

      handleCloseEditModal();
    } catch (error) {
      console.error("Error saving printer updates:", error);
      alert("Error al guardar cambios: " + error.message);
    } finally {
      setSavingEdit(false);
    }
  };
  
  // Delete printer manually
  const handleDeletePrinter = async () => {
    if (!selectedPrinter) return;

    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la impresora ${selectedPrinter.modelo} (S/N: ${selectedPrinter.id_serie})? Esta acción no se puede deshacer y eliminará permanentemente el equipo.`
    );
    if (!confirmDelete) return;

    setSavingEdit(true);
    try {
      const docRef = doc(
        db,
        "artifacts",
        "sami-lexmark",
        "public",
        "data",
        "impresoras",
        selectedPrinter.id_serie
      );
      await deleteDoc(docRef);

      alert("Impresora eliminada exitosamente.");
      handleCloseEditModal();
    } catch (error) {
      console.error("Error deleting printer:", error);
      alert("Error al eliminar la impresora: " + error.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete a specific history log entry
  const handleDeleteHistoryItem = async (historyId) => {
    if (!selectedPrinter) return;

    const confirmDelete = window.confirm(
      "¿Estás seguro de que deseas eliminar este registro del historial de lecturas?"
    );
    if (!confirmDelete) return;

    try {
      const docRef = doc(
        db,
        "artifacts",
        "sami-lexmark",
        "public",
        "data",
        "impresoras",
        selectedPrinter.id_serie,
        "historial_lecturas",
        historyId
      );
      await deleteDoc(docRef);

      // Remove from local state
      setSelectedPrinterHistory(prev => prev.filter(h => h.id !== historyId));
      alert("Registro de historial eliminado exitosamente.");
    } catch (error) {
      console.error("Error deleting history entry:", error);
      alert("Error al eliminar el registro de historial: " + error.message);
    }
  };

  // Generate and download Excel report matching the project's original structure
  const handleDownloadReport = () => {
    try {
      // 1. Format today's date as DD/MM/YY
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yy = String(today.getFullYear()).slice(-2);
      const dateStr = `${dd}/${mm}/${yy}`;

      const areaHeader = `AREA ACTUAL ${dateStr}`;

      // Helper to check if a printer is inoperative
      const isInoperative = (p) => {
        return isPrinterInoperative(p);
      };

      // 2. Sort printers: operative first by area, then inoperative by area
      const sortedPrinters = [...printers].sort((a, b) => {
        const aInop = isInoperative(a);
        const bInop = isInoperative(b);

        if (aInop && !bInop) return 1;
        if (!aInop && bInop) return -1;

        const areaA = (a.area_actual || "").trim();
        const areaB = (b.area_actual || "").trim();
        return areaA.localeCompare(areaB, 'es', { sensitivity: 'base' });
      });

      // 3. Map printers to row structures (exactly matching the 6 original columns of TI HNCH)
      const reportRows = sortedPrinters.map((p, idx) => ({
        "N°": idx + 1,
        "IMPRESORA/MODELO": p.modelo || "MX431ADN",
        [areaHeader]: p.area_actual || "Soporte",
        "SERIE": p.id_serie,
        "OBS": p.observaciones || "",
        "CASO": p.codigo_caso_cas || ""
      }));

      // 4. Create Workbook with a single sheet
      const wb = XLSX.utils.book_new();

      // Convert rows to sheet (TI HNCH format starts directly with headers at A1)
      const ws = XLSX.utils.json_to_sheet(reportRows);

      // Define default column widths for clean visual styling
      const colWidths = [
        { wch: 6 },   // N°
        { wch: 20 },  // IMPRESORA / MODELO
        { wch: 35 },  // AREA ACTUAL
        { wch: 18 },  // SERIE
        { wch: 55 },  // OBS
        { wch: 25 }   // CASO
      ];
      ws["!cols"] = colWidths;

      // Append to workbook
      XLSX.utils.book_append_sheet(wb, ws, "TI HNCH");

      // 5. Write and save file
      XLSX.writeFile(wb, `IMPRESORAS_ALQUILADAS_${dateStr.replace(/\//g, "-")}.xlsx`);
    } catch (error) {
      console.error("Error generating Excel report:", error);
      alert("Error al descargar el reporte Excel: " + error.message);
    }
  };

  // Update spare parts stock manually
  const updateManualStock = async (modelo, field, newValue) => {
    if (newValue < 0) return;
    try {
      const matchedStock = repuestos.find(r => r.id === modelo);
      const prevValue = matchedStock ? (matchedStock[field] ?? 0) : 0;

      const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "repuestos", modelo);
      await updateDoc(docRef, {
        [field]: Number(newValue)
      });

      let insumo = "Tóner";
      if (field.startsWith("unidad")) {
        insumo = "Unidad de Imagen";
      } else if (field.startsWith("mantenimiento")) {
        insumo = "Kit de Mantenimiento";
      }

      let origin = "Hospital";
      if (field.endsWith("deposito")) {
        origin = "Depósito";
      }

      const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
      await addDoc(generalHistoryColRef, {
        tipo: "stock",
        modelo,
        insumo,
        origen: origin,
        cantidad_anterior: Number(prevValue),
        cantidad_nueva: Number(newValue),
        tipo_actualizacion: "Ajuste Manual (+)",
        observaciones: `Se incrementó el stock de ${insumo} (${origin}) para modelo ${modelo}.`,
        timestamp: new Date()
      });
    } catch (e) {
      console.error("Error updating manual stock:", e);
    }
  };

  // Handle click on stock decrement (-) button to trigger printer selection flow
  const handleDecrementStockClick = (modelo, field, currentValue) => {
    if (currentValue <= 0) return;

    let insumo = "Tóner";
    if (field.startsWith("unidad")) {
      insumo = "Unidad de Imagen";
    } else if (field.startsWith("mantenimiento")) {
      insumo = "Kit de Mantenimiento";
    }

    let origin = "Hospital";
    if (field.endsWith("deposito")) {
      origin = "Depósito";
    }

    setStockModal({
      isOpen: true,
      modelo,
      field,
      insumo,
      origin,
      currentValue
    });
    setStockTargetPrinterId(""); // reset selected printer
  };

  // Confirm stock reduction and optionally update target printer consumable capacity to 100%
  const handleConfirmStockReduction = async () => {
    if (savingStock) return;
    const { modelo, field, currentValue, insumo, origin } = stockModal;
    const newValue = currentValue - 1;

    setSavingStock(true);
    try {
      // 1. Decrement Stock count in Firestore
      const stockDocRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "repuestos", modelo);
      await updateDoc(stockDocRef, {
        [field]: newValue
      });

      // 2. If a printer was selected, update its consumable to 100% and save to history
      if (stockTargetPrinterId && stockTargetPrinterId !== "none") {
        const printer = printers.find(p => p.id_serie === stockTargetPrinterId);
        if (printer) {
          const printerDocRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", printer.id_serie);

          let tonerVal = printer.consumibles?.toner_nivel ?? 100;
          let unitVal = printer.consumibles?.unidad_imagen_nivel ?? 100;
          let maintVal = printer.consumibles?.mantenimiento_kit_nivel ?? 100;

          if (field.startsWith("toner")) {
            tonerVal = 100;
          } else if (field.startsWith("unidad")) {
            unitVal = 100;
          } else if (field.startsWith("mantenimiento")) {
            maintVal = 100;
          }

          const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);
          const computedFuncionamiento = calculatePrinterStatus(printer.area_actual, tonerVal, unitVal, maintVal, printer.observaciones, printer.ubicacion_entidad);

          const updateData = {
            "consumibles.toner_nivel": tonerVal,
            "consumibles.unidad_imagen_nivel": unitVal,
            "consumibles.mantenimiento_kit_nivel": maintVal,
            "consumibles.ultima_lectura": new Date(),
            estado_funcionamiento: computedFuncionamiento,
            prediccion: prediction
          };

          await updateDoc(printerDocRef, updateData);

          const historyColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", printer.id_serie, "historial_lecturas");
          await addDoc(historyColRef, {
            toner_nivel: tonerVal,
            unidad_imagen_nivel: unitVal,
            mantenimiento_kit_nivel: maintVal,
            estado_funcionamiento: computedFuncionamiento,
            observaciones: `Reemplazo e instalación de ${insumo} nuevo desde stock ${origin}.`,
            codigo_caso_cas: printer.codigo_caso_cas || "",
            ubicacion_entidad: printer.ubicacion_entidad || "Hospital",
            area_actual: printer.area_actual || "Soporte",
            fecha_lectura: new Date(),
            tipo_actualizacion: "Reemplazo de Repuesto"
          });

          // Save to General History (Printer Update)
          const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
          await addDoc(generalHistoryColRef, {
            tipo: "impresora",
            id_serie: printer.id_serie,
            modelo: printer.modelo,
            area_actual: printer.area_actual || "Soporte",
            toner_nivel: tonerVal,
            unidad_imagen_nivel: unitVal,
            mantenimiento_kit_nivel: maintVal,
            estado_funcionamiento: computedFuncionamiento,
            observaciones: `Reemplazo e instalación de ${insumo} nuevo desde stock ${origin}.`,
            codigo_caso_cas: printer.codigo_caso_cas || "",
            tipo_actualizacion: "Reemplazo de Repuesto",
            timestamp: new Date()
          });
        }
      }

      // Save to General History (Stock reduction event)
      const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
      await addDoc(generalHistoryColRef, {
        tipo: "stock",
        modelo,
        insumo,
        origen: origin,
        cantidad_anterior: Number(currentValue),
        cantidad_nueva: Number(newValue),
        tipo_actualizacion: "Consumo de Repuesto",
        observaciones: stockTargetPrinterId && stockTargetPrinterId !== "none"
          ? `Se descontó 1 unidad de ${insumo} (${origin}) para instalar en impresora S/N: ${stockTargetPrinterId}.`
          : `Se descontó 1 unidad de ${insumo} (${origin}) sin impresora asociada.`,
        timestamp: new Date()
      });

      alert("Inventario de repuestos y estado del equipo actualizados correctamente.");
    } catch (e) {
      console.error("Error processing stock reduction:", e);
      alert("Error al procesar el descuento de stock: " + e.message);
    } finally {
      setStockModal({
        isOpen: false,
        modelo: "",
        field: "",
        insumo: "",
        origin: "",
        currentValue: 0
      });
      setStockTargetPrinterId("");
      setSavingStock(false);
    }
  };


  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFileName(file.name);
    setIsExcelLoading(true);
    setIsExcelImportModalOpen(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: "binary" });

          const allParsedRows = [];

          wb.SheetNames.forEach(sheetName => {
            const ws = wb.Sheets[sheetName];
            const rawArrays = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (rawArrays.length === 0) return;

            // Find the header row dynamically
            let headerRowIndex = -1;
            const serialKeywords = ["serie", "s/n", "sn", "id_serie", "número de serie", "numero de serie", "serial", "nro", "cod"];

            for (let i = 0; i < Math.min(10, rawArrays.length); i++) {
              const row = rawArrays[i];
              if (Array.isArray(row)) {
                const hasSerialKey = row.some(cell => {
                  if (cell === undefined || cell === null) return false;
                  const cClean = String(cell).toLowerCase().trim();
                  return serialKeywords.some(keyword => cClean.includes(keyword));
                });
                if (hasSerialKey) {
                  headerRowIndex = i;
                  break;
                }
              }
            }

            if (headerRowIndex === -1) {
              headerRowIndex = 0;
            }

            const headers = rawArrays[headerRowIndex] || [];

            const findColIndex = (keywords) => {
              return headers.findIndex(h => {
                if (h === undefined || h === null) return false;
                const hClean = String(h).toLowerCase().trim();
                return keywords.some(key => hClean.includes(key));
              });
            };

            const colIdxIdSerie = findColIndex(["serie", "s/n", "sn", "id_serie", "número de serie", "numero de serie", "serial", "nro", "cod"]);
            const colIdxModelo = findColIndex(["modelo", "model", "impresora"]);
            const colIdxArea = findColIndex(["area", "área", "ubicacion", "ubicación", "area_actual", "sector", "area actual"]);
            const colIdxEntity = findColIndex(["ubicación física", "ubicacion fisica", "entidad", "ubicacion_entidad", "destino", "lugar"]);
            const colIdxToner = findColIndex(["toner", "tóner", "toner_nivel", "nivel de tóner", "toner nivel", "% toner", "% tóner"]);
            const colIdxUnit = findColIndex(["unidad", "imagen", "unidad_imagen_nivel", "unidad de imagen", "unidad nivel", "% unidad", "% imagen", "drum"]);
            const colIdxMaint = findColIndex(["mantenimiento", "kit", "fuser", "rodillos", "% kit", "% mantenimiento"]);
            const colIdxCas = findColIndex(["cas", "caso", "codigo_caso_cas", "código de caso", "codigo de caso", "incidente", "ticket"]);
            const colIdxObs = findColIndex(["observaciones", "detalles", "comentarios", "obs", "observacion", "comentario"]);

            for (let j = headerRowIndex + 1; j < rawArrays.length; j++) {
              const row = rawArrays[j];
              if (!Array.isArray(row) || row.length === 0) continue;

              const valAt = (idx) => {
                if (idx === -1 || idx === undefined || idx === null || row[idx] === undefined || row[idx] === null) {
                  return undefined;
                }
                return String(row[idx]).trim();
              };

              let id_serie = valAt(colIdxIdSerie) || "";

              if (!id_serie) {
                const firstVal = valAt(0);
                if (firstVal && firstVal.length >= 5) {
                  id_serie = firstVal;
                }
              }

              if (!id_serie) {
                const serialCandidate = row.find(cell => {
                  if (cell === undefined || cell === null) return false;
                  const sVal = String(cell).trim();
                  return /^[a-zA-Z0-9-]{8,20}$/.test(sVal);
                });
                if (serialCandidate) {
                  id_serie = String(serialCandidate).trim();
                }
              }

              if (!id_serie || id_serie.length < 4) continue;

              const modelVal = valAt(colIdxModelo) || "";
              const areaVal = valAt(colIdxArea) || "";

              let entityVal = valAt(colIdxEntity) || "";
              if (!entityVal) {
                entityVal = sheetName.toLowerCase().includes("mur") ? "MUR" : "Hospital";
              }

              const tonerValRaw = valAt(colIdxToner);
              const tonerVal = tonerValRaw !== undefined ? Number(tonerValRaw.replace("%", "").trim()) : null;

              const unitValRaw = valAt(colIdxUnit);
              const unitVal = unitValRaw !== undefined ? Number(unitValRaw.replace("%", "").trim()) : null;

              const maintValRaw = valAt(colIdxMaint);
              const maintVal = maintValRaw !== undefined ? Number(maintValRaw.replace("%", "").trim()) : null;

              const casVal = valAt(colIdxCas) || "";
              const obsVal = valAt(colIdxObs) || "";

              allParsedRows.push({
                id_serie,
                modelo: modelVal,
                area_actual: areaVal,
                ubicacion_entidad: entityVal,
                toner_nivel: tonerVal,
                unidad_imagen_nivel: unitVal,
                mantenimiento_kit_nivel: maintVal,
                codigo_caso_cas: casVal,
                observaciones: obsVal
              });
            }
          });

          // Deduplicate rows by uppercase serial number before analysis and storage
          const uniqueParsedRows = [];
          const seenSerials = new Set();

          allParsedRows.forEach(row => {
            const snUpper = row.id_serie.toUpperCase();
            if (!seenSerials.has(snUpper)) {
              seenSerials.add(snUpper);
              uniqueParsedRows.push(row);
            }
          });

          if (uniqueParsedRows.length === 0) {
            throw new Error("No se encontraron registros con Número de Serie válido en ninguna hoja del archivo.");
          }

          const geminiResult = await analizarImportacionExcel(uniqueParsedRows);
          setExcelData(geminiResult);
        } catch (error) {
          console.error("Error reading or analyzing Excel:", error);
          alert("Error al procesar el Excel: " + error.message);
          setIsExcelImportModalOpen(false);
        } finally {
          setIsExcelLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error("Reader error:", err);
      alert("Error al leer el archivo: " + err.message);
      setIsExcelLoading(false);
      setIsExcelImportModalOpen(false);
    }
  };

  const handleConfirmExcelImport = async () => {
    if (!excelData || !excelData.equipos_normalizados || isExcelLoading) return;

    setIsExcelLoading(true);
    try {
      const auditLogLines = [];
      const seenConfirmed = new Set();

      for (const eq of excelData.equipos_normalizados) {
        if (!eq.id_serie) continue;
        const snUpper = eq.id_serie.toUpperCase();
        if (seenConfirmed.has(snUpper)) continue;
        seenConfirmed.add(snUpper);

        const matched = printers.find(p => p.id_serie.toUpperCase() === snUpper);

        let tonerVal = 100;
        let unitVal = 100;
        let maintVal = 100;

        if (eq.toner_nivel !== undefined && eq.toner_nivel !== null) {
          tonerVal = Number(eq.toner_nivel);
        } else if (matched && matched.consumibles?.toner_nivel !== undefined) {
          tonerVal = matched.consumibles.toner_nivel;
        }

        if (eq.unidad_imagen_nivel !== undefined && eq.unidad_imagen_nivel !== null) {
          unitVal = Number(eq.unidad_imagen_nivel);
        } else if (matched && matched.consumibles?.unidad_imagen_nivel !== undefined) {
          unitVal = matched.consumibles.unidad_imagen_nivel;
        }

        if (eq.mantenimiento_kit_nivel !== undefined && eq.mantenimiento_kit_nivel !== null) {
          maintVal = Number(eq.mantenimiento_kit_nivel);
        } else if (matched && matched.consumibles?.mantenimiento_kit_nivel !== undefined) {
          maintVal = matched.consumibles.mantenimiento_kit_nivel;
        }

        const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);

        const modelVal = eq.modelo || (matched ? matched.modelo : "MX431ADN");
        const areaVal = eq.area_actual || (matched ? matched.area_actual : "Soporte");
        const casVal = eq.codigo_caso_cas !== undefined && eq.codigo_caso_cas !== "" ? eq.codigo_caso_cas : (matched ? matched.codigo_caso_cas : "");
        const obsVal = eq.observaciones !== undefined && eq.observaciones !== "" ? eq.observaciones : (matched && matched.observaciones ? matched.observaciones : "");
        const entityVal = eq.ubicacion_entidad || (matched ? matched.ubicacion_entidad : "Hospital");

        const computedFuncionamiento = calculatePrinterStatus(areaVal, tonerVal, unitVal, maintVal, obsVal);

        const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", snUpper);

        const printerDoc = {
          modelo: modelVal,
          area_actual: areaVal,
          codigo_caso_cas: casVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: obsVal,
          ubicacion_entidad: entityVal,
          consumibles: {
            toner_nivel: tonerVal,
            unidad_imagen_nivel: unitVal,
            mantenimiento_kit_nivel: maintVal,
            ultima_lectura: new Date()
          },
          prediccion: prediction
        };

        await setDoc(docRef, printerDoc);

        const historyColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", snUpper, "historial_lecturas");
        await addDoc(historyColRef, {
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: printerDoc.observaciones,
          codigo_caso_cas: printerDoc.codigo_caso_cas,
          ubicacion_entidad: printerDoc.ubicacion_entidad,
          area_actual: areaVal,
          fecha_lectura: new Date(),
          tipo_actualizacion: "Importación Excel (IA)"
        });

        const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
        await addDoc(generalHistoryColRef, {
          tipo: "impresora",
          id_serie: snUpper,
          modelo: printerDoc.modelo,
          area_actual: areaVal,
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: printerDoc.observaciones || "",
          codigo_caso_cas: printerDoc.codigo_caso_cas || "",
          tipo_actualizacion: "Importación Excel (IA)",
          timestamp: new Date()
        });

        auditLogLines.push(`- **${printerDoc.modelo}** (S/N: ${snUpper}): ${printerDoc.ubicacion_entidad} (${printerDoc.area_actual})`);
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `📊 **Excel Importado Exitosamente por IA:** Se procesó el archivo "${excelFileName}" y se actualizaron ${excelData.equipos_normalizados.length} registros en Firestore.\n\n**Resumen del reporte:**\n${excelData.reporte_resumen}\n\n**Equipos actualizados:**\n${auditLogLines.slice(0, 10).join("\n")}${auditLogLines.length > 10 ? `\n... y ${auditLogLines.length - 10} más.` : ""}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      alert(`Importación completada: ${excelData.equipos_normalizados.length} equipos procesados.`);
      setIsExcelImportModalOpen(false);
      setExcelData(null);
      setExcelFileName("");

      setCurrentTab("chat");
    } catch (error) {
      console.error("Error committing Excel import:", error);
      alert("Error al guardar registros de Excel: " + error.message);
    } finally {
      setIsExcelLoading(false);
    }
  };

  // Handle image upload & base64 conversion
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setChatImage({
        base64: reader.result.split(",")[1], // Extract base64 content
        mimeType: file.type,
        preview: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachedImage = () => {
    setChatImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit Chat Message to Gemini
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if ((!chatInput.trim() && !chatImage) || isChatLoading) return;

    const userMsgText = chatInput;
    const attachedImage = chatImage;

    // Clear inputs immediately for responsiveness
    setChatInput("");
    setChatImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Add user message to chat list
    const userMsgId = Date.now().toString();
    setChatMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text: userMsgText,
        image: attachedImage ? attachedImage.preview : null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    setIsChatLoading(true);

    try {
      // Call Gemini Service
      const result = await analizarEvidenciaSuministros(
        userMsgText,
        attachedImage ? attachedImage.base64 : null,
        attachedImage ? attachedImage.mimeType : null
      );

      console.log("Gemini parse result:", result);

      let action = result.accion || "actualizar";

      // 1. Handle Stock Updates
      if (action === "actualizar_stock") {
        if (!result.stock_updates || result.stock_updates.length === 0) {
          throw new Error("No se detectaron actualizaciones de stock válidas en el reporte.");
        }

        const auditLogs = [];

        for (const update of result.stock_updates) {
          let modelToUpdate = update.modelo || "";

          // If a serial number was provided instead of a model
          if (!modelToUpdate && result.id_serie) {
            const printerMatch = printers.find(p => p.id_serie.toLowerCase() === result.id_serie.toLowerCase());
            if (printerMatch) {
              modelToUpdate = printerMatch.modelo;
            }
          }

          if (!modelToUpdate) {
            modelToUpdate = "MX431ADN"; // fallback
          }

          // Normalize model name
          let modeloNorm = "MX431ADN";
          if (modelToUpdate.includes("632") || modelToUpdate === "632" || modelToUpdate.toLowerCase().includes("mx632")) {
            modeloNorm = "MX632ADWE";
          } else if (modelToUpdate.includes("722") || modelToUpdate === "722" || modelToUpdate.toLowerCase().includes("mx722")) {
            modeloNorm = "MX722ADHE";
          }

          const insumo = update.insumo || "toner"; // toner, unidad_imagen or mantenimiento

          const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "repuestos", modeloNorm);

          // Find current stock values in our local state to merge
          const matchedStock = repuestos.find(r => r.id === modeloNorm) || {
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

          await updateDoc(docRef, updateObj);

          const labelInsumo = insumo === "toner" ? "Tóner" : insumo === "mantenimiento" ? "Kit de Mantenimiento" : "Unidad de Imagen";
          const hVal = logHospital !== null ? logHospital : (insumo === "toner" ? (matchedStock.toner_hospital ?? 0) : insumo === "mantenimiento" ? (matchedStock.mantenimiento_hospital ?? 0) : (matchedStock.unidad_hospital ?? 0));
          const dVal = logDeposito !== null ? logDeposito : (insumo === "toner" ? (matchedStock.toner_deposito ?? 0) : insumo === "mantenimiento" ? (matchedStock.mantenimiento_deposito ?? 0) : (matchedStock.unidad_deposito ?? 0));

          const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");

          if (logHospital !== null) {
            const prevVal = insumo === "toner" ? (matchedStock.toner_hospital ?? 0) : insumo === "mantenimiento" ? (matchedStock.mantenimiento_hospital ?? 0) : (matchedStock.unidad_hospital ?? 0);
            await addDoc(generalHistoryColRef, {
              tipo: "stock",
              modelo: modeloNorm,
              insumo: labelInsumo,
              origen: "Hospital",
              cantidad_anterior: Number(prevVal),
              cantidad_nueva: Number(logHospital),
              tipo_actualizacion: "Actualización IA",
              observaciones: result.observaciones || `Se actualizó el stock de ${labelInsumo} (Hospital) vía chat de IA.`,
              timestamp: new Date()
            });
          }

          if (logDeposito !== null) {
            const prevVal = insumo === "toner" ? (matchedStock.toner_deposito ?? 0) : insumo === "mantenimiento" ? (matchedStock.mantenimiento_deposito ?? 0) : (matchedStock.unidad_deposito ?? 0);
            await addDoc(generalHistoryColRef, {
              tipo: "stock",
              modelo: modeloNorm,
              insumo: labelInsumo,
              origen: "Depósito",
              cantidad_anterior: Number(prevVal),
              cantidad_nueva: Number(logDeposito),
              tipo_actualizacion: "Actualización IA",
              observaciones: result.observaciones || `Se actualizó el stock de ${labelInsumo} (Depósito) vía chat de IA.`,
              timestamp: new Date()
            });
          }

          auditLogs.push(`- **${modeloNorm}** (${labelInsumo}): Hospital = ${hVal}, Depósito = ${dVal}`);
        }

        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `📦 **Stock de Repuestos Actualizado:** He procesado el reporte de inventario de repuestos y actualizado Firestore.\n\n${auditLogs.join("\n")}\n\n*Notas: ${result.observaciones || 'Actualización de stock realizada.'}*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsChatLoading(false);
        return;
      }

      // 2. Handle Printer Actions
      if (!result.id_serie && !result.area_actual) {
        throw new Error("La IA no pudo determinar el Número de Serie ni el Área del dispositivo.");
      }

      const idSerieUpper = result.id_serie ? result.id_serie.toUpperCase() : "";
      let matchedPrinter = null;

      if (idSerieUpper) {
        matchedPrinter = printers.find(p => p.id_serie.toUpperCase() === idSerieUpper);

        // Fallback: match by suffix if the technician provided the last 4-6 characters
        if (!matchedPrinter && idSerieUpper.length <= 6) {
          matchedPrinter = printers.find(p => p.id_serie.toUpperCase().endsWith(idSerieUpper));
        }
      }

      // Fallback: Match by area_actual if id_serie is missing or not matched
      if (!matchedPrinter && result.area_actual) {
        const normalizeArea = (str) => {
          if (!str) return "";
          let clean = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          clean = clean.replace(/^(c\.e\s*|c\.\s*e\.\s*|unidad\s+de\s+|unidad\s+)/g, "");
          return clean.trim();
        };

        const targetAreaNorm = normalizeArea(result.area_actual);

        if (targetAreaNorm) {
          // 1. Prioritize exact match after prefix stripping (e.g. "Oncología" matches "C.E Oncología")
          matchedPrinter = printers.find(p => normalizeArea(p.area_actual) === targetAreaNorm);

          // 2. Fallback to contains match if not found exactly (e.g. "Hospitalizacion Oncologia")
          if (!matchedPrinter) {
            matchedPrinter = printers.find(p => normalizeArea(p.area_actual).includes(targetAreaNorm));
          }
        }
      }

      if (!matchedPrinter && !idSerieUpper) {
        throw new Error("La IA no pudo determinar el Número de Serie del dispositivo. Por favor, asegúrese de que el reporte incluya el número de serie o el área exacta.");
      }

      // Determine action (crear, actualizar, eliminar)
      action = result.accion || (matchedPrinter ? "actualizar" : "crear");

      if (action === "eliminar") {
        if (!matchedPrinter) {
          throw new Error(`No se puede eliminar: El número de serie ${idSerieUpper} no está registrado en el inventario.`);
        }

        const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", matchedPrinter.id_serie);
        await deleteDoc(docRef);

        const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
        await addDoc(generalHistoryColRef, {
          tipo: "impresora",
          id_serie: matchedPrinter.id_serie,
          modelo: matchedPrinter.modelo,
          area_actual: matchedPrinter.area_actual || "Soporte",
          toner_nivel: 0,
          unidad_imagen_nivel: 0,
          mantenimiento_kit_nivel: 0,
          estado_funcionamiento: "Inoperativo",
          estado_criticidad: "Eliminado",
          observaciones: `Impresora eliminada vía chat de IA.`,
          codigo_caso_cas: matchedPrinter.codigo_caso_cas || "",
          tipo_actualizacion: "Eliminado (IA)",
          timestamp: new Date()
        });

        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `🗑️ **Impresora Eliminada:** El equipo **${matchedPrinter.modelo}** (S/N: ${matchedPrinter.id_serie}) en el área **${matchedPrinter.area_actual}** ha sido removido de la base de datos Firestore exitosamente.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsChatLoading(false);
        return;
      }

      if (action === "crear") {
        if (matchedPrinter) {
          throw new Error(`El número de serie ${idSerieUpper} ya existe en el inventario. Se omitió la creación.`);
        }

        const tonerVal = (result.toner_nivel !== undefined && result.toner_nivel !== null) ? Number(result.toner_nivel) : 100;
        const unitVal = (result.unidad_imagen_nivel !== undefined && result.unidad_imagen_nivel !== null) ? Number(result.unidad_imagen_nivel) : 100;
        const maintVal = (result.mantenimiento_kit_nivel !== undefined && result.mantenimiento_kit_nivel !== null) ? Number(result.mantenimiento_kit_nivel) : 100;
        const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);
        const computedFuncionamiento = calculatePrinterStatus(result.area_actual || "Soporte", tonerVal, unitVal, maintVal, result.observaciones || "", result.ubicacion_entidad || "Hospital");

        const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", idSerieUpper);

        const newPrinter = {
          modelo: result.modelo || "MX431ADN",
          area_actual: result.area_actual || "Soporte",
          codigo_caso_cas: result.codigo_caso_cas || "",
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

        await setDoc(docRef, newPrinter);

        // Write to subcollection audit history
        const historyColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", idSerieUpper, "historial_lecturas");
        await addDoc(historyColRef, {
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: newPrinter.observaciones,
          codigo_caso_cas: newPrinter.codigo_caso_cas,
          ubicacion_entidad: newPrinter.ubicacion_entidad,
          area_actual: newPrinter.area_actual,
          fecha_lectura: new Date(),
          tipo_actualizacion: "Gemini AI (Creado)"
        });

        // Save to General History
        const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
        await addDoc(generalHistoryColRef, {
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
          tipo_actualizacion: "Gemini AI (Creado)",
          timestamp: new Date()
        });

        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `➕ **Nueva Impresora Registrada:** Se ha guardado en Firestore el equipo **${newPrinter.modelo}** (S/N: ${idSerieUpper}) en el área **${newPrinter.area_actual}**.
            
**Valores iniciales:**
- Nivel de Tóner: ${tonerVal}% (Cambio est.: ${prediction.fecha_cambio_toner})
- Unidad de Imagen: ${unitVal}% (Cambio est.: ${prediction.fecha_cambio_unidad})
- Kit de Mantenimiento: ${maintVal}% (Cambio est.: ${prediction.fecha_cambio_mantenimiento})
- Estado: ${newPrinter.estado_funcionamiento}
- Notas: "${newPrinter.observaciones}"`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsChatLoading(false);
        return;
      }

      // Default: Action is actualizar
      if (!matchedPrinter) {
        // Fallback: If AI wanted to update but it doesn't exist, create it automatically
        const tonerVal = (result.toner_nivel !== undefined && result.toner_nivel !== null) ? Number(result.toner_nivel) : 100;
        const unitVal = (result.unidad_imagen_nivel !== undefined && result.unidad_imagen_nivel !== null) ? Number(result.unidad_imagen_nivel) : 100;
        const maintVal = (result.mantenimiento_kit_nivel !== undefined && result.mantenimiento_kit_nivel !== null) ? Number(result.mantenimiento_kit_nivel) : 100;
        const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);
        const computedFuncionamiento = calculatePrinterStatus(result.area_actual || "Soporte", tonerVal, unitVal, maintVal, result.observaciones || "", result.ubicacion_entidad || "Hospital");

        const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", idSerieUpper);
        const newPrinter = {
          modelo: result.modelo || "MX431ADN",
          area_actual: result.area_actual || "Soporte",
          codigo_caso_cas: result.codigo_caso_cas || "",
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

        await setDoc(docRef, newPrinter);

        // Write history
        const historyColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", idSerieUpper, "historial_lecturas");
        await addDoc(historyColRef, {
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: newPrinter.observaciones,
          codigo_caso_cas: newPrinter.codigo_caso_cas,
          ubicacion_entidad: newPrinter.ubicacion_entidad,
          area_actual: newPrinter.area_actual,
          fecha_lectura: new Date(),
          tipo_actualizacion: "Gemini AI (Auto-creado)"
        });

        // Save to General History
        const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
        await addDoc(generalHistoryColRef, {
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
          tipo_actualizacion: "Gemini AI (Auto-creado)",
          timestamp: new Date()
        });

        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `➕ **Impresora Auto-registrada:** El S/N **${idSerieUpper}** no existía en el inventario, por lo que fue creada en Firestore automáticamente.
            
**Valores:**
- Modelo: ${newPrinter.modelo}
- Área: ${newPrinter.area_actual}
- Nivel de Tóner: ${tonerVal}% (Cambio est.: ${prediction.fecha_cambio_toner})
- Unidad de Imagen: ${unitVal}% (Cambio est.: ${prediction.fecha_cambio_unidad})
- Kit de Mantenimiento: ${maintVal}% (Cambio est.: ${prediction.fecha_cambio_mantenimiento})
- Estado: ${newPrinter.estado_funcionamiento}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        // Standard Update
        const tonerVal = (result.toner_nivel !== undefined && result.toner_nivel !== null) ? Number(result.toner_nivel) : (matchedPrinter.consumibles?.toner_nivel ?? 100);
        const unitVal = (result.unidad_imagen_nivel !== undefined && result.unidad_imagen_nivel !== null) ? Number(result.unidad_imagen_nivel) : (matchedPrinter.consumibles?.unidad_imagen_nivel ?? 100);
        const maintVal = (result.mantenimiento_kit_nivel !== undefined && result.mantenimiento_kit_nivel !== null) ? Number(result.mantenimiento_kit_nivel) : (matchedPrinter.consumibles?.mantenimiento_kit_nivel ?? 100);
        const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);
        const computedFuncionamiento = calculatePrinterStatus(
          result.area_actual || matchedPrinter.area_actual || "Soporte",
          tonerVal,
          unitVal,
          maintVal,
          result.observaciones || matchedPrinter.observaciones || "",
          result.ubicacion_entidad || matchedPrinter.ubicacion_entidad || "Hospital"
        );

        const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", matchedPrinter.id_serie);

        const obsVal = result.observaciones || matchedPrinter.observaciones || "";

        const updateData = {
          modelo: result.modelo || matchedPrinter.modelo,
          area_actual: result.area_actual || matchedPrinter.area_actual,
          ubicacion_entidad: result.ubicacion_entidad || matchedPrinter.ubicacion_entidad || "Hospital",
          codigo_caso_cas: result.codigo_caso_cas !== undefined ? result.codigo_caso_cas : matchedPrinter.codigo_caso_cas || "",
          estado_funcionamiento: computedFuncionamiento,
          observaciones: obsVal,
          "consumibles.toner_nivel": tonerVal,
          "consumibles.unidad_imagen_nivel": unitVal,
          "consumibles.mantenimiento_kit_nivel": maintVal,
          "consumibles.ultima_lectura": new Date(),
          prediccion: prediction
        };

        await updateDoc(docRef, updateData);

        // History
        const historyColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", matchedPrinter.id_serie, "historial_lecturas");
        await addDoc(historyColRef, {
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: updateData.observaciones,
          codigo_caso_cas: updateData.codigo_caso_cas,
          ubicacion_entidad: updateData.ubicacion_entidad,
          area_actual: updateData.area_actual,
          fecha_lectura: new Date(),
          tipo_actualizacion: "Gemini AI"
        });

        // Save to General History
        const generalHistoryColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
        await addDoc(generalHistoryColRef, {
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
          tipo_actualizacion: "Gemini AI",
          timestamp: new Date()
        });

        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `🔄 **Impresora Actualizada:** El equipo **${matchedPrinter.modelo}** (S/N: ${matchedPrinter.id_serie}) ha sido actualizado exitosamente en Firestore.
            
**Valores modificados:**
- Área: ${updateData.area_actual}
- Nivel de Tóner: ${tonerVal}% (Autonomía: ${prediction.dias_restantes_toner} días)
- Unidad de Imagen: ${unitVal}% (Autonomía: ${prediction.dias_restantes_unidad} días)
- Kit de Mantenimiento: ${maintVal}% (Autonomía: ${prediction.dias_restantes_mantenimiento} días)
- Estado: ${updateData.estado_funcionamiento}
- Notas: "${updateData.observaciones || 'Sin observaciones'}"`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }

    } catch (error) {
      console.error("Chat message error:", error);
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `⚠️ **Error al procesar:** ${error.message}. Por favor intente de nuevo detallando más o revisando la API Key en Ajustes.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Filter printers list for Search and Category selection
  const filteredPrinters = printers.filter(p => {
    const matchesSearch = p.id_serie.toLowerCase().includes(searchText.toLowerCase()) ||
      p.modelo.toLowerCase().includes(searchText.toLowerCase()) ||
      p.area_actual.toLowerCase().includes(searchText.toLowerCase());

    if (filterCriticidad === "all") return matchesSearch;
    return matchesSearch && getPrinterStatus(p) === filterCriticidad;
  });

  return (
    <div className="bg-background text-on-background min-h-screen pb-24 font-body-md text-body-md overflow-x-hidden flex flex-col">

      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer active:opacity-70" onClick={() => setCurrentTab("dashboard")}>
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>print</span>
          <h1 className="font-headline-lg-mobile text-xl font-extrabold text-primary tracking-tight">SAMI-Lexmark</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-primary bg-primary-fixed/50 px-2.5 py-1 rounded-full border border-primary/15">
            <span className="material-symbols-outlined text-sm animate-pulse-subtle">cloud_done</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Online</span>
          </div>
          <button
            onClick={() => setCurrentTab("settings")}
            className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors ${currentTab === "settings" ? "bg-primary-fixed text-primary" : "text-on-surface-variant"}`}
          >
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 px-4 max-w-lg mx-auto w-full flex-grow space-y-6">

        {/* VIEW: DASHBOARD */}
        {currentTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards Grid */}
            <section className="grid grid-cols-2 gap-4">
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
                  Total Equipos
                </p>
                <span className="text-3xl font-extrabold text-primary">{loadingPrinters ? "..." : kpiTotal}</span>
              </div>

              <div
                onClick={() => {
                  setFilterCriticidad("Operativo");
                  setCurrentTab("inventario");
                }}
                className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.97]"
              >
                <p className="text-emerald-600 font-semibold flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Operativas
                </p>
                <span className="text-3xl font-extrabold text-emerald-700">{loadingPrinters ? "..." : kpiOperativas}</span>
              </div>

              <div
                onClick={() => {
                  setFilterCriticidad("Advertencia");
                  setCurrentTab("inventario");
                }}
                className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.97]"
              >
                <p className="text-amber-600 font-semibold flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Advertencia
                </p>
                <span className="text-3xl font-extrabold text-amber-700">{loadingPrinters ? "..." : kpiAdvertencias}</span>
              </div>

              <div
                onClick={() => {
                  setFilterCriticidad("Inoperativo");
                  setCurrentTab("inventario");
                }}
                className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.97]"
              >
                <p className="text-rose-600 font-semibold flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Inoperativas
                </p>
                <span className="text-3xl font-extrabold text-rose-700">{loadingPrinters ? "..." : kpiInoperativas}</span>
              </div>
            </section>

            {/* Ubicación y Estados de Servicio Grid */}
            <section className="bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">location_on</span>
                Ubicación Física y Estado de Servicio
              </h3>

              <div className="grid grid-cols-2 gap-3">
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
                    Equipos en taller/soporte externo de MUR.
                  </p>
                </div>
              </div>
            </section>

            {/* Quick Summary Section */}
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
                ) : printers.filter(p => getPrinterStatus(p) !== "Operativo").length === 0 ? (
                  <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
                    <p className="font-semibold">Todos los equipos están operativos</p>
                  </div>
                ) : (
                  printers
                    .filter(p => getPrinterStatus(p) !== "Operativo")
                    .slice(0, 3)
                    .map((printer) => {
                      const status = getPrinterStatus(printer);
                      return (
                        <div
                          key={printer.id_serie}
                          onClick={() => handleOpenEditModal(printer)}
                          className={`p-4 border rounded-2xl shadow-sm space-y-3 cursor-pointer hover:bg-surface-container-low transition-colors active:scale-[0.98] ${status === "Inoperativo"
                            ? "bg-rose-500/5 border-rose-500/20"
                            : "bg-surface-container-lowest border-outline-variant"
                            }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex gap-1.5 flex-wrap items-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${status === "Inoperativo"
                                  ? "bg-rose-500/10 text-rose-700"
                                  : "bg-surface-variant text-outline"
                                  }`}>
                                  S/N: {printer.id_serie}
                                </span>
                                {printer.codigo_caso_cas && (
                                  <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary-fixed rounded-md max-w-[120px] truncate" title={printer.codigo_caso_cas}>
                                    CAS: {printer.codigo_caso_cas}
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${(printer.ubicacion_entidad || "Hospital") === "Hospital"
                                  ? "bg-primary-fixed/30 text-primary border border-primary/10"
                                  : "bg-secondary-fixed/30 text-secondary border border-secondary/10"
                                  }`}>
                                  <span className="material-symbols-outlined text-[11px]">
                                    {(printer.ubicacion_entidad || "Hospital") === "Hospital" ? "local_hospital" : "corporate_fare"}
                                  </span>
                                  {(printer.ubicacion_entidad || "Hospital") === "Hospital"
                                    ? `Hospital (${printer.area_actual === "Soporte" ? "En Soporte" : "En Servicio"})`
                                    : "MUR"
                                  }
                                </span>
                              </div>
                              <h3 className="font-bold text-base mt-1 text-on-background">{printer.modelo}</h3>
                              <p className="text-xs text-on-surface-variant">Área: {printer.area_actual}</p>
                            </div>

                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${status === "Inoperativo"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse-subtle"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              }`}>
                              <span className="material-symbols-outlined text-[11px]">
                                {status === "Inoperativo" ? "cancel" : "warning"}
                              </span>
                              {status} {status !== "Inoperativo" ? ((printer.ubicacion_entidad || "Hospital") === "Hospital" && !(printer.area_actual || "").toLowerCase().includes("soporte") ? " • En Servicio" : " • Sin Servicio") : ""}
                            </span>
                          </div>

                        {/* Progress Indicators */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/30">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-outline">% TÓNER</span>
                              <span className={printer.consumibles.toner_nivel <= 15 ? "text-error" : "text-outline"}>
                                {printer.consumibles.toner_nivel}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${printer.consumibles.toner_nivel <= 15 ? "bg-error" : "bg-primary"
                                  }`}
                                style={{ width: `${printer.consumibles.toner_nivel}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-outline">% U. IMAG.</span>
                              <span className={printer.consumibles.unidad_imagen_nivel <= 15 ? "text-error" : "text-outline"}>
                                {printer.consumibles.unidad_imagen_nivel}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${printer.consumibles.unidad_imagen_nivel <= 15 ? "bg-error" : "bg-secondary"
                                  }`}
                                style={{ width: `${printer.consumibles.unidad_imagen_nivel}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-outline">% KIT MANT.</span>
                              <span className={(printer.consumibles.mantenimiento_kit_nivel ?? 100) <= 15 ? "text-error" : "text-outline"}>
                                {printer.consumibles.mantenimiento_kit_nivel ?? 100}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${(printer.consumibles.mantenimiento_kit_nivel ?? 100) <= 15 ? "bg-error" : "bg-tertiary"
                                  }`}
                                style={{ width: `${printer.consumibles.mantenimiento_kit_nivel ?? 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Quick Gemini Callout */}
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

            {/* Stock / Repuestos Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-md text-lg text-on-background font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">inventory_2</span>
                  Repuestos en Stock
                </h2>
                <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">
                  Depósito & Hospital
                </span>
              </div>

              <div className="bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm space-y-4">
                {repuestos.length === 0 ? (
                  <p className="text-xs text-outline text-center py-4">Cargando stock...</p>
                ) : (
                  repuestos.map(item => (
                    <div key={item.id} className="border-b border-outline-variant/30 last:border-0 pb-3 last:pb-0 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-on-background">{item.modelo}</span>
                        <span className="text-[10px] text-outline font-medium">Stock de Repuestos</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Toner Stock Card */}
                        <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20 space-y-1.5">
                          <span className="text-[9px] font-bold text-outline block uppercase tracking-wider text-center">Tóner</span>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-on-surface-variant">Hosp:</span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleDecrementStockClick(item.id, "toner_hospital", item.toner_hospital || 0)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >-</button>
                              <span className="font-bold min-w-[12px] text-center">{item.toner_hospital ?? 0}</span>
                              <button
                                type="button"
                                onClick={() => updateManualStock(item.id, "toner_hospital", (item.toner_hospital || 0) + 1)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >+</button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-on-surface-variant">Dep:</span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleDecrementStockClick(item.id, "toner_deposito", item.toner_deposito || 0)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >-</button>
                              <span className="font-bold min-w-[12px] text-center text-primary">{item.toner_deposito ?? 0}</span>
                              <button
                                type="button"
                                onClick={() => updateManualStock(item.id, "toner_deposito", (item.toner_deposito || 0) + 1)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >+</button>
                            </div>
                          </div>
                        </div>

                        {/* Image Unit Stock Card */}
                        <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20 space-y-1.5">
                          <span className="text-[9px] font-bold text-outline block uppercase tracking-wider text-center">Unid. Imagen</span>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-on-surface-variant">Hosp:</span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleDecrementStockClick(item.id, "unidad_hospital", item.unidad_hospital || 0)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >-</button>
                              <span className="font-bold min-w-[12px] text-center">{item.unidad_hospital ?? 0}</span>
                              <button
                                type="button"
                                onClick={() => updateManualStock(item.id, "unidad_hospital", (item.unidad_hospital || 0) + 1)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >+</button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-on-surface-variant">Dep:</span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleDecrementStockClick(item.id, "unidad_deposito", item.unidad_deposito || 0)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >-</button>
                              <span className="font-bold min-w-[12px] text-center text-secondary">{item.unidad_deposito ?? 0}</span>
                              <button
                                type="button"
                                onClick={() => updateManualStock(item.id, "unidad_deposito", (item.unidad_deposito || 0) + 1)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >+</button>
                            </div>
                          </div>
                        </div>

                        {/* Maintenance Kit Stock Card */}
                        <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20 space-y-1.5">
                          <span className="text-[9px] font-bold text-outline block uppercase tracking-wider text-center">Kit Mant.</span>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-on-surface-variant">Hosp:</span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleDecrementStockClick(item.id, "mantenimiento_hospital", item.mantenimiento_hospital || 0)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >-</button>
                              <span className="font-bold min-w-[12px] text-center">{item.mantenimiento_hospital ?? 0}</span>
                              <button
                                type="button"
                                onClick={() => updateManualStock(item.id, "mantenimiento_hospital", (item.mantenimiento_hospital || 0) + 1)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >+</button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-on-surface-variant">Dep:</span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleDecrementStockClick(item.id, "mantenimiento_deposito", item.mantenimiento_deposito || 0)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >-</button>
                              <span className="font-bold min-w-[12px] text-center text-tertiary">{item.mantenimiento_deposito ?? 0}</span>
                              <button
                                type="button"
                                onClick={() => updateManualStock(item.id, "mantenimiento_deposito", (item.mantenimiento_deposito || 0) + 1)}
                                className="w-4 h-4 flex items-center justify-center bg-surface-container-high rounded text-on-surface hover:bg-outline-variant/50 font-bold active:scale-90"
                              >+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* VIEW: INVENTARIO */}
        {currentTab === "inventario" && (
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

              <div className="flex flex-col gap-2">
                {/* Search box */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined">search</span>
                  <input
                    type="text"
                    placeholder="Buscar por serie, modelo o área..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full bg-surface-container-low border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-primary focus:border-primary font-body-md"
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
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
                  {[
                    { id: "all", label: "Todas" },
                    { id: "Operativo", label: "Operativas" },
                    { id: "Advertencia", label: "Advertencias" },
                    { id: "Inoperativo", label: "Inoperativas" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterCriticidad(tab.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${filterCriticidad === tab.id
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

            {/* List */}
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
                filteredPrinters.map((printer) => {
                  const toner = printer.consumibles?.toner_nivel ?? 100;
                  const unit = printer.consumibles?.unidad_imagen_nivel ?? 100;

                  return (
                    <div
                      key={printer.id_serie}
                      onClick={() => handleOpenEditModal(printer)}
                      className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm space-y-3 cursor-pointer hover:bg-surface-container-low transition-colors active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex gap-1.5 flex-wrap items-center">
                            <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">
                              S/N: {printer.id_serie}
                            </span>
                            {printer.codigo_caso_cas && (
                              <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary-fixed rounded-md max-w-[120px] truncate" title={printer.codigo_caso_cas}>
                                CAS: {printer.codigo_caso_cas}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${(printer.ubicacion_entidad || "Hospital") === "Hospital"
                              ? "bg-primary-fixed/30 text-primary border border-primary/10"
                              : "bg-secondary-fixed/30 text-secondary border border-secondary/10"
                              }`}>
                              <span className="material-symbols-outlined text-[11px]">
                                {(printer.ubicacion_entidad || "Hospital") === "Hospital" ? "local_hospital" : "corporate_fare"}
                              </span>
                              {(printer.ubicacion_entidad || "Hospital") === "Hospital"
                                ? `Hospital (${printer.area_actual === "Soporte" ? "En Soporte" : "En Servicio"})`
                                : "MUR"
                              }
                            </span>
                          </div>
                          <h3 className="font-bold text-base mt-1 text-on-background">{printer.modelo}</h3>
                          <p className="text-xs text-on-surface-variant">Área: {printer.area_actual}</p>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${
                          getPrinterStatus(printer) === "Inoperativo"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse-subtle"
                            : getPrinterStatus(printer) === "Advertencia"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          }`}>
                          <span className="material-symbols-outlined text-[11px]">
                            {getPrinterStatus(printer) === "Inoperativo" ? "cancel" : getPrinterStatus(printer) === "Advertencia" ? "warning" : "check_circle"}
                          </span>
                          {getPrinterStatus(printer)} {getPrinterStatus(printer) !== "Inoperativo" ? ((printer.ubicacion_entidad || "Hospital") === "Hospital" && !(printer.area_actual || "").toLowerCase().includes("soporte") ? " • En Servicio" : " • Sin Servicio") : ""}
                        </span>
                      </div>

                      {/* Consumable Levels */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/30">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-outline">% TÓNER</span>
                            <span className={toner <= 15 ? "text-error" : "text-outline"}>
                              {toner}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${toner <= 15 ? "bg-error" : "bg-primary"
                                }`}
                              style={{ width: `${toner}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-outline">% U. IMAG.</span>
                            <span className={unit <= 15 ? "text-error" : "text-outline"}>
                              {unit}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${unit <= 15 ? "bg-error" : "bg-secondary"
                                }`}
                              style={{ width: `${unit}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-outline">% KIT MANT.</span>
                            <span className={(printer.consumibles?.mantenimiento_kit_nivel ?? 100) <= 15 ? "text-error" : "text-outline"}>
                              {printer.consumibles?.mantenimiento_kit_nivel ?? 100}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(printer.consumibles?.mantenimiento_kit_nivel ?? 100) <= 15 ? "bg-error" : "bg-tertiary"
                                }`}
                              style={{ width: `${printer.consumibles?.mantenimiento_kit_nivel ?? 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Predictions Summary */}
                      {printer.prediccion && (
                        <div className="pt-2 flex flex-col gap-1 text-[11px] text-on-surface-variant bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/30">
                          <div className="flex justify-between">
                            <span>Estimación cambio Tóner:</span>
                            <span className="font-semibold text-primary">
                              {printer.prediccion.fecha_cambio_toner} ({printer.prediccion.dias_restantes_toner} días)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Estimación cambio Unidad:</span>
                            <span className="font-semibold text-secondary">
                              {printer.prediccion.fecha_cambio_unidad} ({printer.prediccion.dias_restantes_unidad} días)
                            </span>
                          </div>
                          {printer.prediccion.fecha_cambio_mantenimiento && (
                            <div className="flex justify-between">
                              <span>Estimación cambio Kit Mant.:</span>
                              <span className="font-semibold text-tertiary">
                                {printer.prediccion.fecha_cambio_mantenimiento} ({printer.prediccion.dias_restantes_mantenimiento} días)
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {printer.observaciones && (
                        <p className="text-[11px] italic text-on-surface-variant bg-surface-container-low px-2 py-1 rounded border border-dashed border-outline-variant/30">
                          Obs: {printer.observaciones}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VIEW: CHAT GEMINI */}
        {currentTab === "chat" && (
          <div className="space-y-4 flex flex-col h-[70vh] animate-fade-in bg-surface-container border border-outline-variant rounded-3xl overflow-hidden shadow-sm">
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
                  <div className={`p-3 rounded-2xl shadow-sm text-sm ${msg.sender === "user"
                    ? "bg-primary text-on-primary rounded-tr-none"
                    : "bg-surface-container-high text-on-surface-variant rounded-tl-none border border-outline-variant"
                    }`}>
                    {msg.image && (
                      <div className="mb-2 relative rounded-lg overflow-hidden border border-black/10 max-h-40">
                        <img src={msg.image} alt="Adjunto técnico" className="w-full object-cover" />
                      </div>
                    )}

                    {/* Render message formatting */}
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
                    <span className="text-xs font-semibold animate-pulse">Analizando evidencia y actualizando base de datos...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input & Form */}
            <form onSubmit={handleSendChatMessage} className="p-4 bg-surface border-t border-outline-variant">
              {chatImage && (
                <div className="mb-3 p-2 bg-surface-container-low rounded-xl border border-outline-variant flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={chatImage.preview} alt="Vista previa" className="w-10 h-10 object-cover rounded-md border border-outline-variant" />
                    <span className="text-xs font-medium text-on-surface-variant">Foto adjuntada</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachedImage}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-high text-error"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Detalla reporte de consumibles o sube imagen..."
                  className="w-full bg-surface-container-low border-outline-variant rounded-xl text-sm focus:ring-primary focus:border-primary resize-none p-3 h-16 font-body-md"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage(e);
                    }
                  }}
                />

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    ref={cameraInputRef}
                    className="hidden"
                  />
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelUpload}
                    ref={excelFileInputRef}
                    className="hidden"
                  />
                  <div className="grid grid-cols-4 gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary-container/80 active:scale-95 transition-all text-[10px]"
                    >
                      <span className="material-symbols-outlined text-base">photo_camera</span>
                      <span>Tomar Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary-container/80 active:scale-95 transition-all text-[10px]"
                    >
                      <span className="material-symbols-outlined text-base">image</span>
                      <span>Galería</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => excelFileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary-container/80 active:scale-95 transition-all text-[10px]"
                    >
                      <span className="material-symbols-outlined text-base">upload_file</span>
                      <span>Excel IA</span>
                    </button>
                    <button
                      type="submit"
                      disabled={(!chatInput.trim() && !chatImage) || isChatLoading}
                      className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-container disabled:opacity-50 active:scale-95 transition-all text-[10px] shadow-md"
                    >
                      <span className="material-symbols-outlined text-base">send</span>
                      <span>Enviar</span>
                    </button>
                  </div>
              </div>
            </form>
          </div>
        )}

        {/* VIEW: AUDITORIA / HISTORIAL */}
        {currentTab === "historial" && (
          <div className="space-y-4 animate-fade-in">
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
                            {log.timestamp.toLocaleDateString("es-PE")} {log.timestamp.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}
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
                          {log.timestamp.toLocaleDateString("es-PE")} {log.timestamp.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}
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
                          <span className={`font-semibold ${
                            (log.estado_funcionamiento || log.estado_criticidad) === "Inoperativo" || (log.estado_funcionamiento || log.estado_criticidad) === "Crítico"
                              ? "text-rose-600 font-extrabold"
                              : (log.estado_funcionamiento || log.estado_criticidad) === "Advertencia"
                                ? "text-amber-600 font-extrabold"
                                : "text-emerald-600 font-extrabold"
                          }`}>
                            {log.estado_funcionamiento || log.estado_criticidad || "Operativo"}
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
                })
              )}
            </div>
          </div>
        )}

        {/* VIEW: SETTINGS (Fallback API Key Configuration) */}
        {currentTab === "settings" && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="font-headline-md text-xl text-on-background font-bold">Ajustes del Sistema</h2>

            <form onSubmit={handleSaveApiKey} className="p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">api</span>
                Clave API de Gemini
              </h3>

              <p className="text-xs text-on-surface-variant">
                Dado que los reportes de campo y el análisis multimodal utilizan la API de Gemini, puedes configurar tu API Key aquí. Se almacena localmente en este navegador.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block">Gemini API Key</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Pegue su API Key aquí..."
                  className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary text-sm font-mono"
                />
              </div>

              {showSettingsSaved && (
                <div className="p-3 bg-green-100 text-green-800 rounded-xl border border-green-200 text-xs font-semibold flex items-center gap-1.5 animate-pulse-subtle">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Configuración guardada exitosamente en este navegador.
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:bg-primary-container active:scale-95 transition-all text-sm"
              >
                Guardar Configuración
              </button>
            </form>

            <div className="p-5 bg-surface-container-low border border-outline-variant rounded-2xl space-y-3">
              <h4 className="font-bold text-xs text-outline uppercase">Información del Proyecto</h4>
              <div className="text-xs space-y-1.5 text-on-surface-variant font-mono">
                <p><strong>Proyecto:</strong> SAMI-Lexmark (Cayetano Heredia)</p>
                <p><strong>Firestore DB:</strong> sami-lexmark (Cloud)</p>
                <p><strong>Modelo IA:</strong> gemini-1.5-flash</p>
                <p><strong>Ciclo Autonomía:</strong> 45 Días corridos (Lineal)</p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 pb-safe bg-surface border-t border-outline-variant shadow-lg rounded-t-xl max-w-lg mx-auto left-1/2 -translate-x-1/2">
        <button
          onClick={() => {
            setFilterCriticidad("all");
            setCurrentTab("dashboard");
          }}
          className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${currentTab === "dashboard"
            ? "bg-secondary-container text-on-secondary-container font-semibold"
            : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === "dashboard" ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
          <span className="font-label-sm text-[10px]">Dashboard</span>
        </button>

        <button
          onClick={() => {
            setFilterCriticidad("all");
            setCurrentTab("inventario");
          }}
          className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${currentTab === "inventario"
            ? "bg-secondary-container text-on-secondary-container font-semibold"
            : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === "inventario" ? "'FILL' 1" : "'FILL' 0" }}>inventory_2</span>
          <span className="font-label-sm text-[10px]">Inventario</span>
        </button>

        <button
          onClick={() => setCurrentTab("chat")}
          className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${currentTab === "chat"
            ? "bg-secondary-container text-on-secondary-container font-semibold"
            : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === "chat" ? "'FILL' 1" : "'FILL' 0" }}>smart_toy</span>
          <span className="font-label-sm text-[10px]">Chat IA</span>
        </button>

        <button
          onClick={() => setCurrentTab("historial")}
          className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${currentTab === "historial"
            ? "bg-secondary-container text-on-secondary-container font-semibold"
            : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === "historial" ? "'FILL' 1" : "'FILL' 0" }}>history</span>
          <span className="font-label-sm text-[10px]">Historial</span>
        </button>
      </nav>

      {/* EDIT/CREATE MODAL DIALOGUE */}
      {isModalOpen && (selectedPrinter || isCreateMode) && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity" onClick={handleCloseEditModal}></div>

          {/* Modal Container */}
          <form
            onSubmit={handleSavePrinterChanges}
            className="absolute bottom-0 left-0 w-full bg-surface rounded-t-3xl p-6 shadow-2xl transition-transform max-w-lg mx-auto left-1/2 -translate-x-1/2 flex flex-col max-h-[85vh] overflow-y-auto scrollbar-hide border border-outline-variant/30"
          >
            <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mb-6 shrink-0"></div>

            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h2 className="font-headline-lg text-lg text-primary font-bold">
                  {isCreateMode ? "Registrar Nueva Impresora" : "Editar Lectura"}
                </h2>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {!isCreateMode && selectedPrinter && (
                    <>
                      <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">S/N: {selectedPrinter.id_serie}</span>
                      <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">{selectedPrinter.modelo}</span>
                    </>
                  )}
                  {isCreateMode && (
                    <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">{editModelo}</span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                    editFuncionamiento === "Inoperativo"
                      ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                      : editFuncionamiento === "Advertencia"
                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    }`}>
                    <span className="material-symbols-outlined text-[11px]">
                      {editFuncionamiento === "Inoperativo" ? "cancel" : editFuncionamiento === "Advertencia" ? "warning" : "check_circle"}
                    </span>
                    {editFuncionamiento} {editFuncionamiento !== "Inoperativo" ? ((editUbicacion || "Hospital") === "Hospital" && !(editArea || "").toLowerCase().includes("soporte") ? " • En Servicio" : " • Sin Servicio") : ""}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high active:scale-90"
                onClick={handleCloseEditModal}
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-4 mb-6 flex-grow">
              {isCreateMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Número de Serie</label>
                    <input
                      type="text"
                      value={editIdSerie}
                      onChange={(e) => setEditIdSerie(e.target.value)}
                      className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm uppercase"
                      placeholder="Ej. 701924410D8X7"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Modelo</label>
                    <select
                      value={editModelo}
                      onChange={(e) => setEditModelo(e.target.value)}
                      className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm text-on-surface"
                    >
                      <option value="MX431ADN">MX431ADN</option>
                      <option value="MX632ADWE">MX632ADWE</option>
                      <option value="MX722ADHE">MX722ADHE</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Área de Ubicación</label>
                  <input
                    type="text"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm"
                    placeholder="Ej. Soporte, Admisión..."
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Ubicación Física</label>
                  <select
                    value={editUbicacion}
                    onChange={(e) => setEditUbicacion(e.target.value)}
                    className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm text-on-surface"
                  >
                    <option value="Hospital">Hospital</option>
                    <option value="MUR">MUR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">% Tóner</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editToner}
                      onChange={(e) => setEditToner(Number(e.target.value))}
                      className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 pr-8 focus:ring-primary focus:border-primary font-body-md text-xs"
                      required
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline font-bold text-[10px]">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">% U. Imagen</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editUnit}
                      onChange={(e) => setEditUnit(Number(e.target.value))}
                      className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 pr-8 focus:ring-primary focus:border-primary font-body-md text-xs"
                      required
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline font-bold text-[10px]">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">% Kit Mant.</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editMantenimiento}
                      onChange={(e) => setEditMantenimiento(Number(e.target.value))}
                      className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 pr-8 focus:ring-primary focus:border-primary font-body-md text-xs"
                      required
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline font-bold text-[10px]">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Código de Caso CAS</label>
                <input
                  type="text"
                  value={editCasCode}
                  onChange={(e) => setEditCasCode(e.target.value)}
                  className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm"
                  placeholder="Ej. CAS-6013278-V6N2C5 (Opcional)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">Observaciones</label>
                <textarea
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm resize-none h-16"
                  placeholder="Notas o fallas (Ej. Se traba papel...)"
                />
              </div>

              {/* Operational Status Override Controls */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[11.5px] font-bold text-outline uppercase tracking-wider">
                    Estado de Funcionamiento
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-primary select-none">
                    <input
                      type="checkbox"
                      checked={editFuncionamientoAuto}
                      onChange={(e) => setEditFuncionamientoAuto(e.target.checked)}
                      className="rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    Auto-calcular
                  </label>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={editFuncionamientoAuto}
                    onClick={() => setEditFuncionamiento("Operativo")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      editFuncionamiento === "Operativo"
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 font-extrabold"
                        : "bg-surface text-on-surface-variant border-outline-variant opacity-60"
                    } ${editFuncionamientoAuto ? "cursor-not-allowed opacity-50 bg-emerald-500/5 border-emerald-500/10 text-emerald-600/70" : "active:scale-[0.98]"}`}
                  >
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                    Operativo
                  </button>
                  <button
                    type="button"
                    disabled={editFuncionamientoAuto}
                    onClick={() => setEditFuncionamiento("Advertencia")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      editFuncionamiento === "Advertencia"
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-700 font-extrabold"
                        : "bg-surface text-on-surface-variant border-outline-variant opacity-60"
                    } ${editFuncionamientoAuto ? "cursor-not-allowed opacity-50 bg-amber-500/5 border-amber-500/10 text-amber-600/70" : "active:scale-[0.98]"}`}
                  >
                    <span className="material-symbols-outlined text-[15px]">warning</span>
                    Advertencia
                  </button>
                  <button
                    type="button"
                    disabled={editFuncionamientoAuto}
                    onClick={() => setEditFuncionamiento("Inoperativo")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      editFuncionamiento === "Inoperativo"
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-700 font-extrabold"
                        : "bg-surface text-on-surface-variant border-outline-variant opacity-60"
                    } ${editFuncionamientoAuto ? "cursor-not-allowed opacity-50 bg-rose-500/5 border-rose-500/10 text-rose-600/70" : "active:scale-[0.98]"}`}
                  >
                    <span className="material-symbols-outlined text-[15px]">cancel</span>
                    Inoperativo
                  </button>
                </div>
              </div>

              {/* Individual History Timeline in modal */}
              {selectedPrinterHistory.length > 0 && (
                <div className="pt-4 border-t border-outline-variant/30 space-y-2">
                  <h4 className="text-[11px] font-bold text-outline uppercase tracking-wider">Historial Reciente del Equipo</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                    {selectedPrinterHistory.map((hist) => (
                      <div key={hist.id} className="bg-surface-container-low p-3 rounded-xl text-[11px] border border-outline-variant/20 space-y-1.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {String(hist.tipo_actualizacion || "").toLowerCase().includes("ia") || String(hist.tipo_actualizacion || "").toLowerCase().includes("gemini") ? (
                              <span className="flex items-center gap-0.5 text-[8px] bg-primary-fixed text-primary px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                <span className="material-symbols-outlined text-[10px]">smart_toy</span>
                                IA
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[8px] bg-outline-variant/30 text-on-surface-variant px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                <span className="material-symbols-outlined text-[10px]">person</span>
                                Manual
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border ${
                              (hist.estado_funcionamiento || hist.estado_criticidad) === "Inoperativo" || (hist.estado_funcionamiento || hist.estado_criticidad) === "Crítico"
                                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                : (hist.estado_funcionamiento || hist.estado_criticidad) === "Advertencia"
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              }`}>
                              {hist.estado_funcionamiento || hist.estado_criticidad || "Operativo"}
                            </span>
                            <span className="text-[10px] text-outline font-medium">
                              {hist.tipo_actualizacion || "Manual"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-outline font-mono font-medium text-right">
                              {hist.fecha_lectura?.toDate 
                                ? `${hist.fecha_lectura.toDate().toLocaleDateString("es-PE")} ${hist.fecha_lectura.toDate().toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}` 
                                : hist.fecha_lectura 
                                  ? `${new Date(hist.fecha_lectura).toLocaleDateString("es-PE")} ${new Date(hist.fecha_lectura).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}`
                                  : ""
                              }
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteHistoryItem(hist.id)}
                              className="text-error hover:bg-error/10 p-0.5 rounded-full transition-colors active:scale-90 flex items-center justify-center"
                              title="Eliminar de historial"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Change details */}
                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-outline-variant/20 text-xs">
                          <div>
                            <span className="text-[9px] font-bold text-outline block uppercase">Niveles Registrados</span>
                            <span className="font-semibold text-on-surface">
                              Tóner: <span className={hist.toner_nivel <= 15 ? "text-error" : "text-primary"}>{hist.toner_nivel}%</span> | 
                              Unidad: <span className={hist.unidad_imagen_nivel <= 15 ? "text-error" : "text-secondary"}>{hist.unidad_imagen_nivel}%</span> | 
                              Kit: <span className={(hist.mantenimiento_kit_nivel ?? 100) <= 15 ? "text-error" : "text-tertiary"}>{hist.mantenimiento_kit_nivel ?? 100}%</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-outline block uppercase">Ubicación y Área</span>
                            <span className="font-semibold text-on-surface">
                              {hist.ubicacion_entidad || "Hospital"}{hist.area_actual ? ` - ${hist.area_actual}` : ""}
                            </span>
                          </div>
                        </div>

                        {hist.codigo_caso_cas && (
                          <div className="text-[9px] font-bold text-primary bg-primary-fixed/40 px-1.5 py-0.5 rounded w-fit">
                            CAS: {hist.codigo_caso_cas}
                          </div>
                        )}

                        {hist.observaciones && (
                          <p className="text-[10px] italic text-on-surface-variant bg-surface-container-high/50 px-2 py-1 rounded border border-dashed border-outline-variant/30 leading-snug">
                            <strong>Obs:</strong> {hist.observaciones}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pb-8 shrink-0">
              <div className="flex gap-3">
                {!isCreateMode && (
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={handleDeletePrinter}
                    className="flex-1 py-3.5 bg-error-container text-on-error-container border border-error/20 font-bold rounded-2xl active:scale-95 transition-all hover:bg-error-container/80 text-sm flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Eliminar</span>
                  </button>
                )}
                <button
                  type="button"
                  className="flex-1 py-3.5 border border-outline-variant text-on-surface-variant font-bold rounded-2xl active:scale-95 transition-all hover:bg-surface-container-low text-sm"
                  onClick={handleCloseEditModal}
                >
                  Cancelar
                </button>
              </div>
              <button
                type="submit"
                disabled={savingEdit}
                className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-2xl shadow-lg active:scale-95 hover:bg-primary-container transition-all text-sm flex items-center justify-center gap-1.5"
              >
                {savingEdit ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span>Guardar Cambios</span>
                    <span className="material-symbols-outlined text-sm">save</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXCEL IMPORT PREVIEW MODAL */}
      {isExcelImportModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => { if (!isExcelLoading) setIsExcelImportModalOpen(false); }}></div>

          {/* Modal Container */}
          <div className="absolute bottom-0 left-0 w-full bg-surface rounded-t-3xl p-6 shadow-2xl transition-transform max-w-lg mx-auto left-1/2 -translate-x-1/2 flex flex-col max-h-[90vh] overflow-hidden border border-outline-variant/30">
            <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mb-6 shrink-0"></div>

            <div className="flex justify-between items-center mb-4 shrink-0">
              <div>
                <h2 className="font-headline-lg text-lg text-primary font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary">upload_file</span>
                  Importar Inventario Excel
                </h2>
                <p className="text-xs text-outline font-semibold truncate max-w-[280px]">Archivo: {excelFileName}</p>
              </div>
              {!isExcelLoading && (
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-high active:scale-90"
                  onClick={() => setIsExcelImportModalOpen(false)}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1 pb-4">
              {isExcelLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <span className="material-symbols-outlined text-primary text-5xl animate-spin">sync</span>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-on-surface">Analizando con Gemini AI...</p>
                    <p className="text-xs text-outline">Leyendo celdas, normalizando áreas y clasificando criticidad en tiempo real.</p>
                  </div>
                </div>
              ) : excelData ? (
                <div className="space-y-4">
                  {/* AI Report Card */}
                  <div className="p-4 bg-primary-fixed-dim/20 border border-primary/20 rounded-2xl space-y-2">
                    <h3 className="text-xs font-bold text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm animate-pulse-subtle">smart_toy</span>
                      Análisis de la IA
                    </h3>
                    <div className="text-xs text-on-surface-variant whitespace-pre-line leading-relaxed italic bg-surface/50 p-3 rounded-xl border border-outline-variant/20 max-h-40 overflow-y-auto">
                      {excelData.reporte_resumen}
                    </div>
                  </div>

                  {/* Table Preview */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-outline uppercase tracking-wider">Vista Previa de Equipos ({excelData.equipos_normalizados?.length || 0})</h3>
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {excelData.equipos_normalizados?.map((eq) => (
                        <div key={eq.id_serie} className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl flex justify-between items-center text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-on-surface">{eq.modelo}</span>
                              <span className="text-[10px] text-outline font-mono">S/N: {eq.id_serie}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                              <span className="material-symbols-outlined text-[10px]">
                                {eq.ubicacion_entidad === "Hospital" ? "local_hospital" : "corporate_fare"}
                              </span>
                              <span>{eq.ubicacion_entidad} ({eq.area_actual})</span>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div className="text-[10px] font-semibold text-outline text-right">
                              <div>T: {eq.toner_nivel}%</div>
                              <div>U: {eq.unidad_imagen_nivel}%</div>
                              <div>K: {eq.mantenimiento_kit_nivel ?? 100}%</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase shrink-0 ${(eq.estado_funcionamiento || eq.estado_criticidad) === "Inoperativo" || (eq.estado_funcionamiento || eq.estado_criticidad) === "Crítico"
                              ? "bg-error-container text-error border-error/20"
                              : (eq.estado_funcionamiento || eq.estado_criticidad) === "Advertencia"
                                ? "bg-tertiary-fixed text-tertiary border-tertiary/20"
                                : "bg-green-100 text-green-800 border-green-200"
                              }`}>
                              {eq.estado_funcionamiento || eq.estado_criticidad || "Operativo"} {((eq.estado_funcionamiento || eq.estado_criticidad) !== "Inoperativo" && (eq.estado_funcionamiento || eq.estado_criticidad) !== "Crítico") ? ((eq.ubicacion_entidad || "Hospital") === "Hospital" && !(eq.area_actual || "").toLowerCase().includes("soporte") ? " • En Servicio" : " • Sin Servicio") : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-outline text-xs">
                  Ocurrió un error al cargar los datos del archivo Excel.
                </div>
              )}
            </div>

            {/* Actions */}
            {!isExcelLoading && excelData && (
              <div className="flex gap-3 pb-4 shrink-0 border-t border-outline-variant/20 pt-4 bg-surface">
                <button
                  type="button"
                  className="flex-1 py-3 border border-outline-variant text-on-surface-variant font-bold rounded-xl active:scale-95 transition-all text-xs"
                  onClick={() => setIsExcelImportModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExcelImport}
                  className="flex-[2] py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg active:scale-95 hover:bg-primary-container transition-all text-xs flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  <span>Confirmar e Importar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STOCK SUBTRACTION CONFIRMATION MODAL */}
      {stockModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setStockModal(prev => ({ ...prev, isOpen: false }))}></div>

          {/* Modal Container */}
          <div className="absolute bottom-0 left-0 w-full bg-surface rounded-t-3xl p-6 shadow-2xl transition-transform max-w-lg mx-auto left-1/2 -translate-x-1/2 flex flex-col max-h-[85vh] overflow-hidden border border-outline-variant/30 animate-fade-in">
            <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mb-6 shrink-0"></div>

            <div className="flex justify-between items-center mb-4 shrink-0">
              <div>
                <h2 className="font-headline-lg text-lg text-primary font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary">inventory_2</span>
                  Descontar Repuesto de Stock
                </h2>
                <p className="text-xs text-outline font-semibold">
                  Modelo: {stockModal.modelo} | Tipo: {stockModal.insumo} ({stockModal.origin})
                </p>
              </div>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-high active:scale-90"
                onClick={() => setStockModal(prev => ({ ...prev, isOpen: false }))}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="space-y-4 mb-6 flex-grow overflow-y-auto pr-1">
              <div className="p-4 bg-primary-fixed-dim/20 border border-primary/20 rounded-2xl text-xs text-on-surface-variant leading-relaxed">
                Vas a reducir el stock de <strong>{stockModal.insumo}</strong> en 1 unidad (quedarán <strong>{stockModal.currentValue - 1}</strong>).
                <br /><br />
                Si este repuesto se va a instalar en una impresora del inventario, selecciónala a continuación para <strong>restaurar su nivel al 100%</strong> y registrar el cambio en su historial de forma automática.
              </div>

              {/* Printer Selection Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                  Asociar a Impresora ({stockModal.modelo})
                </label>
                <select
                  value={stockTargetPrinterId}
                  onChange={(e) => setStockTargetPrinterId(e.target.value)}
                  className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 focus:ring-primary focus:border-primary font-body-md text-sm text-on-surface"
                >
                  <option value="">-- Seleccionar impresora (opcional) --</option>
                  <option value="none">Ninguna (Solo descontar del stock)</option>
                  {printers
                    .filter(p => (p.modelo || "").toUpperCase() === stockModal.modelo.toUpperCase())
                    .map(p => {
                      let levelText = "";
                      if (stockModal.field.startsWith("toner")) {
                        levelText = `Tóner: ${p.consumibles?.toner_nivel ?? 100}%`;
                      } else if (stockModal.field.startsWith("unidad")) {
                        levelText = `U. Imagen: ${p.consumibles?.unidad_imagen_nivel ?? 100}%`;
                      } else if (stockModal.field.startsWith("mantenimiento")) {
                        levelText = `Kit: ${p.consumibles?.mantenimiento_kit_nivel ?? 100}%`;
                      }

                      return (
                        <option key={p.id_serie} value={p.id_serie}>
                          S/N: {p.id_serie} - {p.area_actual || "Soporte"} ({levelText})
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-4 shrink-0 border-t border-outline-variant/20 pt-4 bg-surface">
              <button
                type="button"
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant font-bold rounded-xl active:scale-95 transition-all text-xs"
                onClick={() => setStockModal(prev => ({ ...prev, isOpen: false }))}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingStock}
                onClick={handleConfirmStockReduction}
                className="flex-[2] py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg active:scale-95 hover:bg-primary-container disabled:opacity-50 transition-all text-xs flex items-center justify-center gap-1"
              >
                {savingStock ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">remove_circle</span>
                    <span>Confirmar Descuento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
