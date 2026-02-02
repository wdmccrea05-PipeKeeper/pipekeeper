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
import adminreportsTsx from './pages/AdminReports.tsx';
import AgeGate from './pages/AgeGate';
import BulkLogoUpload from './pages/BulkLogoUpload';
import Community from './pages/Community';
import FAQ from './pages/FAQ';
import FAQFull from './pages/FAQFull';
import Help from './pages/Help';
import Home from './pages/Home';
import HowTo from './pages/HowTo';
import Import from './pages/Import';
import Invite from './pages/Invite';
import InviteFull from './pages/InviteFull';
import PipeDetail from './pages/PipeDetail';
import Pipes from './pages/Pipes';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Subscription from './pages/Subscription';
import SubscriptionFull from './pages/SubscriptionFull';
import Support from './pages/Support';
import SupportFull from './pages/SupportFull';
import TermsOfService from './pages/TermsOfService';
import Tobacco from './pages/Tobacco';
import TobaccoDetail from './pages/TobaccoDetail';
import TobaccoLibrarySync from './pages/TobaccoLibrarySync';
import Troubleshooting from './pages/Troubleshooting';
import TroubleshootingFull from './pages/TroubleshootingFull';
import UserReport from './pages/UserReport';
import VerificationHelp from './pages/VerificationHelp';
import index from './pages/index';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIUpdates": AIUpdates,
    "AdminReports": AdminReports,
    "AdminReports.tsx": adminreportsTsx,
    "AgeGate": AgeGate,
    "BulkLogoUpload": BulkLogoUpload,
    "Community": Community,
    "FAQ": FAQ,
    "FAQFull": FAQFull,
    "Help": Help,
    "Home": Home,
    "HowTo": HowTo,
    "Import": Import,
    "Invite": Invite,
    "InviteFull": InviteFull,
    "PipeDetail": PipeDetail,
    "Pipes": Pipes,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "PublicProfile": PublicProfile,
    "Subscription": Subscription,
    "SubscriptionFull": SubscriptionFull,
    "Support": Support,
    "SupportFull": SupportFull,
    "TermsOfService": TermsOfService,
    "Tobacco": Tobacco,
    "TobaccoDetail": TobaccoDetail,
    "TobaccoLibrarySync": TobaccoLibrarySync,
    "Troubleshooting": Troubleshooting,
    "TroubleshootingFull": TroubleshootingFull,
    "UserReport": UserReport,
    "VerificationHelp": VerificationHelp,
    "index": index,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};