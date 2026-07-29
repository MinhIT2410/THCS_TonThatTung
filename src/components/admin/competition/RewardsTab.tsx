/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Gift,
  Plus,
  Edit2,
  Trash2,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';
import { competitionService } from '../../../services/competitionService';
import { RewardItem } from '../../../types/competition';

export const RewardsTab: React.FC = () => {
  const [items, setItems] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<RewardItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const itemsData = await competitionService.getRewardItems(false);
      setItems(itemsData);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách phần thưởng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingItem({
      name: '',
      description: '',
      image_url: '',
      points_required: 50,
      quantity: 10,
      is_active: true,
    });
    setShowItemModal(true);
  };

  const handleOpenEditModal = (item: RewardItem) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = editingItem?.points_required;
    if (!editingItem?.name?.trim() || pts === undefined || pts <= 0) {
      alert('Vui lòng điền tên quà và điểm yêu cầu (> 0).');
      return;
    }

    try {
      setSaving(true);
      await competitionService.saveRewardItem(editingItem);
      setShowItemModal(false);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      alert('Lỗi lưu phần thưởng: ' + (err.message || 'Không xác định'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn ngừng sử dụng phần thưởng "${name}" không?`)) return;
    try {
      await competitionService.deleteRewardItem(id);
      await loadData();
    } catch (err: any) {
      alert('Không thể ngừng sử dụng phần thưởng: ' + (err.message || 'Đã có dữ liệu liên kết'));
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-amber-100 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-600" />
            Danh Mục Phần Thưởng Đổi Quà
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cấu hình danh sách phần thưởng, điểm cần đổi và số lượng quà sẵn có.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2 shadow-xs shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Thêm phần thưởng mới
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên phần thưởng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200">
            Tổng phần thưởng: {items.length}
          </span>
          <span className="flex items-center gap-1.5 font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200">
            Đang mở đổi: {items.filter((i) => i.is_active).length}
          </span>
        </div>
      </div>

      {/* Reward Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
          <span className="text-sm">Đang tải danh sách phần thưởng...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
          <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">Chưa có phần thưởng nào</p>
          <p className="text-xs text-slate-500 mt-1">Bấm "Thêm phần thưởng mới" để bắt đầu tạo phần thưởng.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const pts = item.points_required ?? 0;
            const qty = item.quantity ?? 0;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  item.is_active ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70 opacity-75'
                }`}
              >
                <div>
                  {/* Image Header */}
                  <div className="relative h-44 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-slate-100 flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gift className="w-12 h-12 text-amber-400" />
                    )}

                    <span
                      className={`absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs ${
                        item.is_active
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-slate-500 text-white border-slate-600'
                      }`}
                    >
                      {item.is_active ? 'Đang mở đổi' : 'Tạm dừng'}
                    </span>

                    <span className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur-md text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {pts} điểm
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Số lượng còn:</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-amber-600" />
                        {qty} quà
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-2 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Ngừng sử dụng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Create/Edit Modal */}
      {showItemModal && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-600" />
                {editingItem.id ? 'Chỉnh Sửa Phần Thưởng' : 'Thêm Phần Thưởng Mới'}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên phần thưởng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Vở học sinh 96 trang, Bút mực, Cờ thưởng..."
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả quà tặng..."
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Link ảnh (URL)</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={editingItem.image_url || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Điểm cần đổi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingItem.points_required ?? 50}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        points_required: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng quà <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingItem.quantity ?? 10}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingItem.is_active ?? true}
                  onChange={(e) => setEditingItem({ ...editingItem, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded-xs focus:ring-amber-500"
                />
                <label htmlFor="is_active" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Mở cho phép đổi quà này trên hệ thống
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Lưu phần thưởng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
