import React, { useState, useEffect } from 'react';
import { Eye, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { subtaskService } from '../services/databaseService';
import { Subtask } from '../types';

interface SubtaskWithTaskInfo extends Subtask {
  taskTitle?: string;
  projectId?: string;
}

export const SubtaskWorkTableView: React.FC = () => {
  const [subtasks, setSubtasks] = useState<SubtaskWithTaskInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingWorkTable, setViewingWorkTable] = useState<{ subtaskTitle: string; problem: string; solution: string } | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  useEffect(() => {
    loadSubtasks();
  }, []);

  const loadSubtasks = async () => {
    setLoading(true);
    try {
      const allSubtasks = await subtaskService.getAllWithWorkTables();
      console.log('Loaded subtasks with work tables:', allSubtasks);
      setSubtasks(allSubtasks);
    } catch (error: any) {
      console.error('Error loading subtasks:', error);
      // Nếu lỗi do bảng chưa tồn tại, hiển thị thông báo
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Bảng subtasks hoặc work_tables chưa tồn tại. Vui lòng chạy migration.');
      }
      setSubtasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter theo search query
  const filteredSubtasks = subtasks.filter(subtask => {
    const matchesSearch = !searchQuery || 
      subtask.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subtask.workTable?.problem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subtask.workTable?.solution?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subtask as SubtaskWithTaskInfo).taskTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProject = selectedProject === 'all' || (subtask as SubtaskWithTaskInfo).projectId === selectedProject;
    
    return matchesSearch && matchesProject;
  });

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-8 text-slate-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Xem lại Vấn đề Giải pháp của Subtasks</h2>
        <p className="text-sm text-slate-500 mt-1">Danh sách tất cả subtasks đã có vấn đề và giải pháp</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên subtask, vấn đề, giải pháp..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-slate-400 mb-2">
          Tìm thấy {filteredSubtasks.length} subtask(s) có vấn đề giải pháp
        </div>
      )}

      {/* Results */}
      {filteredSubtasks.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-slate-500 mb-4">
            {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có subtask nào có vấn đề giải pháp'}
          </p>
          {!loading && (
            <button
              onClick={loadSubtasks}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              Tải lại
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Subtask</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Vấn đề</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Giải pháp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Ngày tạo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSubtasks.map((subtask) => (
                  <tr key={subtask.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="max-w-xs truncate" title={subtask.taskTitle}>
                        {subtask.taskTitle}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="max-w-xs truncate" title={subtask.title}>
                        {subtask.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="max-w-md truncate" title={subtask.workTable?.problem}>
                        {subtask.workTable?.problem || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="max-w-md truncate" title={subtask.workTable?.solution}>
                        {subtask.workTable?.solution || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {subtask.workTable?.createdAt ? format(new Date(subtask.workTable.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setViewingWorkTable({
                          subtaskTitle: subtask.title,
                          problem: subtask.workTable!.problem,
                          solution: subtask.workTable!.solution
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
      )}

      {/* View Modal */}
      {viewingWorkTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg font-semibold text-slate-900">
                Vấn đề và Giải pháp - {viewingWorkTable.subtaskTitle}
              </h3>
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
    </div>
  );
};
