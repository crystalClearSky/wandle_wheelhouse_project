// src/dto/ContactInquiries/ContactInquiryRequestDto.ts

// Define available inquiry types to match the backend enum (stored as strings)
export type InquiryTypeStrings = "GeneralInquiry" | "Volunteering" | "TourRequest" | "Feedback";

export interface ContactInquiryRequestDto {
  inquiryType: InquiryTypeStrings;
  name: string;
  email: string;
  phoneNumber?: string | null;
  message: string;
  hasConsented: boolean;

  // Fields specific to TourRequest
  organizationName?: string | null;
  tourGroupType?: string | null; // e.g., "Organization", "School", "Group", "Individual"
  preferredTourDate?: string | null; // ISO date string or YYYY-MM-DD
  numberOfAttendees?: number | null;
}