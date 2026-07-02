import React from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useUIContext } from '../contexts/UIContext';
import { useDataContext } from '../contexts/DataContext';


export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.replace('/', '') || 'dashboard';

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
    <aside className="hidden md:flex flex-col w-64 border-r border-outline-variant bg-surface-container-low shrink-0 h-screen">
      <div className="p-6 flex flex-col gap-1 border-b border-outline-variant/60">
        <span className="text-xs font-bold text-outline uppercase tracking-wider">Sistema SAMI</span>
        <span className="text-lg font-black text-primary uppercase">Menú Principal</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "dashboard" || tab.id === "inventario") {
                if (setFilterCriticidad) setFilterCriticidad("all");
              }
              navigate(`/${tab.id}`);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition-all active:scale-98 ${currentPath === tab.id
                ? "bg-primary text-on-primary shadow-md"
                : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>


    </aside>
  );
}
