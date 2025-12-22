import Home from './pages/Home';
import PipeDetail from './pages/PipeDetail';
import Pipes from './pages/Pipes';
import Tobacco from './pages/Tobacco';
import TobaccoDetail from './pages/TobaccoDetail';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "PipeDetail": PipeDetail,
    "Pipes": Pipes,
    "Tobacco": Tobacco,
    "TobaccoDetail": TobaccoDetail,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Pipes",
    Pages: PAGES,
    Layout: __Layout,
};