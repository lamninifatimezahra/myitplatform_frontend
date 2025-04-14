"use client";

import { createContext, useContext, useState } from "react";

const GlobalFilterContext = createContext({
  globalStartDate: null,
  globalEndDate: null,
  globalModifiedAt: 0,
  setGlobalFilter: () => {},
});

export const GlobalFilterProvider = ({ children }) => {
  const [globalStartDate, setGlobalStartDate] = useState(null);
  const [globalEndDate, setGlobalEndDate] = useState(null);
  const [globalModifiedAt, setGlobalModifiedAt] = useState(0);

  const setGlobalFilter = (start, end) => {
    setGlobalStartDate(start);
    setGlobalEndDate(end);
    setGlobalModifiedAt(Date.now());
  };

  return (
    <GlobalFilterContext.Provider value={{ globalStartDate, globalEndDate, globalModifiedAt, setGlobalFilter }}>
      {children}
    </GlobalFilterContext.Provider>
  );
};

export const useGlobalFilter = () => useContext(GlobalFilterContext);
