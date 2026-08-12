import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useUIContext } from '../contexts/UIContext';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';


export default function TopAppBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.replace('/', '') || 'dashboard';

  const { isAuthenticated, user, onLoginClick, onLogoutClick } = useAuthContext();

  const [lastHeartbeatTime, setLastHeartbeatTime] = useState(Date.now());
  const [workerState, setWorkerState] = useState("Corriendo");
  const [pcName, setPcName] = useState("");
  const [isMonitorOnline, setIsMonitorOnline] = useState(true);

  useEffect(() => {
    const workerDoc = doc(db, "artifacts", "sami-lexmark", "public", "data", "sistema", "worker");
    const unsubscribe = onSnapshot(workerDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.estado) {
          setWorkerState(data.estado);
        }
        if (data.pc_name) {
          setPcName(data.pc_name);
        }
        if (data.ultimo_latido) {
          const t = data.ultimo_latido.toDate ? data.ultimo_latido.toDate().getTime() : new Date(data.ultimo_latido).getTime();
          setLastHeartbeatTime(t);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkStatus = () => {
      const now = Date.now();
      const diffMinutes = (now - lastHeartbeatTime) / (1000 * 60);
      
      // Si el estado es "Detenido", está offline inmediatamente.
      // Si es "Corriendo" o "Iniciando", verificamos por seguridad que el latido no sea más viejo que 3 minutos.
      if (workerState === "Detenido") {
        setIsMonitorOnline(false);
      } else {
        setIsMonitorOnline(diffMinutes <= 3);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [lastHeartbeatTime, workerState]);

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
    <header className="shrink-0 flex justify-between items-center px-3 md:px-6 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm z-30">
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

      <div className="flex items-center gap-1.5 md:gap-2.5">
        {isMonitorOnline ? (
          <div className="flex items-center gap-1 text-primary bg-primary-fixed/50 px-2 py-1 md:px-2.5 rounded-full border border-primary/15" title={`Monitor Worker Online en ${pcName}`}>
            <span className="material-symbols-outlined text-sm animate-pulse-subtle">cloud_done</span>
            <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">{workerState} {pcName ? `- ${pcName}` : ''}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider md:hidden">ON</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-error bg-error/10 px-2 py-1 md:px-2.5 rounded-full border border-error/20" title="Alerta: El sistema de monitoreo está apagado o fallando">
            <span className="material-symbols-outlined text-sm">cloud_off</span>
            <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">Desconectado {pcName ? `- ${pcName}` : ''}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider md:hidden">OFF</span>
          </div>
        )}

        {isAuthenticated ? (
          <div className="flex items-center gap-1.5 bg-surface-container-high pl-2 md:pl-3 pr-1 py-1 rounded-full border border-outline-variant/60 shadow-sm">
            <span className="text-[11px] md:text-xs font-bold text-on-surface truncate max-w-[80px] md:max-w-[200px] hidden sm:inline mr-1">
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
