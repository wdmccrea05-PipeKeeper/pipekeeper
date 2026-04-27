/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIUpdates from './pages/AIUpdates';
import AdminReports from './pages/AdminReports';
import AdminSubscriptionRequests from './pages/AdminSubscriptionRequests';
import AdminSubscriptionTools from './pages/AdminSubscriptionTools';
import AgeGate from './pages/AgeGate';
import BottleDetail from './pages/BottleDetail';
import BulkLogoUpload from './pages/BulkLogoUpload';
import CollectionHub from './pages/CollectionHub';
import CollectionInsightsShare from './pages/CollectionInsightsShare';
import Community from './pages/Community';
import Curator from './pages/Curator';
import CuratorAnalyticsDashboard from './pages/CuratorAnalyticsDashboard';
import FAQ from './pages/FAQ';
import FAQFull from './pages/FAQFull';
import Help from './pages/Help';
import HelpCenter from './pages/HelpCenter';
import Home from './pages/Home';
import HowTo from './pages/HowTo';
import Import from './pages/Import';
import Insights from './pages/Insights';
import Invite from './pages/Invite';
import InviteFull from './pages/InviteFull';
import PipeDetail from './pages/PipeDetail';
import PipeKeeper from './pages/PipeKeeper';
import PipeKeeperInsights from './pages/PipeKeeperInsights.jsx';
import Pipes from './pages/Pipes';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import PublicSharedRecord from './pages/PublicSharedRecord';
import Subscription from './pages/Subscription';
import SubscriptionCancelled from './pages/SubscriptionCancelled';
import SubscriptionEventsLog from './pages/SubscriptionEventsLog';
import SubscriptionFull from './pages/SubscriptionFull';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionSupport from './pages/SubscriptionSupport';
import Support from './pages/Support';
import SupportFull from './pages/SupportFull';
import Tastings from './pages/Tastings';
import TermsOfService from './pages/TermsOfService';
import Tobacco from './pages/Tobacco';
import TobaccoDetail from './pages/TobaccoDetail';
import TobaccoLibrarySync from './pages/TobaccoLibrarySync';
import Troubleshooting from './pages/Troubleshooting';
import TroubleshootingFull from './pages/TroubleshootingFull';
import UserReport from './pages/UserReport';
import VerificationHelp from './pages/VerificationHelp';
import Whiskey from './pages/Whiskey';
import WhiskeyAIUpdates from './pages/WhiskeyAIUpdates';
import WhiskeyAnalytics from './pages/WhiskeyAnalytics';
import WhiskeyInsights from './pages/WhiskeyInsights';
import WhiskeyKeeper from './pages/WhiskeyKeeper';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIUpdates": AIUpdates,
    "AdminReports": AdminReports,
    "AdminSubscriptionRequests": AdminSubscriptionRequests,
    "AdminSubscriptionTools": AdminSubscriptionTools,
    "AgeGate": AgeGate,
    "BottleDetail": BottleDetail,
    "BulkLogoUpload": BulkLogoUpload,
    "CollectionHub": CollectionHub,
    "CollectionInsightsShare": CollectionInsightsShare,
    "Community": Community,
    "Curator": Curator,
    "CuratorAnalyticsDashboard": CuratorAnalyticsDashboard,
    "FAQ": FAQ,
    "FAQFull": FAQFull,
    "Help": Help,
    "HelpCenter": HelpCenter,
    "Home": Home,
    "HowTo": HowTo,
    "Import": Import,
    "Insights": Insights,
    "Invite": Invite,
    "InviteFull": InviteFull,
    "PipeDetail": PipeDetail,
    "PipeKeeper": PipeKeeper,
    "PipeKeeperInsights": PipeKeeperInsights,
    "Pipes": Pipes,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "PublicProfile": PublicProfile,
    "PublicSharedRecord": PublicSharedRecord,
    "Subscription": Subscription,
    "SubscriptionCancelled": SubscriptionCancelled,
    "SubscriptionEventsLog": SubscriptionEventsLog,
    "SubscriptionFull": SubscriptionFull,
    "SubscriptionSuccess": SubscriptionSuccess,
    "SubscriptionSupport": SubscriptionSupport,
    "Support": Support,
    "SupportFull": SupportFull,
    "Tastings": Tastings,
    "TermsOfService": TermsOfService,
    "Tobacco": Tobacco,
    "TobaccoDetail": TobaccoDetail,
    "TobaccoLibrarySync": TobaccoLibrarySync,
    "Troubleshooting": Troubleshooting,
    "TroubleshootingFull": TroubleshootingFull,
    "UserReport": UserReport,
    "VerificationHelp": VerificationHelp,
    "Whiskey": Whiskey,
    "WhiskeyAIUpdates": WhiskeyAIUpdates,
    "WhiskeyAnalytics": WhiskeyAnalytics,
    "WhiskeyInsights": WhiskeyInsights,
    "WhiskeyKeeper": WhiskeyKeeper,
}

export const pagesConfig = {
    mainPage: "CollectionHub",
    Pages: PAGES,
    Layout: __Layout,
};