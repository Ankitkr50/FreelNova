import { Outlet, useLocation } from "react-router-dom";
import Container from "../components/common/Container.jsx";
import Footer from "../components/common/Footer.jsx";
import Navbar from "../components/common/Navbar.jsx";
import ProfileCompletionBanner from "../components/common/ProfileCompletionBanner.jsx";
import { ROUTES } from "../constants/routes.js";

function MainLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === ROUTES.HOME;
  const isProPage = location.pathname === ROUTES.PRO;

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <Navbar />
      <ProfileCompletionBanner />

      <main 
        className={`flex-grow flex-1 ${
          isHomePage 
            ? "pb-0" 
            : "bg-[radial-gradient(circle_at_top,rgba(147,197,253,0.22),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#edf5ff_50%,#f8fbff_100%)] pt-10 pb-2"
        } ${isProPage ? "pt-0 pb-0" : ""}`}
      >
        {isHomePage ? (
          <Outlet />
        ) : (
          <Container>
            <Outlet />
          </Container>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default MainLayout;

