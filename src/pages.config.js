import Home from './pages/Home';
import PipeDetail from './pages/PipeDetail';
import Pipes from './pages/Pipes';
import Profile from './pages/Profile';
import Tobacco from './pages/Tobacco';
import TobaccoDetail from './pages/TobaccoDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "PipeDetail": PipeDetail,
    "Pipes": Pipes,
    "Profile": Profile,
    "Tobacco": Tobacco,
    "TobaccoDetail": TobaccoDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};