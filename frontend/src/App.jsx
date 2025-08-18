import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Papers from './pages/Papers';
import PaperDetail from './pages/PaperDetail';
import Researchers from './pages/Researchers';
import ResearcherDetail from './pages/ResearcherDetail';
import ImportHistory from './pages/ImportHistory';

function App() {
  return (
    <Routes>
      {/* Wrap all pages within the Layout component */}
      <Route path="/" element={<Layout />}>
        {/* Redirect root to /papers */}
        <Route index element={<Navigate to="/papers" replace />} />

          {/* Paper Routes */}
          <Route path="papers">
            <Route index element={<Papers />} /> {/* List page at /papers */}
            <Route path=":paperId" element={<PaperDetail />} /> {/* Detail page at /papers/:paperId */}
          </Route>

          {/* Researcher Routes */}
          <Route path="researchers">
            <Route index element={<Researchers />} /> {/* List page at /researchers */}
            <Route path=":researcherId" element={<ResearcherDetail />} /> {/* Detail page at /researchers/:researcherId */}
          </Route>

          {/* Import History Route */}
          <Route path="import-history" element={<ImportHistory />} />

          {/* 404 Not Found Route */}
          <Route path="*" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">404 Not Found</h2>
                <p className="text-gray-600">The page you requested does not exist.</p>
              </div>
            </div>
          } />
        </Route>
      </Routes>
  );
}

export default App;