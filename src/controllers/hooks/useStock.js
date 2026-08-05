import { useState } from "react";
import { updateStock as dbUpdateStock } from "../../models/StockModel";
import { calcularFechasPredictivas } from "../../services/PredictionService";

export function useStock() {
  const [repuestos, setRepuestos] = useState([]);
  const [savingStock, setSavingStock] = useState(false);
  const [stockModal, setStockModal] = useState({
    isOpen: false,
    modelo: "",
    field: "",
    insumo: "",
    origin: "",
    currentValue: 0
  });
  const [stockTargetPrinterId, setStockTargetPrinterId] = useState("");

  const updateManualStock = async (db, modelo, field, newValue, addGeneralHistoryLog) => {
    if (newValue < 0) return;
    try {
      const matchedStock = repuestos.find((r) => r.id === modelo);
      const prevValue = matchedStock ? matchedStock[field] ?? 0 : 0;

      await dbUpdateStock(db, modelo, {
        [field]: Number(newValue)
      });

      let insumo = "Tóner";
      if (field.startsWith("unidad")) {
        insumo = "Unidad de Imagen";
      } else if (field.startsWith("mantenimiento")) {
        insumo = "Kit de Mantenimiento";
      }

      let origin = "Hospital";
      if (field.endsWith("deposito")) {
        origin = "Depósito";
      }

      await addGeneralHistoryLog(db, {
        tipo: "stock",
        modelo,
        insumo,
        origen: origin,
        cantidad_anterior: Number(prevValue),
        cantidad_nueva: Number(newValue),
        tipo_actualizacion: "Ajuste Manual (+)",
        observaciones: `Se incrementó el stock de ${insumo} (${origin}) para modelo ${modelo}.`
      });
    } catch (e) {
      console.error("Error updating manual stock:", e);
    }
  };

  return {
    repuestos,
    setRepuestos,
    savingStock,
    stockModal,
    setStockModal,
    stockTargetPrinterId,
    setStockTargetPrinterId,
    updateManualStock
  };
}
