import BulkLogoUpload from './pages/BulkLogoUpload';
import Community from './pages/Community';
import FAQ from './pages/FAQ';
import Import from './pages/Import';
import Index from './pages/Index';
import Invite from './pages/Invite';
import PipeDetail from './pages/PipeDetail';
import Pipes from './pages/Pipes';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Subscription from './pages/Subscription';
import Support from './pages/Support';
import TermsOfService from './pages/TermsOfService';
import Tobacco from './pages/Tobacco';
import TobaccoDetail from './pages/TobaccoDetail';
import TobaccoLibrarySync from './pages/TobaccoLibrarySync';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BulkLogoUpload": BulkLogoUpload,
    "Community": Community,
    "FAQ": FAQ,
    "Import": Import,
    "Index": Index,
    "Invite": Invite,
    "PipeDetail": PipeDetail,
    "Pipes": Pipes,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "PublicProfile": PublicProfile,
    "Subscription": Subscription,
    "Support": Support,
    "TermsOfService": TermsOfService,
    "Tobacco": Tobacco,
    "TobaccoDetail": TobaccoDetail,
    "TobaccoLibrarySync": TobaccoLibrarySync,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};