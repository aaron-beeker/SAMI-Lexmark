import React from "react";

export default function Sidebar({ currentTab, setCurrentTab, onOpenCreateModal, setFilterCriticidad }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "inventario", label: "Inventario", icon: "inventory_2" },
    { id: "chat", label: "Chat AI", icon: "smart_toy" },
    { id: "historial", label: "Historial", icon: "history" }
  ];

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
              setCurrentTab(tab.id);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition-all active:scale-98 ${currentTab === tab.id
                ? "bg-primary text-on-primary shadow-md"
                : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-outline-variant/60">
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl font-extrabold text-xs hover:bg-primary/20 active:scale-95 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>Registrar Impresora</span>
        </button>
      </div>
    </aside>
  );
}
