"use client";
import { createContext, useContext, useState } from "react";

const ExportContext = createContext();

export const ExportProvider = ({ children }) => {
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = (ids, check) => {
    if (check) setSelectedIds(ids);
    else setSelectedIds([]);
  };

  return (
    <ExportContext.Provider value={{ selectedIds, toggleId, toggleAll }}>
      {children}
    </ExportContext.Provider>
  );
};

export const useExport = () => useContext(ExportContext);
