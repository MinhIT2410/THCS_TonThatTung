/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { 
  Clock, 
  ArrowLeft, 
  ShieldAlert, 
  Loader2 
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { competitionService } from '../services/competitionService';
import { ROUTES } from '../config/routes';
import PendingIncidentsTab from '../components/admin/competition/PendingIncidentsTab';

export default function CompetitionPendingPage() {
  const { user, isAuthenticated, loading, profileLoading, hasAnyRole } = useAuth();
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || profileLoading) return;

    if (!isAuthenticated || !user) {
      setHasPermission(false);
      setCheckingPermission(false);
      return;
    }

    async function checkApprovalPermission() {
      try {
        setCheckingPermission(true);

        // 1. Check direct role rights
        const isAuthorizedByRole = hasAnyRole([
          'SUPER_ADMIN',
          'ADMIN',
          'PRINCIPAL',
          'VICE_PRINCIPAL',
          'COMPETITION_APPROVE',
          'COMPETITION_MANAGE',
        ]);

        if (isAuthorizedByRole) {
          setHasPermission(true);
          setCheckingPermission(false);
          return;
        }

        // 2. Check actor assignments (SUPERVISOR with can_approve_red_star = true)
        const myAssignments = await competitionService.getMyActorAssignments();
        const today = new Date().toISOString().split('T')[0];

        const canApproveAssignment = (myAssignments || []).some((a: any) => {
          if (a.is_active === false) return false;
          const isSupervisor = a.assignment_type === 'SUPERVISOR';
          const canApprove = a.can_approve_red_star === true;
          const isValidStart = !a.start_date || a.start_date <= today;
          const isValidEnd = !a.end_date || a.end_date >= today;

          return isSupervisor && canApprove && isValidStart && isValidEnd;
        });

        if (canApproveAssignment) {
          setHasPermission(true);
          setCheckingPermission(false);
          return;
        }

        setHasPermission(false);
      } catch (err) {
        console.error('[CompetitionPendingPage] Error checking approval permission:', err);
        setHasPermission(false);
      } finally {
        setCheckingPermission(false);
      }
    }

    checkApprovalPermission();
  }, [user, isAuthenticated, loading, profileLoading, hasAnyRole]);

  // If loading auth or checking permissions
  if (loading || profileLoading || (isAuthenticated && checkingPermission)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Đang kiểm tra quyền duyệt sự việc...</p>
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
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Quyền truy cập bị hạn chế
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Bạn không có quyền duyệt sự việc thi đua.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 pt-2">
              Chức năng này dành cho Giám thị được phân quyền duyệt, Ban BGH, Quản trị viên hoặc người được ủy quyền duyệt thi đua.
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

  // Has permission -> Render Pending Incidents Tab in Public Layout
  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 font-sans pb-16">
      {/* Header Banner */}
      <div className="space-y-4">
        <Link
          to={ROUTES.COMPETITION}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang Thi đua & Khen thưởng</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Chờ duyệt sự việc thi đua
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 pl-0.5">
              Xem và xử lý các sự việc đang chờ duyệt trong công tác thi đua.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs">
        <PendingIncidentsTab />
      </div>
    </div>
  );
}
