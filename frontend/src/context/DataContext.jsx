import React, { createContext, useState, useEffect, useContext } from 'react';

// Create the context
const DataContext = createContext();

// Create a provider component
export const DataProvider = ({ children }) => {
  const [papers, setPapers] = useState([]);
  const [researchers, setResearchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch data from the API
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const backendUrl = 'http://localhost:8000/api/get_data/';
      const response = await fetch(backendUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPapers(data.papers || []);
      setResearchers(data.researchers || []);
      setIsLoading(false);
    } catch (e) {
      console.error("Failed to fetch data:", e);
      setError(e.message || 'Failed to fetch data');
      setIsLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Value provided by the context
  const value = {
    papers,
    researchers,
    isLoading,
    error,
    refreshData: fetchData // Expose a function to refetch if needed
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// Custom hook to easily consume the context
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};