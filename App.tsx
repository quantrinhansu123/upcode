
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
  FileText
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
  Legend
} from 'recharts';
import { format, isPast, isToday, parseISO, differenceInMinutes, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Project, Task, WorkSession, TaskType, Employee, Subtask } from './types';
import { suggestTasksForProject } from './services/geminiService';
import { projectService, taskService, taskTypeService, employeeService, subtaskService } from './services/databaseService';
import testDatabaseConnection from './database/test-connection';
import { EmployeeManager } from './components/EmployeeManager';
import { TimelineView } from './components/TimelineView';
import { DailyTaskView } from './components/DailyTaskView';
import { CoHoiChoAiView } from './components/CoHoiChoAiView';
import { BaoGiaView } from './components/BaoGiaView';
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
}

interface ProjectModalProps {
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
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

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onComplete, onStart, onPause, onEdit, onTaskUpdate, projectName, isSelected = false, onSelect }) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  const isOverdue = !task.isCompleted && isPast(parseISO(task.deadline)) && !isToday(parseISO(task.deadline));
  // Check if task is running: either has startedAt (legacy) or has an active session (no endedAt)
  const hasActiveSession = task.sessions?.some(s => s.startedAt && !s.endedAt);
  const isStarted = (!!task.startedAt || hasActiveSession) && !task.isCompleted;

  const totalWorkedMinutes = useMemo(() => {
    // Chỉ tính các sessions đã kết thúc (có endedAt)
    // Không tính session đang chạy vì nó sẽ được hiển thị trong TaskTimer
    return task.sessions?.reduce((acc, s) => {
      if (s.endedAt && s.startedAt) {
        return acc + differenceInMinutes(parseISO(s.endedAt), parseISO(s.startedAt));
      }
      return acc;
    }, 0) || 0;
  }, [task.sessions]);

  const totalWorked = totalWorkedMinutes > 0
    ? `${Math.floor(totalWorkedMinutes / 60)}h ${totalWorkedMinutes % 60}m`
    : null;

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

  const handleAddSubtask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      const newSubtask = await subtaskService.create(task.id, newSubtaskTitle.trim());
      setSubtasks([...subtasks, newSubtask]);
      setNewSubtaskTitle('');
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

  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      const updatedSubtask = await subtaskService.toggleComplete(subtaskId);
      setSubtasks(subtasks.map(s => s.id === subtaskId ? updatedSubtask : s));
      
      // Update parent task
      const updatedTask = await taskService.getById(task.id);
      if (updatedTask) {
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
          <h4 className={`font-semibold text-slate-800 flex-1 min-w-0 ${task.isCompleted ? 'line-through decoration-slate-400 text-slate-400' : ''}`}>
            <span className="truncate block">{task.title}</span>
          </h4>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${task.priority === 'High' ? 'bg-rose-50 text-rose-600' :
              task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
              }`}>
              {task.priority}
            </span>
            {/* Show total hours from subtasks if available, otherwise show task timer */}
            {totalSubtaskHours > 0 ? (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                {totalSubtaskHours.toFixed(1)}h
              </span>
            ) : isStarted && task.startedAt ? (
              <TaskTimer startedAt={task.startedAt} sessions={task.sessions} />
            ) : totalWorked ? (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {totalWorked}
              </span>
            ) : null}
          </div>
        </div>

        {/* Subtasks Section */}
        {(subtasks.length > 0 || !task.isCompleted) && (
          <div className="mt-3 space-y-1.5">
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
                <div key={subtask.id} className="flex items-center gap-2 group/subtask py-1 px-1.5 rounded hover:bg-slate-50 transition-colors">
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
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="opacity-0 group-hover/subtask:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 transition-all"
                      title="Xóa"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
            
            {!task.isCompleted && (
              <div className="flex items-center gap-2">
                {isAddingSubtask ? (
                  <form onSubmit={handleAddSubtask} className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onBlur={() => {
                        if (!newSubtaskTitle.trim()) setIsAddingSubtask(false);
                      }}
                      placeholder="Nhập tên subtask..."
                      className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      autoFocus
                    />
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
                      }}
                      className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                    >
                      <X size={16} />
                    </button>
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
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {!task.isCompleted && (
          <>
            {isStarted ? (
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
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStart(task.id);
                }}
                className="flex items-center gap-1 px-2 py-1 text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-600 transition-all rounded text-xs font-medium"
                title={totalWorked ? 'Tiếp tục' : 'Bắt đầu'}
              >
                <Play size={14} />
              </button>
            )}
          </>
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
    </div>
  );
};

const ProjectModal: React.FC<ProjectModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900">Tạo dự án mới</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>
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
          <button
            disabled={!name}
            onClick={() => onSubmit(name, description)}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4"
          >
            Tạo ngay
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
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'dashboard' | 'employees' | 'cohoichoai'>('dashboard');
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

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setDbError(null);

        // Test database connection
        console.log('🔌 Testing database connection...');
        await testDatabaseConnection();

        // Load data individually to ensure partial failures don't block the app
        let loadedProjects: Project[] = [];
        try {
          loadedProjects = await projectService.getAll();
        } catch (e) {
          console.error('❌ Failed to load projects:', e);
          throw e; // Critical error, let it fall through to catch block
        }

        let loadedTasks: Task[] = [];
        try {
          loadedTasks = await taskService.getAll();
          console.log('✅ Tasks loaded successfully:', loadedTasks.length);
        } catch (e: any) {
          console.error('❌ Failed to load tasks:', e);
          // Set error but don't throw - allow app to continue with empty tasks
          setDbError(`Không thể tải danh sách công việc: ${getErrorMessage(e)}`);
          loadedTasks = []; // Set empty array as fallback
        }

        let loadedTypes: TaskType[] = [];
        try {
          loadedTypes = await taskTypeService.getAll();
        } catch (e) {
          console.warn('⚠️ Failed to load task types:', e);
        }

        let loadedEmployees: Employee[] = [];
        try {
          loadedEmployees = await employeeService.getAll();
        } catch (e) {
          console.warn('⚠️ Failed to load employees:', e);
        }

        setProjects(loadedProjects);
        setTasks(loadedTasks);
        setTaskTypes(loadedTypes);
        setEmployees(loadedEmployees);
        console.log('✅ Data loaded:', {
          projects: loadedProjects.length,
          tasks: loadedTasks.length,
          types: loadedTypes.length,
          employees: loadedEmployees.length
        });
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
      // Trong view tổng quan, chỉ hiển thị các task đang diễn ra
      allTasks = allTasks.filter(t => {
        // Task đang diễn ra: có startedAt hoặc có session đang chạy
        const hasActiveSession = t.sessions?.some(s => s.startedAt && !s.endedAt);
        const hasStarted = !!t.startedAt;
        return hasActiveSession || hasStarted;
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
      if (t.startedAt || hasActiveSession) {
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
      // Nếu đang ở view "Tất cả dự án", chỉ hiển thị tasks đang làm
      if (activeProjectId === 'all') {
        filteredActive = categorizedTasks.in_progress;
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

  // Handlers
  const handleAddProject = async (name: string, description: string) => {
    try {
      const newProject = await projectService.create({
        name,
        description,
        color: COLORS[projects.length % COLORS.length]
      });

      setProjects([...projects, newProject]);
      setIsProjectModalOpen(false);
      console.log('✅ Project created:', newProject.name);
    } catch (error: any) {
      console.error('❌ Error creating project:', error);
      alert('Không thể tạo dự án. Vui lòng thử lại.');
    }
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (editingTask) {
        // Update existing task
        const updatedTask = await taskService.update(editingTask.id, {
          ...taskData,
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
      <aside className="w-full md:w-56 bg-white border-r border-slate-200 p-4 flex flex-col gap-6 sticky top-0 h-auto md:h-screen overflow-y-auto z-10">
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
            <div className="flex flex-col gap-1">
              {projects.map(p => (
                <div key={p.id} className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                  <button
                    onClick={() => { setActiveView('dashboard'); setActiveProjectId(p.id); }}
                    className={`flex-1 flex flex-col gap-1 text-left min-w-0 ${activeProjectId === p.id && activeView === 'dashboard' ? 'text-indigo-700 font-medium' : 'text-slate-600'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate text-xs">{p.name}</span>
                    </div>
                    {(() => {
                      const pTasks = tasks.filter(t => t.projectId === p.id);
                      const total = pTasks.length;
                      const completed = pTasks.filter(t => t.isCompleted).length;
                      const percent = total > 0 ? (completed / total) * 100 : 0;

                      return total > 0 ? (
                        <div className="ml-3.5 mr-1">
                          <div className="h-0.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: percent === 100 ? '#10b981' : p.color
                              }}
                            />
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl w-full">
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

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeView === 'employees' ? 'Quản lý Nhân sự' : activeView === 'cohoichoai' ? 'Cơ Hội Cho AI' : activeView === 'baogia' ? 'Báo Giá' : activeProjectId === 'all' ? 'Tổng quan Công việc' : projects.find(p => p.id === activeProjectId)?.name}
            </h2>
            {activeView !== 'dashboard' && activeView !== 'baogia' && (
              <p className="text-slate-500 mt-1 text-sm">
                {activeView === 'employees' ? 'Quản lý danh sách nhân viên và thông tin chi tiết.' : activeView === 'cohoichoai' ? 'Chuẩn hóa cách cá nhân hóa quy trình quản trị doanh nghiệp.' : ''}
              </p>
            )}
          </div>
          {activeView === 'dashboard' && (
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Tìm kiếm công việc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all w-full md:w-64"
                />
              </div>

              {activeProjectId !== 'all' && (
                <button
                  onClick={() => handleAiSuggest(activeProjectId)}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isAiLoading ? <Clock size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Gợi ý AI
                </button>
              )}
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-all"
              >
                <Plus size={16} />
                Thêm việc
              </button>
            </div>
          )}
        </header>

        {activeView === 'dashboard' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              <StatCard icon={<Briefcase size={18} className="text-indigo-600" />} label="Tổng công việc" value={stats.total} color="indigo" />
              <StatCard icon={<CheckCircle2 size={18} className="text-emerald-600" />} label="Hoàn thành" value={stats.completed} color="emerald" />
              <StatCard icon={<Clock size={18} className="text-amber-600" />} label="Đang chờ" value={stats.pending} color="amber" />
              <StatCard icon={<AlertCircle size={18} className="text-rose-600" />} label="Trễ hạn" value={stats.overdue} color="rose" />
              <StatCard icon={<Sparkles size={18} className="text-violet-600" />} label="Tổng giờ làm" value={stats.totalHours} color="indigo" />
            </div>

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
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <EmployeeManager />
          </div>
        )}

        {isProjectModalOpen && <ProjectModal onClose={() => setIsProjectModalOpen(false)} onSubmit={handleAddProject} />}
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
      </main>
    </div>
  );
}
