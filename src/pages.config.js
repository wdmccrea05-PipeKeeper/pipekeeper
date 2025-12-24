import Home from './pages/Home';
import Import from './pages/Import';
import Invite from './pages/Invite';
import PipeDetail from './pages/PipeDetail';
import Pipes from './pages/Pipes';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import Support from './pages/Support';
import TermsOfService from './pages/TermsOfService';
import Tobacco from './pages/Tobacco';
import TobaccoDetail from './pages/TobaccoDetail';
import TobaccoLibrarySync from './pages/TobaccoLibrarySync';
import FAQ from './pages/FAQ';
import BulkLogoUpload from './pages/BulkLogoUpload';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Import": Import,
    "Invite": Invite,
    "PipeDetail": PipeDetail,
    "Pipes": Pipes,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "Subscription": Subscription,
    "Support": Support,
    "TermsOfService": TermsOfService,
    "Tobacco": Tobacco,
    "TobaccoDetail": TobaccoDetail,
    "TobaccoLibrarySync": TobaccoLibrarySync,
    "FAQ": FAQ,
    "BulkLogoUpload": BulkLogoUpload,
}

export const pagesConfig = {
    mainPage: "Pipes",
    Pages: PAGES,
    Layout: __Layout,
};