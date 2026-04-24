import { useEffect, useMemo, useRef, useState } from "react";
import { CurrencyProvider } from "@/lib/currency/useCurrency";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import NavigationTracker from "@/lib/NavigationTracker";
import { pagesConfig } from "./pages.config";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import GlobalErrorBoundary from "@/components/system/GlobalErrorBoundary";
import OnboardingRouter from "@/components/onboarding/OnboardingRouter";
import PublicSharedRecord from "@/pages/PublicSharedRecord";
import CuratorAnalyticsDashboard from "@/pages/CuratorAnalyticsDashboard";
import CollectionInsightsShare from "@/pages/CollectionInsightsShare";
import Whiskey from "@/pages/Whiskey.jsx";
import WhiskeyAnalytics from "@/pages/WhiskeyAnalytics";
import Tastings from "@/pages/Tastings";
import Curator from "@/pages/Curator";
import Subscription from "@/pages/Subscription";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import SubscriptionSuccessFlow from "@/pages/SubscriptionSuccessFlow";
import CollectionHub from "@/pages/CollectionHub";
import PipeKeeper from "@/pages/PipeKeeper";
import WhiskeyKeeper from "@/pages/WhiskeyKeeper";
import WhiskeyAIUpdates from "@/pages/WhiskeyAIUpdates";
import BottleDetail from "@/pages/BottleDetail";
import BottleFormPage from "@/pages/BottleFormPage";
import HelpCenter from "@/pages/HelpCenter";
import Tutorials from "@/pages/Tutorials";
import PipeDetail from "@/pages/PipeDetail";
import TobaccoDetail from "@/pages/TobaccoDetail";
import Support from "@/pages/Support";
import WantList from "@/pages/WantList";
import ShoppingList from "@/pages/ShoppingList";
import SupportPublic from "@/pages/SupportPublic";
import CigarKeeper from "@/pages/CigarKeeper";
import Cigars from "@/pages/Cigars";
import CigarDetail from "@/pages/CigarDetail";
import CigarFormPage from "@/pages/CigarFormPage";
import CigarInsights from "@/pages/CigarInsights";
import SessionHistory from "@/pages/SessionHistory";
import ReferralDashboard from "@/pages/ReferralDashboard";
import ReferralAdminReport from "@/pages/ReferralAdminReport";
import LockedModuleGuard from "@/components/modules/LockedModuleGuard";
import { MeasurementProvider } from "@/components/utils/measurementConversion";
import ModuleSelectionModal from "@/components/onboarding/ModuleSelectionModal";
import { useModuleOnboarding } from "@/components/hooks/useModuleOnboarding";
import { useTranslation } from "@/components/i18n/safeTranslation";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

const WhiskeyReleaseRoute = ({ currentPageName, children }) => (
  <LayoutWrapper currentPageName={currentPageName}>
    <LockedModuleGuard moduleKey="whiskeykeeper">
      {children}
    </LockedModuleGuard>
  </LayoutWrapper>
);

const CigarReleaseRoute = ({ currentPageName, children }) => (
  <LayoutWrapper currentPageName={currentPageName}>
    <LockedModuleGuard moduleKey="cigarkeeper">
      {children}
    </LockedModuleGuard>
  </LayoutWrapper>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { lang } = useTranslation();
  const loginRedirectedRef = useRef(false);
  const { showModal, setShowModal } = useModuleOnboarding();
  const [moduleSelection, setModuleSelection] = useState(null);

  const shouldRenderOnboarding = useMemo(() => !showModal, [showModal]);

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (window.location.pathname === "/support-public") {
    return <SupportPublic />;
  }

  if (authError?.type === "auth_required") {
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

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  return (
    <>
      <ModuleSelectionModal
        isOpen={showModal}
        onComplete={(selected) => {
          setModuleSelection(selected || null);
          setShowModal(false);
        }}
      />
      {shouldRenderOnboarding ? <OnboardingRouter initialSelection={moduleSelection} /> : null}
      <Routes key={lang}>
      <Route path="/support-public" element={<SupportPublic />} />
      <Route path="/share/:moduleType/:shareToken" element={<PublicSharedRecord />} />

      <Route
        path="/CuratorAnalyticsDashboard"
        element={
          <LayoutWrapper currentPageName="CuratorAnalyticsDashboard">
            <CuratorAnalyticsDashboard />
          </LayoutWrapper>
        }
      />

      <Route
        path="/CollectionInsightsShare"
        element={
          <LayoutWrapper currentPageName="CollectionInsightsShare">
            <CollectionInsightsShare />
          </LayoutWrapper>
        }
      />

      <Route
        path="/Whiskey"
        element={
          <WhiskeyReleaseRoute currentPageName="Whiskey">
            <Whiskey />
          </WhiskeyReleaseRoute>
        }
      />

      <Route
        path="/WhiskeyAnalytics"
        element={
          <WhiskeyReleaseRoute currentPageName="WhiskeyAnalytics">
            <WhiskeyAnalytics />
          </WhiskeyReleaseRoute>
        }
      />

      <Route
        path="/Tastings"
        element={
          <WhiskeyReleaseRoute currentPageName="Tastings">
            <Tastings />
          </WhiskeyReleaseRoute>
        }
      />

      <Route
        path="/Curator"
        element={
          <LayoutWrapper currentPageName="Curator">
            <Curator />
          </LayoutWrapper>
        }
      />

      <Route
        path="/Subscription"
        element={
          <LayoutWrapper currentPageName="Subscription">
            <Subscription />
          </LayoutWrapper>
        }
      />

      <Route path="/upgrade" element={<LayoutWrapper currentPageName="Subscription"><Subscription /></LayoutWrapper>} />

      <Route path="/SubscriptionSuccessFlow" element={<SubscriptionSuccessFlow />} />
      <Route path="/SubscriptionSuccess" element={<SubscriptionSuccess />} />
      <Route path="/subscription-success" element={<SubscriptionSuccess />} />

      <Route
        path="/CollectionHub"
        element={
          <LayoutWrapper currentPageName="CollectionHub">
            <CollectionHub />
          </LayoutWrapper>
        }
      />

      <Route
        path="/PipeKeeper"
        element={
          <LayoutWrapper currentPageName="PipeKeeper">
            <PipeKeeper />
          </LayoutWrapper>
        }
      />

      <Route
        path="/WhiskeyKeeper"
        element={
          <WhiskeyReleaseRoute currentPageName="WhiskeyKeeper">
            <WhiskeyKeeper />
          </WhiskeyReleaseRoute>
        }
      />

      <Route
        path="/WhiskeyAIUpdates"
        element={
          <WhiskeyReleaseRoute currentPageName="WhiskeyAIUpdates">
            <WhiskeyAIUpdates />
          </WhiskeyReleaseRoute>
        }
      />

      <Route
        path="/BottleDetail"
        element={
          <WhiskeyReleaseRoute currentPageName="BottleDetail">
            <BottleDetail />
          </WhiskeyReleaseRoute>
        }
      />

      <Route
        path="/BottleForm"
        element={
          <WhiskeyReleaseRoute currentPageName="BottleForm">
            <BottleFormPage />
          </WhiskeyReleaseRoute>
        }
      />

      <Route
        path="/CigarKeeper"
        element={
          <CigarReleaseRoute currentPageName="CigarKeeper">
            <CigarKeeper />
          </CigarReleaseRoute>
        }
      />

      <Route
        path="/Cigars"
        element={
          <CigarReleaseRoute currentPageName="Cigars">
            <Cigars />
          </CigarReleaseRoute>
        }
      />

      <Route
        path="/CigarDetail"
        element={
          <CigarReleaseRoute currentPageName="CigarDetail">
            <CigarDetail />
          </CigarReleaseRoute>
        }
      />

      <Route
        path="/CigarForm"
        element={
          <CigarReleaseRoute currentPageName="CigarForm">
            <CigarFormPage />
          </CigarReleaseRoute>
        }
      />

      <Route
        path="/CigarInsights"
        element={
          <CigarReleaseRoute currentPageName="CigarInsights">
            <CigarInsights />
          </CigarReleaseRoute>
        }
      />

      <Route
        path="/HelpCenter"
        element={
          <LayoutWrapper currentPageName="HelpCenter">
            <HelpCenter />
          </LayoutWrapper>
        }
      />

      <Route
        path="/Tutorials"
        element={
          <LayoutWrapper currentPageName="Tutorials">
            <Tutorials />
          </LayoutWrapper>
        }
      />

      <Route
        path="/PipeDetail"
        element={
          <LayoutWrapper currentPageName="PipeDetail">
            <PipeDetail />
          </LayoutWrapper>
        }
      />

      <Route
        path="/TobaccoDetail"
        element={
          <LayoutWrapper currentPageName="TobaccoDetail">
            <TobaccoDetail />
          </LayoutWrapper>
        }
      />

      <Route
        path="/support"
        element={
          <LayoutWrapper currentPageName="Support">
            <Support />
          </LayoutWrapper>
        }
      />

      <Route
        path="/WantList"
        element={
          <LayoutWrapper currentPageName="WantList">
            <WantList />
          </LayoutWrapper>
        }
      />

      <Route
        path="/ShoppingList"
        element={
          <LayoutWrapper currentPageName="ShoppingList">
            <ShoppingList />
          </LayoutWrapper>
        }
      />

      <Route
        path="/SessionHistory"
        element={
          <LayoutWrapper currentPageName="SessionHistory">
            <SessionHistory />
          </LayoutWrapper>
        }
      />

      <Route
        path="/ReferralDashboard"
        element={
          <LayoutWrapper currentPageName="ReferralDashboard">
            <ReferralDashboard />
          </LayoutWrapper>
        }
      />

      <Route
        path="/ReferralAdminReport"
        element={
          <LayoutWrapper currentPageName="ReferralAdminReport">
            <ReferralAdminReport />
          </LayoutWrapper>
        }
      />

      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        }
      />

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
    </>
  );
};

function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router basename="/">
            <NavigationTracker />
            <CurrencyProvider>
              <MeasurementProvider>
                <AuthenticatedApp />
              </MeasurementProvider>
            </CurrencyProvider>
          </Router>
        </QueryClientProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}

export default App;