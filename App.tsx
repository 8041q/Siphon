// App.tsx
import { useEffect } from 'react';
import MapScreen from './MapScreen';
import { registerBackgroundFetch } from './backgroundTask';

export default function App() {
  useEffect(() => {
    // Register background fetch task on app startup
    registerBackgroundFetch();
  }, []);

  return <MapScreen />;
}