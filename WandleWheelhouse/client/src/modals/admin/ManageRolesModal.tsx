// src/modals/admin/ManageRolesModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { UserDetailDto } from '../../dto/Users/UserDetailDto';
import { RoleDto } from '../../dto/Roles/RoleDto';
import AdminService from '../../services/AdminService';
import { useAuth } from '../../contexts/AuthContext'; // To prevent self-role-lockout

interface ManageRolesModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  userToManage: UserDetailDto | null; // User being edited
  availableRoles: RoleDto[];       // List of all possible roles
  onRolesUpdated: () => void;      // Callback to refetch user list after update
}

const ManageRolesModal: React.FC<ManageRolesModalProps> = ({
  isOpen,
  onRequestClose,
  userToManage,
  availableRoles,
  onRolesUpdated,
}) => {
  const { user: currentAdminUser } = useAuth(); // Currently logged-in admin
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set()); // Use a Set for efficient add/delete
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected roles when the modal opens or the target user changes
  useEffect(() => {
    if (userToManage) {
      setSelectedRoles(new Set(userToManage.roles)); // Initialize with user's current roles
    } else {
      setSelectedRoles(new Set()); // Clear if no user
    }
    setError(null); // Clear errors when modal opens/user changes
  }, [userToManage, isOpen]); // Depend on userToManage and isOpen

  // Handle checkbox changes
  const handleRoleChange = (roleName: string, isChecked: boolean) => {
    setSelectedRoles(prev => {
      const newRoles = new Set(prev);
      if (isChecked) {
        newRoles.add(roleName);
      } else {
        newRoles.delete(roleName);
      }
      return newRoles;
    });
    setError(null); // Clear error on change
  };

  // Handle saving the role changes
  const handleSaveChanges = async () => {
    if (!userToManage) return;

    setIsLoading(true);
    setError(null);

    const initialRoles = new Set(userToManage.roles);
    const rolesToAdd = [...selectedRoles].filter(role => !initialRoles.has(role));
    const rolesToRemove = [...initialRoles].filter(role => !selectedRoles.has(role));

    // --- Safety Check: Prevent Admin self-lockout ---
    const isSelf = currentAdminUser?.id === userToManage.id;
    if (isSelf && rolesToRemove.includes("Administrator")) {
        const otherAdmins = await AdminService.getUsers(1, 2); // Fetch potentially other admins
        // This check is basic - ideally, backend prevents last admin removal
        if (otherAdmins.items.filter(u => u.roles.includes("Administrator")).length <= 1) {
             setError("Cannot remove the only Administrator role from yourself.");
             setIsLoading(false);
             return;
        }
    }
    // --- End Safety Check ---

    try {
      // Perform removals first
      for (const role of rolesToRemove) {
        console.log(`Attempting to remove role: ${role} for user: ${userToManage.id}`);
        await AdminService.removeRoleFromUser(userToManage.id, role);
      }
      // Then perform additions
      for (const role of rolesToAdd) {
         console.log(`Attempting to add role: ${role} for user: ${userToManage.id}`);
        await AdminService.assignRoleToUser(userToManage.id, role);
      }

      onRolesUpdated(); // Callback to refresh the user list in the parent
      onRequestClose(); // Close modal on success

    } catch (err: unknown) {
      let message = "Failed to update roles.";
      if (err instanceof Error) { message = err.message; }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userToManage) return null; // Don't render if no user selected

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} title={`Manage Roles for ${userToManage.firstName} ${userToManage.lastName}`}>
       <div className="text-sm text-gray-600 mb-4">Select the roles for this user:</div>
       {error && <p className="text-red-600 bg-red-50 p-2 rounded text-sm mb-3">{error}</p>}

       <div className="space-y-2 mb-6">
            {availableRoles.map(role => (
                <div key={role.id} className="flex items-center">
                    <input
                        id={`role-${role.id}`}
                        name={role.name}
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={selectedRoles.has(role.name)}
                        onChange={(e) => handleRoleChange(role.name, e.target.checked)}
                        disabled={isLoading}
                    />
                     <label htmlFor={`role-${role.id}`} className="ml-2 block text-sm text-gray-900">
                       {role.name}
                    </label>
                </div>
            ))}
       </div>

       <div className="flex justify-end space-x-3 pt-4 border-t">
           <Button variant="secondary" onClick={onRequestClose} disabled={isLoading}>
               Cancel
           </Button>
           <Button variant="primary" onClick={handleSaveChanges} disabled={isLoading}>
               {isLoading ? 'Saving...' : 'Save Changes'}
           </Button>
       </div>
    </Modal>
  );
};

export default ManageRolesModal;