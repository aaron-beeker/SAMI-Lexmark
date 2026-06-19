import { useState } from "react";

export function useSettings() {
  const [showSettingsSaved, setShowSettingsSaved] = useState(false);

  const handleSaveApiKey = (e) => {
    if (e) e.preventDefault();
    setShowSettingsSaved(true);
    setTimeout(() => setShowSettingsSaved(false), 3000);
  };

  return {
    showSettingsSaved,
    handleSaveApiKey
  };
}
