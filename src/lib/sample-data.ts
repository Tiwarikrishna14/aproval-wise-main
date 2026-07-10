export type OrderStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Processing"
  | "In Transit"
  | "Delivered"
  | "Rejected"
  | "Cancelled";

export const statusTone: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground border-border",
  Submitted: "bg-info/10 text-info border-info/20",
  "Under Review": "bg-warning/15 text-warning-foreground border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Processing: "bg-info/10 text-info border-info/20",
  "In Transit": "bg-primary/10 text-primary border-primary/20",
  Delivered: "bg-success/15 text-success border-success/30",
  Rejected: "bg-destructive/10 text-destructive border-destructive/25",
  Cancelled: "bg-muted text-muted-foreground border-border",
  Healthy: "bg-success/15 text-success border-success/30",
  "Low Stock": "bg-warning/15 text-warning-foreground border-warning/30",
  "Out of Stock": "bg-destructive/10 text-destructive border-destructive/25",
  Archived: "bg-muted text-muted-foreground border-border",
  "Return Pending": "bg-warning/15 text-warning-foreground border-warning/30",
  "Converted to Order": "bg-success/15 text-success border-success/30",
  "Partially Approved": "bg-warning/15 text-warning-foreground border-warning/30",
  Closed: "bg-muted text-muted-foreground border-border",
  High: "bg-destructive/10 text-destructive border-destructive/25",
  Medium: "bg-warning/15 text-warning-foreground border-warning/30",
  Low: "bg-muted text-muted-foreground border-border",
};

export type Order = {
  id: string;
  createdDate: string;
  requiredDate: string;
  products: string;
  totalItems: number;
  totalQty: number;
  totalAmount: number;
  status: OrderStatus;
  currentStep: string;
  branch: string;
  priority: "High" | "Medium" | "Low";
  customer: string;
  submittedBy: string;
  waiting: string;
};

export const orders: Order[] = [
  {
    id: "ORD-2026-1048",
    createdDate: "10 Jul 2026",
    requiredDate: "18 Jul 2026",
    products: "Thermal Paper Roll, Barcode Scanner +2",
    totalItems: 4,
    totalQty: 120,
    totalAmount: 84500,
    status: "Under Review",
    currentStep: "Stock Verification",
    branch: "Mumbai HQ",
    priority: "High",
    customer: "Acme Retail Pvt. Ltd.",
    submittedBy: "Rahul Sharma",
    waiting: "6h 20m",
  },
  {
    id: "ORD-2026-1047",
    createdDate: "09 Jul 2026",
    requiredDate: "16 Jul 2026",
    products: "POS Terminal, Receipt Printer",
    totalItems: 2,
    totalQty: 24,
    totalAmount: 156000,
    status: "Approved",
    currentStep: "Processing",
    branch: "Delhi Warehouse",
    priority: "Medium",
    customer: "Acme Retail Pvt. Ltd.",
    submittedBy: "Rahul Sharma",
    waiting: "—",
  },
  {
    id: "ORD-2026-1046",
    createdDate: "08 Jul 2026",
    requiredDate: "14 Jul 2026",
    products: "Packaging Tape, Shipping Label Pack",
    totalItems: 2,
    totalQty: 300,
    totalAmount: 21800,
    status: "In Transit",
    currentStep: "Delivery",
    branch: "Bengaluru Store",
    priority: "Low",
    customer: "Acme Retail Pvt. Ltd.",
    submittedBy: "Rahul Sharma",
    waiting: "—",
  },
  {
    id: "ORD-2026-1045",
    createdDate: "05 Jul 2026",
    requiredDate: "12 Jul 2026",
    products: "Handheld Scanner, Printer Cartridge",
    totalItems: 2,
    totalQty: 45,
    totalAmount: 62400,
    status: "Delivered",
    currentStep: "Completed",
    branch: "Mumbai HQ",
    priority: "Medium",
    customer: "Acme Retail Pvt. Ltd.",
    submittedBy: "Rahul Sharma",
    waiting: "—",
  },
  {
    id: "ORD-2026-1044",
    createdDate: "03 Jul 2026",
    requiredDate: "10 Jul 2026",
    products: "Thermal Paper Roll",
    totalItems: 1,
    totalQty: 500,
    totalAmount: 42500,
    status: "Rejected",
    currentStep: "Finance Review",
    branch: "Delhi Warehouse",
    priority: "Low",
    customer: "Acme Retail Pvt. Ltd.",
    submittedBy: "Rahul Sharma",
    waiting: "—",
  },
];

export type InventoryItem = {
  name: string;
  sku: string;
  category: string;
  available: number;
  reserved: number;
  consumed: number;
  threshold: number;
  status: "Healthy" | "Low Stock" | "Out of Stock" | "Archived" | "Return Pending";
  updated: string;
  reorder: number;
};

export const inventory: InventoryItem[] = [
  { name: "Thermal Paper Roll", sku: "TPR-80MM", category: "Consumables", available: 42, reserved: 20, consumed: 380, threshold: 100, status: "Low Stock", updated: "2h ago", reorder: 200 },
  { name: "Barcode Scanner", sku: "BCS-2100", category: "Devices", available: 18, reserved: 4, consumed: 32, threshold: 10, status: "Healthy", updated: "1d ago", reorder: 25 },
  { name: "Packaging Tape", sku: "PKT-48MM", category: "Consumables", available: 0, reserved: 0, consumed: 900, threshold: 150, status: "Out of Stock", updated: "3h ago", reorder: 500 },
  { name: "Printer Cartridge", sku: "PC-BLK-05", category: "Consumables", available: 8, reserved: 2, consumed: 76, threshold: 20, status: "Low Stock", updated: "5h ago", reorder: 30 },
  { name: "Shipping Label Pack", sku: "SLP-4X6", category: "Consumables", available: 240, reserved: 40, consumed: 1200, threshold: 200, status: "Healthy", updated: "6h ago", reorder: 300 },
  { name: "POS Terminal", sku: "POS-T50", category: "Devices", available: 6, reserved: 2, consumed: 14, threshold: 4, status: "Healthy", updated: "2d ago", reorder: 10 },
  { name: "Handheld Scanner", sku: "HHS-320", category: "Devices", available: 3, reserved: 1, consumed: 22, threshold: 5, status: "Low Stock", updated: "1d ago", reorder: 15 },
  { name: "Receipt Printer", sku: "RP-80", category: "Devices", available: 0, reserved: 0, consumed: 12, threshold: 3, status: "Out of Stock", updated: "1d ago", reorder: 8 },
];

export const stockRequests = [
  { id: "SR-2026-031", product: "Thermal Paper Roll", qty: 200, requiredDate: "20 Jul 2026", priority: "High", status: "Under Review", approver: "Priya Verma", created: "10 Jul 2026" },
  { id: "SR-2026-030", product: "Packaging Tape", qty: 500, requiredDate: "18 Jul 2026", priority: "High", status: "Approved", approver: "—", created: "09 Jul 2026" },
  { id: "SR-2026-029", product: "Printer Cartridge", qty: 30, requiredDate: "22 Jul 2026", priority: "Medium", status: "Partially Approved", approver: "Neha Singh", created: "08 Jul 2026" },
  { id: "SR-2026-028", product: "Barcode Scanner", qty: 12, requiredDate: "25 Jul 2026", priority: "Low", status: "Submitted", approver: "Priya Verma", created: "07 Jul 2026" },
  { id: "SR-2026-027", product: "Handheld Scanner", qty: 20, requiredDate: "15 Jul 2026", priority: "Medium", status: "Converted to Order", approver: "—", created: "05 Jul 2026" },
];

export const customers = [
  { name: "Acme Retail Pvt. Ltd.", code: "CUST-1042", contact: "Rahul Sharma", branches: 4, orders: 12, credit: "Healthy", status: "Active", manager: "Vikram Mehta" },
  { name: "Northline Distributors", code: "CUST-1043", contact: "Karthik Iyer", branches: 2, orders: 6, credit: "On Watch", status: "Active", manager: "Vikram Mehta" },
  { name: "Zenith Supermart", code: "CUST-1044", contact: "Meera Nair", branches: 8, orders: 24, credit: "Healthy", status: "Active", manager: "Neha Singh" },
  { name: "Bluewave Traders", code: "CUST-1045", contact: "Anand Rao", branches: 1, orders: 2, credit: "Blocked", status: "Suspended", manager: "Vikram Mehta" },
  { name: "Prime Logistics", code: "CUST-1046", contact: "Divya Menon", branches: 5, orders: 9, credit: "Healthy", status: "Active", manager: "Neha Singh" },
];

export const products = [
  { name: "Thermal Paper Roll", sku: "TPR-80MM", category: "Consumables", unit: "Roll", price: 85, stock: 420, customers: 32, status: "Active" },
  { name: "Barcode Scanner", sku: "BCS-2100", category: "Devices", unit: "Unit", price: 3200, stock: 88, customers: 18, status: "Active" },
  { name: "Packaging Tape", sku: "PKT-48MM", category: "Consumables", unit: "Roll", price: 42, stock: 0, customers: 40, status: "Active" },
  { name: "Printer Cartridge", sku: "PC-BLK-05", category: "Consumables", unit: "Piece", price: 1450, stock: 60, customers: 22, status: "Active" },
  { name: "POS Terminal", sku: "POS-T50", category: "Devices", unit: "Unit", price: 24500, stock: 32, customers: 12, status: "Active" },
  { name: "Handheld Scanner", sku: "HHS-320", category: "Devices", unit: "Unit", price: 5800, stock: 14, customers: 9, status: "Active" },
  { name: "Receipt Printer", sku: "RP-80", category: "Devices", unit: "Unit", price: 7200, stock: 0, customers: 15, status: "Active" },
  { name: "Shipping Label Pack", sku: "SLP-4X6", category: "Consumables", unit: "Pack", price: 320, stock: 260, customers: 28, status: "Active" },
];

export const workflows = [
  { name: "Standard Order Approval", module: "Orders", customer: "All", steps: 4, status: "Active", updated: "2 Jul 2026" },
  { name: "High Value Order Approval", module: "Orders", customer: "All", steps: 5, status: "Active", updated: "28 Jun 2026" },
  { name: "Stock Request Approval", module: "Stock Requests", customer: "All", steps: 3, status: "Active", updated: "30 Jun 2026" },
  { name: "Stock Return Approval", module: "Inventory", customer: "Acme Retail", steps: 3, status: "Draft", updated: "5 Jul 2026" },
  { name: "Inventory Adjustment Approval", module: "Inventory", customer: "All", steps: 2, status: "Active", updated: "1 Jul 2026" },
];

export const approvalQueue = [
  { taskId: "APT-8821", entity: "ORD-2026-1048", customer: "Acme Retail Pvt. Ltd.", submittedBy: "Rahul Sharma", amount: 84500, step: "Stock Verification", priority: "High", waiting: "6h 20m", sla: "Within SLA" },
  { taskId: "APT-8822", entity: "SR-2026-031", customer: "Acme Retail Pvt. Ltd.", submittedBy: "Rahul Sharma", amount: 17000, step: "Order Review", priority: "High", waiting: "12h 40m", sla: "Breach Risk" },
  { taskId: "APT-8823", entity: "ORD-2026-1049", customer: "Zenith Supermart", submittedBy: "Meera Nair", amount: 245000, step: "Finance Approval", priority: "High", waiting: "22h", sla: "Breached" },
  { taskId: "APT-8824", entity: "ORD-2026-1050", customer: "Northline Distributors", submittedBy: "Karthik Iyer", amount: 46200, step: "Order Review", priority: "Medium", waiting: "3h", sla: "Within SLA" },
  { taskId: "APT-8825", entity: "SR-2026-032", customer: "Prime Logistics", submittedBy: "Divya Menon", amount: 8400, step: "Order Review", priority: "Low", waiting: "1h 15m", sla: "Within SLA" },
];

export const notifications = [
  { title: "Order ORD-2026-1048 is awaiting your approval", time: "10 min ago", category: "Approvals", unread: true },
  { title: "Thermal Paper Roll is below the stock threshold", time: "1 hour ago", category: "Inventory", unread: true },
  { title: "Stock Request SR-2026-031 has been approved", time: "3 hours ago", category: "Approvals", unread: false },
  { title: "Order ORD-2026-1038 has been dispatched", time: "Yesterday", category: "Orders", unread: false },
  { title: "Inventory adjustment requires review", time: "Yesterday", category: "Inventory", unread: false },
  { title: "Workflow 'High Value Order Approval' updated", time: "2 days ago", category: "System", unread: false },
];

export const auditLogs = [
  { time: "10 Jul 2026, 11:45", user: "Priya Verma", role: "Order Reviewer", action: "Approved", module: "Orders", record: "ORD-2026-1048", oldVal: "Submitted", newVal: "Under Review", ip: "10.0.4.22" },
  { time: "10 Jul 2026, 10:30", user: "Rahul Sharma", role: "Customer Admin", action: "Created", module: "Orders", record: "ORD-2026-1048", oldVal: "—", newVal: "Submitted", ip: "182.44.10.4" },
  { time: "10 Jul 2026, 09:12", user: "Amit Kumar", role: "Stock Verifier", action: "Adjusted", module: "Inventory", record: "TPR-80MM", oldVal: "62", newVal: "42", ip: "10.0.4.31" },
  { time: "09 Jul 2026, 17:02", user: "Neha Singh", role: "Finance Approver", action: "Rejected", module: "Orders", record: "ORD-2026-1044", oldVal: "Under Review", newVal: "Rejected", ip: "10.0.4.55" },
  { time: "09 Jul 2026, 14:22", user: "Vikram Mehta", role: "Super Admin", action: "Updated Workflow", module: "Workflow", record: "High Value Order Approval", oldVal: "4 steps", newVal: "5 steps", ip: "10.0.4.10" },
];
