import React, { useState, FormEvent, useMemo } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import DonationService from '../services/DonationService';
import { useAuth } from '../contexts/AuthContext';
import { PaymentMethod } from '../dto/Donations/PaymentMethodEnum';
import { DonationRequestDto } from '../dto/Donations/DonationRequestDto';
import { PaymentStatus } from '../dto/Donations/PaymentStatusEnum';

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
      }, 2500);
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl p-8 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Make a Donation</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Amount Selection */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">Select Donation Amount (£)</label>
            <div className="flex flex-wrap gap-2">
              {donationAmounts.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  type="button"
                  variant={amount === presetAmount ? 'primary' : 'secondary'}
                  className={`py-2 px-4 rounded-lg transition-all duration-300 ${
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
                className={`py-2 px-4 rounded-lg transition-all duration-300 ${
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
                className="mt-2 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
                disabled={isLoading}
              />
            )}
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">Payment Method</label>
            <div className="flex items-center space-x-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <Input
                  label="First Name"
                  id="anon-firstName"
                  value={anonFirstName}
                  onChange={(e) => setAnonFirstName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  disabled={isLoading}
                />
                <Input
                  label="Last Name"
                  id="anon-lastName"
                  value={anonLastName}
                  onChange={(e) => setAnonLastName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  disabled={isLoading}
                />
              </div>
              <Input
                label="Email Address"
                id="anon-email"
                type="email"
                value={anonEmail}
                onChange={(e) => setAnonEmail(e.target.value)}
                className="mt-4 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
                disabled={isLoading}
              />
            </>
          )}

          {/* Submit and Cancel Buttons */}
          <div className="flex justify-end space-x-4 mt-6">
            <Button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : `Donate £${showCustomAmountInput ? Number(customAmount).toFixed(2) : Number(amount).toFixed(2)}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonationModal;