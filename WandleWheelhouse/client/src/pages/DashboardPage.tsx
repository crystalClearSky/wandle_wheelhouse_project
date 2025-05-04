// Location: src/pages/DashboardPage.tsx

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom'; // <-- Ensure Link is imported
import Button from '../components/ui/Button';
import UserList from '../components/admin/UserList'; // Import UserList component
import BlogList from '../components/admin/BlogList'; // Import BlogList component

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Helper component for consistent section styling (includes space-y-4 from your preferred version)
  const AdminSectionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
      <div className={`bg-white p-6 rounded-lg shadow-md border border-gray-200 ${className}`}>
          <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">{title}</h2>
          {/* Using space-y-4 for vertical spacing inside card */}
          <div className="space-y-4">
              {children}
          </div>
      </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
        Admin Dashboard
      </h1>
      {user && (
        <p className="mb-8 text-gray-600">
          Welcome back, <span className='font-semibold'>{user.firstName}</span>!
          Your current roles: <span className='font-semibold'>{user.roles.join(', ')}</span>.
        </p>
      )}

      {/* Using the two-column grid layout you preferred */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">

        {/* User Management Section - Spanning 2 columns */}
        <AdminSectionCard title="User Management" className="md:col-span-2">
           <UserList />
        </AdminSectionCard>

        {/* Blog Management Section - Integrated BlogList & Create Button Link */}
        <AdminSectionCard title="Blog Management">
           {/* Render the BlogList component */}
           <BlogList />
           {/* Add Create New Post button/link below the list */}
            <div className="mt-4 border-t pt-4">
                {/* Link the button to the create page */}
                <Link to="/admin/blog/create">
                    <Button variant="primary">Create New Post</Button>
                 </Link>
             </div>
        </AdminSectionCard>

        {/* Donation Management Section Placeholder */}
        <AdminSectionCard title="Donation Management">
          <p className="text-sm text-gray-600">View donation records and history.</p>
          <Button disabled variant="secondary" className="mt-2">View Donations (WIP)</Button>
        </AdminSectionCard>

        {/* Subscription Management Section Placeholder */}
        <AdminSectionCard title="Subscription Management">
           <p className="text-sm text-gray-600">View and manage user subscriptions.</p>
          <Button disabled variant="secondary" className="mt-2">View Subscriptions (WIP)</Button>
        </AdminSectionCard>

        {/* Newsletter Management Section Placeholder */}
        <AdminSectionCard title="Newsletter Subscribers">
          <p className="text-sm text-gray-600">View list of newsletter subscribers.</p>
          <Button disabled variant="secondary" className="mt-2">View Subscribers (WIP)</Button>
        </AdminSectionCard>

        {/* Add more sections as needed */}

      </div>
    </div>
  );
};

export default DashboardPage;