import React, { createContext, useState, useEffect, useContext } from 'react';
import { mockData } from '../data/mockData'; // Import the mock data

// Create the context
const DataContext = createContext();

// Create a provider component
export const DataProvider = ({ children }) => {
  const [repositories, setRepositories] = useState([]);
  const [contributors, setContributors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch data (currently uses mock, prepared for API)
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {

      const backendUrl = 'http://localhost:8000/api/get_data/'; // Replace with your actual API endpoint
      const response = await fetch(backendUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRepositories(data.repositories || []);
      setContributors(data.contributors || []);
    

      setIsLoading(false);
    } catch (e) {
      console.error("Failed to fetch data:", e);
      setError(e.message || 'Failed to fetch data');
      // Keep existing data or clear it depending on desired behaviour on error
      // setRepositories([]);
      // setContributors([]);
      setIsLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Value provided by the context
  const value = {
    repositories,
    contributors,
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