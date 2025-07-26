// src/modals/DonationModal.tsx
import {
  faCcAmex,
  faCcDiscover,
  faCcJcb,
  faCcMastercard,
  faCcVisa,
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import React, { useEffect, useState, useCallback } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import axios from "axios";
import { debounce } from "lodash";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { DonationRequestDto } from "../dto/Donations/DonationRequestDto";
import { PaymentMethod } from "../dto/Donations/PaymentMethodEnum";
import DonationService, {
  InitiateStripeDonationApiPayload,
} from "../services/DonationService";

interface DonationModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onDonationSuccess?: (donationId: string, method: PaymentMethod) => void;
}

type DonationFormInputData = Omit<
  DonationRequestDto,
  "method" | "subscriptionId"
> & {
  paymentMethodSelection: PaymentMethod;
  gdprConsent: boolean;
  useManualAddress: boolean;
};

interface NominatimSuggestion {
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

// Initialize Stripe with error logging
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_51RPe3nP9WcEYOJmo2WxB761ymlk9rKDaZ1tbj6SZyyK25LwiG17IMsJtioosFpOnbCpG193W8uhvA44OXBMO8qWb00AFZ5WnGe"
);

stripePromise.catch((error: Error) => {
  console.error("Failed to initialize Stripe:", error);
});

const StripePaymentSection: React.FC<{
  initiateDonationPayload: InitiateStripeDonationApiPayload;
  onPaymentSuccess: (message: string, donationId: string) => void;
  onPaymentError: (message: string) => void;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  gdprConsent: boolean;
}> = ({
  initiateDonationPayload,
  onPaymentSuccess,
  onPaymentError,
  setIsProcessing,
  gdprConsent,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    if (!stripe || !elements) {
      console.warn("Stripe or Elements not initialized yet:", {
        stripe,
        elements,
      });
    }
  }, [stripe, elements]);

  const handleStripePayment = async (): Promise<void> => {
    if (!stripe || !elements) {
      onPaymentError("Stripe is not ready. Please try again.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onPaymentError(
        "Card details are not available. Please enter them correctly."
      );
      return;
    }

    if (!gdprConsent) {
      onPaymentError("Please consent to data processing for GDPR compliance.");
      return;
    }

    setIsProcessing(true);
    onPaymentError("");

    try {
      console.log(
        "Initiating Stripe donation with payload:",
        initiateDonationPayload
      );
      const response = await DonationService.initiateStripeDonation(
        initiateDonationPayload
      );
      if (!response.stripeClientSecret) {
        throw new Error(
          "Failed to obtain payment authorization from the server."
        );
      }

      const paymentResult = await stripe.confirmCardPayment(
        response.stripeClientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name:
                `${initiateDonationPayload.donorFirstName || ""} ${
                  initiateDonationPayload.donorLastName || ""
                }`.trim() || undefined,
              email: initiateDonationPayload.donorEmail || undefined,
              address: {
                line1: initiateDonationPayload.billingAddressLine1 || undefined,
                line2: initiateDonationPayload.billingAddressLine2 || undefined,
                city: initiateDonationPayload.billingCity || undefined,
                state: initiateDonationPayload.billingStateOrCounty || undefined,
                postal_code: initiateDonationPayload.billingPostCode || undefined,
                country: initiateDonationPayload.billingCountry || undefined,
              },
            },
          },
        }
      );

      if (paymentResult.error) {
        onPaymentError(
          paymentResult.error.message || "Payment failed. Please try again."
        );
      } else if (paymentResult.paymentIntent?.status === "succeeded") {
        onPaymentSuccess(
          `Thank you! Your donation of £${initiateDonationPayload.amount.toFixed(2)} was successful. Donation ID: ${response.donationId}`,
          response.donationId
        );
      } else {
        onPaymentError(
          `Payment status: ${paymentResult.paymentIntent?.status}. Please contact support.`
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during payment.";
      console.error("Error during Stripe payment processing:", error);
      onPaymentError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mt-4 text-center">
      <div className="flex justify-center space-x-2 mb-3">
        <FontAwesomeIcon
          icon={faCcVisa}
          className="text-gray-600 text-xl hover:text-indigo-600 transition-colors"
          title="Visa"
        />
        <FontAwesomeIcon
          icon={faCcMastercard}
          className="text-gray-600 text-xl hover:text-indigo-600 transition-colors"
          title="Mastercard"
        />
        <FontAwesomeIcon
          icon={faCcAmex}
          className="text-gray-600 text-xl hover:text-indigo-600 transition-colors"
          title="American Express"
        />
        <FontAwesomeIcon
          icon={faCcDiscover}
          className="text-gray-600 text-xl hover:text-indigo-600 transition-colors"
          title="Discover"
        />
        <FontAwesomeIcon
          icon={faCcJcb}
          className="text-gray-600 text-xl hover:text-indigo-600 transition-colors"
          title="JCB"
        />
      </div>
      <label
        htmlFor="card-element"
        className="block text-xs font-medium text-gray-700 mb-1"
      >
        Card Information
      </label>
      <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md w-full">
        <CardElement
          id="card-element"
          options={{
            style: {
              base: {
                fontSize: "14px",
                color: "#1f2937",
                "::placeholder": { color: "#9ca3af" },
              },
              invalid: {
                color: "#ef4444",
              },
            },
            hidePostalCode: true,
          }}
        />
      </div>
      <Button
        type="button"
        onClick={handleStripePayment}
        className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-2 rounded-lg shadow-md hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        disabled={!stripe || !elements || !gdprConsent}
      >
        Confirm Donation
      </Button>
    </div>
  );
};

const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onRequestClose,
  onDonationSuccess,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<DonationFormInputData>({
    defaultValues: {
      amount: 0.00,
      currency: "gbp",
      paymentMethodSelection: PaymentMethod.Stripe,
      donorFirstName: "",
      donorLastName: "",
      donorEmail: "",
      billingAddressLine1: "",
      billingAddressLine2: "",
      billingCity: "",
      billingStateOrCounty: "",
      billingPostCode: "",
      billingCountry: "",
      isRecurring: false,
      gdprConsent: false,
      useManualAddress: false,
    },
    mode: "onChange",
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCustomAmount, setShowCustomAmount] = useState<boolean>(false);
  const [donationDetails, setDonationDetails] = useState<{
    donationId: string;
    amount: number;
    method: PaymentMethod;
    date: string;
  } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);

  const selectedPaymentMethod: PaymentMethod = watch("paymentMethodSelection");
  const gdprConsent: boolean = watch("gdprConsent");
  const useManualAddress: boolean = watch("useManualAddress");
  const formValues: DonationFormInputData = watch();

  // Debounced function to fetch address suggestions from Nominatim
  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const response = await axios.get<NominatimSuggestion[]>(
          "https://nominatim.openstreetmap.org/search",
          {
            params: {
              q: query,
              format: "json",
              addressdetails: 1,
              limit: 5,
            },
            headers: {
              "User-Agent": "DonationApp/1.0 (your-email@example.com)", // Replace with your app name and email
            },
          }
        );
        setSuggestions(response.data);
      } catch (error) {
        console.error("Error fetching address suggestions:", error);
        setErrorMessage("Failed to fetch address suggestions. Please try again or enter manually.");
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 1000),
    []
  );

  const handleAmountSelection = (amount: number) => {
    const amountInPounds = amount / 100;
    console.log(`Setting amount to ${amountInPounds} from ${amount} pence`);
    setValue("amount", amountInPounds, { shouldValidate: true });
    setShowCustomAmount(false);
  };

  const toggleCustomAmount = () => {
    setShowCustomAmount(true);
    setValue("amount", 0.00, { shouldValidate: true });
  };

  const handleResetAndClose = () => {
    reset({
      amount: 0.00,
      currency: "gbp",
      paymentMethodSelection: PaymentMethod.Stripe,
      donorFirstName: "",
      donorLastName: "",
      donorEmail: "",
      billingAddressLine1: "",
      billingAddressLine2: "",
      billingCity: "",
      billingStateOrCounty: "",
      billingPostCode: "",
      billingCountry: "",
      isRecurring: false,
      gdprConsent: false,
      useManualAddress: false,
    });
    setSuccessMessage(null);
    setErrorMessage(null);
    setShowCustomAmount(false);
    setDonationDetails(null);
    setAddress("");
    setSuggestions([]);
    onRequestClose();
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    fetchSuggestions(value);
  };

  const handleAddressSelect = (suggestion: NominatimSuggestion) => {
    setAddress(suggestion.display_name);
    setSuggestions([]);

    const { address } = suggestion;
    const line1 = `${address.house_number || ""} ${address.road || ""}`.trim();
    const line2 = address.neighbourhood || address.suburb || "";

    setValue("billingAddressLine1", line1 || "");
    setValue("billingAddressLine2", line2 || "");
    setValue("billingCity", address.city || "");
    setValue("billingStateOrCounty", address.state || "");
    setValue("billingPostCode", address.postcode || "");
    setValue("billingCountry", address.country_code?.toUpperCase() || "");
  };

  const mainFormSubmitHandler: SubmitHandler<DonationFormInputData> = async (
    data: DonationFormInputData
  ): Promise<void> => {
    if (!data.gdprConsent) {
      setErrorMessage("Please consent to data processing for GDPR compliance.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const normalizedAmount = Number(Number(data.amount).toFixed(2)); // Normalize to 2 decimals
      const donationPayload: DonationRequestDto = {
        amount: normalizedAmount, // Send in pounds, not pence
        currency: data.currency || "gbp",
        method: data.paymentMethodSelection,
        donorFirstName: data.donorFirstName || null,
        donorLastName: data.donorLastName || null,
        donorEmail: data.donorEmail || null,
        billingAddressLine1: data.billingAddressLine1 || null,
        billingAddressLine2: data.billingAddressLine2 || null,
        billingCity: data.billingCity || null,
        billingStateOrCounty: data.billingStateOrCounty || null,
        billingPostCode: data.billingPostCode || null,
        billingCountry: data.billingCountry || null,
        isRecurring: data.isRecurring,
        subscriptionId: null,
      };

      if (data.paymentMethodSelection === PaymentMethod.Stripe) {
        console.log("Stripe selected, handled by StripePaymentSection.");
        return;
      }

      const result = await DonationService.processDonation(donationPayload);
      setSuccessMessage(
        `Thank you! Your donation of £${result.amount.toFixed(2)} via ${result.method} was successful.`
      );
      setDonationDetails({
        donationId: result.donationId,
        amount: result.amount, // Already in pounds
        method: result.method,
        date: new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }),
      });
      if (onDonationSuccess) onDonationSuccess(result.donationId, result.method);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while processing your donation."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripeFlowSuccess = (
    message: string,
    donationId: string
  ): void => {
    setSuccessMessage(message);
    setDonationDetails({
      donationId,
      amount: formValues.amount, // Already in pounds
      method: PaymentMethod.Stripe,
      date: new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }),
    });
    if (onDonationSuccess) onDonationSuccess(donationId, PaymentMethod.Stripe);
  };

  const initiateDonationPayloadForStripe: InitiateStripeDonationApiPayload = {
    amount: Number(Number(formValues.amount).toFixed(2)), // Normalize to 2 decimals, send in pounds
    currency: formValues.currency || "gbp",
    donorFirstName: formValues.donorFirstName || undefined,
    donorLastName: formValues.donorLastName || undefined,
    donorEmail: formValues.donorEmail || undefined,
    billingAddressLine1: formValues.billingAddressLine1 || undefined,
    billingAddressLine2: formValues.billingAddressLine2 || undefined,
    billingCity: formValues.billingCity || undefined,
    billingStateOrCounty: formValues.billingStateOrCounty || undefined,
    billingPostCode: formValues.billingPostCode || undefined,
    billingCountry: formValues.billingCountry || undefined,
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} title="">
      <div className="relative max-w-md mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-6 transition-all duration-300 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onRequestClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full"
          aria-label="Close donation modal"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="w-full mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent text-center">
            Support Our Cause
          </h2>
        </div>

        {successMessage && !donationDetails && (
          <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-xl flex flex-col items-center animate-fade-in">
            <div className="flex items-center w-[85%]">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm sm:text-base">{successMessage}</span>
            </div>
            <div className="mt-3 w-[85%]">
              <Button
                onClick={handleResetAndClose}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-2 rounded-lg shadow-md hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 text-sm sm:text-base"
              >
                Close
              </Button>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-xl flex items-center animate-fade-in w-[85%] mx-auto">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm sm:text-base">{errorMessage}</span>
          </div>
        )}
        {isProcessing && !successMessage && !errorMessage && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-xl flex items-center animate-fade-in w-[85%] mx-auto">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin"
              fill="none"
              
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 12a8 8 0 0116 0 8 8 0 01-16 0"
              />
            </svg>
            <span className="text-sm sm:text-base">Processing your donation...</span>
          </div>
        )}

        {donationDetails && (
          <div className="mb-4 p-4 bg-gray-50 text-gray-800 rounded-xl animate-fade-in w-[85%] mx-auto">
            <h3 className="text-xl font-semibold mb-3 text-center">
              Thank You for Your Generous Donation!
            </h3>
            <div className="space-y-2 text-base">
              <p><strong>Donation ID:</strong> {donationDetails.donationId}</p>
              <p><strong>Amount:</strong> £{donationDetails.amount.toFixed(2)}</p>
              <p><strong>Method:</strong> {donationDetails.method}</p>
              <p><strong>Date:</strong> {donationDetails.date}</p>
              <p><strong>Donor:</strong> {`${formValues.donorFirstName} ${formValues.donorLastName}`}</p>
              <p><strong>Email:</strong> {formValues.donorEmail}</p>
              <p className="text-sm italic">
                A confirmation email will be sent to {formValues.donorEmail} if you consented to data processing.
              </p>
            </div>
            <div className="mt-3">
              <Button
                onClick={handleResetAndClose}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-2 rounded-lg shadow-md hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 text-base"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {!successMessage && !donationDetails && (
          <form
            onSubmit={handleSubmit(mainFormSubmitHandler)}
            className="space-y-4 w-[85%] mx-auto"
          >
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Select Donation Amount (£)
              </label>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {[500, 1000, 2500, 5000].map((amount) => {
                  const displayAmount = amount / 100;
                  const isWholeNumber = displayAmount % 1 === 0;
                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleAmountSelection(amount)}
                      className={`py-2 sm:py-3 px-4 sm:px-6 rounded-lg border border-gray-200 text-gray-700 font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${
                        formValues.amount === amount / 100 && !showCustomAmount
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "bg-white hover:bg-gray-50"
                      } focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base`}
                    >
                      £{isWholeNumber ? displayAmount : displayAmount.toFixed(2)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={toggleCustomAmount}
                className={`w-full py-1 sm:py-2 px-3 sm:px-4 rounded-lg border border-gray-200 text-gray-700 font-medium transition-all duration-200 shadow-sm hover:shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  showCustomAmount
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                    : "bg-white"
                } mb-2 text-xs sm:text-sm`}
              >
                Custom Amount
              </button>
              {showCustomAmount && (
                <Input
                  label=""
                  id="amount"
                  type="number"
                  {...register("amount", {
                    required: "Amount is required",
                    valueAsNumber: true,
                    min: { value: 1.0, message: "Minimum donation is £1.00" },
                    max: {
                      value: 10000.0,
                      message: "Maximum donation is £10,000.00",
                    },
                    validate: {
                      positive: (value) =>
                        value > 0 || "Amount must be greater than 0",
                      twoDecimals: (value) =>
                        /^\d+(\.\d{1,2})?$/.test(value.toString()) ||
                        "Amount must have no more than 2 decimal places",
                    },
                  })}
                  step="0.01"
                  placeholder="Enter your amount (e.g., 15.00)"
                  error={errors.amount?.message}
                  className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
                />
              )}
            </div>

            <input type="hidden" {...register("currency", { value: "gbp" })} />

            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
              <Input
                label="First Name"
                id="donorFirstName"
                {...register("donorFirstName", {
                  required: "First name is required",
                  maxLength: {
                    value: 100,
                    message: "First name cannot exceed 100 characters",
                  },
                  pattern: {
                    value: /^[A-Za-z]+(?: [A-Za-z]+)*$/,
                    message:
                      "First name must contain only letters and single spaces",
                  },
                })}
                error={errors.donorFirstName?.message}
                className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
              />
              <Input
                label="Last Name"
                id="donorLastName"
                {...register("donorLastName", {
                  required: "Last name is required",
                  maxLength: {
                    value: 100,
                    message: "Last name cannot exceed 100 characters",
                  },
                  pattern: {
                    value: /^[A-Za-z]+(?: [A-Za-z]+)*$/,
                    message:
                      "Last name must contain only letters and single spaces",
                  },
                })}
                error={errors.donorLastName?.message}
                className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
              />
            </div>
            <div>
              <Input
                label="Email Address"
                id="donorEmail"
                type="email"
                {...register("donorEmail", {
                  required: "Email is required",
                  maxLength: {
                    value: 256,
                    message: "Email cannot exceed 256 characters",
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message:
                      "Please enter a valid email address (e.g., example@domain.com)",
                  },
                })}
                error={errors.donorEmail?.message}
                className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="paymentMethodSelection"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2"
              >
                Payment Method
              </label>
              <select
                id="paymentMethodSelection"
                {...register("paymentMethodSelection")}
                className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-700 text-xs sm:text-sm"
                aria-label="Select payment method"
              >
                <option value={PaymentMethod.Worldpay}>Worldpay</option>
                <option value={PaymentMethod.PayPal}>PayPal</option>
                <option value={PaymentMethod.Stripe}>Credit/Debit Card (Stripe)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-xs sm:text-sm text-gray-700">
                <input
                  type="checkbox"
                  {...register("useManualAddress")}
                  className="mr-2 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  aria-label="Use manual address entry"
                />
                Enter Address Manually (otherwise auto-find will be used)
              </label>
            </div>

            {!useManualAddress && (
              <div>
                <label
                  htmlFor="address"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2"
                >
                  Find Your Address
                </label>
                <input
                  id="address"
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Start typing your address..."
                  className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
                />
                {isLoadingSuggestions && <div className="text-xs sm:text-sm mt-1">Loading...</div>}
                {suggestions.length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-lg shadow-sm">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.place_id}
                        onClick={() => handleAddressSelect(suggestion)}
                        className="px-3 py-2 bg-white border-b border-gray-200 hover:bg-gray-50 cursor-pointer text-xs sm:text-sm"
                      >
                        {suggestion.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {useManualAddress && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                  <Input
                    label="Address Line 1"
                    id="billingAddressLine1"
                    {...register("billingAddressLine1", {
                      maxLength: {
                        value: 200,
                        message: "Address line 1 cannot exceed 200 characters",
                      },
                    })}
                    error={errors.billingAddressLine1?.message}
                    className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
                  />
                  <Input
                    label="Address Line 2"
                    id="billingAddressLine2"
                    {...register("billingAddressLine2", {
                      maxLength: {
                        value: 200,
                        message: "Address line 2 cannot exceed 200 characters",
                      },
                    })}
                    error={errors.billingAddressLine2?.message}
                    className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                  <Input
                    label="City"
                    id="billingCity"
                    {...register("billingCity", {
                      maxLength: {
                        value: 100,
                        message: "City cannot exceed 100 characters",
                      },
                    })}
                    error={errors.billingCity?.message}
                    className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
                  />
                  <Input
                    label="State/County"
                    id="billingStateOrCounty"
                    {...register("billingStateOrCounty", {
                      maxLength: {
                        value: 100,
                        message: "State/County cannot exceed 100 characters",
                      },
                    })}
                    error={errors.billingStateOrCounty?.message}
                    className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                  <Input
                    label="Post Code"
                    id="billingPostCode"
                    {...register("billingPostCode", {
                      maxLength: {
                        value: 20,
                        message: "Post code cannot exceed 20 characters",
                      },
                    })}
                    error={errors.billingPostCode?.message}
                    className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
                  />
                  <Input
                    label="Country (2-letter ISO)"
                    id="billingCountry"
                    {...register("billingCountry", {
                      maxLength: {
                        value: 2,
                        message: "Country must be a 2-letter ISO code (e.g., GB)",
                      },
                      pattern: {
                        value: /^[A-Z]{2}$/,
                        message: "Country must be a valid 2-letter ISO code (e.g., GB)",
                      },
                    })}
                    error={errors.billingCountry?.message}
                    className="w-full px-3 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-xs sm:text-sm"
                  />
                </div>
              </>
            )}

            <div>
              <label className="flex items-center text-xs sm:text-sm text-gray-700">
                <input
                  type="checkbox"
                  {...register("isRecurring")}
                  className="mr-2 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  aria-label="Make this a recurring donation"
                />
                Make this a recurring donation
              </label>
            </div>

            <div>
              <label className="flex items-center text-xs sm:text-sm text-gray-700">
                <input
                  type="checkbox"
                  {...register("gdprConsent", {
                    required: "You must consent to data processing.",
                  })}
                  className="mr-2 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  aria-label="Consent to data processing for GDPR compliance"
                />
                I consent to the processing of my personal data in accordance
                with the{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </label>
              {errors.gdprConsent && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.gdprConsent.message}
                </p>
              )}
            </div>

            {selectedPaymentMethod === PaymentMethod.Stripe && (
              <Elements stripe={stripePromise}>
                <StripePaymentSection
                  initiateDonationPayload={initiateDonationPayloadForStripe}
                  onPaymentSuccess={handleStripeFlowSuccess}
                  onPaymentError={setErrorMessage}
                  setIsProcessing={setIsProcessing}
                  gdprConsent={gdprConsent}
                />
              </Elements>
            )}

            {selectedPaymentMethod !== PaymentMethod.Stripe && (
              <Button
                type="submit"
                className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-2 rounded-lg shadow-md hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                disabled={isProcessing || !gdprConsent}
              >
                {isProcessing ? "Processing..." : `Donate via ${selectedPaymentMethod}`}
              </Button>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
};

export default DonationModal;