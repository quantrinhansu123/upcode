import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { problemSolutionService, solutionDetailService } from '../services/databaseService';
import { ProblemSolution, SolutionDetail, RequirementItem, SolutionStep } from '../types';
import { initializeProblemSolutionTable } from '../services/problemSolutionTableInit';
import { WorkTableView } from './WorkTableView';
import { SubtaskWorkTableView } from './SubtaskWorkTableView';

export const VanDeGiaiPhapView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'problem-solution' | 'work-table' | 'subtask-work-table'>('problem-solution');
  const [problemSolutions, setProblemSolutions] = useState<ProblemSolution[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProblemSolution, setEditingProblemSolution] = useState<ProblemSolution | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // View solution details modal
  const [isViewSolutionDetailsModalOpen, setIsViewSolutionDetailsModalOpen] = useState(false);
  const [viewingProblemSolution, setViewingProblemSolution] = useState<ProblemSolution | null>(null);
  const [formData, setFormData] = useState({
    problem: '',
    solution: '',
    description: ''
  });
  
  // Solution detail modal state
  const [isSolutionDetailModalOpen, setIsSolutionDetailModalOpen] = useState(false);
  const [selectedProblemSolutionId, setSelectedProblemSolutionId] = useState<string | null>(null);
  const [editingSolutionDetail, setEditingSolutionDetail] = useState<SolutionDetail | null>(null);
  const [solutionDetailFormData, setSolutionDetailFormData] = useState({
    solution: '',
    advantages: [] as RequirementItem[],
    disadvantages: [] as RequirementItem[],
    steps: [] as SolutionStep[]
  });
  const [newStepDescription, setNewStepDescription] = useState('');
  const [newAdvantageText, setNewAdvantageText] = useState('');
  const [newDisadvantageText, setNewDisadvantageText] = useState('');

  // Initialize table and load data
  useEffect(() => {
    const init = async () => {
      // Tự động tạo bảng nếu chưa có (chạy ngầm, không block UI)
      initializeProblemSolutionTable().catch(() => {
        // Silent fail - app vẫn chạy được
      });
      
      // Load data ngay (sẽ retry nếu bảng chưa có)
      loadProblemSolutions();
    };
    init();
  }, []);

  const loadProblemSolutions = async () => {
    setLoading(true);
    try {
      const loaded = await problemSolutionService.getAll();
      setProblemSolutions(loaded);
    } catch (error: any) {
      // Nếu bảng chưa tồn tại, hiển thị thông báo thân thiện
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Bảng problem_solutions chưa tồn tại. Vui lòng chạy migration_problem_solution.sql trong Supabase SQL Editor');
      } else {
        console.error('Error loading problem solutions:', error);
      }
      setProblemSolutions([]); // Set empty array để UI không bị lỗi
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProblemSolution(null);
    setFormData({ problem: '', solution: '', description: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (item: ProblemSolution) => {
    setEditingProblemSolution(item);
    setFormData({
      problem: item.problem,
      solution: item.solution,
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mục này?')) {
      return;
    }

    try {
      await problemSolutionService.delete(id);
      setProblemSolutions(problemSolutions.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting problem solution:', error);
      alert('Không thể xóa. Vui lòng thử lại.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.problem.trim() || !formData.solution.trim()) {
      alert('Vui lòng điền đầy đủ thông tin Vấn đề và Giải pháp');
      return;
    }

    try {
      if (editingProblemSolution) {
        // Update
        const updated = await problemSolutionService.update(editingProblemSolution.id, formData);
        setProblemSolutions(problemSolutions.map(item => item.id === updated.id ? updated : item));
      } else {
        // Create
        const newItem = await problemSolutionService.create(formData);
        setProblemSolutions([newItem, ...problemSolutions]);
      }
      setIsModalOpen(false);
      setFormData({ problem: '', solution: '', description: '' });
      setEditingProblemSolution(null);
      // Reload để có solution details mới nhất
      loadProblemSolutions();
    } catch (error: any) {
      console.error('Error saving problem solution:', error);
      
      // Hiển thị thông báo lỗi chi tiết hơn
      const errorMessage = error?.message || error?.details || 'Không thể lưu. Vui lòng thử lại.';
      
      // Kiểm tra nếu bảng chưa tồn tại
      if (error?.code === '42P01' || error?.code === 'PGRST116' || error?.code === 'TABLE_NOT_EXISTS' || 
          error?.message?.includes('does not exist') || error?.message?.includes('404') || 
          error?.message?.includes('schema cache') || error?.message?.includes('Could not find the table')) {
        alert('Bảng problem_solutions chưa tồn tại.\n\n📝 Vui lòng làm theo các bước sau:\n\n1. Mở Supabase Dashboard\n2. Vào SQL Editor\n3. Chạy file: migration_problem_solution_rpc.sql\n\nSau đó thử lại.');
      } else {
        alert(`Lỗi: ${errorMessage}\n\nVui lòng kiểm tra Console (F12) để xem chi tiết.`);
      }
    }
  };

  const handleViewSolutionDetails = (item: ProblemSolution) => {
    setViewingProblemSolution(item);
    setIsViewSolutionDetailsModalOpen(true);
  };

  const handleAddSolutionDetail = (problemSolutionId: string) => {
    setSelectedProblemSolutionId(problemSolutionId);
    setEditingSolutionDetail(null);
    setSolutionDetailFormData({ solution: '', advantages: [], disadvantages: [] });
    setIsSolutionDetailModalOpen(true);
  };

  const handleEditSolutionDetail = (detail: SolutionDetail) => {
    setEditingSolutionDetail(detail);
    setSelectedProblemSolutionId(detail.problemSolutionId);
    setSolutionDetailFormData({
      solution: detail.solution,
      advantages: detail.advantages || [],
      disadvantages: detail.disadvantages || [],
      steps: detail.steps || []
    });
    setNewAdvantageText('');
    setNewDisadvantageText('');
    setIsSolutionDetailModalOpen(true);
  };

  // Advantages handlers
  const addAdvantage = () => {
    if (newAdvantageText.trim()) {
      setSolutionDetailFormData({
        ...solutionDetailFormData,
        advantages: [...solutionDetailFormData.advantages, { text: newAdvantageText.trim(), checked: false }]
      });
      setNewAdvantageText('');
    }
  };

  const toggleAdvantage = (index: number) => {
    const updated = [...solutionDetailFormData.advantages];
    updated[index].checked = !updated[index].checked;
    setSolutionDetailFormData({ ...solutionDetailFormData, advantages: updated });
  };

  const removeAdvantage = (index: number) => {
    setSolutionDetailFormData({
      ...solutionDetailFormData,
      advantages: solutionDetailFormData.advantages.filter((_, i) => i !== index)
    });
  };

  // Disadvantages handlers
  const addDisadvantage = () => {
    if (newDisadvantageText.trim()) {
      setSolutionDetailFormData({
        ...solutionDetailFormData,
        disadvantages: [...solutionDetailFormData.disadvantages, { text: newDisadvantageText.trim(), checked: false }]
      });
      setNewDisadvantageText('');
    }
  };

  const toggleDisadvantage = (index: number) => {
    const updated = [...solutionDetailFormData.disadvantages];
    updated[index].checked = !updated[index].checked;
    setSolutionDetailFormData({ ...solutionDetailFormData, disadvantages: updated });
  };

  const removeDisadvantage = (index: number) => {
    setSolutionDetailFormData({
      ...solutionDetailFormData,
      disadvantages: solutionDetailFormData.disadvantages.filter((_, i) => i !== index)
    });
  };

  // Steps handlers
  const addStep = () => {
    const trimmed = newStepDescription.trim();
    if (trimmed) {
      const nextStepNumber = solutionDetailFormData.steps.length + 1;
      const newStep = { stepNumber: nextStepNumber, description: trimmed };
      console.log('Adding step:', newStep);
      console.log('Current steps:', solutionDetailFormData.steps);
      setSolutionDetailFormData({
        ...solutionDetailFormData,
        steps: [...solutionDetailFormData.steps, newStep]
      });
      setNewStepDescription('');
      console.log('Step added, new steps count:', solutionDetailFormData.steps.length + 1);
    } else {
      console.log('Step description is empty, not adding');
    }
  };

  const updateStep = (index: number, description: string) => {
    const updated = [...solutionDetailFormData.steps];
    updated[index].description = description;
    setSolutionDetailFormData({ ...solutionDetailFormData, steps: updated });
  };

  const removeStep = (index: number) => {
    const updated = solutionDetailFormData.steps.filter((_, i) => i !== index);
    // Re-number steps after removal
    const renumbered = updated.map((step, i) => ({ ...step, stepNumber: i + 1 }));
    setSolutionDetailFormData({ ...solutionDetailFormData, steps: renumbered });
  };

  const handleDeleteSolutionDetail = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa giải pháp chi tiết này?')) {
      return;
    }

    try {
      await solutionDetailService.delete(id);
      // Reload để cập nhật UI
      loadProblemSolutions();
    } catch (error) {
      console.error('Error deleting solution detail:', error);
      alert('Không thể xóa. Vui lòng thử lại.');
    }
  };

  const handleSolutionDetailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!solutionDetailFormData.solution.trim()) {
      alert('Vui lòng điền Giải pháp');
      return;
    }

    if (!selectedProblemSolutionId) return;

    try {
      if (editingSolutionDetail) {
        // Update
        await solutionDetailService.update(editingSolutionDetail.id, solutionDetailFormData);
      } else {
        // Create
        await solutionDetailService.create({
          problemSolutionId: selectedProblemSolutionId,
          ...solutionDetailFormData
        });
      }
      setIsSolutionDetailModalOpen(false);
      setSolutionDetailFormData({ solution: '', advantages: [], disadvantages: [] });
      setEditingSolutionDetail(null);
      setSelectedProblemSolutionId(null);
      // Reload để cập nhật UI
      loadProblemSolutions();
    } catch (error: any) {
      console.error('Error saving solution detail:', error);
      alert('Không thể lưu. Vui lòng thử lại.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('problem-solution')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'problem-solution'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Vấn đề giải pháp
        </button>
        <button
          onClick={() => setActiveTab('work-table')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'work-table'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Bảng làm việc
        </button>
        <button
          onClick={() => setActiveTab('subtask-work-table')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'subtask-work-table'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Xem lại Subtasks
        </button>
      </div>

      {/* Render based on active tab */}
      {activeTab === 'work-table' ? (
        <WorkTableView />
      ) : activeTab === 'subtask-work-table' ? (
        <SubtaskWorkTableView />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Vấn đề giải pháp</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Quản lý danh sách vấn đề và giải pháp</p>
            </div>
        <button
          onClick={handleAdd}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base"
        >
          <Plus size={18} />
          <span className="sm:inline">Thêm mới</span>
        </button>
      </div>

      {/* Table - Desktop, Cards - Mobile */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 sm:p-8 text-center text-slate-500">
            <div className="animate-spin mx-auto mb-2 w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="text-sm sm:text-base">Đang tải...</p>
          </div>
        ) : problemSolutions.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-slate-500">
            <p className="text-sm sm:text-base">Chưa có dữ liệu nào</p>
            <button
              onClick={handleAdd}
              className="mt-4 px-4 py-2 text-sm sm:text-base text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Thêm mục đầu tiên
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Vấn đề</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Giải pháp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Mô tả</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {problemSolutions.map((item) => {
                    const solutionDetails = item.solutionDetails || [];
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 max-w-md">
                          <div className="line-clamp-2" title={item.problem}>{item.problem}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-md">
                          <div className="line-clamp-2" title={item.solution}>{item.solution}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-md">
                          <div className="line-clamp-2" title={item.description || ''}>
                            {item.description || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {solutionDetails.length > 0 && (
                              <button
                                onClick={() => handleViewSolutionDetails(item)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Xem giải pháp chi tiết"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleAddSolutionDetail(item.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Thêm giải pháp chi tiết"
                            >
                              <Plus size={16} />
                            </button>
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {problemSolutions.map((item) => {
                const solutionDetails = item.solutionDetails || [];
                
                return (
                  <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="space-y-2 mb-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Vấn đề</div>
                        <div className="text-sm font-medium text-slate-800">{item.problem}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Giải pháp</div>
                        <div className="text-sm text-slate-600">{item.solution}</div>
                      </div>
                      {item.description && (
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Mô tả</div>
                          <div className="text-sm text-slate-600">{item.description}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      {solutionDetails.length > 0 && (
                        <button
                          onClick={() => handleViewSolutionDetails(item)}
                          className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Xem giải pháp chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleAddSolutionDetail(item.id)}
                        className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Thêm giải pháp chi tiết"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Sửa"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 pr-2">
                {editingProblemSolution ? 'Sửa vấn đề giải pháp' : 'Thêm vấn đề giải pháp mới'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData({ problem: '', solution: '', description: '' });
                  setEditingProblemSolution(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vấn đề <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mô tả vấn đề..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Giải pháp <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.solution}
                  onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mô tả giải pháp..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mô tả thêm
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mô tả thêm (tùy chọn)..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ problem: '', solution: '', description: '' });
                    setEditingProblemSolution(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                >
                  <Save size={16} />
                  {editingProblemSolution ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Solution Detail Modal */}
      {isSolutionDetailModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 pr-2">
                {editingSolutionDetail ? 'Sửa giải pháp chi tiết' : 'Thêm giải pháp chi tiết'}
              </h3>
              <button
                onClick={() => {
                  setIsSolutionDetailModalOpen(false);
                  setSolutionDetailFormData({ solution: '', advantages: [], disadvantages: [], steps: [] });
                  setNewAdvantageText('');
                  setNewDisadvantageText('');
                  setNewStepDescription('');
                  setEditingSolutionDetail(null);
                  setSelectedProblemSolutionId(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSolutionDetailSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Giải pháp <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={solutionDetailFormData.solution}
                  onChange={(e) => setSolutionDetailFormData({ ...solutionDetailFormData, solution: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mô tả giải pháp..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ưu điểm <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAdvantageText}
                      onChange={(e) => setNewAdvantageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addAdvantage();
                        }
                      }}
                      className="flex-1 px-3 py-2.5 text-sm sm:text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nhập ưu điểm..."
                    />
                    <button
                      type="button"
                      onClick={addAdvantage}
                      className="px-3 sm:px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {solutionDetailFormData.advantages.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-2">Chưa có ưu điểm nào</p>
                    ) : (
                      solutionDetailFormData.advantages.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleAdvantage(index)}
                            className="rounded"
                          />
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const updated = [...solutionDetailFormData.advantages];
                              updated[index].text = e.target.value;
                              setSolutionDetailFormData({ ...solutionDetailFormData, advantages: updated });
                            }}
                            className={`flex-1 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              item.checked ? 'line-through text-green-600 bg-green-50' : ''
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => removeAdvantage(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nhược điểm <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDisadvantageText}
                      onChange={(e) => setNewDisadvantageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addDisadvantage();
                        }
                      }}
                      className="flex-1 px-3 py-2.5 text-sm sm:text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nhập nhược điểm..."
                    />
                    <button
                      type="button"
                      onClick={addDisadvantage}
                      className="px-3 sm:px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {solutionDetailFormData.disadvantages.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-2">Chưa có nhược điểm nào</p>
                    ) : (
                      solutionDetailFormData.disadvantages.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleDisadvantage(index)}
                            className="rounded"
                          />
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const updated = [...solutionDetailFormData.disadvantages];
                              updated[index].text = e.target.value;
                              setSolutionDetailFormData({ ...solutionDetailFormData, disadvantages: updated });
                            }}
                            className={`flex-1 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              item.checked ? 'line-through text-red-600 bg-red-50' : ''
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => removeDisadvantage(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Steps Section */}
              <div className="border-t-2 border-indigo-300 pt-4 mt-4 bg-indigo-50/30 rounded-lg p-4">
                <label className="block text-base font-bold text-indigo-700 mb-3 flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <span>Các bước thực hiện</span>
                </label>
                <div className="space-y-3">
                  <div className="space-y-2 bg-white p-3 rounded-lg border-2 border-indigo-200">
                    <textarea
                      value={newStepDescription}
                      onChange={(e) => setNewStepDescription(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm sm:text-base border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      placeholder="Nhập mô tả chi tiết bước (ví dụ: Bước 1 - Chuẩn bị nguyên liệu, Bước 2 - Thực hiện...)..."
                      rows={3}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Add step button clicked, newStepDescription:', newStepDescription);
                        console.log('Current steps before add:', solutionDetailFormData.steps);
                        addStep();
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-md"
                    >
                      <Plus size={18} />
                      <span>Thêm bước</span>
                    </button>
                  </div>
                  <div className="border-2 border-indigo-200 rounded-lg p-3 bg-white max-h-64 overflow-y-auto space-y-3">
                    {solutionDetailFormData.steps.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-slate-500 font-medium mb-1">Chưa có bước nào</p>
                        <p className="text-xs text-slate-400">Nhập mô tả bước ở trên và nhấn nút "Thêm bước"</p>
                      </div>
                    ) : (
                      solutionDetailFormData.steps.map((step, index) => {
                        console.log('Rendering step in form:', step, 'index:', index, 'Total steps:', solutionDetailFormData.steps.length);
                        return (
                        <div key={index} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border-2 border-indigo-200 shadow-sm">
                          <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-base shadow-md">
                            {step.stepNumber}
                          </div>
                          <textarea
                            value={step.description}
                            onChange={(e) => updateStep(index, e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white"
                            placeholder="Mô tả chi tiết bước..."
                            rows={3}
                          />
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 border border-red-200"
                            title="Xóa bước"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsSolutionDetailModalOpen(false);
                    setSolutionDetailFormData({ solution: '', advantages: [], disadvantages: [], steps: [] });
                    setNewAdvantageText('');
                    setNewDisadvantageText('');
                    setNewStepDescription('');
                    setEditingSolutionDetail(null);
                    setSelectedProblemSolutionId(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                >
                  <Save size={16} />
                  {editingSolutionDetail ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Solution Details Modal */}
      {isViewSolutionDetailsModalOpen && viewingProblemSolution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800">Giải pháp chi tiết</h3>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{viewingProblemSolution.problem}</p>
              </div>
              <button
                onClick={() => {
                  setIsViewSolutionDetailsModalOpen(false);
                  setViewingProblemSolution(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-4"
                title="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {viewingProblemSolution.solutionDetails && viewingProblemSolution.solutionDetails.length > 0 ? (
                <div className="space-y-4">
                  {viewingProblemSolution.solutionDetails.map((detail) => {
                    const advantages = Array.isArray(detail.advantages) ? detail.advantages : [];
                    const disadvantages = Array.isArray(detail.disadvantages) ? detail.disadvantages : [];
                    // Parse steps - đảm bảo luôn là array
                    let steps: SolutionStep[] = [];
                    if (detail.steps) {
                      if (Array.isArray(detail.steps)) {
                        steps = detail.steps;
                      } else if (typeof detail.steps === 'string') {
                        try {
                          steps = JSON.parse(detail.steps);
                        } catch (e) {
                          console.warn('Error parsing steps:', e);
                          steps = [];
                        }
                      }
                    }
                    
                    // Debug: log để kiểm tra
                    console.log('Detail:', detail);
                    console.log('Steps raw:', detail.steps);
                    console.log('Steps parsed:', steps);
                    
                    return (
                      <div key={detail.id} className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                          <div className="flex-1">
                            <h4 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">Giải pháp</h4>
                            <p className="text-sm sm:text-base text-slate-700">{detail.solution}</p>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => {
                                setIsViewSolutionDetailsModalOpen(false);
                                handleEditSolutionDetail(detail);
                              }}
                              className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Sửa"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Bạn có chắc chắn muốn xóa giải pháp chi tiết này?')) {
                                  await handleDeleteSolutionDetail(detail.id);
                                  loadProblemSolutions();
                                  setIsViewSolutionDetailsModalOpen(false);
                                  setViewingProblemSolution(null);
                                }
                              }}
                              className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                          <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-green-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                              <strong className="text-green-700 text-sm sm:text-base">Ưu điểm</strong>
                            </div>
                            {advantages.length > 0 ? (
                              <ul className="space-y-1.5 sm:space-y-2">
                                {advantages.map((item: RequirementItem, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-green-50 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={item.checked || false}
                                      readOnly
                                      className="mt-0.5 rounded flex-shrink-0"
                                    />
                                    <span className={`text-xs sm:text-sm flex-1 ${item.checked ? 'line-through text-green-600' : 'text-slate-700'}`}>
                                      {item.text || ''}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs sm:text-sm text-slate-400 italic">Chưa có ưu điểm nào</p>
                            )}
                          </div>

                          <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-red-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                              <strong className="text-red-700 text-sm sm:text-base">Nhược điểm</strong>
                            </div>
                            {disadvantages.length > 0 ? (
                              <ul className="space-y-1.5 sm:space-y-2">
                                {disadvantages.map((item: RequirementItem, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-red-50 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={item.checked || false}
                                      readOnly
                                      className="mt-0.5 rounded flex-shrink-0"
                                    />
                                    <span className={`text-xs sm:text-sm flex-1 ${item.checked ? 'line-through text-red-600' : 'text-slate-700'}`}>
                                      {item.text || ''}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs sm:text-sm text-slate-400 italic">Chưa có nhược điểm nào</p>
                            )}
                          </div>
                        </div>

                        {/* Steps Section */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <strong className="text-indigo-700 text-sm sm:text-base">Các bước thực hiện</strong>
                          </div>
                          {steps.length > 0 ? (
                            <div className="space-y-3">
                              {steps.map((step: SolutionStep, idx: number) => (
                                <div key={idx} className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200 shadow-sm">
                                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-base">
                                    {step.stepNumber}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs font-semibold text-indigo-600 mb-1">Bước {step.stepNumber}</div>
                                    <p className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap">{step.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 italic text-center py-4">Chưa có bước nào được thêm</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-slate-400 mb-4">
                    <Eye size={48} className="mx-auto opacity-50" />
                  </div>
                  <p className="text-slate-600 font-medium mb-2">Chưa có giải pháp chi tiết nào</p>
                  <button
                    onClick={() => {
                      setIsViewSolutionDetailsModalOpen(false);
                      handleAddSolutionDetail(viewingProblemSolution.id);
                    }}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Thêm giải pháp chi tiết đầu tiên
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
