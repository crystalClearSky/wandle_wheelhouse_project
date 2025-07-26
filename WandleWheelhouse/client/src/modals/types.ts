// src/modals/types.ts
import { DonationRequestDto } from "../dto/Donations/DonationRequestDto";
import { PaymentMethod } from "../dto/Donations/PaymentMethodEnum";

export type DonationFormInputData = Omit<DonationRequestDto, "method" | "subscriptionId"> & {
  paymentMethodSelection: PaymentMethod;
  gdprConsent: boolean;
  useManualAddress: boolean;
};

export interface NominatimSuggestion {
  place_id: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
  };
}

export interface InitiateStripeDonationApiPayload {
  amount: number;
  currency: string;
  donorFirstName?: string;
  donorLastName?: string;
  donorEmail?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingStateOrCounty?: string;
  billingPostCode?: string;
  billingCountry?: string;
}

export interface DonationDetails {
  donationId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
}