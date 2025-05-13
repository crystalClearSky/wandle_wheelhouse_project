import {
  CheckCircleIcon,
  ExclamationCircleIcon,
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
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext";
import { UserDetailDto } from "../dto/Users/UserDetailDto";
import { UserProfileUpdateDto } from "../dto/Users/UserProfileUpdateDto";
import ProfileService from "../services/ProfileService";

const ProfilePage: React.FC = () => {
  const { user, login, logout, isLoading: authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserProfileUpdateDto>({
    firstName: "",
    lastName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postCode: "",
    country: "",
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(
    null
  );
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const navigate = useNavigate();

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditing) {
        setIsEditing(false);
        setBrightness(100);
        setContrast(100);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
        if (imageSrc) {
          URL.revokeObjectURL(imageSrc);
        }
        setImageSrc(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, imageSrc]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    setIsEditing(false);
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File is too large (Max 5MB).");
        setSelectedFile(null);
        if (imageSrc) {
          URL.revokeObjectURL(imageSrc);
        }
        setImageSrc(null);
        event.target.value = "";
        return;
      }
      // Validate image by attempting to load it
      const newImageSrc = URL.createObjectURL(file);
      const img = new Image();
      img.src = newImageSrc;
      img.onload = () => {
        setSelectedFile(file);
        if (imageSrc) {
          URL.revokeObjectURL(imageSrc);
        }
        setImageSrc(newImageSrc);
      };
      img.onerror = () => {
        setUploadError("Invalid image file or failed to load image.");
        setSelectedFile(null);
        if (imageSrc) {
          URL.revokeObjectURL(imageSrc);
        }
        setImageSrc(null);
        event.target.value = "";
        URL.revokeObjectURL(newImageSrc);
      };
    } else {
      setSelectedFile(null);
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
      setImageSrc(null);
    }
  };

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    brightness: number,
    contrast: number
  ): Promise<Blob | null> => {
    try {
      const image = new Image();
      image.src = imageSrc;
      image.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => {
          console.error("Failed to load image for cropping:", imageSrc);
          reject(new Error("Image loading failed"));
        };
      });
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("Canvas element not found");
        return null;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Failed to get 2D context for canvas");
        return null;
      }
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      return new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
      });
    } catch (err) {
      console.error("Error in getCroppedImg:", err);
      return null;
    }
  };

  const handleAvatarUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !user || !imageSrc) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      let fileToUpload = selectedFile;
      if (isEditing && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(
          imageSrc,
          croppedAreaPixels,
          brightness,
          contrast
        );
        if (croppedImage)
          fileToUpload = new File([croppedImage], selectedFile.name, {
            type: "image/jpeg",
          });
      }
      const response = await ProfileService.uploadAvatar(fileToUpload);
      setUploadSuccess("Avatar updated successfully!");
      setSelectedFile(null);
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
      setImageSrc(null);
      setIsEditing(false);
      setBrightness(100);
      setContrast(100);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      const fileInput = document.getElementById(
        "avatar-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      const currentToken = localStorage.getItem("authToken");
      if (user && currentToken) {
        const updatedUserInfo: UserDetailDto = {
          ...user,
          avatarUrl: response.avatarUrl,
        };
        login(currentToken, updatedUserInfo);
      } else {
        throw new Error("Session error, please re-login.");
      }
    } catch (err: unknown) {
      let message = "Failed to upload avatar.";
      if (err instanceof Error) {
        message = err.message;
      }
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDetailChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setProfileUpdateError(null);
    setProfileUpdateSuccess(null);
  };

  const handleProfileUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    setProfileUpdateError(null);
    setProfileUpdateSuccess(null);
    try {
      const updatedUser = await ProfileService.updateMyProfile(formData);
      setProfileUpdateSuccess("Profile updated successfully!");
      const currentToken = localStorage.getItem("authToken");
      if (currentToken) {
        login(currentToken, updatedUser);
      } else {
        throw new Error("Session error, please re-login.");
      }
    } catch (err: unknown) {
      let message = "Failed to update profile.";
      if (err instanceof Error) {
        message = err.message;
      }
      setProfileUpdateError(message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you absolutely sure you want to delete your account?\nThis action cannot be undone.\nYour details will be kept for 30 days if you wish to reactivate."
      )
    ) {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await ProfileService.deleteMyAccount();
      alert("Your account deletion request has been processed.");
      logout();
      navigate("/");
    } catch (err: unknown) {
      let message = "Failed to delete account.";
      if (err instanceof Error) {
        message = err.message;
      }
      setDeleteError(message);
      setIsDeleting(false);
    }
  };

  if (authLoading)
    return (
      <div className="text-center p-10 text-gray-600">Loading profile...</div>
    );
  if (!user)
    return (
      <div className="text-center p-10 text-gray-600">
        Please log in to view your profile.{" "}
        <Link
          to="/"
          className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
        >
          Go Home
        </Link>
      </div>
    );

  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "";

  return (
    <div className="container mx-auto px-6 py-12 max-w-3xl space-y-8">
      {/* Page Header */}
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 text-center">
        Your Profile
      </h1>

      {/* Profile Picture Section */}
      <section className="bg-white rounded-xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-shadow duration-300">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Profile Picture
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Image Display Area */}
          <div className="w-32 h-32 shrink-0">
            {user.avatarUrl ? (
              <img
                src={
                  user.avatarUrl.startsWith("/")
                    ? `${API_ORIGIN}${user.avatarUrl}`
                    : user.avatarUrl
                }
                alt="Profile"
                className="w-full h-full object-cover rounded-full border border-gray-200"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                <svg
                  className="h-16 w-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  ></path>
                </svg>
              </div>
            )}
          </div>
          {/* Upload Form Area */}
          <form onSubmit={handleAvatarUpload} className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Left Column: Upload */}
              <div className="flex flex-col gap-3">
                <label
                  htmlFor="avatar-upload"
                  className="block text-sm font-medium text-gray-700"
                >
                  Change picture (JPG, PNG, GIF - Max 5MB):
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/gif"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 transition-colors duration-200"
                  disabled={isUploading}
                />
                <Button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  variant="secondary"
                  className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-transform hover:scale-105 flex items-center justify-center mt-auto"
                >
                  {isUploading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2 text-gray-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    "Upload Image"
                  )}
                </Button>
              </div>
              {/* Right Column: Edit */}
              <div className="flex flex-col gap-3">
                {selectedFile && !isEditing && (
                  <div className="flex flex-col gap-2">
                    <img
                      src={imageSrc || ""}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-full border border-gray-200 self-start"
                      style={{
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      Selected: {selectedFile.name}
                    </p>
                  </div>
                )}
                {uploadError && (
                  <div
                    className="bg-red-50 border border-red-400 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2"
                    role="alert"
                  >
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    <span>{uploadError}</span>
                  </div>
                )}
                {uploadSuccess && (
                  <div
                    className="bg-green-50 border border-green-400 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2"
                    role="alert"
                  >
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}
                {selectedFile && !isEditing && (
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    variant="secondary"
                    className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-transform hover:scale-105 mt-auto"
                  >
                    Edit Image
                  </Button>
                )}
              </div>
            </div>
            {selectedFile && isEditing && imageSrc && (
              <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-2xl relative">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Edit Profile Picture
                  </h3>
                  <div
                    className="relative w-full h-96 mb-4"
                    style={{
                      filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                    }}
                  >
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                      objectFit="contain"
                      onMediaLoaded={() =>
                        console.log("Cropper image loaded successfully")
                      }
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Brightness (%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Contrast (%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setBrightness(100);
                        setContrast(100);
                        setZoom(1);
                        setCrop({ x: 0, y: 0 });
                        if (imageSrc) {
                          URL.revokeObjectURL(imageSrc);
                        }
                        setImageSrc(null);
                      }}
                      variant="secondary"
                      className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-transform hover:scale-105"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isUploading}
                      variant="primary"
                      className="py-2 px-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-transform hover:scale-105 flex items-center justify-center"
                    >
                      {isUploading ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5 mr-2 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        "Save Edited Image"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </form>
        </div>
      </section>

      {/* Profile Details Form Section */}
      <section className="bg-white rounded-xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-shadow duration-300">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Update Details
        </h2>
        {profileUpdateError && (
          <div
            className="bg-red-50 border border-red-400 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 mb-4"
            role="alert"
          >
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            <span>{profileUpdateError}</span>
          </div>
        )}
        {profileUpdateSuccess && (
          <div
            className="bg-green-50 border border-green-400 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 mb-4"
            role="alert"
          >
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span>{profileUpdateSuccess}</span>
          </div>
        )}
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="First Name"
              id="profile-firstName"
              name="firstName"
              value={formData.firstName || ""}
              onChange={handleDetailChange}
              required
              disabled={isUpdatingProfile}
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
            />
            <Input
              label="Last Name"
              id="profile-lastName"
              name="lastName"
              value={formData.lastName || ""}
              onChange={handleDetailChange}
              required
              disabled={isUpdatingProfile}
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
            />
          </div>
          <Input
            label="Email"
            id="profile-email"
            type="email"
            value={user.email}
            readOnly
            disabled
            className="w-full bg-gray-100 cursor-not-allowed border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
          />
          <Input
            label="Address Line 1"
            id="profile-address1"
            name="addressLine1"
            value={formData.addressLine1 || ""}
            onChange={handleDetailChange}
            disabled={isUpdatingProfile}
            className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
          />
          <Input
            label="Address Line 2"
            id="profile-address2"
            name="addressLine2"
            value={formData.addressLine2 || ""}
            onChange={handleDetailChange}
            disabled={isUpdatingProfile}
            className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="City"
              id="profile-city"
              name="city"
              value={formData.city || ""}
              onChange={handleDetailChange}
              disabled={isUpdatingProfile}
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
            />
            <Input
              label="Post Code"
              id="profile-postCode"
              name="postCode"
              value={formData.postCode || ""}
              onChange={handleDetailChange}
              disabled={isUpdatingProfile}
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
            />
          </div>
          <Input
            label="Country"
            id="profile-country"
            name="country"
            value={formData.country || ""}
            onChange={handleDetailChange}
            disabled={isUpdatingProfile}
            className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 px-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-transform hover:scale-105 flex items-center justify-center"
            disabled={isUpdatingProfile}
          >
            {isUpdatingProfile ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save Profile Changes"
            )}
          </Button>
        </form>
      </section>

      {/* Subscription Link Section */}
      <section className="bg-white rounded-xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-shadow duration-300">
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          Manage Subscription
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          View your current subscription status or make changes.
        </p>
        <Link to="/subscription">
          <Button
            variant="secondary"
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-transform hover:scale-105"
          >
            Go to Subscriptions
          </Button>
        </Link>
      </section>

      {/* Account Deletion Section */}
      <section className="bg-red-50 rounded-xl shadow-lg p-6 sm:p-8 border border-red-200 hover:shadow-xl transition-shadow duration-300">
        <h2 className="text-2xl font-semibold text-red-800 mb-3">
          Delete Account
        </h2>
        <p className="text-sm text-red-700 mb-4">
          Permanently delete your account and remove access (your data will be
          fully removed after 30 days). This action cannot be undone once the
          grace period ends.
        </p>
        {deleteError && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 mb-4"
            role="alert"
          >
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            <span>{deleteError}</span>
          </div>
        )}
        <Button
          variant="danger"
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="w-full py-3 px-4 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-transform hover:scale-105 flex items-center justify-center"
        >
          {isDeleting ? (
            <>
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Deleting...
            </>
          ) : (
            "Delete My Account"
          )}
        </Button>
      </section>
    </div>
  );
};

export default ProfilePage;
