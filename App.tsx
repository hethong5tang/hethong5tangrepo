import React, { Suspense, lazy, useEffect } from 'react';
import { UserRole } from './types';
import { useAuth } from './features/auth/useAuth';
import PageLoader from './components/PageLoader';
import { useSettings } from './features/settings/useSettings';
import { useActions } from './features/actions/useActions';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));

const App = () => {
  const { userRole, loggedInUser } = useAuth();
  const { settingsState: { systemSettings } } = useSettings();
  const { handleUpdateSystemSettings } = useActions();

  // Tự động tắt chế độ bảo trì khi hết thời gian
  useEffect(() => {
    if (systemSettings.isMaintenanceMode && systemSettings.maintenanceEndTime) {
      const interval = setInterval(() => {
        if (systemSettings.maintenanceEndTime && new Date() > new Date(systemSettings.maintenanceEndTime)) {
          handleUpdateSystemSettings({
            ...systemSettings,
            isMaintenanceMode: false,
            maintenanceEndTime: null,
          });
        }
      }, 10000); 
      return () => clearInterval(interval);
    }
  }, [systemSettings.isMaintenanceMode, systemSettings.maintenanceEndTime, handleUpdateSystemSettings]);
  
  const isEffectivelyInMaintenance = systemSettings.isMaintenanceMode && 
    (!systemSettings.maintenanceEndTime || new Date(systemSettings.maintenanceEndTime) > new Date());

  if (!userRole) {
    return (
      <Suspense fallback={<PageLoader fullScreen />}>
        <LandingPage />
      </Suspense>
    );
  }
  
  if (isEffectivelyInMaintenance && userRole !== UserRole.Admin) {
    return (
      <Suspense fallback={<PageLoader fullScreen />}>
        <MaintenancePage />
      </Suspense>
    );
  }

  return (
    <div className="h-full">
      <Suspense fallback={<PageLoader fullScreen />}>
        {userRole === UserRole.Admin ? <AdminDashboard /> : <UserDashboard />}
      </Suspense>
    </div>
  );
};

export default App;
