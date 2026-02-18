import React, { useState } from 'react';
import { Plus, ChartLine, Trash2, X, Save, Edit } from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

const COLORS_PIE = ['#1A2B49', '#EF7F1A', '#EF4444', '#10B981', '#6366F1', '#F59E0B'];

interface Project {
  id: string;
  name: string;
  industry: string;
  price: string;
  type: string;
  status: string;
  pitch: string;
  startDate: string;
  banner: string;
  media: string[];
  vande: string;
  giaiphap: string;
  khacbiet: string;
}

interface CapitalData {
  label: string;
  value: number;
}

export const CoHoiChoAiView: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'p1',
      name: 'QUẢN LÝ KHO THÔNG MINH',
      industry: 'Sản xuất',
      price: '5.000.000',
      type: 'APPSHEET',
      status: '✅ ĐANG HOẠT ĐỘNG',
      pitch: 'Giảm tồn kho...',
      startDate: '01/2026',
      banner: 'https://via.placeholder.com/400x300',
      media: [],
      vande: 'Thủ công.',
      giaiphap: 'AppSheet.',
      khacbiet: 'Real-time.'
    }
  ]);

  const [capitalData, setCapitalData] = useState<CapitalData[]>([
    { label: 'Sản phẩm', value: 40 },
    { label: 'MKT', value: 30 },
    { label: 'Nhân sự', value: 20 },
    { label: 'Vận hành', value: 10 }
  ]);

  const [growthData, setGrowthData] = useState([15, 35, 70, 120, 200]);
  const [growthLabels] = useState(['2026', '2027', '2028', '2029', '2030']);
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [activeSubTab, setActiveSubTab] = useState(1);
  const [showChartEditor, setShowChartEditor] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showProjectDetailModal, setShowProjectDetailModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    industry: '',
    price: '',
    type: 'APPSHEET',
    status: '✅ ĐANG HOẠT ĐỘNG',
    pitch: '',
    startDate: '',
    banner: '',
    media: [],
    vande: '',
    giaiphap: '',
    khacbiet: ''
  });

  const industries = ['Tất cả', ...new Set(projects.map(p => p.industry))];

  const filteredProjects = activeFilter === 'Tất cả' 
    ? projects 
    : projects.filter(p => p.industry === activeFilter);

  const totalPercent = capitalData.reduce((sum, item) => sum + item.value, 0);

  const lineChartData = growthLabels.map((label, index) => ({
    year: label,
    value: growthData[index]
  }));

  const pieChartData = capitalData.map(item => ({
    name: item.label,
    value: item.value
  }));

  const addCapitalRow = () => {
    setCapitalData([...capitalData, { label: 'Mục mới', value: 0 }]);
  };

  const removeCapitalRow = (index: number) => {
    setCapitalData(capitalData.filter((_, i) => i !== index));
  };

  const updateCapitalValue = (index: number, value: number) => {
    const newData = [...capitalData];
    newData[index].value = value;
    setCapitalData(newData);
  };

  const updateCapitalLabel = (index: number, label: string) => {
    const newData = [...capitalData];
    newData[index].label = label;
    setCapitalData(newData);
  };

  const handleSaveProject = () => {
    if (editingProject) {
      // Update existing project
      const updatedProject: Project = {
        ...editingProject,
        name: newProject.name || editingProject.name,
        industry: newProject.industry || editingProject.industry,
        price: newProject.price || editingProject.price,
        type: newProject.type || editingProject.type,
        status: newProject.status || editingProject.status,
        pitch: newProject.pitch || editingProject.pitch,
        startDate: newProject.startDate || editingProject.startDate,
        banner: newProject.banner || editingProject.banner,
        media: newProject.media || editingProject.media,
        vande: newProject.vande || editingProject.vande,
        giaiphap: newProject.giaiphap || editingProject.giaiphap,
        khacbiet: newProject.khacbiet || editingProject.khacbiet
      };
      setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
    } else {
      // Add new project
      const projectToAdd: Project = {
        id: `p${Date.now()}`,
        name: newProject.name || '',
        industry: newProject.industry || '',
        price: newProject.price || '',
        type: newProject.type || 'APPSHEET',
        status: newProject.status || '✅ ĐANG HOẠT ĐỘNG',
        pitch: newProject.pitch || '',
        startDate: newProject.startDate || '',
        banner: newProject.banner || 'https://via.placeholder.com/400x300',
        media: newProject.media || [],
        vande: newProject.vande || '',
        giaiphap: newProject.giaiphap || '',
        khacbiet: newProject.khacbiet || ''
      };
      setProjects([...projects, projectToAdd]);
    }
    setShowProjectModal(false);
    setEditingProject(null);
    setNewProject({
      name: '',
      industry: '',
      price: '',
      type: 'APPSHEET',
      status: '✅ ĐANG HOẠT ĐỘNG',
      pitch: '',
      startDate: '',
      banner: '',
      media: [],
      vande: '',
      giaiphap: '',
      khacbiet: ''
    });
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Bạn có chắc muốn xóa dự án này?')) {
      setProjects(projects.filter(p => p.id !== projectId));
    }
  };

  const handleViewProjectDetail = (project: Project) => {
    setSelectedProject(project);
    setShowProjectDetailModal(true);
  };

  const handleInvestNow = () => {
    alert('Cảm ơn bạn đã quan tâm! Vui lòng liên hệ với chúng tôi để biết thêm chi tiết về cơ hội đầu tư.');
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-2 sm:p-0">
      {/* Hero Section */}
      <section className="bg-[#1A2B49] text-white flex items-center min-h-[200px] sm:min-h-[300px] rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="w-full px-4 sm:px-6 py-6 sm:py-8 text-center relative z-10">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold mb-3 sm:mb-4 text-[#EF7F1A] uppercase tracking-wide leading-tight">
            Chuẩn hóa cách cá nhân hóa quy trình quản trị doanh nghiệp
          </h1>
          <p className="text-sm sm:text-base md:text-lg max-w-3xl mx-auto opacity-90 leading-relaxed italic px-2">
            Chúng tôi xây dựng nền tảng giúp doanh nghiệp nhanh chóng số hóa và tùy biến quy trình vận hành...
          </p>
        </div>
      </section>

      {/* Portfolio Section */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-3 sm:gap-0 text-[#1A2B49]">
          <div>
            <h2 className="text-lg sm:text-xl font-bold uppercase italic">
              <span className="text-[#EF7F1A]">Portfolio</span> dự án tại UPCODE
            </h2>
            <div className="h-1 w-16 bg-[#EF7F1A] mt-1"></div>
          </div>
          <button
            onClick={() => {
              setEditingProject(null);
              setNewProject({
                name: '',
                industry: '',
                price: '',
                type: 'APPSHEET',
                status: '✅ ĐANG HOẠT ĐỘNG',
                pitch: '',
                startDate: '',
                banner: '',
                media: [],
                vande: '',
                giaiphap: '',
                khacbiet: ''
              });
              setShowProjectModal(true);
            }}
            className="w-full sm:w-auto bg-[#1A2B49] text-white px-4 py-2 sm:py-1.5 rounded-lg font-bold hover:bg-black transition text-xs sm:text-xs shadow-md"
          >
            Thêm dự án
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setActiveFilter(ind)}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-bold uppercase shadow-sm transition whitespace-nowrap flex-shrink-0 ${
                activeFilter === ind
                  ? 'bg-[#EF7F1A] text-white'
                  : 'bg-white text-[#1A2B49] border hover:border-[#EF7F1A]'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl overflow-hidden shadow-md transition hover:shadow-lg cursor-pointer border"
            >
              <div className="h-40 bg-gray-200 relative overflow-hidden">
                <img src={project.banner} alt={project.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 flex flex-row gap-1.5">
                  <span className="bg-[#1A2B49] text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                    {project.type}
                  </span>
                  <span className="bg-green-600 text-white px-2 py-0.5 rounded text-[9px] font-bold">
                    {project.status}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProject(project);
                      setNewProject({
                        name: project.name,
                        industry: project.industry,
                        price: project.price,
                        type: project.type,
                        status: project.status,
                        pitch: project.pitch,
                        startDate: project.startDate,
                        banner: project.banner,
                        media: project.media,
                        vande: project.vande,
                        giaiphap: project.giaiphap,
                        khacbiet: project.khacbiet
                      });
                      setShowProjectModal(true);
                    }}
                    className="bg-[#EF7F1A] text-white p-1.5 rounded-lg shadow-lg hover:bg-[#d66a0a] transition"
                    title="Sửa dự án"
                  >
                    <Edit size={14} />
                  </button>
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className="bg-[#EF7F1A] text-white px-3 py-1 rounded text-[10px] font-bold shadow-lg uppercase">
                    Giá: {project.price || 'Liên hệ'}
                  </span>
                </div>
              </div>
              <div className="p-4 text-left">
                <p className="text-[10px] text-[#EF7F1A] font-bold mb-2 uppercase">
                  {project.industry}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2 italic mb-4">
                  "{project.pitch}"
                </p>
                <button 
                  onClick={() => handleViewProjectDetail(project)}
                  className="w-full py-2 border-2 border-[#1A2B49] text-[#1A2B49] font-bold text-[10px] uppercase rounded-lg hover:bg-[#1A2B49] hover:text-white transition"
                >
                  XEM TOÀN DIỆN DỰ ÁN
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Investment Section */}
      <section className="bg-[#1A2B49] text-white rounded-xl p-4 sm:p-6">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-wider border-b-4 border-[#EF7F1A] pb-2 inline-block">
            CƠ HỘI ĐẦU TƯ
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowChartEditor(!showChartEditor)}
              className="w-full sm:w-auto bg-[#EF7F1A] text-white px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase shadow-lg transition flex items-center justify-center gap-1"
            >
              <ChartLine size={12} />
              Sửa dữ liệu biểu đồ
            </button>
          </div>
        </div>

        {showChartEditor && (
          <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-2xl mb-4 sm:mb-6 text-[#1A2B49] border-4 border-[#EF7F1A]">
            <h5 className="font-black uppercase text-xs mb-3">Cập nhật số liệu tăng trưởng (2026 - 2030)</h5>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              {growthLabels.map((label, i) => (
                <div key={i}>
                  <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={growthData[i]}
                    onChange={(e) => {
                      const newData = [...growthData];
                      newData[i] = parseFloat(e.target.value) || 0;
                      setGrowthData(newData);
                    }}
                    className="w-full p-2 border rounded-lg text-xs font-bold bg-gray-50"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <h3 className="text-[#EF7F1A] text-3xl font-black uppercase italic leading-tight">
              "ĐẦU TƯ VÀO 500% TĂNG TRƯỞNG"
            </h3>
            <h4 className="text-lg font-black text-[#EF7F1A] uppercase italic tracking-tighter border-l-4 border-[#EF7F1A] pl-3 mb-2">
              Biểu đồ tăng trưởng chiến lược
            </h4>
            <div className="h-[180px] sm:h-[200px] w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                <LineChart data={lineChartData}>
                  <XAxis dataKey="year" stroke="#EF7F1A" fontSize={10} />
                  <YAxis stroke="#EF7F1A" fontSize={10} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#EF7F1A"
                    strokeWidth={3}
                    dot={{ fill: '#fff', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl space-y-3 sm:space-y-4 text-left">
            <h4 className="font-black uppercase text-xs border-b pb-2 sm:pb-3 opacity-40 text-[#1A2B49] italic">
              Chỉ số tài chính quan trọng
            </h4>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold uppercase">🌍 TAM (Tổng thị trường)</span>
                <span className="text-[#EF7F1A] font-black text-lg">100 TR USD</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold uppercase">🎯 SAM (Tiếp cận)</span>
                <span className="text-[#1A2B49] font-black text-lg">20 TR USD</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold uppercase">🎯 SOM (Mục tiêu)</span>
                <span className="text-[#1A2B49] font-black text-lg">5 TR USD</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold uppercase">📈 Lợi nhuận dự kiến</span>
                <span className="text-green-600 font-black text-lg">35% / Năm</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold uppercase">🚀 Giai đoạn định giá</span>
                <span className="text-[#1A2B49] font-black text-lg">SEED ROUND</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investor Section */}
      <section className="bg-white border rounded-xl p-4 sm:p-6">
        <div className="mb-4 sm:mb-6 text-center">
          <h2 className="text-lg sm:text-2xl font-black text-[#1A2B49] uppercase italic border-b-4 border-[#EF7F1A] pb-2 inline-block">
            "Nhà đầu tư <span className="text-[#EF7F1A]">thông thái</span> là ai?"
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <button
              key={idx}
              onClick={() => setActiveSubTab(idx)}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] font-black uppercase border-2 border-[#EF7F1A] transition whitespace-nowrap flex-shrink-0 ${
                activeSubTab === idx
                  ? 'bg-[#EF7F1A] text-white'
                  : 'bg-white text-[#EF7F1A]'
              }`}
            >
              {idx === 1 && 'Cơ hội'}
              {idx === 2 && 'Traction'}
              {idx === 3 && 'Sử dụng vốn'}
              {idx === 4 && 'Tài chính'}
              {idx === 5 && 'Đội ngũ'}
              {idx === 6 && 'Đầu tư ngay'}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 p-6 rounded-2xl border shadow-inner min-h-[350px]">
          {activeSubTab === 1 && (
            <div className="space-y-3">
              <h4 className="text-lg font-black text-[#EF7F1A] uppercase italic">
                Phân tích cơ hội thị trường
              </h4>
              <p className="italic text-sm">Dữ liệu TAM/SAM/SOM chi tiết...</p>
            </div>
          )}

          {activeSubTab === 2 && (
            <div className="space-y-3">
              <h4 className="text-lg font-black text-[#EF7F1A] uppercase italic">
                Traction & Thành tích
              </h4>
              <p className="italic text-sm">Doanh thu, tốc độ tăng trưởng...</p>
            </div>
          )}

          {activeSubTab === 3 && (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-full md:w-1/2 space-y-3">
                <h4 className="text-lg font-black text-[#EF7F1A] uppercase italic">
                  Phân bổ vốn dự kiến
                </h4>
                <div className="space-y-2">
                  {capitalData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-white p-2.5 rounded-lg border shadow-sm"
                    >
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateCapitalLabel(index, e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none font-bold text-[#1A2B49] text-xs uppercase"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.value}
                          onChange={(e) => updateCapitalValue(index, parseFloat(e.target.value) || 0)}
                          className="w-14 p-1 border rounded text-right font-black text-[#EF7F1A] text-xs"
                        />
                        <span className="text-[10px] font-bold text-gray-400">%</span>
                        <button
                          onClick={() => removeCapitalRow(index)}
                          className="text-gray-300 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t flex justify-between items-center">
                  <button
                    onClick={addCapitalRow}
                    className="bg-[#EF7F1A] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-md flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Thêm mục
                  </button>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#1A2B49] uppercase">
                      Tổng cộng: <span>{totalPercent}</span>%
                    </p>
                    {totalPercent > 100 && (
                      <p className="text-[9px] text-red-500 font-bold uppercase mt-1 italic">
                        Tổng không được quá 100%!
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 flex justify-center">
                <div className="max-w-[280px] w-full">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 4 && (
            <div className="space-y-3 text-center">
              <h4 className="text-lg font-black text-[#EF7F1A] uppercase italic">
                Dự báo tài chính 5 năm
              </h4>
            </div>
          )}

          {activeSubTab === 5 && (
            <div className="space-y-3 text-center">
              <h4 className="text-lg font-black text-[#EF7F1A] uppercase italic">
                Đội ngũ & Tầm nhìn
              </h4>
            </div>
          )}

          {activeSubTab === 6 && (
            <div className="h-full flex flex-col justify-center items-center text-center py-8">
              <div className="max-w-2xl space-y-6">
                <h4 className="text-3xl font-black text-[#EF7F1A] uppercase italic tracking-tighter">
                  Sở hữu cổ phần Upcode
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-xl border-t-8 border-[#EF7F1A]">
                    <p className="text-[10px] opacity-40 uppercase mb-2">Định giá</p>
                    <p className="text-4xl font-black text-[#1A2B49]">$XXXk</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-xl border-t-8 border-[#1A2B49]">
                    <p className="text-[10px] opacity-40 uppercase mb-2">Equity</p>
                    <p className="text-4xl font-black text-[#EF7F1A]">10-15%</p>
                  </div>
                </div>
                <button 
                  onClick={handleInvestNow}
                  className="bg-[#EF7F1A] text-white px-12 py-4 rounded-full text-lg font-black uppercase shadow-2xl hover:scale-105 transition tracking-widest"
                >
                  Đầu tư ngay
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Project Modal - Add/Edit */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-3 sm:p-4 flex justify-between items-center rounded-t-2xl z-10">
              <h3 className="text-base sm:text-xl font-black text-[#1A2B49] uppercase pr-2">
                {editingProject ? 'Sửa dự án' : 'Thêm dự án mới'}
              </h3>
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setEditingProject(null);
                  setNewProject({
                    name: '',
                    industry: '',
                    price: '',
                    type: 'APPSHEET',
                    status: '✅ ĐANG HOẠT ĐỘNG',
                    pitch: '',
                    startDate: '',
                    banner: '',
                    media: [],
                    vande: '',
                    giaiphap: '',
                    khacbiet: ''
                  });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#1A2B49] uppercase mb-1 block">Lĩnh vực</label>
                  <input
                    type="text"
                    value={newProject.industry || ''}
                    onChange={(e) => setNewProject({ ...newProject, industry: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="Sản xuất"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1A2B49] uppercase mb-1 block">Giá</label>
                  <input
                    type="text"
                    value={newProject.price || ''}
                    onChange={(e) => setNewProject({ ...newProject, price: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="5.000.000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#1A2B49] uppercase mb-1 block">Loại</label>
                  <select
                    value={newProject.type || 'APPSHEET'}
                    onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="APPSHEET">APPSHEET</option>
                    <option value="WEBAPP">WEBAPP</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1A2B49] uppercase mb-1 block">Trạng thái</label>
                  <input
                    type="text"
                    value={newProject.status || ''}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="✅ ĐANG HOẠT ĐỘNG"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#1A2B49] uppercase mb-1 block">Pitch (Tóm tắt)</label>
                <textarea
                  value={newProject.pitch || ''}
                  onChange={(e) => setNewProject({ ...newProject, pitch: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                  rows={3}
                  placeholder="Giảm tồn kho và tối ưu quy trình..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#1A2B49] uppercase mb-1 block">Banner URL</label>
                <input
                  type="text"
                  value={newProject.banner || ''}
                  onChange={(e) => setNewProject({ ...newProject, banner: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="https://via.placeholder.com/400x300"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#1A2B49] uppercase mb-1 block">Vấn đề</label>
                <textarea
                  value={newProject.vande || ''}
                  onChange={(e) => setNewProject({ ...newProject, vande: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                  rows={2}
                  placeholder="Mô tả vấn đề..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#1A2B49] uppercase mb-1 block">Giải pháp</label>
                <textarea
                  value={newProject.giaiphap || ''}
                  onChange={(e) => setNewProject({ ...newProject, giaiphap: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                  rows={2}
                  placeholder="Mô tả giải pháp..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#1A2B49] uppercase mb-1 block">Điểm khác biệt</label>
                <textarea
                  value={newProject.khacbiet || ''}
                  onChange={(e) => setNewProject({ ...newProject, khacbiet: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                  rows={2}
                  placeholder="Mô tả điểm khác biệt..."
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                <button
                  onClick={handleSaveProject}
                  className="w-full sm:flex-1 bg-[#EF7F1A] text-white px-4 py-2.5 rounded-lg font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-[#d66a0a] transition"
                >
                  <Save size={14} />
                  {editingProject ? 'Cập nhật' : 'Thêm mới'}
                </button>
                <button
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProject(null);
                    setNewProject({
                      name: '',
                      industry: '',
                      price: '',
                      type: 'APPSHEET',
                      status: '✅ ĐANG HOẠT ĐỘNG',
                      pitch: '',
                      startDate: '',
                      banner: '',
                      media: [],
                      vande: '',
                      giaiphap: '',
                      khacbiet: ''
                    });
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-bold uppercase text-xs hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {showProjectDetailModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-3 sm:p-4 flex justify-between items-center rounded-t-2xl z-10">
              <h3 className="text-base sm:text-xl font-black text-[#1A2B49] uppercase pr-2">Chi tiết dự án</h3>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditingProject(selectedProject);
                    setNewProject({
                      name: selectedProject.name,
                      industry: selectedProject.industry,
                      price: selectedProject.price,
                      type: selectedProject.type,
                      status: selectedProject.status,
                      pitch: selectedProject.pitch,
                      startDate: selectedProject.startDate,
                      banner: selectedProject.banner,
                      media: selectedProject.media,
                      vande: selectedProject.vande,
                      giaiphap: selectedProject.giaiphap,
                      khacbiet: selectedProject.khacbiet
                    });
                    setShowProjectDetailModal(false);
                    setShowProjectModal(true);
                  }}
                  className="px-3 py-1 bg-[#1A2B49] text-white rounded-lg text-xs font-bold uppercase hover:bg-black transition"
                >
                  Sửa
                </button>
                <button
                  onClick={() => {
                    handleDeleteProject(selectedProject.id);
                    setShowProjectDetailModal(false);
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold uppercase hover:bg-red-600 transition"
                >
                  Xóa
                </button>
                <button
                  onClick={() => {
                    setShowProjectDetailModal(false);
                    setSelectedProject(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <img src={selectedProject.banner} alt={selectedProject.name} className="w-full h-48 sm:h-64 object-cover rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 sm:mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Lĩnh vực</p>
                  <p className="text-sm font-bold text-[#EF7F1A]">{selectedProject.industry}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Loại</p>
                  <p className="text-sm font-bold text-[#1A2B49]">{selectedProject.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Giá</p>
                  <p className="text-sm font-bold text-[#1A2B49]">{selectedProject.price}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Trạng thái</p>
                  <p className="text-sm font-bold text-green-600">{selectedProject.status}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-[#1A2B49] uppercase mb-2">Pitch</h4>
                  <p className="text-sm text-gray-700 italic">"{selectedProject.pitch}"</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A2B49] uppercase mb-2">Vấn đề</h4>
                  <p className="text-sm text-gray-700">{selectedProject.vande}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A2B49] uppercase mb-2">Giải pháp</h4>
                  <p className="text-sm text-gray-700">{selectedProject.giaiphap}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A2B49] uppercase mb-2">Điểm khác biệt</h4>
                  <p className="text-sm text-gray-700">{selectedProject.khacbiet}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
