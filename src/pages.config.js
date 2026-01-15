import AIUpdates from './pages/AIUpdates';
import AgeGate from './pages/AgeGate';
import BulkLogoUpload from './pages/BulkLogoUpload';
import Community from './pages/Community';
import FAQ from './pages/FAQ';
import FAQFull from './pages/FAQFull';
import Home from './pages/Home';
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
import index from './pages/index';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIUpdates": AIUpdates,
    "AgeGate": AgeGate,
    "BulkLogoUpload": BulkLogoUpload,
    "Community": Community,
    "FAQ": FAQ,
    "FAQFull": FAQFull,
    "Home": Home,
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
    "index": index,
}

export const pagesConfig = {
    mainPage: "TermsOfService",
    Pages: PAGES,
    Layout: __Layout,
};