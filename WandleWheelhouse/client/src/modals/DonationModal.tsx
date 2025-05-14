import React, { useState, FormEvent, useMemo } from 'react';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import DonationService from '../services/DonationService';
import { useAuth } from '../contexts/AuthContext';
import { PaymentMethod } from '../dto/Donations/PaymentMethodEnum';
import { DonationRequestDto } from '../dto/Donations/DonationRequestDto';
import { PaymentStatus } from '../dto/Donations/PaymentStatusEnum';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface DonationModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onRequestClose }) => {
  const { isAuthenticated } = useAuth();

  const [amount, setAmount] = useState<number | string>(10);
  const [customAmount, setCustomAmount] = useState<number | string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PaymentMethod.Worldpay);
  const [anonFirstName, setAnonFirstName] = useState('');
  const [anonLastName, setAnonLastName] = useState('');
  const [anonEmail, setAnonEmail] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const donationAmounts = [5, 10, 25, 50, 100];
  const showCustomAmountInput = useMemo(() => !donationAmounts.includes(Number(amount)), [amount]);

  const handleAmountChange = (value: number | string) => {
    setAmount(value);
    if (donationAmounts.includes(Number(value))) {
      setCustomAmount('');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const finalAmount = showCustomAmountInput ? Number(customAmount) : Number(amount);

    if (isNaN(finalAmount) || finalAmount < 1) {
      setError("Please enter a valid donation amount (£1 or more).");
      setIsLoading(false);
      return;
    }
    if (!isAuthenticated && !anonEmail) {
      setError("Email is required for anonymous donations.");
      setIsLoading(false);
      return;
    }

    const donationData: DonationRequestDto = {
      amount: finalAmount,
      method: selectedMethod,
      donorFirstName: !isAuthenticated ? anonFirstName || null : null,
      donorLastName: !isAuthenticated ? anonLastName || null : null,
      donorEmail: !isAuthenticated ? anonEmail || null : null,
    };

    try {
      const response = await DonationService.processDonation(donationData);
      if (response.status === 1) { // Assuming 1 is PaymentStatus.Success
        setSuccessMessage(`Thank you! Your donation of £${response.amount.toFixed(2)} was processed successfully.`);
      } else {
        setSuccessMessage(`Donation recorded, but payment status is: ${PaymentStatus[response.status] ?? 'Unknown'}.`);
      }
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      let message = 'An unexpected error occurred.';
      if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount(10);
    setCustomAmount('');
    setSelectedMethod(PaymentMethod.Worldpay);
    setAnonFirstName('');
    setAnonLastName('');
    setAnonEmail('');
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    onRequestClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      title="Make a Donation"
      contentLabel="Donation Modal"
    >
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

        {/* Amount Selection */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">Select Donation Amount (£)</label>
          <div className="flex flex-wrap gap-2">
            {donationAmounts.map((presetAmount) => (
              <Button
                key={presetAmount}
                type="button"
                variant={amount === presetAmount ? 'primary' : 'secondary'}
                className={`py-3 px-4 rounded-lg transition-all duration-300 hover:scale-105 ${
                  amount === presetAmount ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
                onClick={() => handleAmountChange(presetAmount)}
                disabled={isLoading}
              >
                {presetAmount}
              </Button>
            ))}
            <Button
              key="custom"
              type="button"
              variant={showCustomAmountInput ? 'primary' : 'secondary'}
              className={`py-3 px-4 rounded-lg transition-all duration-300 hover:scale-105 ${
                showCustomAmountInput ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
              onClick={() => handleAmountChange('custom')}
              disabled={isLoading}
            >
              Other
            </Button>
          </div>
          {showCustomAmountInput && (
            <Input
              id="custom-amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="mt-4 w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
              required
              disabled={isLoading}
            />
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">Payment Method</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="paymentMethod"
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                value={PaymentMethod.Worldpay}
                checked={selectedMethod === PaymentMethod.Worldpay}
                onChange={() => setSelectedMethod(PaymentMethod.Worldpay)}
                disabled={isLoading}
              />
              <span className="ml-2 text-gray-700">Worldpay</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="paymentMethod"
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                value={PaymentMethod.PayPal}
                checked={selectedMethod === PaymentMethod.PayPal}
                onChange={() => setSelectedMethod(PaymentMethod.PayPal)}
                disabled={isLoading}
              />
              <span className="ml-2 text-gray-700">PayPal</span>
            </label>
          </div>
        </div>

        {/* Anonymous Donor Fields */}
        {!isAuthenticated && (
          <>
            <hr className="my-4" />
            <p className="text-sm text-gray-600 mb-3">Please provide your details (required for anonymous donation):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
              <Input
                label="First Name"
                id="anon-firstName"
                value={anonFirstName}
                onChange={(e) => setAnonFirstName(e.target.value)}
                className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
                disabled={isLoading}
              />
              <Input
                label="Last Name"
                id="anon-lastName"
                value={anonLastName}
                onChange={(e) => setAnonLastName(e.target.value)}
                className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
                disabled={isLoading}
              />
            </div>
            <Input
              label="Email Address"
              id="anon-email"
              type="email"
              value={anonEmail}
              onChange={(e) => setAnonEmail(e.target.value)}
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
              required
              disabled={isLoading}
            />
          </>
        )}

        {/* Submit and Cancel Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <Button
            type="button"
            onClick={handleClose}
            className="w-full py-3 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 hover:scale-105"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 hover:scale-105 flex items-center justify-center"
            disabled={isLoading}
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
                Processing...
              </>
            ) : (
              `Donate £${showCustomAmountInput ? Number(customAmount).toFixed(2) : Number(amount).toFixed(2)}`
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DonationModal;