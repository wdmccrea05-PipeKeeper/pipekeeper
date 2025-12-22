import Home from './pages/Home';
import PipeDetail from './pages/PipeDetail';
import Pipes from './pages/Pipes';
import Profile from './pages/Profile';
import Tobacco from './pages/Tobacco';
import TobaccoDetail from './pages/TobaccoDetail';
import TobaccoLibrarySync from './pages/TobaccoLibrarySync';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "PipeDetail": PipeDetail,
    "Pipes": Pipes,
    "Profile": Profile,
    "Tobacco": Tobacco,
    "TobaccoDetail": TobaccoDetail,
    "TobaccoLibrarySync": TobaccoLibrarySync,
}

export const pagesConfig = {
    mainPage: "Pipes",
    Pages: PAGES,
    Layout: __Layout,
};