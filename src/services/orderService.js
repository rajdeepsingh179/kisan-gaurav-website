import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

const localOrders = () => {
  try { return JSON.parse(window.localStorage.getItem("kg-orders") || "[]"); } catch { return []; }
};

export async function createOrder(payload) {
  if (functions) return (await httpsCallable(functions, "createCheckoutOrder")(payload)).data;
  const order = { ...payload, id: `KG${Date.now().toString().slice(-10)}`, status: "confirmed", createdAt: new Date().toISOString(), tracking: ["Order confirmed"] };
  window.localStorage.setItem("kg-orders", JSON.stringify([order, ...localOrders()]));
  return order;
}

export async function createRazorpayPayment(payload) {
  if (!functions) throw new Error("Firebase Functions and Razorpay environment values are required for online payment.");
  return (await httpsCallable(functions, "createRazorpayOrder")(payload)).data;
}

export async function verifyRazorpayPayment(payload) {
  if (!functions) throw new Error("Firebase Functions are required to verify payment.");
  return (await httpsCallable(functions, "verifyRazorpayPayment")(payload)).data;
}

export function getLocalOrders() { return localOrders(); }

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
