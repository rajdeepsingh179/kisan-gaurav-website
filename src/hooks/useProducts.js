import { useContext } from "react";

import { ProductContext } from "../contexts/productContext";

export default function useProducts() {
  const context = useContext(ProductContext);

  if (!context) {
    throw new Error("useProducts must be used within ProductProvider");
  }

  return context;
}
