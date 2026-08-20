import { Outlet, useLocation, Link } from "react-router-dom";
import Container from "../components/common/Container.jsx";
import { ROUTES } from "../constants/routes.js";

const authContent = {
  [ROUTES.LOGIN]: {
    footer: "Find projects, hire talent, and manage payments from one polished flow.",
  },
  [ROUTES.REGISTER]: {
    footer: "Everything you already built stays the same, just presented in a cleaner entry flow.",
  },
  default: {
    footer: "Simple entry, same marketplace underneath.",
  },
};

function AuthLayout() {
  const location = useLocation();
  const content = authContent[location.pathname] || authContent.default;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_22%),linear-gradient(180deg,rgba(15,23,42,0.42),rgba(15,23,42,0.48))] px-4 py-8 sm:px-6 lg:px-8">
      <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="grid w-full max-w-[800px] overflow-hidden rounded-[1.8rem] border border-white/20 bg-white/90 shadow-[0_32px_90px_rgba(15,23,42,0.28)] backdrop-blur-sm lg:grid-cols-[0.92fr_1fr]">
          <section className="relative hidden min-h-[500px] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,#163d7a_0%,#1d4ed8_46%,#102a66_100%)] p-6 text-white lg:flex lg:flex-col">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.14))]" />
            <div className="relative z-10 max-w-sm">
              <Link to={ROUTES.HOME || "/"} className="inline-flex items-end gap-0.5 select-none transition hover:opacity-85 cursor-pointer" style={{ fontFamily: "'Sora', sans-serif" }}>
                <span className="text-xl font-bold text-white tracking-tight">Freel</span>
                <span className="text-xl font-normal text-white -ml-0.5 tracking-tight">Nova</span>
                <span className="h-1.5 w-1.5 mb-1 rounded-full bg-blue-400 shrink-0" />
              </Link>
              <h2 className="mt-3 text-4xl font-bold leading-[1.05] tracking-[-0.04em]">
                Start smarter, hire faster.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/80">
                Sign in or create your account to manage projects, discover talent, and keep everything moving.
              </p>
            </div>

            <div className="relative z-10 mt-25">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-3.5 backdrop-blur-sm">
                <div
                  className="mx-auto h-52 max-w-sm rounded-[1.25rem] border border-white/10 bg-cover bg-center shadow-[0_12px_28px_rgba(2,6,23,0.18)]"
                  style={{
                    backgroundImage:
                      'linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.18)),url("https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?cs=srgb&dl=pexels-anna-shvets-4050315.jpg&fm=jpg")',
                  }}
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-white/80">{content.footer}</p>
            </div>
          </section>

          <section className="bg-white p-5 sm:p-6 md:p-7">
            <Outlet />
          </section>
        </div>
      </Container>
    </div>
  );
}

export default AuthLayout;
