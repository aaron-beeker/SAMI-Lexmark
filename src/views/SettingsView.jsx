import React from "react";

export default function SettingsView({
  showSettingsSaved,
  handleSaveApiKey,
  isAuthenticated
}) {
  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto w-full">
      <h2 className="font-headline-md text-xl text-on-background font-bold">Ajustes del Sistema</h2>

      {isAuthenticated ? (
        <form onSubmit={handleSaveApiKey} className="p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">api</span>
            Claves API — Proveedores de IA
          </h3>

          <p className="text-xs text-on-surface-variant">
            SAMI usa una cadena de proveedores: primero intenta <strong>Gemini</strong>, luego <strong>OpenRouter</strong> (modelos gratis), y como último recurso <strong>OCR local</strong> (sin API). Configura al menos una clave.
          </p>

          <div className="p-4 bg-green-50 text-green-800 rounded-xl border border-green-200 shadow-inner flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600">verified_user</span>
              <strong className="text-sm">Gestión Segura en el Servidor</strong>
            </div>
            <p className="text-xs opacity-90">
              Las claves API de Gemini y OpenRouter ya no se almacenan en el navegador por motivos de seguridad (riesgo XSS mitigado). Ahora se gestionan de forma segura a través de un proxy Serverless en Vercel.
            </p>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-start gap-2">
            <span className="material-symbols-outlined text-tertiary text-base mt-0.5">document_scanner</span>
            <div>
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">OCR Local (Tesseract.js)</span>
              <p className="text-[10px] text-on-surface-variant">Siempre activo como último recurso. Extrae texto de las fotos directamente en tu navegador — sin internet ni API. Menos preciso que la IA pero funciona offline.</p>
            </div>
          </div>

          {showSettingsSaved && (
            <div className="p-3 bg-green-100 text-green-800 rounded-xl border border-green-200 text-xs font-semibold flex items-center gap-1.5 animate-pulse-subtle">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Configuración guardada exitosamente en este navegador.
            </div>
          )}
        </form>
      ) : (
        <div className="p-6 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm space-y-3 flex flex-col items-center text-center">
          <span className="material-symbols-outlined text-primary text-4xl">lock</span>
          <h3 className="font-bold text-base text-on-surface">Configuración Restringida</h3>
          <p className="text-xs text-on-surface-variant max-w-md">
            Las claves de API y la configuración de proveedores de IA solo están visibles e interactivas para administradores autorizados. Por favor, inicie sesión si necesita modificar estos valores.
          </p>
        </div>
      )}

      <div className="p-5 bg-surface-container-low border border-outline-variant rounded-2xl space-y-3">
        <h4 className="font-bold text-xs text-outline uppercase">Información del Proyecto</h4>
        <div className="text-xs space-y-1.5 text-on-surface-variant font-mono">
          <p><strong>Proyecto:</strong> SAMI-Lexmark (Cayetano Heredia)</p>
          <p><strong>Firestore DB:</strong> sami-lexmark (Cloud)</p>
          <p><strong>IA Primaria:</strong> Gemini 2.0 Flash</p>
          <p><strong>IA Alternativa:</strong> OpenRouter (Free Tier)</p>
          <p><strong>OCR Fallback:</strong> Tesseract.js (Local)</p>
          <p><strong>Ciclo Autonomía:</strong> 45 Días corridos (Lineal)</p>
        </div>
      </div>
    </div>
  );
}
