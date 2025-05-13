// src/components/forms/ContactForm.tsx
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { ContactInquiryRequestDto, InquiryTypeStrings } from '../../dto/ContactInquiries/ContactInquiryRequestDto';
import PublicService from '../../services/PublicService';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Link } from 'react-router-dom';
import Textarea from '../ui/Textarea'; // Assuming you have a Textarea component similar to Input
import Select from '../ui/Select'; // Assuming you have a Select component

const inquiryTypes: { value: InquiryTypeStrings; label: string }[] = [
    { value: "GeneralInquiry", label: "General Inquiry" },
    { value: "Volunteering", label: "Volunteering Question" },
    { value: "TourRequest", label: "Request a Tour" },
    { value: "Feedback", label: "Website Feedback/Suggestion" },
];

const tourGroupTypes = [
    { value: "", label: "Select group type..." },
    { value: "Organization", label: "Organization / Company" },
    { value: "School", label: "School / College" },
    { value: "CommunityGroup", label: "Community Group" },
    { value: "Individual", label: "Individual / Family" },
];

const ContactForm: React.FC = () => {
    const initialFormData: ContactInquiryRequestDto = {
        inquiryType: "GeneralInquiry", name: '', email: '', phoneNumber: '',
        message: '', hasConsented: false, organizationName: '',
        tourGroupType: '', preferredTourDate: '', numberOfAttendees: undefined,
    };
    const [formData, setFormData] = useState<ContactInquiryRequestDto>(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const inputValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;

        setFormData(prev => ({
            ...prev,
            [name]: name === 'numberOfAttendees' && value !== '' ? parseInt(value, 10) : inputValue
        }));
        setError(null); setSuccess(null);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null); setSuccess(null);

        if (!formData.hasConsented) {
            setError("You must consent to being contacted to submit the form.");
            return;
        }
        // Add other client-side validations as needed
        if (!formData.name || !formData.email || !formData.message || !formData.inquiryType) {
            setError("Please fill in all required fields (Name, Email, Inquiry Type, Message).");
            return;
        }

        setIsLoading(true);
        try {
            // Prepare data (ensure empty optional fields are null or undefined if backend expects that)
            const payload: ContactInquiryRequestDto = {
                ...formData,
                phoneNumber: formData.phoneNumber?.trim() || null,
                organizationName: formData.inquiryType === 'TourRequest' ? (formData.organizationName?.trim() || null) : null,
                tourGroupType: formData.inquiryType === 'TourRequest' ? (formData.tourGroupType?.trim() || null) : null,
                preferredTourDate: formData.inquiryType === 'TourRequest' ? (formData.preferredTourDate || null) : null,
                numberOfAttendees: formData.inquiryType === 'TourRequest' ? (formData.numberOfAttendees || null) : null,
            };

            const response = await PublicService.submitContactInquiry(payload);
            setSuccess(response.message || "Your inquiry has been submitted successfully! We'll be in touch soon.");
            setFormData(initialFormData); // Reset form
        } catch (err: unknown) {
            let message = "Submission failed. Please try again.";
            if (err instanceof Error) { message = err.message; }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
            {success && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">{success}</p>}

            <Select
                label="Reason for Contact"
                id="inquiryType"
                name="inquiryType"
                value={formData.inquiryType}
                onChange={handleChange}
                options={inquiryTypes}
                required
                disabled={isLoading}
            />
            <Input label="Full Name" id="name" name="name" value={formData.name} onChange={handleChange} required disabled={isLoading} />
            <Input label="Email Address" id="email" name="email" type="email" value={formData.email} onChange={handleChange} required disabled={isLoading} />
            <Input label="Phone Number (Optional)" id="phoneNumber" name="phoneNumber" type="tel" value={formData.phoneNumber || ''} onChange={handleChange} disabled={isLoading} />

            {/* Conditional Fields for Tour Request */}
            {formData.inquiryType === 'TourRequest' && (
                <>
                    <Input label="Organization/Group Name (Optional)" id="organizationName" name="organizationName" value={formData.organizationName || ''} onChange={handleChange} disabled={isLoading} />
                    <Select label="Type of Group" id="tourGroupType" name="tourGroupType" value={formData.tourGroupType || ''} onChange={handleChange} options={tourGroupTypes} disabled={isLoading} />
                    <Input label="Preferred Tour Date (Optional)" id="preferredTourDate" name="preferredTourDate" type="date" value={formData.preferredTourDate || ''} onChange={handleChange} disabled={isLoading} min={new Date().toISOString().split('T')[0]} />
                    <Input label="Number of Attendees (Optional)" id="numberOfAttendees" name="numberOfAttendees" type="number" value={formData.numberOfAttendees?.toString() || ''} onChange={handleChange} min="1" disabled={isLoading} />
                </>
            )}

            <Textarea label="Message" id="message" name="message" value={formData.message} onChange={handleChange} rows={5} required disabled={isLoading} />

            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        id="hasConsented"
                        name="hasConsented"
                        type="checkbox"
                        checked={formData.hasConsented}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="hasConsented" className="font-medium text-gray-700">
                        I consent to Wandle Wheelhouse contacting me regarding this inquiry.
                    </label>
                    <p className="text-gray-500">
                        We will use your information to respond to you, based on our <Link to="/privacy" className="underline hover:text-indigo-700">Privacy Policy</Link>.
                    </p>
                </div>
            </div>

            <Button type="submit" variant="primary" className="w-full transition-transform hover:scale-105" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Send Message'}
            </Button>
        </form>
    );
};

export default ContactForm;