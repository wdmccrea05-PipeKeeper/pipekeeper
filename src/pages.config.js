import AIUpdates from './pages/AIUpdates';
import AgeGate from './pages/AgeGate';
import BulkLogoUpload from './pages/BulkLogoUpload';
import Community from './pages/Community';
import FAQ from './pages/FAQ';
import Import from './pages/Import';
import Invite from './pages/Invite';
import PipeDetail from './pages/PipeDetail';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Subscription from './pages/Subscription';
import Support from './pages/Support';
import TermsOfService from './pages/TermsOfService';
import TobaccoDetail from './pages/TobaccoDetail';
import TobaccoLibrarySync from './pages/TobaccoLibrarySync';
import UserReport from './pages/UserReport';
import index from './pages/index';
import Pipes from './pages/Pipes';
import Tobacco from './pages/Tobacco';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIUpdates": AIUpdates,
    "AgeGate": AgeGate,
    "BulkLogoUpload": BulkLogoUpload,
    "Community": Community,
    "FAQ": FAQ,
    "Import": Import,
    "Invite": Invite,
    "PipeDetail": PipeDetail,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "PublicProfile": PublicProfile,
    "Subscription": Subscription,
    "Support": Support,
    "TermsOfService": TermsOfService,
    "TobaccoDetail": TobaccoDetail,
    "TobaccoLibrarySync": TobaccoLibrarySync,
    "UserReport": UserReport,
    "index": index,
    "Pipes": Pipes,
    "Tobacco": Tobacco,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};