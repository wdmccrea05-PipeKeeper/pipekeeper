import { useEffect, useRef } from "react";
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import GlobalErrorBoundary from '@/components/system/GlobalErrorBoundary';
import PublicSharedRecord from '@/pages/PublicSharedRecord';
import CuratorAnalyticsDashboard from '@/pages/CuratorAnalyticsDashboard';
import CollectionInsightsShare from '@/pages/CollectionInsightsShare';
import Whiskey from '@/pages/Whiskey.jsx';
import WhiskeyAnalytics from '@/pages/WhiskeyAnalytics';
import Tastings from '@/pages/Tastings';
import Curator from '@/pages/Curator';
import Subscription from '@/pages/Subscription';
import SubscriptionSuccessFlow from '@/pages/SubscriptionSuccessFlow';
import CollectionHub from '@/pages/CollectionHub';
import PipeKeeper from '@/pages/PipeKeeper';
import WhiskeyKeeper from '@/pages/WhiskeyKeeper';
import WhiskeyAIUpdates from '@/pages/WhiskeyAIUpdates';
import BottleDetail from '@/pages/BottleDetail';
import BottleFormPage from '@/pages/BottleFormPage';
import HelpCenter from '@/pages/HelpCenter';
import Tutorials from '@/pages/Tutorials';
import PipeDetail from '@/pages/PipeDetail';
import TobaccoDetail from '@/pages/TobaccoDetail';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const loginRedirectedRef = useRef(false);

  // Show loading spinner while checking auth or public settings
  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect unauthenticated users to login
  if (authError?.type === 'auth_required') {
    if (!loginRedirectedRef.current) {
      loginRedirectedRef.current = true;
      navigateToLogin();
    }
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // User registered check
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app
  return (


function App() {

  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router basename="/">
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
        </QueryClientProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  )
}

export default App