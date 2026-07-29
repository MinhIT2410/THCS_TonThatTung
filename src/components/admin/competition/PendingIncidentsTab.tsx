/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  User, 
  Users, 
  Image as ImageIcon,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { competitionService } from '../../../services/competitionService';
import { CompetitionIncident } from '../../../types/competition';

export default function PendingIncidentsTab() {
  const [incidents, setIncidents] = useState<CompetitionIncident[]>([]);
  const [loading, setLoading] = useState(true);

  // Reject modal state
  const [rejectModalIncident, setRejectModalIncident] = useState<CompetitionIncident | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Message alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPendingIncidents = async () => {
    try {
      setLoading(true);
      const list = await competitionService.getIncidents({ status: 'PENDING' });
      setIncidents(list);
    } catch (err: any) {
      console.error('Error fetching pending incidents:', err);
      setAlert({ type: 'error', text: err.message || 'Không thể tải danh sách chờ duyệt.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingIncidents();
  }, []);

  const handleApprove = async (incident: CompetitionIncident) => {
    try {
      setActionLoading(true);
      setAlert(null);
      await competitionService.approveIncident(incident.id);
      setAlert({ type: 'success', text: `Đã duyệt sự việc "${incident.title}" thành công!` });
      await fetchPendingIncidents();
    } catch (err: any) {
      console.error('Approve error:', err);
      setAlert({ type: 'error', text: err.message || 'Lỗi khi duyệt sự việc.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalIncident || !rejectionReason.trim()) return;

    try {
      setActionLoading(true);
      setAlert(null);
      await competitionService.rejectIncident(rejectModalIncident.id, rejectionReason.trim());
      setAlert({ type: 'success', text: `Đã từ chối ghi nhận sự việc "${rejectModalIncident.title}".` });
      setRejectModalIncident(null);
      setRejectionReason('');
      await fetchPendingIncidents();
    } catch (err: any) {
      console.error('Reject error:', err);
      setAlert({ type: 'error', text: err.message || 'Lỗi khi từ chối sự việc.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Danh Sách Sự Việc Chờ Duyệt ({incidents.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cần Tổng phụ trách hoặc Ban Giám hiệu xét duyệt trước khi áp dụng giao dịch điểm thi đua
          </p>
        </div>

        <button
          onClick={fetchPendingIncidents}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{alert.text}</span>
          <button onClick={() => setAlert(null)} className="underline opacity-80 hover:opacity-100">
            Đóng
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse">
          Đang tải danh sách sự việc chờ duyệt...
        </div>
      ) : incidents.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Không có sự việc nào chờ duyệt
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Tất cả sự việc thi đua đã được ghi nhận và xử lý đầy đủ.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-5"
            >
              {/* Header Info */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                      CHỜ DUYỆT
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                      {item.program_name}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {new Date(item.occurred_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                </div>

                {/* Approve/Reject Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Duyệt Sự Việc</span>
                  </button>

                  <button
                    onClick={() => setRejectModalIncident(item)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Từ Chối</span>
                  </button>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Person/Unit */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <div className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Đối tượng ghi nhận:
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {item.student_name || 'Không áp dụng cá nhân'}
                  </div>
                  {item.unit_name && (
                    <div className="text-slate-500 font-medium">
                      Chi đội: <strong className="text-slate-700 dark:text-slate-300">{item.unit_name}</strong>
                    </div>
                  )}
                </div>

                {/* Rule & Points */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <div className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    Quy tắc thi đua:
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {item.rule_name}
                  </div>
                  {item.rule && (
                    <div className="flex gap-2 text-[11px] font-mono pt-1">
                      <span className="text-emerald-600 font-bold">
                        Đội viên: {item.rule.student_merit_points > 0 ? `+${item.rule.student_merit_points}` : item.rule.student_merit_points}
                      </span>
                      <span className="text-blue-600 font-bold">
                        Chi đội: {item.rule.unit_points > 0 ? `+${item.rule.unit_points}` : item.rule.unit_points}
                      </span>
                    </div>
                  )}
                </div>

                {/* Recorder */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <div className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    Người ghi nhận:
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {item.recorder_name || 'Hệ thống'}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Khởi tạo: {new Date(item.created_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* Description & Evidence */}
              {(item.description || item.evidence_note || (item.evidence_items && item.evidence_items.length > 0)) && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3 text-xs">
                  {item.description && (
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Mô tả:</strong> {item.description}
                    </p>
                  )}

                  {item.evidence_note && (
                    <p className="text-slate-500 dark:text-slate-400 italic">
                      <strong>Ghi chú minh chứng:</strong> {item.evidence_note}
                    </p>
                  )}

                  {/* Evidence media */}
                  {item.evidence_items && item.evidence_items.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {item.evidence_items.map(ev => (
                        <div key={ev.id}>
                          {ev.file_url && (
                            <a
                              href={ev.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative block w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm"
                            >
                              <img src={ev.file_url} alt="Minh chứng" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <span className="absolute bottom-1 right-1 p-1 bg-black/60 text-white rounded">
                                <ImageIcon className="w-3 h-3" />
                              </span>
                            </a>
                          )}

                          {ev.external_url && (
                            <a
                              href={ev.external_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Xem liên kết minh chứng</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalIncident && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Từ Chối Ghi Nhận Sự Việc
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Vui lòng nhập lý do từ chối sự việc "<strong>{rejectModalIncident.title}</strong>". Lý do này sẽ được lưu vào nhật ký hệ thống.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="VD: Minh chứng không rõ ràng, thông tin vi phạm chưa chính xác..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalIncident(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
                >
                  Xác Nhận Từ Chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
