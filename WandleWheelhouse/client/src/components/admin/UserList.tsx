// Location: src/components/admin/UserList.tsx

import React, { useState, useEffect, useCallback } from 'react';
import AdminService from '../../services/AdminService';
import { UserDetailDto } from '../../dto/Users/UserDetailDto';
import { RoleDto } from '../../dto/Roles/RoleDto';
import PaginationControls from '../common/PaginationControls';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import ManageRolesModal from '../../modals/admin/ManageRolesModal';

const UserList: React.FC = () => {
  const { user: currentAdminUser } = useAuth();
  const isAdmin = currentAdminUser?.roles?.includes('Administrator') ?? false;

  const [users, setUsers] = useState<UserDetailDto[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({}); // boolean indicates if *any* action is loading for this user ID
  const [availableRoles, setAvailableRoles] = useState<RoleDto[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<UserDetailDto | null>(null);

  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

  // Memoized fetch function
  const fetchUsers = useCallback(async () => {
    setError(null); setActionError(null); setSelectedUserForRoles(null);
    try {
      console.log(`Workspaceing users - Page: ${currentPage}`);
      const result = await AdminService.getUsers(currentPage, pageSize);
      setUsers(result.items);
      setTotalPages(Math.ceil(result.totalCount / pageSize));
    } catch (err: unknown) {
      let message = 'Failed to load users.'; if (err instanceof Error) { message = err.message; }
      setError(message); setUsers([]); setTotalPages(0);
    } finally { setIsLoading(false); }
  }, [currentPage, pageSize]);

  // Fetch Available Roles (runs once on mount)
  useEffect(() => {
    const fetchRoles = async () => {
       try {
          const roles = await AdminService.getRoles();
          setAvailableRoles(roles);
       } catch (err) {
          console.error("Failed to fetch available roles", err);
          setError(prev => prev ? `${prev} | Failed to load role info.` : "Failed to load role information.");
       }
    };
    fetchRoles();
  }, []);

  // Fetch users on mount and page change
  useEffect(() => {
    setIsLoading(true);
    fetchUsers();
  }, [fetchUsers]);

  // Handler for page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) { setCurrentPage(newPage); }
  };

  // Handler for deleting a user
  const handleDeleteUser = async (userIdToDelete: string, userEmail: string) => {
    if (!isAdmin) { setActionError("Only Admins can remove users."); setTimeout(() => setActionError(null), 3000); return; }
    if (!currentAdminUser || userIdToDelete === currentAdminUser.id) { setActionError("Admins cannot remove their own account."); setTimeout(() => setActionError(null), 3000); return; }
    if (!window.confirm(`Are you sure you want to remove user ${userEmail}?`)) return;

    setActionLoading(prev => ({ ...prev, [userIdToDelete]: true })); setActionError(null);
    try {
      await AdminService.removeUser(userIdToDelete);
      if (users.length === 1 && currentPage > 1) { setCurrentPage(prev => prev - 1); }
      else { await fetchUsers(); }
    } catch (err: unknown) {
      let message = 'Failed to remove user.'; if (err instanceof Error) { message = err.message; }
      setActionError(message); setTimeout(() => setActionError(null), 5000);
    } finally { setActionLoading(prev => ({ ...prev, [userIdToDelete]: false })); }
  };

  // Handler for opening role management modal
  const handleManageRoles = (userToManage: UserDetailDto) => {
      setSelectedUserForRoles(userToManage); setIsRoleModalOpen(true);
  };

  // Handler for closing role management modal
  const closeRoleModal = () => {
      setIsRoleModalOpen(false); setSelectedUserForRoles(null);
  }

  // --- DELETED formatDate function as it's not used here ---

  // --- Render Logic ---
  if (isLoading && users.length === 0) return <p className="text-center p-4 text-gray-500">Loading users...</p>;
  if (error && users.length === 0) return <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-200">{error}</p>;

  return (
     <div className="overflow-x-auto">
        {actionError && <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-200 mb-4">{actionError}</p>}
        {isLoading && <p className="text-center text-blue-500 text-sm mb-2">Loading...</p>} {/* Show loading during refetch/page change */}

         <table className="min-w-full bg-white border border-gray-200 shadow rounded">
           <thead className="bg-gray-50 border-b border-gray-200">
             <tr>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Avatar</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Roles</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-200">
              {users.length === 0 && !isLoading && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-500">No users found.</td></tr>
              )}
             {users.map((listUser) => {
                 const fullAvatarUrl = listUser.avatarUrl?.startsWith('/') ? `${API_ORIGIN}${listUser.avatarUrl}` : listUser.avatarUrl;
                 const isCurrentUser = listUser.id === currentAdminUser?.id;
                 // Check if *any* action is loading for this row
                 const isRowLoading = !!actionLoading[listUser.id];

                 return (
                   <tr key={listUser.id} className={`hover:bg-gray-50 ${isRowLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                     <td className="px-4 py-2 whitespace-nowrap"><Avatar name={`${listUser.firstName} ${listUser.lastName}`} imageUrl={fullAvatarUrl} size="md" /></td>
                     <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{listUser.firstName} {listUser.lastName}</td>
                     <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{listUser.email}</td>
                     <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                         {listUser.roles.map(role => (<span key={role} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 mr-1 mb-1">{role}</span>))}
                     </td>
                     <td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => handleManageRoles(listUser)} disabled={isRowLoading}>Manage Roles</Button>
                        {isAdmin && (
                             <Button variant="danger" className="text-xs py-1 px-2" onClick={() => handleDeleteUser(listUser.id, listUser.email)}
                                // Corrected disabled check:
                                disabled={isCurrentUser || isRowLoading}
                             >
                                 {/* Corrected text check using isRowLoading */}
                                 {isRowLoading ? 'Processing...' : 'Remove'}
                             </Button>
                         )}
                     </td>
                   </tr>
                 );
             })}
           </tbody>
         </table>

         {/* Render the Manage Roles Modal */}
          <ManageRolesModal
              isOpen={isRoleModalOpen}
              onRequestClose={closeRoleModal}
              userToManage={selectedUserForRoles}
              availableRoles={availableRoles}
              onRolesUpdated={fetchUsers} // Pass fetchUsers to refresh list on update
          />

         {/* Pagination Controls */}
         {totalPages > 1 && (
             <PaginationControls
               currentPage={currentPage}
               totalPages={totalPages}
               onPageChange={handlePageChange}
             />
         )}
     </div>
   );
};

export default UserList;