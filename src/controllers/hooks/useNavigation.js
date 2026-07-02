import { useState } from "react";

export function useNavigation() {
  const [filterCriticidad, setFilterCriticidad] = useState("all");

  return {
    filterCriticidad,
    setFilterCriticidad
  };
}
