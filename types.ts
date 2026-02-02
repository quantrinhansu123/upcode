export interface WorkSession {
  id: string;
  taskId: string;
  startedAt: string;
  endedAt?: string;
}

export interface SubtaskWorkSession {
  id: string;
  subtaskId: string;
  startedAt: string;
  endedAt?: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt?: string;
  sessions?: SubtaskWorkSession[];
  assigneeId?: string; // Người phụ trách
  assignee?: Employee; // Thông tin người phụ trách
  price?: number; // Giá của subtask
}

export interface TaskPayment {
  id: string;
  taskId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  note?: string;
  createdAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  deadline: string;
  isCompleted: boolean;
  startedAt?: string; // Legacy field, kept for backward compatibility checking
  sessions?: WorkSession[];
  subtasks?: Subtask[];
  completedAt?: string;
  hoursWorked?: number;
  taskType?: string;
  assigneeId?: string; // Legacy field, kept for backward compatibility
  assignee?: Employee; // Legacy field, kept for backward compatibility
  assignees?: TaskAssignee[]; // Nhiều người phụ trách với commission
  priority: 'Low' | 'Medium' | 'High';
  price?: number; // Giá của công việc
  payments?: TaskPayment[]; // Lịch sử thanh toán
  createdAt?: string;
}

export interface Employee {
  id: string;
  fullName: string;
  department: string;
  position: string;
  avatarUrl?: string;
  qrCodeUrl?: string;
  email?: string;
  password?: string;
  totalCommission?: number; // Tổng tiền hoa hồng từ tất cả tasks
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  employeeId: string;
  employee?: Employee;
  commission: number;
  createdAt?: string;
}

export interface TaskType {
  id: string;
  name: string;
}

export interface ProjectTransaction {
  id: string;
  projectId: string;
  type: 'income' | 'expense'; // 'income' = thu, 'expense' = chi
  amount: number;
  description?: string;
  transactionDate: string;
  paymentDate?: string; // Ngày thu (cho income) hoặc ngày sẽ chi (cho expense)
  status?: 'pending' | 'paid'; // 'pending' = chờ thanh toán/chờ chi, 'paid' = đã thanh toán/đã chi
  recipientId?: string; // Người nhận (chỉ cho expense)
  recipient?: Employee; // Thông tin người nhận
  receiptImageUrl?: string; // URL ảnh hóa đơn (chỉ cho expense)
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  price?: number; // Giá của dự án
  createdAt: string;
  transactions?: ProjectTransaction[]; // Lịch sử thu chi
}

export interface AppState {
  projects: Project[];
  tasks: Task[];
  employees: Employee[];
}
