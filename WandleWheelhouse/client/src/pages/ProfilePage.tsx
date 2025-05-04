// Location: src/pages/ProfilePage.tsx

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
//import Avatar from '../components/ui/Avatar';
import ProfileService from '../services/ProfileService';
import { UserProfileUpdateDto } from '../dto/Users/UserProfileUpdateDto'; // DTO for updating
import { UserDetailDto } from '../dto/Users/UserDetailDto'; // DTO for full details
import { useNavigate, Link } from 'react-router-dom'; // Import Link and useNavigate
//import axios from 'axios'; // For error checking

const ProfilePage: React.FC = () => {
  // --- State ---
  const { user, login, logout, isLoading: authLoading } = useAuth(); // user is UserDetailDto | null
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserProfileUpdateDto>({
    // Initialize with empty or null based on DTO definition
    firstName: '', lastName: '', addressLine1: '', addressLine2: '',
    city: '', postCode: '', country: ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const navigate = useNavigate();

  // --- Effect to populate form ---
  useEffect(() => {
    // Populate form only when user data is available and not loading
    if (user && !authLoading) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        addressLine1: user.addressLine1 || '',
        addressLine2: user.addressLine2 || '',
        city: user.city || '',
        postCode: user.postCode || '',
        country: user.country || '',
      });
    }
  }, [user, authLoading]); // Depend on user and authLoading

  // --- Handlers ---
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null); setUploadSuccess(null);
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUploadError("File is too large (Max 5MB).");
        setSelectedFile(null); event.target.value = ''; return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleAvatarUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !user) return;
    setIsUploading(true); setUploadError(null); setUploadSuccess(null);
    try {
      const response = await ProfileService.uploadAvatar(selectedFile);
      setUploadSuccess("Avatar updated successfully!");
      setSelectedFile(null);
      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement; if (fileInput) fileInput.value = '';
      const currentToken = localStorage.getItem('authToken');
      // Update context using the login function, providing the *full current user data*
      // but with the updated avatarUrl from the response.
      if (user && currentToken) {
         const updatedUserInfo: UserDetailDto = { ...user, avatarUrl: response.avatarUrl };
         login(currentToken, updatedUserInfo); // Update context
      } else { throw new Error("Session error, please re-login."); }
    } catch (err: unknown) {
        let message = "Failed to upload avatar.";
        if (err instanceof Error) { message = err.message; }
        setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDetailChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
     const { name, value } = event.target;
     setFormData(prev => ({ ...prev, [name]: value }));
     setProfileUpdateError(null); setProfileUpdateSuccess(null);
  };

  const handleProfileUpdate = async (event: FormEvent) => {
      event.preventDefault();
      if (!user) return;
      setIsUpdatingProfile(true); setProfileUpdateError(null); setProfileUpdateSuccess(null);
      try {
          // Call API to update profile details
          const updatedUser = await ProfileService.updateMyProfile(formData); // Returns updated UserDetailDto
          setProfileUpdateSuccess("Profile updated successfully!");
          // Update auth context with the fully updated user details from response
          const currentToken = localStorage.getItem('authToken');
          if (currentToken) {
               login(currentToken, updatedUser); // Pass updated UserDetailDto directly to context
          } else { throw new Error("Session error, please re-login."); }
      } catch (err: unknown) {
           let message = "Failed to update profile.";
           if (err instanceof Error) { message = err.message; }
           setProfileUpdateError(message);
      } finally {
           setIsUpdatingProfile(false);
      }
  };

  const handleDeleteAccount = async () => {
      if (!window.confirm('Are you absolutely sure you want to delete your account?\nThis action cannot be undone.\nYour details will be kept for 30 days if you wish to reactivate.')) {
          return;
      }
      setIsDeleting(true); setDeleteError(null);
      try {
          await ProfileService.deleteMyAccount();
          alert("Your account deletion request has been processed."); // Alert before logout/redirect
          logout(); // Clear local session
          navigate('/'); // Redirect home
      } catch (err: unknown) {
           let message = "Failed to delete account.";
           if (err instanceof Error) { message = err.message; }
           setDeleteError(message);
           setIsDeleting(false);
      }
  };

  // --- Render Logic ---
  if (authLoading) return <div className="text-center p-10">Loading profile...</div>;
  // Use ProtectedRoute to handle this, but keep check just in case
  if (!user) return <div className="text-center p-10">Please log in to view your profile. <Link to="/" className='text-blue-600 hover:underline'>Go Home</Link></div>;

  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Your Profile</h1>

      {/* Profile Picture Section */}
      <section className="p-6 border rounded-lg shadow-sm bg-white">
         <h2 className="text-xl font-semibold mb-4 text-gray-700">Profile Picture</h2>
         <div className='flex flex-col sm:flex-row sm:items-start sm:space-x-6 space-y-4 sm:space-y-0'>
            {/* Image Display Area */}
            <div className="w-full sm:w-[30%] flex-shrink-0">
                {user.avatarUrl ? (
                    <img
                        src={user.avatarUrl.startsWith('/') ? `${API_ORIGIN}${user.avatarUrl}` : user.avatarUrl} // Construct full URL
                        alt="Profile"
                        className="w-full h-auto object-cover rounded-md aspect-square border"
                    />
                ) : (
                    <div className="w-full bg-gray-200 rounded-md aspect-square flex items-center justify-center text-gray-500 border">
                         No Picture Uploaded
                    </div>
                )}
            </div>
            {/* Upload Form Area */}
            <form onSubmit={handleAvatarUpload} className="w-full sm:w-[70%] flex-grow">
                 <label htmlFor="avatar-upload" className="block text-sm font-medium text-gray-700 mb-1"> Change picture (JPG, PNG, GIF - Max 5MB): </label>
                 <input id="avatar-upload" type="file" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2 disabled:opacity-50" disabled={isUploading}/>
                 {selectedFile && <p className='text-xs text-gray-500 mb-2'>Selected: {selectedFile.name}</p>}
                 <Button type="submit" disabled={!selectedFile || isUploading} variant='secondary' className="text-sm py-1 px-3"> {isUploading ? 'Uploading...' : 'Upload Image'} </Button>
                 {uploadError && <p className="text-red-600 text-sm mt-2">{uploadError}</p>}
                 {uploadSuccess && <p className="text-green-600 text-sm mt-2">{uploadSuccess}</p>}
            </form>
         </div>
      </section>

      {/* Profile Details Form Section */}
      <section className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Update Details</h2>
          {profileUpdateError && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded border border-red-200">{profileUpdateError}</p>}
          {profileUpdateSuccess && <p className="text-green-600 text-sm mb-3 bg-green-50 p-2 rounded border border-green-200">{profileUpdateSuccess}</p>}
          <form onSubmit={handleProfileUpdate}>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <Input label="First Name" id="profile-firstName" name="firstName" value={formData.firstName || ''} onChange={handleDetailChange} required disabled={isUpdatingProfile} />
                  <Input label="Last Name" id="profile-lastName" name="lastName" value={formData.lastName || ''} onChange={handleDetailChange} required disabled={isUpdatingProfile} />
               </div>
               {/* Display Email (Read Only) */}
               <Input label="Email" id="profile-email" type="email" value={user.email} readOnly disabled className='bg-gray-100 cursor-not-allowed' />
               {/* Address Fields */}
               <Input label="Address Line 1" id="profile-address1" name="addressLine1" value={formData.addressLine1 || ''} onChange={handleDetailChange} disabled={isUpdatingProfile} />
               <Input label="Address Line 2" id="profile-address2" name="addressLine2" value={formData.addressLine2 || ''} onChange={handleDetailChange} disabled={isUpdatingProfile} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                   <Input label="City" id="profile-city" name="city" value={formData.city || ''} onChange={handleDetailChange} disabled={isUpdatingProfile} />
                   <Input label="Post Code" id="profile-postCode" name="postCode" value={formData.postCode || ''} onChange={handleDetailChange} disabled={isUpdatingProfile} />
               </div>
               <Input label="Country" id="profile-country" name="country" value={formData.country || ''} onChange={handleDetailChange} disabled={isUpdatingProfile} />
               {/* Submit Button */}
               <Button type="submit" variant="primary" className='mt-4' disabled={isUpdatingProfile}>
                   {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
               </Button>
          </form>
      </section>

       {/* Subscription Link Section */}
       <section className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-3 text-gray-700">Manage Subscription</h2>
          <p className="text-sm text-gray-600 mb-3">View your current subscription status or make changes.</p>
           <Link to="/subscription">
             <Button variant="secondary">Go to Subscriptions</Button>
           </Link>
       </section>

       {/* Account Deletion Section */}
       <section className="mt-6 p-6 border rounded-lg shadow-sm bg-red-50 border-red-200">
            <h2 className="text-xl font-semibold mb-3 text-red-800">Delete Account</h2>
            <p className="text-sm text-red-700 mb-4">Permanently delete your account and remove access (your data will be fully removed after 30 days). This action cannot be undone once the grace period ends.</p>
            {deleteError && <p className="text-red-600 text-sm mb-3">{deleteError}</p>}
            <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
            >
                {isDeleting ? 'Deleting...' : 'Delete My Account'}
            </Button>
        </section>

    </div>
  );
};

export default ProfilePage;