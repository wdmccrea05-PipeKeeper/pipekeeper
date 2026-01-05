import BulkLogoUpload from './pages/BulkLogoUpload';
import Community from './pages/Community';
import FAQ from './pages/FAQ';
import Import from './pages/Import';
import Invite from './pages/Invite';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Subscription from './pages/Subscription';
import Support from './pages/Support';
import TermsOfService from './pages/TermsOfService';
import Tobacco from './pages/Tobacco';
import TobaccoLibrarySync from './pages/TobaccoLibrarySync';
import UserReport from './pages/UserReport';
import AIUpdates from './pages/AIUpdates';
import Home from './pages/Home';
import PipeDetail from './pages/PipeDetail';
import Pipes from './pages/Pipes';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import index from './pages/index';
import TobaccoDetail from './pages/TobaccoDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BulkLogoUpload": BulkLogoUpload,
    "Community": Community,
    "FAQ": FAQ,
    "Import": Import,
    "Invite": Invite,
    "PrivacyPolicy": PrivacyPolicy,
    "Subscription": Subscription,
    "Support": Support,
    "TermsOfService": TermsOfService,
    "Tobacco": Tobacco,
    "TobaccoLibrarySync": TobaccoLibrarySync,
    "UserReport": UserReport,
    "AIUpdates": AIUpdates,
    "Home": Home,
    "PipeDetail": PipeDetail,
    "Pipes": Pipes,
    "Profile": Profile,
    "PublicProfile": PublicProfile,
    "index": index,
    "TobaccoDetail": TobaccoDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};