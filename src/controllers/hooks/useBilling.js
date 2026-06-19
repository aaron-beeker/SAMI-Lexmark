import { useState, useEffect } from "react";
import { subscribeBillingCycles, addBillingCycle } from "../../models/BillingModel";

export function useBilling({ db }) {
  const [billingCycles, setBillingCycles] = useState([]);
  const [loadingBilling, setLoadingBilling] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeBillingCycles(
      db,
      (cycles) => {
        setBillingCycles(cycles);
        setLoadingBilling(false);
      },
      (error) => {
        console.error("Error loading billing cycles:", error);
        setLoadingBilling(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  const closeMonth = async (totalHojas, totalCaras) => {
    try {
      const now = new Date();
      
      // Determine period name (e.g., "Junio 2026")
      const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const mesActual = meses[now.getMonth()];
      const anioActual = now.getFullYear();
      
      const periodo = `19 ${mesActual} ${anioActual}`;

      // Check if a cycle for this period already exists
      const exists = billingCycles.some(c => c.periodo === periodo);
      if (exists) {
         throw new Error(`El cierre para el periodo "${periodo}" ya fue registrado.`);
      }

      const billingDoc = {
        fecha_corte: now,
        periodo: periodo,
        total_hojas: totalHojas,
        total_caras: totalCaras
      };

      await addBillingCycle(db, billingDoc);
      return { success: true, periodo };
    } catch (error) {
      console.error("Error closing month:", error);
      throw error;
    }
  };

  return {
    billingCycles,
    loadingBilling,
    closeMonth
  };
}
