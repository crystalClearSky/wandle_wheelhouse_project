// Location: src/pages/ProfilePage.tsx
import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    UserCircleIcon, // For placeholder avatar
} from "@heroicons/react/24/outline";
import React, {
    ChangeEvent,
    FormEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import Cropper, { Area } from "react-easy-crop";
import 'react-easy-crop/react-easy-crop.css'; // <-- IMPORT CROPPER CSS
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext"; // AuthContext should now export updateUserContext
// import { UserDetailDto } from "../dto/Users/UserDetailDto";
import { UserProfileUpdateDto } from "../dto/Users/UserProfileUpdateDto";
import ProfileService from "../services/ProfileService";

const ProfilePage: React.FC = () => {
    const { user, logout, isLoading: authLoading, updateUserContext } = useAuth(); // <-- Use updateUserContext
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null); // For Cropper preview from selectedFile
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [formData, setFormData] = useState<UserProfileUpdateDto>({
        firstName: "", lastName: "", addressLine1: "", addressLine2: "",
        city: "", postCode: "", country: "",
    });
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);
    const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Cropper state
    const [isEditing, setIsEditing] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const navigate = useNavigate();
    const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "";

    useEffect(() => {
        if (user && !authLoading) {
            setFormData({
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                addressLine1: user.addressLine1 || "",
                addressLine2: user.addressLine2 || "",
                city: user.city || "",
                postCode: user.postCode || "",
                country: user.country || "",
            });
        }
    }, [user, authLoading]);

    // Close editor on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isEditing) {
                setIsEditing(false);
                // Reset visual states but keep selectedFile and imageSrc for potential direct upload
                setBrightness(100); setContrast(100); setZoom(1); setCrop({ x: 0, y: 0 });
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditing]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        setUploadError(null); setUploadSuccess(null); setIsEditing(false);
        setBrightness(100); setContrast(100); setZoom(1); setCrop({ x: 0, y: 0 });

        const file = event.target.files?.[0];
        if (imageSrc) { URL.revokeObjectURL(imageSrc); setImageSrc(null); } // Clean up previous blob URL

        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setUploadError("File is too large (Max 5MB).");
                setSelectedFile(null); event.target.value = ""; return;
            }
            const newObjectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.src = newObjectUrl;
            img.onload = () => { setSelectedFile(file); setImageSrc(newObjectUrl); };
            img.onerror = () => {
                setUploadError("Invalid image file. Please select a valid JPG, PNG, or GIF.");
                setSelectedFile(null); event.target.value = ""; URL.revokeObjectURL(newObjectUrl);
            };
        } else {
            setSelectedFile(null);
        }
    };

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixelsValue: Area) => {
        setCroppedAreaPixels(croppedAreaPixelsValue);
    }, []);

    const getCroppedImg = async (
        currentImageSrc: string, pixelCrop: Area, imgBrightness: number, imgContrast: number
    ): Promise<Blob | null> => {
        try {
            const image = new Image();
            image.src = currentImageSrc;
            image.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = (errEvent) => {
                    console.error("Failed to load image for cropping:", currentImageSrc, errEvent);
                    reject(new Error("Image loading failed for cropping."));
                };
            });

            const canvas = canvasRef.current;
            if (!canvas) { console.error("Canvas ref not found for cropping."); return null; }
            const ctx = canvas.getContext("2d");
            if (!ctx) { console.error("Canvas 2D context not found."); return null; }

            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;
            ctx.filter = `brightness(${imgBrightness}%) contrast(${imgContrast}%)`;
            ctx.drawImage(
                image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
                0, 0, pixelCrop.width, pixelCrop.height
            );
            return new Promise<Blob | null>((resolve) => {
                canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9); // Quality 0.9 for JPEG
            });
        } catch (err) {
            console.error("Error in getCroppedImg:", err);
            setUploadError(`Error processing image: ${err instanceof Error ? err.message : 'Unknown error'}`);
            return null;
        }
    };

    const handleAvatarUpload = async (event?: FormEvent) => { // Make event optional for modal's button
        if(event) event.preventDefault();
        if (!selectedFile || !user || (isEditing && !imageSrc)) {
            setUploadError(isEditing ? "Please select a crop or cancel editing." : "Please select an image file.");
            return;
        }
        setIsUploading(true); setUploadError(null); setUploadSuccess(null);

        try {
            let fileToUpload: File = selectedFile;
            if (isEditing && croppedAreaPixels && imageSrc) {
                const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, brightness, contrast);
                if (croppedImageBlob) {
                    fileToUpload = new File([croppedImageBlob], selectedFile.name, { type: "image/jpeg" });
                } else {
                    throw new Error("Failed to crop image. Please try again or upload without editing.");
                }
            }

            const response = await ProfileService.uploadAvatar(fileToUpload);
            setUploadSuccess("Avatar updated successfully!");
            updateUserContext({ avatarUrl: response.avatarUrl }); // Update context with new avatar URL

            // Reset states after successful upload
            setSelectedFile(null);
            if (imageSrc) { URL.revokeObjectURL(imageSrc); }
            setImageSrc(null);
            setIsEditing(false); setBrightness(100); setContrast(100); setZoom(1); setCrop({ x: 0, y: 0 });
            setCroppedAreaPixels(null);
            const fileInput = document.getElementById("avatar-upload") as HTMLInputElement;
            if (fileInput) fileInput.value = "";

        } catch (err: unknown) {
            let message = "Failed to upload avatar.";
            if (err instanceof Error) { message = err.message; }
            setUploadError(message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDetailChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setProfileUpdateError(null); setProfileUpdateSuccess(null);
    };

    const handleProfileUpdate = async (event: FormEvent) => {
        event.preventDefault();
        if (!user) return;
        setIsUpdatingProfile(true); setProfileUpdateError(null); setProfileUpdateSuccess(null);

        try {
            const updatedUserFromApi = await ProfileService.updateMyProfile(formData);
            setProfileUpdateSuccess("Profile updated successfully!");
            updateUserContext(updatedUserFromApi); // Update context with all new details
        } catch (err: unknown) {
            let message = "Failed to update profile.";
            if (err instanceof Error) { message = err.message; }
            setProfileUpdateError(message);
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you absolutely sure you want to delete your account?\nThis action cannot be undone.\nYour details will be kept for 30 days if you wish to reactivate.")) {
            return;
        }
        setIsDeleting(true); setDeleteError(null);
        try {
            await ProfileService.deleteMyAccount();
            alert("Your account deletion request has been processed. You will now be logged out.");
            logout();
            navigate("/");
        } catch (err: unknown) {
            let message = "Failed to delete account.";
            if (err instanceof Error) { message = err.message; }
            setDeleteError(message);
            // Don't set isDeleting to false here if logout/navigation happens
        } finally {
            // This might not be reached if navigation happens before it
            if (isDeleting) setIsDeleting(false);
        }
    };

    const resetAvatarEditStates = () => {
        setIsEditing(false);
        setBrightness(100);
        setContrast(100);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
        // Keep selectedFile and imageSrc for the main "Upload Image" button if user cancels editing
    };

    // const handleCancelEdit = () => {
    //     resetAvatarEditStates();
    //     // Do not clear selectedFile or imageSrc here, user might want to upload original
    // };
    
    const handleModalCancelAndClear = () => {
        resetAvatarEditStates();
        if (imageSrc) { URL.revokeObjectURL(imageSrc); }
        setImageSrc(null);
        setSelectedFile(null);
        const fileInput = document.getElementById("avatar-upload") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };


    if (authLoading) return <div className="text-center p-10 text-gray-600">Loading profile...</div>;
    if (!user) return (
        <div className="text-center p-10 text-gray-600">
            Please log in to view your profile.{" "}
            <Link to="/" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors duration-200">
                Go Home
            </Link>
        </div>
    );

    return (
        <div className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl space-y-8 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 text-center">
                Your Profile
            </h1>

            {/* Profile Picture Section */}
            <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h2 className="text-xl font-semibold text-gray-800 mb-5">Profile Picture</h2>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="w-32 h-32 shrink-0 rounded-full border-2 border-indigo-200 p-1 bg-gray-50">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl.startsWith("/") ? `${API_ORIGIN}${user.avatarUrl}` : user.avatarUrl}
                                alt={`${user.firstName}'s Profile`}
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random&size=128`)} // Fallback
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                                <UserCircleIcon className="h-20 w-20 text-gray-400" />
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleAvatarUpload} className="w-full space-y-4">
                        <div>
                            <label htmlFor="avatar-upload" className="block text-sm font-medium text-gray-700 mb-1">
                                Change picture (JPG, PNG, GIF - Max 5MB):
                            </label>
                            <input
                                id="avatar-upload" type="file" accept="image/png, image/jpeg, image/gif"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                                disabled={isUploading}
                            />
                        </div>

                        {imageSrc && !isEditing && ( // Show preview and Edit button if an image is selected and not currently editing
                            <div className="flex flex-col items-start gap-2">
                                <p className="text-sm text-gray-600">Preview:</p>
                                <img
                                    src={imageSrc}
                                    alt="Selected preview"
                                    className="w-24 h-24 object-cover rounded-md border"
                                    style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                                />
                                <Button type="button" onClick={() => setIsEditing(true)} variant="outline"  className="mt-2">
                                    Edit Image
                                </Button>
                            </div>
                        )}
                        
                        {uploadError && <p className="text-sm text-red-600 flex items-center gap-1"><ExclamationCircleIcon className="h-5 w-5"/> {uploadError}</p>}
                        {uploadSuccess && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircleIcon className="h-5 w-5"/> {uploadSuccess}</p>}
                        
                        {/* Submit button for direct upload (if not editing) */}
                         {!isEditing && selectedFile && (
                            <Button type="submit" disabled={isUploading} variant="primary" className="w-full sm:w-auto">
                                {isUploading ? 'Uploading...' : 'Upload Image'}
                            </Button>
                        )}
                    </form>
                </div>

                {/* Cropper Modal */}
                {selectedFile && isEditing && imageSrc && (
                    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-white rounded-xl p-6 w-full max-w-lg sm:max-w-xl md:max-w-2xl relative space-y-4">
                            <h3 className="text-xl font-semibold text-gray-800">Edit Profile Picture</h3>
                            <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-200 rounded-md overflow-hidden">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
                                    onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
                                    objectFit="contain"
                                    style={{ containerStyle: { filter: `brightness(${brightness}%) contrast(${contrast}%)` } }}
                                />
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="zoom-slider" className="block text-sm font-medium text-gray-700">Zoom ({zoom.toFixed(1)})</label>
                                    <input type="range" id="zoom-slider" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"/>
                                </div>
                                <div>
                                    <label htmlFor="brightness-slider" className="block text-sm font-medium text-gray-700">Brightness ({brightness}%)</label>
                                    <input type="range" id="brightness-slider" min={0} max={200} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"/>
                                </div>
                                <div>
                                    <label htmlFor="contrast-slider" className="block text-sm font-medium text-gray-700">Contrast ({contrast}%)</label>
                                    <input type="range" id="contrast-slider" min={0} max={200} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"/>
                                </div>
                            </div>
                            <div className="mt-6 flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:gap-3 sm:justify-end">
                                <Button type="button" variant="outline" onClick={handleModalCancelAndClear} disabled={isUploading}>Cancel & Clear</Button>
                                <Button type="button" onClick={handleAvatarUpload} variant="primary" disabled={isUploading || !croppedAreaPixels}>
                                    {isUploading ? 'Saving...' : 'Save Edited Image'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
                 <canvas ref={canvasRef} style={{ display: "none" }} />
            </section>

            {/* Profile Details Form Section */}
            <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                 <h2 className="text-xl font-semibold text-gray-800 mb-5">Update Your Details</h2>
                 {profileUpdateError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 mb-4 flex items-center gap-1"><ExclamationCircleIcon className="h-5 w-5"/> {profileUpdateError}</p>}
                 {profileUpdateSuccess && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200 mb-4 flex items-center gap-1"><CheckCircleIcon className="h-5 w-5"/> {profileUpdateSuccess}</p>}
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="First Name" id="profile-firstName" name="firstName" value={formData.firstName || ""} onChange={handleDetailChange} required disabled={isUpdatingProfile} />
                        <Input label="Last Name" id="profile-lastName" name="lastName" value={formData.lastName || ""} onChange={handleDetailChange} required disabled={isUpdatingProfile} />
                    </div>
                    <Input label="Email" id="profile-email" type="email" value={user.email || ''} readOnly disabled className="bg-gray-100 cursor-not-allowed" />
                    <Input label="Address Line 1" id="profile-address1" name="addressLine1" value={formData.addressLine1 || ""} onChange={handleDetailChange} disabled={isUpdatingProfile} />
                    <Input label="Address Line 2" id="profile-address2" name="addressLine2" value={formData.addressLine2 || ""} onChange={handleDetailChange} disabled={isUpdatingProfile} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="City" id="profile-city" name="city" value={formData.city || ""} onChange={handleDetailChange} disabled={isUpdatingProfile} />
                        <Input label="Post Code" id="profile-postCode" name="postCode" value={formData.postCode || ""} onChange={handleDetailChange} disabled={isUpdatingProfile} />
                    </div>
                    <Input label="Country" id="profile-country" name="country" value={formData.country || ""} onChange={handleDetailChange} disabled={isUpdatingProfile} />
                    <Button type="submit" variant="primary" className="w-full sm:w-auto transition-transform hover:scale-105 py-2.5" disabled={isUpdatingProfile}>
                        {isUpdatingProfile ? 'Saving Details...' : 'Save Profile Changes'}
                    </Button>
                </form>
            </section>

            {/* Subscription Link Section */}
            <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Manage Subscription</h2>
                <p className="text-sm text-gray-600 mb-4">View your current subscription status or make changes.</p>
                <Link to="/subscription">
                    <Button variant="outline" className="w-full transition-transform hover:scale-105">Go to Subscriptions</Button>
                </Link>
            </section>

            {/* Account Deletion Section */}
            <section className="bg-red-50 p-6 sm:p-8 rounded-xl shadow-lg border border-red-200 hover:shadow-xl transition-shadow duration-300">
                <h2 className="text-xl font-semibold text-red-700 mb-3">Account Actions</h2>
                <p className="text-sm text-red-600 mb-4">Permanently delete your account. This action cannot be undone after the grace period.</p>
                {deleteError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300 mb-4 flex items-center gap-1"><ExclamationCircleIcon className="h-5 w-5"/> {deleteError}</p>}
                <Button variant="danger" onClick={handleDeleteAccount} disabled={isDeleting} className="w-full transition-transform hover:scale-105">
                    {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
                </Button>
            </section>
        </div>
    );
};

export default ProfilePage;