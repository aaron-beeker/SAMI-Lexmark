import React from "react";
import { useAppController } from "./controllers/useAppController";
import TopAppBar from "./views/TopAppBar";
import Sidebar from "./views/Sidebar";
import DashboardView from "./views/DashboardView";
import InventoryView from "./views/InventoryView";
import ChatView from "./views/ChatView";
import HistoryView from "./views/HistoryView";
import SettingsView from "./views/SettingsView";
import PrinterModal from "./views/PrinterModal";
import StockModal from "./views/StockModal";
import ExcelImportModal from "./views/ExcelImportModal";
import LoginModal from "./views/LoginModal";
import UsersView from "./views/UsersView";

export default function App() {
  const c = useAppController();

  return (
    <div className="bg-background text-on-background h-screen font-body-md text-body-md overflow-hidden flex flex-row">
      {/* Sidebar navigation on Desktop */}
      <Sidebar 
        currentTab={c.currentTab} 
        setCurrentTab={c.setCurrentTab} 
        onOpenCreateModal={c.handleOpenCreateModal} 
        setFilterCriticidad={c.setFilterCriticidad}
        isAuthenticated={c.isAuthenticated}
      />

      {/* Main Panel */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        <TopAppBar 
          currentTab={c.currentTab} 
          setCurrentTab={c.setCurrentTab} 
          isAuthenticated={c.isAuthenticated}
          user={c.user}
          onLoginClick={() => c.setIsLoginModalOpen(true)}
          onLogoutClick={c.logout}
        />

        <main className="flex-grow overflow-y-auto p-4 md:p-8 max-w-lg md:max-w-7xl mx-auto w-full space-y-6 pb-24 md:pb-8">
          {c.currentTab === "dashboard" && (
            <DashboardView
              printers={c.printers}
              loadingPrinters={c.loadingPrinters}
              repuestos={c.repuestos}
              kpiTotal={c.kpiTotal}
              kpiOperativas={c.kpiOperativas}
              kpiAdvertencias={c.kpiAdvertencias}
              kpiInoperativas={c.kpiInoperativas}
              kpiHospitalTotal={c.kpiHospitalTotal}
              kpiHospitalEnServicio={c.kpiHospitalEnServicio}
              kpiHospitalEnSoporte={c.kpiHospitalEnSoporte}
              kpiMurTotal={c.kpiMurTotal}
              getPrinterStatus={c.getPrinterStatus}
              checkPrinterAlerts={c.checkPrinterAlerts}
              setCurrentTab={c.setCurrentTab}
              setFilterCriticidad={c.setFilterCriticidad}
              handleOpenEditModal={c.handleOpenEditModal}
              handleDecrementStockClick={c.handleDecrementStockClick}
              updateManualStock={c.updateManualStock}
              isAuthenticated={c.isAuthenticated}
            />
          )}

          {c.currentTab === "inventario" && (
            <InventoryView
              searchText={c.searchText}
              setSearchText={c.setSearchText}
              filterCriticidad={c.filterCriticidad}
              setFilterCriticidad={c.setFilterCriticidad}
              filteredPrinters={c.filteredPrinters}
              loadingPrinters={c.loadingPrinters}
              isAuthenticated={c.isAuthenticated}
              handleDownloadReport={c.handleDownloadReport}
              handleOpenCreateModal={c.handleOpenCreateModal}
              copiedSerialId={c.copiedSerialId}
              handleCopySerial={c.handleCopySerial}
              editingRowId={c.editingRowId}
              setEditingRowId={c.setEditingRowId}
              editingRowData={c.editingRowData}
              setEditingRowData={c.setEditingRowData}
              handleRowDataChange={c.handleRowDataChange}
              handleRowNestedDataChange={c.handleRowNestedDataChange}
              handleStartRowEdit={c.handleStartRowEdit}
              handleSaveRowEdit={c.handleSaveRowEdit}
              handleRowKeyDown={c.handleRowKeyDown}
              handleOpenEditModal={c.handleOpenEditModal}
              getPrinterStatus={c.getPrinterStatus}
              checkPrinterAlerts={c.checkPrinterAlerts}
              currentPage={c.currentPage}
              setCurrentPage={c.setCurrentPage}
              totalPages={c.totalPages}
              paginatedPrinters={c.paginatedPrinters}
            />
          )}

          {c.currentTab === "chat" && (
            <ChatView
              chatMessages={c.chatMessages}
              isChatLoading={c.isChatLoading}
              chatInput={c.chatInput}
              setChatInput={c.setChatInput}
              pendingAttachments={c.pendingAttachments}
              removeAttachment={c.removeAttachment}
              handleChatPaste={c.handleChatPaste}
              handleSendChatMessage={c.handleSendChatMessage}
              fileInputRef={c.fileInputRef}
              pdfInputRef={c.pdfInputRef}
              cameraInputRef={c.cameraInputRef}
              excelFileInputRef={c.excelFileInputRef}
              chatEndRef={c.chatEndRef}
              chatTextareaRef={c.chatTextareaRef}
              handleImageChange={c.handleImageChange}
              handlePdfChange={c.handlePdfChange}
              handleExcelUpload={c.handleExcelUpload}
              showReviewModal={c.showReviewModal}
              editableFields={c.editableFields}
              setEditableFields={c.setEditableFields}
              handleConfirmSend={c.handleConfirmSend}
              handleCancelSend={c.handleCancelSend}
              printers={c.printers}
            />
          )}

          {c.currentTab === "historial" && (
            <HistoryView 
              loadingPrinters={c.loadingPrinters} 
              generalHistory={c.generalHistory} 
            />
          )}

          {c.currentTab === "usuarios" && c.isAuthenticated && (
            <UsersView
              user={c.user}
              admins={c.admins}
              loadingAdmins={c.loadingAdmins}
              addAdmin={c.addAdmin}
              removeAdmin={c.removeAdmin}
            />
          )}

          {c.currentTab === "settings" && (
            <SettingsView
              apiKeyInput={c.apiKeyInput}
              setApiKeyInput={c.setApiKeyInput}
              openRouterKeyInput={c.openRouterKeyInput}
              setOpenRouterKeyInput={c.setOpenRouterKeyInput}
              showSettingsSaved={c.showSettingsSaved}
              handleSaveApiKey={c.handleSaveApiKey}
            />
          )}
        </main>
      </div>

      {/* Responsive BottomNavBar for mobile devices */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 pb-safe bg-surface border-t border-outline-variant shadow-lg rounded-t-xl max-w-lg mx-auto left-1/2 -translate-x-1/2 md:hidden">
        {[
          { id: "dashboard", label: "Dashboard", icon: "dashboard" },
          { id: "inventario", label: "Inventario", icon: "inventory_2" },
          { id: "chat", label: "Chat IA", icon: "smart_toy" },
          { id: "historial", label: "Historial", icon: "history" },
          { id: "usuarios", label: "Admins", icon: "group" }
        ].filter(tab => (tab.id !== "chat" && tab.id !== "usuarios") || c.isAuthenticated).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "dashboard" || tab.id === "inventario") {
                c.setFilterCriticidad("all");
              }
              c.setCurrentTab(tab.id);
            }}
            className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${
              c.currentTab === tab.id
                ? "bg-secondary-container text-on-secondary-container font-semibold"
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span 
              className="material-symbols-outlined" 
              style={{ fontVariationSettings: c.currentTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className="font-label-sm text-[10px]">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Global Modals */}
      {c.isModalOpen && (c.selectedPrinter || c.isCreateMode) && (
        <PrinterModal
          handleSavePrinterChanges={c.handleSavePrinterChanges}
          handleCloseEditModal={c.handleCloseEditModal}
          selectedPrinter={c.selectedPrinter}
          isCreateMode={c.isCreateMode}
          isAuthenticated={c.isAuthenticated}
          editIdSerie={c.editIdSerie}
          setEditIdSerie={c.setEditIdSerie}
          editModelo={c.editModelo}
          setEditModelo={c.setEditModelo}
          editArea={c.editArea}
          setEditArea={c.setEditArea}
          editUbicacion={c.editUbicacion}
          setEditUbicacion={c.setEditUbicacion}
          editToner={c.editToner}
          setEditToner={c.setEditToner}
          editUnit={c.editUnit}
          setEditUnit={c.setEditUnit}
          editMantenimiento={c.editMantenimiento}
          setEditMantenimiento={c.setEditMantenimiento}
          editObservaciones={c.editObservaciones}
          setEditObservaciones={c.setEditObservaciones}
          editCasCode={c.editCasCode}
          setEditCasCode={c.setEditCasCode}
          editDetalleCaso={c.editDetalleCaso}
          setEditDetalleCaso={c.setEditDetalleCaso}
          editIp={c.editIp}
          setEditIp={c.setEditIp}
          editFuncionamiento={c.editFuncionamiento}
          setEditFuncionamiento={c.setEditFuncionamiento}
          editFuncionamientoAuto={c.editFuncionamientoAuto}
          setEditFuncionamientoAuto={c.setEditFuncionamientoAuto}
          checkPrinterAlerts={c.checkPrinterAlerts}
          selectedPrinterHistory={c.selectedPrinterHistory}
          handleDeleteHistoryItem={c.handleDeleteHistoryItem}
          handleDeletePrinter={c.handleDeletePrinter}
          savingEdit={c.savingEdit}
        />
      )}

      <StockModal
        stockModal={c.stockModal}
        setStockModal={c.setStockModal}
        stockTargetPrinterId={c.stockTargetPrinterId}
        setStockTargetPrinterId={c.setStockTargetPrinterId}
        savingStock={c.savingStock}
        handleConfirmStockReduction={c.handleConfirmStockReduction}
        printers={c.printers}
      />

      <ExcelImportModal
        isExcelImportModalOpen={c.isExcelImportModalOpen}
        excelFileName={c.excelFileName}
        isExcelLoading={c.isExcelLoading}
        excelData={c.excelData}
        handleConfirmExcelImport={c.handleConfirmExcelImport}
        setIsExcelImportModalOpen={c.setIsExcelImportModalOpen}
        setExcelData={c.setExcelData}
        setExcelFileName={c.setExcelFileName}
      />

      <LoginModal
        isOpen={c.isLoginModalOpen}
        onClose={() => c.setIsLoginModalOpen(false)}
        loginWithGoogle={c.loginWithGoogle}
        loginError={c.loginError}
        setLoginError={c.setLoginError}
      />
    </div>

  );
}
