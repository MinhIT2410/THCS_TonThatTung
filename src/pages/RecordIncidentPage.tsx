/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Award, ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { competitionService } from '../services/competitionService';
import { supabase } from '../lib/supabase/client';
import { ROUTES } from '../config/routes';
import CompetitionIncidentForm from '../components/competition/CompetitionIncidentForm';

export default function RecordIncidentPage() {
  const { user, isAuthenticated, loading, profileLoading, hasAnyRole } = useAuth();
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    // Wait until auth state is resolved
    if (loading || profileLoading) return;

    if (!isAuthenticated || !user) {
      setCheckingPermission(false);
      return;
    }

    async function checkPermission() {
      try {
        setCheckingPermission(true);

        // 1. Roles check: Admin/Principal/Vice Principal/Content Editor/Competition Record
        const hasDirectRole = hasAnyRole([
          'SUPER_ADMIN',
          'ADMIN',
          'CONTENT_EDITOR',
          'PRINCIPAL',
          'VICE_PRINCIPAL',
          'COMPETITION_RECORD'
        ]);

        if (hasDirectRole) {
          setHasPermission(true);
          setCheckingPermission(false);
          return;
        }

        // 2. Check active competition actor assignments (SUPERVISOR or RED_STAR with can_record_incident = true)
        try {
          const myAssignments = await competitionService.getMyActorAssignments();
          const today = new Date().toISOString().split('T')[0];

          const activeAssignments = (myAssignments || []).filter((a: any) => {
            if (a.is_active === false) return false;

            const isSupervisorOrRedStar = a.assignment_type === 'SUPERVISOR' || a.assignment_type === 'RED_STAR';
            const canRecord = a.can_record_incident !== false;
            const isValidStart = !a.start_date || a.start_date <= today;
            const isValidEnd = !a.end_date || a.end_date >= today;

            return isSupervisorOrRedStar && canRecord && isValidStart && isValidEnd;
          });

          if (activeAssignments.length > 0) {
            setHasPermission(true);
            setCheckingPermission(false);
            return;
          }
        } catch (err: any) {
          console.error('[RecordIncidentPage] Lỗi kiểm tra nhiệm vụ thi đua (get_my_competition_actor_assignments):', err);
        }

        // User logged in but no recording privileges
        setHasPermission(false);
      } catch (err) {
        console.error('Error verifying record incident permissions:', err);
        setHasPermission(false);
      } finally {
        setCheckingPermission(false);
      }
    }

    checkPermission();
  }, [user, isAuthenticated, loading, profileLoading, hasAnyRole]);

  // If initial auth is loading or permission checking in progress
  if (loading || profileLoading || (isAuthenticated && checkingPermission)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Đang kiểm tra quyền ghi nhận...</p>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Authenticated but no permission
  if (hasPermission === false) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 font-sans">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Quyền truy cập bị hạn chế
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Bạn không có quyền ghi nhận sự việc thi đua.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 pt-2">
              Chức năng này dành cho Giám thị, Đội Sao đỏ, Ban BGH, Quản trị viên hoặc người được phân quyền thi đua.
            </p>
          </div>

          <div>
            <Link
              to={ROUTES.COMPETITION}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại trang Thi đua</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Has permission -> Render Form
  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8 font-sans pb-16">
      {/* Header Banner */}
      <div className="flex flex-col items-center text-center justify-center gap-3 sm:gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4 sm:pb-5">
        <div>
          <div className="flex items-center justify-center gap-2 mb-1.5 sm:mb-2">
            <Link
              to={ROUTES.COMPETITION}
              className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Thi đua & Khen thưởng</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight font-display text-slate-900 dark:text-white flex items-center justify-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            Ghi nhận sự việc thi đua
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl mx-auto px-2">
            Ghi nhận hành vi khen thưởng hoặc vi phạm của Đội viên & Chi đội theo các quy tắc thi đua.
          </p>
        </div>
      </div>

      {/* Shared Incident Form Component */}
      <div className="max-w-4xl mx-auto w-full">
        <CompetitionIncidentForm />
      </div>
    </div>
  );
}
