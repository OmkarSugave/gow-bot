import React, { useState, useEffect } from 'react';
import FormPage from './pages/FormPage';
import Admin from './pages/Admin';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Listen for custom navigation events and standard back/forward button clicks
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('pushstate-change', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate-change', handleLocationChange);
    };
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    // Dispatch a custom event to notify state listeners on programmatically pushed history
    window.dispatchEvent(new Event('pushstate-change'));
  };

  if (currentPath.startsWith('/form')) {
    return <FormPage navigate={navigate} />;
  }

  return <Admin navigate={navigate} />;
}

export default App;
