/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../services/supabaseClient';
import { sortClassesNaturally } from '../../../utils/classSortUtils';
import { userApi } from '../userApi';
import { StudentForPasswordReset } from '../userTypes';
import { 
  X, 
  Search, 
  Filter, 
  KeyRound, 
  ShieldAlert, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface StudentAccountHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRefresh?: () => void;
}

interface SuccessfulResetItem {
  user_id: string;
  full_name: string;
  student_code: string | null;
  class_name: string;
  email: string | null;
  password: string;
}

interface FailedResetItem {
  user_id: string;
  full_name: string;
  student_code: string | null;
  class_name: string;
  reason: string;
}

export const StudentAccountHandoverModal: React.FC<StudentAccountHandoverModalProps> = ({
  isOpen,
  onClose,
  onSuccessRefresh,
}) => {
  // Master Dropdown Options
  const [academicYears, setAcademicYears] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);
  const [gradeLevels, setGradeLevels] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; grade_level_id: string; academic_year_id: string }>>([]);

  // Selected Filters
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Pagination & Preview Data
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [studentsPage, setStudentsPage] = useState<StudentForPasswordReset[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);

  // Selection state on current page vs FILTERED_ALL
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'PAGE_SELECTION' | 'FILTERED_ALL'>('PAGE_SELECTION');

  // Multi-step modal state
  // 'IDLE' | 'CONFIRMATION' | 'PROCESSING' | 'COMPLETED'
  const [modalStep, setModalStep] = useState<'IDLE' | 'CONFIRMATION' | 'PROCESSING' | 'COMPLETED'>('IDLE');
  const [confirmInputText, setConfirmInputText] = useState<string>('');

  // Processing & Progress state
  const [processingStatusText, setProcessingStatusText] = useState<string>('');
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [totalToProcess, setTotalToProcess] = useState<number>(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [isRetryingBatch, setIsRetryingBatch] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isPausedOnError, setIsPausedOnError] = useState<boolean>(false);

  // Pagination & Batch retry refs
  const currentPageNumRef = useRef<number>(1);
  const processedSoFarRef = useRef<number>(0);
  const lastBatchErrorRef = useRef<string>('');

  // In-Memory sensitive results (NEVER persisted to storage)
  const successfulResultsRef = useRef<SuccessfulResetItem[]>([]);
  const failedResultsRef = useRef<FailedResetItem[]>([]);
  const [successCountState, setSuccessCountState] = useState<number>(0);
  const [failedCountState, setFailedCountState] = useState<number>(0);

  // Abort / Cancellation controller ref
  const isCancelledRef = useRef<boolean>(false);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load Initial Options (Academic Years, Grade Levels, Classes)
  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      try {
        // Fetch Academic Years
        const { data: yearsData } = await supabase
          .from('academic_years')
          .select('id, name, is_active')
          .order('is_active', { ascending: false });

        if (yearsData && yearsData.length > 0) {
          setAcademicYears(yearsData);
          const activeYear = yearsData.find(y => y.is_active) || yearsData[0];
          setSelectedAcademicYearId(activeYear.id);
        }

        // Fetch Grade Levels
        const { data: gradesData } = await supabase
          .from('grade_levels')
          .select('id, name, display_order')
          .order('display_order', { ascending: true });

        if (gradesData) {
          setGradeLevels(gradesData);
        }

        // Fetch Classes
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name, grade_level_id, academic_year_id')
          .order('name', { ascending: true });

        if (classesData) {
          setClasses(classesData);
        }
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };

    loadOptions();
  }, [isOpen]);

  // Filtered classes dependent on academic year and grade level
  const availableClasses = useMemo(() => {
    const filtered = classes.filter(c => {
      const matchYear = !selectedAcademicYearId || c.academic_year_id === selectedAcademicYearId;
      const matchGrade = selectedGradeLevelId === 'all' || c.grade_level_id === selectedGradeLevelId;
      return matchYear && matchGrade;
    });
    return sortClassesNaturally(filtered);
  }, [classes, selectedAcademicYearId, selectedGradeLevelId]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setSelectedUserIds([]);
    setSelectionMode('PAGE_SELECTION');
  }, [selectedAcademicYearId, selectedGradeLevelId, selectedClassId, debouncedSearch]);

  // Fetch student preview list
  const fetchStudentList = async () => {
    if (!selectedAcademicYearId || !isOpen) return;

    setLoadingList(true);
    setListError(null);
    try {
      const res = await userApi.getStudentsForPasswordReset({
        academicYearId: selectedAcademicYearId,
        gradeLevelId: selectedGradeLevelId !== 'all' ? selectedGradeLevelId : null,
        classId: selectedClassId !== 'all' ? selectedClassId : null,
        search: debouncedSearch,
        page,
        pageSize,
      });

      setStudentsPage(res.students);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error(err);
      setListError(err.message || 'Không thể tải danh sách học sinh.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchStudentList();
  }, [selectedAcademicYearId, selectedGradeLevelId, selectedClassId, debouncedSearch, page, pageSize, isOpen]);

  // Handle selection checkbox on current page
  const visibleUserIds = useMemo(() => studentsPage.map(s => s.user_id), [studentsPage]);
  const isAllVisibleSelected = visibleUserIds.length > 0 && visibleUserIds.every(id => selectedUserIds.includes(id));
  const isSomeVisibleSelected = visibleUserIds.some(id => selectedUserIds.includes(id)) && !isAllVisibleSelected;

  const handleToggleSelectAllVisible = () => {
    if (isAllVisibleSelected || selectionMode === 'FILTERED_ALL') {
      setSelectedUserIds([]);
      setSelectionMode('PAGE_SELECTION');
    } else {
      setSelectedUserIds(visibleUserIds);
      setSelectionMode('PAGE_SELECTION');
    }
  };

  const handleToggleSelectUser = (userId: string) => {
    if (selectionMode === 'FILTERED_ALL') {
      setSelectionMode('PAGE_SELECTION');
    }
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectFilteredAll = () => {
    setSelectionMode('FILTERED_ALL');
    setSelectedUserIds([]);
  };

  const handleClearSelection = () => {
    setSelectionMode('PAGE_SELECTION');
    setSelectedUserIds([]);
  };

  const effectiveCount = selectionMode === 'FILTERED_ALL' ? totalCount : selectedUserIds.length;

  // Cleanup helper to wipe sensitive password memory
  const wipeSensitiveData = () => {
    successfulResultsRef.current = [];
    failedResultsRef.current = [];
    setSuccessCountState(0);
    setFailedCountState(0);
    setConfirmInputText('');
    setModalStep('IDLE');
    setProcessedCount(0);
    setTotalToProcess(0);
    setProcessingStatusText('');
    setProcessingError(null);
    setIsPausedOnError(false);
    currentPageNumRef.current = 1;
    processedSoFarRef.current = 0;
    lastBatchErrorRef.current = '';
    isCancelledRef.current = false;
  };

  const handleClose = () => {
    isCancelledRef.current = true;
    wipeSensitiveData();
    onClose();
  };

  // Strong Password Generator using Web Crypto API
  const generateStrongPassword = (): string => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const safeSpecials = '!@#$%*';
    const allChars = uppercase + lowercase + numbers + safeSpecials;

    const getRandomChar = (charSet: string): string => {
      const randomValues = new Uint32Array(1);
      window.crypto.getRandomValues(randomValues);
      return charSet[randomValues[0] % charSet.length];
    };

    // Guarantee at least 1 of each required character group
    const passwordArray = [
      getRandomChar(uppercase),
      getRandomChar(lowercase),
      getRandomChar(numbers),
      getRandomChar(safeSpecials),
    ];

    // Fill the remaining 8 characters (total 12)
    for (let i = passwordArray.length; i < 12; i++) {
      passwordArray.push(getRandomChar(allChars));
    }

    // Shuffle the array using Fisher-Yates with Web Crypto
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const randArr = new Uint32Array(1);
      window.crypto.getRandomValues(randArr);
      const j = randArr[0] % (i + 1);
      const temp = passwordArray[i];
      passwordArray[i] = passwordArray[j];
      passwordArray[j] = temp;
    }

    return passwordArray.join('');
  };

  // Start Process trigger
  const handleStartProcessClick = () => {
    if (effectiveCount === 0) return;
    setConfirmInputText('');
    setModalStep('CONFIRMATION');
  };

  // Helper to process a single batch payload of up to 40 students
  const processBatch = async (batchStudents: StudentForPasswordReset[], batchLabel: string): Promise<boolean> => {
    if (batchStudents.length === 0 || isCancelledRef.current) return true;

    setProcessingStatusText(batchLabel);

    const batchItems = batchStudents.map(student => ({
      student,
      user_id: student.user_id,
      new_password: generateStrongPassword(),
    }));

    const payload = {
      academic_year_id: selectedAcademicYearId,
      students: batchItems.map(item => ({
        user_id: item.user_id,
        new_password: item.new_password,
      })),
    };

    let successResponse = false;
    let attempts = 0;
    let lastErrorMsg = '';

    while (!successResponse && attempts < 2 && !isCancelledRef.current) {
      attempts++;
      if (attempts > 1) {
        setIsRetryingBatch(true);
        setProcessingStatusText(`${batchLabel} (Thử lại lần ${attempts})...`);
      }

      try {
        const res = await userApi.bulkResetPasswords(payload);

        if (res && res.results) {
          successResponse = true;
          setIsRetryingBatch(false);

          const resultMap = new Map<string, { success: boolean; error?: string }>();
          res.results.forEach(r => resultMap.set(r.user_id, r));

          batchItems.forEach(item => {
            const resItem = resultMap.get(item.user_id);
            if (resItem && resItem.success) {
              successfulResultsRef.current.push({
                user_id: item.student.user_id,
                full_name: item.student.full_name,
                student_code: item.student.student_code,
                class_name: item.student.class_name,
                email: item.student.email,
                password: item.new_password,
              });
            } else {
              failedResultsRef.current.push({
                user_id: item.student.user_id,
                full_name: item.student.full_name,
                student_code: item.student.student_code,
                class_name: item.student.class_name,
                reason: resItem?.error || 'Không thể đặt lại mật khẩu.',
              });
            }
          });
        }
      } catch (err: any) {
        console.error(`Lỗi xử lý lô:`, err);
        lastErrorMsg = err.message || 'Lỗi kết nối máy chủ.';
      }
    }

    setSuccessCountState(successfulResultsRef.current.length);
    setFailedCountState(failedResultsRef.current.length);

    if (!successResponse) {
      lastBatchErrorRef.current = lastErrorMsg || 'Lỗi mạng khi gửi yêu cầu đặt lại mật khẩu.';
      return false;
    }

    return true;
  };

  const runResetLoop = async (isRetry: boolean) => {
    const BATCH_SIZE = 40;

    if (selectionMode === 'PAGE_SELECTION') {
      const selectedStudents = studentsPage.filter(s => selectedUserIds.includes(s.user_id));
      if (selectedStudents.length === 0) {
        setProcessingError('Chưa chọn học sinh nào để xử lý.');
        setIsPausedOnError(true);
        return;
      }

      const alreadySuccessIds = new Set(successfulResultsRef.current.map(s => s.user_id));
      const unhandledStudents = selectedStudents.filter(s => !alreadySuccessIds.has(s.user_id));

      const totalStudents = selectedStudents.length;
      setTotalToProcess(totalStudents);

      if (unhandledStudents.length === 0) {
        setModalStep('COMPLETED');
        if (onSuccessRefresh) onSuccessRefresh();
        return;
      }

      for (let i = 0; i < unhandledStudents.length; i += BATCH_SIZE) {
        if (isCancelledRef.current) break;
        const chunk = unhandledStudents.slice(i, i + BATCH_SIZE);
        const batchIndex = Math.floor(processedSoFarRef.current / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalStudents / BATCH_SIZE);

        const ok = await processBatch(chunk, `Đang xử lý đợt ${batchIndex}/${totalBatches} (${chunk.length} học sinh)...`);
        if (!ok) {
          setProcessingError(lastBatchErrorRef.current);
          setIsPausedOnError(true);
          return;
        }

        processedSoFarRef.current += chunk.length;
        setProcessedCount(processedSoFarRef.current);
      }

    } else {
      // FILTERED_ALL Mode
      if (!isRetry) {
        currentPageNumRef.current = 1;
        processedSoFarRef.current = 0;
      }

      let hasMore = true;

      while (hasMore && !isCancelledRef.current) {
        const pageNum = currentPageNumRef.current;
        setProcessingStatusText(`Đang lấy dữ liệu học sinh (Trang ${pageNum})...`);

        let pageRes;
        try {
          pageRes = await userApi.getStudentsForPasswordReset({
            academicYearId: selectedAcademicYearId,
            gradeLevelId: selectedGradeLevelId !== 'all' ? selectedGradeLevelId : null,
            classId: selectedClassId !== 'all' ? selectedClassId : null,
            search: debouncedSearch,
            page: pageNum,
            pageSize: 100,
          });
        } catch (err: any) {
          console.error(err);
          const errMsg = `Lỗi khi lấy danh sách học sinh trang ${pageNum}: ${err.message || 'Lỗi mạng.'}`;
          setProcessingError(errMsg);
          setIsPausedOnError(true);
          return;
        }

        const pageStudents = pageRes.students || [];
        if (pageStudents.length === 0) {
          hasMore = false;
          break;
        }

        const totalCountFromApi = pageRes.totalCount;
        const totalPagesFromApi = pageRes.totalPages;
        setTotalToProcess(totalCountFromApi);

        // Skip any student whose account was ALREADY reset successfully
        const alreadySuccessIds = new Set(successfulResultsRef.current.map(s => s.user_id));
        const unhandledPageStudents = pageStudents.filter(s => !alreadySuccessIds.has(s.user_id));

        for (let b = 0; b < unhandledPageStudents.length; b += BATCH_SIZE) {
          if (isCancelledRef.current) break;

          const batchChunk = unhandledPageStudents.slice(b, b + BATCH_SIZE);
          const batchInPage = Math.floor(b / BATCH_SIZE) + 1;

          const ok = await processBatch(
            batchChunk,
            `Đang xử lý trang ${pageNum}/${totalPagesFromApi} (Lô ${batchInPage}, ${batchChunk.length} học sinh)...`
          );

          if (!ok) {
            setProcessingError(lastBatchErrorRef.current);
            setIsPausedOnError(true);
            return;
          }

          processedSoFarRef.current += batchChunk.length;
          setProcessedCount(processedSoFarRef.current);
        }

        if (pageNum >= totalPagesFromApi || pageStudents.length < 100) {
          hasMore = false;
        } else {
          currentPageNumRef.current = pageNum + 1;
        }
      }
    }

    if (!isCancelledRef.current && !isPausedOnError) {
      setModalStep('COMPLETED');
      if (onSuccessRefresh) {
        onSuccessRefresh();
      }
    }
  };

  // Execute Batch Password Reset Flow
  const handleExecuteReset = () => {
    if (confirmInputText !== 'XÁC NHẬN') return;

    setModalStep('PROCESSING');
    setProcessingError(null);
    setIsPausedOnError(false);
    isCancelledRef.current = false;
    successfulResultsRef.current = [];
    failedResultsRef.current = [];
    setSuccessCountState(0);
    setFailedCountState(0);
    currentPageNumRef.current = 1;
    processedSoFarRef.current = 0;

    runResetLoop(false);
  };

  // Retry from failed batch / page
  const handleRetryProcess = () => {
    setProcessingError(null);
    setIsPausedOnError(false);
    isCancelledRef.current = false;

    runResetLoop(true);
  };

  // Generate and Download Excel File
  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Successful Accounts
    const successRows = successfulResultsRef.current.map((item, index) => ({
      'STT': index + 1,
      'Họ và tên': item.full_name,
      'Mã học sinh': item.student_code || '---',
      'Lớp': item.class_name,
      'Email / Tên đăng nhập': item.email || '---',
      'Mật khẩu tạm thời mới': item.password,
    }));

    const successSheet = XLSX.utils.json_to_sheet(
      successRows.length > 0
        ? successRows
        : [{'STT': '', 'Họ và tên': 'Không có dữ liệu', 'Mã học sinh': '', 'Lớp': '', 'Email / Tên đăng nhập': '', 'Mật khẩu tạm thời mới': ''}]
    );

    // Set column widths
    successSheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 26 }, // Họ và tên
      { wch: 16 }, // Mã học sinh
      { wch: 12 }, // Lớp
      { wch: 32 }, // Email
      { wch: 20 }, // Mật khẩu
    ];

    XLSX.utils.book_append_sheet(workbook, successSheet, 'Tài khoản học sinh');

    // Sheet 2: Failed Accounts (If any)
    if (failedResultsRef.current.length > 0) {
      const failedRows = failedResultsRef.current.map((item, index) => ({
        'STT': index + 1,
        'Họ và tên': item.full_name,
        'Mã học sinh': item.student_code || '---',
        'Lớp': item.class_name,
        'Lý do thất bại': item.reason,
      }));

      const failedSheet = XLSX.utils.json_to_sheet(failedRows);
      failedSheet['!cols'] = [
        { wch: 6 },  // STT
        { wch: 26 }, // Họ và tên
        { wch: 16 }, // Mã học sinh
        { wch: 12 }, // Lớp
        { wch: 45 }, // Lý do
      ];

      XLSX.utils.book_append_sheet(workbook, failedSheet, 'Không thành công');
    }

    // Write file
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Ban_giao_tai_khoan_hoc_sinh_${nowStr}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Bàn giao tài khoản học sinh
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đặt lại mật khẩu hàng loạt và xuất danh sách tài khoản theo lớp/khối
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={modalStep === 'PROCESSING' && !isPausedOnError}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* STEP 1: IDLE - Selection & Preview */}
          {modalStep === 'IDLE' && (
            <>
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* Academic Year */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Năm học
                  </label>
                  <select
                    value={selectedAcademicYearId}
                    onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>
                        {y.name} {y.is_active ? '(Đang hoạt động)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Level */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Khối
                  </label>
                  <select
                    value={selectedGradeLevelId}
                    onChange={(e) => {
                      setSelectedGradeLevelId(e.target.value);
                      setSelectedClassId('all');
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">Tất cả các khối</option>
                    {gradeLevels.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Lớp học
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">Tất cả các lớp</option>
                    {availableClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Tìm kiếm
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tên, mã HS, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Selection Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-medium">
                  <span>
                    Đang chọn: <strong className="font-bold text-blue-700 dark:text-blue-400">{effectiveCount.toLocaleString('vi-VN')}</strong> / {totalCount.toLocaleString('vi-VN')} học sinh phù hợp.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectionMode !== 'FILTERED_ALL' && totalCount > studentsPage.length && (
                    <button
                      onClick={handleSelectFilteredAll}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Chọn toàn bộ {totalCount.toLocaleString('vi-VN')} học sinh
                    </button>
                  )}

                  {effectiveCount > 0 && (
                    <button
                      onClick={handleClearSelection}
                      className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
              </div>

              {/* Error Alert */}
              {listError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{listError}</span>
                </div>
              )}

              {/* Students Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-[280px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <button
                            onClick={handleToggleSelectAllVisible}
                            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            {isAllVisibleSelected || selectionMode === 'FILTERED_ALL' ? (
                              <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : isSomeVisibleSelected ? (
                              <Square className="h-4 w-4 text-blue-400" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </th>
                        <th className="p-3">Họ và tên</th>
                        <th className="p-3">Mã HS</th>
                        <th className="p-3">Lớp</th>
                        <th className="p-3">Email đăng nhập</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {loadingList ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                            <span>Đang tải danh sách...</span>
                          </td>
                        </tr>
                      ) : studentsPage.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            Không tìm thấy học sinh phù hợp.
                          </td>
                        </tr>
                      ) : (
                        studentsPage.map((student) => {
                          const isSelected = selectionMode === 'FILTERED_ALL' || selectedUserIds.includes(student.user_id);
                          return (
                            <tr
                              key={student.user_id}
                              onClick={() => handleToggleSelectUser(student.user_id)}
                              className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${
                                isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by row click
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="p-3 font-medium">{student.full_name}</td>
                              <td className="p-3 font-mono text-slate-500">{student.student_code || '---'}</td>
                              <td className="p-3">{student.class_name || 'Chưa phân lớp'}</td>
                              <td className="p-3 text-slate-500">{student.email || '---'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="text-slate-500">
                    Trang {page} / {totalPages} ({totalCount.toLocaleString('vi-VN')} học sinh)
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1 || loadingList}
                      className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || loadingList}
                      className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: CONFIRMATION MODAL */}
          {modalStep === 'CONFIRMATION' && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
                  <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300">
                    Cảnh báo thao tác quan trọng!
                  </h3>
                  <p>
                    Thao tác này sẽ đặt lại mật khẩu của <strong className="font-bold underline text-amber-800 dark:text-amber-100">{effectiveCount.toLocaleString('vi-VN')} học sinh</strong>.
                  </p>
                  <p>
                    Mật khẩu cũ của học sinh sẽ bị thay thế ngay lập tức và <strong>không thể phục hồi</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nhập chữ <span className="font-mono font-bold text-red-600 dark:text-red-400">XÁC NHẬN</span> bên dưới để tiến hành:
                </label>
                <input
                  type="text"
                  placeholder="XÁC NHẬN"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING */}
          {modalStep === 'PROCESSING' && (
            <div className="space-y-6 py-6 text-center">
              {!isPausedOnError ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Đang tiến hành đặt lại mật khẩu hàng loạt
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {processingStatusText}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <AlertTriangle className="h-10 w-10 text-red-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tiến trình bị gián đoạn do gặp lỗi
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    Hệ thống đã dừng tiến trình và giữ nguyên các tài khoản đã xử lý thành công trước đó.
                  </p>
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-2 max-w-lg mx-auto">
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                  <span>Tiến trình</span>
                  <span>{processedCount} / {totalToProcess} học sinh</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ease-out ${
                      isPausedOnError ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${totalToProcess > 0 ? (processedCount / totalToProcess) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Live Count Chips */}
              <div className="flex justify-center gap-4 text-xs font-medium pt-2">
                <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  Thành công: <strong>{successCountState}</strong>
                </span>
                <span className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg">
                  Thất bại: <strong>{failedCountState}</strong>
                </span>
              </div>

              {/* Processing Error Details */}
              {processingError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-700 dark:text-red-300 text-left max-w-lg mx-auto space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-800 dark:text-red-200">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>Chi tiết lỗi:</span>
                  </div>
                  <p className="leading-relaxed">{processingError}</p>
                </div>
              )}

              {/* Action buttons when paused on error */}
              {isPausedOnError && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                  <button
                    onClick={handleRetryProcess}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Thử lại</span>
                  </button>

                  {(successCountState > 0 || failedCountState > 0) && (
                    <button
                      onClick={handleDownloadExcel}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Tải kết quả đã xử lý ({successCountState})</span>
                    </button>
                  )}

                  <button
                    onClick={handleClose}
                    className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: COMPLETED */}
          {modalStep === 'COMPLETED' && (
            <div className="space-y-6 py-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {processedCount}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Tổng số xử lý</div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-center">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {successCountState}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Thành công</div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-center">
                  <div className="text-xl font-bold text-red-600 dark:text-red-400">
                    {failedCountState}
                  </div>
                  <div className="text-[11px] text-red-700 dark:text-red-300 font-medium">Thất bại</div>
                </div>
              </div>

              {/* Strict Privacy Banner */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-xl flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <h4 className="font-bold text-amber-900 dark:text-amber-300">
                    Lưu ý bảo mật quan trọng:
                  </h4>
                  <p>
                    Danh sách mật khẩu chỉ tồn tại tạm thời trong bộ nhớ RAM phiên làm việc hiện tại. Sau khi đóng cửa sổ này, bạn sẽ <strong>không thể tải lại file</strong> vì hệ thống không lưu giữ mật khẩu chưa băm.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleDownloadExcel}
                  disabled={successCountState === 0 && failedCountState === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Tải file bàn giao (Excel)</span>
                </button>

                <button
                  onClick={handleClose}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer for IDLE and CONFIRMATION steps */}
        {(modalStep === 'IDLE' || modalStep === 'CONFIRMATION') && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {modalStep === 'IDLE' && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleStartProcessClick}
                  disabled={effectiveCount === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Bắt đầu đặt lại & xuất file ({effectiveCount.toLocaleString('vi-VN')})</span>
                </button>
              </>
            )}

            {modalStep === 'CONFIRMATION' && (
              <>
                <button
                  onClick={() => setModalStep('IDLE')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleExecuteReset}
                  disabled={confirmInputText !== 'XÁC NHẬN'}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Xác nhận đặt lại ({effectiveCount.toLocaleString('vi-VN')} tài khoản)</span>
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
