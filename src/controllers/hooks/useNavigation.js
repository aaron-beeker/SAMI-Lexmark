import { useState } from "react";

export function useNavigation() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [filterCriticidad, setFilterCriticidad] = useState("all");

  return {
    currentTab,
    setCurrentTab,
    filterCriticidad,
    setFilterCriticidad
  };
}
