import { collection, doc, writeBatch, getDocs, limit, query, serverTimestamp } from "firebase/firestore";
import { calcularFechasPredictivas } from "./PredictionService";

const SEED_DATA = [
  {
    "id_serie": "701924410D8X7",
    "modelo": "MX431ADN",
    "area_actual": "Telecomunicaciones",
    "observaciones": "Se traba al escanear, se sale la hoja blanca para el escaneo.",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701924410D8X2",
    "modelo": "MX431ADN",
    "area_actual": "Admisión 11 y 12",
    "observaciones": "",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701924410D8XN",
    "modelo": "MX431ADN",
    "area_actual": "Informática",
    "observaciones": "Ok",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701924410D8X5",
    "modelo": "MX431ADN",
    "area_actual": "Atención Inmediata",
    "observaciones": "Ok",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701924410D5V7",
    "modelo": "MX431ADN",
    "area_actual": "Soporte",
    "observaciones": "Inoperativa, falta kit de rodillos",
    "codigo_caso_cas": "CAS-6013278-V6N2C5"
  },
  {
    "id_serie": "701925110FD86",
    "modelo": "MX431ADN",
    "area_actual": "Admisión 10",
    "observaciones": "",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701924410D5VD",
    "modelo": "MX431ADN",
    "area_actual": "OEI Jefatura",
    "observaciones": "",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701924410D8XM",
    "modelo": "MX431ADN",
    "area_actual": "Admisión emergencia",
    "observaciones": "Imprime pero tiene detalles a solucionar",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701934240K196",
    "modelo": "MX431ADN",
    "area_actual": "Soporte",
    "observaciones": "Inoperativa, COMPRAR GARANTIA - Escalar fabricante",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701924410D8X9",
    "modelo": "MX431ADN",
    "area_actual": "Archivos central tramite documentario",
    "observaciones": "",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701925110FD88",
    "modelo": "MX431ADN",
    "area_actual": "Soporte",
    "observaciones": "Reparada",
    "codigo_caso_cas": "CAS-6013422-F1G8P8"
  },
  {
    "id_serie": "701925110FD89",
    "modelo": "MX431ADN",
    "area_actual": "Soporte",
    "observaciones": "Operativa 02/06/2026. Necesita cambio de piezas",
    "codigo_caso_cas": "CAS-6013525-W3C7M0"
  },
  {
    "id_serie": "701924410D8XD",
    "modelo": "MX431ADN",
    "area_actual": "Pendiente de asignación",
    "observaciones": "Llegó operativa por parte del CAS",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "7464443228K2G",
    "modelo": "MX722ADHE",
    "area_actual": "Emergencia Tópico A Y B",
    "observaciones": "",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "7020443309GKC",
    "modelo": "MX632ADWE",
    "area_actual": "Archivo",
    "observaciones": "Necesita mantenimiento.",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "70204423099GP",
    "modelo": "MX632ADWE",
    "area_actual": "Emergencia Tópico C",
    "observaciones": "",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701625110FD85",
    "modelo": "MX431ADN",
    "area_actual": "Otorrinolaringología 14",
    "observaciones": "Ok",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701925110FD8H",
    "modelo": "MX431ADN",
    "area_actual": "Hospitalizacion Oncologia",
    "observaciones": "",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701925110FD8L",
    "modelo": "MX431ADN",
    "area_actual": "Hospitalizacion Oncologia",
    "observaciones": "",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701925110FD8G",
    "modelo": "MX431ADN",
    "area_actual": "Hematología banco de sangre",
    "observaciones": "",
    "codigo_caso_cas": ""
  },
  {
    "id_serie": "701925110FD87",
    "modelo": "MX431ADN",
    "area_actual": "Admisión oncología",
    "observaciones": "",
    "codigo_caso_cas": ""
  }
];

export async function seedPrintersIfEmpty(db) {
  try {
    const printersColRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "impresoras");
    
    // Check if collection is empty by fetching a single document
    const q = query(printersColRef, limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log("Firestore printers collection already has data. Skipping seed.");
      return false;
    }

    console.log("Printers collection is empty. Performing batch write seed of 21 printers...");
    const batch = writeBatch(db);

    SEED_DATA.forEach((printer, index) => {
      const docRef = doc(printersColRef, printer.id_serie);
      
      // Determine dynamic levels and status to present a realistic dashboard initially
      let toner = 90;
      let unit = 95;
      let crit = "Estable";
      
      const obs = printer.observaciones.toLowerCase();
      if (obs.includes("inoperativa") || obs.includes("comprar")) {
        crit = "Crítico";
        toner = 0;
        unit = 0;
      } else if (obs.includes("traba") || obs.includes("necesita") || obs.includes("detalles")) {
        crit = "Advertencia";
        toner = 15;
        unit = 35;
      } else {
        // Vary the toner/unit levels slightly based on index
        toner = 100 - ((index * 7) % 60);
        unit = 100 - ((index * 4) % 40);
        if (toner <= 15 || unit <= 15) {
          crit = "Advertencia";
        }
      }

      const prediction = calcularFechasPredictivas(toner, unit);

      const printerDoc = {
        modelo: printer.modelo,
        area_actual: printer.area_actual,
        codigo_caso_cas: printer.codigo_caso_cas || "",
        estado_criticidad: crit,
        observaciones: printer.observaciones || "",
        consumibles: {
          toner_nivel: toner,
          unidad_imagen_nivel: unit,
          ultima_lectura: new Date() // Fallback to current Date
        },
        prediccion: prediction
      };

      batch.set(docRef, printerDoc);
    });

    await batch.commit();
    console.log("Firestore successfully seeded with 21 printers.");
    return true;
  } catch (error) {
    console.error("Error seeding Firestore:", error);
    throw error;
  }
}
