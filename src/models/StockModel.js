import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";

// Listen to spare parts (repuestos) list in real time
export const subscribeRepuestos = (db, onData, onError) => {
  const colRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "repuestos");
  return onSnapshot(colRef, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({
        id: doc.id,
        ...doc.data()
      });
    });
    onData(list);
  }, onError);
};

// Update stock amounts (e.g. depósito vs hospital levels)
export const updateStock = async (db, stockId, updateData) => {
  const docRef = doc(db, "artifacts", "sami-lexmark", "public", "data", "repuestos", stockId);
  await updateDoc(docRef, updateData);
};
