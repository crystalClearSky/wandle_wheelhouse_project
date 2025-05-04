import React, { useState, FormEvent, useMemo } from 'react';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import DonationService from '../services/DonationService';
import { useAuth } from '../contexts/AuthContext';
import { PaymentMethod } from '../dto/Donations/PaymentMethodEnum';
import { DonationRequestDto } from '../dto/Donations/DonationRequestDto';

interface DonationModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onRequestClose }) => {
  const { isAuthenticated } = useAuth(); // Check if user is logged in

  const [amount, setAmount] = useState<number | string>(10); // Default amount, use string if input type="text" needed
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
    // Clear custom amount if a preset is selected
    if (donationAmounts.includes(Number(value))) {
         setCustomAmount('');
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const finalAmount = showCustomAmountInput ? Number(customAmount) : Number(amount);

    // Basic Validation
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
      // Only include anonymous details if user is not logged in
      donorFirstName: !isAuthenticated ? anonFirstName || null : null,
      donorLastName: !isAuthenticated ? anonLastName || null : null,
      donorEmail: !isAuthenticated ? anonEmail || null : null,
    };

    try {
      const response = await DonationService.processDonation(donationData);
      // Check backend status (e.g., PaymentStatus.Success)
       if(response.status === 1) { // Assuming 1 is PaymentStatus.Success
            setSuccessMessage(`Thank you! Your donation of £${response.amount.toFixed(2)} was processed successfully.`);
       } else {
            setSuccessMessage(`Donation recorded, but payment status is: ${PaymentStatus[response.status] ?? 'Unknown'}.`);
       }

      // Reset form after delay
      setTimeout(() => {
          handleClose(); // Use handleClose to reset and close
      }, 2500); // Show message longer

    } catch (err: unknown) {
      let message = 'An unexpected error occurred.';
       if (err instanceof Error) { message = err.message; }
      setError(message);
      setIsLoading(false); // Ensure loading is stopped on error
    }
    // Do not set isLoading to false here if success message is shown before closing
  };

  const handleClose = () => {
      // Reset state fully on close
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
  }

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} title="Make a Donation">
      <form onSubmit={handleSubmit}>
        {error && <div className="text-red-600 bg-red-100 p-3 rounded mb-4">{error}</div>}
        {successMessage && <div className="text-green-700 bg-green-100 p-3 rounded mb-4">{successMessage}</div>}

        {/* Amount Selection */}
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Amount (£)</label>
            <div className="flex flex-wrap gap-2">
                {donationAmounts.map(presetAmount => (
                    <Button
                        key={presetAmount}
                        type="button"
                        variant={amount === presetAmount ? 'primary' : 'secondary'}
                        className={`py-2 px-4 ${amount === presetAmount ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
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
                     className={`py-2 px-4 ${showCustomAmountInput ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                    onClick={() => handleAmountChange('custom')} // Use a non-numeric value
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
                    className="mt-2"
                    required
                    disabled={isLoading}
                />
            )}
        </div>

        {/* Payment Method */}
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="flex items-center space-x-4">
                <label className="flex items-center">
                    <input type="radio" name="paymentMethod" className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                        value={PaymentMethod.Worldpay}
                        checked={selectedMethod === PaymentMethod.Worldpay}
                        onChange={() => setSelectedMethod(PaymentMethod.Worldpay)}
                        disabled={isLoading}
                    />
                    <span className="ml-2 text-sm text-gray-700">Worldpay</span>
                </label>
                 <label className="flex items-center">
                    <input type="radio" name="paymentMethod" className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                        value={PaymentMethod.PayPal}
                        checked={selectedMethod === PaymentMethod.PayPal}
                        onChange={() => setSelectedMethod(PaymentMethod.PayPal)}
                        disabled={isLoading}
                    />
                    <span className="ml-2 text-sm text-gray-700">PayPal</span>
                </label>
            </div>
        </div>

        {/* Anonymous Donor Fields (Only show if NOT logged in) */}
        {!isAuthenticated && (
            <>
                <hr className="my-4"/>
                <p className="text-sm text-gray-600 mb-3">Please provide your details (required for anonymous donation):</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <Input label="First Name" id="anon-firstName" value={anonFirstName} onChange={(e)=> setAnonFirstName(e.target.value)} disabled={isLoading} />
                    <Input label="Last Name" id="anon-lastName" value={anonLastName} onChange={(e)=> setAnonLastName(e.target.value)} disabled={isLoading} />
                </div>
                <Input label="Email Address" id="anon-email" type="email" value={anonEmail} onChange={(e)=> setAnonEmail(e.target.value)} required disabled={isLoading} />
            </>
        )}

        {/* Submit Button */}
        <div className="mt-6">
          <Button type="submit" variant="primary" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 focus:ring-green-500">
            {isLoading ? 'Processing...' : `Donate £${showCustomAmountInput ? Number(customAmount).toFixed(2) : Number(amount).toFixed(2)}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Need PaymentStatus enum available here if checking response status text
import { PaymentStatus } from '../dto/Donations/PaymentStatusEnum';


export default DonationModal;