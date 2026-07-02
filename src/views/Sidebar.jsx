import React, { useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useUIContext } from '../contexts/UIContext';
import { useDataContext } from '../contexts/DataContext';


export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.replace('/', '') || 'dashboard';
  const [isExpanded, setIsExpanded] = useState(false);

  const { isAuthenticated } = useAuthContext();
  const { setFilterCriticidad } = useUIContext();
  const { onOpenCreateModal } = useDataContext();

  const allTabs = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "inventario", label: "Inventario", icon: "inventory_2" },
    { id: "repuestos", label: "Repuestos", icon: "layers" },
    { id: "chat", label: "Chat AI", icon: "smart_toy" },
    { id: "historial", label: "Historial", icon: "history" },
    { id: "usuarios", label: "Administradores", icon: "group" }
  ];

  const tabs = allTabs.filter((tab) => {
    if (tab.id === "chat" && !isAuthenticated) return false;
    if (tab.id === "usuarios" && !isAuthenticated) return false;
    return true;
  });

  return (
    <aside className={`hidden md:flex flex-col ${isExpanded ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out border-r border-outline-variant bg-surface-container-low shrink-0 h-screen overflow-hidden relative`}>
      {/* Toggle Button */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-6 flex items-center border-b border-outline-variant/60 cursor-pointer hover:bg-surface-container-high transition-colors ${isExpanded ? 'justify-between' : 'justify-center'} h-20`}
        title="Contraer / Expandir"
      >
        {isExpanded ? (
          <div className="flex flex-col gap-1 overflow-hidden">
            <span className="text-xs font-bold text-outline uppercase tracking-wider whitespace-nowrap">Sistema SAMI</span>
            <span className="text-lg font-black text-primary uppercase whitespace-nowrap">Menú Principal</span>
          </div>
        ) : (
          <span className="material-symbols-outlined text-primary text-2xl">menu</span>
        )}
        {isExpanded && (
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors text-sm">
            menu_open
          </span>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            title={!isExpanded ? tab.label : ""}
            onClick={() => {
              if (tab.id === "dashboard" || tab.id === "inventario") {
                if (setFilterCriticidad) setFilterCriticidad("all");
              }
              navigate(`/${tab.id}`);
            }}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all active:scale-98 ${
              currentPath === tab.id
                ? "bg-primary text-on-primary shadow-md"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              } ${isExpanded ? "gap-3 justify-start" : "justify-center"}`}
          >
            <span className="material-symbols-outlined text-xl shrink-0">{tab.icon}</span>
            {isExpanded && (
              <span className="text-xs font-extrabold whitespace-nowrap animate-fade-in">
                {tab.label}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
