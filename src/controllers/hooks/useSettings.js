import { useState } from "react";

export function useSettings() {
  const [apiKeyInput, setApiKeyInput] = useState(
    localStorage.getItem("sami_gemini_api_key") || ""
  );
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState(
    localStorage.getItem("sami_openrouter_api_key") || ""
  );
  const [showSettingsSaved, setShowSettingsSaved] = useState(false);

  const handleSaveApiKey = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem("sami_gemini_api_key", apiKeyInput);
    localStorage.setItem("sami_openrouter_api_key", openRouterKeyInput);
    setShowSettingsSaved(true);
    setTimeout(() => setShowSettingsSaved(false), 3000);
  };

  return {
    apiKeyInput,
    setApiKeyInput,
    openRouterKeyInput,
    setOpenRouterKeyInput,
    showSettingsSaved,
    handleSaveApiKey
  };
}
