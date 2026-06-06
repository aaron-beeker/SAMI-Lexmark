/**
 * Calculates predictive remaining days and estimated replacement dates for toner and image unit
 * based on the 45-day cycle linear wear equation calibrated for MUR Tecnología.
 * 
 * @param {number} tonerNivel - Current toner percentage (0-100)
 * @param {number} unidadNivel - Current image unit percentage (0-100)
 * @returns {object} Calculated remaining days and formatted dates (es-PE)
 */
export function calcularFechasPredictivas(tonerNivel, unidadNivel) {
  const hoy = new Date();
  
  const diasToner = Math.round(((tonerNivel ?? 100) / 100) * 45);
  const diasUnidad = Math.round(((unidadNivel ?? 100) / 100) * 45);

  const fechaToner = new Date();
  fechaToner.setDate(hoy.getDate() + diasToner);

  const fechaUnidad = new Date();
  fechaUnidad.setDate(hoy.getDate() + diasUnidad);

  return {
    dias_restantes_toner: diasToner,
    fecha_cambio_toner: fechaToner.toLocaleDateString('es-PE'),
    dias_restantes_unidad: diasUnidad,
    fecha_cambio_unidad: fechaUnidad.toLocaleDateString('es-PE')
  };
}
