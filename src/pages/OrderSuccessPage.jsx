import { CheckCircle, Package } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function OrderSuccessPage() {
  const { orderId } = useParams();
  useDocumentTitle("Order Confirmed");
  return <div className="order-success"><CheckCircle size={48} /><p className="eyebrow">Thank you</p><h1>Your order is confirmed.</h1><p>Order <strong>#{orderId}</strong> has been received. We’ll share tracking updates as it moves.</p><div><Link className="checkout-button" to="/account?tab=orders"><Package size={16} /> Track order</Link><Link className="text-link" to="/shop">Continue shopping</Link></div></div>;
}
