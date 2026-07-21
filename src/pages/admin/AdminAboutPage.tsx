/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import {
  Info, ArrowLeft, Plus, Search, Pencil, Trash2, Copy, ArrowUp, ArrowDown,
  Star, Eye, EyeOff, Save, Image as ImageIcon, X, Sparkles, Check, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { aboutContentService, wouldCreateCycle, isValidSlug, isValidAccentColor } from '../../services/aboutContentService';
import { storageService } from '../../services/storageService';
import { AboutItem, AboutItemImage, AboutItemType } from '../../types/about';
import { generateSlug } from '../../utils/slug';

const DynamicIcon = ({ name, className }: { name?: string | null; className?: string }) => {
  if (!name) return <Icons.Shield className={className} />;
  const IconComponent = (Icons as any)[name] || Icons.Shield;
  return <IconComponent className={className} />;
};

const itemTypeLabels: Record<AboutItemType, string> = {
  ORGANIZATION: 'Tổ chức cấp trên',
  SCHOOL_UNIT: 'Đơn vị nhà trường',
  TEAM: 'Đội tự quản & Ban chỉ huy',
  CLUB: 'Câu lạc bộ tài năng',
  OTHER: 'Khác',
};

const itemTypeColors: Record<AboutItemType, string> = {
  ORGANIZATION: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-200/50 dark:border-red-800/30',
  SCHOOL_UNIT: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30',
  TEAM: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30',
  CLUB: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/30',
  OTHER: 'bg-slate-50 text-slate-600 dark:bg-slate-950/40 dark:text-slate-400 border-slate-250/50 dark:border-slate-800/30',
};

const popularIcons = [
  'Shield', 'Award', 'Users', 'Landmark', 'Heart', 'Star', 'BookOpen', 'GraduationCap', 'Flame', 'Compass', 'Sparkles', 'Bell', 'Activity', 'Calendar'
];

interface ImageFormRow {
  id: string;
  image_url: string;
  caption: string;
  display_order: number;
}

export default function AdminAboutPage() {
  const navigate = useNavigate();
  const { user, roles, isActive } = useAuth();

  // Check role authorization: SUPER_ADMIN, PRINCIPAL, CONTENT_EDITOR
  const isAuthorized = isActive && roles.some((r: any) =>
    ['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR'].includes(r.code)
  );

  // States
  const [items, setItems] = useState<AboutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // View state: 'list' | 'create' | 'edit'
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<AboutItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Client-generated unique id for file directories
  const [tempId, setTempId] = useState<string>('');

  // Uploading states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGalleryRowId, setUploadingGalleryRowId] = useState<string | null>(null);
  const [bulkUploadProgress, setBulkUploadProgress] = useState<string | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  // Track initial image urls for old file deletion upon updates
  const [initialLogoUrl, setInitialLogoUrl] = useState('');
  const [initialCoverUrl, setInitialCoverUrl] = useState('');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Form Fields
  const [title, setTitle] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [itemType, setItemType] = useState<AboutItemType>('TEAM');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [iconName, setIconName] = useState('Shield');
  const [accentColor, setAccentColor] = useState('#ef4444');
  const [parentId, setParentId] = useState<string>('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  // Dynamic image gallery form rows
  const [galleryRows, setGalleryRows] = useState<ImageFormRow[]>([]);

  // Auto slug generation trigger
  const [manuallyEditedSlug, setManuallyEditedSlug] = useState(false);

  // Load items using exact admin query
  const loadAllItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aboutContentService.getAdminItems();
      setItems(data);
    } catch (err: any) {
      console.error(err);
      setError('Không thể kết nối dữ liệu Giới thiệu. Vui lòng kiểm tra Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllItems();
  }, []);

  // Update slug automatically when title changes if it hasn't been manually edited
  useEffect(() => {
    if (view === 'create' && !manuallyEditedSlug) {
      setSlug(generateSlug(title));
    }
  }, [title, view, manuallyEditedSlug]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Duplicate / Clone Action
  const handleDuplicate = (item: AboutItem) => {
    const newId = window.crypto?.randomUUID?.() || `temp-${Date.now()}`;
    setTempId(newId);
    setTitle(`Bản sao - ${item.title}`);
    setShortTitle(item.short_title || '');
    setSlug(`${item.slug}-copy-${Date.now().toString().slice(-4)}`);
    setItemType(item.item_type);
    setSummary(item.summary || '');
    setContent(item.content || '');
    setCoverImageUrl(item.cover_image_url || '');
    setLogoUrl(item.logo_url || '');
    setIconName(item.icon_name || 'Shield');
    setAccentColor(item.accent_color || '#ef4444');
    setParentId(item.parent_id || '');
    setDisplayOrder(item.display_order + 1);
    setIsFeatured(item.is_featured);
    setIsPublished(false); // Default duplicates as draft
    setManuallyEditedSlug(true);
    setInitialLogoUrl('');
    setInitialCoverUrl('');

    // Copy gallery images if any
    if (item.images) {
      setGalleryRows(
        item.images.map((img, idx) => ({
          id: `row-${idx}-${Date.now()}`,
          image_url: img.image_url,
          caption: img.caption || '',
          display_order: img.display_order,
        }))
      );
    } else {
      // Async fetch full detail to see if images exist
      aboutContentService.getAdminItemBySlug(item.slug).then(detailed => {
        if (detailed && detailed.images) {
          setGalleryRows(
            detailed.images.map((img, idx) => ({
              id: `row-${idx}-${Date.now()}`,
              image_url: img.image_url,
              caption: img.caption || '',
              display_order: img.display_order,
            }))
          );
        }
      });
    }

    setEditingItem(null);
    setView('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Edit form
  const handleEdit = async (item: AboutItem) => {
    setLoading(true);
    setError(null);
    setTempId(item.id);
    try {
      const detailed = await aboutContentService.getAdminItemBySlug(item.slug);
      if (detailed) {
        setEditingItem(detailed);
        setTitle(detailed.title);
        setShortTitle(detailed.short_title || '');
        setSlug(detailed.slug);
        setItemType(detailed.item_type);
        setSummary(detailed.summary || '');
        setContent(detailed.content || '');
        setCoverImageUrl(detailed.cover_image_url || '');
        setLogoUrl(detailed.logo_url || '');
        setIconName(detailed.icon_name || 'Shield');
        setAccentColor(detailed.accent_color || '#ef4444');
        setParentId(detailed.parent_id || '');
        setDisplayOrder(detailed.display_order);
        setIsFeatured(detailed.is_featured);
        setIsPublished(detailed.is_published);
        setManuallyEditedSlug(true);
        setInitialLogoUrl(detailed.logo_url || '');
        setInitialCoverUrl(detailed.cover_image_url || '');

        // Prepopulate gallery rows
        setGalleryRows(
          (detailed.images || []).map((img, idx) => ({
            id: img.id || `row-${idx}-${Date.now()}`,
            image_url: img.image_url,
            caption: img.caption || '',
            display_order: img.display_order,
          }))
        );

        setView('edit');
      }
    } catch (err) {
      console.error(err);
      setError('Không thể tải thông tin chi tiết mục giới thiệu.');
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreateNew = () => {
    const newId = window.crypto?.randomUUID?.() || `temp-${Date.now()}`;
    setTempId(newId);
    setTitle('');
    setShortTitle('');
    setSlug('');
    setItemType('TEAM');
    setSummary('');
    setContent('');
    setCoverImageUrl('');
    setLogoUrl('');
    setIconName('Shield');
    setAccentColor('#ef4444');
    setParentId('');
    setDisplayOrder(items.length > 0 ? Math.max(...items.map(i => i.display_order)) + 1 : 1);
    setIsFeatured(false);
    setIsPublished(true);
    setGalleryRows([]);
    setManuallyEditedSlug(false);
    setEditingItem(null);
    setInitialLogoUrl('');
    setInitialCoverUrl('');
    setView('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quick Action: Toggle published
  const handleQuickTogglePublish = async (item: AboutItem) => {
    try {
      const updatedValue = !item.is_published;
      const { error: err } = await aboutContentService.updateItem(item.id, { is_published: updatedValue }, user?.id);
      if (err) throw err;
      
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_published: updatedValue } : i));
      showSuccess(`Đã ${updatedValue ? 'xuất bản' : 'hạ ẩn'} mục "${item.title}" thành công.`);
    } catch (err: any) {
      console.error(err);
      setError('Không thể cập nhật trạng thái xuất bản.');
    }
  };

  // Quick Action: Toggle featured
  const handleQuickToggleFeatured = async (item: AboutItem) => {
    try {
      const updatedValue = !item.is_featured;
      const { error: err } = await aboutContentService.updateItem(item.id, { is_featured: updatedValue }, user?.id);
      if (err) throw err;

      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_featured: updatedValue } : i));
      showSuccess(`Đã cập nhật trạng thái nổi bật cho "${item.title}".`);
    } catch (err: any) {
      console.error(err);
      setError('Không thể cập nhật trạng thái nổi bật.');
    }
  };

  // Delete Action
  const handleDelete = async (item: AboutItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mục "${item.title}"?`)) return;

    try {
      const { success, error: delErr } = await aboutContentService.deleteItem(item.id);
      if (!success && delErr) {
        alert(delErr.message);
        return;
      }
      setItems(prev => prev.filter(i => i.id !== item.id));
      showSuccess(`Đã xóa thành công mục "${item.title}".`);
    } catch (err: any) {
      console.error(err);
      setError('Có lỗi xảy ra khi xóa mục giới thiệu.');
    }
  };

  // Order shifting
  const handleMoveOrder = async (item: AboutItem, direction: 'up' | 'down') => {
    const sorted = [...items].sort((a, b) => a.display_order - b.display_order);
    const index = sorted.findIndex(i => i.id === item.id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const target = sorted[index - 1];
      // Swap order
      const tempOrder = item.display_order;
      
      await aboutContentService.updateItem(item.id, { display_order: target.display_order }, user?.id);
      await aboutContentService.updateItem(target.id, { display_order: tempOrder }, user?.id);
      await loadAllItems();
      showSuccess('Đã đổi thứ tự hiển thị thành công.');
    } else if (direction === 'down' && index < sorted.length - 1) {
      const target = sorted[index + 1];
      // Swap order
      const tempOrder = item.display_order;

      await aboutContentService.updateItem(item.id, { display_order: target.display_order }, user?.id);
      await aboutContentService.updateItem(target.id, { display_order: tempOrder }, user?.id);
      await loadAllItems();
      showSuccess('Đã đổi thứ tự hiển thị thành công.');
    }
  };

  // Add Row to Gallery
  const handleAddGalleryRow = () => {
    setGalleryRows(prev => [
      ...prev,
      {
        id: `row-new-${Date.now()}`,
        image_url: '',
        caption: '',
        display_order: prev.length > 0 ? Math.max(...prev.map(r => r.display_order)) + 1 : 1,
      }
    ]);
  };

  const handleRemoveGalleryRow = (id: string) => {
    setGalleryRows(prev => prev.filter(r => r.id !== id));
  };

  const handleGalleryRowChange = (id: string, field: 'image_url' | 'caption', value: string) => {
    setGalleryRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Upload triggers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationErr = storageService.validateImageFile(file);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setUploadingLogo(true);
    setError(null);
    try {
      const path = storageService.generateSafeAboutImagePath(tempId, 'logo', file);
      const publicUrl = await storageService.uploadImageToExactPath(file, path, { upsert: false });
      setLogoUrl(publicUrl);
      showSuccess('Tải ảnh logo lên thành công!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi khi tải ảnh logo lên.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationErr = storageService.validateImageFile(file);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setUploadingCover(true);
    setError(null);
    try {
      const path = storageService.generateSafeAboutImagePath(tempId, 'cover', file);
      const publicUrl = await storageService.uploadImageToExactPath(file, path, { upsert: false });
      setCoverImageUrl(publicUrl);
      showSuccess('Tải ảnh bìa lên thành công!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi khi tải ảnh bìa lên.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGalleryRowUpload = async (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationErr = storageService.validateImageFile(file);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setUploadingGalleryRowId(rowId);
    setError(null);
    try {
      const path = storageService.generateSafeAboutImagePath(tempId, 'gallery', file);
      const publicUrl = await storageService.uploadImageToExactPath(file, path, { upsert: false });
      handleGalleryRowChange(rowId, 'image_url', publicUrl);
      showSuccess('Tải ảnh hoạt động lên thành công!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi khi tải ảnh hoạt động lên.');
    } finally {
      setUploadingGalleryRowId(null);
    }
  };

  const handleBulkGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBulkUploading(true);
    setBulkUploadProgress(`Bắt đầu tải lên ${files.length} ảnh...`);
    setError(null);

    let successCount = 0;
    const totalCount = files.length;
    const newUploadedRows: ImageFormRow[] = [];

    let currentMaxOrder = galleryRows.length > 0 
      ? Math.max(...galleryRows.map(r => r.display_order)) 
      : 0;

    for (let i = 0; i < totalCount; i++) {
      const file = files[i];
      const validationErr = storageService.validateImageFile(file);
      
      if (validationErr) {
        console.warn(`File ${file.name} không hợp lệ: ${validationErr}`);
        setBulkUploadProgress(`Đang tải... (Ảnh ${i + 1}/${totalCount}) - Bỏ qua ảnh không hợp lệ: ${file.name}`);
        continue;
      }

      try {
        setBulkUploadProgress(`Đang tải ảnh ${i + 1}/${totalCount}: ${file.name}...`);
        const path = storageService.generateSafeAboutImagePath(tempId, 'gallery', file);
        const publicUrl = await storageService.uploadImageToExactPath(file, path, { upsert: false });
        
        currentMaxOrder += 1;
        newUploadedRows.push({
          id: `row-new-bulk-${storageService.generateUUID()}`,
          image_url: publicUrl,
          caption: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
          display_order: currentMaxOrder
        });
        
        successCount += 1;
      } catch (err: any) {
        console.error(`Lỗi khi tải ảnh ${file.name}:`, err);
      }
    }

    if (newUploadedRows.length > 0) {
      setGalleryRows(prev => [...prev, ...newUploadedRows]);
    }

    setBulkUploadProgress(null);
    setIsBulkUploading(false);
    showSuccess(`Đã tải ${successCount}/${totalCount} ảnh.`);
    e.target.value = '';
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Front-end high fidelity validations
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Vui lòng nhập tên mục giới thiệu.');
      return;
    }
    if (cleanTitle.length > 150) {
      setError('Tên mục giới thiệu không được vượt quá 150 ký tự.');
      return;
    }

    const cleanSlug = slug.trim();
    if (!cleanSlug) {
      setError('Vui lòng nhập đường dẫn tĩnh (slug).');
      return;
    }
    if (!isValidSlug(cleanSlug)) {
      setError('Đường dẫn tĩnh (slug) không hợp lệ. Chỉ dùng chữ thường không dấu, số và dấu gạch ngang (ví dụ: lien-doi-thcs).');
      return;
    }

    const cleanSummary = summary.trim();
    if (cleanSummary && cleanSummary.length > 500) {
      setError('Tóm tắt ngắn không được vượt quá 500 ký tự.');
      return;
    }

    if (accentColor && !isValidAccentColor(accentColor)) {
      setError('Màu sắc chủ đạo phải là mã màu HEX hợp lệ (ví dụ: #EF4444).');
      return;
    }

    if (parentId && view === 'edit' && editingItem) {
      if (parentId === editingItem.id) {
        setError('Không thể chọn chính mục này làm mục cha.');
        return;
      }
      if (wouldCreateCycle(editingItem.id, parentId, items)) {
        setError('Không thể liên kết mục cha này vì sẽ tạo thành vòng lặp liên kết cha-con.');
        return;
      }
    }

    setIsSaving(true);

    const payload = {
      title: cleanTitle,
      short_title: shortTitle.trim() || null,
      slug: cleanSlug,
      item_type: itemType,
      summary: cleanSummary || null,
      content: content.trim() || null,
      cover_image_url: coverImageUrl.trim() || null,
      logo_url: logoUrl.trim() || null,
      icon_name: iconName,
      accent_color: accentColor,
      parent_id: parentId || null,
      display_order: Number(displayOrder),
      is_featured: isFeatured,
      is_published: isPublished,
    };

    try {
      let savedId = '';
      if (view === 'edit' && editingItem) {
        const { error: editErr } = await aboutContentService.updateItem(editingItem.id, payload, user?.id);
        if (editErr) throw editErr;
        savedId = editingItem.id;
        showSuccess(`Cập nhật mục "${title}" thành công!`);

        // Safely cleanup old logo file if replaced
        if (initialLogoUrl && initialLogoUrl !== payload.logo_url) {
          if (initialLogoUrl.includes('/school-media/') && initialLogoUrl.includes('/about/')) {
            storageService.deleteImageByUrl(initialLogoUrl).catch(err => {
              console.warn('Lỗi dọn dẹp logo cũ:', err);
            });
          }
        }

        // Safely cleanup old cover file if replaced
        if (initialCoverUrl && initialCoverUrl !== payload.cover_image_url) {
          if (initialCoverUrl.includes('/school-media/') && initialCoverUrl.includes('/about/')) {
            storageService.deleteImageByUrl(initialCoverUrl).catch(err => {
              console.warn('Lỗi dọn dẹp cover cũ:', err);
            });
          }
        }
      } else {
        const { data, error: createErr } = await aboutContentService.createItem({
          id: tempId,
          ...payload
        } as any, user?.id);
        if (createErr) throw createErr;
        if (data) {
          savedId = data.id;
        }
        showSuccess(`Tạo mới mục "${title}" thành công!`);
      }

      // Save gallery images
      const formattedImages = galleryRows
        .filter(row => row.image_url.trim())
        .map((row, idx) => ({
          image_url: row.image_url.trim(),
          caption: row.caption.trim() || null,
          display_order: idx + 1,
        }));

      if (savedId) {
        await aboutContentService.saveItemImages(savedId, formattedImages);
      }

      await loadAllItems();
      setView('list');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Có lỗi xảy ra khi lưu trữ thông tin.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter list
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.summary && item.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          item.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.item_type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4 font-sans" id="about-unauthorized">
        <AlertCircle className="h-14 w-14 mx-auto text-red-500 opacity-60" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Quyền truy cập bị từ chối</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Chỉ Quản trị viên (SUPER_ADMIN), Ban giám hiệu (PRINCIPAL) hoặc Biên tập viên (CONTENT_EDITOR) mới có thể xem và chỉnh sửa danh mục giới thiệu.
        </p>
        <button
          onClick={() => navigate('/quan-tri')}
          className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
        >
          Quay lại Bảng điều khiển
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4 font-sans" id="admin-about-management-page">
      {/* Top Banner Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-900/30 rounded-2xl flex items-center space-x-3 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl flex items-center space-x-3 text-xs animate-bounce">
          <Check className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {view === 'list' && 'Quản lý đơn vị giới thiệu'}
              {view === 'create' && 'Thêm đơn vị mới'}
              {view === 'edit' && 'Chỉnh sửa đơn vị'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {view === 'list' && 'Quản lý danh sách các ban chuyên trách, câu lạc bộ, tổ chức nòng cốt.'}
            {view === 'create' && 'Nhập thông tin cơ bản, bài viết chi tiết và album ảnh cho đơn vị mới.'}
            {view === 'edit' && `Chỉnh sửa thông tin chi tiết và bộ sưu tập ảnh cho "${title}".`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {view === 'list' ? (
            <button
              onClick={handleCreateNew}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm mới</span>
            </button>
          ) : (
            <button
              onClick={() => setView('list')}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </button>
          )}
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="space-y-4">
          {/* Controls: Search and filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tiêu đề, slug, tóm tắt..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-white placeholder-slate-400 border border-slate-250 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-white border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="all">Tất cả loại hình</option>
                {Object.entries(itemTypeLabels).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table list */}
          {loading ? (
            <div className="text-center py-12 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mx-auto" />
              <p className="text-xs text-slate-400">Đang tải dữ liệu...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl space-y-2">
              <Info className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Không tìm thấy mục giới thiệu nào phù hợp.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 font-semibold">Tên mục</th>
                      <th className="p-4 font-semibold">Phân loại</th>
                      <th className="p-4 font-semibold text-center">Thứ tự</th>
                      <th className="p-4 font-semibold text-center">Nổi bật</th>
                      <th className="p-4 font-semibold text-center">Xuất bản</th>
                      <th className="p-4 font-semibold text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0 font-bold"
                              style={{ backgroundColor: item.accent_color || '#3b82f6' }}
                            >
                              <DynamicIcon name={item.icon_name} className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-850 dark:text-slate-100">{item.title}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">slug: {item.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${itemTypeColors[item.item_type]}`}>
                            {itemTypeLabels[item.item_type]}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <span className="font-mono font-bold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">
                              {item.display_order}
                            </span>
                            <div className="flex flex-col shrink-0">
                              <button
                                onClick={() => handleMoveOrder(item, 'up')}
                                disabled={idx === 0}
                                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleMoveOrder(item, 'down')}
                                disabled={idx === filteredItems.length - 1}
                                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleQuickToggleFeatured(item)}
                            className={`p-1.5 rounded-full border transition-all ${
                              item.is_featured
                                ? 'bg-amber-50 border-amber-200 text-amber-500 dark:bg-amber-950/20 dark:border-amber-900/40'
                                : 'bg-slate-50 border-slate-200 text-slate-300 dark:bg-slate-900 dark:border-slate-800'
                            }`}
                          >
                            <Star className={`h-4 w-4 ${item.is_featured ? 'fill-amber-400' : ''}`} />
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleQuickTogglePublish(item)}
                            className={`p-1.5 rounded-full border transition-all ${
                              item.is_published
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-500 dark:bg-emerald-950/20 dark:border-emerald-900/40'
                                : 'bg-red-50 border-red-200 text-red-400 dark:bg-red-950/20 dark:border-red-900/40'
                            }`}
                          >
                            {item.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleDuplicate(item)}
                              title="Nhân bản mục giới thiệu này"
                              className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              title="Chỉnh sửa nội dung"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              title="Xóa mục này"
                              className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE & EDIT FORM */}
      {(view === 'create' || view === 'edit') && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          {/* Main Info Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Title */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-750 dark:text-slate-350">Tên mục giới thiệu *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Đội Sao đỏ, Câu lạc bộ Cờ vua"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Item Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-750 dark:text-slate-350">Loại hình đơn vị</label>
              <select
                value={itemType}
                onChange={e => setItemType(e.target.value as AboutItemType)}
                className="w-full bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              >
                {Object.entries(itemTypeLabels).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-750 dark:text-slate-350">Đường dẫn tĩnh (Slug) *</label>
              <input
                type="text"
                required
                placeholder="doi-sao-do"
                value={slug}
                onChange={e => {
                  setSlug(e.target.value);
                  setManuallyEditedSlug(true);
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Short Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-750 dark:text-slate-350">Tên viết tắt / Tên ngắn</label>
              <input
                type="text"
                placeholder="Ví dụ: Đội Sao đỏ (tùy chọn)"
                value={shortTitle}
                onChange={e => setShortTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Parent Unit */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-750 dark:text-slate-350">Thuộc đơn vị quản lý (Cấp trên)</label>
              <select
                value={parentId}
                onChange={e => setParentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Không có (Cấp cao nhất)</option>
                {items
                  .filter(i => i.id !== (editingItem?.id || '')) // prevent circular mapping
                  .map(i => (
                    <option key={i.id} value={i.id}>{i.title} [{itemTypeLabels[i.item_type]}]</option>
                  ))}
              </select>
            </div>

            {/* Icon Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-750 dark:text-slate-350">Biểu tượng (Icon)</label>
              <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-55 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                {popularIcons.map(icon => {
                  const isSel = iconName === icon;
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setIconName(icon)}
                      className={`p-2 rounded-xl border transition-all ${
                        isSel
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-md'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800'
                      }`}
                    >
                      <DynamicIcon name={icon} className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Color picker */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-750 dark:text-slate-350 block">Màu sắc chủ đạo (Accent Color)</label>
              <div className="flex items-center space-x-3.5 mt-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="h-10 w-12 bg-transparent cursor-pointer rounded-md shrink-0"
                />
                <input
                  type="text"
                  placeholder="#ef4444"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="w-full bg-slate-55 dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Display Order & featured toggles */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-750 dark:text-slate-350">Thứ tự hiển thị (0, 1, 2...)</label>
              <input
                type="number"
                min="0"
                required
                placeholder="0"
                value={displayOrder}
                onChange={e => setDisplayOrder(Number(e.target.value))}
                className="w-full bg-slate-55 dark:bg-slate-900 text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Image URLs Grid (Logo and Cover) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo field */}
            <div className="space-y-2 bg-slate-50/40 dark:bg-slate-900/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
              <label className="text-xs font-extrabold text-slate-750 dark:text-slate-350 block">Ảnh biểu trưng / Logo (Hình vuông)</label>
              <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center mt-1">
                {/* Square Preview Container */}
                <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-55 dark:bg-slate-900 shrink-0 flex items-center justify-center shadow-inner">
                  {uploadingLogo ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                  ) : logoUrl ? (
                    <img src={logoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                
                {/* Control inputs */}
                <div className="space-y-1.5 w-full">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập URL ảnh thủ công hoặc chọn file từ máy..."
                      value={logoUrl}
                      onChange={e => setLogoUrl(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 text-[11px] text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <label className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer transition-all shrink-0 flex items-center">
                      <span>Chọn ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Lưu trữ: school-media/about/{tempId}/logo/</p>
                </div>
              </div>
            </div>

            {/* Cover image field */}
            <div className="space-y-2 bg-slate-50/40 dark:bg-slate-900/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
              <label className="text-xs font-extrabold text-slate-750 dark:text-slate-350 block">Ảnh bìa lớn / Cover Banner (Tỷ lệ ngang)</label>
              <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center mt-1">
                {/* Horizontal Preview Container */}
                <div className="relative w-28 h-16 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-55 dark:bg-slate-900 shrink-0 flex items-center justify-center shadow-inner">
                  {uploadingCover ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                  ) : coverImageUrl ? (
                    <img src={coverImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                
                {/* Control inputs */}
                <div className="space-y-1.5 w-full">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập URL ảnh thủ công hoặc chọn file từ máy..."
                      value={coverImageUrl}
                      onChange={e => setCoverImageUrl(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 text-[11px] text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <label className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer transition-all shrink-0 flex items-center">
                      <span>Chọn ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Lưu trữ: school-media/about/{tempId}/cover/</p>
                </div>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <label className="flex items-center space-x-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={e => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-750 dark:text-slate-300 flex items-center">
                <Star className="h-4 w-4 text-amber-500 mr-1.5 fill-amber-400" />
                Mục nòng cốt / nổi bật (Hiển thị đầu trang)
              </span>
            </label>

            <label className="flex items-center space-x-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={e => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-750 dark:text-slate-300 flex items-center">
                <Eye className="h-4 w-4 text-emerald-500 mr-1.5" />
                Xuất bản (Hiển thị trên giao diện công khai)
              </span>
            </label>
          </div>

          {/* Summary / Excerpt */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-750 dark:text-slate-350">Tóm tắt ngắn (Dưới 200 chữ) *</label>
            <textarea
              rows={2}
              placeholder="Tóm tắt ngắn gọn tôn chỉ, nhiệm vụ hoặc mục đích hoạt động..."
              value={summary}
              onChange={e => setSummary(e.target.value)}
              className="w-full bg-slate-55 dark:bg-slate-900 text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Detailed rich content */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-750 dark:text-slate-350">Nội dung chi tiết (Dạng bài viết)</label>
            <textarea
              rows={6}
              placeholder="Nhập nội dung bài viết chi tiết giới thiệu đầy đủ lịch sử thành lập, giá trị, ban lãnh đạo, quy chế hoạt động..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full bg-slate-55 dark:bg-slate-900 text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-400">Gợi ý: Xuống hàng gấp đôi để tạo đoạn văn mới. Có thể viết các dòng bắt đầu bằng dấu gạch ngang (-) để tạo danh sách gạch đầu dòng.</p>
          </div>

          {/* DYNAMIC IMAGE GALLERY MANAGER */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5 text-indigo-500" />
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Bộ sưu tập ảnh hoạt động ({galleryRows.length})
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {bulkUploadProgress && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium animate-pulse mr-2 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-150">
                    {bulkUploadProgress}
                  </span>
                )}
                <label className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-55 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 text-[10px] font-bold rounded-lg border border-emerald-200/50 dark:border-emerald-800/30 transition-all cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tải lên nhiều ảnh</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleBulkGalleryUpload}
                    className="hidden"
                    disabled={isBulkUploading}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAddGalleryRow}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/60 text-[10px] font-bold rounded-lg border border-indigo-200/50 dark:border-indigo-800/30 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm dòng ảnh</span>
                </button>
              </div>
            </div>

            {galleryRows.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl">
                <p className="text-xs text-slate-400 italic">Chưa có ảnh hoạt động nào trong album này.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {galleryRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-55 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 items-center relative group"
                  >
                    {/* Index */}
                    <div className="md:col-span-1 flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Image URL */}
                    <div className="md:col-span-5 space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Link ảnh hoạt động hoặc chọn file..."
                          value={row.image_url}
                          onChange={e => handleGalleryRowChange(row.id, 'image_url', e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-white border border-slate-250 dark:border-slate-850 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                        />
                        <label className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs px-3 py-2.5 rounded-xl cursor-pointer transition-all shrink-0 flex items-center justify-center">
                          {uploadingGalleryRowId === row.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-blue-600" />
                          ) : (
                            <span>Chọn</span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleGalleryRowUpload(row.id, e)}
                            className="hidden"
                            disabled={uploadingGalleryRowId !== null}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Image Caption */}
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        placeholder="Mô tả / Chú thích ảnh hoạt động..."
                        value={row.caption}
                        onChange={e => handleGalleryRowChange(row.id, 'caption', e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-white border border-slate-250 dark:border-slate-850 rounded-xl px-3 py-2.5 focus:outline-none"
                      />
                    </div>

                    {/* Delete row */}
                    <div className="md:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryRow(row.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Live Image Thumbnail preview if URL is set */}
                    {row.image_url.startsWith('http') && (
                      <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden group-hover:block z-10 w-24 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-lg">
                        <img src={row.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-5 py-2.5 border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu dữ liệu'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
