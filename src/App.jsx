import React from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "./contexts/AuthContext";
import { useUIContext } from "./contexts/UIContext";
import { useDataContext } from "./contexts/DataContext";

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
import RepuestosView from "./views/RepuestosView";

export default function App() {
  const { isAuthLoading, isAuthenticated, loginWithGoogle, loginError, setLoginError } = useAuthContext();
  const { setFilterCriticidad } = useUIContext();
  const data = useDataContext(); // Solo usamos los estados requeridos para modales globales
  const { isModalOpen, selectedPrinter, isCreateMode, stockModal, isExcelImportModalOpen } = data;

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.replace('/', '') || 'dashboard';

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-on-background">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-background text-on-background h-screen font-body-md text-body-md overflow-hidden flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        <LoginModal
          isOpen={true}
          onClose={() => {}}
          loginWithGoogle={loginWithGoogle}
          loginError={loginError}
          setLoginError={setLoginError}
          hideCloseButton={true}
        />
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background h-screen font-body-md text-body-md overflow-hidden flex flex-row">
      {/* Sidebar navigation on Desktop */}
      <Sidebar />

      {/* Main Panel */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        <TopAppBar />

        <main className="flex-grow overflow-y-auto p-4 md:p-8 max-w-lg md:max-w-7xl mx-auto w-full space-y-6 pb-24 md:pb-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/repuestos" element={<RepuestosView />} />
            <Route path="/inventario" element={<InventoryView />} />
            <Route path="/chat" element={<ChatView />} />
            <Route path="/historial" element={<HistoryView />} />
            <Route path="/usuarios" element={isAuthenticated ? <UsersView /> : <Navigate to="/dashboard" replace />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Responsive BottomNavBar for mobile devices */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 pb-safe bg-surface border-t border-outline-variant shadow-lg rounded-t-xl max-w-lg mx-auto left-1/2 -translate-x-1/2 md:hidden">
        {[
          { id: "dashboard", label: "Dashboard", icon: "dashboard" },
          { id: "inventario", label: "Inventario", icon: "inventory_2" },
          { id: "repuestos", label: "Repuestos", icon: "layers" },
          { id: "chat", label: "Chat IA", icon: "smart_toy" },
          { id: "historial", label: "Historial", icon: "history" },
          { id: "usuarios", label: "Admins", icon: "group" }
        ].filter(tab => (tab.id !== "chat" && tab.id !== "usuarios") || isAuthenticated).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "dashboard" || tab.id === "inventario") {
                setFilterCriticidad("all");
              }
              navigate(`/${tab.id}`);
            }}
            className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${
              currentPath === tab.id
                ? "bg-secondary-container text-on-secondary-container font-semibold"
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span 
              className="material-symbols-outlined" 
              style={{ fontVariationSettings: currentPath === tab.id ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className="font-label-sm text-[10px]">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Global Modals */}
      {isModalOpen && (selectedPrinter || isCreateMode) && (
        <PrinterModal />
      )}

      {stockModal && (
        <StockModal />
      )}

      {isExcelImportModalOpen && (
        <ExcelImportModal />
      )}
    </div>
  );
}
