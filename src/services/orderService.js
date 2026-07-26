import { apiFetch } from "./api";

export const createOrder = (payload) => apiFetch("/api/orders", { method: "POST", body: JSON.stringify(payload) });
export const createRazorpayPayment = (payload) => apiFetch("/api/payments/razorpay/order", { method: "POST", body: JSON.stringify(payload) });
export const verifyRazorpayPayment = (payload) => apiFetch("/api/payments/razorpay/verify", { method: "POST", body: JSON.stringify(payload) });
export const getOrders = () => apiFetch("/api/orders");
export const cancelOrder = (id) => apiFetch(`/api/orders/${id}/cancel`, { method: "POST", body: "{}" });
export const requestReturn = (id, reason) => apiFetch(`/api/orders/${id}/return`, { method: "POST", body: JSON.stringify({ reason }) });
export const invoiceUrl = (id) => `/api/orders/${id}/invoice`;

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.head.appendChild(script);
  });
}
