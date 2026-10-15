import React, { useState } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { X, Download, Printer, FileText, CheckCircle } from 'lucide-react';

export const LabNotebookModal: React.FC = () => {
  const { isNotebookOpen, toggleNotebook, history, equipment, activeExperiment, language } = useLabStore();
  const [studentNotes, setStudentNotes] = useState<string>('');

  if (!isNotebookOpen) return null;

  const handleExportJSON = () => {
    const data = {
      title: activeExperiment ? activeExperiment.title_vi : 'Thí nghiệm tự do ChemDex 2D',
      exportDate: new Date().toISOString(),
      workbenchEquipment: equipment,
      activityLog: history,
      studentNotes,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chemdex_lab_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    let csv = 'Timestamp,Action,Details,Volume_mL,Temperature_C,pH\n';
    for (const h of history) {
      const timeStr = new Date(h.timestamp).toLocaleTimeString();
      const action = h.actionType;
      const details = (language === 'vi' ? h.details_vi : h.details_en).replace(/,/g, ';');
      const vol = h.measurements?.volume_ml ?? '';
      const temp = h.measurements?.temperature_c ?? '';
      const ph = h.measurements?.ph ?? '';
      csv += `${timeStr},${action},"${details}",${vol},${temp},${ph}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chemdex_measurements_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-w-none print:max-h-none print:shadow-none print:border-none">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {language === 'vi' ? 'Sổ tay thí nghiệm & Báo cáo kết quả' : 'Laboratory Notebook & Report'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {activeExperiment ? (language === 'vi' ? activeExperiment.title_vi : activeExperiment.title_en) : (language === 'vi' ? 'Phiên thực hành tự do' : 'Free Lab Session')}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleNotebook(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notebook Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Printable Report Title */}
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-xl font-bold text-slate-900">
              {activeExperiment ? (language === 'vi' ? activeExperiment.title_vi : activeExperiment.title_en) : (language === 'vi' ? 'Báo Cáo Thực Hành Hóa Học Ảo 2D' : '2D Chemistry Virtual Lab Report')}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              ChemDex Virtual Chemistry Laboratory • {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </p>
          </div>

          {/* Activity Log / Telemetry Records */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              {language === 'vi' ? 'Nhật ký thao tác & Đo lường thực nghiệm' : 'Experimental Activity Log'}
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {language === 'vi' ? 'Chưa có thao tác nào được ghi nhận.' : 'No activity recorded yet.'}
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2.5">{language === 'vi' ? 'Thời gian' : 'Time'}</th>
                      <th className="p-2.5">{language === 'vi' ? 'Hành động' : 'Action'}</th>
                      <th className="p-2.5">{language === 'vi' ? 'Chi tiết' : 'Details'}</th>
                      <th className="p-2.5 text-right">{language === 'vi' ? 'Thông số' : 'Readings'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {history.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="p-2.5 text-slate-400 whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-2.5 font-bold text-blue-600 font-sans">
                          {item.actionType}
                        </td>
                        <td className="p-2.5 text-slate-700 font-sans">
                          {language === 'vi' ? item.details_vi : item.details_en}
                        </td>
                        <td className="p-2.5 text-right text-slate-600 whitespace-nowrap">
                          {item.measurements?.volume_ml !== undefined && `${item.measurements.volume_ml.toFixed(1)} mL `}
                          {item.measurements?.ph !== undefined && `pH ${item.measurements.ph.toFixed(1)} `}
                          {item.measurements?.temperature_c !== undefined && `${item.measurements.temperature_c.toFixed(1)}°C`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Student Observations & Notes */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {language === 'vi' ? 'Nhận xét & Kết luận của học sinh' : 'Student Notes & Conclusions'}
            </h3>
            <textarea
              rows={4}
              value={studentNotes}
              onChange={e => setStudentNotes(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Ghi lại các hiện tượng quan sát được, giải thích phương trình phản ứng và kết luận thí nghiệm của bạn...'
                  : 'Record your observations, balanced equations, and conclusions here...'
              }
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'In báo cáo (PDF)' : 'Print / PDF'}</span>
            </button>
          </div>

          <button
            onClick={() => toggleNotebook(false)}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
          >
            {language === 'vi' ? 'Đóng sổ tay' : 'Close Notebook'}
          </button>
        </div>
      </div>
    </div>
  );
};
