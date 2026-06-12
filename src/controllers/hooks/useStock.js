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

  const handleDecrementStockClick = (modelo, field, currentValue) => {
    if (currentValue <= 0) return;

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

    setStockModal({
      isOpen: true,
      modelo,
      field,
      insumo,
      origin,
      currentValue
    });
    setStockTargetPrinterId("");
  };

  const handleConfirmStockReduction = async (
    db,
    printers,
    updatePrinterDoc,
    addPrinterHistoryItem,
    addGeneralHistoryLog,
    calculateStatus
  ) => {
    if (savingStock) return;
    const { modelo, field, currentValue, insumo, origin } = stockModal;
    const newValue = currentValue - 1;

    setSavingStock(true);
    try {
      // 1. Decrement Stock count in Firestore
      await dbUpdateStock(db, modelo, {
        [field]: newValue
      });

      // 2. If a printer was selected, update its consumable to 100% and save to history
      if (stockTargetPrinterId && stockTargetPrinterId !== "none") {
        const printer = printers.find((p) => p.id_serie === stockTargetPrinterId);
        if (printer) {
          let tonerVal = printer.consumibles?.toner_nivel ?? 100;
          let unitVal = printer.consumibles?.unidad_imagen_nivel ?? 100;
          let maintVal = printer.consumibles?.mantenimiento_kit_nivel ?? 100;

          if (field.startsWith("toner")) {
            tonerVal = 100;
          } else if (field.startsWith("unidad")) {
            unitVal = 100;
          } else if (field.startsWith("mantenimiento")) {
            maintVal = 100;
          }

          const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);
          const computedFuncionamiento = calculateStatus(
            printer.area_actual,
            tonerVal,
            unitVal,
            maintVal,
            printer.observaciones,
            printer.ubicacion_entidad
          );

          const updateData = {
            "consumibles.toner_nivel": tonerVal,
            "consumibles.unidad_imagen_nivel": unitVal,
            "consumibles.mantenimiento_kit_nivel": maintVal,
            "consumibles.ultima_lectura": new Date(),
            estado_funcionamiento: computedFuncionamiento,
            prediccion: prediction
          };

          await updatePrinterDoc(db, printer.id_serie, updateData);

          await addPrinterHistoryItem(db, printer.id_serie, {
            toner_nivel: tonerVal,
            unidad_imagen_nivel: unitVal,
            mantenimiento_kit_nivel: maintVal,
            estado_funcionamiento: computedFuncionamiento,
            observaciones: `Reemplazo e instalación de ${insumo} nuevo desde stock ${origin}.`,
            codigo_caso_cas: printer.codigo_caso_cas || "",
            ubicacion_entidad: printer.ubicacion_entidad || "Hospital",
            area_actual: printer.area_actual || "Soporte",
            fecha_lectura: new Date(),
            tipo_actualizacion: "Reemplazo de Repuesto"
          });

          // Save to General History (Printer Update)
          await addGeneralHistoryLog(db, {
            tipo: "impresora",
            id_serie: printer.id_serie,
            modelo: printer.modelo,
            area_actual: printer.area_actual || "Soporte",
            toner_nivel: tonerVal,
            unidad_imagen_nivel: unitVal,
            mantenimiento_kit_nivel: maintVal,
            estado_funcionamiento: computedFuncionamiento,
            observaciones: `Reemplazo e instalación de ${insumo} nuevo desde stock ${origin}.`,
            codigo_caso_cas: printer.codigo_caso_cas || "",
            tipo_actualizacion: "Reemplazo de Repuesto"
          });
        }
      }

      // Save to General History (Stock reduction event)
      await addGeneralHistoryLog(db, {
        tipo: "stock",
        modelo,
        insumo,
        origen: origin,
        cantidad_anterior: Number(currentValue),
        cantidad_nueva: Number(newValue),
        tipo_actualizacion: "Consumo de Repuesto",
        observaciones:
          stockTargetPrinterId && stockTargetPrinterId !== "none"
            ? `Se descontó 1 unidad de ${insumo} (${origin}) para instalar en impresora S/N: ${stockTargetPrinterId}.`
            : `Se descontó 1 unidad de ${insumo} (${origin}) sin impresora asociada.`
      });

      alert("Inventario de repuestos y estado del equipo actualizados correctamente.");
    } catch (e) {
      console.error("Error processing stock reduction:", e);
      alert("Error al procesar el descuento de stock: " + e.message);
    } finally {
      setStockModal({
        isOpen: false,
        modelo: "",
        field: "",
        insumo: "",
        origin: "",
        currentValue: 0
      });
      setStockTargetPrinterId("");
      setSavingStock(false);
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
    updateManualStock,
    handleDecrementStockClick,
    handleConfirmStockReduction
  };
}
