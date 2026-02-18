import React, { useState, useEffect } from 'react';

interface PricingItem {
  name: string;
  desc: string;
  price: number;
}

interface TimelineItem {
  phase: string;
  work: string;
}

interface PaymentPhase {
  phase: string;
  timing: string;
  value: string;
  items: string;
}

interface QuoteData {
  items: PricingItem[];
  timeline: TimelineItem[];
  paymentPhases: PaymentPhase[];
}

export const BaoGiaView: React.FC = () => {
  const [quoteData, setQuoteData] = useState<QuoteData>({
    items: [
      { name: 'Phân tích & Thiết kế', desc: 'Wireframe, UI/UX Design', price: 5000000 },
      { name: 'Phát triển Web App', desc: 'Backend, Frontend, Database', price: 15000000 },
      { name: 'Tích hợp AppSheet', desc: 'Kết nối Google Sheets, App Mobile', price: 8000000 }
    ],
    timeline: [
      { phase: 'Tuần 1', work: 'Khảo sát & Chốt yêu cầu' },
      { phase: 'Tuần 2-3', work: 'Phát triển & Kiểm thử' },
      { phase: 'Tuần 4', work: 'Bàn giao' }
    ],
    paymentPhases: [
      { phase: 'Đợt 1', timing: 'Sau ký HĐ', value: '40%', items: 'Tạm ứng' },
      { phase: 'Đợt 2', timing: 'Sau Demo', value: '40%', items: 'Bản thử nghiệm' },
      { phase: 'Đợt 3', timing: 'Sau nghiệm thu', value: '20%', items: 'Bàn giao Code' }
    ]
  });

  const [generalData, setGeneralData] = useState({
    title: 'BÁO GIÁ DỊCH VỤ',
    client: 'Công ty ABC',
    date: new Date().toISOString().split('T')[0],
    hotline: '0987.654.321',
    email: 'contact@upcode.vn',
    validity: '30 ngày',
    duration: '4 Tuần',
    warranty: '12 Tháng',
    thankyou: 'Kính gửi Quý khách hàng, UPCODE trân trọng cảm ơn sự quan tâm của quý vị.',
    solution: '- Thiết kế hệ thống quản lý dữ liệu.',
    scope: 'Thiết kế UI/UX, Dev Frontend/Backend.',
    exclusion: 'Hosting, Domain, Content.',
    paymentInfo: 'Ngân hàng: VIETINBANK\nSố TK: 100001692967\nChủ TK: UPCODE TECHNOLOGY',
    sigDate: 'Hà Nội, ngày 24 tháng 01 năm 2026',
    sigName: 'Nguyễn Văn A',
    sigRole: 'Trưởng phòng Kinh doanh'
  });

  const [selectedQRPhaseIndex, setSelectedQRPhaseIndex] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');

  const removeVietnameseTones = (str: string): string => {
    return str
      .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
      .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
      .replace(/ì|í|ị|ỉ|ĩ/g, "i")
      .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
      .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
      .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
      .replace(/đ/g, "d")
      .replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A")
      .replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E")
      .replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I")
      .replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O")
      .replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U")
      .replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y")
      .replace(/Đ/g, "D");
  };

  const calculateTotal = (): number => {
    return quoteData.items.reduce((sum, item) => sum + Number(item.price), 0);
  };

  const getQRCodeUrl = (): string => {
    const total = calculateTotal();
    let phaseAmount = total;
    if (quoteData.paymentPhases[selectedQRPhaseIndex]) {
      const percentStr = quoteData.paymentPhases[selectedQRPhaseIndex].value;
      const percent = parseFloat(percentStr) / 100;
      if (!isNaN(percent)) phaseAmount = total * percent;
    }
    const bankId = 'vietinbank';
    const accountNo = '100001692967';
    const clientNameNoTone = removeVietnameseTones(generalData.client).toUpperCase();
    const phaseNum = selectedQRPhaseIndex + 1;
    const transferContent = `${clientNameNoTone} DOT ${phaseNum}`;
    const info = encodeURIComponent(transferContent);
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?amount=${phaseAmount}&addInfo=${info}`;
  };

  const getPaymentInfo = (): string => {
    const clientNameNoTone = removeVietnameseTones(generalData.client).toUpperCase();
    const phaseNum = selectedQRPhaseIndex + 1;
    const transferContent = `${clientNameNoTone} DOT ${phaseNum}`;
    return `${generalData.paymentInfo}\nNội dung: ${transferContent}`;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '...';
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const saveToLocal = () => {
    const data = { general: generalData, lists: quoteData };
    localStorage.setItem('upcode_quote_v22', JSON.stringify(data));
    setStatusMsg('Đã lưu!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const loadFromLocal = () => {
    const saved = localStorage.getItem('upcode_quote_v22');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.general) setGeneralData(data.general);
        if (data.lists) setQuoteData(data.lists);
        setStatusMsg('Đã khôi phục!');
        setTimeout(() => setStatusMsg(''), 3000);
      } catch (e) {
        console.error('Error loading:', e);
      }
    }
  };

  const exportJSON = () => {
    const data = { general: generalData, lists: quoteData };
    const s = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const a = document.createElement('a');
    a.href = s;
    a.download = `BaoGia_${generalData.client.replace(/\W/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.general) setGeneralData(data.general);
        if (data.lists) setQuoteData(data.lists);
        setStatusMsg('OK');
        setTimeout(() => setStatusMsg(''), 3000);
      } catch (x) {
        alert('Lỗi');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const addItem = () => {
    setQuoteData({
      ...quoteData,
      items: [...quoteData.items, { name: '', desc: '', price: 0 }]
    });
  };

  const updateItem = (index: number, field: keyof PricingItem, value: string | number) => {
    const newItems = [...quoteData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuoteData({ ...quoteData, items: newItems });
  };

  const deleteItem = (index: number) => {
    if (confirm('Xóa?')) {
      const newItems = quoteData.items.filter((_, i) => i !== index);
      setQuoteData({ ...quoteData, items: newItems });
    }
  };

  const addTimeline = () => {
    setQuoteData({
      ...quoteData,
      timeline: [...quoteData.timeline, { phase: 'Tuần...', work: '...' }]
    });
  };

  const updateTimeline = (index: number, field: keyof TimelineItem, value: string) => {
    const newTimeline = [...quoteData.timeline];
    newTimeline[index] = { ...newTimeline[index], [field]: value };
    setQuoteData({ ...quoteData, timeline: newTimeline });
  };

  const deleteTimeline = (index: number) => {
    const newTimeline = quoteData.timeline.filter((_, i) => i !== index);
    setQuoteData({ ...quoteData, timeline: newTimeline });
  };

  const addPaymentPhase = () => {
    setQuoteData({
      ...quoteData,
      paymentPhases: [...quoteData.paymentPhases, { phase: 'Đợt...', timing: '...', value: '...', items: '...' }]
    });
  };

  const updatePaymentPhase = (index: number, field: keyof PaymentPhase, value: string) => {
    const newPhases = [...quoteData.paymentPhases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setQuoteData({ ...quoteData, paymentPhases: newPhases });
  };

  const deletePaymentPhase = (index: number) => {
    const newPhases = quoteData.paymentPhases.filter((_, i) => i !== index);
    setQuoteData({ ...quoteData, paymentPhases: newPhases });
  };

  useEffect(() => {
    loadFromLocal();
  }, []);

  return (
    <div className="bao-gia-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@400;500;600;700;800&display=swap');
        :root {
          --primary-color: #0F172A;
          --accent-color: #F97316;
          --bg-editor: #f8fafc;
          --border-color: #cbd5e1;
          --page-padding-side: 45px;
          --header-visible-height: 130px;
          --header-space-height: 150px;
          --footer-height: 60px;
        }
        .preview-pane { flex: 1; padding: 40px; overflow-y: auto; display: flex; justify-content: center; background: #525659; }
        .a4-wrapper { width: 210mm; min-height: 297mm; background: white; box-shadow: 0 5px 15px rgba(0,0,0,0.5); position: relative; display: flex; flex-direction: column; margin-bottom: 50px; }
        .print-header { position: absolute; top: 0; left: 0; right: 0; height: var(--header-visible-height); padding: 40px var(--page-padding-side) 0; background: white; z-index: 100; }
        .header-inner { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 15px; height: 100%; border-bottom: 3px solid var(--accent-color); }
        .print-footer { position: absolute; bottom: 0; left: 0; right: 0; height: var(--footer-height); padding: 0 var(--page-padding-side); background: white; z-index: 100; }
        .footer-inner { display: flex; justify-content: space-between; align-items: center; height: 100%; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
        .print-table { width: 100%; border-collapse: collapse; }
        .header-space { height: var(--header-space-height); }
        .footer-space { height: var(--footer-height); }
        .print-content-body { padding: 0 var(--page-padding-side) 20px; vertical-align: top; }
        .section-wrapper { page-break-inside: avoid; break-inside: avoid; margin-bottom: 15px; }
        .brand h1 { font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 32px; color: var(--primary-color); line-height: 1; margin: 0; letter-spacing: -1px; }
        .brand span { color: var(--accent-color); }
        .brand p { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-top: 5px; font-weight: 600; }
        .doc-info { text-align: right; margin-bottom: 5px; }
        .doc-info h2 { font-family: 'Montserrat', sans-serif; color: var(--primary-color); font-size: 24px; text-transform: uppercase; font-weight: 700; margin: 0 0 5px 0; }
        .doc-info p { font-size: 12px; color: #475569; margin: 3px 0 0 0; }
        .summary-bar { display: flex; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 15px; margin-bottom: 25px; gap: 20px; }
        .summary-item { flex: 1; display: flex; flex-direction: column; }
        .sum-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 2px; }
        .sum-val { font-size: 12px; font-weight: 700; color: var(--primary-color); }
        .section-header { font-family: 'Montserrat', sans-serif; font-size: 14px; color: var(--primary-color); border-left: 4px solid var(--accent-color); padding-left: 10px; margin: 25px 0 12px 0; text-transform: uppercase; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .thank-you-text { font-style: italic; color: #475569; font-size: 13px; margin-bottom: 20px; margin-top: 10px; }
        .content-block { font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap; margin-bottom: 15px; }
        .scope-box { font-size: 12px; color: #475569; background: #fff; padding: 0; margin-top: 5px; border-left: 2px solid #e2e8f0; padding-left: 10px; }
        .custom-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
        .custom-table th { background: var(--primary-color); color: white; padding: 10px; text-align: left; font-family: 'Montserrat', sans-serif; font-weight: 600; }
        .custom-table td { border-bottom: 1px solid #e2e8f0; padding: 10px; vertical-align: top; color: #1e293b; }
        .custom-table tbody tr:nth-child(even) { background-color: #f8fafc; }
        .col-price-header { text-align: right !important; width: 140px; }
        .col-price-cell { text-align: right; font-weight: 600; }
        .total-row { background: white !important; }
        .total-label { text-align: right; font-weight: 700; font-size: 14px; padding-top: 15px !important; color: var(--primary-color); }
        .total-value-cell { background: var(--accent-color); color: white; font-weight: 800; font-size: 16px; text-align: right; padding: 12px 10px !important; border-radius: 4px; }
        .timeline-box { display: flex; justify-content: space-between; margin-top: 20px; position: relative; }
        .timeline-box::before { content: ''; position: absolute; top: 12px; left: 0; right: 0; height: 2px; background: #e2e8f0; z-index: 0; }
        .t-item { position: relative; z-index: 1; background: white; padding: 0 4px; text-align: center; flex: 1; }
        .t-circle { width: 26px; height: 26px; background: var(--primary-color); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 0 0 2px var(--accent-color); }
        .t-title { font-weight: bold; font-size: 11px; color: var(--primary-color); margin-bottom: 2px; }
        .t-desc { font-size: 11px; color: #64748b; line-height: 1.3; }
        .payment-container { display: flex; align-items: center; gap: 20px; background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 6px; margin-top: 10px; }
        .qr-display { width: 120px; height: 120px; object-fit: contain; background: white; border: 1px solid #e2e8f0; padding: 4px; border-radius: 4px; flex-shrink: 0; }
        .payment-text { flex: 1; font-size: 13px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; margin-top: 0; font-weight: 600; }
        .signature-section { margin-top: 40px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
        .signature-box { text-align: center; width: 260px; }
        .sig-date { font-style: italic; font-size: 12px; color: #64748b; margin-bottom: 5px; }
        .sig-title { font-weight: 700; font-size: 12px; text-transform: uppercase; color: var(--primary-color); margin-bottom: 70px; }
        .sig-name { font-weight: 700; font-size: 14px; color: #1e293b; text-transform: uppercase; }
        .sig-role { font-size: 12px; color: #64748b; margin-top: 2px; }
        .editor-pane { width: 480px; background: white; border-left: 1px solid #cbd5e1; overflow-y: auto; display: flex; flex-direction: column; box-shadow: -5px 0 15px rgba(0,0,0,0.05); }
        .bao-gia-container { flex-direction: row; }
        @media (max-width: 767px) {
          .bao-gia-container { flex-direction: column; }
          .editor-pane { width: 100%; max-width: 100%; border-left: none; border-top: 1px solid #cbd5e1; max-height: 50vh; }
          .preview-pane { height: 50vh; overflow-y: auto; }
        }
        .editor-content { padding: 25px; padding-bottom: 120px; }
        .form-group { margin-bottom: 20px; background: var(--bg-editor); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); }
        .form-group h3 { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 10px; font-weight: 700; }
        label { display: block; font-size: 11px; font-weight: 600; margin-bottom: 4px; color: #334155; }
        input, textarea, select { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; margin-bottom: 8px; box-sizing: border-box; }
        input:focus, textarea:focus { outline: none; border-color: var(--accent-color); }
        .btn-add { background: var(--primary-color); color: white; border: none; width: 100%; padding: 10px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 600; margin-top: 5px; }
        .list-item-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #cbd5e1; position: relative; }
        .btn-sm-del { position: absolute; right: 0; top: 0; background: #fee2e2; color: #dc2626; border: none; padding: 2px 6px; border-radius: 3px; font-size: 9px; cursor: pointer; font-weight: bold; }
        .floating-actions { position: absolute; bottom: 0; right: 0; width: 480px; background: white; padding: 15px 25px; border-top: 1px solid #e2e8f0; text-align: center; display: flex; gap: 10px; flex-direction: column; }
        .btn-print { background: var(--accent-color); color: white; border: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer; width: 100%; text-transform: uppercase; }
        .data-actions { display: flex; gap: 10px; margin-bottom: 15px; }
        .btn-data { flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; cursor: pointer; background: white; font-weight: 600; color: #475569; transition: 0.2s; }
        .qr-phases { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px; }
        .qr-radio-item { display: flex; align-items: center; font-size: 12px; cursor: pointer; }
        .qr-radio-item input { width: auto; margin-right: 5px; margin-bottom: 0; }
        @media print {
          @page { margin: 0; size: A4; }
          body { background: white; height: auto; overflow: visible !important; }
          .editor-pane, .floating-actions { display: none !important; }
          .preview-pane { padding: 0 !important; margin: 0 !important; display: block !important; overflow: visible !important; background: white !important; height: auto !important; }
          .a4-wrapper { width: 100% !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; min-height: auto !important; }
          .print-header { position: fixed; top: 0; width: 100%; }
          .print-footer { position: fixed; bottom: 0; width: 100%; }
          .print-table { width: 100%; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="preview-pane">
        <div className="a4-wrapper" id="printableArea">
          <div className="print-header">
            <div className="header-inner">
              <div className="brand">
                <h1>UP<span>CODE</span></h1>
                <p>Technology Solutions</p>
              </div>
              <div className="doc-info">
                <h2>{generalData.title}</h2>
                <p>Ngày: {formatDate(generalData.date)}</p>
                <p>Khách hàng: {generalData.client}</p>
              </div>
            </div>
          </div>

          <table className="print-table">
            <thead>
              <tr><td><div className="header-space">&nbsp;</div></td></tr>
            </thead>
            <tbody>
              <tr>
                <td className="print-content-body">
                  <div className="thank-you-text">{generalData.thankyou}</div>

                  <div className="summary-bar">
                    <div className="summary-item"><span className="sum-label">Hiệu lực</span><span className="sum-val">{generalData.validity}</span></div>
                    <div className="summary-item"><span className="sum-label">Thời gian</span><span className="sum-val">{generalData.duration}</span></div>
                    <div className="summary-item"><span className="sum-label">Bảo hành</span><span className="sum-val">{generalData.warranty}</span></div>
                  </div>

                  <div className="section-wrapper">
                    <div className="section-header">
                      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>
                      GIẢI PHÁP ĐỀ XUẤT
                    </div>
                    <div className="content-block">{generalData.solution}</div>
                    <div className="scope-box">
                      <div style={{ marginBottom: '5px' }}><strong>Phạm vi:</strong> {generalData.scope}</div>
                      <div><strong>Không bao gồm:</strong> {generalData.exclusion}</div>
                    </div>
                  </div>

                  <div className="section-wrapper">
                    <div className="section-header">
                      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>
                      CHI TIẾT CHI PHÍ ĐẦU TƯ
                    </div>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '35%' }}>Hạng mục</th>
                          <th style={{ width: '40%' }}>Mô tả chi tiết</th>
                          <th className="col-price-header">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quoteData.items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{item.name}</td>
                            <td style={{ color: '#475569' }}>{item.desc}</td>
                            <td className="col-price-cell">{formatCurrency(item.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="total-row">
                          <td colSpan={2} className="total-label">TỔNG CỘNG</td>
                          <td className="total-value-cell">{formatCurrency(calculateTotal())} VNĐ</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="section-wrapper">
                    <div className="section-header">
                      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
                      KẾ HOẠCH TRIỂN KHAI
                    </div>
                    <div className="timeline-box">
                      {quoteData.timeline.map((t, i) => (
                        <div key={i} className="t-item">
                          <div className="t-circle">{i + 1}</div>
                          <div className="t-title">{t.phase}</div>
                          <div className="t-desc">{t.work}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="section-wrapper">
                    <div className="section-header">
                      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
                      TIẾN ĐỘ THANH TOÁN
                    </div>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '25%' }}>Giai đoạn</th>
                          <th style={{ width: '30%' }}>Thời điểm</th>
                          <th style={{ width: '20%' }}>Giá trị</th>
                          <th>Nội dung</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quoteData.paymentPhases.map((p, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{p.phase}</td>
                            <td>{p.timing}</td>
                            <td style={{ color: '#F97316', fontWeight: 600 }}>{p.value}</td>
                            <td>{p.items}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="section-wrapper">
                    <div className="section-header">
                      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                      THÔNG TIN CHUYỂN KHOẢN
                    </div>
                    <div className="payment-container">
                      <img className="qr-display" src={getQRCodeUrl()} alt="QR" />
                      <div className="payment-text">{getPaymentInfo()}</div>
                    </div>
                  </div>

                  <div className="signature-section">
                    <div className="signature-box">
                      <div className="sig-date">{generalData.sigDate}</div>
                      <div className="sig-title">NGƯỜI LẬP BÁO GIÁ</div>
                      <div className="sig-name">{generalData.sigName}</div>
                      <div className="sig-role">{generalData.sigRole}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot><tr><td><div className="footer-space">&nbsp;</div></td></tr></tfoot>
          </table>

          <div className="print-footer">
            <div className="footer-inner">
              <div><strong>UPCODE TECHNOLOGY SOLUTIONS</strong></div>
              <div>Hotline: {generalData.hotline} | Email: {generalData.email}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="editor-pane">
        <div className="editor-content">
          <h2 style={{ marginBottom: '15px', fontFamily: "'Montserrat', sans-serif", color: 'var(--primary-color)' }}>🛠 SOẠN BÁO GIÁ</h2>

          <div className="data-actions">
            <button className="btn-data" onClick={saveToLocal}>💾 Lưu nháp</button>
            <button className="btn-data" onClick={exportJSON}>⬇ Tải file</button>
            <label className="btn-data" style={{ cursor: 'pointer', textAlign: 'center' }}>
              📂 Mở file
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={importJSON} />
            </label>
          </div>
          <div style={{ fontSize: '11px', color: 'green', marginBottom: '20px', height: '15px' }}>{statusMsg}</div>

          <div className="form-group">
            <h3>1. Thông tin chung</h3>
            <label>Tiêu đề</label>
            <input type="text" value={generalData.title} onChange={(e) => setGeneralData({ ...generalData, title: e.target.value })} />
            <label>Khách hàng</label>
            <input type="text" value={generalData.client} onChange={(e) => setGeneralData({ ...generalData, client: e.target.value })} />
            <label>Ngày báo giá</label>
            <input type="date" value={generalData.date} onChange={(e) => setGeneralData({ ...generalData, date: e.target.value })} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <div style={{ flex: 1 }}>
                <label>Hotline</label>
                <input type="text" value={generalData.hotline} onChange={(e) => setGeneralData({ ...generalData, hotline: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Email</label>
                <input type="email" value={generalData.email} onChange={(e) => setGeneralData({ ...generalData, email: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ background: '#e0f2fe', borderColor: '#7dd3fc' }}>
            <h3>2. Tóm tắt dự án</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label>Hiệu lực</label>
                <input type="text" value={generalData.validity} onChange={(e) => setGeneralData({ ...generalData, validity: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Thời gian</label>
                <input type="text" value={generalData.duration} onChange={(e) => setGeneralData({ ...generalData, duration: e.target.value })} />
              </div>
            </div>
            <label>Bảo hành</label>
            <input type="text" value={generalData.warranty} onChange={(e) => setGeneralData({ ...generalData, warranty: e.target.value })} />
          </div>

          <div className="form-group">
            <h3>3. Giải pháp</h3>
            <label>Lời cảm ơn</label>
            <textarea rows={2} value={generalData.thankyou} onChange={(e) => setGeneralData({ ...generalData, thankyou: e.target.value })} />
            <label>Nội dung giải pháp</label>
            <textarea rows={3} value={generalData.solution} onChange={(e) => setGeneralData({ ...generalData, solution: e.target.value })} />
            <label>Phạm vi (Scope)</label>
            <textarea rows={2} value={generalData.scope} onChange={(e) => setGeneralData({ ...generalData, scope: e.target.value })} />
            <label>Loại trừ (Exclusion)</label>
            <textarea rows={1} value={generalData.exclusion} onChange={(e) => setGeneralData({ ...generalData, exclusion: e.target.value })} />
          </div>

          <div className="form-group">
            <h3>4. Bảng giá</h3>
            {quoteData.items.map((item, index) => (
              <div key={index} className="list-item-row">
                <button className="btn-sm-del" onClick={() => deleteItem(index)}>Xóa</button>
                <label>Mục {index + 1}</label>
                <input type="text" value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} placeholder="Tên" />
                <textarea rows={1} value={item.desc} onChange={(e) => updateItem(index, 'desc', e.target.value)} placeholder="Mô tả" />
                <input type="number" value={item.price} onChange={(e) => updateItem(index, 'price', Number(e.target.value))} placeholder="Giá" />
              </div>
            ))}
            <button className="btn-add" onClick={addItem}>+ Thêm hạng mục</button>
          </div>

          <div className="form-group">
            <h3>5. Timeline</h3>
            {quoteData.timeline.map((t, index) => (
              <div key={index} className="list-item-row">
                <button className="btn-sm-del" onClick={() => deleteTimeline(index)}>Xóa</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <input type="text" value={t.phase} onChange={(e) => updateTimeline(index, 'phase', e.target.value)} placeholder="TG" />
                  </div>
                </div>
                <input type="text" value={t.work} onChange={(e) => updateTimeline(index, 'work', e.target.value)} placeholder="Công việc" />
              </div>
            ))}
            <button className="btn-add" onClick={addTimeline}>+ Thêm mốc</button>
          </div>

          <div className="form-group">
            <h3>6. Tiến độ TT</h3>
            {quoteData.paymentPhases.map((p, index) => (
              <div key={index} className="list-item-row">
                <button className="btn-sm-del" onClick={() => deletePaymentPhase(index)}>Xóa</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '30%' }}>
                    <label>Đợt</label>
                    <input type="text" value={p.phase} onChange={(e) => updatePaymentPhase(index, 'phase', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Giá trị</label>
                    <input type="text" value={p.value} onChange={(e) => updatePaymentPhase(index, 'value', e.target.value)} />
                  </div>
                </div>
                <label>Thời điểm</label>
                <input type="text" value={p.timing} onChange={(e) => updatePaymentPhase(index, 'timing', e.target.value)} />
                <label>Nội dung</label>
                <input type="text" value={p.items} onChange={(e) => updatePaymentPhase(index, 'items', e.target.value)} />
              </div>
            ))}
            <button className="btn-add" onClick={addPaymentPhase}>+ Thêm đợt TT</button>
          </div>

          <div className="form-group" style={{ border: '2px dashed var(--accent-color)', background: '#fff7ed' }}>
            <h3>7. Tài khoản (Auto QR)</h3>
            <textarea rows={3} value={generalData.paymentInfo} onChange={(e) => setGeneralData({ ...generalData, paymentInfo: e.target.value })} />
            <label style={{ marginTop: '10px', color: 'var(--accent-color)' }}>Tạo QR thanh toán cho đợt:</label>
            <div className="qr-phases">
              {quoteData.paymentPhases.map((p, idx) => (
                <label key={idx} className="qr-radio-item">
                  <input type="radio" name="qrphase" checked={idx === selectedQRPhaseIndex} onChange={() => setSelectedQRPhaseIndex(idx)} />
                  Đợt {idx + 1} ({p.value})
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <h3>8. Người lập báo giá</h3>
            <label>Ngày ký</label>
            <input type="text" value={generalData.sigDate} onChange={(e) => setGeneralData({ ...generalData, sigDate: e.target.value })} />
            <label>Họ tên</label>
            <input type="text" value={generalData.sigName} onChange={(e) => setGeneralData({ ...generalData, sigName: e.target.value })} />
            <label>Chức danh</label>
            <input type="text" value={generalData.sigRole} onChange={(e) => setGeneralData({ ...generalData, sigRole: e.target.value })} />
          </div>
        </div>

        <div className="floating-actions">
          <button className="btn-print" onClick={() => window.print()}>🖨 IN / LƯU PDF</button>
        </div>
      </div>
    </div>
  );
};
