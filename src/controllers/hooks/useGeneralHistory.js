import { useState } from "react";
import { addGeneralHistory } from "../../models/HistoryModel";

export function useGeneralHistory() {
  const [generalHistory, setGeneralHistory] = useState([]);

  const addGeneralHistoryLog = async (db, logData) => {
    await addGeneralHistory(db, logData);
  };

  return {
    generalHistory,
    setGeneralHistory,
    addGeneralHistoryLog
  };
}
