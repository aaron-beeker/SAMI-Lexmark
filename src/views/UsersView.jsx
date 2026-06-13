import React, { useState } from "react";

export default function UsersView({ 
  user, 
  admins, 
  loadingAdmins, 
  addAdmin, 
  removeAdmin 
}) {
  const [emailInput, setEmailInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: "", message: "" });
    }, 4000);
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    
    if (!cleanEmail) {
      showFeedback("error", "Por favor ingrese un correo válido.");
      return;
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showFeedback("error", "Por favor ingrese una dirección de correo electrónico válida.");
      return;
    }

    // Check if already in the list
    const exists = admins.some(admin => admin.email.toLowerCase() === cleanEmail);
    if (exists) {
      showFeedback("error", `El correo ${cleanEmail} ya está registrado como administrador.`);
      return;
    }

    setIsAdding(true);
    const success = await addAdmin(cleanEmail);
    setIsAdding(false);

    if (success) {
      setEmailInput("");
      showFeedback("success", `El correo ${cleanEmail} ha sido agregado exitosamente.`);
    } else {
      showFeedback("error", "Error al registrar el administrador. Intente de nuevo.");
    }
  };

  const handleRemoveAdmin = async (adminEmail) => {
    if (adminEmail.toLowerCase() === user.email.toLowerCase()) {
      showFeedback("error", "No puedes eliminarte a ti mismo de la lista.");
      return;
    }

    const confirmDelete = window.confirm(`¿Estás seguro de que deseas revocar los privilegios de administrador para ${adminEmail}?`);
    if (!confirmDelete) return;

    const success = await removeAdmin(adminEmail);
    if (success) {
      showFeedback("success", `Privilegios revocados para ${adminEmail}.`);
    } else {
      showFeedback("error", "No se pudo revocar los privilegios. Intente de nuevo.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="space-y-0.5">
        <h2 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">group</span>
          Gestión de Administradores
        </h2>
        <p className="text-xs text-on-surface-variant">
          Agregue o elimine usuarios autorizados para gestionar stock, incidencias e impresoras.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <section className="lg:col-span-4 bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">person_add</span>
            Añadir Nuevo Administrador
          </h3>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Ingrese el correo electrónico de Google del nuevo administrador. El usuario podrá acceder al panel con un solo clic.
          </p>

          <form onSubmit={handleAddAdmin} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-outline block mb-1 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="nombre@gmail.com o corporativo"
                disabled={isAdding}
                className="w-full text-xs bg-surface-container-low border border-outline-variant rounded-xl p-3 focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 transition-all font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="w-full py-3 bg-primary text-on-primary rounded-xl text-xs font-extrabold hover:bg-primary/95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isAdding ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Añadir Administrador</span>
                </>
              )}
            </button>
          </form>

          {/* Feedback alerts */}
          {feedback.message && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in ${
              feedback.type === "success" 
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600" 
                : "bg-error/10 border border-error/20 text-error"
            }`}>
              <span className="material-symbols-outlined text-sm">
                {feedback.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{feedback.message}</span>
            </div>
          )}
        </section>

        {/* List Column */}
        <section className="lg:col-span-8 bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary font-bold">supervisor_account</span>
              Usuarios Autorizados ({admins.length})
            </h3>
            {loadingAdmins && (
              <span className="text-[10px] text-outline flex items-center gap-1">
                <span className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                Actualizando...
              </span>
            )}
          </div>

          <div className="border border-outline-variant/60 rounded-xl overflow-hidden bg-surface-container-lowest">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/60 text-outline text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3.5 pl-4">Correo Electrónico</th>
                    <th className="p-3.5">Fecha de Registro</th>
                    <th className="p-3.5">Creado Por</th>
                    <th className="p-3.5 pr-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 font-medium">
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-outline-variant/80 font-bold">
                        <span className="material-symbols-outlined text-3xl mb-1 block">group_off</span>
                        No hay administradores registrados
                      </td>
                    </tr>
                  ) : (
                    admins.map((admin) => {
                      const isSelf = admin.email.toLowerCase() === user?.email?.toLowerCase();
                      const date = admin.fecha_creacion?.toDate 
                        ? admin.fecha_creacion.toDate().toLocaleDateString("es-PE")
                        : admin.fecha_creacion instanceof Date
                          ? admin.fecha_creacion.toLocaleDateString("es-PE")
                          : admin.fecha_creacion 
                            ? new Date(admin.fecha_creacion).toLocaleDateString("es-PE")
                            : "N/A";
                      
                      return (
                        <tr key={admin.email} className={`hover:bg-surface-container-low/50 transition-colors ${isSelf ? "bg-primary/5" : ""}`}>
                          <td className="p-3.5 pl-4 font-mono font-bold text-on-surface flex items-center gap-2">
                            {admin.email}
                            {isSelf && (
                              <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                Tú
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-on-surface-variant font-medium">{date}</td>
                          <td className="p-3.5 text-on-surface-variant font-mono text-[11px]">{admin.creado_por || "N/A"}</td>
                          <td className="p-3.5 pr-4 text-center">
                            <button
                              onClick={() => handleRemoveAdmin(admin.email)}
                              disabled={isSelf}
                              title={isSelf ? "No puedes eliminarte a ti mismo" : "Revocar acceso de administrador"}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all active:scale-[0.93] ${
                                isSelf 
                                  ? "bg-surface-container-high text-outline-variant/40 border-outline-variant/20 cursor-not-allowed" 
                                  : "bg-error/5 hover:bg-error/15 text-error border-error/20"
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm font-bold">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
