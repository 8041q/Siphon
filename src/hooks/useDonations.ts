import { useCallback, useEffect, useMemo, useState } from 'react';

import { useIAP, type Purchase, type Product } from 'expo-iap';

import { DONATION_SKUS } from '../config/support';

type DonationState = 'idle' | 'loading' | 'purchasing' | 'success' | 'error';

interface UseDonationsValue {
  products: Record<string, Product>;
  loaded: boolean;
  loading: boolean;
  purchasing: boolean;
  lastResult: DonationState;
  lastDonation: Purchase | null;
  purchase: (sku: string) => Promise<void>;
  reset: () => void;
}

export function useDonations(): UseDonationsValue {
  const [purchasing, setPurchasing] = useState(false);
  const [lastResult, setLastResult] = useState<DonationState>('idle');
  const [lastDonation, setLastDonation] = useState<Purchase | null>(null);

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Google Play: consumable purchases must be acknowledged/consumed,
      // otherwise they are auto-refunded after 3 days.
      try {
        await finishTransaction({ purchase, isConsumable: true });
      } catch (error) {
        console.warn('Donation finalization failed:', error);
      }
      setLastDonation(purchase);
      setPurchasing(false);
      setLastResult('success');
    },
    onPurchaseError: (error) => {
      // User cancelling the billing sheet is not an error.
      if (error.code === 'user-cancelled') {
        setPurchasing(false);
        setLastResult('idle');
        return;
      }
      console.warn('Donation purchase failed:', error.message);
      setPurchasing(false);
      setLastResult('error');
    },
  });

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: DONATION_SKUS, type: 'in-app' }).catch((error) => {
      console.warn('Failed to load donation products:', error);
    });
  }, [connected, fetchProducts]);

  const purchase = useCallback(
    async (sku: string) => {
      setLastResult('idle');
      setPurchasing(true);
      try {
        await requestPurchase({
          request: {
            apple: { sku },
            google: { skus: [sku] },
          },
          type: 'in-app',
        });
      } catch (error) {
        // Synchronous rejection happens before the billing sheet is shown.
        console.warn('Donation request failed:', error);
        setPurchasing(false);
        setLastResult('error');
      }
    },
    [requestPurchase],
  );

  const reset = useCallback(() => {
    setLastResult('idle');
    setLastDonation(null);
    setPurchasing(false);
  }, []);

  const productMap = useMemo(() => {
    const map: Record<string, Product> = {};
    for (const product of products) {
      map[product.id] = product;
    }
    return map;
  }, [products]);

  return {
    products: productMap,
    loaded: connected && products.length > 0,
    loading: connected && products.length === 0,
    purchasing,
    lastResult,
    lastDonation,
    purchase,
    reset,
  };
}