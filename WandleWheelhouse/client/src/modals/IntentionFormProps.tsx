import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import React, { FormEvent, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";

interface IntentionFormProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

const IntentionForm: React.FC<IntentionFormProps> = ({
  isOpen,
  onRequestClose,
}) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    type: "",
    groupType: "",
    organization: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Client-side validation
    if (!formData.firstName || !formData.lastName) {
      setError("First and last name are required.");
      setIsLoading(false);
      return;
    }
    if (!formData.email) {
      setError("Email is required.");
      setIsLoading(false);
      return;
    }
    if (!formData.type) {
      setError("Please select a registration type.");
      setIsLoading(false);
      return;
    }
    if (!formData.groupType) {
      setError("Please select a participant type.");
      setIsLoading(false);
      return;
    }

    try {
      // Simulate async submission (replace with actual service call if needed)
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay
      console.log("Registration submitted:", formData);

      setSuccessMessage(
        "Registration submitted successfully! We will contact you soon."
      );
      setTimeout(() => {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          type: "",
          groupType: "",
          organization: "",
        });
        setError(null);
        setIsLoading(false);
        onRequestClose();
      }, 1500);
    } catch (err: unknown) {
      let message = "An unexpected error occurred during submission.";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      }
      setError(message);
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      type: "",
      groupType: "",
      organization: "",
    });
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    onRequestClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      title="Register with Wandle Heritage"
    >
      <div className="relative bg-white rounded-xl sm:p-4 max-w-lg w-full mx-0 sm:mx-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full transition-colors duration-200"
          aria-label="Close modal"
          disabled={isLoading}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Modal Header */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">
          Register with Wandle Heritage
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <div
              className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2"
              role="alert"
            >
              <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {/* Success Alert */}
          {successMessage && (
            <div
              className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2"
              role="alert"
            >
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}

          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
            <Input
              label="First Name"
              id="reg-firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
            />
            <Input
              label="Last Name"
              id="reg-lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
            />
          </div>
          <Input
            label="Email Address"
            id="reg-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading}
            className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
          />
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Registration Type
            </label>
            <select
              name="type"
              id="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
              required
              disabled={isLoading}
            >
              <option value="">Select an option</option>
              <option value="Tours">Tours</option>
              <option value="Volunteering">Volunteering</option>
              <option value="Workshops">Workshops</option>
              <option value="Events">Events</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="groupType"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Participant Type
            </label>
            <select
              name="groupType"
              id="groupType"
              value={formData.groupType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
              required
              disabled={isLoading}
            >
              <option value="">Select an option</option>
              <option value="Individual">Individual</option>
              <option value="Group">Group</option>
              <option value="School">School</option>
              <option value="Organization">Organization</option>
            </select>
          </div>
          <Input
            label="Organization/Group Name (if applicable)"
            id="reg-organization"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
          />

          {/* Submit Button and Links */}
          <div className="mt-6 flex flex-col items-center">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-transform hover:scale-105 flex items-center justify-center"
            >
              {isLoading ? (
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
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
            <p className="mt-4 text-sm">
              Need more information?{" "}
              <button
                type="button"
                onClick={() => (window.location.href = "/contact")}
                className="font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none transition-colors duration-200"
                disabled={isLoading}
              >
                Contact us
              </button>
            </p>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default IntentionForm;
