"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const DashboardContext = createContext({
  panels: [],
  activePanelId: null,
  hubTitle: "",
  handleSelect: () => {},
  registerPanels: () => {},
});

export function DashboardProvider({ children }) {
  const [panels, setPanels] = useState([]);
  const [activePanelId, setActivePanelId] = useState(null);
  const [hubTitle, setHubTitle] = useState("");
  const [selectCallback, setSelectCallback] = useState(null);

  const registerPanels = useCallback(({ items, activeId, onSelect, title }) => {
    setPanels(items || []);
    setActivePanelId(activeId || null);
    setSelectCallback(() => onSelect);
    if (title) setHubTitle(title);
  }, []);

  const handleSelect = useCallback((id) => {
    setActivePanelId(id);
    if (selectCallback) {
      selectCallback(id);
    }
  }, [selectCallback]);

  return (
    <DashboardContext.Provider
      value={{
        panels,
        activePanelId,
        hubTitle,
        handleSelect,
        registerPanels,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardNav() {
  return useContext(DashboardContext);
}
