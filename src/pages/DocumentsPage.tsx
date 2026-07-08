/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Documents from '../components/documents/Documents';
import { DocumentItem } from '../types';
import { documentService } from '../services/documentService';
import { CmsDocumentWithCategory } from '../types/document';
import { Loader2 } from 'lucide-react';

export default function DocumentsPage() {
  const [dbDocuments, setDbDocuments] = useState<CmsDocumentWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setIsLoading(true);
        const docs = await documentService.getPublishedDocuments();
        setDbDocuments(docs);
      } catch (err) {
        console.error('Error fetching published documents:', err);
        setError('Có lỗi xảy ra khi tải danh sách tài liệu.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocs();
  }, []);

  const formattedDocuments: DocumentItem[] = dbDocuments.map((doc) => {
    // Determine category display name
    const categoryName = doc.category?.name || 'Tài liệu';

    // Format file size
    const sizeInMB = doc.file_size > 0 
      ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB`
      : 'Không rõ';

    // Format issued date: use issued_date first (DD/MM/YYYY), fallback to published_at/created_at, or '—'
    let displayDate = '—';
    if (doc.issued_date) {
      try {
        const parts = doc.issued_date.split('-');
        if (parts.length === 3) {
          displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          displayDate = new Date(doc.issued_date).toLocaleDateString('vi-VN');
        }
      } catch (err) {
        displayDate = doc.issued_date;
      }
    } else if (doc.published_at || doc.created_at) {
      displayDate = new Date(doc.published_at || doc.created_at).toLocaleDateString('vi-VN');
    }

    return {
      id: `supabase-${doc.id}`,
      code: doc.document_number || '—',
      title: doc.title,
      category: categoryName as any,
      date: displayDate,
      issuingBody: doc.issuing_unit || '—',
      fileUrl: doc.file_url,
      fileSize: sizeInMB,
      fileType: doc.file_type,
      fileName: doc.file_name,
    };
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3 font-sans">
        <Loader2 className="animate-spin h-8 w-8 text-red-600" />
        <p className="text-slate-500 font-bold text-xs">Đang tải danh sách văn bản và tài liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-2 font-sans text-xs text-red-600">
        <p className="font-bold">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold border border-slate-200"
        >
          Tải lại trang
        </button>
      </div>
    );
  }

  return (
    <Documents documents={formattedDocuments} />
  );
}
