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

export type OrderItem = {
  id?: string;
  name: string;
  sku: string;
  requestedQty?: number;
  approvedQty?: number;
  fulfilledQty?: number;
  unitPrice?: number;
  status?: string;
};

export type TimelineItem = {
  title: string;
  by?: string;
  time?: string;
  state?: "done" | "active" | "pending" | "rejected";
};

export type DocumentItem = {
  id?: string;
  name: string;
  url?: string;
};

export type CommentItem = {
  id?: string;
  by?: string;
  role?: string;
  text: string;
  time?: string;
};

export type Order = {
  id: string;
  createdDate?: string;
  requiredDate?: string;
  products?: string;
  totalItems?: number;
  totalQty?: number;
  totalAmount?: number;
  status?: OrderStatus | string;
  currentStep?: string;
  branch?: string;
  priority?: "High" | "Medium" | "Low" | string;
  customer?: string;
  submittedBy?: string;
  waiting?: string;
  items?: OrderItem[];
  timeline?: TimelineItem[];
  documents?: DocumentItem[];
  comments?: CommentItem[];
  deliveryLines?: string[];
  billingLines?: string[];
  managerLines?: string[];
  notes?: string;
};

export type InventoryItem = {
  name: string;
  sku: string;
  category?: string;
  available?: number;
  reserved?: number;
  consumed?: number;
  threshold?: number;
  status?: string;
  updated?: string;
  reorder?: number;
  transactions?: InventoryTransaction[];
  movement?: StockMovementPoint[];
};

export type InventoryTransaction = {
  date?: string;
  type?: string;
  qty?: number;
  ref?: string;
  by?: string;
  notes?: string;
};

export type StockMovementPoint = {
  label?: string;
  received?: number;
  consumed?: number;
  reserved?: number;
  returned?: number;
};

export type Product = {
  id?: string;
  name: string;
  sku: string;
  category?: string;
  unit?: string;
  price?: number;
  stock?: number;
  customers?: number;
  status?: string;
};

export type StockRequest = {
  id: string;
  product?: string;
  sku?: string;
  qty?: number;
  requiredDate?: string;
  priority?: string;
  status?: string;
  approver?: string;
  created?: string;
};

export type ApprovalTask = {
  taskId: string;
  entity?: string;
  customer?: string;
  submittedBy?: string;
  amount?: number;
  step?: string;
  priority?: string;
  waiting?: string;
  sla?: string;
  status?: string;
  items?: OrderItem[];
  history?: TimelineItem[];
  comments?: CommentItem[];
};

export type NotificationItem = {
  id?: string;
  title: string;
  time?: string;
  category?: string;
  unread?: boolean;
};

export type AuditLogItem = {
  id?: string;
  time?: string;
  user?: string;
  role?: string;
  action?: string;
  module?: string;
  record?: string;
  oldVal?: string;
  newVal?: string;
  ip?: string;
};

export type WorkflowStep = {
  n?: number;
  name: string;
  role?: string;
  type?: string;
  sla?: string;
};

export type Workflow = {
  id?: string;
  name: string;
  module?: string;
  customer?: string;
  steps?: number | WorkflowStep[];
  status?: string;
  updated?: string;
};

export type StockVerificationItem = {
  id?: string;
  name: string;
  sku: string;
  req?: number;
  avail?: number;
  reserved?: number;
  approved?: number;
  shortage?: number;
  status?: string;
};

export type FaqItem = {
  id?: string;
  question: string;
  answer: string;
  category?: string;
};

export type ReportItem = {
  id?: string;
  name: string;
  description?: string;
  iconKey?: "orders" | "time" | "stock" | "inventory" | "movement" | "rejected" | "sla";
};

export type DashboardMetric = {
  id: string;
  label: string;
  value: string | number;
  trend?: string;
  tone?: "default" | "warning" | "success" | "destructive" | "info";
};

export type OrderOverviewPoint = {
  m: string;
  created: number;
  approved: number;
  delivered: number;
};

export type WorkloadItem = {
  role: string;
  count: number;
  cap: number;
};

export type ActivityItem = {
  iconKey: "approval" | "stock" | "request" | "order" | "workflow";
  tone: string;
  text: string;
  time: string;
};
