import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generatePDFReport = (printers, checkPrinterAlerts, isPrinterInoperative) => {
  // Configuración del documento
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  // Colores Corporativos o de Tema
  const theme = {
    primary: [41, 128, 185], // Azul
    secondary: [44, 62, 80], // Gris oscuro
    success: [39, 174, 96], // Verde
    warning: [243, 156, 18], // Naranja
    danger: [192, 57, 43], // Rojo
    lightText: [189, 195, 199],
    white: [255, 255, 255]
  };

  // 1. HEADER DEL REPORTE
  const fecha = new Date().toLocaleDateString("es-PE", { year: 'numeric', month: 'long', day: 'numeric' });
  
  doc.setFillColor(theme.secondary[0], theme.secondary[1], theme.secondary[2]);
  doc.rect(0, 0, 297, 30, "F");

  doc.setTextColor(theme.white[0], theme.white[1], theme.white[2]);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INFORME ESTRATÉGICO DE INVENTARIO", 15, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado el: ${fecha} | Sistema SAMI Lexmark`, 15, 26);

  // 2. PROCESAMIENTO DE DATOS - RESUMEN (Compras y Alertas)
  const models = [...new Set(printers.map(p => p.modelo || "MX431ADN"))].sort();
  let granTotalToner = 0;
  let granTotalKit = 0;
  let granTotalUnidad = 0;
  
  const strategicData = [];

  models.forEach(modelo => {
    const modelPrinters = printers.filter(p => (p.modelo || "MX431ADN") === modelo);
    let operativos = 0, alertas = 0, mantenimiento = 0;
    let reqToner = 0, reqKit = 0, reqUnidad = 0;
    const areasCount = {};

    modelPrinters.forEach(p => {
      const inop = isPrinterInoperative(p);
      const alert = checkPrinterAlerts(p);
      if (inop) mantenimiento++;
      else if (alert) alertas++;
      else operativos++;

      const toner = p.consumibles?.toner_nivel ?? 100;
      const kit = p.consumibles?.mantenimiento_kit_nivel ?? 100;
      const unidad = p.consumibles?.unidad_imagen_nivel ?? 100;

      if (toner <= 15) reqToner++;
      if (kit <= 15) reqKit++;
      if (unidad <= 15) reqUnidad++;

      const area = p.area_actual || "Sin Asignar";
      areasCount[area] = (areasCount[area] || 0) + 1;
    });

    granTotalToner += reqToner;
    granTotalKit += reqKit;
    granTotalUnidad += reqUnidad;

    const topAreas = Object.entries(areasCount)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 2)
      .map(e => `${e[0]}`)
      .join(", ");

    strategicData.push([
      modelo,
      modelPrinters.length.toString(),
      operativos.toString(),
      alertas.toString(),
      mantenimiento.toString(),
      reqToner.toString(),
      reqKit.toString(),
      reqUnidad.toString(),
      topAreas
    ]);
  });

  // Fila Total al final del Resumen
  strategicData.push([
    "TOTAL COMPRAS SUGERIDAS", "", "", "", "", 
    granTotalToner > 0 ? granTotalToner.toString() : "-", 
    granTotalKit > 0 ? granTotalKit.toString() : "-", 
    granTotalUnidad > 0 ? granTotalUnidad.toString() : "-", 
    ""
  ]);

  // Renderizar Tabla de Resumen
  doc.setTextColor(theme.secondary[0], theme.secondary[1], theme.secondary[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen Ejecutivo y Necesidades de Compra", 15, 42);

  autoTable(doc, {
    startY: 48,
    head: [['Modelo', 'Total', 'OK', 'Alertas', 'Mantenimiento', 'Comprar\nTóner', 'Comprar\nKit Mant.', 'Comprar\nU. Imagen', 'Top Áreas']],
    body: strategicData,
    theme: 'grid',
    headStyles: { fillColor: theme.primary, textColor: theme.white, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center', textColor: theme.success, fontStyle: 'bold' },
      3: { halign: 'center', textColor: theme.warning, fontStyle: 'bold' },
      4: { halign: 'center', textColor: theme.danger, fontStyle: 'bold' },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'center', fontStyle: 'bold' },
      7: { halign: 'center', fontStyle: 'bold' },
      8: { fontSize: 8 }
    },
    didParseCell: function(data) {
      if (data.row.index === strategicData.length - 1 && data.section === 'body') {
        data.cell.styles.fillColor = [240, 240, 240];
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index >= 5 && data.column.index <= 7) {
            data.cell.styles.textColor = theme.danger;
            data.cell.styles.fontSize = 11;
        }
      }
    }
  });


  // 3. PROCESAMIENTO DE DATOS - INVENTARIO DETALLADO
  const detailedData = printers.map((p, idx) => {
    const inop = isPrinterInoperative(p);
    const alert = checkPrinterAlerts(p);
    const estado = inop ? "INOPERATIVO" : (alert ? "ALERTA" : "OK");
    
    return [
      (idx + 1).toString(),
      p.modelo || "MX431ADN",
      p.id_serie,
      p.area_actual || "Soporte",
      estado,
      p.consumibles?.toner_nivel != null ? `${p.consumibles.toner_nivel}%` : "-",
      p.consumibles?.mantenimiento_kit_nivel != null ? `${p.consumibles.mantenimiento_kit_nivel}%` : "-",
      p.consumibles?.unidad_imagen_nivel != null ? `${p.consumibles.unidad_imagen_nivel}%` : "-"
    ];
  });

  const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 15 : 100;
  
  // Agregar nueva página si no hay espacio
  if (finalY > 150) {
    doc.addPage();
    doc.setTextColor(theme.secondary[0], theme.secondary[1], theme.secondary[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle General del Inventario", 15, 20);
    autoTable(doc, {
        startY: 28,
        head: [['N°', 'Modelo', 'N° Serie', 'Área', 'Estado', 'Tóner', 'Kit Mant.', 'U. Imagen']],
        body: detailedData,
        theme: 'striped',
        headStyles: { fillColor: theme.secondary, textColor: theme.white },
        columnStyles: {
            4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right' }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 4) {
             const val = data.cell.raw;
             if (val === 'OK') data.cell.styles.textColor = theme.success;
             if (val === 'ALERTA') data.cell.styles.textColor = theme.warning;
             if (val === 'INOPERATIVO') data.cell.styles.textColor = theme.danger;
          }
        }
    });
  } else {
    doc.setTextColor(theme.secondary[0], theme.secondary[1], theme.secondary[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle General del Inventario", 15, finalY);
    
    autoTable(doc, {
        startY: finalY + 6,
        head: [['N°', 'Modelo', 'N° Serie', 'Área', 'Estado', 'Tóner', 'Kit Mant.', 'U. Imagen']],
        body: detailedData,
        theme: 'striped',
        headStyles: { fillColor: theme.secondary, textColor: theme.white },
        columnStyles: {
            4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right' }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 4) {
             const val = data.cell.raw;
             if (val === 'OK') data.cell.styles.textColor = theme.success;
             if (val === 'ALERTA') data.cell.styles.textColor = theme.warning;
             if (val === 'INOPERATIVO') data.cell.styles.textColor = theme.danger;
          }
        }
    });
  }

  // 4. PIE DE PÁGINA GLOBALES
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount} - Documento de uso interno SAMI Lexmark`, 
      doc.internal.pageSize.width / 2, 
      doc.internal.pageSize.height - 10, 
      { align: 'center' }
    );
  }

  // Descargar Archivo
  doc.save(`Informe_Estrategico_Impresoras_${fecha.replace(/ /g, '_')}.pdf`);
};
