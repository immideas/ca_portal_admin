import { Injectable } from '@angular/core';

declare global {
  interface Window {
    Razorpay: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {

  private razorpayLoadPromise: Promise<boolean> | null = null;

  loadRazorpay(): Promise<boolean> {

    // Already loaded
    if (window.Razorpay) {
      return Promise.resolve(true);
    }

    // Already loading
    if (this.razorpayLoadPromise) {
      return this.razorpayLoadPromise;
    }

    this.razorpayLoadPromise = new Promise<boolean>((resolve, reject) => {

      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

      if (existingScript) {

        existingScript.addEventListener('load', () => {
          resolve(!!window.Razorpay);
        });

        existingScript.addEventListener('error', () => {
          this.razorpayLoadPromise = null;
          reject(false);
        });

        return;
      }

      const script = document.createElement('script');

      script.src =
        'https://checkout.razorpay.com/v1/checkout.js';

      script.async = true;

      script.onload = () => {
        console.log('Razorpay SDK loaded');
        resolve(!!window.Razorpay);
      };

      script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        this.razorpayLoadPromise = null;
        reject(false);
      };

      document.body.appendChild(script);
    });

    return this.razorpayLoadPromise;
  }

  async openPaymentModal(options: any): Promise<any> {

    const loaded = await this.loadRazorpay();

    if (!loaded || !window.Razorpay) {
      throw new Error('Razorpay SDK could not be loaded');
    }

    return new Promise((resolve, reject) => {

      const originalHandler = options.handler;

      const razorpayOptions = {
        ...options,

        handler: (response: any) => {

          // Existing component handler
          if (originalHandler) {
            originalHandler(response);
          }

          // Resolve promise as well
          resolve(response);
        },

        modal: {
          ...(options.modal || {}),

          ondismiss: () => {
            reject('Payment cancelled');
          }
        }
      };

      const rzp = new window.Razorpay(razorpayOptions);

      rzp.open();
    });
  }
}