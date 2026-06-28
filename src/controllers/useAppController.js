import { useEffect } from "react";
import { db } from "../firebase";
import { seedPrintersIfEmpty, seedRepuestosIfEmpty } from "../services/SeedService";
import { calcularNivelConsumible } from "../services/PredictionService";

import {
  subscribePrinters,
  createPrinter,
  updatePrinter,
  deletePrinterDoc,
  addPrinterHistory
} from "../models/PrinterModel";

import {
  subscribeRepuestos,
  updateStock
} from "../models/StockModel";

import {
  subscribeGeneralHistory
} from "../models/HistoryModel";

// Import custom hooks (SRP)
import { useNavigation } from "./hooks/useNavigation";
import { useSettings } from "./hooks/useSettings";
import { useGeneralHistory } from "./hooks/useGeneralHistory";
import { usePrinters } from "./hooks/usePrinters";
import { useStock } from "./hooks/useStock";
import { useChat } from "./hooks/useChat";
import { useExcelImport } from "./hooks/useExcelImport";
import { useAuth } from "./hooks/useAuth";
import { useBilling } from "./hooks/useBilling";

export function useAppController() {
  const navigation = useNavigation();
  const settings = useSettings();
  const generalHistory = useGeneralHistory();
  const auth = useAuth();

  // Redirect guest if on restricted tab
  useEffect(() => {
    if (!auth.isAuthenticated && navigation.currentTab === "chat") {
      navigation.setCurrentTab("dashboard");
    }
  }, [auth.isAuthenticated, navigation.currentTab]);

  const printers = usePrinters({
    db,
    filterCriticidad: navigation.filterCriticidad,
    addGeneralHistoryLog: generalHistory.addGeneralHistoryLog
  });

  const stock = useStock();
  const chat = useChat();
  const excelImport = useExcelImport();
  const billing = useBilling({ db });

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
      unsubscribePrinters = subscribePrinters(
        db,
        (printerList) => {
          const processedList = printerList.map(p => {
            const isUsb = (p.ip || "").trim().toLowerCase() === "usb";
            const status = printers.getPrinterStatus(p);
            const isEnServicio = status !== "En Mantenimiento" && status !== "Inoperativo";

            if (isUsb && isEnServicio && p.consumibles) {
              return {
                ...p,
                consumibles: {
                  ...p.consumibles,
                  toner_nivel: calcularNivelConsumible(p.consumibles.toner_nivel, p.consumibles.ultima_lectura),
                  unidad_imagen_nivel: calcularNivelConsumible(p.consumibles.unidad_imagen_nivel, p.consumibles.ultima_lectura),
                  mantenimiento_kit_nivel: calcularNivelConsumible(p.consumibles.mantenimiento_kit_nivel, p.consumibles.ultima_lectura)
                }
              };
            }
            return p;
          });

          printers.setPrinters(processedList);
          printers.setLoadingPrinters(false);
        },
        (error) => {
          console.error("Firestore onSnapshot error:", error);
          printers.setLoadingPrinters(false);
        }
      );

      // Setup Realtime Sync for Repuestos
      unsubscribeRepuestos = subscribeRepuestos(
        db,
        (repuestosList) => {
          stock.setRepuestos(repuestosList);
        },
        (error) => {
          console.error("Firestore repuestos onSnapshot error:", error);
        }
      );

      // Setup Realtime Sync for General History Audit Logs
      unsubscribeHistory = subscribeGeneralHistory(
        db,
        (historyList) => {
          generalHistory.setGeneralHistory(historyList);
        },
        (error) => {
          console.error("Firestore general history onSnapshot error:", error);
        }
      );
    };

    initApp();

    return () => {
      if (unsubscribePrinters) unsubscribePrinters();
      if (unsubscribeRepuestos) unsubscribeRepuestos();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, []);



  // Wires up and delegates actions that require cross-hook orchestration
  const handleConfirmStockReduction = () => {
    return stock.handleConfirmStockReduction(
      db,
      printers.printers,
      updatePrinter,
      addPrinterHistory,
      generalHistory.addGeneralHistoryLog,
      printers.calculatePrinterStatus
    );
  };

  const handleConfirmExcelImport = () => {
    return excelImport.handleConfirmExcelImport(
      db,
      printers.printers,
      createPrinter,
      addPrinterHistory,
      generalHistory.addGeneralHistoryLog,
      printers.calculatePrinterStatus,
      chat.setChatMessages,
      navigation.setCurrentTab
    );
  };

  const handleConfirmSend = () => {
    return chat.handleConfirmSend(
      db,
      printers.printers,
      stock.repuestos,
      updateStock,
      createPrinter,
      updatePrinter,
      deletePrinterDoc,
      addPrinterHistory,
      generalHistory.addGeneralHistoryLog,
      printers.calculatePrinterStatus
    );
  };

  const handleSendChatMessage = (e) => {
    return chat.handleSendChatMessage(e, printers.printers);
  };

  const handleCancelSend = () => {
    return chat.handleCancelReviewedData();
  };

  const updateManualStockWrapper = (modelo, field, newValue) => {
    return stock.updateManualStock(
      db,
      modelo,
      field,
      newValue,
      generalHistory.addGeneralHistoryLog
    );
  };

  return {
    // Navigation
    currentTab: navigation.currentTab,
    setCurrentTab: navigation.setCurrentTab,
    filterCriticidad: navigation.filterCriticidad,
    setFilterCriticidad: navigation.setFilterCriticidad,

    // Settings
    showSettingsSaved: settings.showSettingsSaved,
    handleSaveApiKey: settings.handleSaveApiKey,

    // General History
    generalHistory: generalHistory.generalHistory,

    // Printers
    printers: printers.printers,
    loadingPrinters: printers.loadingPrinters,
    searchText: printers.searchText,
    setSearchText: printers.setSearchText,
    editingRowId: printers.editingRowId,
    setEditingRowId: printers.setEditingRowId,
    editingRowData: printers.editingRowData,
    setEditingRowData: printers.setEditingRowData,
    copiedSerialId: printers.copiedSerialId,
    handleCopySerial: printers.handleCopySerial,
    isModalOpen: printers.isModalOpen,
    selectedPrinter: printers.selectedPrinter,
    selectedPrinterHistory: printers.selectedPrinterHistory,
    editIdSerie: printers.editIdSerie,
    setEditIdSerie: printers.setEditIdSerie,
    editModelo: printers.editModelo,
    setEditModelo: printers.setEditModelo,
    editArea: printers.editArea,
    setEditArea: printers.setEditArea,
    editToner: printers.editToner,
    setEditToner: printers.setEditToner,
    editUnit: printers.editUnit,
    setEditUnit: printers.setEditUnit,
    editMantenimiento: printers.editMantenimiento,
    setEditMantenimiento: printers.setEditMantenimiento,
    editObservaciones: printers.editObservaciones,
    setEditObservaciones: printers.setEditObservaciones,
    editCasCode: printers.editCasCode,
    setEditCasCode: printers.setEditCasCode,
    editDetalleCaso: printers.editDetalleCaso,
    setEditDetalleCaso: printers.setEditDetalleCaso,
    editUbicacion: printers.editUbicacion,
    setEditUbicacion: printers.setEditUbicacion,
    editFuncionamiento: printers.editFuncionamiento,
    setEditFuncionamiento: printers.setEditFuncionamiento,
    editIp: printers.editIp,
    setEditIp: printers.setEditIp,
    editEstadisticas: printers.editEstadisticas,
    setEditEstadisticas: printers.setEditEstadisticas,
    editFuncionamientoAuto: printers.editFuncionamientoAuto,
    setEditFuncionamientoAuto: printers.setEditFuncionamientoAuto,
    savingEdit: printers.savingEdit,
    isCreateMode: printers.isCreateMode,
    checkPrinterAlerts: printers.checkPrinterAlerts,
    getPrinterStatus: printers.getPrinterStatus,
    isPrinterInoperative: printers.isPrinterInoperative,
    handleOpenEditModal: printers.handleOpenEditModal,
    handleOpenCreateModal: printers.handleOpenCreateModal,
    handleCloseEditModal: printers.handleCloseEditModal,
    handleSavePrinterChanges: printers.handleSavePrinterChanges,
    handleRowDataChange: printers.handleRowDataChange,
    handleRowNestedDataChange: printers.handleRowNestedDataChange,
    handleStartRowEdit: printers.handleStartRowEdit,
    handleSaveRowEdit: printers.handleSaveRowEdit,
    handleRowKeyDown: printers.handleRowKeyDown,
    handleDeletePrinter: printers.handleDeletePrinter,
    handleDeleteHistoryItem: printers.handleDeleteHistoryItem,
    handleDownloadReport: printers.handleDownloadReport,
    filteredPrinters: printers.filteredPrinters,
    kpiTotal: printers.kpiTotal,
    kpiOperativas: printers.kpiOperativas,
    kpiAdvertencias: printers.kpiAdvertencias,
    kpiInoperativas: printers.kpiInoperativas,
    kpiHospitalTotal: printers.kpiHospitalTotal,
    kpiHospitalEnServicio: printers.kpiHospitalEnServicio,
    kpiHospitalEnSoporte: printers.kpiHospitalEnSoporte,
    kpiMurTotal: printers.kpiMurTotal,
    kpiLexmarkTotal: printers.kpiLexmarkTotal,
    currentPage: printers.currentPage,
    setCurrentPage: printers.setCurrentPage,
    totalPages: printers.totalPages,
    paginatedPrinters: printers.paginatedPrinters,

    // Stock
    repuestos: stock.repuestos,
    savingStock: stock.savingStock,
    stockModal: stock.stockModal,
    setStockModal: stock.setStockModal,
    stockTargetPrinterId: stock.stockTargetPrinterId,
    setStockTargetPrinterId: stock.setStockTargetPrinterId,
    updateManualStock: updateManualStockWrapper,
    handleDecrementStockClick: stock.handleDecrementStockClick,
    handleConfirmStockReduction: handleConfirmStockReduction,

    // Chat
    chatMessages: chat.chatMessages,
    setChatMessages: chat.setChatMessages,
    chatInput: chat.chatInput,
    setChatInput: chat.setChatInput,
    pendingAttachments: chat.pendingAttachments,
    showReviewModal: chat.showReviewModal,
    setShowReviewModal: chat.setShowReviewModal,
    editableFields: chat.editableFields,
    setEditableFields: chat.setEditableFields,
    isChatLoading: chat.isChatLoading,
    fileInputRef: chat.fileInputRef,
    pdfInputRef: chat.pdfInputRef,
    cameraInputRef: chat.cameraInputRef,
    chatEndRef: chat.chatEndRef,
    chatTextareaRef: chat.chatTextareaRef,
    addFilesToQueue: chat.addFilesToQueue,
    handleImageChange: chat.handleImageChange,
    handlePdfChange: chat.handlePdfChange,
    removeAttachment: chat.removeAttachment,
    handleChatPaste: chat.handleChatPaste,
    handleSendChatMessage: handleSendChatMessage,
    handleConfirmSend: handleConfirmSend,
    handleCancelSend: handleCancelSend,

    // Excel Import
    excelData: excelImport.excelData,
    isExcelLoading: excelImport.isExcelLoading,
    excelFileName: excelImport.excelFileName,
    isExcelImportModalOpen: excelImport.isExcelImportModalOpen,
    setIsExcelImportModalOpen: excelImport.setIsExcelImportModalOpen,
    excelFileInputRef: excelImport.excelFileInputRef,
    handleExcelUpload: excelImport.handleExcelUpload,
    handleConfirmExcelImport: handleConfirmExcelImport,

    // Auth
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isAuthLoading: auth.loading,
    loginError: auth.loginError,
    setLoginError: auth.setLoginError,
    isLoginModalOpen: auth.isLoginModalOpen,
    setIsLoginModalOpen: auth.setIsLoginModalOpen,
    login: auth.login,
    loginWithGoogle: auth.loginWithGoogle,
    logout: auth.logout,
    admins: auth.admins,
    loadingAdmins: auth.loadingAdmins,
    addAdmin: auth.addAdmin,
    removeAdmin: auth.removeAdmin,
    fetchAdmins: auth.fetchAdmins,

    // Billing
    billingCycles: billing.billingCycles,
    loadingBilling: billing.loadingBilling,
    closeMonth: billing.closeMonth
  };
}
