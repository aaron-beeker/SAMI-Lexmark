/**
 * Linear prediction strategy based on the 45-day cycle wear equation calibrated for MUR Tecnología.
 * Satisfies the prediction strategy signature: (toner, unit, maintenance) -> result object
 * 
 * @param {number} tonerNivel 
 * @param {number} unidadNivel 
 * @param {number} mantenimientoNivel 
 * @returns {object} Calculated remaining days and dates
 */
export const linearPredictionStrategy = (tonerNivel, unidadNivel, mantenimientoNivel) => {
  const hoy = new Date();
  
  const diasToner = Math.round(((tonerNivel ?? 100) / 100) * 45);
  const diasUnidad = Math.round(((unidadNivel ?? 100) / 100) * 45);
  const diasMantenimiento = Math.round(((mantenimientoNivel ?? 100) / 100) * 45);

  const fechaToner = new Date();
  fechaToner.setDate(hoy.getDate() + diasToner);

  const fechaUnidad = new Date();
  fechaUnidad.setDate(hoy.getDate() + diasUnidad);

  const fechaMantenimiento = new Date();
  fechaMantenimiento.setDate(hoy.getDate() + diasMantenimiento);

  return {
    dias_restantes_toner: diasToner,
    fecha_cambio_toner: fechaToner.toLocaleDateString('es-PE'),
    dias_restantes_unidad: diasUnidad,
    fecha_cambio_unidad: fechaUnidad.toLocaleDateString('es-PE'),
    dias_restantes_mantenimiento: diasMantenimiento,
    fecha_cambio_mantenimiento: fechaMantenimiento.toLocaleDateString('es-PE')
  };
};

/**
 * Calculates predictive remaining days and estimated replacement dates.
 * Open for extension (can pass different strategies), closed for modification.
 * 
 * @param {number} tonerNivel - Current toner percentage (0-100)
 * @param {number} unidadNivel - Current image unit percentage (0-100)
 * @param {number} [mantenimientoNivel=100] - Current maintenance kit percentage (0-100)
 * @param {function} [strategy=linearPredictionStrategy] - The prediction calculation strategy to use
 * @returns {object} Calculated remaining days and formatted dates (es-PE)
 */
export function calcularFechasPredictivas(tonerNivel, unidadNivel, mantenimientoNivel, strategy = linearPredictionStrategy) {
  return strategy(tonerNivel, unidadNivel, mantenimientoNivel);
}
