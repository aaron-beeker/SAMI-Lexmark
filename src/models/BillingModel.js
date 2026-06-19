import {
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy
} from "firebase/firestore";

// Listen to monthly billing cycles in real time
export const subscribeBillingCycles = (db, onData, onError) => {
  const colRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "facturacion_mensual");
  // Order by creation time or fecha_corte
  const q = query(colRef, orderBy("fecha_corte", "asc"));
  
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: doc.id,
        ...data,
        fecha_corte: data.fecha_corte?.toDate ? data.fecha_corte.toDate() : new Date(data.fecha_corte)
      });
    });
    onData(list);
  }, onError);
};

// Add a new monthly billing cycle record
export const addBillingCycle = async (db, billingDoc) => {
  const colRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "facturacion_mensual");
  await addDoc(colRef, billingDoc);
};
