import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save, Eye, History } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { workTableService } from '../services/databaseService';
import { WorkTable } from '../types';
import { initializeWorkTableTable } from '../services/workTableTableInit';

interface WorkTableWithSubtasks extends WorkTable {
  subtasks?: Array<{
    id: string;
    title: string;
    is_completed: boolean;
    tasks?: {
      id: string;
      title: string;
      project_id: string;
    };
  }>;
}

export const WorkTableView: React.FC = () => {
  const [workTables, setWorkTables] = useState<WorkTable[]>([]);
  const [workTablesWithHistory, setWorkTablesWithHistory] = useState<WorkTableWithSubtasks[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [viewingWorkTable, setViewingWorkTable] = useState<{ problem: string; solution: string; subtasks?: any[] } | null>(null);
  const [editingWorkTable, setEditingWorkTable] = useState<WorkTable | null>(null);
  const [formData, setFormData] = useState({
    problem: '',
    solution: ''
  });

  // Initialize table and load data
  useEffect(() => {
    const init = async () => {
      // Tự động tạo bảng nếu chưa có (chạy ngầm, không block UI)
      initializeWorkTableTable().catch(() => {
        // Silent fail - app vẫn chạy được
      });
      
      // Load data ngay (sẽ retry nếu bảng chưa có)
      loadWorkTables();
    };
    init();
  }, []);

  const loadWorkTables = async () => {
    setLoading(true);
    try {
      const loaded = await workTableService.getAll();
      setWorkTables(loaded);
    } catch (error: any) {
      // Nếu bảng chưa tồn tại, hiển thị thông báo thân thiện
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Bảng work_tables chưa tồn tại. Vui lòng chạy migration_work_tables.sql trong Supabase SQL Editor');
      } else {
        console.error('Error loading work tables:', error);
      }
      setWorkTables([]); // Set empty array để UI không bị lỗi
    } finally {
      setLoading(false);
    }
  };

  const loadWorkTablesWithHistory = async () => {
    setLoading(true);
    try {
      const loaded = await workTableService.getAllWithSubtaskInfo();
      setWorkTablesWithHistory(loaded);
    } catch (error: any) {
      console.error('Error loading work tables with history:', error);
      setWorkTablesWithHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHistoryView) {
      loadWorkTablesWithHistory();
    } else {
      loadWorkTables();
    }
  }, [isHistoryView]);

  const handleAdd = () => {
    setEditingWorkTable(null);
    setFormData({ problem: '', solution: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (item: WorkTable) => {
    setEditingWorkTable(item);
    setFormData({
      problem: item.problem,
      solution: item.solution
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mục này?')) {
      return;
    }

    try {
      await workTableService.delete(id);
      setWorkTables(workTables.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting work table:', error);
      alert('Không thể xóa. Vui lòng thử lại.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.problem.trim() || !formData.solution.trim()) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      if (editingWorkTable) {
        const updated = await workTableService.update(editingWorkTable.id, formData);
        setWorkTables(workTables.map(item => item.id === updated.id ? updated : item));
        // Reload history if in history view
        if (isHistoryView) {
          await loadWorkTablesWithHistory();
        }
      } else {
        const newItem = await workTableService.create(formData);
        setWorkTables([newItem, ...workTables]);
        // Reload history if in history view
        if (isHistoryView) {
          await loadWorkTablesWithHistory();
        }
      }
      setIsModalOpen(false);
      setFormData({ problem: '', solution: '' });
      setEditingWorkTable(null);
    } catch (error) {
      console.error('Error saving work table:', error);
      alert('Không thể lưu. Vui lòng thử lại.');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Bảng làm việc</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isHistoryView ? 'Lịch sử tất cả vấn đề và giải pháp' : 'Quản lý vấn đề và cách giải quyết'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHistoryView(!isHistoryView)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
              isHistoryView 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History size={18} />
            {isHistoryView ? 'Xem danh sách' : 'Xem lịch sử'}
          </button>
          {!isHistoryView && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <Plus size={18} />
              Thêm mới
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Đang tải...</div>
      ) : isHistoryView ? (
        // History View - Show all work tables with subtask info
        workTablesWithHistory.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-slate-500 mb-4">Chưa có dữ liệu lịch sử</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Vấn đề</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Cách giải quyết</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Được sử dụng bởi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Ngày tạo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {workTablesWithHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div className="max-w-md break-words">{item.problem}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="max-w-md break-words">{item.solution}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.subtasks && item.subtasks.length > 0 ? (
                          <div className="space-y-1">
                            {item.subtasks.map((subtask: any) => (
                              <div key={subtask.id} className="text-xs">
                                <span className={subtask.is_completed ? 'line-through text-slate-400' : ''}>
                                  {subtask.tasks?.title || 'N/A'} → {subtask.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa được sử dụng</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setViewingWorkTable({
                            problem: item.problem,
                            solution: item.solution,
                            subtasks: item.subtasks
                          })}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : workTables.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-slate-500 mb-4">Chưa có dữ liệu</p>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Thêm mục đầu tiên
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Vấn đề</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Cách giải quyết</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workTables.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="max-w-md break-words">{item.problem}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="max-w-md break-words">{item.solution}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Sửa"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingWorkTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg font-semibold text-slate-900">Chi tiết Vấn đề và Giải pháp</h3>
              <button
                onClick={() => setViewingWorkTable(null)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vấn đề</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 whitespace-pre-wrap min-h-[100px]">
                  {viewingWorkTable.problem}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cách giải quyết</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 whitespace-pre-wrap min-h-[150px]">
                  {viewingWorkTable.solution}
                </div>
              </div>
              {viewingWorkTable.subtasks && viewingWorkTable.subtasks.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Được sử dụng bởi</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="space-y-2">
                      {viewingWorkTable.subtasks.map((subtask: any) => (
                        <div key={subtask.id} className="text-sm">
                          <span className={subtask.is_completed ? 'line-through text-slate-400' : 'text-slate-900'}>
                            {subtask.tasks?.title || 'N/A'} → {subtask.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-4 flex justify-end">
              <button
                onClick={() => setViewingWorkTable(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingWorkTable ? 'Sửa bảng làm việc' : 'Thêm bảng làm việc'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData({ problem: '', solution: '' });
                  setEditingWorkTable(null);
                }}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Vấn đề <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  rows={3}
                  placeholder="Nhập vấn đề..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cách giải quyết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.solution}
                  onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  rows={4}
                  placeholder="Nhập cách giải quyết..."
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ problem: '', solution: '' });
                    setEditingWorkTable(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
