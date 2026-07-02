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
    fecha_cambio_toner: fechaToner,
    dias_restantes_unidad: diasUnidad,
    fecha_cambio_unidad: fechaUnidad,
    dias_restantes_mantenimiento: diasMantenimiento,
    fecha_cambio_mantenimiento: fechaMantenimiento
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

/**
 * Calculates the dynamic decreased level of a consumable based on a 45-day cycle (100% = 45 days)
 * @param {number} nivelActual - The saved percentage level
 * @param {Date|Timestamp} ultimaLectura - The date when the level was last saved
 * @returns {number|null} The calculated current level based on days passed
 */
export function calcularNivelConsumible(nivelActual, ultimaLectura) {
  if (nivelActual === null || nivelActual === undefined) return null;
  if (!ultimaLectura) return nivelActual;

  const hoy = new Date();
  let fechaLectura;
  if (typeof ultimaLectura.toDate === 'function') {
    fechaLectura = ultimaLectura.toDate();
  } else {
    fechaLectura = new Date(ultimaLectura);
  }

  const diffTime = hoy - fechaLectura;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return nivelActual;

  const consumoDiario = 100 / 45; // 2.22% decrease per day
  let nuevoNivel = nivelActual - (diffDays * consumoDiario);
  
  if (nuevoNivel < 0) nuevoNivel = 0;
  
  return Math.round(nuevoNivel);
}
