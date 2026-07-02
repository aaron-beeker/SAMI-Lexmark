import React from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useUIContext } from '../contexts/UIContext';


export default function TopAppBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.replace('/', '') || 'dashboard';

  const { isAuthenticated, user, onLoginClick, onLogoutClick } = useAuthContext();


  const getGreeting = () => {
    if (!user) return "";
    const name = user.displayName;
    if (!name) {
      const emailPrefix = user.email ? user.email.split("@")[0] : "Admin";
      return `¡Hola ${emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)}!`;
    }

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const firstName = parts[0];
      let lastName = "";
      if (parts.length === 2) {
        lastName = parts[1];
      } else if (parts.length === 3) {
        lastName = parts[1];
      } else if (parts.length >= 4) {
        lastName = parts[2];
      }
      return `¡Hola ${firstName} ${lastName}!`;
    }
    
    return `¡Hola ${name}!`;
  };

  return (
    <header className="shrink-0 flex justify-between items-center px-6 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm z-30">
      <div 
        className="flex items-center gap-2 cursor-pointer active:opacity-70" 
        onClick={() => navigate("/dashboard")}
      >
        <img 
          src="/mur_tecnologa_logo.jpg" 
          alt="MUR Tecnología" 
          className="h-7 w-auto object-contain mix-blend-multiply" 
        />
        <div className="h-4 w-[1px] bg-outline-variant/80 mx-1"></div>
        <h1 className="font-headline-lg-mobile text-xs font-black text-primary tracking-widest uppercase">SAMI-Lexmark</h1>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-1.5 text-primary bg-primary-fixed/50 px-2.5 py-1 rounded-full border border-primary/15">
          <span className="material-symbols-outlined text-sm animate-pulse-subtle">cloud_done</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Online</span>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-2 bg-surface-container-high pl-3 pr-1 py-1 rounded-full border border-outline-variant/60 shadow-sm">
            <span className="text-xs font-bold text-on-surface truncate max-w-[200px] hidden md:inline mr-1">
              {getGreeting()}
            </span>
            <button
              onClick={onLogoutClick}
              className="px-3 py-1.5 rounded-full bg-error text-on-error text-[10px] font-extrabold hover:bg-error/95 active:scale-95 transition-all shadow-sm flex items-center gap-1"
              title="Cerrar Sesión"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-[10px] font-black uppercase tracking-wider hover:bg-primary/95 active:scale-95 transition-all shadow-md flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">lock</span>
            <span>Acceso Admin</span>
          </button>
        )}

        <button
          onClick={() => navigate("/settings")}
          className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors ${
            currentPath === "settings" ? "bg-primary-fixed text-primary" : "text-on-surface-variant"
          }`}
          title="Configuración"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
      </div>
    </header>
  );
}
