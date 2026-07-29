/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Gift,
  ShoppingBag,
  Sparkles,
  Search,
  Package,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { competitionService } from '../services/competitionService';
import { RewardItem } from '../types/competition';
import { ROUTES } from '../config/routes';

export default function PublicRewardShopPage() {
  const [items, setItems] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await competitionService.getRewardItems(true);
      setItems(data);
    } catch (err) {
      console.error('Lỗi tải danh sách cửa hàng quà:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = items.filter(
    (i) =>
      (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 pt-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-800 rounded-3xl text-white p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="bg-amber-300 text-amber-950 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
                <Gift className="w-3.5 h-3.5" /> Đổi Điểm Nhận Quà
              </span>

              <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight">
                Cửa Hàng Phần Thưởng Đội Viên
              </h1>

              <p className="text-sm text-amber-100/90 leading-relaxed">
                Tích lũy Điểm thưởng khả dụng (`STUDENT_REWARD`) qua các hoạt động thi đua, học tập và việc tốt để đổi lấy những phần quà ý nghĩa.
              </p>
            </div>

            <Link
              to={ROUTES.COMPETITION_STUDENT}
              className="px-5 py-3 bg-white text-amber-900 font-extrabold text-xs rounded-2xl shadow-lg hover:bg-amber-50 transition flex items-center gap-2 self-start md:self-auto shrink-0"
            >
              <User className="w-4 h-4" />
              Đăng nhập xem điểm & Đổi quà
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tên quà hoặc mã quà..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              Đang mở đổi: {filteredItems.length} phần thưởng
            </span>
          </div>
        </div>

        {/* Item Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
            <span className="text-sm">Đang tải cửa hàng phần thưởng...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-center text-slate-400">
            <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-600">Không có phần thưởng nào phù hợp</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden hover:border-amber-300"
              >
                <div>
                  <div className="relative h-48 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-slate-100 flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gift className="w-14 h-14 text-amber-400" />
                    )}

                    <span className="absolute top-3 right-3 bg-amber-500 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs">
                      {item.points_required} điểm
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-slate-900 text-base line-clamp-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Số lượng còn: {item.quantity ?? 0} quà
                  </span>

                  <Link
                    to={ROUTES.COMPETITION_STUDENT}
                    className="font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                  >
                    Đổi ngay <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
