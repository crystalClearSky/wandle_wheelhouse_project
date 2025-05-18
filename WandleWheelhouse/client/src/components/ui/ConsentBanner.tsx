import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from './Button'; // Your existing Button component

const CONSENT_STORAGE_KEY = 'user_consent_given_timestamp';
const ANALYTICS_CONSENT_KEY = 'user_analytics_consent';

const ConsentBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consentTimestamp = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (!consentTimestamp) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = (allowAnalytics: boolean) => {
        localStorage.setItem(CONSENT_STORAGE_KEY, new Date().toISOString());
        localStorage.setItem(ANALYTICS_CONSENT_KEY, allowAnalytics.toString());
        setIsVisible(false);

        if (allowAnalytics) {
            console.log("Analytics consent given (placeholder - no analytics yet).");
        } else {
            console.log("Analytics consent NOT given / Essential only.");
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <>
            {/* Transparent Overlay */}
            <div 
                className="fixed inset-0 bg-[rgba(0,0,0,0.5)] z-40"
                aria-hidden="true"
            />
            {/* Consent Banner */}
            <div 
                className="fixed bottom-0 left-0 right-0 z-50 p-4"
                role="dialog"
                aria-live="polite"
                aria-label="Cookie Consent"
                aria-describedby="cookie-consent-description"
            >
                <div 
                    className="bg-gray-900 text-white rounded-lg shadow-2xl p-6 max-w-4xl w-full mx-auto animate-slide-up border border-gray-700"
                >
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <p 
                            id="cookie-consent-description" 
                            className="text-sm leading-relaxed mb-4 md:mb-0 md:mr-4"
                        >
                            We use essential browser storage to ensure a smooth experience, like keeping you logged in. 
                            Optionally, anonymous analytics help us enhance your visit. 
                            Learn more in our{' '}
                            <Link 
                                to="/privacy" 
                                className="underline text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
                            >
                                Privacy Policy
                            </Link>.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <Button
                                variant="secondary"
                                onClick={() => handleAccept(false)}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors duration-200 w-full sm:w-auto"
                                aria-label="Accept essential cookies only"
                            >
                                Essential Only
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => handleAccept(true)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md transition-colors duration-200 w-full sm:w-auto"
                                aria-label="Accept all cookies and data usage"
                            >
                                Accept All
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConsentBanner;