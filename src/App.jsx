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

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();
  const loginRedirectedRef = useRef(false);

  // Show loading spinner while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/share/:moduleType/:shareToken" element={<PublicSharedRecord />} />
      <Route path="/CuratorAnalyticsDashboard" element={
        <LayoutWrapper currentPageName="CuratorAnalyticsDashboard">
          <CuratorAnalyticsDashboard />
        </LayoutWrapper>
      } />
      <Route path="/CollectionInsightsShare" element={
        <LayoutWrapper currentPageName="CollectionInsightsShare">
          <CollectionInsightsShare />
        </LayoutWrapper>
      } />
      <Route path="/Whiskey" element={
        <LayoutWrapper currentPageName="Whiskey">
          <Whiskey />
        </LayoutWrapper>
      } />
      <Route path="/Curator" element={
        <LayoutWrapper currentPageName="Curator">
          <Curator />
        </LayoutWrapper>
      } />
      <Route path="/Subscription" element={
        <LayoutWrapper currentPageName="Subscription">
          <Subscription />
        </LayoutWrapper>
      } />
      <Route path="/SubscriptionSuccessFlow" element={
        <SubscriptionSuccessFlow />
      } />
      <Route path="/CollectionHub" element={
        <LayoutWrapper currentPageName="CollectionHub">
          <CollectionHub />
        </LayoutWrapper>
      } />
      <Route path="/PipeKeeper" element={
        <LayoutWrapper currentPageName="PipeKeeper">
          <PipeKeeper />
        </LayoutWrapper>
      } />
      <Route path="/WhiskeyKeeper" element={
        <LayoutWrapper currentPageName="WhiskeyKeeper">
          <WhiskeyKeeper />
        </LayoutWrapper>
      } />
      <Route path="/WhiskeyAIUpdates" element={
        <LayoutWrapper currentPageName="WhiskeyAIUpdates">
          <WhiskeyAIUpdates />
        </LayoutWrapper>
      } />
      <Route path="/BottleDetail" element={
        <LayoutWrapper currentPageName="BottleDetail">
          <BottleDetail />
        </LayoutWrapper>
      } />
      <Route path="/BottleForm" element={
        <LayoutWrapper currentPageName="BottleForm">
          <BottleFormPage />
        </LayoutWrapper>
      } />
      <Route path="/HelpCenter" element={
        <LayoutWrapper currentPageName="HelpCenter">
          <HelpCenter />
        </LayoutWrapper>
      } />
      <Route path="/Tutorials" element={
        <LayoutWrapper currentPageName="Tutorials">
          <Tutorials />
        </LayoutWrapper>
      } />
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


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