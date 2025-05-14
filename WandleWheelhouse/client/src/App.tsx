import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import MissionPage from './pages/MissionPage';
import BlogPage from './pages/BlogPage';
import FullBlogArticlePage from './pages/FullBlogArticlePage';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SubscriptionPage from './pages/SubscriptionPage';
import BlogPostCreatePage from './pages/admin/BlogPostCreatePage';
import ContactPage from './pages/ContactPage';
import BlogPostEditPage from './pages/admin/BlogPostEditPage';
import ScrollToTop from './components/ScrollToTop'; // <-- Added import

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop /> {/* <-- Added ScrollToTop */}
      <Routes>
        {/* Routes using the main Layout */}
        <Route path="/" element={<Layout />}>
          {/* --- Public routes --- */}
          <Route index element={<HomePage />} />
          <Route path="mission" element={<MissionPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<FullBlogArticlePage />} />
          <Route path="contact" element={<ContactPage />} />
          {/* Example placeholder */}
          {/* <Route path="shop" element={<div>Shop Placeholder (Coming Soon)</div>} /> */}

          {/* --- Protected Routes --- */}
          {/* Admin/Editor Only */}
          <Route element={<ProtectedRoute allowedRoles={['Administrator', 'Editor']} />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="admin/blog/create" element={<BlogPostCreatePage />} />
            <Route path="admin/blog/edit/:id" element={<BlogPostEditPage />} />
          </Route>

          {/* Any Logged-in User */}
          <Route element={<ProtectedRoute />}>
            <Route path="profile" element={<ProfilePage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
          </Route>
          {/* --- End Protected Routes --- */}

          {/* Catch-all for unmatched routes within Layout */}
          <Route path="*" element={<div className='text-center p-10'>404 - Page Not Found</div>} />
        </Route>

        {/* Routes outside the main Layout (if any) */}
        {/* e.g., <Route path="/standalone" element={<StandalonePage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;