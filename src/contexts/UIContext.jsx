import React, { createContext, useContext } from 'react';
import { useNavigation } from '../controllers/hooks/useNavigation';
import { useSettings } from '../controllers/hooks/useSettings';

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const navigation = useNavigation();
  const settings = useSettings();
  
  const value = {
    // Navigation
    filterCriticidad: navigation.filterCriticidad,
    setFilterCriticidad: navigation.setFilterCriticidad,

    // Settings
    showSettingsSaved: settings.showSettingsSaved,
    handleSaveApiKey: settings.handleSaveApiKey,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUIContext = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within a UIProvider');
  }
  return context;
};
