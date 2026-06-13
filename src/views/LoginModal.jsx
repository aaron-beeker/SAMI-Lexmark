import React, { useState } from "react";

export default function LoginModal({ isOpen, onClose, loginWithGoogle, loginError, setLoginError }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    const success = await loginWithGoogle();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface/90 backdrop-blur-md rounded-3xl shadow-2xl border border-outline-variant max-w-sm w-full overflow-hidden flex flex-col p-6 animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">lock</span>
            <h3 className="font-extrabold text-base text-on-surface">Panel de Administrador</h3>
          </div>
          <button
            onClick={() => {
              setLoginError("");
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Info text */}
        <p className="text-xs text-on-surface-variant mb-5 font-medium leading-relaxed">
          Inicie sesión con su cuenta de Google autorizada para desbloquear las funciones de edición y el Chat de IA.
        </p>

        {/* Error message */}
        {loginError && (
          <div className="mb-5 p-3 bg-error/15 border border-error/20 text-error rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{loginError}</span>
          </div>
        )}

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full py-3.5 bg-surface-container-high hover:bg-surface-container-highest dark:bg-slate-800 dark:hover:bg-slate-700 text-on-surface border border-outline-variant rounded-2xl text-xs font-extrabold active:scale-[0.98] transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin mr-2">sync</span>
              <span>Iniciando sesión...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.755 1.055 15.027 0 12 0 7.354 0 3.393 2.682 1.5 6.6l3.766 3.165Z"
                />
                <path
                  fill="#34A853"
                  d="M16.04 15.34C15.01 16.27 13.58 16.91 12 16.91c-2.92 0-5.4-1.99-6.28-4.67L1.92 15.4c1.9 3.82 5.86 6.6 10.08 6.6 3.1 0 6.01-1.12 8.16-3.05l-4.12-3.61Z"
                />
                <path
                  fill="#4285F4"
                  d="M24 12c0-.86-.08-1.72-.22-2.56H12v4.83h6.73c-.29 1.54-1.16 2.85-2.46 3.73l4.12 3.61C22.8 19.5 24 16.09 24 12Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.72 12.24c-.22-.67-.35-1.39-.35-2.13s.13-1.46.35-2.13L1.95 4.8C1.05 6.6.5 8.74.5 11s.55 4.4 1.45 6.2l3.77-2.96Z"
                />
              </svg>
              <span>Acceder con Google</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
