import React, { useMemo } from 'react';
import { Task, Project, Employee } from '../types';
import { format, parseISO, isToday, isTomorrow, isYesterday, isPast, compareAsc } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, Play, Pause, AlertCircle } from 'lucide-react';

interface DailyTaskViewProps {
    tasks: Task[];
    projects: Project[];
    employees: Employee[];
    onStart: (id: string) => void;
    onPause: (id: string) => void;
    onComplete: (id: string) => void;
    onEdit: (task: Task) => void;
}

export const DailyTaskView: React.FC<DailyTaskViewProps> = ({
    tasks, projects, employees,
    onStart, onPause, onComplete, onEdit
}) => {

    const groupedTasks = useMemo(() => {
        const groups: { [key: string]: Task[] } = {};

        tasks.forEach(task => {
            // Group by Deadline Date string (YYYY-MM-DD)
            const dateKey = task.deadline.split('T')[0];
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(task);
        });

        // Sort dates
        return Object.entries(groups).sort((a, b) => compareAsc(parseISO(a[0]), parseISO(b[0])));
    }, [tasks]);

    const getDayLabel = (dateStr: string) => {
        const date = parseISO(dateStr);
        if (isToday(date)) return 'Hôm nay';
        if (isTomorrow(date)) return 'Ngày mai';
        if (isYesterday(date)) return 'Hôm qua';
        return format(date, 'EEEE', { locale: vi });
    };

    const DaySection = ({ dateStr, tasks }: { dateStr: string, tasks: Task[] }) => {
        // Categorize
        const todo = tasks.filter(t => !t.isCompleted && !t.startedAt);
        const inProgress = tasks.filter(t => !t.isCompleted && t.startedAt);
        const completed = tasks.filter(t => t.isCompleted);

        const date = parseISO(dateStr);
        const isOverdue = isPast(date) && !isToday(date);

        return (
            <div className={`mb-8 border rounded-2xl overflow-hidden shadow-sm ${isToday(date) ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
                {/* Day Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${isToday(date) ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`text-2xl font-bold ${isToday(date) ? 'text-indigo-600' : 'text-slate-700'}`}>
                            {format(date, 'dd')}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-sm font-semibold uppercase tracking-wide ${isToday(date) ? 'text-indigo-700' : 'text-slate-800'}`}>
                                {getDayLabel(dateStr)}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                                tháng {format(date, 'MM, yyyy')}
                            </span>
                        </div>
                        {isOverdue && todo.length + inProgress.length > 0 && (
                            <div className="flex items-center gap-1 bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                                <AlertCircle size={12} /> Quá hạn
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">{tasks.length}</span>
                            việc
                        </div>
                    </div>
                </div>

                {/* Status Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {/* TODO Column */}
                    <div className="p-4 bg-white/50">
                        <div className="flex items-center justify-between mb-3 text-slate-500 font-medium text-sm">
                            <div className="flex items-center gap-2">
                                <Circle size={14} /> Cần làm
                            </div>
                            <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs">{todo.length}</span>
                        </div>
                        <div className="space-y-2">
                            {todo.map(task => (
                                <TaskCard key={task.id} task={task} projects={projects} onClick={() => onEdit(task)} />
                            ))}
                            {todo.length === 0 && <EmptyPlaceholder />}
                        </div>
                    </div>

                    {/* DOING Column */}
                    <div className="p-4 bg-emerald-50/10">
                        <div className="flex items-center justify-between mb-3 text-emerald-600 font-medium text-sm">
                            <div className="flex items-center gap-2">
                                <Clock size={14} /> Đang làm
                            </div>
                            <span className="bg-emerald-100 px-2 py-0.5 rounded-full text-xs font-bold">{inProgress.length}</span>
                        </div>
                        <div className="space-y-2">
                            {inProgress.map(task => (
                                <TaskCard key={task.id} task={task} projects={projects} isRunning={true} onPause={() => onPause(task.id)} onClick={() => onEdit(task)} />
                            ))}
                            {inProgress.length === 0 && <EmptyPlaceholder label="Chưa có việc đang chạy" />}
                        </div>
                    </div>

                    {/* DONE Column */}
                    <div className="p-4 bg-indigo-50/10">
                        <div className="flex items-center justify-between mb-3 text-indigo-600 font-medium text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={14} /> Đã xong
                            </div>
                            <span className="bg-indigo-100 px-2 py-0.5 rounded-full text-xs font-bold">{completed.length}</span>
                        </div>
                        <div className="space-y-2">
                            {completed.map(task => (
                                <TaskCard key={task.id} task={task} projects={projects} isCompleted={true} onClick={() => onEdit(task)} />
                            ))}
                            {completed.length === 0 && <EmptyPlaceholder label="Chưa có việc hoàn thành" />}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-2 pb-20">
            {groupedTasks.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <p className="text-slate-500">Không có dữ liệu công việc</p>
                </div>
            ) : (
                groupedTasks.map(([dateStr, dayTasks]) => (
                    <DaySection key={dateStr} dateStr={dateStr} tasks={dayTasks} />
                ))
            )}
        </div>
    );
};

// Sub-components
const TaskCard = ({ task, projects, isRunning, isCompleted, onPause, onClick }: {
    task: Task, projects: Project[], isRunning?: boolean, isCompleted?: boolean, onPause?: () => void, onClick?: () => void
}) => {
    const project = projects.find(p => p.id === task.projectId);

    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-md ${isCompleted ? 'bg-indigo-50/50 border-indigo-100 opacity-75 grayscale-[0.3] hover:grayscale-0' :
                    isRunning ? 'bg-white border-emerald-200 shadow-sm ring-1 ring-emerald-100' :
                        'bg-white border-slate-200 hover:border-indigo-300'
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className={`text-sm font-medium line-clamp-2 ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                        {task.title}
                    </p>
                    {project && (
                        <div className="flex items-center gap-1 mt-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }}></div>
                            <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{project.name}</span>
                        </div>
                    )}
                </div>
                {isRunning && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onPause && onPause(); }}
                        className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors shrink-0"
                    >
                        <Pause size={14} />
                    </button>
                )}
            </div>
            {task.priority === 'High' && !isCompleted && (
                <div className="mt-2 flex">
                    <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold">Gấp</span>
                </div>
            )}
        </div>
    );
};

const EmptyPlaceholder = ({ label = 'Không có' }: { label?: string }) => (
    <div className="py-6 text-center border-2 border-dashed border-slate-100 rounded-xl">
        <p className="text-xs text-slate-300 italic">{label}</p>
    </div>
);
