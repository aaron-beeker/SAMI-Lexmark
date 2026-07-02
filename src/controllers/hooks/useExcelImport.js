import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { analizarImportacionExcel } from "../../services/GeminiService";
import { calcularFechasPredictivas } from "../../services/PredictionService";

export function useExcelImport() {
  const [excelData, setExcelData] = useState(null);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const excelFileInputRef = useRef(null);

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFileName(file.name);
    setIsExcelLoading(true);
    setIsExcelImportModalOpen(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: "binary" });

          const allParsedRows = [];

          wb.SheetNames.forEach((sheetName) => {
            const ws = wb.Sheets[sheetName];
            const rawArrays = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (rawArrays.length === 0) return;

            // Find the header row dynamically
            let headerRowIndex = -1;
            const serialKeywords = [
              "serie",
              "s/n",
              "sn",
              "id_serie",
              "número de serie",
              "numero de serie",
              "serial",
              "nro",
              "cod"
            ];

            for (let i = 0; i < Math.min(10, rawArrays.length); i++) {
              const row = rawArrays[i];
              if (Array.isArray(row)) {
                const hasSerialKey = row.some((cell) => {
                  if (cell === undefined || cell === null) return false;
                  const cClean = String(cell).toLowerCase().trim();
                  return serialKeywords.some((keyword) => cClean.includes(keyword));
                });
                if (hasSerialKey) {
                  headerRowIndex = i;
                  break;
                }
              }
            }

            if (headerRowIndex === -1) {
              headerRowIndex = 0;
            }

            const headers = rawArrays[headerRowIndex] || [];

            const findColIndex = (keywords) => {
              return headers.findIndex((h) => {
                if (h === undefined || h === null) return false;
                const hClean = String(h).toLowerCase().trim();
                return keywords.some((key) => hClean.includes(key));
              });
            };

            const colIdxIdSerie = findColIndex([
              "serie",
              "s/n",
              "sn",
              "id_serie",
              "número de serie",
              "numero de serie",
              "serial",
              "nro",
              "cod"
            ]);
            const colIdxModelo = findColIndex(["modelo", "model", "impresora"]);
            const colIdxArea = findColIndex([
              "area",
              "área",
              "ubicacion",
              "ubicación",
              "area_actual",
              "sector",
              "area actual"
            ]);
            const colIdxEntity = findColIndex([
              "ubicación física",
              "ubicacion fisica",
              "entidad",
              "ubicacion_entidad",
              "destino",
              "lugar"
            ]);
            const colIdxToner = findColIndex([
              "toner",
              "tóner",
              "toner_nivel",
              "nivel de tóner",
              "toner nivel",
              "% toner",
              "% tóner"
            ]);
            const colIdxUnit = findColIndex([
              "unidad",
              "imagen",
              "unidad_imagen_nivel",
              "unidad de imagen",
              "unidad nivel",
              "% unidad",
              "% imagen",
              "drum"
            ]);
            const colIdxMaint = findColIndex([
              "mantenimiento",
              "kit",
              "fuser",
              "rodillos",
              "% kit",
              "% mantenimiento"
            ]);
            const colIdxCas = findColIndex([
              "cas",
              "caso",
              "codigo_caso_cas",
              "código de caso",
              "codigo de caso",
              "incidente",
              "ticket"
            ]);
            const colIdxDetalleCaso = findColIndex([
              "detalle_caso",
              "detalle del caso",
              "detalle caso",
              "detalle_del_caso",
              "diagnostico",
              "diagnóstico",
              "diagnosticos",
              "diagnósticos"
            ]);
            const colIdxObs = findColIndex([
              "observaciones",
              "detalles",
              "comentarios",
              "obs",
              "observacion",
              "comentario"
            ]);

            for (let j = headerRowIndex + 1; j < rawArrays.length; j++) {
              const row = rawArrays[j];
              if (!Array.isArray(row) || row.length === 0) continue;

              const valAt = (idx) => {
                if (
                  idx === -1 ||
                  idx === undefined ||
                  idx === null ||
                  row[idx] === undefined ||
                  row[idx] === null
                ) {
                  return undefined;
                }
                return String(row[idx]).trim();
              };

              let id_serie = valAt(colIdxIdSerie) || "";

              if (!id_serie) {
                const firstVal = valAt(0);
                if (firstVal && firstVal.length >= 5) {
                  id_serie = firstVal;
                }
              }

              if (!id_serie) {
                const serialCandidate = row.find((cell) => {
                  if (cell === undefined || cell === null) return false;
                  const sVal = String(cell).trim();
                  return /^[a-zA-Z0-9-]{8,20}$/.test(sVal);
                });
                if (serialCandidate) {
                  id_serie = String(serialCandidate).trim();
                }
              }

              if (!id_serie || id_serie.length < 4) continue;

              const modelVal = valAt(colIdxModelo) || "";
              const areaVal = valAt(colIdxArea) || "";

              let entityVal = valAt(colIdxEntity) || "";
              if (!entityVal) {
                entityVal = sheetName.toLowerCase().includes("mur") ? "MUR" : "Hospital";
              }

              const tonerValRaw = valAt(colIdxToner);
              const tonerVal =
                tonerValRaw !== undefined
                  ? Number(tonerValRaw.replace("%", "").trim())
                  : null;

              const unitValRaw = valAt(colIdxUnit);
              const unitVal =
                unitValRaw !== undefined
                  ? Number(unitValRaw.replace("%", "").trim())
                  : null;

              const maintValRaw = valAt(colIdxMaint);
              const maintVal =
                maintValRaw !== undefined
                  ? Number(maintValRaw.replace("%", "").trim())
                  : null;

              const casVal = valAt(colIdxCas) || "";
              const detalleCasoVal = valAt(colIdxDetalleCaso) || "";
              const obsVal = valAt(colIdxObs) || "";

              allParsedRows.push({
                id_serie,
                modelo: modelVal,
                area_actual: areaVal,
                ubicacion_entidad: entityVal,
                toner_nivel: tonerVal,
                unidad_imagen_nivel: unitVal,
                mantenimiento_kit_nivel: maintVal,
                codigo_caso_cas: casVal,
                detalle_caso: detalleCasoVal,
                observaciones: obsVal
              });
            }
          });

          // Deduplicate rows by uppercase serial number
          const uniqueParsedRows = [];
          const seenSerials = new Set();

          allParsedRows.forEach((row) => {
            const snUpper = row.id_serie.toUpperCase();
            if (!seenSerials.has(snUpper)) {
              seenSerials.add(snUpper);
              uniqueParsedRows.push(row);
            }
          });

          if (uniqueParsedRows.length === 0) {
            throw new Error(
              "No se encontraron registros con Número de Serie válido en ninguna hoja del archivo."
            );
          }

          const geminiResult = await analizarImportacionExcel(uniqueParsedRows);
          setExcelData(geminiResult);
        } catch (error) {
          console.error("Error reading or analyzing Excel:", error);
          alert("Error al procesar el Excel: " + error.message);
          setIsExcelImportModalOpen(false);
        } finally {
          setIsExcelLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error("Reader error:", err);
      alert("Error al leer el archivo: " + err.message);
      setIsExcelLoading(false);
      setIsExcelImportModalOpen(false);
    }
  };

  const handleConfirmExcelImport = async (
    db,
    printers,
    createPrinterDoc,
    addPrinterHistoryItem,
    addGeneralHistoryLog,
    calculateStatus,
    setChatMessages,
    navigate
  ) => {
    if (!excelData || !excelData.equipos_normalizados || isExcelLoading) return;

    setIsExcelLoading(true);
    try {
      const auditLogLines = [];
      const seenConfirmed = new Set();

      for (const eq of excelData.equipos_normalizados) {
        if (!eq.id_serie) continue;
        const snUpper = eq.id_serie.toUpperCase();
        if (seenConfirmed.has(snUpper)) continue;
        seenConfirmed.add(snUpper);

        const matched = printers.find((p) => p.id_serie.toUpperCase() === snUpper);

        let tonerVal = 100;
        let unitVal = 100;
        let maintVal = 100;

        if (eq.toner_nivel !== undefined && eq.toner_nivel !== null) {
          tonerVal = Number(eq.toner_nivel);
        } else if (matched && matched.consumibles?.toner_nivel !== undefined) {
          tonerVal = matched.consumibles.toner_nivel;
        }

        if (eq.unidad_imagen_nivel !== undefined && eq.unidad_imagen_nivel !== null) {
          unitVal = Number(eq.unidad_imagen_nivel);
        } else if (matched && matched.consumibles?.unidad_imagen_nivel !== undefined) {
          unitVal = matched.consumibles.unidad_imagen_nivel;
        }

        if (eq.mantenimiento_kit_nivel !== undefined && eq.mantenimiento_kit_nivel !== null) {
          maintVal = Number(eq.mantenimiento_kit_nivel);
        } else if (matched && matched.consumibles?.mantenimiento_kit_nivel !== undefined) {
          maintVal = matched.consumibles.mantenimiento_kit_nivel;
        }

        const prediction = calcularFechasPredictivas(tonerVal, unitVal, maintVal);

        const modelVal = eq.modelo || (matched ? matched.modelo : "MX431ADN");
        const areaVal = eq.area_actual || (matched ? matched.area_actual : "Soporte");
        const casVal =
          eq.codigo_caso_cas !== undefined && eq.codigo_caso_cas !== ""
            ? eq.codigo_caso_cas
            : matched
            ? matched.codigo_caso_cas
            : "";
        const detalleCasoVal =
          eq.detalle_caso !== undefined && eq.detalle_caso !== ""
            ? eq.detalle_caso
            : matched
            ? matched.detalle_caso || ""
            : "";
        const obsVal =
          eq.observaciones !== undefined && eq.observaciones !== ""
            ? eq.observaciones
            : matched && matched.observaciones
            ? matched.observaciones
            : "";
        const entityVal = eq.ubicacion_entidad || (matched ? matched.ubicacion_entidad : "Hospital");

        const computedFuncionamiento = calculateStatus(
          areaVal,
          tonerVal,
          unitVal,
          maintVal,
          obsVal
        );

        const printerDoc = {
          modelo: modelVal,
          area_actual: areaVal,
          codigo_caso_cas: casVal,
          detalle_caso: detalleCasoVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: obsVal,
          ubicacion_entidad: entityVal,
          consumibles: {
            toner_nivel: tonerVal,
            unidad_imagen_nivel: unitVal,
            mantenimiento_kit_nivel: maintVal,
            ultima_lectura: new Date()
          },
          prediccion: prediction
        };

        await createPrinterDoc(db, snUpper, printerDoc);

        await addPrinterHistoryItem(db, snUpper, {
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: printerDoc.observaciones,
          codigo_caso_cas: printerDoc.codigo_caso_cas,
          detalle_caso: printerDoc.detalle_caso,
          ubicacion_entidad: printerDoc.ubicacion_entidad,
          area_actual: areaVal,
          fecha_lectura: new Date(),
          tipo_actualizacion: "Importación Excel (IA)"
        });

        await addGeneralHistoryLog(db, {
          tipo: "impresora",
          id_serie: snUpper,
          modelo: printerDoc.modelo,
          area_actual: areaVal,
          toner_nivel: tonerVal,
          unidad_imagen_nivel: unitVal,
          mantenimiento_kit_nivel: maintVal,
          estado_funcionamiento: computedFuncionamiento,
          observaciones: printerDoc.observaciones || "",
          codigo_caso_cas: printerDoc.codigo_caso_cas || "",
          detalle_caso: printerDoc.detalle_caso || "",
          tipo_actualizacion: "Importación Excel (IA)"
        });

        auditLogLines.push(
          `- **${printerDoc.modelo}** (S/N: ${snUpper}): ${printerDoc.ubicacion_entidad} (${printerDoc.area_actual})`
        );
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `📊 **Excel Importado Exitosamente por IA:** Se procesó el archivo "${excelFileName}" y se actualizaron ${
            excelData.equipos_normalizados.length
          } registros en Firestore.\n\n**Resumen del reporte:**\n${
            excelData.reporte_resumen
          }\n\n**Equipos actualizados:**\n${auditLogLines.slice(0, 10).join("\n")}${
            auditLogLines.length > 10 ? `\n... y ${auditLogLines.length - 10} más.` : ""
          }`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);

      alert(
        `Importación completada: ${excelData.equipos_normalizados.length} equipos procesados.`
      );
      setIsExcelImportModalOpen(false);
      setExcelData(null);
      setExcelFileName("");

      navigate("/chat");
    } catch (error) {
      console.error("Error committing Excel import:", error);
      alert("Error al guardar registros de Excel: " + error.message);
    } finally {
      setIsExcelLoading(false);
    }
  };

  return {
    excelData,
    setExcelData,
    isExcelLoading,
    excelFileName,
    isExcelImportModalOpen,
    setIsExcelImportModalOpen,
    excelFileInputRef,
    handleExcelUpload,
    handleConfirmExcelImport
  };
}
