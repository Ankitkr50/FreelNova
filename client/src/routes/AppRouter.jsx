import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout.jsx";
import MainLayout from "../layouts/MainLayout.jsx";
import { ROUTES } from "../constants/routes.js";
import AcceptStaffInvite from "../pages/AcceptStaffInvite.jsx";
import CompanyInfo from "../pages/CompanyInfo.jsx";
import CompleteProfile from "../pages/CompleteProfile.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import EditProfile from "../pages/EditProfile.jsx";
import Home from "../pages/Home.jsx";
import Login from "../pages/Login.jsx";
import Messages from "../pages/Messages.jsx";
import PendingVerification from "../pages/PendingVerification.jsx";
import Profile from "../pages/Profile.jsx";
import ProjectDetails from "../pages/ProjectDetails.jsx";
import Projects from "../pages/Projects.jsx";
import Register from "../pages/Register.jsx";
import VerifyEmail from "../pages/VerifyEmail.jsx";
import CopilotDrawer from "../components/common/CopilotDrawer.jsx";
import FinePaymentModal from "../components/common/FinePaymentModal.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import PublicOnlyRoute from "./PublicOnlyRoute.jsx";

// Heavy pages dynamically imported via React.lazy for code-splitting
const AdminPanel = lazy(() => import("../pages/AdminPanel.jsx"));
const ApplicantsList = lazy(() => import("../pages/ApplicantsList.jsx"));
const CareerAutopilot = lazy(() => import("../pages/CareerAutopilot.jsx"));
const CompanyWorkspace = lazy(() => import("../pages/CompanyWorkspace.jsx"));
const EcosystemDashboard = lazy(() => import("../pages/EcosystemDashboard.jsx"));
const FreelancerBusinessOSDashboard = lazy(() => import("../pages/FreelancerBusinessOSDashboard.jsx"));
const FreelNovaPro = lazy(() => import("../pages/FreelNovaPro.jsx"));
const IncomeOSDashboard = lazy(() => import("../pages/IncomeOSDashboard.jsx"));
const MyProjects = lazy(() => import("../pages/MyProjects.jsx"));
const PostProject = lazy(() => import("../pages/PostProject.jsx"));
const ProjectAutopilot = lazy(() => import("../pages/ProjectAutopilot.jsx"));
const ProjectVault = lazy(() => import("../pages/ProjectVault.jsx"));
const ResumeUpload = lazy(() => import("../pages/ResumeUpload.jsx"));
const SecurityCenterPage = lazy(() => import("../pages/SecurityCenterPage.jsx"));
const SelectFreelancer = lazy(() => import("../pages/SelectFreelancer.jsx"));
const Statement = lazy(() => import("../pages/Statement.jsx"));
const TalentSolutions = lazy(() => import("../pages/TalentSolutions.jsx"));

const PageSkeleton = () => (
  <div className="min-h-[400px] w-full max-w-7xl mx-auto p-6 space-y-6 animate-pulse">
    <div className="h-8 bg-slate-200 rounded-2xl w-1/4"></div>
    <div className="h-28 bg-slate-200 rounded-3xl w-full"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-40 bg-slate-200 rounded-3xl"></div>
      <div className="h-40 bg-slate-200 rounded-3xl"></div>
      <div className="h-40 bg-slate-200 rounded-3xl"></div>
    </div>
  </div>
);

function AppRouter() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path={ROUTES.ADMIN_ACCEPT_INVITE} element={<AcceptStaffInvite />} />
        <Route element={<MainLayout />}>
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path={ROUTES.PRO} element={<FreelNovaPro />} />
          <Route path={ROUTES.PROJECTS} element={<Projects />} />
          <Route path={ROUTES.PROJECT_DETAILS} element={<ProjectDetails />} />
          <Route path={ROUTES.COMPANY_INFO} element={<CompanyInfo />} />
          <Route element={<ProtectedRoute />}>
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.MESSAGES} element={<Messages />} />
            <Route path={ROUTES.PROFILE} element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path={ROUTES.EDIT_PROFILE} element={<EditProfile />} />
            <Route path={ROUTES.RESUME_UPLOAD} element={<ResumeUpload />} />
            <Route path={ROUTES.TALENT_SOLUTIONS} element={<TalentSolutions />} />
            <Route path={ROUTES.COMPLETE_PROFILE} element={<CompleteProfile />} />
            <Route path={ROUTES.PENDING_VERIFICATION} element={<PendingVerification />} />
            <Route path={ROUTES.CAREER_AUTOPILOT} element={<CareerAutopilot />} />
            <Route path={ROUTES.PROJECT_VAULT} element={<ProjectVault />} />
            <Route path={ROUTES.GENERAL_PROJECT_VAULT} element={<ProjectVault />} />
            <Route path={ROUTES.INCOME_OS} element={<IncomeOSDashboard />} />
            <Route path={ROUTES.BUSINESS_OS} element={<FreelancerBusinessOSDashboard />} />
            <Route path={ROUTES.SECURITY_CENTER} element={<SecurityCenterPage />} />
            <Route path={ROUTES.ECOSYSTEM_DASHBOARD} element={<EcosystemDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["recruiter", "admin"]} />}>
            <Route path={ROUTES.MY_PROJECTS} element={<MyProjects />} />
            <Route path={ROUTES.POST_PROJECT} element={<PostProject />} />
            <Route path={ROUTES.PROJECT_AUTOPILOT} element={<ProjectAutopilot />} />
            <Route path={ROUTES.COMPANY_WORKSPACE} element={<CompanyWorkspace />} />
            <Route path={ROUTES.APPLICANTS_LIST} element={<ApplicantsList />} />
            <Route path={ROUTES.SELECT_FREELANCER} element={<SelectFreelancer />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path={ROUTES.ADMIN} element={<AdminPanel />} />
            <Route path={ROUTES.STATEMENT} element={<Statement />} />
            <Route path="/admin/statement" element={<Statement />} />
          </Route>
        </Route>

        <Route element={<AuthLayout />}>
          <Route element={<PublicOnlyRoute />}>
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
          </Route>
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>

      <CopilotDrawer />
      <FinePaymentModal />
    </Suspense>
  );
}

export default AppRouter;
