import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { skillService } from '../services/databaseService';
import { Skill, RequirementItem } from '../types';
import { initializeSkillsTable } from '../services/skillTableInit';

export const KyThuatView: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    requirements: [] as RequirementItem[]
  });
  const [newRequirementText, setNewRequirementText] = useState('');

  // Initialize table and load skills
  useEffect(() => {
    const init = async () => {
      // Tự động tạo bảng nếu chưa có (chạy ngầm, không block UI)
      initializeSkillsTable().catch(() => {
        // Silent fail - app vẫn chạy được
      });
      
      // Load data ngay (sẽ retry nếu bảng chưa có)
      loadSkills();
    };
    init();
  }, []);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const loadedSkills = await skillService.getAll();
      setSkills(loadedSkills);
    } catch (error: any) {
      // Nếu bảng chưa tồn tại, hiển thị thông báo thân thiện
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Bảng skills chưa tồn tại. Vui lòng chạy migration_skills.sql trong Supabase SQL Editor');
      } else {
        console.error('Error loading skills:', error);
      }
      setSkills([]); // Set empty array để UI không bị lỗi
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSkill(null);
    setFormData({ name: '', type: '', requirements: [] });
    setNewRequirementText('');
    setIsModalOpen(true);
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setFormData({
      name: skill.name,
      type: skill.type,
      requirements: skill.requirements || []
    });
    setNewRequirementText('');
    setIsModalOpen(true);
  };

  const addRequirement = () => {
    if (newRequirementText.trim()) {
      setFormData({
        ...formData,
        requirements: [...formData.requirements, { text: newRequirementText.trim(), checked: false }]
      });
      setNewRequirementText('');
    }
  };

  const toggleRequirement = (index: number) => {
    const updated = [...formData.requirements];
    updated[index].checked = !updated[index].checked;
    setFormData({ ...formData, requirements: updated });
  };

  const removeRequirement = (index: number) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.filter((_, i) => i !== index)
    });
  };

  const updateRequirementText = (index: number, text: string) => {
    const updated = [...formData.requirements];
    updated[index].text = text;
    setFormData({ ...formData, requirements: updated });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kỹ năng này?')) {
      return;
    }

    try {
      await skillService.delete(id);
      setSkills(skills.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting skill:', error);
      alert('Không thể xóa kỹ năng. Vui lòng thử lại.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.type.trim()) {
      alert('Vui lòng điền đầy đủ thông tin Tên Kỹ Năng và Loại kỹ năng');
      return;
    }

    try {
      if (editingSkill) {
        // Update
        const updated = await skillService.update(editingSkill.id, formData);
        setSkills(skills.map(s => s.id === updated.id ? updated : s));
      } else {
        // Create
        const newSkill = await skillService.create(formData);
        setSkills([newSkill, ...skills]);
      }
      setIsModalOpen(false);
      setFormData({ name: '', type: '', requirements: [] });
      setNewRequirementText('');
      setEditingSkill(null);
    } catch (error: any) {
      console.error('Error saving skill:', error);
      // Hiển thị thông báo lỗi chi tiết hơn
      const errorMessage = error?.message || error?.details || 'Không thể lưu kỹ năng. Vui lòng thử lại.';
      
      // Kiểm tra nếu bảng chưa tồn tại
      if (error?.code === '42P01') {
        alert('Bảng skills chưa tồn tại. Vui lòng chạy migration_skills_rpc.sql trong Supabase SQL Editor trước.');
      } else {
        alert(`Lỗi: ${errorMessage}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kỹ thuật cần có</h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý danh sách kỹ năng và yêu cầu kỹ thuật</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          Thêm kỹ năng
        </button>
      </div>

      {/* Skills Table */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="animate-spin mx-auto mb-2 w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
            <p>Đang tải...</p>
          </div>
        ) : skills.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>Chưa có kỹ năng nào</p>
            <button
              onClick={handleAdd}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Thêm kỹ năng đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Tên Kỹ Năng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Loại kỹ năng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Yêu cầu</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {skills.map((skill) => (
                  <tr key={skill.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{skill.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{skill.type}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="max-w-md">
                        {skill.requirements && skill.requirements.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {skill.requirements.map((req, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                  req.checked 
                                    ? 'bg-green-100 text-green-700 line-through' 
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                <span className={req.checked ? 'line-through' : ''}>{req.text}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(skill)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Sửa"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(skill.id)}
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
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingSkill ? 'Sửa kỹ năng' : 'Thêm kỹ năng mới'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData({ name: '', type: '', requirements: [] });
                  setNewRequirementText('');
                  setEditingSkill(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên Kỹ Năng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ví dụ: React, Node.js, Python..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Loại kỹ năng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ví dụ: Frontend, Backend, Database..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Yêu cầu
                </label>
                
                {/* Add new requirement */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newRequirementText}
                    onChange={(e) => setNewRequirementText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRequirement();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nhập yêu cầu và nhấn Enter hoặc click Thêm"
                  />
                  <button
                    type="button"
                    onClick={addRequirement}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    Thêm
                  </button>
                </div>

                {/* Requirements list */}
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
                  {formData.requirements.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-2">Chưa có yêu cầu nào</p>
                  ) : (
                    formData.requirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                        <input
                          type="checkbox"
                          checked={req.checked}
                          onChange={() => toggleRequirement(index)}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={req.text}
                          onChange={(e) => updateRequirementText(index, e.target.value)}
                          className={`flex-1 px-2 py-1 text-sm border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded ${
                            req.checked ? 'line-through text-slate-400' : 'text-slate-700'
                          }`}
                          placeholder="Nhập yêu cầu..."
                        />
                        <button
                          type="button"
                          onClick={() => removeRequirement(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ name: '', type: '', requirements: [] });
                    setNewRequirementText('');
                    setEditingSkill(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Save size={16} />
                  {editingSkill ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
