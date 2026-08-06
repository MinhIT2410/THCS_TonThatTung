/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  X,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { competitionService } from '../../../services/competitionService';
import {
  CompetitionReviewRequest,
  ReviewRequestStatus,
  REVIEW_REQUEST_STATUS_LABELS,
  LedgerType,
} from '../../../types/competition';

export const ReviewRequestsTab: React.FC = () => {
  const [requests, setRequests] = useState<CompetitionReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Resolve Modal State
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<CompetitionReviewRequest | null>(null);
  const [actionStatus, setActionStatus] = useState<'ACCEPTED' | 'REJECTED'>('ACCEPTED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [adjustmentPoints, setAdjustmentPoints] = useState<number>(0);
  const [ledgerType, setLedgerType] = useState<LedgerType>('STUDENT_MERIT');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await competitionService.getReviewRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách đề nghị xem lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenResolveModal = (req: CompetitionReviewRequest, status: 'ACCEPTED' | 'REJECTED') => {
    setSelectedReq(req);
    setActionStatus(status);
    setResolutionNote(
      status === 'ACCEPTED'
        ? 'Đã kiểm tra lại thông tin, chấp nhận điều chỉnh điểm cho đội viên.'
        : 'Sự việc đã được xác minh chính xác, giữ nguyên điểm thi đua.'
    );
    setAdjustmentPoints(0);
    setLedgerType('STUDENT_MERIT');
    setShowResolveModal(true);
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    if (actionStatus === 'ACCEPTED' && (!adjustmentPoints || adjustmentPoints === 0)) {
      alert('Vui lòng nhập số điểm cần điều chỉnh khi chấp nhận yêu cầu.');
      return;
    }

    try {
      setSaving(true);
      await competitionService.resolveReviewRequest({
        request_id: selectedReq.id,
        status: actionStatus,
        resolution_note: resolutionNote,
        adjustment_points: actionStatus === 'ACCEPTED' ? adjustmentPoints : 0,
        ledger_type: ledgerType,
      });

      setShowResolveModal(false);
      setSelectedReq(null);
      await loadData();
    } catch (err: any) {
      alert('Lỗi xử lý yêu cầu: ' + (err.message || 'Không xác định'));
    } finally {
      setSaving(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSearch =
      (r.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.student_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.reason || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-amber-100 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            Giải quyết yêu cầu khiếu nại
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Xử lý đề nghị khiếu nại, giải trình hoặc đề nghị xem lại điểm thi đua từ Đội viên
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Tải lại danh sách
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                statusFilter === st
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL'
                ? 'Tất cả'
                : REVIEW_REQUEST_STATUS_LABELS[st as ReviewRequestStatus] || st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên em, mã ĐV, lý do..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
          <span className="text-sm">Đang tải yêu cầu xem lại...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">Không có đề nghị xem lại nào</p>
          <p className="text-xs text-slate-500 mt-1">Không tìm thấy dữ liệu xem lại cần xử lý.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-amber-200 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{req.student_name || 'Đội viên'}</h3>
                    <p className="text-xs text-slate-500 font-mono">{req.student_code || 'Chưa có mã'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(req.submitted_at).toLocaleString('vi-VN')}
                  </span>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      req.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : req.status === 'ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {REVIEW_REQUEST_STATUS_LABELS[req.status] || req.status}
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div className="space-y-2 text-xs">
                {req.incident_title && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium text-slate-700">
                    Sự việc liên quan: <span className="font-bold text-slate-900">{req.incident_title}</span>
                  </div>
                )}

                <div className="text-slate-800 bg-amber-50/50 p-3 rounded-xl border border-amber-100/60 leading-relaxed">
                  <span className="font-bold text-amber-900 block mb-0.5">Lý do đề nghị xem lại:</span>
                  "{req.reason}"
                </div>

                {req.evidence_url && (
                  <div>
                    <a
                      href={req.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Xem minh chứng đính kèm
                    </a>
                  </div>
                )}

                {req.status !== 'PENDING' && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" /> Kết quả xử lý bởi {req.reviewer_name || 'HĐĐ'}:
                    </div>
                    <p className="text-slate-600 italic">"{req.resolution_note || 'Không có ghi chú'}"</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {req.status === 'PENDING' && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenResolveModal(req, 'ACCEPTED')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Chấp nhận & Điều chỉnh điểm
                  </button>
                  <button
                    onClick={() => handleOpenResolveModal(req, 'REJECTED')}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Từ chối đề nghị
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {actionStatus === 'ACCEPTED' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                {actionStatus === 'ACCEPTED'
                  ? 'Chấp Nhận Đề Nghị Xem Lại'
                  : 'Từ Chối Đề Nghị Xem Lại'}
              </h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  Học sinh: <span className="font-bold text-slate-800">{selectedReq.student_name}</span>
                </div>
                <div>
                  Nội dung đề nghị: <span className="text-slate-700">"{selectedReq.reason}"</span>
                </div>
              </div>

              {actionStatus === 'ACCEPTED' && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-emerald-900 text-xs">Cấu hình điểm điều chỉnh (`ADJUSTMENT`)</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">
                        Loại sổ điểm
                      </label>
                      <select
                        value={ledgerType}
                        onChange={(e) => setLedgerType(e.target.value as LedgerType)}
                        className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white focus:outline-none"
                      >
                        <option value="STUDENT_MERIT">Điểm thi đua (`STUDENT_MERIT`)</option>
                        <option value="STUDENT_REWARD">Điểm thưởng (`STUDENT_REWARD`)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">
                        Số điểm cộng/trừ (+/-)
                      </label>
                      <input
                        type="number"
                        value={adjustmentPoints}
                        onChange={(e) => setAdjustmentPoints(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 bg-white focus:outline-none"
                        placeholder="VD: +5 hoặc -5"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Nhập số dương để trả lại điểm bị trừ nhầm, hoặc số âm để khấu trừ thêm.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú kết quả xử lý <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Nhập lý do hoặc nội dung phản hồi cho đội viên..."
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-5 py-2 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center gap-1.5 ${
                    actionStatus === 'ACCEPTED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Xác nhận kết quả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
