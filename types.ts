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

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface AppState {
  projects: Project[];
  tasks: Task[];
  employees: Employee[];
}
