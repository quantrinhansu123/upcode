import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, User, QrCode, X, Edit, School, Briefcase, MoreVertical, Eye, Clock, DollarSign, ArrowDownCircle } from 'lucide-react';
import { Employee, Task, Project, ProjectTransaction } from '../types';
import { employeeService, projectTransactionService } from '../services/databaseService';
import { differenceInMinutes, parseISO } from 'date-fns';

interface EmployeeModalProps {
    onClose: () => void;
    onSubmit: (data: Omit<Employee, 'id'>) => Promise<void>;
    initialData?: Employee;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ onClose, onSubmit, initialData }) => {
    const [fullName, setFullName] = useState(initialData?.fullName || '');
    const [department, setDepartment] = useState(initialData?.department || '');
    const [position, setPosition] = useState(initialData?.position || '');
    const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');
    const [qrCodeUrl, setQrCodeUrl] = useState(initialData?.qrCodeUrl || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [password, setPassword] = useState(initialData?.password || '');
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'qr') => {
        const file = e.target.files?.[0];
        if (file) {
            // Limit file size to 2MB to support larger images
            if (file.size > 2 * 1024 * 1024) {
                alert('Ảnh quá lớn (tối đa 2MB). Vui lòng chọn ảnh nhỏ hơn hoặc nén ảnh.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (type === 'avatar') setAvatarUrl(result);
                else setQrCodeUrl(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!fullName) return;
        setLoading(true);
        try {
            await onSubmit({
                fullName,
                department,
                position,
                avatarUrl,
                qrCodeUrl,
                email,
                password
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">
                        {initialData ? 'Cập nhật nhân sự' : 'Thêm nhân sự mới'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Họ và Tên</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Nguyễn Văn A"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Bộ phận</label>
                            <input
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                value={department}
                                onChange={e => setDepartment(e.target.value)}
                                placeholder="Kinh doanh, ..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Vị trí</label>
                            <input
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                value={position}
                                onChange={e => setPosition(e.target.value)}
                                placeholder="Trưởng nhóm, ..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="email@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="******"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh đại diện (Tải lên)</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'avatar')}
                                className="block w-full text-sm text-slate-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-indigo-50 file:text-indigo-700
                                  hover:file:bg-indigo-100 transition-all
                                "
                            />
                            {avatarUrl && (
                                <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden shrink-0">
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh QR Code (Tải lên)</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'qr')}
                                className="block w-full text-sm text-slate-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-indigo-50 file:text-indigo-700
                                  hover:file:bg-indigo-100 transition-all
                                "
                            />
                            {qrCodeUrl && (
                                <div className="w-12 h-12 rounded border border-slate-200 overflow-hidden shrink-0">
                                    <img src={qrCodeUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                        {qrCodeUrl && qrCodeUrl.length > 500 && <p className="text-xs text-slate-400 mt-1 truncate">Đã chọn: {qrCodeUrl.substring(0, 30)}...</p>}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !fullName}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Đang xử lý...' : 'Xác nhận'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EmployeeDetailModal: React.FC<{ 
    employee: Employee; 
    onClose: () => void;
    tasks?: Task[];
    projects?: Project[];
}> = ({ employee, onClose, tasks = [], projects = [] }) => {
    const [expenseTransactions, setExpenseTransactions] = useState<ProjectTransaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    // Load expense transactions for this employee
    useEffect(() => {
        const loadExpenses = async () => {
            setLoadingTransactions(true);
            try {
                // Load transactions from all projects where this employee is recipient
                const allTransactions: ProjectTransaction[] = [];
                for (const project of projects) {
                    try {
                        const transactions = await projectTransactionService.getByProjectId(project.id);
                        const employeeExpenses = transactions.filter(t => 
                            t.type === 'expense' && t.recipientId === employee.id
                        );
                        allTransactions.push(...employeeExpenses);
                    } catch (error) {
                        console.error(`Error loading transactions for project ${project.id}:`, error);
                    }
                }
                setExpenseTransactions(allTransactions);
            } catch (error) {
                console.error('Error loading expense transactions:', error);
            } finally {
                setLoadingTransactions(false);
            }
        };
        loadExpenses();
    }, [employee.id, projects]);

    // Calculate total work hours from tasks and subtasks
    const totalWorkHours = useMemo(() => {
        let totalMinutes = 0;
        
        // From tasks where employee is assignee
        tasks.forEach(task => {
            if (task.assigneeId === employee.id && task.sessions) {
                task.sessions.forEach(session => {
                    if (session.startedAt && session.endedAt) {
                        totalMinutes += differenceInMinutes(parseISO(session.endedAt), parseISO(session.startedAt));
                    }
                });
            }
            
            // From subtasks where employee is assignee
            if (task.subtasks) {
                task.subtasks.forEach(subtask => {
                    if (subtask.assigneeId === employee.id && subtask.sessions) {
                        subtask.sessions.forEach(session => {
                            if (session.startedAt && session.endedAt) {
                                totalMinutes += differenceInMinutes(parseISO(session.endedAt), parseISO(session.startedAt));
                            }
                        });
                    }
                });
            }
        });
        
        return (totalMinutes / 60).toFixed(1);
    }, [tasks, employee.id]);

    // Calculate total project value (from tasks and subtasks assigned to this employee)
    const totalProjectValue = useMemo(() => {
        let total = 0;
        
        tasks.forEach(task => {
            // Task price if employee is assignee
            if (task.assigneeId === employee.id && task.price) {
                total += task.price;
            }
            
            // Subtask price if employee is assignee
            if (task.subtasks) {
                task.subtasks.forEach(subtask => {
                    if (subtask.assigneeId === employee.id && subtask.price) {
                        total += subtask.price;
                    }
                });
            }
        });
        
        return total;
    }, [tasks, employee.id]);

    // Calculate total expenses
    const totalExpenses = useMemo(() => {
        return expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    }, [expenseTransactions]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in zoom-in-95 duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm md:max-w-md p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all z-10">
                    <X size={20} />
                </button>

                <div className="relative flex flex-col items-center mt-8">
                    <div className="w-28 h-28 rounded-full bg-white p-1 shadow-xl mb-4">
                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                            {employee.avatarUrl ? (
                                <img src={employee.avatarUrl} className="w-full h-full object-cover" alt={employee.fullName} />
                            ) : (
                                <User size={40} className="text-slate-400" />
                            )}
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 text-center">{employee.fullName}</h3>
                    <div className="flex items-center gap-2 mt-1 text-slate-500">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold uppercase tracking-wider">{employee.department}</span>
                    </div>

                    <div className="w-full mt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <p className="text-slate-400 text-xs mb-1">Vị trí</p>
                                <p className="font-semibold text-slate-700">{employee.position}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <p className="text-slate-400 text-xs mb-1">Email</p>
                                <p className="font-semibold text-slate-700 truncate" title={employee.email}>{employee.email || '---'}</p>
                            </div>
                        </div>

                        {/* Tổng thời gian làm việc */}
                        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock size={16} className="text-indigo-600" />
                                <p className="text-indigo-600 text-xs font-medium">Tổng thời gian làm việc</p>
                            </div>
                            <p className="text-indigo-700 font-bold text-lg">{totalWorkHours} giờ</p>
                        </div>

                        {/* Tổng tiền dự án */}
                        {totalProjectValue > 0 && (
                            <div className="bg-violet-50 border border-violet-200 p-4 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <DollarSign size={16} className="text-violet-600" />
                                    <p className="text-violet-600 text-xs font-medium">Tổng tiền dự án</p>
                                </div>
                                <p className="text-violet-700 font-bold text-lg">{formatCurrency(totalProjectValue)} VNĐ</p>
                            </div>
                        )}

                        {/* Tổng tiền đã chi */}
                        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <ArrowDownCircle size={16} className="text-rose-600" />
                                <p className="text-rose-600 text-xs font-medium">Tổng tiền đã chi</p>
                            </div>
                            {loadingTransactions ? (
                                <p className="text-rose-700 text-sm">Đang tải...</p>
                            ) : (
                                <p className="text-rose-700 font-bold text-lg">{formatCurrency(totalExpenses)} VNĐ</p>
                            )}
                        </div>

                        {/* Chi tiết các khoản chi */}
                        {expenseTransactions.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <p className="text-slate-600 text-xs font-medium mb-3">Chi tiết các khoản chi</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {expenseTransactions.map(transaction => {
                                        const project = projects.find(p => p.id === transaction.projectId);
                                        return (
                                            <div key={transaction.id} className="bg-white p-2.5 rounded-lg border border-slate-200">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-slate-700">{project?.name || 'Dự án'}</span>
                                                    <span className="text-xs font-bold text-rose-600">{formatCurrency(transaction.amount)} VNĐ</span>
                                                </div>
                                                {transaction.description && (
                                                    <p className="text-[10px] text-slate-500 truncate">{transaction.description}</p>
                                                )}
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    {new Date(transaction.transactionDate).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {employee.totalCommission !== undefined && employee.totalCommission > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                                <p className="text-emerald-600 text-xs mb-1 font-medium">Tổng hoa hồng</p>
                                <p className="text-emerald-700 font-bold text-lg">{employee.totalCommission.toLocaleString('vi-VN')} VNĐ</p>
                            </div>
                        )}

                        {employee.qrCodeUrl ? (
                            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-6 border border-dashed border-slate-200">
                                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                                    <img src={employee.qrCodeUrl} className="w-48 h-48 object-contain" alt="QR Code" />
                                </div>
                                <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                                    <QrCode size={12} /> Quét mã để lấy thông tin
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200 text-slate-400">
                                <QrCode size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">Chưa có mã QR</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface EmployeeManagerProps {
    tasks?: Task[];
    projects?: Project[];
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({ tasks = [], projects = [] }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
    const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const data = await employeeService.getAll();
            setEmployees(data);
        } catch (e) {
            console.error(e);
        }
    };

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = () => setMenuOpenId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    const handleMenuClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setMenuOpenId(menuOpenId === id ? null : id);
    };

    const handleAdd = async (data: Omit<Employee, 'id'>) => {
        await employeeService.create(data);
        loadData();
    };

    const handleUpdate = async (id: string, data: Partial<Employee>) => {
        await employeeService.update(id, data);
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn chắc chắn muốn xóa nhân sự này?')) {
            await employeeService.delete(id);
            loadData();
        }
    };

    const filtered = employees.filter(e =>
        e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group employees by department
    const groupedByDepartment = filtered.reduce((acc, emp) => {
        const dept = emp.department || 'Khác';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(emp);
        return acc;
    }, {} as Record<string, typeof employees>);

    // Sort departments alphabetically
    const sortedDepartments = Object.keys(groupedByDepartment).sort();

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Nhân sự</h2>
                    <p className="text-slate-500 mt-1">Quản lý danh sách nhân sự của dự án</p>
                </div>
                <button
                    onClick={() => { setEditingEmployee(undefined); setIsModalOpen(true); }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-slate-900/20"
                >
                    <Plus size={20} />
                    Thêm nhân sự
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    placeholder="Tìm kiếm theo tên, bộ phận..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-600"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Grouped List by Department */}
            {sortedDepartments.length > 0 ? (
                <div className="space-y-8">
                    {sortedDepartments.map(dept => (
                        <div key={dept} className="space-y-4">
                            {/* Department Header */}
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold text-slate-900">{dept}</h3>
                                <span className="text-sm text-slate-400">({groupedByDepartment[dept].length} người)</span>
                                <div className="flex-1 h-px bg-slate-200"></div>
                            </div>
                            
                            {/* Grid List for this department */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {groupedByDepartment[dept].map(emp => (
                                    <div key={emp.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative group">
                                        <div className="flex items-center gap-4">
                                            {/* Left: Avatar */}
                                            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-100 overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => setViewingEmployee(emp)}>
                                                {emp.avatarUrl ? (
                                                    <img src={emp.avatarUrl} alt={emp.fullName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <User size={24} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Middle: Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-900 text-base truncate cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setViewingEmployee(emp)}>
                                                    {emp.fullName}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[120px]">
                                                        {emp.position}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1 truncate">{emp.email}</p>
                                                {emp.totalCommission !== undefined && emp.totalCommission > 0 && (
                                                    <p className="text-xs font-semibold text-emerald-600 mt-1">
                                                        Hoa hồng: {emp.totalCommission.toLocaleString('vi-VN')} VNĐ
                                                    </p>
                                                )}
                                            </div>

                                            {/* Right: Action Menu */}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => handleMenuClick(e, emp.id)}
                                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    <MoreVertical size={20} />
                                                </button>

                                                {menuOpenId === emp.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-10 overflow-hidden animate-in zoom-in-95 duration-100 origin-top-right">
                                                        <button
                                                            onClick={() => setViewingEmployee(emp)}
                                                            className="w-full px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                                                        >
                                                            <Eye size={14} /> Xem
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }}
                                                            className="w-full px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                                                        >
                                                            <Edit size={14} /> Sửa
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(emp.id)}
                                                            className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={14} /> Xóa
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-400">
                    Chưa có nhân sự nào phù hợp
                </div>
            )}

            {isModalOpen && (
                <EmployeeModal
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={editingEmployee
                        ? (data) => handleUpdate(editingEmployee.id, data)
                        : handleAdd
                    }
                    initialData={editingEmployee}
                />
            )}

            {viewingEmployee && (
                <EmployeeDetailModal
                    employee={viewingEmployee}
                    onClose={() => setViewingEmployee(null)}
                    tasks={tasks}
                    projects={projects}
                />
            )}
        </div>
    );
};
