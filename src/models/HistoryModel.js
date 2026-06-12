import { collection, addDoc, query, orderBy, limit, onSnapshot } from "firebase/firestore";

// Listen to the general history logs feed in real time (capped at latest 50 records)
export const subscribeGeneralHistory = (db, onData, onError) => {
  const colRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
  const q = query(colRef, orderBy("timestamp", "desc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.timestamp?.toDate
        ? data.timestamp.toDate()
        : (data.timestamp ? new Date(data.timestamp) : new Date());
      list.push({
        id: doc.id,
        ...data,
        timestamp: date
      });
    });
    onData(list);
  }, onError);
};

// Add a new log entry to the general history log
export const addGeneralHistory = async (db, logData) => {
  const colRef = collection(db, "artifacts", "sami-lexmark", "public", "data", "historial_general");
  await addDoc(colRef, {
    ...logData,
    timestamp: new Date()
  });
};
