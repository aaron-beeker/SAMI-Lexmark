import React from "react";

export default function TopAppBar({ currentTab, setCurrentTab }) {
  return (
    <header className="shrink-0 flex justify-between items-center px-6 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm z-30">
      <div 
        className="flex items-center gap-2 cursor-pointer active:opacity-70" 
        onClick={() => setCurrentTab("dashboard")}
      >
        <img 
          src="/mur_tecnologa_logo.jpg" 
          alt="MUR Tecnología" 
          className="h-7 w-auto object-contain mix-blend-multiply" 
        />
        <div className="h-4 w-[1px] bg-outline-variant/80 mx-1"></div>
        <h1 className="font-headline-lg-mobile text-xs font-black text-primary tracking-widest uppercase">SAMI-Lexmark</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-primary bg-primary-fixed/50 px-2.5 py-1 rounded-full border border-primary/15">
          <span className="material-symbols-outlined text-sm animate-pulse-subtle">cloud_done</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Online</span>
        </div>
        <button
          onClick={() => setCurrentTab("settings")}
          className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors ${
            currentTab === "settings" ? "bg-primary-fixed text-primary" : "text-on-surface-variant"
          }`}
          title="Configuración"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
      </div>
    </header>
  );
}
