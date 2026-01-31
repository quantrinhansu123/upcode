import React, { useMemo, useState } from 'react';
import { Project, Task, Employee } from '../types';
import { format, parseISO, differenceInDays, addDays, startOfDay, endOfDay, isAfter, isBefore, eachDayOfInterval, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, User as UserIcon, Flag, AlertCircle, Filter } from 'lucide-react';

interface TimelineViewProps {
    tasks: Task[];
    employees: Employee[];
    projects: Project[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, employees, projects }) => {
    const [viewStartDate, setViewStartDate] = useState(addDays(new Date(), -2));
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const daysToShow = 21;

    // Statistics Calculation
    const stats = useMemo(() => {
        const total = tasks.length;
        if (total === 0) return { new: 0, active: 0, paused: 0, completed: 0, counts: { new: 0, active: 0, paused: 0, completed: 0 } };

        const counts = tasks.reduce((acc, t) => {
            if (t.isCompleted) acc.completed++;
            else if (t.startedAt) acc.active++;
            else if (t.sessions && t.sessions.length > 0) acc.paused++;
            else acc.new++;
            return acc;
        }, { new: 0, active: 0, paused: 0, completed: 0 });

        return {
            new: (counts.new / total) * 100,
            active: (counts.active / total) * 100,
            paused: (counts.paused / total) * 100,
            completed: (counts.completed / total) * 100,
            counts
        };
    }, [tasks]);

    // Filter Tasks
    const filteredTasks = useMemo(() => {
        if (selectedProjectId === 'all') return tasks;
        return tasks.filter(t => t.projectId === selectedProjectId);
    }, [tasks, selectedProjectId]);

    // Group tasks by Project using Filtered Tasks
    const groupedTasks = useMemo(() => {
        const groups: { [key: string]: Task[] } = {};

        // Sort tasks by Deadline ascending (Urgency: Earliest deadline first)
        const sorted = [...filteredTasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

        sorted.forEach(task => {
            const pid = task.projectId || 'uncategorized';
            if (!groups[pid]) groups[pid] = [];
            groups[pid].push(task);
        });
        return groups;
    }, [filteredTasks]);

    // Helper to get min deadline of a project for sorting
    const getProjectMinDeadline = (tasks: Task[]) => {
        if (!tasks.length) return Infinity;
        return Math.min(...tasks.map(t => new Date(t.deadline).getTime()));
    };

    // Sort Projects by Urgency
    const sortedProjectIds = useMemo(() => {
        return Object.keys(groupedTasks).sort((a, b) => {
            return getProjectMinDeadline(groupedTasks[a]) - getProjectMinDeadline(groupedTasks[b]);
        });
    }, [groupedTasks]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        return eachDayOfInterval({
            start: viewStartDate,
            end: addDays(viewStartDate, daysToShow - 1)
        });
    }, [viewStartDate]);

    const getTaskStatus = (task: Task) => {
        if (task.isCompleted) return { label: 'Hoàn thành', color: 'bg-indigo-500', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700' };
        if (task.startedAt) return { label: 'Đang làm', color: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
        if (task.sessions && task.sessions.length > 0) return { label: 'Tạm dừng', color: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' };
        return { label: 'Mới tạo', color: 'bg-slate-400', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600' };
    };

    const handlePrev = () => setViewStartDate(prev => addDays(prev, -7));
    const handleNext = () => setViewStartDate(prev => addDays(prev, 7));
    const handleToday = () => setViewStartDate(addDays(new Date(), -2));

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
            {/* Header Controls */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Time Nav */}
                        <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                            <button onClick={handlePrev} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft size={16} /></button>
                            <button onClick={handleToday} className="px-3 text-sm font-semibold hover:bg-slate-100 rounded text-slate-700">Hôm nay</button>
                            <button onClick={handleNext} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={16} /></button>
                        </div>
                        <div className="text-sm font-medium text-slate-500 w-32">
                            {format(viewStartDate, 'MMMM yyyy', { locale: vi })}
                        </div>

                        {/* Project Filter */}
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm ml-4">
                            <Filter size={14} className="text-slate-400" />
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="text-sm font-medium text-slate-700 bg-transparent outline-none border-none pr-8 cursor-pointer"
                            >
                                <option value="all">Tất cả dự án</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex gap-4 text-xs font-medium">
                        <div className="flex items-center gap-1.5 relative group cursor-help">
                            <div className="w-2 h-2 rounded-full bg-slate-400"></div> Mới tạo
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">{stats.counts.new}</span>
                        </div>
                        <div className="flex items-center gap-1.5 relative group cursor-help">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Đang làm
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">{stats.counts.active}</span>
                        </div>
                        <div className="flex items-center gap-1.5 relative group cursor-help">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div> Tạm dừng
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">{stats.counts.paused}</span>
                        </div>
                        <div className="flex items-center gap-1.5 relative group cursor-help">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Hoàn thành
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">{stats.counts.completed}</span>
                        </div>
                        <div className="flex items-center gap-1.5"><div className="w-0.5 h-3 bg-rose-500"></div> Hạn chót</div>
                    </div>
                </div>

                {/* Progress Stats Bar */}
                <div className="h-8 w-full flex rounded-xl overflow-hidden bg-slate-100 shadow-inner border border-slate-200 mt-2">
                    {stats.counts.new > 0 && (
                        <div style={{ width: `${stats.new}%` }} className="bg-slate-400 h-full transition-all duration-500 flex items-center justify-center text-xs font-bold text-white relative group min-w-[30px]" title={`Mới tạo: ${stats.counts.new} việc (${Math.round(stats.new)}%)`}>
                            {stats.counts.new}
                        </div>
                    )}
                    {stats.counts.active > 0 && (
                        <div style={{ width: `${stats.active}%` }} className="bg-emerald-500 h-full transition-all duration-500 flex items-center justify-center text-xs font-bold text-white relative group min-w-[30px]" title={`Đang làm: ${stats.counts.active} việc (${Math.round(stats.active)}%)`}>
                            {stats.counts.active} <span className="ml-1 opacity-70 font-normal hidden sm:inline">đang làm</span>
                        </div>
                    )}
                    {stats.counts.paused > 0 && (
                        <div style={{ width: `${stats.paused}%` }} className="bg-amber-500 h-full transition-all duration-500 flex items-center justify-center text-xs font-bold text-white relative group min-w-[30px]" title={`Tạm dừng: ${stats.counts.paused} việc (${Math.round(stats.paused)}%)`}>
                            {stats.counts.paused}
                        </div>
                    )}
                    {stats.counts.completed > 0 && (
                        <div style={{ width: `${stats.completed}%` }} className="bg-indigo-500 h-full transition-all duration-500 flex items-center justify-center text-xs font-bold text-white relative group min-w-[30px]" title={`Hoàn thành: ${stats.counts.completed} việc (${Math.round(stats.completed)}%)`}>
                            {stats.counts.completed} <span className="ml-1 opacity-70 font-normal hidden sm:inline">hoàn thành</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline Body */}
            <div className="flex-1 overflow-auto relative custom-scrollbar">
                <div className="min-w-[1000px]">
                    {/* Calendar Header Row */}
                    <div className="grid grid-cols-[280px_1fr] sticky top-0 z-30 bg-white border-b border-slate-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="p-3 font-bold text-slate-800 border-r border-slate-100 bg-slate-50/80 backdrop-blur flex items-center">
                            Dự án / Công việc
                        </div>
                        <div className="grid bg-slate-50/80 backdrop-blur" style={{ gridTemplateColumns: `repeat(${daysToShow}, 1fr)` }}>
                            {calendarDays.map((day, i) => {
                                const isTodayDate = isToday(day);
                                return (
                                    <div key={i} className={`py-2 px-1 text-center border-r border-slate-100/50 flex flex-col items-center justify-center ${isTodayDate ? 'bg-indigo-50/50' : ''}`}>
                                        <div className={`text-[10px] font-medium uppercase ${isTodayDate ? 'text-indigo-600' : 'text-slate-400'}`}>{format(day, 'EEE', { locale: vi })}</div>
                                        <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mt-0.5 ${isTodayDate ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-700'}`}>{format(day, 'd')}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Task Rows Grouped by Project (Sorted by Urgency) */}
                    <div className="divide-y divide-slate-100">
                        {sortedProjectIds.map(projectId => {
                            const projectTasks = groupedTasks[projectId];
                            const project = projects.find(p => p.id === projectId);
                            const projectName = project ? project.name : 'Chưa phân loại';
                            const projectColor = project ? project.color : '#94a3b8';
                            
                            // Calculate progress for this project
                            const totalTasks = projectTasks.length;
                            const completedTasks = projectTasks.filter(t => t.isCompleted).length;
                            const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                            return (
                                <div key={projectId}>
                                    {/* Project Header */}
                                    <div className="bg-slate-50/50 px-4 py-2 border-y border-slate-200/50 sticky left-0 z-20 flex items-center gap-2 font-bold text-slate-800 text-sm">
                                        <div className="w-3 h-3 rounded-md shadow-sm" style={{ backgroundColor: projectColor }}></div>
                                        <span className="text-xs font-normal text-slate-400 ml-auto bg-white px-2 py-0.5 rounded-full border border-slate-100">{projectTasks.length} việc</span>
                                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">{progressPercent}%</span>
                                    </div>

                                    {/* Tasks */}
                                    {projectTasks.map(task => {
                                        const status = getTaskStatus(task);
                                        const assignee = employees.find(e => e.id === task.assigneeId);

                                        // Dates
                                        const taskStart = parseISO(task['createdAt'] || new Date().toISOString());
                                        const taskEnd = parseISO(task.deadline);

                                        const viewStart = startOfDay(viewStartDate);

                                        const dayWidthPct = 100 / daysToShow;

                                        // Logic Start-End for Bar
                                        let startIdx = differenceInDays(taskStart, viewStart);
                                        let durationDays = differenceInDays(taskEnd, taskStart) + 1; // Plan duration

                                        // Clip to view
                                        if (startIdx < 0) {
                                            durationDays += startIdx;
                                            startIdx = 0;
                                        }
                                        if (startIdx + durationDays > daysToShow) {
                                            durationDays = daysToShow - startIdx;
                                        }

                                        let isVisible = true;
                                        if (durationDays < 0.5) isVisible = false; // Hide completely offscreen

                                        // Deadline Marker Position (relative to View)
                                        const deadlineIdx = differenceInDays(taskEnd, viewStart);
                                        const showDeadline = deadlineIdx >= 0 && deadlineIdx < daysToShow;

                                        return (
                                            <div key={task.id} className="grid grid-cols-[280px_1fr] hover:bg-slate-50 transition-colors group h-12 relative">
                                                {/* Task Info Left */}
                                                <div className="px-4 border-r border-slate-100 flex items-center justify-between bg-white group-hover:bg-slate-50 sticky left-0 z-10">
                                                    <div className="min-w-0 pr-2">
                                                        <div className="leading-tight text-sm font-medium text-slate-700 truncate" title={task.title}>{task.title}</div>
                                                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{status.label}</div>
                                                    </div>
                                                    {assignee && (
                                                        <div className="shrink-0" title={assignee.fullName}>
                                                            {assignee.avatarUrl ? (
                                                                <img src={assignee.avatarUrl} className="w-6 h-6 rounded-full object-cover border border-white shadow-sm" />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 border border-white shadow-sm"><UserIcon size={12} /></div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Timeline Area relative */}
                                                <div className="relative w-full h-full">
                                                    {/* Grid Lines Background */}
                                                    <div className="absolute inset-0 grid w-full h-full pointer-events-none" style={{ gridTemplateColumns: `repeat(${daysToShow}, 1fr)` }}>
                                                        {Array.from({ length: daysToShow }).map((_, i) => (
                                                            <div key={i} className={`border-r border-slate-50 ${i === daysToShow - 1 ? 'border-none' : ''}`}></div>
                                                        ))}
                                                    </div>

                                                    {/* Plan Bar (Full duration from Start to Deadline) */}
                                                    {isVisible && (
                                                        <div
                                                            className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md border ${status.bg} ${status.text === 'text-indigo-700' ? 'opacity-80' : ''} transition-all cursor-pointer hover:shadow-md hover:h-7 z-0`}
                                                            style={{
                                                                left: `${startIdx * dayWidthPct}%`,
                                                                width: `${Math.max(dayWidthPct, durationDays * dayWidthPct)}%`,
                                                                marginLeft: '2px',
                                                                marginRight: '2px', // gap
                                                                maxWidth: 'calc(100% - 4px)'
                                                            }}
                                                            title={`Hạn chót: ${format(taskEnd, 'dd/MM/yyyy')}`}
                                                        >
                                                            {/* Progress Indicator */}
                                                            <div className={`h-full rounded-l-md ${status.color} ${status.label === 'Hoàn thành' ? 'w-full rounded-r-md' : 'w-2'} absolute top-0 left-0 bottom-0 opacity-80`}></div>
                                                        </div>
                                                    )}

                                                    {/* Deadline Marker */}
                                                    {showDeadline && (
                                                        <div
                                                            className="absolute top-1 bottom-1 w-0.5 bg-rose-500 z-10 opacity-70 group-hover:opacity-100 flex flex-col items-center justify-start pointer-events-none"
                                                            style={{ left: `${(deadlineIdx + 1) * dayWidthPct}%`, transform: 'translateX(-50%)' }}
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 -mt-2"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}

                        {Object.keys(groupedTasks).length === 0 && (
                            <div className="p-12 text-center text-slate-400">Không có công việc nào trong giai đoạn này hoặc dự án đã chọn</div>
                        )}

                        <div className="h-10"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
