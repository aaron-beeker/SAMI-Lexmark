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
  query
} from "firebase/firestore";
import { db } from "./firebase";
import { seedPrintersIfEmpty } from "./services/SeedService";
import { calcularFechasPredictivas } from "./services/PredictionService";
import { analizarEvidenciaSuministros } from "./services/GeminiService";

export default function App() {
  // Navigation & UI tabs
  const [currentTab, setCurrentTab] = useState("dashboard"); // dashboard, inventario, chat, historial, settings
  
  // Printers Firestore State
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(true);
  
  // Search & Filter State
  const [searchText, setSearchText] = useState("");
  const [filterCriticidad, setFilterCriticidad] = useState("all");
  
  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [editArea, setEditArea] = useState("");
  const [editToner, setEditToner] = useState(100);
  const [editUnit, setEditUnit] = useState(100);
  const [editCriticidad, setEditCriticidad] = useState("Estable");
  const [editObservaciones, setEditObservaciones] = useState("");
  const [editCasCode, setEditCasCode] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
  const chatEndRef = useRef(null);

  // Gemini API Key config
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem("sami_gemini_api_key") || "");
  const [showSettingsSaved, setShowSettingsSaved] = useState(false);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Seeding and Firestore Sync
  useEffect(() => {
    const initApp = async () => {
      try {
        await seedPrintersIfEmpty(db);
      } catch (err) {
        console.error("Error in seed initialization:", err);
      }
      
      // Setup Realtime Sync
      const printersColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "impresoras");
      const unsubscribe = onSnapshot(printersColRef, (snapshot) => {
        const printerList = [];
        snapshot.forEach((doc) => {
          printerList.push({
            id_serie: doc.id,
            ...doc.data()
          });
        });
        setPrinters(printerList);
        setLoadingPrinters(false);

        // Assemble a general history log from the latest readings
        const logs = printerList
          .filter(p => p.consumibles?.ultima_lectura)
          .map(p => {
            const timestamp = p.consumibles.ultima_lectura?.toDate ? p.consumibles.ultima_lectura.toDate() : new Date(p.consumibles.ultima_lectura);
            return {
              id_serie: p.id_serie,
              modelo: p.modelo,
              area_actual: p.area_actual,
              toner_nivel: p.consumibles.toner_nivel,
              unidad_imagen_nivel: p.consumibles.unidad_imagen_nivel,
              estado_criticidad: p.estado_criticidad,
              observaciones: p.observaciones,
              timestamp
            };
          })
          .sort((a, b) => b.timestamp - a.timestamp);
        setGeneralHistory(logs);
      }, (error) => {
        console.error("Firestore onSnapshot error:", error);
        setLoadingPrinters(false);
      });

      return () => unsubscribe();
    };

    initApp();
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

  // Compute KPI values
  const kpiTotal = printers.length;
  const kpiCritical = printers.filter(p => p.estado_criticidad === "Crítico").length;
  const kpiUpcoming = printers.filter(p => {
    const toner = p.consumibles?.toner_nivel ?? 100;
    const unit = p.consumibles?.unidad_imagen_nivel ?? 100;
    return toner <= 15 || unit <= 15;
  }).length;

  // Save Settings API Key
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem("sami_gemini_api_key", apiKeyInput);
    setShowSettingsSaved(true);
    setTimeout(() => setShowSettingsSaved(false), 3000);
  };

  // Open Edit Modal with Pre-populated data
  const handleOpenEditModal = (printer) => {
    setSelectedPrinter(printer);
    setEditArea(printer.area_actual || "");
    setEditToner(printer.consumibles?.toner_nivel ?? 100);
    setEditUnit(printer.consumibles?.unidad_imagen_nivel ?? 100);
    setEditCriticidad(printer.estado_criticidad || "Estable");
    setEditObservaciones(printer.observaciones || "");
    setEditCasCode(printer.codigo_caso_cas || "");
    setIsModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsModalOpen(false);
    setSelectedPrinter(null);
  };

  // Helper to determine status based on toner/unit levels
  const calculateCriticidad = (toner, unit) => {
    if (toner === 0 || unit === 0) return "Crítico";
    if (toner <= 15 || unit <= 15) return "Advertencia";
    return "Estable";
  };

  // Submit Edit Modal Changes to Firestore
  const handleSavePrinterChanges = async (e) => {
    e.preventDefault();
    if (!selectedPrinter) return;

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

      const computedCrit = calculateCriticidad(Number(editToner), Number(editUnit));
      const prediction = calcularFechasPredictivas(Number(editToner), Number(editUnit));
      
      const updateData = {
        area_actual: editArea,
        codigo_caso_cas: editCasCode,
        estado_criticidad: computedCrit,
        observaciones: editObservaciones,
        "consumibles.toner_nivel": Number(editToner),
        "consumibles.unidad_imagen_nivel": Number(editUnit),
        "consumibles.ultima_lectura": new Date(),
        prediccion: prediction
      };

      await updateDoc(docRef, updateData);

      // Save to History subcollection
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

      await addDoc(historyColRef, {
        toner_nivel: Number(editToner),
        unidad_imagen_nivel: Number(editUnit),
        estado_criticidad: computedCrit,
        observaciones: editObservaciones,
        codigo_caso_cas: editCasCode,
        fecha_lectura: new Date(),
        tipo_actualizacion: "Manual"
      });

      handleCloseEditModal();
    } catch (error) {
      console.error("Error saving printer updates:", error);
      alert("Error al guardar cambios: " + error.message);
    } finally {
      setSavingEdit(false);
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
    if (!chatInput.trim() && !chatImage) return;

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

      if (!result.id_serie) {
        throw new Error("La IA no pudo determinar el Número de Serie del dispositivo.");
      }

      // Check if printer exists in our seeded database
      const matchedPrinter = printers.find(p => p.id_serie.toLowerCase() === result.id_serie.toLowerCase());

      if (!matchedPrinter) {
        // We will create the printer if it doesn't exist, or log it
        throw new Error(`El número de serie ${result.id_serie} no está registrado en el inventario actual.`);
      }

      // Calculate new prediction dates
      const tonerVal = result.toner_nivel ?? matchedPrinter.consumibles?.toner_nivel ?? 100;
      const unitVal = result.unidad_imagen_nivel ?? matchedPrinter.consumibles?.unidad_imagen_nivel ?? 100;
      const prediction = calcularFechasPredictivas(tonerVal, unitVal);

      // Perform update on Firestore
      const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", matchedPrinter.id_serie);
      
      const updateData = {
        estado_criticidad: result.estado_criticidad || calculateCriticidad(tonerVal, unitVal),
        observaciones: result.observaciones || matchedPrinter.observaciones,
        "consumibles.toner_nivel": tonerVal,
        "consumibles.unidad_imagen_nivel": unitVal,
        "consumibles.ultima_lectura": new Date(),
        prediccion: prediction
      };

      await updateDoc(docRef, updateData);

      // Write to subcollection audit history
      const historyColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", matchedPrinter.id_serie, "historial_lecturas");
      await addDoc(historyColRef, {
        toner_nivel: tonerVal,
        unidad_imagen_nivel: unitVal,
        estado_criticidad: result.estado_criticidad || calculateCriticidad(tonerVal, unitVal),
        observaciones: result.observaciones || matchedPrinter.observaciones,
        codigo_caso_cas: matchedPrinter.codigo_caso_cas || "",
        fecha_lectura: new Date(),
        tipo_actualizacion: "Gemini AI"
      });

      // Add AI Response message
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `He procesado tu reporte. La base de datos Firestore ha sido actualizada exitosamente para el equipo **${matchedPrinter.modelo}** (S/N: ${matchedPrinter.id_serie}) en el área **${matchedPrinter.area_actual}**. 

**Valores extraídos:**
- Nivel de Tóner: ${tonerVal}% (Autonomía: ${prediction.dias_restantes_toner} días, Cambio est.: ${prediction.fecha_cambio_toner})
- Unidad de Imagen: ${unitVal}% (Autonomía: ${prediction.dias_restantes_unidad} días, Cambio est.: ${prediction.fecha_cambio_unidad})
- Criticidad: ${result.estado_criticidad}
- Notas: "${result.observaciones || 'Sin observaciones'}"`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

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
    return matchesSearch && p.estado_criticidad === filterCriticidad;
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
              <div className="col-span-2 p-5 bg-surface border border-outline-variant rounded-2xl shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-primary/10 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-6xl">print</span>
                </div>
                <p className="text-on-surface-variant font-medium">Total Impresoras</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-primary">{loadingPrinters ? "..." : kpiTotal}</span>
                  <span className="text-primary/60 text-xs font-semibold">Equipos Activos</span>
                </div>
              </div>
              
              <div 
                onClick={() => {
                  setFilterCriticidad("Crítico");
                  setCurrentTab("inventario");
                }}
                className="p-5 bg-error-container border border-error/20 rounded-2xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.97]"
              >
                <p className="text-error font-semibold flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-sm">error</span>
                  Alertas Críticas
                </p>
                <span className="text-3xl font-extrabold text-on-error-container">{loadingPrinters ? "..." : kpiCritical}</span>
              </div>
              
              <div 
                onClick={() => {
                  setFilterCriticidad("Advertencia");
                  setCurrentTab("inventario");
                }}
                className="p-5 bg-tertiary-fixed border border-tertiary/20 rounded-2xl shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-[0.97]"
              >
                <p className="text-tertiary font-semibold flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  Próximos Cambios
                </p>
                <span className="text-3xl font-extrabold text-on-tertiary-fixed">{loadingPrinters ? "..." : kpiUpcoming}</span>
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
                ) : printers.filter(p => p.estado_criticidad !== "Estable").length === 0 ? (
                  <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
                    <p className="font-semibold">Todos los suministros están estables</p>
                  </div>
                ) : (
                  printers
                    .filter(p => p.estado_criticidad !== "Estable")
                    .slice(0, 3)
                    .map((printer) => (
                      <div 
                        key={printer.id_serie}
                        onClick={() => handleOpenEditModal(printer)}
                        className={`p-4 border rounded-2xl shadow-sm space-y-3 cursor-pointer hover:bg-surface-container-low transition-colors active:scale-[0.98] ${
                          printer.estado_criticidad === "Crítico" 
                            ? "bg-error-container/10 border-error/20" 
                            : "bg-surface-container-lowest border-outline-variant"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              printer.estado_criticidad === "Crítico" 
                                ? "bg-error-container text-error" 
                                : "bg-surface-variant text-outline"
                            }`}>
                              ID: {printer.id_serie}
                            </span>
                            <h3 className="font-bold text-base mt-1 text-on-background">{printer.modelo}</h3>
                            <p className="text-xs text-on-surface-variant">Área: {printer.area_actual}</p>
                          </div>
                          
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            printer.estado_criticidad === "Crítico" 
                              ? "bg-error-container text-error border-error/20 animate-pulse-subtle" 
                              : "bg-tertiary-fixed text-tertiary border-tertiary/20"
                          }`}>
                            {printer.estado_criticidad === "Crítico" ? "Crítico" : "Bajo Suministro"}
                          </span>
                        </div>

                        {/* Progress Indicators */}
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline-variant/30">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-outline">% TÓNER</span>
                              <span className={printer.consumibles.toner_nivel <= 15 ? "text-error" : "text-outline"}>
                                {printer.consumibles.toner_nivel}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  printer.consumibles.toner_nivel <= 15 ? "bg-error" : "bg-primary"
                                }`} 
                                style={{ width: `${printer.consumibles.toner_nivel}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-outline">% UNID. IMAG.</span>
                              <span className={printer.consumibles.unidad_imagen_nivel <= 15 ? "text-error" : "text-outline"}>
                                {printer.consumibles.unidad_imagen_nivel}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  printer.consumibles.unidad_imagen_nivel <= 15 ? "bg-error" : "bg-secondary"
                                }`} 
                                style={{ width: `${printer.consumibles.unidad_imagen_nivel}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
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
          </div>
        )}

        {/* VIEW: INVENTARIO */}
        {currentTab === "inventario" && (
          <div className="space-y-5 animate-fade-in">
            {/* Header and filters */}
            <div className="space-y-3">
              <h2 className="font-headline-md text-xl text-on-background font-bold">Inventario de Impresoras</h2>
              
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
                    { id: "Estable", label: "Estables" },
                    { id: "Advertencia", label: "Advertencia" },
                    { id: "Crítico", label: "Críticas" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterCriticidad(tab.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${
                        filterCriticidad === tab.id
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
                          <div className="flex gap-1 items-center">
                            <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">
                              S/N: {printer.id_serie}
                            </span>
                            {printer.codigo_caso_cas && (
                              <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary-fixed rounded-md max-w-[120px] truncate" title={printer.codigo_caso_cas}>
                                CAS: {printer.codigo_caso_cas}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-base mt-1 text-on-background">{printer.modelo}</h3>
                          <p className="text-xs text-on-surface-variant">Área: {printer.area_actual}</p>
                        </div>
                        
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          printer.estado_criticidad === "Crítico" 
                            ? "bg-error-container text-error border-error/20 animate-pulse-subtle" 
                            : printer.estado_criticidad === "Advertencia"
                            ? "bg-tertiary-fixed text-tertiary border-tertiary/20"
                            : "bg-green-100 text-green-800 border-green-200"
                        }`}>
                          {printer.estado_criticidad === "Crítico" 
                            ? "Crítico" 
                            : printer.estado_criticidad === "Advertencia" 
                            ? "Advertencia" 
                            : "Estable"}
                        </span>
                      </div>

                      {/* Consumable Levels */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline-variant/30">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-outline">% TÓNER</span>
                            <span className={toner <= 15 ? "text-error" : "text-outline"}>
                              {toner}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                toner <= 15 ? "bg-error" : "bg-primary"
                              }`} 
                              style={{ width: `${toner}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-outline">% UNID. IMAG.</span>
                            <span className={unit <= 15 ? "text-error" : "text-outline"}>
                              {unit}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                unit <= 15 ? "bg-error" : "bg-secondary"
                              }`} 
                              style={{ width: `${unit}%` }}
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
              <span className="text-[10px] font-label-sm opacity-80 uppercase tracking-widest">Gemini 2.5 Flash</span>
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
                
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    className="hidden" 
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-secondary-container text-on-secondary-container rounded-xl font-bold text-sm hover:bg-secondary-container/80 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">add_a_photo</span>
                    Adjuntar Foto
                  </button>
                  <button 
                    type="submit"
                    disabled={(!chatInput.trim() && !chatImage) || isChatLoading}
                    className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary-container disabled:opacity-50 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
                  >
                    <span>Enviar</span>
                    <span className="material-symbols-outlined text-sm">send</span>
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
                generalHistory.map((log, idx) => (
                  <div 
                    key={idx}
                    className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-on-background">{log.modelo}</h4>
                        <p className="text-[10px] text-outline font-mono">S/N: {log.id_serie}</p>
                      </div>
                      <span className="text-[10px] text-outline font-medium">
                        {log.timestamp.toLocaleDateString("es-PE")} {log.timestamp.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/30 text-xs">
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
                        <span className="text-[9px] font-bold text-outline block uppercase">Criticidad</span>
                        <span className={`font-semibold ${
                          log.estado_criticidad === "Crítico" ? "text-error" : log.estado_criticidad === "Advertencia" ? "text-tertiary" : "text-green-600"
                        }`}>
                          {log.estado_criticidad}
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
                ))
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
                <p><strong>Modelo IA:</strong> gemini-2.5-flash-preview-09-2025</p>
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
          className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${
            currentTab === "dashboard" 
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
          className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${
            currentTab === "inventario" 
              ? "bg-secondary-container text-on-secondary-container font-semibold" 
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === "inventario" ? "'FILL' 1" : "'FILL' 0" }}>inventory_2</span>
          <span className="font-label-sm text-[10px]">Inventario</span>
        </button>
        
        <button 
          onClick={() => setCurrentTab("chat")}
          className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${
            currentTab === "chat" 
              ? "bg-secondary-container text-on-secondary-container font-semibold" 
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === "chat" ? "'FILL' 1" : "'FILL' 0" }}>smart_toy</span>
          <span className="font-label-sm text-[10px]">Chat IA</span>
        </button>
        
        <button 
          onClick={() => setCurrentTab("historial")}
          className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${
            currentTab === "historial" 
              ? "bg-secondary-container text-on-secondary-container font-semibold" 
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === "historial" ? "'FILL' 1" : "'FILL' 0" }}>history</span>
          <span className="font-label-sm text-[10px]">Historial</span>
        </button>
      </nav>

      {/* EDIT MODAL DIALOGUE */}
      {isModalOpen && selectedPrinter && (
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
                <h2 className="font-headline-lg text-lg text-primary font-bold">Editar Lectura</h2>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">ID: {selectedPrinter.id_serie}</span>
                  <span className="text-[10px] font-bold text-outline px-2 py-0.5 bg-surface-variant rounded-md">{selectedPrinter.modelo}</span>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">% Tóner</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={editToner}
                      onChange={(e) => setEditToner(Number(e.target.value))}
                      className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 pr-10 focus:ring-primary focus:border-primary font-body-md text-sm"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-outline font-bold text-xs">%</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-outline ml-1 uppercase tracking-wider">% Unidad Imagen</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={editUnit}
                      onChange={(e) => setEditUnit(Number(e.target.value))}
                      className="w-full bg-surface-container-low border-outline-variant rounded-xl p-3 pr-10 focus:ring-primary focus:border-primary font-body-md text-sm"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-outline font-bold text-xs">%</span>
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

              {/* Individual History Timeline in modal */}
              {selectedPrinterHistory.length > 0 && (
                <div className="pt-4 border-t border-outline-variant/30 space-y-2">
                  <h4 className="text-[11px] font-bold text-outline uppercase tracking-wider">Historial Reciente del Equipo</h4>
                  <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                    {selectedPrinterHistory.map((hist, idx) => (
                      <div key={idx} className="bg-surface-container-low p-2 rounded-xl text-[11px] border border-outline-variant/20 flex justify-between items-start">
                        <div className="space-y-0.5">
                          <p>
                            <span className="font-semibold text-primary">T: {hist.toner_nivel}%</span> | <span className="font-semibold text-secondary">U: {hist.unidad_imagen_nivel}%</span>
                          </p>
                          {hist.observaciones && <p className="italic text-on-surface-variant truncate max-w-[200px]">"{hist.observaciones}"</p>}
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] block text-outline font-mono">
                            {hist.fecha_lectura?.toDate ? hist.fecha_lectura.toDate().toLocaleDateString("es-PE") : new Date(hist.fecha_lectura).toLocaleDateString("es-PE")}
                          </span>
                          <span className="text-[8px] bg-primary-fixed/40 px-1 py-0.2 rounded font-bold uppercase tracking-wider text-primary">
                            {hist.tipo_actualizacion || "Manual"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-8 shrink-0">
              <button 
                type="button"
                className="flex-1 py-3.5 border border-outline-variant text-on-surface-variant font-bold rounded-2xl active:scale-95 transition-all hover:bg-surface-container-low text-sm" 
                onClick={handleCloseEditModal}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={savingEdit}
                className="flex-[2] py-3.5 bg-primary text-on-primary font-bold rounded-2xl shadow-lg active:scale-95 hover:bg-primary-container transition-all text-sm flex items-center justify-center gap-1.5"
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
    </div>
  );
}
