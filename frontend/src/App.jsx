import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Repositories from './pages/Repositories';
import RepositoryDetail from './pages/RepositoryDetail';
import Contributors from './pages/Contributors';
import ContributorDetail from './pages/ContributorDetail';
import { ReactFlowProvider } from '@xyflow/react';

function App() {
  return (
<ReactFlowProvider>
    <Routes>
      {/* Wrap all pages within the Layout component */}
      <Route path="/" element={<Layout />}>
        {/* Index route for the dashboard */}
        <Route index element={<Dashboard />} />

        {/* Repository Routes */}
        <Route path="repositories">
           <Route index element={<Repositories />} /> {/* List page at /repositories */}
           <Route path=":repoId" element={<RepositoryDetail />} /> {/* Detail page at /repositories/:repoId */}
        </Route>

        {/* Contributor Routes */}
        <Route path="contributors">
           <Route index element={<Contributors />} /> {/* List page at /contributors */}
           <Route path=":contributorId" element={<ContributorDetail />} /> {/* Detail page at /contributors/:contributorId */}
        </Route>

         {/* Optional: Add a 404 Not Found Route */}
         <Route path="*" element={<div><h2>404 Not Found</h2><p>The page you requested does not exist.</p></div>} />
      </Route>
    </Routes>
    </ReactFlowProvider>
  );
}

export default App;