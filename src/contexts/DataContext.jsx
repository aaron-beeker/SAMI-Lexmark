import React, { createContext, useContext, useEffect } from 'react';
import { useUIContext } from './UIContext';
import { useGeneralHistory } from '../controllers/hooks/useGeneralHistory';
import { usePrinters } from '../controllers/hooks/usePrinters';
import { useStock } from '../controllers/hooks/useStock';
import { useChat } from '../controllers/hooks/useChat';
import { useExcelImport } from '../controllers/hooks/useExcelImport';
import { useBilling } from '../controllers/hooks/useBilling';
import { db } from '../firebase';
import { seedPrintersIfEmpty, seedRepuestosIfEmpty } from '../services/SeedService';
import { subscribePrinters, createPrinter, updatePrinter, deletePrinterDoc, addPrinterHistory } from '../models/PrinterModel';
import { subscribeRepuestos, updateStock } from '../models/StockModel';
import { subscribeGeneralHistory } from '../models/HistoryModel';
import { calcularNivelConsumible } from '../services/PredictionService';
import { useNavigate } from 'react-router-dom';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { filterCriticidad } = useUIContext();
  const navigate = useNavigate();
  const generalHistory = useGeneralHistory();
  const printers = usePrinters({
    db,
    filterCriticidad,
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



  const handleConfirmExcelImport = () => {
    return excelImport.handleConfirmExcelImport(
      db,
      printers.printers,
      createPrinter,
      addPrinterHistory,
      generalHistory.addGeneralHistoryLog,
      printers.calculatePrinterStatus,
      chat.setChatMessages,
      navigate
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

  const value = {
    // General History
    generalHistory: generalHistory.generalHistory,

    // Printers
    ...printers,

    // Stock
    repuestos: stock.repuestos,
    savingStock: stock.savingStock,
    stockModal: stock.stockModal,
    setStockModal: stock.setStockModal,
    stockTargetPrinterId: stock.stockTargetPrinterId,
    setStockTargetPrinterId: stock.setStockTargetPrinterId,
    updateManualStock: updateManualStockWrapper,

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

    // Billing
    billingCycles: billing.billingCycles,
    loadingBilling: billing.loadingBilling,
    closeMonth: billing.closeMonth
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};
