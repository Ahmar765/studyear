
'use client';
import { useState, useEffect, useCallback } from 'react';

type ConsentCategories = {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
};

type CookieConsentState = {
  consentGiven: boolean;
  preferences: ConsentCategories;
  timestamp: number | null;
};

const COOKIE_CONSENT_KEY = 'studyear_cookie_consent';
const COOKIE_DURATION_DAYS = 30;

export function useCookieConsent() {
  const [state, setState] = useState<CookieConsentState | null>(null);

  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (storedConsent) {
        const parsed: CookieConsentState = JSON.parse(storedConsent);
        const isExpired = parsed.timestamp 
          ? (Date.now() - parsed.timestamp) > COOKIE_DURATION_DAYS * 24 * 60 * 60 * 1000
          : true;

        if (!isExpired) {
          setState(parsed);
          return;
        }
      }
    } catch (error) {
      console.error("Could not parse cookie consent from localStorage", error);
    }
    // If no valid consent is found, initialize with default state (prompt will be shown)
    setState(null); 
  }, []);

  const saveConsent = useCallback((preferences: ConsentCategories) => {
    const newState: CookieConsentState = {
      consentGiven: true,
      preferences,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newState));
      setState(newState);
    } catch (error) {
      console.error("Could not save cookie consent to localStorage", error);
    }
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: true, functional: true });
  }, [saveConsent]);

  const rejectAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: false, functional: false });
  }, [saveConsent]);

  return { consent: state, acceptAll, rejectAll, saveConsent };
}
