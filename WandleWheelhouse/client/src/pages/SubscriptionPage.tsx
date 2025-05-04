// src/pages/SubscriptionPage.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import SubscriptionService from '../services/SubscriptionService';
import { SubscriptionResponseDto } from '../dto/Subscriptions/SubscriptionResponseDto';
import { SubscriptionStatus } from '../dto/Subscriptions/SubscriptionStatusEnum';
import { PaymentMethod } from '../dto/Donations/PaymentMethodEnum'; // Shared enum
import { SubscriptionRequestDto } from '../dto/Subscriptions/SubscriptionRequestDto';
import Button from '../components/ui/Button';
// Link import was removed previously as it wasn't used for the button

const SubscriptionPage: React.FC = () => {
  // --- State Variables ---
  const [subscriptions, setSubscriptions] = useState<SubscriptionResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState<Record<string, boolean>>({});
  const [cancelError, setCancelError] = useState<Record<string, string | null>>({});
  const [createAmount, setCreateAmount] = useState<number>(5); // Default amount
  const [createMethod, setCreateMethod] = useState<PaymentMethod>(PaymentMethod.Worldpay);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const subscriptionAmounts = [5, 10, 15, 20, 25, 50, 75, 100]; // Allowed amounts

  // --- Data Fetching ---
  const fetchSubscriptions = async () => {
    setIsLoading(true); // Set loading true at the start
    setError(null);
    setCreateError(null); // Clear create messages too
    setCreateSuccess(null);
    try {
      const data = await SubscriptionService.getMySubscriptions();
      setSubscriptions(data);
    } catch (err: unknown) {
      let message = 'Failed to load subscription details.';
      if (err instanceof Error) { message = err.message; }
      setError(message);
    } finally {
      setIsLoading(false); // Set loading false at the end
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []); // Fetch on initial mount

  // --- Event Handlers ---
  const handleCancel = async (subscriptionId: string) => {
    if (!window.confirm('Are you sure you want to cancel this subscription? It will remain active until the end of the current period.')) {
      return;
    }
    setCancelLoading(prev => ({ ...prev, [subscriptionId]: true }));
    setCancelError(prev => ({ ...prev, [subscriptionId]: null }));
    try {
      await SubscriptionService.cancelSubscription(subscriptionId);
      await fetchSubscriptions(); // Refetch list to show updated status
    } catch (err: unknown) {
      let message = 'Failed to cancel subscription.';
      if (err instanceof Error) { message = err.message; }
      setCancelError(prev => ({ ...prev, [subscriptionId]: message }));
    } finally {
      setCancelLoading(prev => ({ ...prev, [subscriptionId]: false }));
    }
  };

  const handleCreateSubscription = async (event: FormEvent) => {
      event.preventDefault();
      setIsCreating(true);
      setCreateError(null);
      setCreateSuccess(null);

      const creationData: SubscriptionRequestDto = {
          monthlyAmount: createAmount,
          method: createMethod
      };

      try {
          const newSubscription = await SubscriptionService.createSubscription(creationData);
          setCreateSuccess(`Subscription started successfully! (£${newSubscription.monthlyAmount.toFixed(2)}/month)`);
          setCreateAmount(5); // Reset form defaults
          setCreateMethod(PaymentMethod.Worldpay);
          await fetchSubscriptions(); // Refresh the list of subscriptions
      } catch (err: unknown) {
          let message = 'Failed to start subscription.';
          if (err instanceof Error) { message = err.message; }
          setCreateError(message);
      } finally {
          setIsCreating(false);
      }
  }

  // --- Helpers ---
  const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      try {
          return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
      } catch { return 'Invalid Date'; }
  }

  const getStatusText = (status: SubscriptionStatus, cancelDate: string | null | undefined): React.ReactNode => {
      switch (status) {
          case SubscriptionStatus.Active: return <span className="text-green-600 font-semibold">Active</span>;
          case SubscriptionStatus.Cancelled: return <span className="text-red-600 font-semibold">Cancelled</span>;
          case SubscriptionStatus.CancellationPending: return <span className="text-yellow-600 font-semibold">Active until {formatDate(cancelDate)}</span>;
          case SubscriptionStatus.PaymentFailed: return <span className="text-red-600 font-semibold">Payment Failed</span>;
          case SubscriptionStatus.Paused: return <span className="text-gray-600 font-semibold">Paused</span>; // If using Paused
          default: return <span className="text-gray-500">Unknown</span>;
      }
  }

  // Determine if user can create a new subscription
  const canCreateSubscription = !subscriptions.some(s =>
      s.status === SubscriptionStatus.Active || s.status === SubscriptionStatus.CancellationPending
  );

  // --- Render Logic ---
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Your Subscriptions</h1>

      {/* Loading Indicator */}
      {isLoading && <p className="text-center text-gray-500">Loading subscriptions...</p>}

      {/* Error Display */}
      {error && <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-200">{error}</p>}

      {/* Display Existing Subscriptions (if not loading and no error) */}
      {!isLoading && !error && subscriptions.length > 0 && (
        <div className="space-y-4 mb-8">
          {subscriptions.map(sub => (
            <div key={sub.subscriptionId} className="bg-white p-4 rounded-lg shadow border flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              {/* Subscription Details */}
              <div>
                 <p className="font-semibold text-lg text-gray-900">£{sub.monthlyAmount.toFixed(2)} / month</p>
                 <p className="text-sm text-gray-600">
                    Method: <span className="font-medium">{PaymentMethod[sub.method]}</span> | Started: <span className="font-medium">{formatDate(sub.startDate)}</span>
                 </p>
                 <p className="text-sm text-gray-600">
                    Status: {getStatusText(sub.status, sub.cancellationDate)}
                    {sub.status === SubscriptionStatus.Active && sub.nextPaymentDate && (
                        <span> | Next Payment: <span className="font-medium">{formatDate(sub.nextPaymentDate)}</span></span>
                    )}
                 </p>
                 {/* Display cancellation errors specific to this sub */}
                 {cancelError[sub.subscriptionId] && (
                     <p className="text-xs text-red-500 mt-1">{cancelError[sub.subscriptionId]}</p>
                 )}
              </div>
              {/* Action Button Area */}
              <div className="mt-3 md:mt-0 flex-shrink-0">
                 {/* Show Cancel button only if Active */}
                 {sub.status === SubscriptionStatus.Active && (
                    <Button
                        variant="danger"
                        className="text-xs py-1 px-2" // Adjusted style
                        onClick={() => handleCancel(sub.subscriptionId)}
                        disabled={cancelLoading[sub.subscriptionId]}
                    >
                        {cancelLoading[sub.subscriptionId] ? 'Cancelling...' : 'Cancel Subscription'}
                    </Button>
                 )}
                 {/* Placeholder for potential 'Reactivate' button if needed */}
              </div>
            </div>
          ))}
        </div>
      )}

       {/* Subscription Creation Section */}
       {!isLoading && !error && canCreateSubscription && (
           <div className="mt-8 p-6 bg-white rounded-lg shadow border">
               <h2 className="text-2xl font-semibold mb-4 text-gray-800">Start a New Monthly Subscription</h2>
               <p className="text-sm text-gray-600 mb-4">Support our work with a regular donation. Choose an amount and payment method below.</p>

                {/* Creation Feedback Messages */}
                {createError && <div className="text-red-600 bg-red-100 p-3 rounded mb-4 border border-red-200">{createError}</div>}
                {createSuccess && <div className="text-green-700 bg-green-100 p-3 rounded mb-4 border border-green-200">{createSuccess}</div>}

               <form onSubmit={handleCreateSubscription}>
                    {/* Amount Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Amount (£)</label>
                        <div className="flex flex-wrap gap-2">
                            {subscriptionAmounts.map(amountOpt => (
                                <Button
                                    key={amountOpt}
                                    type="button"
                                    // Highlight selected button
                                    variant={createAmount === amountOpt ? 'primary' : 'secondary'}
                                    className={`py-2 px-4 ${createAmount === amountOpt ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                                    onClick={() => setCreateAmount(amountOpt)}
                                    disabled={isCreating}
                                >
                                    {amountOpt}
                                </Button>
                            ))}
                        </div>
                    </div>

                     {/* Payment Method Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="createPaymentMethod" className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                    value={PaymentMethod.Worldpay}
                                    checked={createMethod === PaymentMethod.Worldpay}
                                    onChange={() => setCreateMethod(PaymentMethod.Worldpay)}
                                    disabled={isCreating}
                                />
                                <span className="ml-2 text-sm text-gray-700">Worldpay</span>
                            </label>
                             <label className="flex items-center cursor-pointer">
                                <input type="radio" name="createPaymentMethod" className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                    value={PaymentMethod.PayPal}
                                    checked={createMethod === PaymentMethod.PayPal}
                                    onChange={() => setCreateMethod(PaymentMethod.PayPal)}
                                    disabled={isCreating}
                                />
                                <span className="ml-2 text-sm text-gray-700">PayPal</span>
                            </label>
                        </div>
                    </div>

                     {/* Submit Button */}
                    <Button type="submit" variant="primary" disabled={isCreating} className="w-full sm:w-auto">
                       {isCreating ? 'Processing...' : `Start £${createAmount}/month Subscription`}
                    </Button>
               </form>
           </div>
       )}

       {/* Message if user cannot create (already has active/pending sub) */}
       {!isLoading && !error && !canCreateSubscription && subscriptions.length > 0 && (
            <div className="mt-8 p-4 bg-blue-50 text-blue-700 rounded border border-blue-200 text-sm text-center">
               You currently have an active or pending subscription. You can manage it above.
            </div>
       )}

       {/* Message if user has no subscriptions and form isn't shown (only on error/loading) */}
        {!isLoading && !error && subscriptions.length === 0 && !canCreateSubscription && (
             <p className="text-center text-gray-600 mt-6">You currently have no subscriptions.</p>
         )}


    </div>
  );
};

export default SubscriptionPage;