import React from "react";
import ReplenishmentView from "./ReplenishmentView";
import StockView from "./StockView";

export default function RepuestosView({
  printers,
  repuestos,
  handleDecrementStockClick,
  updateManualStock,
  isAuthenticated
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1.5 border-b border-outline-variant/60 pb-4">
        <h1 className="font-headline-lg text-2xl text-on-background font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl">layers</span>
          Gestión de Repuestos y Consumibles
        </h1>
        <p className="text-sm text-on-surface-variant font-medium">
          Control de stock en depósito/hospital y análisis de necesidades de compra para reabastecimiento.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Replenishment / Shopping assistant */}
        <div className="lg:col-span-7 space-y-6">
          <ReplenishmentView printers={printers} repuestos={repuestos} />
        </div>

        {/* Right Column - Stock lists */}
        <div className="lg:col-span-5 space-y-6">
          <StockView
            repuestos={repuestos}
            handleDecrementStockClick={handleDecrementStockClick}
            updateManualStock={updateManualStock}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </div>
  );
}
