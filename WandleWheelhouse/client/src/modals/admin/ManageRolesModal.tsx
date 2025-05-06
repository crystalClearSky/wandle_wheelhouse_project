// Location: src/modals/admin/ManageRolesModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal'; // Reusable Modal base
import Button from '../../components/ui/Button';
import { UserDetailDto } from '../../dto/Users/UserDetailDto'; // Displays user info
import { RoleDto } from '../../dto/Roles/RoleDto'; // Used for available roles
import AdminService from '../../services/AdminService'; // Service for API calls
import { useAuth } from '../../contexts/AuthContext'; // To prevent self-role modification issues

interface ManageRolesModalProps {
  isOpen: boolean;
  onRequestClose: () => void; // Function to close the modal
  userToManage: UserDetailDto | null; // The user whose roles are being managed
  availableRoles: RoleDto[];       // List of all possible roles from API
  onRolesUpdated: () => void;      // Callback to trigger refreshing the user list
}

const ManageRolesModal: React.FC<ManageRolesModalProps> = ({
  isOpen,
  onRequestClose,
  userToManage,
  availableRoles,
  onRolesUpdated,
}) => {
  const { user: currentAdminUser } = useAuth(); // Get the currently logged-in admin user

  // State to hold the roles currently checked in the modal
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  // State for loading during save operation
  const [isLoading, setIsLoading] = useState(false);
  // State for displaying errors within the modal
  const [error, setError] = useState<string | null>(null);

  // Effect to initialize the checked roles when the modal opens or the target user changes
  useEffect(() => {
    if (userToManage && isOpen) {
      // When modal opens for a user, set the initial checks based on their current roles
      setSelectedRoles(new Set(userToManage.roles));
      setError(null); // Clear any previous errors
      console.log("Modal opened for:", userToManage.email, "Initial roles:", userToManage.roles);
    } else {
      // Clear when modal closes or no user selected
      setSelectedRoles(new Set());
      setError(null);
    }
  }, [userToManage, isOpen]); // Re-run when the user or open state changes

  // Handler for checkbox changes
  const handleRoleChange = (roleName: string, isChecked: boolean) => {
    setSelectedRoles(prev => {
      const newRoles = new Set(prev); // Create a new Set from previous state
      if (isChecked) {
        newRoles.add(roleName); // Add role if checked
      } else {
        newRoles.delete(roleName); // Remove role if unchecked
      }
      return newRoles; // Return the new Set to update state
    });
    setError(null); // Clear error on interaction
  };

  // Handler for saving the role changes via API calls
  const handleSaveChanges = async () => {
    if (!userToManage) return; // Should not happen if modal is open, but safe check

    setIsLoading(true);
    setError(null);

    const initialRoles = new Set(userToManage.roles);
    const currentSelectedRoles = selectedRoles; // Use state value

    // Determine which roles to add and remove by comparing Sets
    const rolesToAdd = [...currentSelectedRoles].filter(role => !initialRoles.has(role));
    const rolesToRemove = [...initialRoles].filter(role => !currentSelectedRoles.has(role));

    console.log("Roles to Add:", rolesToAdd);
    console.log("Roles to Remove:", rolesToRemove);

    // --- Safety Check: Prevent Admin from removing their own last Administrator role ---
    const isSelf = currentAdminUser?.id === userToManage.id;
    if (isSelf && rolesToRemove.includes("Administrator")) {
        // Check if this is the *only* admin role they possess
        const otherRoles = [...currentSelectedRoles].filter(r => r !== "Administrator");
        if(otherRoles.length === 0 || !otherRoles.some(r => availableRoles.find(ar => ar.name === r))) { // Basic check
             setError("You cannot remove your own Administrator role if it's your only one.");
             setIsLoading(false);
             return;
         }
         // A more robust check might involve checking other users on the backend
         // but this prevents accidental self-lockout from the UI side.
    }
    // --- End Safety Check ---

    try {
      // Execute API calls - ideally use Promise.allSettled for better error handling if one fails
      const tasks: Promise<void>[] = [];

      // Add tasks for removals
      rolesToRemove.forEach(role => {
        console.log(`API Call: Removing role '${role}' for user ${userToManage.id}`);
        tasks.push(AdminService.removeRoleFromUser(userToManage.id, role));
      });

      // Add tasks for additions
      rolesToAdd.forEach(role => {
         console.log(`API Call: Adding role '${role}' for user ${userToManage.id}`);
        tasks.push(AdminService.assignRoleToUser(userToManage.id, role));
      });

      // Wait for all API calls to complete
      const results = await Promise.allSettled(tasks);

      // Check if any promises were rejected
      const failedTasks = results.filter(result => result.status === 'rejected');
      if (failedTasks.length > 0) {
          // Aggregate error messages (simple approach)
          const errorMessages = failedTasks.map(result => (result as PromiseRejectedResult).reason?.message || 'Unknown error').join('; ');
          throw new Error(`Some role updates failed: ${errorMessages}`);
      }

      // If all successful:
      console.log("Role updates successful for user:", userToManage.email);
      onRolesUpdated(); // Trigger the callback to refresh the UserList
      onRequestClose(); // Close the modal

    } catch (err: unknown) {
      let message = "Failed to update roles.";
      if (err instanceof Error) { message = err.message; }
      setError(message); // Display error within the modal
      setIsLoading(false); // Ensure loading stops on error
    }
    // Don't set isLoading false here on success as modal closes
  };

  // Render null if modal shouldn't be open or no user selected
  if (!isOpen || !userToManage) return null;

  return (
    // Using the base Modal component
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} title={`Manage Roles for ${userToManage.firstName} ${userToManage.lastName}`}>
       <div className="text-sm text-gray-600 mb-1">Email: {userToManage.email}</div>
       <div className="text-sm text-gray-600 mb-4">Current Roles: {userToManage.roles.join(', ') || 'None'}</div>

       {error && <p className="text-red-600 bg-red-50 p-2 rounded text-sm mb-3 border border-red-200">{error}</p>}

       {/* Role Checkboxes */}
       <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-2"> {/* Added scroll for many roles */}
            {availableRoles.length > 0 ? (
                availableRoles.map(role => (
                    <div key={role.id} className="flex items-center">
                        <input
                            id={`role-${role.id}-${userToManage.id}`} // More unique ID
                            name={role.name}
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                            // Check if the role name exists in the Set of selected roles
                            checked={selectedRoles.has(role.name)}
                            // Update the Set state on change
                            onChange={(e) => handleRoleChange(role.name, e.target.checked)}
                            disabled={isLoading}
                        />
                         <label
                                // --- CORRECTED htmlFor ---
                                htmlFor={`role-${role.id}-${userToManage.id}`}
                                className="ml-2 block text-sm text-gray-900"
                             >
                           {role.name}
                        </label>
                    </div>
                ))
            ) : (
                 <p className="text-sm text-gray-500">No roles available to assign.</p>
            )}
       </div>

       {/* Action Buttons */}
       <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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