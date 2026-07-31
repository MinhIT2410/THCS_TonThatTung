/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Gift,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  Send,
  X,
  Calendar,
} from 'lucide-react';
import { competitionService } from '../../../services/competitionService';
import {
  RewardRedemption,
  RedemptionStatus,
  REDEMPTION_STATUS_LABELS,
} from '../../../types/competition';

export const RedemptionsTab: React.FC = () => {
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectItem, setRejectItem] = useState<RewardRedemption | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await competitionService.getRewardRedemptions();
      setRedemptions(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách đổi quà.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await competitionService.approveRewardRedemption(id);
      await loadData();
    } catch (err: any) {
      alert('Lỗi duyệt yêu cầu: ' + (err.message || 'Không xác định'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleIssue = async (id: string) => {
    if (!confirm('Xác nhận trao quà cho đội viên? Hệ thống sẽ trừ điểm thưởng chính thức và cập nhật số lượng phần thưởng.')) return;
    try {
      setProcessingId(id);
      await competitionService.issueRewardRedemption(id);
      await loadData();
    } catch (err: any) {
      alert('Lỗi trao quà: ' + (err.message || 'Không xác định'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenRejectModal = (item: RewardRedemption) => {
    setRejectItem(item);
    setRejectReason('Chưa đủ điều kiện đổi quà hoặc hết quà tạm thời');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectItem) return;

    try {
      setProcessingId(rejectItem.id);
      await competitionService.cancelRewardRedemption(rejectItem.id, rejectReason);
      setShowRejectModal(false);
      setRejectItem(null);
      await loadData();
    } catch (err: any) {
      alert('Lỗi từ chối yêu cầu: ' + (err.message || 'Không xác định'));
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRedemptions = redemptions.filter((r) => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSearch =
      (r.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.student_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.reward_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getStatusBadgeClass = (status: RedemptionStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ISSUED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-amber-100 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-600" />
            Xử Lý Đổi Quà & Trao Thưởng Học Sinh
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Duyệt yêu cầu đổi quà, chuẩn bị quà và trao quà trực tiếp. Điểm thưởng sẽ tự động trừ chính thức khi xác nhận trao quà.
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

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          {['ALL', 'PENDING', 'APPROVED', 'ISSUED', 'REJECTED'].map((st) => (
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
                : REDEMPTION_STATUS_LABELS[st as RedemptionStatus] || st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên em, mã ĐV hoặc tên quà..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Redemptions Table / Cards */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
          <span className="text-sm">Đang tải yêu cầu đổi quà...</span>
        </div>
      ) : filteredRedemptions.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
          <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">Không có yêu cầu đổi quà nào</p>
          <p className="text-xs text-slate-500 mt-1">Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Học sinh / Đội viên</th>
                  <th className="p-4">Phần thưởng & Số lượng</th>
                  <th className="p-4">Điểm cần đổi</th>
                  <th className="p-4">Thời gian gửi</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 text-right">Thao tác xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRedemptions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{item.student_name || 'Đội viên'}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {item.student_code || 'Chưa có mã'}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {item.reward_image_url ? (
                          <img
                            src={item.reward_image_url}
                            alt={item.reward_name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                            <Gift className="w-5 h-5 text-amber-600" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{item.reward_name || 'Phần thưởng'}</div>
                          <div className="text-xs text-amber-700 font-semibold mt-0.5">
                            Số lượng: x{item.quantity}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {item.total_points} điểm
                      </span>
                    </td>

                    <td className="p-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.requested_at).toLocaleString('vi-VN')}
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {REDEMPTION_STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(item.id)}
                              disabled={processingId === item.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(item)}
                              disabled={processingId === item.id}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Từ chối
                            </button>
                          </>
                        )}

                        {item.status === 'APPROVED' && (
                          <>
                            <button
                              onClick={() => handleIssue(item.id)}
                              disabled={processingId === item.id}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1 shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Xác nhận đã trao
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(item)}
                              disabled={processingId === item.id}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Từ chối
                            </button>
                          </>
                        )}

                        {item.status === 'ISSUED' && (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Đã trao quà xong
                          </span>
                        )}

                        {(item.status === 'REJECTED' || item.status === 'CANCELLED') && (
                          <span className="text-xs text-slate-400 italic">Đã hủy / từ chối</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Reject */}
      {showRejectModal && rejectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Từ Chối Yêu Cầu Đổi Quà
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  Học sinh: <span className="font-bold text-slate-800">{rejectItem.student_name}</span>
                </div>
                <div>
                  Quà đổi: <span className="font-bold text-slate-800">{rejectItem.reward_name}</span> (x
                  {rejectItem.quantity})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do từ chối / hủy <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Vui lòng nêu rõ lý do..."
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectItem.id}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  {processingId === rejectItem.id && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
