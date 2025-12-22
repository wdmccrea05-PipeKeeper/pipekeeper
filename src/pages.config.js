import Pipes from './pages/Pipes';
import PipeDetail from './pages/PipeDetail';
import Tobacco from './pages/Tobacco';
import TobaccoDetail from './pages/TobaccoDetail';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Pipes": Pipes,
    "PipeDetail": PipeDetail,
    "Tobacco": Tobacco,
    "TobaccoDetail": TobaccoDetail,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Pipes",
    Pages: PAGES,
    Layout: __Layout,
};