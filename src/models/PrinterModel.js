import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  addDoc
} from "firebase/firestore";

// Listen to printers list in real time
export const subscribePrinters = (db, onData, onError) => {
  const colRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "impresoras");
  return onSnapshot(colRef, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({
        id_serie: doc.id,
        ...doc.data()
      });
    });
    onData(list);
  }, onError);
};

// Listen to readings history for a single printer
export const subscribePrinterHistory = (db, printerId, onData, onError) => {
  const colRef = collection(
    db,
    "artifacts",
    "sami-lexmark",
    "public",
    "data",
    "impresoras",
    printerId,
    "historial_lecturas"
  );
  return onSnapshot(colRef, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.fecha_lectura?.toDate
        ? data.fecha_lectura.toDate()
        : (data.fecha_lectura ? new Date(data.fecha_lectura) : new Date());
      list.push({
        id: doc.id,
        ...data,
        fecha_lectura: date
      });
    });
    // Sort descending by date
    list.sort((a, b) => b.fecha_lectura - a.fecha_lectura);
    onData(list);
  }, onError);
};

// Save a single printer reading history record
export const addPrinterHistory = async (db, printerId, historyDoc) => {
  const colRef = collection(
    db,
    "artifacts",
    "sami-lexmark",
    "public",
    "data",
    "impresoras",
    printerId,
    "historial_lecturas"
  );
  await addDoc(colRef, historyDoc);
};

// Create or overwrite a printer document
export const createPrinter = async (db, printerId, printerDoc) => {
  const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", printerId);
  await setDoc(docRef, printerDoc);
};

// Update printer fields in standard flow
export const updatePrinter = async (db, printerId, updateData) => {
  const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", printerId);
  await updateDoc(docRef, updateData);
};

// Delete a printer document
export const deletePrinterDoc = async (db, printerId) => {
  const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "impresoras", printerId);
  await deleteDoc(docRef);
};

// Migrate historical logs and details when changing a printer's Serial Number
export const renamePrinter = async (db, oldId, newId, newPrinterDoc, newHistoryDoc) => {
  await createPrinter(db, newId, newPrinterDoc);

  const oldHistoryRef = collection(
    db,
    "artifacts",
    "sami-lexmark",
    "public",
    "data",
    "impresoras",
    oldId,
    "historial_lecturas"
  );
  const historySnap = await getDocs(oldHistoryRef);
  const newHistoryRef = collection(
    db,
    "artifacts",
    "sami-lexmark",
    "public",
    "data",
    "impresoras",
    newId,
    "historial_lecturas"
  );

  for (const histDoc of historySnap.docs) {
    await setDoc(doc(newHistoryRef, histDoc.id), histDoc.data());
    await deleteDoc(doc(oldHistoryRef, histDoc.id));
  }

  await addDoc(newHistoryRef, newHistoryDoc);
  await deletePrinterDoc(db, oldId);
};

// Delete a specific history log entry for a printer
export const deletePrinterHistoryItem = async (db, printerId, historyId) => {
  const docRef = doc(
    db,
    "artifacts",
    "sami-lexmark",
    "public",
    "data",
    "impresoras",
    printerId,
    "historial_lecturas",
    historyId
  );
  await deleteDoc(docRef);
};
