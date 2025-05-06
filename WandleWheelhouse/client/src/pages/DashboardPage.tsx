import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import UserList from '../components/admin/UserList';
import BlogList from '../components/admin/BlogList';
import SubscriptionList from '../components/admin/SubscriptionList';
import DonationList from '../components/admin/DonationList';
import NewsletterList from '../components/admin/NewsletterList';
import { UserIcon, PencilSquareIcon, CurrencyPoundIcon, BellIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading for initial render
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000); // Mock API delay
    return () => clearTimeout(timer);
  }, []);

  // Modernized AdminSectionCard with animation and skeleton
  const AdminSectionCard: React.FC<{
    title: string;
    children: React.ReactNode;
    className?: string;
    icon: React.ReactNode;
  }> = ({ title, children, className = '', icon }) => (
    <div
      className={`bg-white p-6 rounded-xl shadow-lg border border-gray-100 transform transition-all hover:shadow-xl hover:-translate-y-1 ${className} animate-fade-in`}
    >
      <div className="flex items-center mb-4">
        <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">{icon}</div>
        <h2 className="ml-3 text-xl font-semibold text-gray-800">{title}</h2>
      </div>
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
        </div>
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Admin Dashboard
          </h1>
          {user && (
            <p className="mt-2 text-gray-600">
              Welcome back, <span className="font-semibold text-indigo-600">{user.firstName}</span>!
              Your roles: <span className="font-semibold">{user.roles.join(', ')}</span>.
            </p>
          )}
        </header>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* User Management - Full Width */}
          <AdminSectionCard
            title="User Management"
            className="md:col-span-2"
            icon={<UserIcon className="h-6 w-6" />}
          >
            <UserList />
          </AdminSectionCard>

          {/* Blog Management */}
          <AdminSectionCard
            title="Blog Management"
            icon={<PencilSquareIcon className="h-6 w-6" />}
          >
            <BlogList />
            <div className="mt-4 border-t pt-4">
              <Link to="/admin/blog/create">
                <Button
                  variant="primary"
                  className="w-full md:w-auto transition-transform hover:scale-105"
                >
                  Create New Post
                </Button>
              </Link>
            </div>
          </AdminSectionCard>

          {/* Donation Management */}
          <AdminSectionCard
            title="Donation Management"
            icon={<CurrencyPoundIcon className="h-6 w-6" />}
          >
            <DonationList />
          </AdminSectionCard>

          {/* Subscription Management */}
          <AdminSectionCard
            title="Subscription Management"
            icon={<BellIcon className="h-6 w-6" />}
          >
            <SubscriptionList />
          </AdminSectionCard>

          {/* Newsletter Subscribers */}
          <AdminSectionCard
            title="Newsletter Subscribers"
            icon={<BellIcon className="h-6 w-6" />}
          >
            <NewsletterList />
          </AdminSectionCard>

          {/* System Status */}
          <AdminSectionCard
            title="System Status"
            icon={<ChartBarIcon className="h-6 w-6" />}
          >
            <p className="text-sm text-gray-600">Display basic system health or stats.</p>
            <Button
              disabled
              variant="secondary"
              className="mt-2 w-full md:w-auto transition-transform hover:scale-105"
            >
              View Stats (WIP)
            </Button>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
};

// Inline styles for animations
// const styles = `
//   @keyframes fadeIn {
//     from { opacity: 0; transform: translateY(10px); }
//     to { opacity: 1; transform: translateY(0); }
//   }
//   .animate-fade-in {
//     animation: fadeIn 0.5s ease-out;
//   }
// `;

export default DashboardPage;