// src/App.tsx
// src/App.tsx

import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import BlogPostCreatePage from "./pages/admin/BlogPostCreatePage";
import BlogPostEditPage from "./pages/admin/BlogPostEditPage";
import BlogPage from "./pages/BlogPage";
import ContactPage from "./pages/ContactPage";
import DashboardPage from "./pages/DashboardPage";
import FullBlogArticlePage from "./pages/FullBlogArticlePage";
import HomePage from "./pages/HomePage";
import MissionPage from "./pages/MissionPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ProfilePage from "./pages/ProfilePage";
import SubscriptionPage from "./pages/SubscriptionPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import ProtectedRoute from "./routes/ProtectedRoute";

// --- Import only the ResetPasswordPage ---
// No import needed for ForgotPasswordPage as it's a modal (ForgotPasswordModal.tsx)
import ResetPasswordPage from "./pages/ResetPasswordPage"; // Keep this import

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Routes using the main Layout */}
        <Route path="/" element={<Layout />}>
          {/* --- Public routes --- */}
          <Route index element={<HomePage />} />
          <Route path="mission" element={<MissionPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<FullBlogArticlePage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsOfServicePage />} />
          {/* --- Password Recovery Route --- */}
          {/* ForgotPassword is a modal, managed by AuthContext and rendered in Layout.tsx */}
          <Route path="reset-password" element={<ResetPasswordPage />} />{" "}
          {/* Ensure this is correct */}
          {/* --- Protected Routes --- */}
          {/* Admin/Editor Only */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["Administrator", "Editor"]} />
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="admin/blog/create" element={<BlogPostCreatePage />} />
            <Route path="admin/blog/edit/:id" element={<BlogPostEditPage />} />
          </Route>
          {/* Any Logged-in User */}
          <Route element={<ProtectedRoute />}>
            {/* ProfilePage now likely handles Login/Register via modals triggered by Navbar */}
            <Route path="profile" element={<ProfilePage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
          </Route>
          {/* --- End Protected Routes --- */}
          {/* Catch-all for unmatched routes within Layout (MUST BE LAST among siblings) */}
          <Route
            path="*"
            element={
              <div className="text-center p-10">
                <h1 className="text-2xl font-semibold">404 - Page Not Found</h1>
                <p className="mt-2">
                  Sorry, the page you are looking for does not exist.
                </p>
                <Link
                  to="/"
                  className="text-indigo-600 hover:underline mt-4 inline-block"
                >
                  Go back home
                </Link>
              </div>
            }
          />
        </Route>

        {/* Routes outside the main Layout (if any) can go here */}
        {/* Example: If ResetPasswordPage was designed to NOT use the main Layout:
        <Route path="reset-password" element={<ResetPasswordPage />} /> 
        But currently, it will use the Layout, which is fine.
        */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
