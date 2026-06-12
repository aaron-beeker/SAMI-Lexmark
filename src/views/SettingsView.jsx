import React from "react";

export default function SettingsView({
  apiKeyInput,
  setApiKeyInput,
  openRouterKeyInput,
  setOpenRouterKeyInput,
  showSettingsSaved,
  handleSaveApiKey
}) {
  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto w-full">
      <h2 className="font-headline-md text-xl text-on-background font-bold">Ajustes del Sistema</h2>

      <form onSubmit={handleSaveApiKey} className="p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">api</span>
          Claves API — Proveedores de IA
        </h3>

        <p className="text-xs text-on-surface-variant">
          SAMI usa una cadena de proveedores: primero intenta <strong>Gemini</strong>, luego <strong>OpenRouter</strong> (modelos gratis), y como último recurso <strong>OCR local</strong> (sin API). Configura al menos una clave.
        </p>

        {/* Gemini Key */}
        <div className="space-y-1.5 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-primary">diamond</span>
            Gemini API Key (Google)
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="AQ.Ab8RN6..."
            className="w-full bg-surface border-outline-variant rounded-lg p-2.5 focus:ring-primary focus:border-primary text-sm font-mono"
          />
          <p className="text-[10px] text-outline">Obtén una en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-primary underline">Google AI Studio</a></p>
        </div>

        {/* OpenRouter Key */}
        <div className="space-y-1.5 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-secondary">route</span>
            OpenRouter API Key (Alternativa gratuita)
          </label>
          <input
            type="password"
            value={openRouterKeyInput}
            onChange={(e) => setOpenRouterKeyInput(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full bg-surface border-outline-variant rounded-lg p-2.5 focus:ring-primary focus:border-primary text-sm font-mono"
          />
          <p className="text-[10px] text-outline">Gratis con modelos como Gemma y Llama. Regístrate en <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" className="text-primary underline">openrouter.ai/keys</a></p>
        </div>

        {/* OCR info */}
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

        <button
          type="submit"
          className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:bg-primary-container active:scale-95 transition-all text-sm"
        >
          Guardar Configuración
        </button>
      </form>

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
