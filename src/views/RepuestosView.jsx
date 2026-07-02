import React from "react";
import ReplenishmentView from "./ReplenishmentView";
import StockView from "./StockView";
import { useAuthContext } from '../contexts/AuthContext';
import { useDataContext } from '../contexts/DataContext';


export default function RepuestosView() {
  const { isAuthenticated } = useAuthContext();
  const { printers, repuestos, handleDecrementStockClick, updateManualStock } = useDataContext();

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header Minimalista */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-md text-2xl text-on-background font-black tracking-tight">Repuestos y Consumibles</h2>
          <p className="text-sm text-outline font-medium mt-1">Gestión de stock, transferencias y análisis de reabastecimiento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column - Stock lists (Moved to left and made more prominent) */}
        <div className="xl:col-span-6 space-y-6">
          <StockView
            repuestos={repuestos}
            handleDecrementStockClick={handleDecrementStockClick}
            updateManualStock={updateManualStock}
            isAuthenticated={isAuthenticated}
          />
        </div>

        {/* Right Column - Replenishment / Shopping assistant */}
        <div className="xl:col-span-6 space-y-6">
          <ReplenishmentView printers={printers} repuestos={repuestos} />
        </div>
      </div>
    </div>
  );
}
