/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Award,
  Sparkles,
  Search,
  Calendar,
  Clock,
  User,
  Users,
  Star,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { competitionService } from '../services/competitionService';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

export default function PublicGoodDeedsPage() {
  const [goodDeeds, setGoodDeeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await competitionService.getGoodDeeds(50);
      setGoodDeeds(data);
    } catch (err) {
      console.error('Lỗi tải danh sách người tốt việc tốt:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDeeds = goodDeeds.filter(
    (g) =>
      (g.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.unit_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 pt-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 rounded-3xl text-white p-8 shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="bg-emerald-300 text-emerald-950 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" /> Tuyên Dương Cấp Liên Đội
            </span>

            <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight">
              Bảng Vinh Danh "Người Tốt - Việc Tốt"
            </h1>

            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Nơi lan tỏa những hành động đẹp, cử chỉ cao quý, ý thức rèn luyện xuất sắc và tinh thần tương thân tương ái của các em Đội viên Liên đội.
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm hành động đẹp, tên em hoặc chi đội..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              Tổng cộng: {filteredDeeds.length} việc tốt
            </span>
          </div>
        </div>

        {/* List Grid */}
        {loading ? (
          <LoadingState message="Đang tải danh sách vinh danh..." />
        ) : filteredDeeds.length === 0 ? (
          <EmptyState 
            message="Chưa có thông tin vinh danh" 
            description="Danh sách người tốt việc tốt sẽ được cập nhật khi có tuyên dương mới." 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeeds.map((deed) => (
              <div
                key={deed.id}
                className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 hover:border-emerald-300"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-200">
                        {deed.avatar_url ? (
                          <img src={deed.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{deed.student_name}</h3>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">Chi đội: {deed.unit_name}</p>
                      </div>
                    </div>

                    <span className="font-extrabold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                      +{deed.merit_points} điểm
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-emerald-600 shrink-0" />
                      {deed.title}
                    </h4>
                    {deed.description && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{deed.description}</p>
                    )}
                  </div>

                  {deed.evidence_items && deed.evidence_items.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 overflow-x-auto">
                      {deed.evidence_items.map((ev: any) =>
                        ev.file_url ? (
                          <img
                            key={ev.id}
                            src={ev.file_url}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : null
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(deed.occurred_at).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="text-emerald-700 font-medium">Xác nhận cấp Liên đội</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
