export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  supplier: string;
  barcode?: string;
  unit: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Sale {
  id: string;
  billNumber: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  date: string;
  paymentMethod: string;
}

export const categories = [
  "Groceries", "Beverages", "Snacks", "Dairy", "Personal Care",
  "Household", "Stationery", "Spices", "Oils", "Pulses"
];

export const products: Product[] = [
  { id: "1", name: "Tata Salt", category: "Groceries", price: 28, stock: 45, supplier: "Tata Consumer", unit: "kg" },
  { id: "2", name: "Aashirvaad Atta", category: "Groceries", price: 320, stock: 30, supplier: "ITC Ltd", unit: "5kg" },
  { id: "3", name: "Amul Butter", category: "Dairy", price: 56, stock: 20, supplier: "Amul", unit: "100g" },
  { id: "4", name: "Parle-G Biscuit", category: "Snacks", price: 10, stock: 100, supplier: "Parle", unit: "pack" },
  { id: "5", name: "Surf Excel", category: "Household", price: 145, stock: 25, supplier: "HUL", unit: "1kg" },
  { id: "6", name: "Colgate MaxFresh", category: "Personal Care", price: 85, stock: 35, supplier: "Colgate", unit: "150g" },
  { id: "7", name: "Maggi Noodles", category: "Snacks", price: 14, stock: 80, supplier: "Nestle", unit: "pack" },
  { id: "8", name: "Fortune Oil", category: "Oils", price: 180, stock: 18, supplier: "Adani Wilmar", unit: "1L" },
  { id: "9", name: "Toor Dal", category: "Pulses", price: 140, stock: 22, supplier: "Local", unit: "kg" },
  { id: "10", name: "Red Label Tea", category: "Beverages", price: 210, stock: 15, supplier: "HUL", unit: "500g" },
  { id: "11", name: "Dettol Soap", category: "Personal Care", price: 42, stock: 50, supplier: "Reckitt", unit: "75g" },
  { id: "12", name: "Classmate Notebook", category: "Stationery", price: 35, stock: 60, supplier: "ITC Ltd", unit: "pack" },
  { id: "13", name: "MDH Chana Masala", category: "Spices", price: 65, stock: 30, supplier: "MDH", unit: "100g" },
  { id: "14", name: "Coca-Cola", category: "Beverages", price: 40, stock: 5, supplier: "Coca-Cola", unit: "750ml" },
  { id: "15", name: "Vim Dishwash", category: "Household", price: 28, stock: 3, supplier: "HUL", unit: "250ml" },
];

export const recentSales: Sale[] = [
  {
    id: "s1", billNumber: "PGS-2024-001",
    items: [
      { productId: "1", name: "Tata Salt", quantity: 2, price: 28, total: 56 },
      { productId: "4", name: "Parle-G Biscuit", quantity: 5, price: 10, total: 50 },
      { productId: "7", name: "Maggi Noodles", quantity: 3, price: 14, total: 42 },
    ],
    subtotal: 148, discount: 0, total: 148,
    date: "2026-02-24T10:30:00", paymentMethod: "Cash"
  },
  {
    id: "s2", billNumber: "PGS-2024-002",
    items: [
      { productId: "2", name: "Aashirvaad Atta", quantity: 1, price: 320, total: 320 },
      { productId: "8", name: "Fortune Oil", quantity: 2, price: 180, total: 360 },
    ],
    subtotal: 680, discount: 30, total: 650,
    date: "2026-02-24T11:45:00", paymentMethod: "UPI"
  },
  {
    id: "s3", billNumber: "PGS-2024-003",
    items: [
      { productId: "10", name: "Red Label Tea", quantity: 1, price: 210, total: 210 },
      { productId: "3", name: "Amul Butter", quantity: 2, price: 56, total: 112 },
    ],
    subtotal: 322, discount: 0, total: 322,
    date: "2026-02-23T14:20:00", paymentMethod: "Cash"
  },
  {
    id: "s4", billNumber: "PGS-2024-004",
    items: [
      { productId: "5", name: "Surf Excel", quantity: 1, price: 145, total: 145 },
      { productId: "6", name: "Colgate MaxFresh", quantity: 1, price: 85, total: 85 },
      { productId: "11", name: "Dettol Soap", quantity: 3, price: 42, total: 126 },
    ],
    subtotal: 356, discount: 20, total: 336,
    date: "2026-02-23T09:15:00", paymentMethod: "Card"
  },
  {
    id: "s5", billNumber: "PGS-2024-005",
    items: [
      { productId: "9", name: "Toor Dal", quantity: 2, price: 140, total: 280 },
      { productId: "13", name: "MDH Chana Masala", quantity: 1, price: 65, total: 65 },
    ],
    subtotal: 345, discount: 0, total: 345,
    date: "2026-02-22T16:00:00", paymentMethod: "Cash"
  },
];
