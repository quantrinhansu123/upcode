
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  LayoutDashboard,
  Briefcase,
  CheckCircle2,
  Clock,
  Calendar,
  Trash2,
  AlertCircle,
  Sparkles,
  Search,
  CheckCircle,
  Play,
  Pause,
  Users,
  Settings,
  Pencil,
  X,
  Filter,
  ChevronDown,
  ChevronRight,
  FileText,
  DollarSign,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  Image as ImageIcon,
  Upload,
  TrendingUp,
  Menu,
  Maximize2,
  Minimize2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { format, isPast, isToday, parseISO, differenceInMinutes, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Project, Task, WorkSession, TaskType, Employee, Subtask, ProjectTransaction } from './types';
import { suggestTasksForProject } from './services/geminiService';
import { projectService, taskService, taskTypeService, employeeService, subtaskService, paymentService, projectTransactionService } from './services/databaseService';
import testDatabaseConnection from './database/test-connection';
import { EmployeeManager } from './components/EmployeeManager';
import { TimelineView } from './components/TimelineView';
import { DailyTaskView } from './components/DailyTaskView';
import { CoHoiChoAiView } from './components/CoHoiChoAiView';
import { BaoGiaView } from './components/BaoGiaView';
import { TimeTrackingView } from './components/TimeTrackingView';
import { EmployeeDetailView } from './components/EmployeeDetailView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { isNetworkError, getErrorMessage } from './utils/errorHandler';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Interfaces for sub-components to ensure type safety
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onEdit: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  projectName: string;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  employees?: Employee[];
}

interface ProjectModalProps {
  onClose: () => void;
  onSubmit: (name: string, description: string, price?: number) => void;
  initialData?: Project;
}

interface TaskModalProps {
  onClose: () => void;
  onSubmit: (t: any) => void;
  projects: Project[];
  initialProjectId?: string;
  taskTypes: TaskType[];
  onManageTypes: () => void;
  employees: Employee[];
  initialData?: Task;
}

interface CompleteTaskModalProps {
  onClose: () => void;
  onSubmit: (hoursWorked: number) => void;
  taskTitle: string;
  initialHours?: number;
}

// Sub-components moved above App for hoisting and clarity
const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    rose: 'bg-rose-50 border-rose-100',
  };

  return (
    <div className="p-3 rounded-xl border bg-white shadow-sm flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorMap[color] || 'bg-slate-50'}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

const TaskTimer: React.FC<{ startedAt: string, sessions?: WorkSession[] }> = ({ startedAt, sessions }) => {
  const [elapsed, setElapsed] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      let totalMinutes = 0;

      // Tính tổng từ TẤT CẢ các sessions
      if (sessions && sessions.length > 0) {
        sessions.forEach(session => {
          if (session.startedAt) {
            if (session.endedAt) {
              // Session đã kết thúc: tính từ startedAt đến endedAt
              totalMinutes += differenceInMinutes(parseISO(session.endedAt), parseISO(session.startedAt));
            } else {
              // Session đang chạy: tính từ startedAt đến hiện tại
              totalMinutes += differenceInMinutes(now, parseISO(session.startedAt));
            }
          }
        });
      } else if (startedAt) {
        // Fallback: nếu không có sessions, dùng startedAt (legacy)
        totalMinutes = differenceInMinutes(now, parseISO(startedAt));
      }

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      setElapsed(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [startedAt, sessions]);

  return (
    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full animate-pulse transition-all">
      <Clock size={12} />
      <span>{elapsed}</span>
    </div>
  );
};

// Component hiển thị trạng thái "đang bắt đầu" (chưa pause)
const SubtaskActiveIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-200">
      <Play size={10} />
      <span>Đang làm...</span>
    </div>
  );
};

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onComplete, onStart, onPause, onEdit, onTaskUpdate, projectName, isSelected = false, onSelect, employees = [] }) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState('');
  const [newSubtaskPrice, setNewSubtaskPrice] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);

  // Lazy load subtasks when expanded
  useEffect(() => {
    if (isExpanded && subtasks.length === 0 && !isLoadingSubtasks) {
      setIsLoadingSubtasks(true);
      subtaskService.getByTaskId(task.id)
        .then(loadedSubtasks => {
          setSubtasks(loadedSubtasks);
          setIsLoadingSubtasks(false);
        })
        .catch(error => {
          console.error('Error loading subtasks:', error);
          setIsLoadingSubtasks(false);
        });
    }
  }, [isExpanded, task.id]);

  const isOverdue = !task.isCompleted && isPast(parseISO(task.deadline)) && !isToday(parseISO(task.deadline));
  // Check if task is running: either has startedAt (legacy) or has an active session (no endedAt)
  const hasActiveSession = task.sessions?.some(s => s.startedAt && !s.endedAt);
  const isStarted = (!!task.startedAt || hasActiveSession) && !task.isCompleted;

  const totalWorkedMinutes = useMemo(() => {
    // Chỉ tính thời gian từ subtask sessions (đã kết thúc)
    // Tổng giờ làm của công việc = tổng giờ của các subtask
    let subtaskMinutes = 0;
    if (subtasks && subtasks.length > 0) {
      subtaskMinutes = subtasks.reduce((acc, subtask) => {
        if (subtask.sessions) {
          const subtaskTime = subtask.sessions.reduce((subAcc, s) => {
            // Chỉ tính các session đã pause (có endedAt)
            if (s.startedAt && s.endedAt) {
              return subAcc + differenceInMinutes(parseISO(s.endedAt), parseISO(s.startedAt));
            }
            return subAcc;
          }, 0);
          return acc + subtaskTime;
        }
        return acc;
      }, 0);
    }

    return subtaskMinutes;
  }, [subtasks]);

  const totalWorked = totalWorkedMinutes > 0
    ? `${Math.floor(totalWorkedMinutes / 60)}h ${totalWorkedMinutes % 60}m`
    : null;

  // Calculate total paid amount
  const totalPaid = useMemo(() => {
    return task.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  }, [task.payments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  // Update subtasks when task changes
  // Update subtasks when task changes
  useEffect(() => {
    if (task.subtasks) {
      console.log('🔄 Updating subtasks from task:', task.subtasks.map(s => ({
        id: s.id,
        title: s.title,
        sessionsCount: s.sessions?.length || 0,
        hasActive: s.sessions?.some(ss => ss.startedAt && !ss.endedAt),
        sessions: s.sessions
      })));
      setSubtasks(task.subtasks);
    } else {
      setSubtasks([]);
    }
  }, [task.subtasks, task.id]); // Thêm task.id để force update khi task thay đổi

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parsePrice = (value: string): number | undefined => {
    const numbers = value.replace(/\D/g, '');
    return numbers ? Number(numbers) : undefined;
  };

  const handleAddSubtask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      const price = parsePrice(newSubtaskPrice);
      const newSubtask = await subtaskService.create(
        task.id, 
        newSubtaskTitle.trim(),
        newSubtaskAssigneeId || undefined,
        price
      );
      setSubtasks([...subtasks, newSubtask]);
      setNewSubtaskTitle('');
      setNewSubtaskAssigneeId('');
      setNewSubtaskPrice('');
      setIsAddingSubtask(false);
      
      // Update parent task
      const updatedTask = await taskService.getById(task.id);
      if (updatedTask) {
        onTaskUpdate(updatedTask);
      }
    } catch (error: any) {
      console.error('Error adding subtask:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      // Check if it's a database table missing error
      if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        alert('Bảng subtasks chưa được tạo trong database. Vui lòng chạy migration_subtasks.sql trên Supabase Dashboard.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        alert('Không có quyền truy cập bảng subtasks. Vui lòng kiểm tra RLS policies trên Supabase.');
      } else {
        alert(`Không thể thêm subtask: ${errorMessage}\n\nVui lòng kiểm tra Console (F12) để xem chi tiết lỗi.`);
      }
    }
  };

  const handleUpdateSubtask = async (subtaskId: string, updates: { assigneeId?: string; price?: number }) => {
    try {
      const updatedSubtask = await subtaskService.update(subtaskId, updates);
      setSubtasks(subtasks.map(s => s.id === subtaskId ? updatedSubtask : s));
      setEditingSubtaskId(null);
      
      // Update parent task
      const updatedTask = await taskService.getById(task.id);
      if (updatedTask) {
        onTaskUpdate(updatedTask);
      }
    } catch (error: any) {
      console.error('Error updating subtask:', error);
      alert('Không thể cập nhật subtask');
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      const updatedSubtask = await subtaskService.toggleComplete(subtaskId);
      
      // Update subtasks state với subtask đã được cập nhật (có sessions mới)
      setSubtasks(subtasks.map(s => s.id === subtaskId ? updatedSubtask : s));
      
      // Reload task để có dữ liệu subtasks và sessions mới nhất
      const updatedTask = await taskService.getById(task.id);
      if (updatedTask && updatedTask.subtasks) {
        // Cập nhật subtasks state với dữ liệu mới nhất từ database
        setSubtasks(updatedTask.subtasks);
        // Update parent task để UI cập nhật tổng thời gian
        onTaskUpdate(updatedTask);
      }
    } catch (error: any) {
      console.error('Error toggling subtask:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      alert(`Không thể cập nhật subtask: ${errorMessage}`);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await subtaskService.delete(subtaskId);
      setSubtasks(subtasks.filter(s => s.id !== subtaskId));
      
      // Update parent task
      const updatedTask = await taskService.getById(task.id);
      if (updatedTask) {
        onTaskUpdate(updatedTask);
      }
    } catch (error: any) {
      console.error('Error deleting subtask:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      alert(`Không thể xóa subtask: ${errorMessage}`);
    }
  };

  const handleStartSubtask = async (subtaskId: string) => {
    try {
      console.log('🟢 Starting subtask timer for:', subtaskId);
      const updatedSubtask = await subtaskService.startSession(subtaskId);
      console.log('✅ Subtask updated:', updatedSubtask);
      console.log('📊 Sessions:', updatedSubtask.sessions);
      const hasActive = updatedSubtask.sessions?.some(s => s.startedAt && !s.endedAt);
      console.log('🔍 Has active session:', hasActive);
      
      // Update subtasks state immediately với sessions mới
      const newSubtasks = subtasks.map(s => {
        if (s.id === subtaskId) {
          return updatedSubtask;
        }
        return s;
      });
      setSubtasks(newSubtasks);
      console.log('🔄 Updated local subtasks state, new hasActive:', newSubtasks.find(s => s.id === subtaskId)?.sessions?.some(ss => ss.startedAt && !ss.endedAt));
      
      // Update parent task để reload subtasks với sessions từ database
      const updatedTask = await taskService.getById(task.id);
      if (updatedTask && updatedTask.subtasks) {
        console.log('📦 Updated task from DB, subtasks:', updatedTask.subtasks.map(s => ({
          id: s.id,
          sessions: s.sessions?.length || 0,
          hasActive: s.sessions?.some(ss => ss.startedAt && !ss.endedAt)
        })));
        onTaskUpdate(updatedTask);
        // Update local subtasks từ updated task
        setSubtasks(updatedTask.subtasks);
      }
    } catch (error: any) {
      console.error('❌ Error starting subtask:', error);
      alert(`Không thể bắt đầu timer: ${error?.message || 'Unknown error'}`);
    }
  };

  const handlePauseSubtask = async (subtaskId: string) => {
    try {
      console.log('⏸️ Pausing subtask timer for:', subtaskId);
      const updatedSubtask = await subtaskService.pauseSession(subtaskId);
      console.log('✅ Subtask paused:', updatedSubtask);
      console.log('📊 Sessions after pause:', updatedSubtask.sessions);
      
      // Update subtasks state
      const newSubtasks = subtasks.map(s => s.id === subtaskId ? updatedSubtask : s);
      setSubtasks(newSubtasks);
      
      // Update parent task để reload subtasks với sessions từ database
      const updatedTask = await taskService.getById(task.id);
      if (updatedTask && updatedTask.subtasks) {
        onTaskUpdate(updatedTask);
        setSubtasks(updatedTask.subtasks);
      }
    } catch (error: any) {
      console.error('Error pausing subtask:', error);
      alert(`Không thể tạm dừng timer: ${error?.message || 'Unknown error'}`);
    }
  };

  // Calculate total hours from all subtasks - CHỈ tính các sessions đã pause (có endedAt)
  const totalSubtaskHours = useMemo(() => {
    let totalMinutes = 0;
    subtasks.forEach(subtask => {
      if (subtask.sessions) {
        subtask.sessions.forEach(session => {
          // Chỉ tính các session đã pause (có endedAt)
          if (session.startedAt && session.endedAt) {
            totalMinutes += differenceInMinutes(parseISO(session.endedAt), parseISO(session.startedAt));
          }
        });
      }
    });
    return totalMinutes / 60;
  }, [subtasks]);

  return (
    <div className={`group flex items-start gap-2 p-2.5 rounded-lg border transition-all hover:shadow-sm ${isSelected ? 'bg-indigo-50 border-indigo-300' : task.isCompleted ? 'bg-slate-50/50 border-slate-100 opacity-75' : isStarted ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-slate-200'}`}>
      {/* Checkbox để chọn */}
      {onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(task.id, e.target.checked)}
          className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      
      <button
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-500'}`}
      >
        {task.isCompleted && <CheckCircle2 size={14} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {/* Expand/Collapse button for subtasks */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex-shrink-0 p-1 hover:bg-indigo-50 rounded transition-colors flex items-center justify-center"
            title={isExpanded ? "Ẩn subtasks" : "Hiển thị subtasks"}
          >
            {isExpanded ? (
              <ChevronDown size={18} className="text-indigo-600" />
            ) : (
              <ChevronRight size={18} className="text-indigo-600" />
            )}
          </button>
          <h4 
            className={`font-semibold text-slate-800 flex-1 min-w-0 cursor-pointer ${task.isCompleted ? 'line-through decoration-slate-400 text-slate-400' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <span className="truncate block">{task.title}</span>
          </h4>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${task.priority === 'High' ? 'bg-rose-50 text-rose-600' :
              task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
              }`}>
              {task.priority}
            </span>
            {/* Show total worked time (includes both task sessions and subtask sessions) */}
            {isStarted && task.startedAt ? (
              <TaskTimer startedAt={task.startedAt} sessions={task.sessions} />
            ) : totalWorked ? (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                {totalWorked}
              </span>
            ) : null}
          </div>
        </div>

        {/* Subtasks Section - Only show when expanded */}
        {isExpanded && (
          <div className="mt-3 space-y-1.5">
            {isLoadingSubtasks ? (
              <div className="flex items-center justify-center py-2 text-xs text-slate-400">
                <Clock className="animate-spin mr-2" size={14} />
                Đang tải subtasks...
              </div>
            ) : subtasks.length > 0 ? (
              <>
                {subtasks.map((subtask) => {
                // Kiểm tra active session - session có startedAt nhưng không có endedAt
                const hasActiveSession = subtask.sessions?.some(s => {
                  const hasStarted = !!s.startedAt;
                  const notEnded = !s.endedAt;
                  const isActive = hasStarted && notEnded;
                  return isActive;
                }) || false;
              
              console.log(`[Render] Subtask ${subtask.id}:`, {
                sessions: subtask.sessions,
                hasActive: hasActiveSession,
                activeSessions: subtask.sessions?.filter(s => s.startedAt && !s.endedAt) || []
              });
              
              // Debug log để kiểm tra
              if (subtask.sessions && subtask.sessions.length > 0) {
                console.log(`Subtask ${subtask.id} (${subtask.title}):`, {
                  sessions: subtask.sessions,
                  hasActive: hasActiveSession,
                  activeSessions: subtask.sessions.filter(s => s.startedAt && !s.endedAt)
                });
              }
              
              // Tính tổng giờ CHỈ từ các sessions đã pause (có endedAt)
              // Không tính session đang chạy (chưa pause)
              const subtaskTotalMinutes = subtask.sessions?.reduce((acc, s) => {
                if (s.startedAt && s.endedAt) {
                  // Chỉ tính các session đã pause (có endedAt)
                  return acc + differenceInMinutes(parseISO(s.endedAt), parseISO(s.startedAt));
                }
                return acc;
              }, 0) || 0;
              
              const subtaskTotalHours = subtaskTotalMinutes / 60;
              const subtaskTotalWorked = subtaskTotalMinutes > 0
                ? subtaskTotalHours >= 1
                  ? `${subtaskTotalHours.toFixed(1)}h`
                  : `${subtaskTotalMinutes}m`
                : null;

              return (
                <div key={subtask.id} className="relative flex items-center gap-2 group/subtask py-1 px-1.5 rounded hover:bg-slate-50 transition-colors">
                  <button
                    onClick={() => handleToggleSubtask(subtask.id)}
                    className={`flex-shrink-0 w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${
                      subtask.isCompleted 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-300 hover:border-indigo-500'
                    }`}
                  >
                    {subtask.isCompleted && <CheckCircle2 size={8} />}
                  </button>
                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                    <span 
                      className={`text-xs flex-1 truncate ${
                        subtask.isCompleted 
                          ? 'text-slate-400 line-through' 
                          : 'text-slate-600'
                      }`}
                    >
                      {subtask.title}
                    </span>
                    
                    {/* Hiển thị nhân sự */}
                    {subtask.assignee && (
                      <div className="flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 flex-shrink-0">
                        {subtask.assignee.avatarUrl ? (
                          <img src={subtask.assignee.avatarUrl} className="w-3 h-3 rounded-full object-cover" />
                        ) : (
                          <Users size={10} className="text-indigo-600" />
                        )}
                        <span className="text-[10px] text-indigo-700 max-w-[60px] truncate">{subtask.assignee.fullName}</span>
                      </div>
                    )}
                    
                    {/* Hiển thị tiền */}
                    {subtask.price && subtask.price > 0 && (
                      <div className="flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex-shrink-0">
                        <DollarSign size={10} className="text-emerald-600" />
                        <span className="text-[10px] font-semibold text-emerald-700">
                          {new Intl.NumberFormat('vi-VN').format(subtask.price)}
                        </span>
                      </div>
                    )}
                    
                    {/* Hiển thị thời gian cạnh tên subtask */}
                    {!subtask.isCompleted && (
                      <>
                        {hasActiveSession && (
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0">
                            <Play size={8} />
                            <span>Đang làm...</span>
                          </span>
                        )}
                        {subtaskTotalWorked && !hasActiveSession && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1 py-0.5 rounded flex-shrink-0">
                            {subtaskTotalWorked}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  {!subtask.isCompleted && (
                    <>
                      {hasActiveSession ? (
                        <button
                          onClick={() => handlePauseSubtask(subtask.id)}
                          className="p-0.5 text-amber-600 hover:bg-amber-50 rounded transition-colors opacity-0 group-hover/subtask:opacity-100"
                          title="Tạm dừng"
                        >
                          <Pause size={12} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartSubtask(subtask.id)}
                          className="p-0.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors opacity-0 group-hover/subtask:opacity-100"
                          title="Bắt đầu"
                        >
                          <Play size={12} />
                        </button>
                      )}
                    </>
                  )}
                  
                  {!task.isCompleted && (
                    <>
                      <button
                        onClick={() => setEditingSubtaskId(editingSubtaskId === subtask.id ? null : subtask.id)}
                        className="opacity-0 group-hover/subtask:opacity-100 p-0.5 text-slate-400 hover:text-indigo-500 transition-all"
                        title="Sửa"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        className="opacity-0 group-hover/subtask:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 transition-all"
                        title="Xóa"
                      >
                        <X size={12} />
                      </button>
                    </>
                  )}
                  {editingSubtaskId === subtask.id && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-slate-600 mb-1 block">Nhân sự</label>
                          <select
                            value={subtask.assigneeId || ''}
                            onChange={(e) => handleUpdateSubtask(subtask.id, { assigneeId: e.target.value || undefined })}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none"
                          >
                            <option value="">-- Chọn nhân sự --</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 mb-1 block">Giá (VNĐ)</label>
                          <input
                            type="text"
                            value={subtask.price ? formatPrice(subtask.price.toString()) : ''}
                            onChange={(e) => {
                              const price = parsePrice(e.target.value);
                              handleUpdateSubtask(subtask.id, { price });
                            }}
                            placeholder="Nhập giá..."
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => setEditingSubtaskId(null)}
                          className="w-full px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
              </>
            ) : !task.isCompleted ? (
              <p className="text-sm text-slate-400 italic">Chưa có subtask nào</p>
            ) : null}
            
            {!task.isCompleted && !isLoadingSubtasks && (
              <div className="flex items-center gap-2">
                {isAddingSubtask ? (
                  <form onSubmit={handleAddSubtask} className="flex flex-col gap-2 flex-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Nhập tên subtask..."
                      className="px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={newSubtaskAssigneeId}
                        onChange={(e) => setNewSubtaskAssigneeId(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- Chọn nhân sự --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newSubtaskPrice}
                        onChange={(e) => setNewSubtaskPrice(formatPrice(e.target.value))}
                        placeholder="Giá (VNĐ)..."
                        className="w-24 px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSubtask(false);
                          setNewSubtaskTitle('');
                          setNewSubtaskAssigneeId('');
                          setNewSubtaskPrice('');
                        }}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingSubtask(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                  >
                    <Plus size={14} />
                    Thêm subtask
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
          <span className="text-slate-400">• {projectName}</span>
          <div className={`flex items-center gap-1 text-slate-500 ${isOverdue ? 'text-rose-600' : ''}`}>
            <Calendar size={12} />
            <span>{format(parseISO(task.deadline), 'dd/MM HH:mm')}</span>
            {isOverdue && <span className="ml-1">(Trễ)</span>}
          </div>
          {task.assignee && (
            <div className="flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
              {task.assignee.avatarUrl ?
                <img src={task.assignee.avatarUrl} className="w-3 h-3 rounded-full object-cover" /> :
                <Users size={10} className="text-indigo-600" />
              }
              <span className="text-indigo-700 max-w-[80px] truncate">{task.assignee.fullName}</span>
            </div>
          )}
          {isStarted && task.startedAt && (
            <span className="text-indigo-600 flex items-center gap-1">
              <Play size={10} />
              {format(parseISO(task.startedAt), 'HH:mm')}
            </span>
          )}
          {task.isCompleted && task.completedAt && (
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={10} />
              {format(parseISO(task.completedAt), 'dd/MM')}
            </span>
          )}
          {task.price && task.price > 0 && (
            <div className="flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
              <DollarSign size={10} className="text-emerald-600" />
              <span className="text-emerald-700 font-semibold">{formatCurrency(task.price)}</span>
              {totalPaid > 0 && (
                <span className="text-emerald-600 text-[10px]">
                  ({formatCurrency(totalPaid)}/{formatCurrency(task.price)})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {task.price && task.price > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPaymentModalOpen(true);
            }}
            className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Thanh toán"
          >
            <CreditCard size={16} />
          </button>
        )}
        {!task.isCompleted && isStarted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPause(task.id);
            }}
            className="flex items-center gap-1 px-2 py-1 text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-600 transition-all rounded text-xs font-medium"
            title="Tạm dừng"
          >
            <Pause size={14} />
          </button>
        )}
        {!task.isCompleted && (
          <button
            onClick={() => onComplete(task.id)}
            className="p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-600 transition-all rounded"
            title="Hoàn thành"
          >
            <CheckCircle size={14} />
          </button>
        )}
        <button
          onClick={() => onEdit(task)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-500 transition-all rounded hover:bg-indigo-50"
          title="Sửa"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 transition-all rounded hover:bg-rose-50"
          title="Xóa"
        >
          <X size={14} />
        </button>
      </div>
      {isPaymentModalOpen && (
        <PaymentModal
          task={task}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaymentAdded={async () => {
            const updatedTask = await taskService.getById(task.id);
            if (updatedTask) {
              onTaskUpdate(updatedTask);
            }
            setIsPaymentModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface PaymentModalProps {
  task: Task;
  onClose: () => void;
  onPaymentAdded: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ task, onClose, onPaymentAdded }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const totalPaid = task.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remaining = (task.price || 0) - totalPaid;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  // Format price with dots (1.000.000)
  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setAmount(formatted);
  };

  const parseAmount = (value: string): number => {
    const numbers = value.replace(/\D/g, '');
    return numbers ? Number(numbers) : 0;
  };

  const handleSubmit = async () => {
    const paymentAmount = parseAmount(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (paymentAmount > remaining) {
      alert(`Số tiền thanh toán không được vượt quá số tiền còn lại: ${formatCurrency(remaining)} VNĐ`);
      return;
    }

    setLoading(true);
    try {
      await paymentService.create(task.id, {
        amount: paymentAmount,
        paymentDate: new Date().toISOString(),
        paymentMethod,
        note: note.trim() || undefined
      });
      onPaymentAdded();
    } catch (error: any) {
      console.error('Error creating payment:', error);
      alert('Không thể tạo thanh toán. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900">Ghi nhận thanh toán</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="text-sm text-slate-600 mb-2">Công việc: <span className="font-semibold text-slate-900">{task.title}</span></div>
            <div className="text-sm text-slate-600 mb-1">Tổng giá: <span className="font-bold text-emerald-600">{formatCurrency(task.price || 0)} VNĐ</span></div>
            <div className="text-sm text-slate-600 mb-1">Đã thanh toán: <span className="font-semibold text-indigo-600">{formatCurrency(totalPaid)} VNĐ</span></div>
            <div className="text-sm text-slate-600">Còn lại: <span className="font-bold text-rose-600">{formatCurrency(remaining)} VNĐ</span></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền (VNĐ)</label>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              placeholder={`Tối đa: ${formatCurrency(remaining)} (ví dụ: 1.000.000)`}
              value={amount}
              onChange={handleAmountChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phương thức thanh toán</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
              <option value="other">Khác</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú (không bắt buộc)</label>
            <textarea
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
              placeholder="Ghi chú về thanh toán..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {task.payments && task.payments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Lịch sử thanh toán:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {task.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                    <div>
                      <div className="font-semibold text-slate-900">{formatCurrency(payment.amount)} VNĐ</div>
                      <div className="text-xs text-slate-500">
                        {format(parseISO(payment.paymentDate), 'dd/MM/yyyy HH:mm')}
                        {payment.paymentMethod && ` • ${payment.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : payment.paymentMethod === 'cash' ? 'Tiền mặt' : 'Khác'}`}
                      </div>
                      {payment.note && <div className="text-xs text-slate-400 italic">{payment.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
            >
              Hủy
            </button>
            <button
              disabled={loading || !amount || parseAmount(amount) <= 0 || parseAmount(amount) > remaining}
              onClick={handleSubmit}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProjectTransactionModalProps {
  project?: Project; // Optional - có thể chọn từ dropdown
  projects: Project[]; // Danh sách tất cả projects
  employees: Employee[];
  onClose: () => void;
  onTransactionAdded: () => void;
}

const ProjectTransactionModal: React.FC<ProjectTransactionModalProps> = ({ project: initialProject, projects, employees, onClose, onTransactionAdded }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProject?.id || projects[0]?.id || '');
  const selectedProject = projects.find(p => p.id === selectedProjectId) || initialProject;
  
  // Update selectedProjectId when initialProject changes
  useEffect(() => {
    if (initialProject && initialProject.id !== selectedProjectId) {
      setSelectedProjectId(initialProject.id);
    }
  }, [initialProject?.id]);
  
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');
  const [recipientId, setRecipientId] = useState('');
  const [receiptImageUrl, setReceiptImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<ProjectTransaction[]>(selectedProject?.transactions || []);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<ProjectTransaction | null>(null);

  // Load transactions when modal opens or project changes (lazy load for better performance)
  useEffect(() => {
    if (!selectedProject) return;
    
    const loadTransactions = async () => {
      if (!selectedProject.transactions || selectedProject.transactions.length === 0) {
        setLoadingTransactions(true);
        try {
          const loadedTransactions = await projectService.loadProjectTransactions(selectedProject.id);
          setTransactions(loadedTransactions);
        } catch (error) {
          console.error('Error loading transactions:', error);
        } finally {
          setLoadingTransactions(false);
        }
      } else {
        setTransactions(selectedProject.transactions);
      }
    };
    loadTransactions();
  }, [selectedProject?.id]);

  // Reset form when editing transaction changes
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      const numbers = editingTransaction.amount.toString().replace(/\D/g, '');
      setAmount(numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
      setDescription(editingTransaction.description || '');
      setTransactionDate(format(parseISO(editingTransaction.transactionDate), "yyyy-MM-dd'T'HH:mm"));
      setPaymentDate(editingTransaction.paymentDate ? format(parseISO(editingTransaction.paymentDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
      setStatus(editingTransaction.status);
      setRecipientId(editingTransaction.recipientId || '');
      setReceiptImageUrl(editingTransaction.receiptImageUrl || '');
    } else {
      // Reset form for new transaction
      setAmount('');
      setDescription('');
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setStatus('pending');
      setTransactionDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setRecipientId('');
      setReceiptImageUrl('');
    }
  }, [editingTransaction]);

  // Format price with dots (1.000.000)
  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setAmount(formatted);
  };

  const parseAmount = (value: string): number => {
    const numbers = value.replace(/\D/g, '');
    return numbers ? Number(numbers) : 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Convert to base64 for now (có thể thay bằng Supabase Storage sau)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setReceiptImageUrl(base64String);
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert('Lỗi khi đọc file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Không thể tải ảnh lên');
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      alert('Vui lòng chọn dự án');
      return;
    }

    const transactionAmount = parseAmount(amount);
    if (!transactionAmount || transactionAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (type === 'expense' && !recipientId) {
      alert('Vui lòng chọn người nhận');
      return;
    }

    setLoading(true);
    try {
      if (editingTransaction) {
        // Update existing transaction
        const updatedTransaction = await projectTransactionService.update(editingTransaction.id, {
          type,
          amount: transactionAmount,
          description: description.trim() || undefined,
          transactionDate: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
          paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
          status: status,
          recipientId: type === 'expense' ? recipientId : undefined,
          receiptImageUrl: type === 'expense' && receiptImageUrl ? receiptImageUrl : undefined
        });
        // Update local transactions state
        setTransactions(transactions.map(t => t.id === editingTransaction.id ? updatedTransaction : t));
        setEditingTransaction(null);
      } else {
        // Create new transaction
        const newTransaction = await projectTransactionService.create(selectedProjectId, {
          type,
          amount: transactionAmount,
          description: description.trim() || undefined,
          transactionDate: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
          paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
          status: status,
          recipientId: type === 'expense' ? recipientId : undefined,
          receiptImageUrl: type === 'expense' && receiptImageUrl ? receiptImageUrl : undefined
        });
        // Update local transactions state
        setTransactions([newTransaction, ...transactions]);
      }
      // Reset form
      setEditingTransaction(null);
      onTransactionAdded();
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      alert(editingTransaction ? 'Không thể cập nhật giao dịch. Vui lòng thử lại.' : 'Không thể tạo giao dịch. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm('Bạn có chắc muốn xóa giao dịch này?')) return;

    setLoading(true);
    try {
      await projectTransactionService.delete(transactionId);
      // Update local transactions state
      setTransactions(transactions.filter(t => t.id !== transactionId));
      if (editingTransaction?.id === transactionId) {
        setEditingTransaction(null);
      }
      onTransactionAdded();
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      alert('Không thể xóa giao dịch. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: ProjectTransaction) => {
    setEditingTransaction(transaction);
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
  };

  // Calculate balance from loaded transactions (chỉ tính income đã thanh toán và expense đã chi)
  const totalIncome = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900">Thu chi dự án</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {/* Hàng 1: Chọn dự án, Loại giao dịch, Số tiền */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Chọn dự án *</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  // Reset transactions when project changes
                  setTransactions([]);
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                required
              >
                <option value="">-- Chọn dự án --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Loại giao dịch</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setType('income')}
                  className={`py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 text-sm ${
                    type === 'income'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ArrowUpCircle size={16} />
                  Thu
                </button>
                <button
                  onClick={() => setType('expense')}
                  className={`py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 text-sm ${
                    type === 'expense'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ArrowDownCircle size={16} />
                  Chi
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Số tiền (VNĐ)</label>
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                placeholder="1.000.000"
                value={amount}
                onChange={handleAmountChange}
              />
            </div>
          </div>

          {selectedProject && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-600 mb-2">Dự án: <span className="font-semibold text-slate-900">{selectedProject.name}</span></div>
              <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Tổng thu</div>
                <div className="text-sm font-bold text-emerald-600">{formatCurrency(totalIncome)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Tổng chi</div>
                <div className="text-sm font-bold text-rose-600">{formatCurrency(totalExpense)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Số dư</div>
                <div className={`text-sm font-bold ${balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {formatCurrency(balance)}
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Hàng 2: Ngày, Trạng thái, Thời gian tạo / Người nhận */}
          {type === 'income' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ngày thu</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Trạng thái</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('pending')}
                    className={`py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 text-sm ${
                      status === 'pending'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Chờ
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('paid')}
                    className={`py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 text-sm ${
                      status === 'paid'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Đã
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Thời gian tạo</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {type === 'expense' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ngày sẽ chi</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Trạng thái</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('pending')}
                      className={`py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 text-sm ${
                        status === 'pending'
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Chờ
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('paid')}
                      className={`py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 text-sm ${
                        status === 'paid'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Đã
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Thời gian tạo</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Người nhận <span className="text-rose-500">*</span></label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                >
                  <option value="">-- Chọn người nhận --</option>
                  {(() => {
                    const grouped = employees.reduce((acc, emp) => {
                      const dept = emp.department || 'Khác';
                      if (!acc[dept]) acc[dept] = [];
                      acc[dept].push(emp);
                      return acc;
                    }, {} as Record<string, typeof employees>);
                    return Object.keys(grouped).sort().map(dept => (
                      <optgroup key={dept} label={dept}>
                        {grouped[dept].map(e => (
                          <option key={e.id} value={e.id}>{e.fullName}</option>
                        ))}
                      </optgroup>
                    ));
                  })()}
                </select>
              </div>
            </>
          )}

          {/* Hàng 3: Mô tả, Hóa đơn (nếu expense), Nút submit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Mô tả</label>
              <textarea
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-sm"
                placeholder="Ghi chú về giao dịch..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {type === 'expense' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hóa đơn</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="receipt-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="receipt-upload"
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all text-sm ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? (
                    <>
                      <Clock size={16} className="text-indigo-600 animate-spin" />
                      <span className="text-xs text-slate-600">Đang tải...</span>
                    </>
                  ) : receiptImageUrl ? (
                    <>
                      <ImageIcon size={16} className="text-emerald-600" />
                      <span className="text-xs text-emerald-600 font-medium">Đã tải</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="text-slate-400" />
                      <span className="text-xs text-slate-600">Tải ảnh</span>
                    </>
                  )}
                </label>
                {receiptImageUrl && (
                  <div className="relative mt-2">
                    <img
                      src={receiptImageUrl}
                      alt="Hóa đơn"
                      className="w-full h-32 object-contain rounded-xl border border-slate-200"
                    />
                    <button
                      onClick={() => setReceiptImageUrl('')}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-md hover:bg-rose-50 text-rose-500 transition-all"
                      title="Xóa ảnh"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            {editingTransaction ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                >
                  Hủy sửa
                </button>
                <button
                  disabled={loading || !amount || parseAmount(amount) <= 0}
                  onClick={handleSubmit}
                  className={`flex-1 py-3 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    type === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {loading ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                >
                  Hủy
                </button>
                <button
                  disabled={loading || !amount || parseAmount(amount) <= 0}
                  onClick={handleSubmit}
                  className={`flex-1 py-3 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    type === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {loading ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </>
            )}
          </div>

          {/* Transactions List */}
          {selectedProject && transactions.length > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Danh sách giao dịch</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-4 text-slate-500">
                    <Clock className="animate-spin mr-2" size={16} />
                    <span className="text-sm">Đang tải...</span>
                  </div>
                ) : (
                  transactions.map(transaction => (
                    <div
                      key={transaction.id}
                      className={`p-3 rounded-lg border ${
                        editingTransaction?.id === transaction.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      } transition-all`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              transaction.type === 'income' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {transaction.type === 'income' ? 'Thu' : 'Chi'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              transaction.status === 'paid' 
                                ? 'bg-indigo-100 text-indigo-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {transaction.status === 'paid' 
                                ? (transaction.type === 'income' ? 'Đã thanh toán' : 'Đã chi') 
                                : (transaction.type === 'income' ? 'Chờ thanh toán' : 'Chờ chi')}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900">
                            {formatCurrency(transaction.amount)} VNĐ
                          </div>
                          {transaction.description && (
                            <div className="text-xs text-slate-500 mt-1 truncate">
                              {transaction.description}
                            </div>
                          )}
                          <div className="text-xs text-slate-400 mt-1">
                            {format(parseISO(transaction.transactionDate), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Sửa"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProjectModal: React.FC<ProjectModalProps> = ({ onClose, onSubmit, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  
  // Format price with dots (1.000.000)
  const formatPrice = (value: string) => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '');
    // Add dots as thousand separators
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const [price, setPrice] = useState(
    initialData?.price ? formatPrice(initialData.price.toString()) : ''
  );

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setPrice(formatted);
  };

  const parsePrice = (value: string): number | undefined => {
    const numbers = value.replace(/\D/g, '');
    return numbers ? Number(numbers) : undefined;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900">{initialData ? 'Cập nhật dự án' : 'Tạo dự án mới'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>
        {initialData?.createdAt && (
          <div className="mb-4 p-3 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500 mb-1">Thời gian tạo dự án</div>
            <div className="text-sm font-medium text-slate-700">
              {format(parseISO(initialData.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên dự án</label>
            <input
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              placeholder="Ví dụ: Landing Page AI"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
            <textarea
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
              placeholder="Dự án này nói về điều gì?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Giá dự án (VNĐ)</label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              placeholder="Nhập giá dự án (ví dụ: 1.000.000)..."
              value={price}
              onChange={handlePriceChange}
            />
          </div>
          <button
            disabled={!name}
            onClick={() => onSubmit(name, description, parsePrice(price))}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4"
          >
            {initialData ? 'Lưu thay đổi' : 'Tạo ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskTypeManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [types, setTypes] = useState<TaskType[]>([]);
  const [newType, setNewType] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTypes(); }, []);

  const loadTypes = async () => {
    const data = await taskTypeService.getAll();
    setTypes(data);
  };

  const handleAdd = async () => {
    if (!newType.trim()) return;
    setLoading(true);
    try {
      await taskTypeService.create(newType.trim());
      setNewType('');
      await loadTypes();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa loại công việc này?')) return;
    try {
      await taskTypeService.delete(id);
      await loadTypes();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-900">Quản lý Loại việc</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Tên loại mới..."
            value={newType}
            onChange={e => setNewType(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            disabled={loading || !newType}
            onClick={handleAdd}
            className="bg-indigo-600 text-white p-2 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
          {types.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Chưa có loại công việc nào</p>}
          {types.map(t => (
            <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl group hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all">
              <span className="font-medium text-slate-700">{t.name}</span>
              <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TaskModal: React.FC<TaskModalProps> = ({ onClose, onSubmit, projects, initialProjectId, taskTypes, onManageTypes, employees, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [projectId, setProjectId] = useState(initialData?.projectId || initialProjectId || (projects[0]?.id || ''));
  const [deadline, setDeadline] = useState(initialData?.deadline || format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>(initialData?.priority || 'Medium');
  const [taskType, setTaskType] = useState(initialData?.taskType || (taskTypes.length > 0 ? taskTypes[0].name : ''));
  const [assigneeId, setAssigneeId] = useState(initialData?.assigneeId || ''); // Legacy
  const [assignees, setAssignees] = useState<Array<{ employeeId: string; commission: number }>>(
    initialData?.assignees?.map(a => ({ employeeId: a.employeeId, commission: a.commission })) || []
  );

  // Format price with dots (1.000.000)
  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const [price, setPrice] = useState<string>(
    initialData?.price ? formatPrice(initialData.price.toString()) : ''
  );

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setPrice(formatted);
  };

  const parsePrice = (value: string): number | undefined => {
    const numbers = value.replace(/\D/g, '');
    return numbers ? Number(numbers) : undefined;
  };

  // Update default taskType if taskTypes changes and we are not editing
  useEffect(() => {
    if (!initialData && !taskType && taskTypes.length > 0) {
      setTaskType(taskTypes[0].name);
    }
  }, [taskTypes, initialData]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900">{initialData ? 'Cập nhật công việc' : 'Thêm công việc mới'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dự án</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between items-center">
                Loại việc
                <button onClick={onManageTypes} className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  <Settings size={12} /> Sửa
                </button>
              </label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
              >
                <option value="">-- Mặc định --</option>
                {taskTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Người phụ trách (có thể chọn nhiều)</label>
            <div className="space-y-3">
              {assignees.map((assignee, index) => {
                const employee = employees.find(e => e.id === assignee.employeeId);
                return (
                  <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <select
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      value={assignee.employeeId}
                      onChange={(e) => {
                        const newAssignees = [...assignees];
                        newAssignees[index].employeeId = e.target.value;
                        setAssignees(newAssignees);
                      }}
                    >
                      <option value="">-- Chọn người --</option>
                      {(() => {
                        const grouped = employees.reduce((acc, emp) => {
                          const dept = emp.department || 'Khác';
                          if (!acc[dept]) acc[dept] = [];
                          acc[dept].push(emp);
                          return acc;
                        }, {} as Record<string, typeof employees>);
                        return Object.keys(grouped).sort().map(dept => (
                          <optgroup key={dept} label={dept}>
                            {grouped[dept].map(e => (
                              <option key={e.id} value={e.id}>{e.fullName}</option>
                            ))}
                          </optgroup>
                        ));
                      })()}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Hoa hồng"
                        className="w-32 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                        value={assignee.commission || ''}
                        onChange={(e) => {
                          const newAssignees = [...assignees];
                          newAssignees[index].commission = parseFloat(e.target.value) || 0;
                          setAssignees(newAssignees);
                        }}
                      />
                      <span className="text-xs text-slate-500">VNĐ</span>
                    </div>
                    <button
                      onClick={() => setAssignees(assignees.filter((_, i) => i !== index))}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() => setAssignees([...assignees, { employeeId: '', commission: 0 }])}
                className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Thêm người phụ trách
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Công việc</label>
            <input
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Ghi lại việc cần làm..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hạn chót</label>
            <input
              type="datetime-local"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(['Low', 'Medium', 'High'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`py-2 rounded-xl text-sm font-medium border transition-all ${priority === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <div>
            <textarea
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              placeholder="Chi tiết thêm (không bắt buộc)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Giá (VNĐ)</label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Nhập giá công việc (ví dụ: 1.000.000)..."
              value={price}
              onChange={handlePriceChange}
            />
          </div>
          <button
            disabled={!title || !projectId}
            onClick={() => onSubmit({ 
              title, 
              description, 
              projectId, 
              deadline, 
              priority, 
              taskType, 
              assigneeId,
              price: parsePrice(price),
              assignees: assignees.filter(a => a.employeeId).map(a => ({
                employeeId: a.employeeId,
                commission: a.commission || 0
              }))
            })}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 mt-4"
          >
            {initialData ? 'Lưu thay đổi' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
};



interface ThuChiViewProps {
  projects: Project[];
  employees: Employee[];
  onTransactionAdded: () => void;
}

const ThuChiView: React.FC<ThuChiViewProps> = ({ projects, employees, onTransactionAdded }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  const [transactionType, setTransactionType] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'thisMonth' | 'thisQuarter' | 'thisYear' | 'custom'>('all');
  const [customDateStart, setCustomDateStart] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [customDateEnd, setCustomDateEnd] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedProjectForTransaction, setSelectedProjectForTransaction] = useState<Project | null>(null);
  const [allTransactions, setAllTransactions] = useState<ProjectTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedChart, setExpandedChart] = useState<'cashFlow' | 'expectedCashFlow' | 'dailyComparison' | null>(null);

  // Load all transactions
  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      try {
        const transactions: ProjectTransaction[] = [];
        for (const project of projects) {
          const projectTransactions = await projectService.loadProjectTransactions(project.id);
          transactions.push(...projectTransactions);
        }
        // Sort by transaction date (newest first)
        transactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
        setAllTransactions(transactions);
      } catch (error) {
        console.error('Error loading transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [projects]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;

    // Filter by project
    if (selectedProjectId !== 'all') {
      filtered = filtered.filter(t => t.projectId === selectedProjectId);
    }

    // Filter by type
    if (transactionType !== 'all') {
      filtered = filtered.filter(t => t.type === transactionType);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Filter by date - always use customDateStart and customDateEnd if set
    if (customDateStart && customDateEnd) {
      const dateStart = new Date(customDateStart);
      const dateEnd = new Date(customDateEnd);
      dateEnd.setHours(23, 59, 59);
      
      filtered = filtered.filter(t => {
        const checkDate = t.paymentDate ? new Date(t.paymentDate) : new Date(t.transactionDate);
        return checkDate >= dateStart && checkDate <= dateEnd;
      });
    } else if (dateFilter !== 'all') {
      const now = new Date();
      let dateStart: Date | null = null;
      let dateEnd: Date | null = null;

      if (dateFilter === 'thisMonth') {
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (dateFilter === 'thisQuarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        dateStart = new Date(now.getFullYear(), quarter * 3, 1);
        dateEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
      } else if (dateFilter === 'thisYear') {
        dateStart = new Date(now.getFullYear(), 0, 1);
        dateEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      }

      if (dateStart && dateEnd) {
        filtered = filtered.filter(t => {
          const checkDate = t.paymentDate ? new Date(t.paymentDate) : new Date(t.transactionDate);
          return checkDate >= dateStart! && checkDate <= dateEnd!;
        });
      }
    }

    return filtered;
  }, [allTransactions, selectedProjectId, transactionType, statusFilter, dateFilter, customDateStart, customDateEnd]);

  // Calculate totals
  const totals = useMemo(() => {
    const incomePaid = filteredTransactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const incomePending = filteredTransactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    const expensePaid = filteredTransactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const expensePending = filteredTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    // Số dư = Tổng thu (đã thanh toán) - Tổng chi (đã chi)
    const balance = incomePaid - expensePaid;
    // Còn lại (dự kiến) = Tổng thu (chờ thanh toán) - Tổng chi (Chờ thanh toán)
    const expectedBalance = incomePending - expensePending;
    return {
      incomePaid,
      incomePending,
      expensePaid,
      expensePending,
      balance,
      expectedBalance
    };
  }, [filteredTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  // Prepare chart data for cash flow
  const chartData = useMemo(() => {
    if (!customDateStart || !customDateEnd) return [];

    const startDate = new Date(customDateStart);
    const endDate = new Date(customDateEnd);
    
    // Always group by day
    const grouped: Record<string, { income: number; expense: number; balance: number }> = {};
    
    filteredTransactions.forEach(t => {
      const date = t.paymentDate ? new Date(t.paymentDate) : new Date(t.transactionDate);
      const key = format(date, 'dd/MM/yyyy', { locale: vi });
      
      if (!grouped[key]) {
        grouped[key] = { income: 0, expense: 0, balance: 0 };
      }
      
      if (t.type === 'income' && t.status === 'paid') {
        grouped[key].income += t.amount;
        grouped[key].balance += t.amount;
      } else if (t.type === 'expense' && t.status === 'paid') {
        grouped[key].expense += t.amount;
        grouped[key].balance -= t.amount;
      }
    });
    
    return Object.keys(grouped)
      .sort((a, b) => {
        // Sort by date
        return new Date(a.split('/').reverse().join('-')).getTime() - new Date(b.split('/').reverse().join('-')).getTime();
      })
      .map(key => ({
        date: key,
        thu: grouped[key].income,
        chi: grouped[key].expense,
        soDu: grouped[key].balance
      }));
  }, [filteredTransactions, customDateStart, customDateEnd]);

  // Prepare daily comparison data
  const dailyData = useMemo(() => {
    if (!customDateStart || !customDateEnd) return [];
    
    const grouped: Record<string, { income: number; expense: number }> = {};
    
    filteredTransactions.forEach(t => {
      const date = t.paymentDate ? new Date(t.paymentDate) : new Date(t.transactionDate);
      const dayKey = format(date, 'dd/MM/yyyy', { locale: vi });
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = { income: 0, expense: 0 };
      }
      
      if (t.type === 'income' && t.status === 'paid') {
        grouped[dayKey].income += t.amount;
      } else if (t.type === 'expense' && t.status === 'paid') {
        grouped[dayKey].expense += t.amount;
      }
    });
    
    return Object.keys(grouped)
      .sort((a, b) => {
        // Sort by date
        return new Date(a.split('/').reverse().join('-')).getTime() - new Date(b.split('/').reverse().join('-')).getTime();
      })
      .map(key => ({
        ngay: key,
        thu: grouped[key].income,
        chi: grouped[key].expense
      }));
  }, [filteredTransactions, customDateStart, customDateEnd]);

  // Prepare expected cash flow data (pending transactions)
  const expectedChartData = useMemo(() => {
    if (!customDateStart || !customDateEnd) return [];

    const startDate = new Date(customDateStart);
    const endDate = new Date(customDateEnd);
    
    // Always group by day
    const grouped: Record<string, { income: number; expense: number; balance: number }> = {};
    
    filteredTransactions.forEach(t => {
      // Only include pending transactions
      if (t.status !== 'pending') return;
      
      // Dự kiến phải lấy theo ngày sẽ chi (paymentDate)
      // Nếu không có paymentDate thì bỏ qua (vì không biết khi nào sẽ chi)
      if (!t.paymentDate) return;
      
      const date = new Date(t.paymentDate);
      const key = format(date, 'dd/MM/yyyy', { locale: vi });
      
      if (!grouped[key]) {
        grouped[key] = { income: 0, expense: 0, balance: 0 };
      }
      
      if (t.type === 'income') {
        grouped[key].income += t.amount;
        grouped[key].balance += t.amount;
      } else if (t.type === 'expense') {
        grouped[key].expense += t.amount;
        grouped[key].balance -= t.amount;
      }
    });
    
    const sortedData = Object.keys(grouped)
      .sort((a, b) => {
        // Sort by date
        return new Date(a.split('/').reverse().join('-')).getTime() - new Date(b.split('/').reverse().join('-')).getTime();
      })
      .map(key => ({
        date: key,
        thuDuKien: grouped[key].income,
        chiDuKien: grouped[key].expense,
        soDuDuKien: grouped[key].balance
      }));
    
    // Tính số dư lũy kế (tổng các số dư ngày trước)
    let cumulativeBalance = 0;
    return sortedData.map(item => {
      cumulativeBalance += item.soDuDuKien;
      return {
        ...item,
        soDuDuKienLuyKe: cumulativeBalance
      };
    });
  }, [filteredTransactions, customDateStart, customDateEnd]);

  const handleAddTransaction = (project: Project) => {
    setSelectedProjectForTransaction(project);
    setIsTransactionModalOpen(true);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Bạn có chắc muốn xóa giao dịch này?')) return;

    try {
      await projectTransactionService.delete(transactionId);
      // Reload all transactions
      const transactions: ProjectTransaction[] = [];
      for (const project of projects) {
        const projectTransactions = await projectService.loadProjectTransactions(project.id);
        transactions.push(...projectTransactions);
      }
      transactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      setAllTransactions(transactions);
      onTransactionAdded();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Không thể xóa giao dịch. Vui lòng thử lại.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filters */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Dự án</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Tất cả dự án</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Loại</label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as 'all' | 'income' | 'expense')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Tất cả</option>
              <option value="income">Thu</option>
              <option value="expense">Chi</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'paid')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ</option>
              <option value="paid">Đã thanh toán</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Thời gian nhanh</label>
            <select
              value={dateFilter}
              onChange={(e) => {
                const value = e.target.value as 'all' | 'thisMonth' | 'thisQuarter' | 'thisYear' | 'custom';
                setDateFilter(value);
                if (value !== 'custom') {
                  const now = new Date();
                  if (value === 'thisMonth') {
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    setCustomDateStart(start.toISOString().split('T')[0]);
                    setCustomDateEnd(now.toISOString().split('T')[0]);
                  } else if (value === 'thisQuarter') {
                    const quarter = Math.floor(now.getMonth() / 3);
                    const start = new Date(now.getFullYear(), quarter * 3, 1);
                    setCustomDateStart(start.toISOString().split('T')[0]);
                    setCustomDateEnd(now.toISOString().split('T')[0]);
                  } else if (value === 'thisYear') {
                    const start = new Date(now.getFullYear(), 0, 1);
                    setCustomDateStart(start.toISOString().split('T')[0]);
                    setCustomDateEnd(now.toISOString().split('T')[0]);
                  }
                }
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Tất cả</option>
              <option value="thisMonth">Tháng này</option>
              <option value="thisQuarter">Quý này</option>
              <option value="thisYear">Năm này</option>
              <option value="custom">Tùy chỉnh</option>
            </select>
          </div>
        </div>
        {/* Date Range Picker - Always visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Calendar size={14} />
              Lọc theo ngày
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <span className="text-slate-500 font-medium">đến</span>
              <input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                onClick={() => {
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth(), 1);
                  setCustomDateStart(start.toISOString().split('T')[0]);
                  setCustomDateEnd(now.toISOString().split('T')[0]);
                  setDateFilter('thisMonth');
                }}
                className="px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              >
                Tháng này
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="px-4 py-3 bg-emerald-50 rounded-lg border-2 border-emerald-200">
          <div className="text-xs font-semibold text-emerald-700 uppercase mb-1">Tổng thu (đã thanh toán)</div>
          <div className="text-lg font-black text-emerald-600">{formatCurrency(totals.incomePaid)} VNĐ</div>
        </div>
        <div className="px-4 py-3 bg-amber-50 rounded-lg border-2 border-amber-200">
          <div className="text-xs font-semibold text-amber-700 uppercase mb-1">Tổng thu (chờ thanh toán)</div>
          <div className="text-lg font-black text-amber-600">{formatCurrency(totals.incomePending)} VNĐ</div>
        </div>
        <div className="px-4 py-3 bg-rose-50 rounded-lg border-2 border-rose-200">
          <div className="text-xs font-semibold text-rose-700 uppercase mb-1">Tổng chi (đã chi)</div>
          <div className="text-lg font-black text-rose-600">{formatCurrency(totals.expensePaid)} VNĐ</div>
        </div>
        <div className="px-4 py-3 bg-orange-50 rounded-lg border-2 border-orange-200">
          <div className="text-xs font-semibold text-orange-700 uppercase mb-1">Tổng chi (Chờ thanh toán)</div>
          <div className="text-lg font-black text-orange-600">{formatCurrency(totals.expensePending)} VNĐ</div>
        </div>
        <div className={`px-4 py-3 rounded-lg border-2 ${totals.balance >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-rose-50 border-rose-200'}`}>
          <div className={`text-xs font-semibold uppercase mb-1 ${totals.balance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>Số dư</div>
          <div className={`text-lg font-black ${totals.balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{formatCurrency(totals.balance)} VNĐ</div>
        </div>
        <div className={`px-4 py-3 rounded-lg border-2 ${totals.expectedBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`text-xs font-semibold uppercase mb-1 ${totals.expectedBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Còn lại (dự kiến)</div>
          <div className={`text-lg font-black ${totals.expectedBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(totals.expectedBalance)} VNĐ</div>
        </div>
      </div>

      {/* Cash Flow Charts */}
      {(chartData.length > 0 || dailyData.length > 0 || expectedChartData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Area Chart - Cash Flow Over Time (Stacked like Age of Empires) */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-600" />
                  Dòng tiền theo thời gian
                </h3>
                <button
                  onClick={() => setExpandedChart('cashFlow')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Mở rộng biểu đồ"
                >
                  <Maximize2 size={18} className="text-slate-600" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorThu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorChi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorSoDu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    fontSize={12}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tick={{ fill: '#64748b' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    formatter={(value: number) => `${formatCurrency(value)} VNĐ`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="thu" 
                    stackId="1"
                    stroke="#10b981" 
                    fill="url(#colorThu)"
                    strokeWidth={2}
                    name="Thu"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="chi" 
                    stackId="1"
                    stroke="#ef4444" 
                    fill="url(#colorChi)"
                    strokeWidth={2}
                    name="Chi"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="soDu" 
                    stackId="2"
                    stroke="#6366f1" 
                    fill="url(#colorSoDu)"
                    strokeWidth={2}
                    name="Số dư"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Area Chart - Expected Cash Flow (Pending) */}
          {expectedChartData.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-amber-600" />
                  Dòng tiền dự kiến
                </h3>
                <button
                  onClick={() => setExpandedChart('expectedCashFlow')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Mở rộng biểu đồ"
                >
                  <Maximize2 size={18} className="text-slate-600" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={expectedChartData}>
                  <defs>
                    <linearGradient id="colorThuDuKien" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorChiDuKien" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorSoDuDuKien" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorSoDuDuKienLuyKe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    fontSize={12}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tick={{ fill: '#64748b' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    formatter={(value: number) => `${formatCurrency(value)} VNĐ`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="thuDuKien" 
                    baseValue={0}
                    stroke="#10b981" 
                    fill="url(#colorThuDuKien)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Thu dự kiến"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="chiDuKien" 
                    baseValue={0}
                    stroke="#ef4444" 
                    fill="url(#colorChiDuKien)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Chi dự kiến"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="soDuDuKien" 
                    stackId="2"
                    stroke="#f59e0b" 
                    fill="url(#colorSoDuDuKien)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Số dư dự kiến"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="soDuDuKienLuyKe" 
                    stackId="3"
                    stroke="#3b82f6" 
                    fill="url(#colorSoDuDuKienLuyKe)"
                    strokeWidth={3}
                    strokeDasharray="3 3"
                    name="Số dư dự kiến lũy kế"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bar Chart - Daily Comparison */}
          {dailyData.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-600" />
                  So sánh Thu/Chi theo ngày
                </h3>
                <button
                  onClick={() => setExpandedChart('dailyComparison')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Mở rộng biểu đồ"
                >
                  <Maximize2 size={18} className="text-slate-600" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="ngay" 
                    stroke="#64748b"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tick={{ fill: '#64748b' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    formatter={(value: number) => `${formatCurrency(value)} VNĐ`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="thu" fill="#10b981" name="Thu" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="chi" fill="#ef4444" name="Chi" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <TrendingUp size={24} className="text-indigo-600" />
                {expandedChart === 'cashFlow' && 'Dòng tiền theo thời gian'}
                {expandedChart === 'expectedCashFlow' && 'Dòng tiền dự kiến'}
                {expandedChart === 'dailyComparison' && 'So sánh Thu/Chi theo ngày'}
              </h2>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Đóng"
              >
                <Minimize2 size={20} className="text-slate-600" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              {expandedChart === 'cashFlow' && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%" minHeight={600}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorThuFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorChiFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorSoDuFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      fontSize={14}
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      fontSize={14}
                      tick={{ fill: '#64748b' }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      formatter={(value: number) => `${formatCurrency(value)} VNĐ`}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="thu" 
                      stackId="1"
                      stroke="#10b981" 
                      fill="url(#colorThuFull)"
                      strokeWidth={2}
                      name="Thu"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="chi" 
                      stackId="1"
                      stroke="#ef4444" 
                      fill="url(#colorChiFull)"
                      strokeWidth={2}
                      name="Chi"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="soDu" 
                      stackId="2"
                      stroke="#6366f1" 
                      fill="url(#colorSoDuFull)"
                      strokeWidth={2}
                      name="Số dư"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {expandedChart === 'expectedCashFlow' && expectedChartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%" minHeight={600}>
                  <AreaChart data={expectedChartData}>
                    <defs>
                      <linearGradient id="colorThuDuKienFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorChiDuKienFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorSoDuDuKienFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorSoDuDuKienLuyKeFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      fontSize={14}
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      fontSize={14}
                      tick={{ fill: '#64748b' }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      formatter={(value: number) => `${formatCurrency(value)} VNĐ`}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="thuDuKien" 
                      baseValue={0}
                      stroke="#10b981" 
                      fill="url(#colorThuDuKienFull)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Thu dự kiến"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="chiDuKien" 
                      baseValue={0}
                      stroke="#ef4444" 
                      fill="url(#colorChiDuKienFull)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Chi dự kiến"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="soDuDuKien" 
                      stackId="2"
                      stroke="#f59e0b" 
                      fill="url(#colorSoDuDuKienFull)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Số dư dự kiến"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="soDuDuKienLuyKe" 
                      stackId="3"
                      stroke="#3b82f6" 
                      fill="url(#colorSoDuDuKienLuyKeFull)"
                      strokeWidth={3}
                      strokeDasharray="3 3"
                      name="Số dư dự kiến lũy kế"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {expandedChart === 'dailyComparison' && dailyData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%" minHeight={600}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="ngay" 
                      stroke="#64748b"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      fontSize={14}
                      tick={{ fill: '#64748b' }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      formatter={(value: number) => `${formatCurrency(value)} VNĐ`}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="thu" fill="#10b981" name="Thu" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="chi" fill="#ef4444" name="Chi" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (projects.length > 0) {
              handleAddTransaction(projects[0]);
            } else {
              alert('Vui lòng tạo dự án trước khi thêm transaction');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all"
        >
          <Plus size={16} />
          Thêm thu chi
        </button>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <Clock className="animate-spin mx-auto mb-2" size={24} />
            <p>Đang tải...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <DollarSign className="mx-auto mb-2 text-slate-400" size={32} />
            <p>Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Ngày</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Dự án</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Loại</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Số tiền</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Mô tả</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransactions.map(transaction => {
                  const project = projects.find(p => p.id === transaction.projectId);
                  const dateToShow = transaction.paymentDate || transaction.transactionDate;
                  return (
                    <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {format(parseISO(dateToShow), 'dd/MM/yyyy', { locale: vi })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                        {project?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          transaction.type === 'income' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {transaction.type === 'income' ? 'Thu' : 'Chi'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">
                        {formatCurrency(transaction.amount)} VNĐ
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          transaction.status === 'paid' 
                            ? 'bg-indigo-100 text-indigo-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {transaction.status === 'paid' 
                            ? (transaction.type === 'income' ? 'Đã thanh toán' : 'Đã chi') 
                            : (transaction.type === 'income' ? 'Chờ thanh toán' : 'Chờ chi')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {transaction.description || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const project = projects.find(p => p.id === transaction.projectId);
                              if (project) {
                                setSelectedProjectForTransaction(project);
                                setIsTransactionModalOpen(true);
                                // TODO: Set editing transaction in modal
                              }
                            }}
                            className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-rose-600 hover:text-rose-700 text-xs font-medium flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {isTransactionModalOpen && (
        <ProjectTransactionModal
          project={selectedProjectForTransaction || undefined}
          projects={projects}
          employees={employees}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setSelectedProjectForTransaction(null);
          }}
          onTransactionAdded={async () => {
            onTransactionAdded();
            // Reload transactions
            const transactions: ProjectTransaction[] = [];
            for (const project of projects) {
              const projectTransactions = await projectService.loadProjectTransactions(project.id);
              transactions.push(...projectTransactions);
            }
            transactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
            setAllTransactions(transactions);
          }}
        />
      )}
    </div>
  );
};

const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({ onClose, onSubmit, taskTitle, initialHours }) => {
  const [hoursWorked, setHoursWorked] = useState<string>(initialHours ? initialHours.toString() : '');

  const handleSubmit = () => {
    const hours = parseFloat(hoursWorked);
    if (!isNaN(hours) && hours > 0) {
      onSubmit(hours);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900">Hoàn thành công việc</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-xl">
            <p className="text-sm text-emerald-800 font-medium">{taskTitle}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Số giờ đã làm</label>
            <input
              autoFocus
              type="number"
              step="0.5"
              min="0"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              placeholder="Ví dụ: 2.5"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">Nhập số giờ bạn đã làm việc cho task này</p>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
            >
              Hủy
            </button>
            <button
              disabled={!hoursWorked || parseFloat(hoursWorked) <= 0}
              onClick={handleSubmit}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // State initialization - Now using Supabase instead of LocalStorage
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [activeProjectId, setActiveProjectId] = useState<string | 'all'>('all');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'dashboard' | 'employees' | 'cohoichoai' | 'thuchi' | 'timetracking' | 'employeedetail' | 'projectdetail'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'daily'>('list');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'in_progress' | 'paused' | 'new'>('in_progress');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<Array<{ type: string; taskId: string; data: any }>>([]);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedProjectForTransaction, setSelectedProjectForTransaction] = useState<Project | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [financialDateFilter, setFinancialDateFilter] = useState<'all' | 'thisMonth' | 'thisQuarter' | 'thisYear' | 'custom'>('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  // Monitor online/offline status and sync pending actions
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setDbError(null);
      
      // Try to sync pending actions when back online
      if (pendingActions.length > 0) {
        console.log(`🔄 Back online, syncing ${pendingActions.length} pending actions...`);
        
        for (const action of pendingActions) {
          try {
            if (action.type === 'start') {
              await taskService.startSession(action.taskId);
            } else if (action.type === 'pause') {
              await taskService.pauseSession(action.taskId);
            }
            console.log(`✅ Synced ${action.type} action for task ${action.taskId}`);
          } catch (error) {
            console.error(`❌ Failed to sync ${action.type} action:`, error);
            // Keep in queue if sync fails
          }
        }
        
        // Clear successfully synced actions
        setPendingActions([]);
        
        // Reload tasks to get latest state
        try {
          const reloadedTasks = await taskService.getAll();
          setTasks(reloadedTasks);
        } catch (error) {
          console.error('❌ Failed to reload tasks after sync:', error);
        }
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      if (!dbError) {
        setDbError('Mất kết nối internet. Các thay đổi sẽ được đồng bộ khi có kết nối.');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingActions]);

  // Load data from Supabase on mount (optimized - parallel loading)
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setDbError(null);

        // Test database connection
        console.log('🔌 Testing database connection...');
        await testDatabaseConnection();

        // Load data in parallel for faster loading
        console.log('📦 Loading data in parallel...');
        const [loadedProjects, loadedTasks, loadedTypes, loadedEmployees] = await Promise.allSettled([
          projectService.getAll(),
          taskService.getAllBasic(), // Load basic tasks first (faster, without subtasks/sessions)
          taskTypeService.getAll(),
          employeeService.getAll()
        ]);

        // Process results
        if (loadedProjects.status === 'fulfilled') {
          setProjects(loadedProjects.value);
          console.log('✅ Projects loaded:', loadedProjects.value.length);
        } else {
          console.error('❌ Failed to load projects:', loadedProjects.reason);
          throw loadedProjects.reason; // Critical error
        }

        if (loadedTasks.status === 'fulfilled') {
          setTasks(loadedTasks.value);
          console.log('✅ Tasks loaded (with subtasks):', loadedTasks.value.length);
        } else {
          console.error('❌ Failed to load tasks:', loadedTasks.reason);
          setDbError(`Không thể tải danh sách công việc: ${getErrorMessage(loadedTasks.reason)}`);
          setTasks([]);
        }

        if (loadedTypes.status === 'fulfilled') {
          setTaskTypes(loadedTypes.value);
        } else {
          console.warn('⚠️ Failed to load task types:', loadedTypes.reason);
        }

        if (loadedEmployees.status === 'fulfilled') {
          setEmployees(loadedEmployees.value);
        } else {
          console.warn('⚠️ Failed to load employees:', loadedEmployees.reason);
        }

        console.log('✅ Initial data loaded successfully');
      } catch (error: any) {
        console.error('❌ Error loading data from database:', error);
        setDbError(getErrorMessage(error));

        // Fallback to localStorage if database fails
        console.log('⚠️ Falling back to localStorage...');
        const savedProjects = localStorage.getItem('protrack_projects');
        const savedTasks = localStorage.getItem('protrack_tasks');
        if (savedProjects) setProjects(JSON.parse(savedProjects));
        if (savedTasks) setTasks(JSON.parse(savedTasks));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Load transactions for active project
  useEffect(() => {
    const loadProjectTransactions = async () => {
      if (activeProjectId !== 'all' && activeView === 'dashboard') {
        const activeProject = projects.find(p => p.id === activeProjectId);
        if (activeProject && (!activeProject.transactions || activeProject.transactions.length === 0)) {
          try {
            console.log('📦 Loading transactions for project:', activeProjectId);
            const transactions = await projectService.loadProjectTransactions(activeProjectId);
            setProjects(prevProjects => 
              prevProjects.map(p => 
                p.id === activeProjectId 
                  ? { ...p, transactions }
                  : p
              )
            );
            console.log('✅ Transactions loaded:', transactions.length);
          } catch (error) {
            console.error('Error loading project transactions:', error);
          }
        }
      }
    };

    loadProjectTransactions();
  }, [activeProjectId, activeView]);

  // Load transactions for all projects when showing financial dashboard
  useEffect(() => {
    const loadAllProjectTransactions = async () => {
      if (activeView === 'dashboard' && activeProjectId === 'all' && projects.length > 0) {
        const projectsWithoutTransactions = projects.filter(p => !p.transactions || p.transactions.length === 0);
        if (projectsWithoutTransactions.length > 0) {
          try {
            console.log('📦 Loading transactions for all projects for financial dashboard...');
            const projectsWithTransactions = await Promise.all(
              projectsWithoutTransactions.map(async (project) => {
                try {
                  const transactions = await projectService.loadProjectTransactions(project.id);
                  return { ...project, transactions };
                } catch (error) {
                  console.error(`Error loading transactions for project ${project.id}:`, error);
                  return { ...project, transactions: [] };
                }
              })
            );
            
            setProjects(prevProjects => 
              prevProjects.map(p => {
                const updated = projectsWithTransactions.find(up => up.id === p.id);
                return updated || p;
              })
            );
            console.log('✅ Transactions loaded for financial dashboard');
          } catch (error) {
            console.error('Error loading transactions for financial dashboard:', error);
          }
        }
      }
    };

    loadAllProjectTransactions();
  }, [activeView, activeProjectId]); // Only trigger when view or project selection changes

  // Auto-pause all active sessions when page unloads
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // Pause all active task sessions
      const activeTasks = tasks.filter(t => {
        const hasActiveSession = t.sessions?.some(s => s.startedAt && !s.endedAt);
        return !t.isCompleted && (hasActiveSession || t.startedAt);
      });

      for (const task of activeTasks) {
        try {
          await taskService.pauseSession(task.id);
          console.log('⏸️ Auto-paused task:', task.id);
        } catch (error) {
          console.error('❌ Error auto-pausing task:', error);
        }
      }

      // Pause all active subtask sessions
      for (const task of tasks) {
        if (task.subtasks) {
          for (const subtask of task.subtasks) {
            const hasActiveSession = subtask.sessions?.some(s => s.startedAt && !s.endedAt);
            if (hasActiveSession) {
              try {
                await subtaskService.pauseSession(subtask.id);
                console.log('⏸️ Auto-paused subtask:', subtask.id);
              } catch (error) {
                console.error('❌ Error auto-pausing subtask:', error);
              }
            }
          }
        }
      }
    };

    // Use sendBeacon for better reliability on page unload
    window.addEventListener('beforeunload', (e) => {
      // Use sendBeacon to send pause requests (fire and forget)
      const activeTasks = tasks.filter(t => {
        const hasActiveSession = t.sessions?.some(s => s.startedAt && !s.endedAt);
        return !t.isCompleted && (hasActiveSession || t.startedAt);
      });

      activeTasks.forEach(task => {
        const url = `https://orucrotvccndrjkujyzf.supabase.co/rest/v1/rpc/pause_task_session`;
        const data = JSON.stringify({ task_id: task.id });
        navigator.sendBeacon(url, data);
      });

      // For subtasks, we'll use a simpler approach - just mark in localStorage
      const activeSubtasks: string[] = [];
      tasks.forEach(task => {
        if (task.subtasks) {
          task.subtasks.forEach(subtask => {
            const hasActiveSession = subtask.sessions?.some(s => s.startedAt && !s.endedAt);
            if (hasActiveSession) {
              activeSubtasks.push(subtask.id);
            }
          });
        }
      });
      
      if (activeSubtasks.length > 0) {
        localStorage.setItem('pending_pause_subtasks', JSON.stringify(activeSubtasks));
      }
    });

    // Also handle visibility change (tab switch, minimize)
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Tab is hidden, pause all active sessions
        await handleBeforeUnload();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload as any);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tasks]);

  // Tự động chuyển sang tab "Đang làm" khi vào "Tất cả dự án"
  useEffect(() => {
    if (activeProjectId === 'all') {
      setActiveStatusTab('in_progress');
    }
  }, [activeProjectId]);

  // Filtered Tasks - Tách thành active và completed
  const { activeTasks, completedTasks, categorizedTasks } = useMemo(() => {
    let allTasks = tasks;
    
    // Filter by project
    if (activeProjectId !== 'all') {
      allTasks = allTasks.filter(t => t.projectId === activeProjectId);
    } else {
      // Trong view tổng quan, chỉ hiển thị các task có subtask đang làm
      allTasks = allTasks.filter(t => {
        // Kiểm tra xem task có subtask nào đang làm không (có active session)
        const hasSubtaskActive = t.subtasks?.some(subtask => {
          return subtask.sessions?.some(s => s.startedAt && !s.endedAt);
        });
        return hasSubtaskActive || false;
      });
    }
    
    // Filter by search
    if (searchQuery) {
      allTasks = allTasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Tách thành completed và active
    const completed = allTasks.filter(t => t.isCompleted);
    const active = allTasks.filter(t => !t.isCompleted);

    // Phân loại active tasks theo status
    const categorizedTasks = active.reduce((acc, t) => {
      let status: 'in_progress' | 'paused' | 'new' = 'new';
      const hasActiveSession = t.sessions?.some(s => s.startedAt && !s.endedAt);
      // Kiểm tra xem có subtask nào đang làm không
      const hasSubtaskActive = t.subtasks?.some(subtask => {
        return subtask.sessions?.some(s => s.startedAt && !s.endedAt);
      });
      if (t.startedAt || hasActiveSession || hasSubtaskActive) {
        status = 'in_progress';
      } else if (t.sessions && t.sessions.length > 0) {
        status = 'paused';
      }
      acc[status].push(t);
      return acc;
    }, {
      in_progress: [] as Task[],
      paused: [] as Task[],
      new: [] as Task[]
    });

    // Sắp xếp từng loại theo deadline (sớm nhất trước)
    Object.keys(categorizedTasks).forEach(key => {
      categorizedTasks[key as keyof typeof categorizedTasks].sort((a, b) => 
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      );
    });

    // Filter theo tab đang chọn
    let filteredActive: Task[] = [];
    if (activeStatusTab === 'all') {
      // Nếu đang ở view "Tất cả dự án", hiển thị tất cả active tasks (đã được filter chỉ còn tasks có subtask đang làm)
      if (activeProjectId === 'all') {
        filteredActive = active.sort((a, b) => 
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
      } else {
        // Nếu chọn project cụ thể, hiển thị tất cả active tasks
        filteredActive = active.sort((a, b) => 
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
      }
    } else {
      filteredActive = categorizedTasks[activeStatusTab];
    }

    return {
      activeTasks: filteredActive,
      completedTasks: completed,
      categorizedTasks,
      allActive: active
    };
  }, [tasks, activeProjectId, searchQuery, activeStatusTab]);

  // Filtered tasks để hiển thị (không bao gồm completed nếu chưa bật showCompletedTasks)
  const filteredTasks = useMemo(() => {
    if (showCompletedTasks) {
      return [...activeTasks, ...completedTasks];
    }
    return activeTasks;
  }, [activeTasks, completedTasks, showCompletedTasks]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.isCompleted).length;
    const pending = total - completed;
    const overdue = filteredTasks.filter(t => !t.isCompleted && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline))).length;
    const totalHours = filteredTasks.reduce((acc, t) => acc + (t.hoursWorked || 0), 0);

    return { total, completed, pending, overdue, totalHours };
  }, [filteredTasks]);

  // Tính toán các chỉ số tài chính tổng hợp với bộ lọc thời gian
  const financialStats = useMemo(() => {
    // Tính toán khoảng thời gian filter
    let dateStart: Date | null = null;
    let dateEnd: Date | null = null;
    const now = new Date();
    
    if (financialDateFilter === 'thisMonth') {
      dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (financialDateFilter === 'thisQuarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      dateStart = new Date(now.getFullYear(), quarter * 3, 1);
      dateEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
    } else if (financialDateFilter === 'thisYear') {
      dateStart = new Date(now.getFullYear(), 0, 1);
      dateEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (financialDateFilter === 'custom' && customDateStart && customDateEnd) {
      dateStart = new Date(customDateStart);
      dateEnd = new Date(customDateEnd);
      dateEnd.setHours(23, 59, 59);
    }

    // Helper function để kiểm tra transaction có trong khoảng thời gian không
    const isInDateRange = (transactionDate: string, paymentDate?: string) => {
      if (!dateStart || !dateEnd) return true; // Nếu không có filter, trả về true
      // Với income, kiểm tra paymentDate nếu có, nếu không thì dùng transactionDate
      const checkDate = paymentDate ? new Date(paymentDate) : new Date(transactionDate);
      return checkDate >= dateStart && checkDate <= dateEnd;
    };

    // Helper function để tính số tiền cần thu (chỉ tính income pending trong khoảng thời gian)
    const calculateAmountToCollect = (project: Project) => {
      const projectIncomePending = project.transactions?.filter(t => 
        t.type === 'income' && 
        t.status === 'pending' && 
        isInDateRange(t.transactionDate, t.paymentDate)
      ).reduce((sum, t) => sum + t.amount, 0) || 0;
      return projectIncomePending;
    };

    let totalProjectValue = 0;
    let totalIncome = 0;
    let totalIncomePending = 0;
    let totalExpense = 0;
    let totalExpensePending = 0;
    let totalAmountToCollect = 0;
    let totalBalance = 0;
    let totalProfit = 0;
    const projectFinancials: Array<{ name: string; value: number; income: number; expense: number; toCollect: number; profit: number }> = [];

    projects.forEach(project => {
      const projectPrice = project.price || 0;
      // Chỉ tính income đã thanh toán (status = 'paid') vào tổng thu, có filter thời gian
      const projectIncomePaid = project.transactions?.filter(t => 
        t.type === 'income' && 
        t.status === 'paid' && 
        isInDateRange(t.transactionDate, t.paymentDate)
      ).reduce((sum, t) => sum + t.amount, 0) || 0;
      // Tính income chờ thanh toán (status = 'pending'), có filter thời gian
      const projectIncomePending = project.transactions?.filter(t => 
        t.type === 'income' && 
        t.status === 'pending' && 
        isInDateRange(t.transactionDate, t.paymentDate)
      ).reduce((sum, t) => sum + t.amount, 0) || 0;
      // Chỉ tính expense đã chi (status = 'paid') vào tổng chi, có filter thời gian
      const projectExpensePaid = project.transactions?.filter(t => 
        t.type === 'expense' && 
        t.status === 'paid' && 
        isInDateRange(t.transactionDate, t.paymentDate)
      ).reduce((sum, t) => sum + t.amount, 0) || 0;
      // Tính expense chờ chi (status = 'pending'), có filter thời gian
      const projectExpensePending = project.transactions?.filter(t => 
        t.type === 'expense' && 
        t.status === 'pending' && 
        isInDateRange(t.transactionDate, t.paymentDate)
      ).reduce((sum, t) => sum + t.amount, 0) || 0;
      const projectBalance = projectIncomePaid - projectExpensePaid;
      // Lợi nhuận = Thu - Chi
      const projectProfit = projectIncomePaid - projectExpensePaid;
      // Số tiền cần thu = Tổng thu (chờ thanh toán trong khoảng thời gian đã chọn)
      // Chỉ tính các transaction income có status = 'pending' trong khoảng thời gian
      const projectToCollect = calculateAmountToCollect(project);

      totalProjectValue += projectPrice;
      totalIncome += projectIncomePaid; // Chỉ tính income đã thanh toán
      totalIncomePending += projectIncomePending; // Tổng thu chờ thanh toán
      totalExpense += projectExpensePaid; // Chỉ tính expense đã chi
      totalExpensePending += projectExpensePending; // Tổng chi chờ chi
      totalBalance += projectBalance;
      totalProfit += projectProfit;
      totalAmountToCollect += projectToCollect;

      if (projectPrice > 0 || projectIncomePaid > 0 || projectIncomePending > 0 || projectExpensePaid > 0 || projectExpensePending > 0) {
        projectFinancials.push({
          name: project.name,
          value: projectPrice,
          income: projectIncomePaid, // Chỉ hiển thị income đã thanh toán
          expense: projectExpensePaid,
          toCollect: projectToCollect,
          profit: projectProfit
        });
      }
    });

    // Tính tổng tất cả các trạng thái để tính phần trăm
    const totalAll = totalIncome + totalIncomePending + totalExpense + totalExpensePending + totalAmountToCollect;

    // Tính phần trăm cho từng trạng thái
    const financialStatusData = [
      {
        name: 'Thu đã thanh toán',
        value: totalIncome,
        percentage: totalAll > 0 ? (totalIncome / totalAll) * 100 : 0,
        color: '#10b981'
      },
      {
        name: 'Thu chờ thanh toán',
        value: totalIncomePending,
        percentage: totalAll > 0 ? (totalIncomePending / totalAll) * 100 : 0,
        color: '#f59e0b'
      },
      {
        name: 'Chi đã chi',
        value: totalExpense,
        percentage: totalAll > 0 ? (totalExpense / totalAll) * 100 : 0,
        color: '#ef4444'
      },
      {
        name: 'Chi chờ chi',
        value: totalExpensePending,
        percentage: totalAll > 0 ? (totalExpensePending / totalAll) * 100 : 0,
        color: '#f97316'
      },
      {
        name: 'Cần thu',
        value: totalAmountToCollect,
        percentage: totalAll > 0 ? (totalAmountToCollect / totalAll) * 100 : 0,
        color: '#8b5cf6'
      }
    ].filter(item => item.value > 0); // Chỉ hiển thị các trạng thái có giá trị > 0

    // Dữ liệu cho biểu đồ lợi nhuận theo dự án
    const profitByProjectData = projectFinancials.map(project => ({
      name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
      fullName: project.name,
      profit: project.profit
    })).filter(item => item.profit !== 0); // Chỉ hiển thị dự án có lợi nhuận khác 0

    // Dữ liệu cho biểu đồ phần trăm bám đuổi thu chi (tỷ lệ thu/chi theo dự án)
    const incomeExpenseRatioData = projectFinancials.map(project => {
      const income = project.income;
      const expense = project.expense;
      const total = income + expense;
      const incomePercent = total > 0 ? (income / total) * 100 : 0;
      const expensePercent = total > 0 ? (expense / total) * 100 : 0;
      
      return {
        name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
        fullName: project.name,
        income: income,
        expense: expense,
        incomePercent: incomePercent,
        expensePercent: expensePercent
      };
    }).filter(item => item.income > 0 || item.expense > 0); // Chỉ hiển thị dự án có thu hoặc chi

    return {
      totalProjectValue,
      totalIncome,
      totalExpense,
      totalAmountToCollect,
      totalBalance,
      totalProfit,
      projectFinancials,
      financialStatusData,
      profitByProjectData,
      incomeExpenseRatioData
    };
  }, [projects, financialDateFilter, customDateStart, customDateEnd]);

  // Handlers
  const handleAddProject = async (name: string, description: string, price?: number) => {
    try {
      if (editingProject) {
        // Update existing project
        const updatedProject = await projectService.update(editingProject.id, {
          name,
          description,
          price
        });
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
        setIsProjectModalOpen(false);
        setEditingProject(null);
        console.log('✅ Project updated:', updatedProject.name);
      } else {
        // Create new project
        const newProject = await projectService.create({
          name,
          description,
          price,
          color: COLORS[projects.length % COLORS.length]
        });

        setProjects([...projects, newProject]);
        setIsProjectModalOpen(false);
        console.log('✅ Project created:', newProject.name);
      }
    } catch (error: any) {
      console.error('❌ Error saving project:', error);
      alert('Không thể lưu dự án. Vui lòng thử lại.');
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (editingTask) {
        // Update existing task
        const updatedTask = await taskService.update(editingTask.id, {
          ...taskData,
          price: taskData.price,
          assignees: taskData.assignees || []
        });
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        console.log('✅ Task updated:', updatedTask);
        setEditingTask(null);
      } else {
        // Create new task
        const newTask = await taskService.create({
          title: taskData.title,
          description: taskData.description,
          projectId: taskData.projectId,
          deadline: taskData.deadline,
          priority: taskData.priority,
          taskType: taskData.taskType,
          assigneeId: taskData.assigneeId,
          price: taskData.price,
          assignees: taskData.assignees || [],
          isCompleted: false
        });
        setTasks(prevTasks => [newTask, ...prevTasks]);
        console.log('✅ Task created:', newTask);
      }
      setIsTaskModalOpen(false);
    } catch (error: any) {
      console.error('❌ Error saving task:', error);
      const errorMessage = error?.message || error?.details || 'Có lỗi xảy ra khi lưu công việc';
      alert(`Lỗi: ${errorMessage}\n\nVui lòng kiểm tra Console (F12) để xem chi tiết.`);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    setTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  }, []);

  const toggleTaskCompletion = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Optimistic update
    const isNowCompleted = !task.isCompleted;
    setTasks(prevTasks => prevTasks.map(t => 
      t.id === id 
        ? {
            ...t,
            isCompleted: isNowCompleted,
            completedAt: isNowCompleted ? new Date().toISOString() : undefined
          }
        : t
    ));

    try {
      // Sync with database
      await taskService.toggleComplete(id);
      console.log('✅ Task toggled');
    } catch (error: any) {
      console.error('❌ Error toggling task:', error);
      // Revert optimistic update
      setTasks(prevTasks => prevTasks.map(t => t.id === id ? task : t));
      alert('Không thể cập nhật task. Đã khôi phục trạng thái.');
    }
  };

  const handleStartTask = useCallback(async (id: string) => {
    let originalTask: Task | undefined;
    
    // Optimistic update - update UI immediately
    const now = new Date().toISOString();
    setTasks(prevTasks => {
      const task = prevTasks.find(t => t.id === id);
      if (!task) return prevTasks;
      originalTask = task;
      
      return prevTasks.map(t => 
        t.id === id 
          ? { 
              ...t, 
              startedAt: t.startedAt || now,
              sessions: [
                ...(t.sessions || []),
                { id: 'temp', taskId: id, startedAt: now }
              ]
            }
          : t
      );
    });

    try {
      await taskService.startSession(id);
      // Reload only the specific task to get accurate state
      const updatedTask = await taskService.getById(id);
      if (updatedTask) {
        setTasks(prevTasks => prevTasks.map(t => t.id === id ? updatedTask : t));
      }
      console.log('✅ Task started:', id);
    } catch (error: any) {
      console.error('❌ Error starting task:', error);
      
      if (isNetworkError(error)) {
        // Don't revert - keep optimistic update and queue for sync later
        setPendingActions(prev => [...prev, { type: 'start', taskId: id, data: { startedAt: now } }]);
        setDbError('Mất kết nối. Thay đổi sẽ được đồng bộ khi có kết nối.');
        console.log('📝 Queued start action for later sync');
      } else {
        // Revert optimistic update for other errors
        if (originalTask) {
          setTasks(prevTasks => prevTasks.map(t => t.id === id ? originalTask! : t));
        }
        alert(`Không thể bắt đầu task: ${getErrorMessage(error)}`);
      }
    }
  }, []);

  const handlePauseTask = useCallback(async (id: string) => {
    let originalTask: Task | undefined;
    
    // Optimistic update - update UI immediately
    const now = new Date().toISOString();
    setTasks(prevTasks => {
      const task = prevTasks.find(t => t.id === id);
      if (!task) return prevTasks;
      originalTask = task;
      
      return prevTasks.map(t => {
        if (t.id !== id) return t;
        
        // Mark the latest active session as ended
        const updatedSessions = (t.sessions || []).map(s => {
          if (s.startedAt && !s.endedAt) {
            return { ...s, endedAt: now };
          }
          return s;
        });

        return {
          ...t,
          startedAt: undefined,
          sessions: updatedSessions
        };
      });
    });

    try {
      await taskService.pauseSession(id);
      // Reload only the specific task to get accurate state
      const updatedTask = await taskService.getById(id);
      if (updatedTask) {
        setTasks(prevTasks => prevTasks.map(t => t.id === id ? updatedTask : t));
      }
      console.log('⏸️ Task paused:', id);
    } catch (error: any) {
      console.error('❌ Error pausing task:', error);
      
      if (isNetworkError(error)) {
        // Don't revert - keep optimistic update and queue for sync later
        setPendingActions(prev => [...prev, { type: 'pause', taskId: id, data: { pausedAt: now } }]);
        setDbError('Mất kết nối. Thay đổi sẽ được đồng bộ khi có kết nối.');
        console.log('📝 Queued pause action for later sync');
      } else {
        // Revert optimistic update for other errors
        if (originalTask) {
          setTasks(prevTasks => prevTasks.map(t => t.id === id ? originalTask! : t));
        }
        alert(`Không thể tạm dừng task: ${getErrorMessage(error)}`);
      }
    }
  }, []);

  const handleCompleteTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Auto-pause tất cả active sessions trước khi complete
    if (task.subtasks) {
      for (const subtask of task.subtasks) {
        const hasActiveSession = subtask.sessions?.some(s => s.startedAt && !s.endedAt);
        if (hasActiveSession) {
          try {
            await subtaskService.pauseSession(subtask.id);
            console.log('⏸️ Auto-paused subtask before complete:', subtask.id);
          } catch (error) {
            console.error('❌ Error pausing subtask:', error);
          }
        }
      }
    }

    // Reload task để có dữ liệu subtasks mới nhất (sau khi pause)
    const reloadedTask = await taskService.getById(task.id);
    const taskToUse = reloadedTask || task;

    // Tính tổng giờ từ tất cả subtasks (chỉ tính sessions đã pause - có endedAt)
    let totalMinutes = 0;
    if (taskToUse.subtasks) {
      taskToUse.subtasks.forEach(subtask => {
        if (subtask.sessions) {
          subtask.sessions.forEach(session => {
            // Chỉ tính các session đã pause (có endedAt)
            if (session.startedAt && session.endedAt) {
              totalMinutes += differenceInMinutes(parseISO(session.endedAt), parseISO(session.startedAt));
            }
          });
        }
      });
    }

    const totalHours = totalMinutes / 60;

    try {
      // Update task với tổng giờ đã tính
      const updatedTask = await taskService.completeWithHours(taskToUse.id, totalHours);

      // Reload task để có dữ liệu mới nhất
      const finalTask = await taskService.getById(taskToUse.id);
      if (finalTask) {
        setTasks(tasks.map(t => t.id === taskToUse.id ? finalTask : t));
      } else {
        setTasks(tasks.map(t => t.id === taskToUse.id ? updatedTask : t));
      }
      
      console.log('✅ Task completed with', totalHours.toFixed(2), 'hours (calculated from paused subtask sessions)');
    } catch (error: any) {
      console.error('❌ Error completing task:', error);
      alert('Không thể hoàn thành task. Vui lòng thử lại.');
    }
  }, [tasks]);

  const deleteTask = async (id: string) => {
    try {
      await taskService.delete(id);
      setTasks(tasks.filter(t => t.id !== id));
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      console.log('✅ Task deleted');
    } catch (error: any) {
      console.error('❌ Error deleting task:', error);
      alert('Không thể xóa task. Vui lòng thử lại.');
    }
  };

  const handleSelectTask = (id: string, selected: boolean) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === activeTasks.length) {
      // Bỏ chọn tất cả
      setSelectedTasks(new Set());
    } else {
      // Chọn tất cả
      setSelectedTasks(new Set(activeTasks.map(t => t.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTasks.size === 0) return;
    
    if (!confirm(`Bạn có chắc muốn xóa ${selectedTasks.size} task đã chọn?`)) {
      return;
    }

    const idsToDelete = Array.from(selectedTasks);
    let successCount = 0;
    let failCount = 0;

    for (const id of idsToDelete) {
      try {
        await taskService.delete(id);
        successCount++;
      } catch (error) {
        console.error('❌ Error deleting task:', id, error);
        failCount++;
      }
    }

    // Update tasks
    setTasks(tasks.filter(t => !selectedTasks.has(t.id)));
    setSelectedTasks(new Set());

    if (failCount > 0) {
      alert(`Đã xóa ${successCount} task. ${failCount} task không thể xóa.`);
    } else {
      console.log(`✅ Đã xóa ${successCount} task`);
    }
  };

  // Tự động bắt đầu các công việc khi chọn subtab "Đang làm"
  useEffect(() => {
    if (activeStatusTab === 'in_progress' && viewMode === 'list' && categorizedTasks) {
      // Lấy danh sách tasks trong tab "Đang làm" nhưng chưa được start
      const tasksToStart = categorizedTasks.in_progress.filter(task => {
        if (task.isCompleted) return false;
        const hasActiveSession = task.sessions?.some(s => s.startedAt && !s.endedAt);
        const hasStarted = !!task.startedAt;
        // Chỉ start những task chưa được start (có thể đã được phân loại là in_progress nhưng chưa thực sự start)
        return !hasStarted && !hasActiveSession;
      });

      // Tự động start các tasks chưa được start (chỉ start một lần khi tab được chọn)
      if (tasksToStart.length > 0) {
        console.log(`🚀 Tự động bắt đầu ${tasksToStart.length} công việc trong tab "Đang làm"`);
        // Start từng task một cách tuần tự để tránh quá tải
        tasksToStart.forEach((task, index) => {
          setTimeout(() => {
            handleStartTask(task.id).catch(error => {
              console.error(`❌ Không thể tự động bắt đầu task ${task.id}:`, error);
            });
          }, index * 100); // Delay 100ms giữa mỗi task
        });
      }
    }
  }, [activeStatusTab, viewMode, categorizedTasks, handleStartTask]); // Chỉ chạy khi tab thay đổi

  const deleteProject = async (id: string) => {
    try {
      await projectService.delete(id);
      setProjects(projects.filter(p => p.id !== id));
      setTasks(tasks.filter(t => t.projectId !== id));
      if (activeProjectId === id) setActiveProjectId('all');
      console.log('✅ Project deleted');
    } catch (error: any) {
      console.error('❌ Error deleting project:', error);
      alert('Không thể xóa dự án. Vui lòng thử lại.');
    }
  };

  const handleAiSuggest = async (pId: string) => {
    const project = projects.find(p => p.id === pId);
    if (!project) return;

    setIsAiLoading(true);
    const suggested = await suggestTasksForProject(project.name, project.description);

    if (suggested && Array.isArray(suggested)) {
      const newTasks: Task[] = suggested.map(s => ({
        id: crypto.randomUUID(),
        projectId: pId,
        title: s.title,
        description: s.description,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isCompleted: false,
        priority: s.priority as any
      }));
      setTasks([...tasks, ...newTasks]);
    }
    setIsAiLoading(false);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {activeView !== 'employeedetail' && activeView !== 'projectdetail' && (
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 w-72 bg-white border-r border-slate-200 p-4 flex flex-col gap-6 h-screen overflow-y-auto z-30 transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <LayoutDashboard size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">ProTrack AI</h1>
        </div>

        <nav className="flex flex-col gap-1">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-sm ${activeView === 'dashboard' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('employees')}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-sm ${activeView === 'employees' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Users size={16} />
            Nhân sự
          </button>
          <button
            onClick={() => setActiveView('cohoichoai')}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-sm ${activeView === 'cohoichoai' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Briefcase size={16} />
            Cơ hội
          </button>
          <button
            onClick={() => setActiveView('baogia')}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-sm ${activeView === 'baogia' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <FileText size={16} />
            Báo giá
          </button>
          <button
            onClick={() => setActiveView('thuchi')}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-sm ${activeView === 'thuchi' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <DollarSign size={16} />
            Thu chi
          </button>
          <button
            onClick={() => setActiveView('timetracking')}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-sm ${activeView === 'timetracking' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Clock size={16} />
            Bấm giờ
          </button>

          <div className="h-px bg-slate-200 my-2 mx-1"></div>

          <button
            onClick={() => { setActiveView('dashboard'); setActiveProjectId('all'); }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-sm ${activeView === 'dashboard' && activeProjectId === 'all' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Briefcase size={16} />
            Tất cả dự án
          </button>

          <div className="mt-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dự án</span>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="p-0.5 hover:bg-slate-100 rounded text-slate-500 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {/* Search bar for projects */}
            <div className="px-2 mb-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Tìm dự án..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {projectSearchQuery && (
                  <button
                    onClick={() => setProjectSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
            {/* Filtered projects as cards */}
            {(() => {
              const filteredProjects = projects.filter(p => 
                p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                (p.description && p.description.toLowerCase().includes(projectSearchQuery.toLowerCase()))
              );
              
              if (filteredProjects.length === 0 && projectSearchQuery) {
                return (
                  <div className="px-2 py-4 text-center text-xs text-slate-400">
                    Không tìm thấy dự án nào
                  </div>
                );
              }
              
              return (
                <div className="grid grid-cols-1 gap-2 px-2">
                  {filteredProjects.map(p => {
                    const pTasks = tasks.filter(t => t.projectId === p.id);
                    const total = pTasks.length;
                    const completed = pTasks.filter(t => t.isCompleted).length;
                    const percent = total > 0 ? (completed / total) * 100 : 0;
                    
                    // Tính toán khoảng thời gian filter
                    let dateStart: Date | null = null;
                    let dateEnd: Date | null = null;
                    const now = new Date();
                    
                    if (financialDateFilter === 'thisMonth') {
                      dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
                      dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    } else if (financialDateFilter === 'thisQuarter') {
                      const quarter = Math.floor(now.getMonth() / 3);
                      dateStart = new Date(now.getFullYear(), quarter * 3, 1);
                      dateEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
                    } else if (financialDateFilter === 'thisYear') {
                      dateStart = new Date(now.getFullYear(), 0, 1);
                      dateEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                    } else if (financialDateFilter === 'custom' && customDateStart && customDateEnd) {
                      dateStart = new Date(customDateStart);
                      dateEnd = new Date(customDateEnd);
                      dateEnd.setHours(23, 59, 59);
                    }
                    
                    // Áp dụng bộ lọc ngày cho các tính toán
                    const isInDateRangeForProject = (transactionDate: string, paymentDate?: string) => {
                      if (!dateStart || !dateEnd) return true;
                      const checkDate = paymentDate ? new Date(paymentDate) : new Date(transactionDate);
                      return checkDate >= dateStart && checkDate <= dateEnd;
                    };
                    
                    // Chỉ tính income đã thanh toán trong khoảng thời gian
                    const totalIncome = p.transactions?.filter(t => 
                      t.type === 'income' && 
                      t.status === 'paid' && 
                      isInDateRangeForProject(t.transactionDate, t.paymentDate)
                    ).reduce((sum, t) => sum + t.amount, 0) || 0;
                    
                    // Số tiền cần thu = chỉ tính income pending trong khoảng thời gian
                    const amountToCollect = p.transactions?.filter(t => 
                      t.type === 'income' && 
                      t.status === 'pending' && 
                      isInDateRangeForProject(t.transactionDate, t.paymentDate)
                    ).reduce((sum, t) => sum + t.amount, 0) || 0;
                    
                    const totalExpense = p.transactions?.filter(t => 
                      t.type === 'expense' && 
                      t.status === 'paid' && 
                      isInDateRangeForProject(t.transactionDate, t.paymentDate)
                    ).reduce((sum, t) => sum + t.amount, 0) || 0;
                    const balance = totalIncome - totalExpense;
                    
                    return (
                      <div
                        key={p.id}
                        className={`group relative p-3 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                          activeProjectId === p.id && activeView === 'dashboard'
                            ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-indigo-200'
                        }`}
                        onClick={() => {
                          setSelectedProject(p);
                          setActiveView('projectdetail');
                        }}
                      >
                        {/* Project header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: p.color }} />
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-semibold truncate ${
                                activeProjectId === p.id && activeView === 'dashboard' ? 'text-indigo-700' : 'text-slate-700'
                              }`}>
                                {p.name}
                              </h4>
                              {p.description && (
                                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{p.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProjectForTransaction(p);
                                setIsTransactionModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-500 transition-all"
                              title="Thu chi"
                            >
                              <DollarSign size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProject(p);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-500 transition-all"
                              title="Sửa"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(p.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 transition-all"
                              title="Xóa"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        {total > 0 && (
                          <div className="mb-2">
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${percent}%`,
                                  backgroundColor: percent === 100 ? '#10b981' : p.color
                                }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {completed}/{total} công việc
                            </div>
                          </div>
                        )}
                        
                        {/* Financial info */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                          {p.price && p.price > 0 && (
                            <div className="text-[10px]">
                              <div className="text-slate-500">Giá dự án</div>
                              <div className="font-semibold text-violet-600">
                                {new Intl.NumberFormat('vi-VN').format(p.price)} VNĐ
                              </div>
                            </div>
                          )}
                          <div className="text-[10px]">
                            <div className="text-slate-500">Tổng thu</div>
                            <div className="font-semibold text-emerald-600">
                              {new Intl.NumberFormat('vi-VN').format(totalIncome)} VNĐ
                            </div>
                          </div>
                          {p.price && p.price > 0 && (
                            <div className="text-[10px]">
                              <div className="text-slate-500">Số tiền cần thu</div>
                              <div className={`font-semibold ${amountToCollect > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {new Intl.NumberFormat('vi-VN').format(amountToCollect)} VNĐ
                              </div>
                            </div>
                          )}
                          <div className="text-[10px]">
                            <div className="text-slate-500">Số dư</div>
                            <div className={`font-semibold ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {new Intl.NumberFormat('vi-VN').format(balance)} VNĐ
                            </div>
                          </div>
                        </div>
                        
                        {/* Created date */}
                        {p.createdAt && (
                          <div className="text-[9px] text-slate-400 mt-1.5">
                            {format(parseISO(p.createdAt), 'dd/MM/yyyy', { locale: vi })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </nav>
      </aside>
      )}

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className={`flex-1 ${activeView === 'employeedetail' || activeView === 'projectdetail' ? 'p-0' : 'p-4 md:p-6 lg:p-8'} ${activeView === 'projectdetail' ? 'max-w-full' : 'max-w-6xl'} w-full transition-all duration-300`}>
        {/* Error Banner */}
        {dbError && (
          <div className={`mb-4 p-4 border rounded-lg flex items-center justify-between ${
            !isOnline 
              ? 'bg-amber-50 border-amber-200' 
              : 'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle className={!isOnline ? "text-amber-600" : "text-rose-600"} size={20} />
              <p className={`text-sm ${!isOnline ? 'text-amber-800' : 'text-rose-800'}`}>
                {dbError}
                {pendingActions.length > 0 && ` (${pendingActions.length} thao tác đang chờ)`}
              </p>
            </div>
            <button
              onClick={() => setDbError(null)}
              className={!isOnline ? "text-amber-600 hover:text-amber-800" : "text-rose-600 hover:text-rose-800"}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Online/Offline Indicator */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
            <p className="text-sm text-amber-800 font-medium">Chế độ offline - Đang chờ kết nối...</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-2">
            <Clock className="text-indigo-600 animate-spin" size={20} />
            <p className="text-sm text-indigo-800">Đang tải dữ liệu...</p>
          </div>
        )}

        {activeView !== 'employeedetail' && activeView !== 'projectdetail' && (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-4">
              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu size={24} className="text-slate-700" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900">
                {activeView === 'employees' ? 'Quản lý Nhân sự' : activeView === 'cohoichoai' ? 'Cơ Hội Cho AI' : activeView === 'baogia' ? 'Báo Giá' : activeView === 'thuchi' ? 'Quản lý Thu Chi' : activeView === 'timetracking' ? 'Bấm giờ' : activeProjectId === 'all' ? 'Tổng quan Công việc' : projects.find(p => p.id === activeProjectId)?.name}
              </h2>
              {activeView === 'dashboard' && activeProjectId !== 'all' && (() => {
                const activeProject = projects.find(p => p.id === activeProjectId);
                if (!activeProject) return null;
                
                // Lấy dateStart và dateEnd từ financialDateFilter
                let dateStart: Date | null = null;
                let dateEnd: Date | null = null;
                const now = new Date();
                
                if (financialDateFilter === 'thisMonth') {
                  dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
                  dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                } else if (financialDateFilter === 'thisQuarter') {
                  const quarter = Math.floor(now.getMonth() / 3);
                  dateStart = new Date(now.getFullYear(), quarter * 3, 1);
                  dateEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
                } else if (financialDateFilter === 'thisYear') {
                  dateStart = new Date(now.getFullYear(), 0, 1);
                  dateEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                } else if (financialDateFilter === 'custom' && customDateStart && customDateEnd) {
                  dateStart = new Date(customDateStart);
                  dateEnd = new Date(customDateEnd);
                  dateEnd.setHours(23, 59, 59);
                }
                
                // Áp dụng bộ lọc ngày cho các tính toán
                const isInDateRangeForActiveProject = (transactionDate: string, paymentDate?: string) => {
                  if (!dateStart || !dateEnd) return true;
                  const checkDate = paymentDate ? new Date(paymentDate) : new Date(transactionDate);
                  return checkDate >= dateStart && checkDate <= dateEnd;
                };
                
                // Chỉ tính income đã thanh toán (status = 'paid') trong khoảng thời gian
                const totalIncome = activeProject.transactions?.filter(t => 
                  t.type === 'income' && 
                  t.status === 'paid' && 
                  isInDateRangeForActiveProject(t.transactionDate, t.paymentDate)
                ).reduce((sum, t) => sum + t.amount, 0) || 0;
                
                const totalExpense = activeProject.transactions?.filter(t => 
                  t.type === 'expense' && 
                  t.status === 'paid' && 
                  isInDateRangeForActiveProject(t.transactionDate, t.paymentDate)
                ).reduce((sum, t) => sum + t.amount, 0) || 0;
                const balance = totalIncome - totalExpense;
                const formatCurrency = (amount: number) => {
                  return new Intl.NumberFormat('vi-VN').format(amount);
                };

                // Tính tỷ lệ tiến độ thu tiền (chỉ tính income đã thanh toán)
                const paymentProgress = activeProject.price && activeProject.price > 0 
                  ? Math.min((totalIncome / activeProject.price) * 100, 100) 
                  : 0;

                // Số tiền cần thu = chỉ tính income pending trong khoảng thời gian
                const amountToCollect = activeProject.transactions?.filter(t => 
                  t.type === 'income' && 
                  t.status === 'pending' && 
                  isInDateRangeForActiveProject(t.transactionDate, t.paymentDate)
                ).reduce((sum, t) => sum + t.amount, 0) || 0;

                return (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {activeProject.price && activeProject.price > 0 && (
                        <div className="px-4 py-2.5 bg-violet-50 rounded-xl border-2 border-violet-200 shadow-sm">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                              <DollarSign size={16} className="text-violet-600" />
                              <span className="text-sm font-black text-violet-700 uppercase tracking-wide">Giá dự án</span>
                            </div>
                            <div className="text-sm font-black text-violet-600 mt-0.5">
                              {formatCurrency(activeProject.price)} VNĐ
                            </div>
                          </div>
                        </div>
                      )}
                    <div className="px-4 py-2.5 bg-emerald-50 rounded-xl border-2 border-emerald-200 shadow-sm">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <ArrowUpCircle size={16} className="text-emerald-600" />
                          <span className="text-sm font-black text-emerald-700 uppercase tracking-wide">Tổng thu</span>
                        </div>
                        <div className="text-sm font-black text-emerald-600 mt-0.5">
                          {formatCurrency(totalIncome)} VNĐ
                        </div>
                      </div>
                    </div>
                    {activeProject.price && activeProject.price > 0 && (
                      <div className={`px-4 py-2.5 rounded-xl border-2 shadow-sm ${amountToCollect > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <DollarSign size={16} className={amountToCollect > 0 ? 'text-amber-600' : 'text-emerald-600'} />
                            <span className={`text-sm font-black uppercase tracking-wide ${amountToCollect > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Số tiền cần thu</span>
                          </div>
                          <div className={`text-sm font-black mt-0.5 ${amountToCollect > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {formatCurrency(amountToCollect)} VNĐ
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="px-4 py-2.5 bg-rose-50 rounded-xl border-2 border-rose-200 shadow-sm">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <ArrowDownCircle size={16} className="text-rose-600" />
                          <span className="text-sm font-black text-rose-700 uppercase tracking-wide">Tổng chi</span>
                        </div>
                        <div className="text-sm font-black text-rose-600 mt-0.5">
                          {formatCurrency(totalExpense)} VNĐ
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-2.5 rounded-xl border-2 shadow-sm ${balance >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-rose-50 border-rose-200'}`}>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <DollarSign size={16} className={balance >= 0 ? 'text-indigo-600' : 'text-rose-600'} />
                          <span className={`text-sm font-black uppercase tracking-wide ${balance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>Số dư</span>
                        </div>
                        <div className={`text-sm font-black mt-0.5 ${balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                          {formatCurrency(balance)} VNĐ
                        </div>
                      </div>
                    </div>
                      <button
                        onClick={() => {
                          setSelectedProjectForTransaction(activeProject);
                          setIsTransactionModalOpen(true);
                        }}
                        className="px-3 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-md"
                      >
                        <DollarSign size={14} />
                        Thu chi
                      </button>
                    </div>
                    {/* Thanh tiến độ thu tiền */}
                    {activeProject.price && activeProject.price > 0 && (
                      <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-violet-50 rounded-xl border-2 border-emerald-200/50 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle size={16} className="text-emerald-600" />
                            <span className="text-sm font-bold text-slate-700">Tiến độ thu tiền</span>
                          </div>
                          <span className="text-sm font-black text-emerald-600">
                            {paymentProgress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-1"
                            style={{ width: `${paymentProgress}%` }}
                          >
                            {paymentProgress > 10 && (
                              <span className="text-[10px] font-bold text-white">
                                {formatCurrency(totalIncome)} / {formatCurrency(activeProject.price)}
                              </span>
                            )}
                          </div>
                        </div>
                        {paymentProgress <= 10 && (
                          <div className="mt-1 text-xs text-slate-600 text-right">
                            {formatCurrency(totalIncome)} / {formatCurrency(activeProject.price)} VNĐ
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            {activeView !== 'dashboard' && activeView !== 'baogia' && activeView !== 'thuchi' && (
              <p className="text-slate-500 mt-1 text-sm">
                {activeView === 'employees' ? 'Quản lý danh sách nhân viên và thông tin chi tiết.' : activeView === 'cohoichoai' ? 'Chuẩn hóa cách cá nhân hóa quy trình quản trị doanh nghiệp.' : activeView === 'timetracking' ? 'Theo dõi và quản lý thời gian làm việc của nhân viên.' : ''}
              </p>
            )}
          </div>
        </header>
        )}

        {/* Search bar below header */}
        {activeView === 'dashboard' && (
          <div className="flex items-center gap-3 mb-6">
            <div className="relative group flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm công việc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all w-full"
              />
            </div>

            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-all"
            >
              <Plus size={16} />
              Thêm việc
            </button>
          </div>
        )}

        {activeView === 'dashboard' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              <StatCard icon={<Briefcase size={18} className="text-indigo-600" />} label="Tổng công việc" value={stats.total} color="indigo" />
              <StatCard icon={<CheckCircle2 size={18} className="text-emerald-600" />} label="Hoàn thành" value={stats.completed} color="emerald" />
              <StatCard icon={<Clock size={18} className="text-amber-600" />} label="Đang chờ" value={stats.pending} color="amber" />
              <StatCard icon={<AlertCircle size={18} className="text-rose-600" />} label="Trễ hạn" value={stats.overdue} color="rose" />
              <StatCard icon={<Sparkles size={18} className="text-violet-600" />} label="Tổng giờ làm" value={stats.totalHours} color="indigo" />
            </div>

            {/* Financial Dashboard - Chỉ hiển thị khi chọn "Tất cả dự án" */}
            {activeProjectId === 'all' && (
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <DollarSign size={20} className="text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-800">Dashboard Tài Chính Tổng Hợp</h3>
                </div>
                
                {/* Bộ lọc thời gian - Từ ngày tới ngày */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={financialDateFilter}
                    onChange={(e) => {
                      const newFilter = e.target.value as 'all' | 'thisMonth' | 'thisQuarter' | 'thisYear' | 'custom';
                      setFinancialDateFilter(newFilter);
                      if (newFilter !== 'custom') {
                        setCustomDateStart('');
                        setCustomDateEnd('');
                      }
                    }}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">Tất cả thời gian</option>
                    <option value="thisMonth">Tháng này</option>
                    <option value="thisQuarter">Quý này</option>
                    <option value="thisYear">Năm này</option>
                    <option value="custom">Tùy chỉnh</option>
                  </select>
                  
                  {/* Luôn hiển thị bộ lọc từ ngày tới ngày */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600 whitespace-nowrap">Từ ngày:</label>
                    <input
                      type="date"
                      value={customDateStart}
                      onChange={(e) => {
                        setCustomDateStart(e.target.value);
                        if (e.target.value) {
                          setFinancialDateFilter('custom');
                        }
                      }}
                      className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <label className="text-xs text-slate-600 whitespace-nowrap">Đến ngày:</label>
                    <input
                      type="date"
                      value={customDateEnd}
                      onChange={(e) => {
                        setCustomDateEnd(e.target.value);
                        if (e.target.value) {
                          setFinancialDateFilter('custom');
                        }
                      }}
                      className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>
              
              {/* Financial Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="px-4 py-3 bg-violet-50 rounded-lg border-2 border-violet-200">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={16} className="text-violet-600" />
                    <span className="text-xs font-semibold text-violet-700 uppercase">Tổng giá trị dự án</span>
                  </div>
                  <div className="text-lg font-black text-violet-600">
                    {new Intl.NumberFormat('vi-VN').format(financialStats.totalProjectValue)} VNĐ
                  </div>
                </div>
                
                <div className="px-4 py-3 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpCircle size={16} className="text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700 uppercase">Tổng thu</span>
                  </div>
                  <div className="text-lg font-black text-emerald-600">
                    {new Intl.NumberFormat('vi-VN').format(financialStats.totalIncome)} VNĐ
                  </div>
                </div>
                
                <div className="px-4 py-3 bg-rose-50 rounded-lg border-2 border-rose-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownCircle size={16} className="text-rose-600" />
                    <span className="text-xs font-semibold text-rose-700 uppercase">Tổng chi</span>
                  </div>
                  <div className="text-lg font-black text-rose-600">
                    {new Intl.NumberFormat('vi-VN').format(financialStats.totalExpense)} VNĐ
                  </div>
                </div>
                
                <div className={`px-4 py-3 rounded-lg border-2 ${financialStats.totalAmountToCollect > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={16} className={financialStats.totalAmountToCollect > 0 ? 'text-amber-600' : 'text-emerald-600'} />
                    <span className={`text-xs font-semibold uppercase ${financialStats.totalAmountToCollect > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Số tiền cần thu</span>
                  </div>
                  <div className={`text-lg font-black ${financialStats.totalAmountToCollect > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {new Intl.NumberFormat('vi-VN').format(financialStats.totalAmountToCollect)} VNĐ
                  </div>
                </div>
                
                <div className={`px-4 py-3 rounded-lg border-2 ${financialStats.totalBalance >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={16} className={financialStats.totalBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'} />
                    <span className={`text-xs font-semibold uppercase ${financialStats.totalBalance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>Tổng số dư</span>
                  </div>
                  <div className={`text-lg font-black ${financialStats.totalBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat('vi-VN').format(financialStats.totalBalance)} VNĐ
                  </div>
                </div>
              </div>

              {/* Financial Chart - Biểu đồ phần trăm các trạng thái tiền */}
              {financialStats.financialStatusData && financialStats.financialStatusData.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Phân bổ tài chính theo trạng thái (%)</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={financialStats.financialStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {financialStats.financialStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ'}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Status List */}
                    <div className="space-y-3">
                      {financialStats.financialStatusData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-medium text-slate-700">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">
                              {new Intl.NumberFormat('vi-VN').format(item.value)} VNĐ
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Biểu đồ Lợi nhuận theo tổng và theo dự án */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Lợi nhuận theo dự án</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tổng lợi nhuận - Card */}
                  <div className="px-4 py-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={18} className={financialStats.totalProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'} />
                      <span className="text-xs font-semibold text-slate-700 uppercase">Tổng lợi nhuận</span>
                    </div>
                    <div className={`text-2xl font-black ${financialStats.totalProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                      {new Intl.NumberFormat('vi-VN').format(financialStats.totalProfit)} VNĐ
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {financialStats.totalIncome > 0 && (
                        <span>Tỷ lệ: {((financialStats.totalProfit / financialStats.totalIncome) * 100).toFixed(1)}%</span>
                      )}
                    </div>
                  </div>

                  {/* Biểu đồ lợi nhuận theo dự án */}
                  {financialStats.profitByProjectData && financialStats.profitByProjectData.length > 0 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financialStats.profitByProjectData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis 
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}
                          />
                          <Tooltip 
                            formatter={(value: number, name: string, props: any) => [
                              new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ',
                              'Lợi nhuận'
                            ]}
                            labelFormatter={(label) => `Dự án: ${label}`}
                          />
                          <Bar 
                            dataKey="profit" 
                            radius={[4, 4, 0, 0]}
                          >
                            {financialStats.profitByProjectData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Biểu đồ phần trăm bám đuổi thu chi */}
              {financialStats.incomeExpenseRatioData && financialStats.incomeExpenseRatioData.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Phần trăm bám đuổi thu chi theo dự án</h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialStats.incomeExpenseRatioData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11 }}
                          label={{ value: 'Phần trăm (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === 'incomePercent') {
                              return [`${value.toFixed(1)}%`, 'Thu'];
                            } else if (name === 'expensePercent') {
                              return [`${value.toFixed(1)}%`, 'Chi'];
                            }
                            return [new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ', name === 'income' ? 'Thu' : 'Chi'];
                          }}
                          labelFormatter={(label) => `Dự án: ${label}`}
                        />
                        <Legend 
                          formatter={(value) => {
                            if (value === 'incomePercent') return 'Thu (%)';
                            if (value === 'expensePercent') return 'Chi (%)';
                            return value;
                          }}
                        />
                        <Bar dataKey="incomePercent" stackId="a" fill="#10b981" name="incomePercent" radius={[0, 0, 0, 0]}>
                          {financialStats.incomeExpenseRatioData.map((entry, index) => (
                            <Cell key={`income-cell-${index}`} fill="#10b981" />
                          ))}
                        </Bar>
                        <Bar dataKey="expensePercent" stackId="a" fill="#ef4444" name="expensePercent" radius={[4, 4, 0, 0]}>
                          {financialStats.incomeExpenseRatioData.map((entry, index) => (
                            <Cell key={`expense-cell-${index}`} fill="#ef4444" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Bảng chi tiết phần trăm thu chi */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Dự án</th>
                          <th className="border border-slate-300 px-3 py-2 text-right font-semibold text-slate-700">Thu (VNĐ)</th>
                          <th className="border border-slate-300 px-3 py-2 text-right font-semibold text-slate-700">Chi (VNĐ)</th>
                          <th className="border border-slate-300 px-3 py-2 text-right font-semibold text-slate-700">Thu (%)</th>
                          <th className="border border-slate-300 px-3 py-2 text-right font-semibold text-slate-700">Chi (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialStats.incomeExpenseRatioData.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="border border-slate-300 px-3 py-2 text-slate-700">{item.fullName}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right text-emerald-600 font-medium">
                              {new Intl.NumberFormat('vi-VN').format(item.income)} VNĐ
                            </td>
                            <td className="border border-slate-300 px-3 py-2 text-right text-rose-600 font-medium">
                              {new Intl.NumberFormat('vi-VN').format(item.expense)} VNĐ
                            </td>
                            <td className="border border-slate-300 px-3 py-2 text-right text-emerald-600 font-semibold">
                              {item.incomePercent.toFixed(1)}%
                            </td>
                            <td className="border border-slate-300 px-3 py-2 text-right text-rose-600 font-semibold">
                              {item.expensePercent.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-slate-800">
                      {viewMode === 'list' ? 'Danh sách công việc' : 'Timeline dự án'}
                    </h3>
                    {viewMode === 'list' && activeTasks.length > 0 && (
                      <>
                        <button
                          onClick={handleSelectAll}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                        >
                          {selectedTasks.size === activeTasks.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                        {selectedTasks.size > 0 && (
                          <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={14} />
                            Xóa {selectedTasks.size} đã chọn
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <LayoutDashboard size={14} /> Danh sách
                    </button>
                    <button
                      onClick={() => setViewMode('daily')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'daily' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Calendar size={14} /> Lịch biểu
                    </button>
                    <button
                      onClick={() => setViewMode('timeline')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'timeline' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Clock size={14} /> Timeline
                    </button>
                  </div>
                </div>
                {/* Sub Tabs */}
                {viewMode === 'list' && (
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
                    <button
                      onClick={() => setActiveStatusTab('all')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeStatusTab === 'all'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Tất cả ({(() => {
                        if (activeProjectId === 'all') {
                          // Trong view "Tất cả dự án", tab "Tất cả" chỉ hiển thị tasks đang làm
                          return categorizedTasks?.in_progress?.length || 0;
                        } else {
                          // Trong view project cụ thể, hiển thị tất cả active tasks
                          let allTasks = tasks.filter(t => t.projectId === activeProjectId && !t.isCompleted);
                          if (searchQuery) {
                            allTasks = allTasks.filter(t =>
                              t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              t.description.toLowerCase().includes(searchQuery.toLowerCase())
                            );
                          }
                          return allTasks.length;
                        }
                      })()})
                    </button>
                    <button
                      onClick={() => setActiveStatusTab('in_progress')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeStatusTab === 'in_progress'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Đang làm ({categorizedTasks?.in_progress?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveStatusTab('paused')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeStatusTab === 'paused'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Tạm dừng ({categorizedTasks?.paused?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveStatusTab('new')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeStatusTab === 'new'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Mới ({categorizedTasks?.new?.length || 0})
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-slate-400">
                    {activeTasks.length} công việc
                    {completedTasks.length > 0 && (
                      <span className="text-slate-300"> • {completedTasks.length} đã hoàn thành</span>
                    )}
                  </div>
                  {completedTasks.length > 0 && (
                    <button
                      onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                    >
                      {showCompletedTasks ? (
                        <>
                          <X size={12} />
                          Ẩn task đã hoàn thành
                        </>
                      ) : (
                        <>
                          <CheckCircle size={12} />
                          Xem {completedTasks.length} task đã hoàn thành
                        </>
                      )}
                    </button>
                  )}
                </div>

                {viewMode === 'list' ? (
                  <div className="space-y-2">
                    {activeTasks.length === 0 && completedTasks.length === 0 ? (
                      <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                        <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                          <CheckCircle size={24} />
                        </div>
                        <h4 className="text-slate-900 font-medium">Chưa có công việc nào</h4>
                        <p className="text-slate-500 text-sm mt-1">Hãy bắt đầu bằng cách thêm một công việc mới hoặc sử dụng AI gợi ý.</p>
                      </div>
                    ) : (
                      <>
                        {/* Active Tasks */}
                        {activeTasks.map(task => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggle={toggleTaskCompletion}
                            onDelete={deleteTask}
                            onComplete={handleCompleteTask}
                            onStart={handleStartTask}
                            onPause={handlePauseTask}
                            onEdit={handleEditTask}
                            onTaskUpdate={handleTaskUpdate}
                            projectName={projects.find(p => p.id === task.projectId)?.name || ''}
                            isSelected={selectedTasks.has(task.id)}
                            onSelect={handleSelectTask}
                            employees={employees}
                          />
                        ))}
                        
                        {/* Completed Tasks Section */}
                        {showCompletedTasks && completedTasks.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2 size={16} className="text-emerald-600" />
                              <h4 className="text-sm font-semibold text-slate-700">
                                Đã hoàn thành ({completedTasks.length})
                              </h4>
                            </div>
                            <div className="space-y-2">
                              {completedTasks.map(task => (
                                <TaskItem
                                  key={task.id}
                                  task={task}
                                  onToggle={toggleTaskCompletion}
                                  onDelete={deleteTask}
                                  onComplete={handleCompleteTask}
                                  onStart={handleStartTask}
                                  onPause={handlePauseTask}
                                  onEdit={handleEditTask}
                                  onTaskUpdate={handleTaskUpdate}
                                  projectName={projects.find(p => p.id === task.projectId)?.name || ''}
                                  isSelected={selectedTasks.has(task.id)}
                                  onSelect={handleSelectTask}
                                  employees={employees}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : viewMode === 'daily' ? (
                <DailyTaskView
                  tasks={filteredTasks}
                  projects={projects}
                  employees={employees}
                  onStart={handleStartTask}
                  onPause={handlePauseTask}
                  onComplete={handleCompleteTask}
                  onEdit={handleEditTask}
                />
              ) : (
                <TimelineView tasks={filteredTasks} employees={employees} projects={projects} />
              )}
              </div>

              <div className="space-y-5">
                {/* Active Tasks Today */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h3 className="font-semibold text-slate-800 text-sm">Đang thực hiện</h3>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const runningTasks = tasks.filter(t => t.startedAt && !t.isCompleted && (activeProjectId === 'all' || t.projectId === activeProjectId));

                    if (runningTasks.length === 0) {
                      return <p className="text-slate-400 text-sm italic">Không có công việc nào đang chạy.</p>;
                    }

                    return runningTasks.map(task => {
                      const startTime = task.startedAt ? parseISO(task.startedAt) : new Date();
                      const isStartedToday = isToday(startTime);

                      return (
                        <div key={task.id} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between group hover:shadow-md transition-all duration-300">
                          <div className="min-w-0 pr-2">
                            <div className="text-sm font-medium text-slate-800 line-clamp-1" title={task.title}>{task.title}</div>
                            <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1.5">
                              <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-full border border-emerald-100 shadow-sm">
                                <Clock size={10} className="text-emerald-500" />
                                {isStartedToday ?
                                  `Bắt đầu ${format(startTime, 'HH:mm')}` :
                                  `Từ ${format(startTime, 'dd/MM')}`
                                }
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handlePauseTask(task.id)}
                            className="p-2 bg-white text-emerald-600 rounded-lg shadow-sm border border-emerald-100 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all transform active:scale-95"
                            title="Tạm dừng"
                          >
                            <Pause size={16} />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-3 text-sm">Hạn chót sắp tới</h3>
                <div className="space-y-4">
                  {(() => {
                    const urgentTasks = tasks
                      .filter(t => !t.isCompleted)
                      .sort((a, b) => {
                        const pA = a.priority === 'High' ? 1 : 0;
                        const pB = b.priority === 'High' ? 1 : 0;
                        if (pA !== pB) return pB - pA;
                        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                      });

                    const grouped: { [key: string]: Task[] } = {};
                    urgentTasks.forEach(t => {
                      const pid = t.projectId || 'others';
                      if (!grouped[pid]) grouped[pid] = [];
                      grouped[pid].push(t);
                    });

                    const pids = Object.keys(grouped).sort((a, b) => {
                      const minA = new Date(grouped[a][0].deadline).getTime();
                      const minB = new Date(grouped[b][0].deadline).getTime();
                      return minA - minB;
                    }).slice(0, 4);

                    if (pids.length === 0) return <p className="text-slate-400 text-sm italic">Không có công việc sắp đến hạn</p>;

                    return pids.map(pid => {
                      const project = projects.find(p => p.id === pid);
                      const pName = project ? project.name : 'Chưa phân loại';
                      const pColor = project ? project.color : '#94a3b8';

                      return (
                        <div key={pid} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: pColor }}></div>
                            <h4 className="text-sm font-bold text-slate-700">{pName}</h4>
                          </div>
                          <div className="space-y-3 pl-3 border-l-2 border-slate-100 ml-1">
                            {grouped[pid].slice(0, 3).map(task => {
                              const deadline = parseISO(task.deadline);
                              const now = new Date();
                              const hoursLeft = differenceInHours(deadline, now);
                              const isUrgent = hoursLeft >= 0 && hoursLeft <= 24;

                              return (
                                <div key={task.id} className="flex items-start gap-3 group cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg -ml-1.5 transition-colors" onClick={() => {
                                  setActiveProjectId(task.projectId);
                                  setActiveView('dashboard');
                                  setViewMode('list');
                                }}>
                                  <div className={`mt-0.5 p-1 rounded-full shrink-0 ${isPast(deadline) && !isToday(deadline) ? 'bg-rose-50 text-rose-500' : (isUrgent ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-amber-50 text-amber-500')}`}>
                                    <Clock size={12} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-medium transition-colors line-clamp-1 ${isUrgent ? 'text-rose-600 font-bold' : 'text-slate-600 group-hover:text-indigo-600'}`}>{task.title}</p>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <p className={`text-[10px] font-medium ${isUrgent ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>
                                        {format(deadline, 'HH:mm dd/MM', { locale: vi })}
                                      </p>
                                      {task.priority === 'High' && <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold">Gấp</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
          </div>
        ) : activeView === 'cohoichoai' ? (
          <CoHoiChoAiView />
        ) : activeView === 'baogia' ? (
          <BaoGiaView />
        ) : activeView === 'thuchi' ? (
          <ThuChiView 
            projects={projects} 
            employees={employees}
            onTransactionAdded={async () => {
              // Reload projects to get updated transactions
              try {
                const updatedProjects = await Promise.all(
                  projects.map(async (p) => {
                    const transactions = await projectService.loadProjectTransactions(p.id);
                    return { ...p, transactions };
                  })
                );
                setProjects(updatedProjects);
              } catch (error) {
                console.error('Error reloading transactions:', error);
              }
            }}
          />
        ) : activeView === 'timetracking' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TimeTrackingView employees={employees} />
          </div>
        ) : activeView === 'employeedetail' && selectedEmployee ? (
          <EmployeeDetailView 
            employee={selectedEmployee}
            onBack={() => {
              setSelectedEmployee(null);
              setActiveView('employees');
            }}
            tasks={tasks}
            projects={projects}
          />
        ) : activeView === 'projectdetail' && selectedProject ? (
          <ProjectDetailView
            project={selectedProject}
            onBack={() => {
              setSelectedProject(null);
              setActiveView('dashboard');
              setActiveProjectId('all');
            }}
            employees={employees}
            onEditProject={(project) => {
              setEditingProject(project);
              setIsProjectModalOpen(true);
            }}
            onAddTransaction={(project) => {
              setSelectedProjectForTransaction(project);
              setIsTransactionModalOpen(true);
            }}
            onAddTask={(projectId) => {
              setActiveProjectId(projectId);
              setIsTaskModalOpen(true);
            }}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={async (taskId) => {
              try {
                await taskService.delete(taskId);
                const updatedTasks = await taskService.getAll();
                setTasks(updatedTasks);
              } catch (error) {
                console.error('Error deleting task:', error);
                alert('Không thể xóa công việc');
              }
            }}
          />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <EmployeeManager 
              tasks={tasks} 
              projects={projects}
              onViewEmployee={(employee) => {
                setSelectedEmployee(employee);
                setActiveView('employeedetail');
              }}
            />
          </div>
        )}

        {isProjectModalOpen && (
          <ProjectModal
            onClose={() => {
              setIsProjectModalOpen(false);
              setEditingProject(null);
            }}
            initialData={editingProject || undefined}
            onSubmit={handleAddProject}
          />
        )}
        {isTaskModalOpen && <TaskModal
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleSaveTask}
          projects={projects}
          initialProjectId={activeProjectId === 'all' ? undefined : activeProjectId}
          taskTypes={taskTypes}
          onManageTypes={() => setIsManageTypesOpen(true)}
          employees={employees}
          initialData={editingTask || undefined}
        />}
        {isManageTypesOpen && <TaskTypeManager onClose={async () => {
          setIsManageTypesOpen(false);
          const types = await taskTypeService.getAll();
          setTaskTypes(types);
        }} />}
        {isTransactionModalOpen && (
          <ProjectTransactionModal
            project={selectedProjectForTransaction || undefined}
            projects={projects}
            employees={employees}
            onClose={() => {
              setIsTransactionModalOpen(false);
              setSelectedProjectForTransaction(null);
            }}
            onTransactionAdded={async () => {
              // Reload transactions for all projects to update stats
              try {
                const updatedProjects = await Promise.all(
                  projects.map(async (p) => {
                    try {
                      const transactions = await projectService.loadProjectTransactions(p.id);
                      return { ...p, transactions };
                    } catch (error) {
                      console.error(`Error reloading transactions for project ${p.id}:`, error);
                      return p;
                    }
                  })
                );
                setProjects(updatedProjects);
              } catch (error) {
                console.error('Error reloading transactions:', error);
              }
              setIsTransactionModalOpen(false);
              setSelectedProjectForTransaction(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
