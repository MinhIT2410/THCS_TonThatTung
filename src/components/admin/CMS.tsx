/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Lock, Key, CheckCircle, Trash2, Edit, Plus, FolderSync, 
  MessageSquare, FileText, Calendar, Image as ImageIcon, FileCode, Check, Eye, X, RefreshCw, Loader2, Sparkles
} from 'lucide-react';
import { NewsItem, ActivityItem, PhotoItem, DocumentItem, ContactSubmission } from '../../types';
import { LogoutButton } from '../auth/LogoutButton';
import { useAuth } from '../../contexts/AuthContext';
import { cmsService } from '../../services/cmsService';
import { CmsCategory, CmsPost, CmsPostWithCategory, CmsPostInput, CmsPostStatus } from '../../types/cms';
import { galleryService } from '../../services/galleryService';
import { 
  GalleryAlbum, 
  GalleryImage, 
  GalleryAlbumStatus, 
  GalleryAlbumInput, 
  GalleryImageInput 
} from '../../types/gallery';
import { ImageUploadField } from './ImageUploadField';
import { MultiImageUploadField } from './MultiImageUploadField';
import { documentService } from '../../services/documentService';
import { DocumentCategory, CmsDocument, CmsDocumentWithCategory, CmsDocumentInput } from '../../types/document';
import { DocumentUploadField } from './DocumentUploadField';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { bannerService } from '../../services/bannerService';
import { HomeBanner, HomeBannerInput, HomeBannerStatus } from '../../types/banner';

interface CMSProps {
  schoolName: string;
  setSchoolName: (name: string) => void;
  schoolSlogan: string;
  setSchoolSlogan: (slogan: string) => void;
  
  news: NewsItem[];
  setNews: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  activities: ActivityItem[];
  setActivities: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  photos: PhotoItem[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoItem[]>>;
  documents: DocumentItem[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentItem[]>>;
  contacts: ContactSubmission[];
  setContacts: React.Dispatch<React.SetStateAction<ContactSubmission[]>>;

  onResetDefaults: () => void;
}

type CMSTab = 'dashboard' | 'news' | 'activities' | 'photos' | 'documents' | 'contacts' | 'settings' | 'banners';

export default function CMS({
  schoolName,
  setSchoolName,
  schoolSlogan,
  setSchoolSlogan,
  news,
  setNews,
  activities,
  setActivities,
  photos,
  setPhotos,
  documents,
  setDocuments,
  contacts,
  setContacts,
  onResetDefaults
}: CMSProps) {
  const { profile, primaryRole, user } = useAuth();
  const userId = user?.id || '';

  const { siteSettings, updateSettings } = useSiteSettings();
  const [settingsFormData, setSettingsFormData] = useState(siteSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (siteSettings) {
      setSettingsFormData(siteSettings);
    }
  }, [siteSettings]);

  // Supabase states
  const [dbPosts, setDbPosts] = useState<CmsPostWithCategory[]>([]);
  const [dbCategories, setDbCategories] = useState<CmsCategory[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [editingDbPost, setEditingDbPost] = useState<(Partial<CmsPostInput> & { id?: number; activeTabContext?: 'news' | 'activities' }) | null>(null);

  const fetchDbData = async () => {
    setIsLoadingDb(true);
    setDbError(null);
    try {
      const [cats, posts] = await Promise.all([
        cmsService.getCategories(),
        cmsService.getAdminPosts()
      ]);
      setDbCategories(cats);
      setDbPosts(posts);
    } catch (err) {
      console.error('Error fetching Supabase data:', err);
      setDbError('Có lỗi xảy ra khi tải dữ liệu từ Supabase.');
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbData();
    fetchAlbumsData();
    fetchDocumentsData();
    fetchBannersData();
  }, []);

  // Supabase Gallery States
  const [dbAlbums, setDbAlbums] = useState<GalleryAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | ''>('');
  const [dbAlbumImages, setDbAlbumImages] = useState<GalleryImage[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState<boolean>(false);
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
  const [editingAlbum, setEditingAlbum] = useState<(Partial<GalleryAlbumInput> & { id?: number }) | null>(null);
  const [editingAlbumImage, setEditingAlbumImage] = useState<(Partial<GalleryImageInput> & { id?: number }) | null>(null);

  const fetchAlbumsData = async () => {
    setIsLoadingAlbums(true);
    try {
      const albumsList = await galleryService.getAdminAlbums();
      setDbAlbums(albumsList);
      if (albumsList.length > 0 && selectedAlbumId === '') {
        setSelectedAlbumId(albumsList[0].id);
      }
    } catch (err) {
      console.error('Error fetching albums:', err);
      triggerAlert('Có lỗi xảy ra khi tải danh sách album.');
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  const fetchAlbumImagesData = async (albumId: number) => {
    setIsLoadingImages(true);
    try {
      const imagesList = await galleryService.getImagesByAlbum(albumId);
      setDbAlbumImages(imagesList);
    } catch (err) {
      console.error('Error fetching images for album:', err);
      triggerAlert('Có lỗi xảy ra khi tải danh sách ảnh của album.');
    } finally {
      setIsLoadingImages(false);
    }
  };

  useEffect(() => {
    if (selectedAlbumId !== '') {
      fetchAlbumImagesData(Number(selectedAlbumId));
    } else {
      setDbAlbumImages([]);
    }
  }, [selectedAlbumId]);

  // Supabase Document States
  const [dbDocuments, setDbDocuments] = useState<CmsDocumentWithCategory[]>([]);
  const [dbDocCategories, setDbDocCategories] = useState<DocumentCategory[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [editingDbDoc, setEditingDbDoc] = useState<(Partial<CmsDocumentInput> & { id?: number }) | null>(null);

  const fetchDocumentsData = async () => {
    setIsLoadingDocs(true);
    setDocsError(null);
    try {
      const [categories, documentsList] = await Promise.all([
        documentService.getDocumentCategories(),
        documentService.getAdminDocuments()
      ]);
      setDbDocCategories(categories);
      setDbDocuments(documentsList);
    } catch (err) {
      console.error('Error fetching documents/categories:', err);
      setDocsError('Có lỗi xảy ra khi tải danh sách văn bản và danh mục.');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // Supabase Home Banner States
  const [dbBanners, setDbBanners] = useState<HomeBanner[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState<boolean>(true);
  const [bannersError, setBannersError] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<(Partial<HomeBannerInput> & { id?: string }) | null>(null);

  const fetchBannersData = async () => {
    setIsLoadingBanners(true);
    setBannersError(null);
    try {
      const bannersList = await bannerService.getAdminBanners();
      setDbBanners(bannersList);
    } catch (err) {
      console.error('Error fetching banners:', err);
      setBannersError('Có lỗi xảy ra khi tải danh sách banner.');
    } finally {
      setIsLoadingBanners(false);
    }
  };

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbum || !editingAlbum.title) {
      triggerAlert('Vui lòng nhập tiêu đề album.');
      return;
    }

    setIsLoadingAlbums(true);
    try {
      const input: GalleryAlbumInput = {
        title: editingAlbum.title,
        slug: editingAlbum.slug || undefined,
        description: editingAlbum.description || '',
        cover_image_url: editingAlbum.cover_image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
        sort_order: editingAlbum.sort_order ?? 0,
        is_featured: !!editingAlbum.is_featured,
        status: editingAlbum.status || 'DRAFT'
      };

      if (editingAlbum.id) {
        const { error } = await galleryService.updateAlbum(editingAlbum.id, input, userId);
        if (error) throw error;
        triggerAlert('Cập nhật album thành công!');
      } else {
        const { error } = await galleryService.createAlbum(input, userId);
        if (error) throw error;
        triggerAlert('Tạo album mới thành công!');
      }
      setEditingAlbum(null);
      await fetchAlbumsData();
    } catch (err: any) {
      console.error('Error saving album:', err);
      triggerAlert('Có lỗi xảy ra khi lưu album: ' + (err.message || 'Lỗi không định danh'));
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  const handleDeleteAlbum = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa album này không? Toàn bộ ảnh thuộc album này cũng sẽ bị xóa.')) return;

    setIsLoadingAlbums(true);
    try {
      const { error } = await galleryService.deleteAlbum(id);
      if (error) throw error;
      triggerAlert('Đã xóa album thành công!');
      if (selectedAlbumId === id) {
        setSelectedAlbumId('');
      }
      await fetchAlbumsData();
    } catch (err: any) {
      console.error('Error deleting album:', err);
      triggerAlert('Có lỗi xảy ra khi xóa album.');
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  const handleSaveAlbumImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbumImage || !editingAlbumImage.image_url) {
      triggerAlert('Vui lòng nhập đường dẫn hình ảnh.');
      return;
    }
    if (!selectedAlbumId) {
      triggerAlert('Vui lòng chọn một album để quản lý ảnh.');
      return;
    }

    setIsLoadingImages(true);
    try {
      const input: GalleryImageInput = {
        album_id: Number(selectedAlbumId),
        title: editingAlbumImage.title || '',
        description: editingAlbumImage.description || '',
        image_url: editingAlbumImage.image_url,
        alt_text: editingAlbumImage.alt_text || '',
        sort_order: editingAlbumImage.sort_order ?? 0,
        is_featured: !!editingAlbumImage.is_featured
      };

      if (editingAlbumImage.id) {
        const { error } = await galleryService.updateImage(editingAlbumImage.id, input, userId);
        if (error) throw error;
        triggerAlert('Cập nhật ảnh thành công!');
      } else {
        const { error } = await galleryService.createImage(input, userId);
        if (error) throw error;
        triggerAlert('Thêm ảnh mới thành công!');
      }
      setEditingAlbumImage(null);
      await fetchAlbumImagesData(Number(selectedAlbumId));
    } catch (err: any) {
      console.error('Error saving image:', err);
      triggerAlert('Có lỗi xảy ra khi lưu ảnh: ' + (err.message || 'Lỗi không định danh'));
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleDeleteAlbumImage = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh này không?')) return;

    setIsLoadingImages(true);
    try {
      const { error } = await galleryService.deleteImage(id);
      if (error) throw error;
      triggerAlert('Đã xóa ảnh thành công!');
      await fetchAlbumImagesData(Number(selectedAlbumId));
    } catch (err: any) {
      console.error('Error deleting image:', err);
      triggerAlert('Có lỗi xảy ra khi xóa ảnh.');
    } finally {
      setIsLoadingImages(false);
    }
  };

  // CMS state values
  const [activeTab, setActiveTab] = useState<CMSTab>('dashboard');

  // Editor states (Modals or quick forms)
  const [editingNews, setEditingNews] = useState<Partial<NewsItem> | null>(null);
  const [editingActivity, setEditingActivity] = useState<Partial<ActivityItem> | null>(null);
  const [editingDoc, setEditingDoc] = useState<Partial<DocumentItem> | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Partial<PhotoItem> | null>(null);

  // Simulated notifications
  const [cmsAlert, setCmsAlert] = useState('');

  const triggerAlert = (msg: string) => {
    setCmsAlert(msg);
    setTimeout(() => setCmsAlert(''), 3000);
  };

  const handleSaveDbPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDbPost || !editingDbPost.title || !editingDbPost.content || !editingDbPost.category_id) {
      triggerAlert('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setIsLoadingDb(true);
    try {
      const input: CmsPostInput = {
        category_id: Number(editingDbPost.category_id),
        title: editingDbPost.title,
        excerpt: editingDbPost.excerpt || '',
        content: editingDbPost.content,
        cover_image_url: editingDbPost.cover_image_url || '',
        status: editingDbPost.status || 'DRAFT',
        is_featured: !!editingDbPost.is_featured,
        published_at: editingDbPost.published_at || null,
        slug: editingDbPost.slug || undefined
      };

      if (editingDbPost.id) {
        // Update existing post
        const { error } = await cmsService.updatePost(editingDbPost.id, input, userId);
        if (error) throw error;
        triggerAlert('Cập nhật bài viết thành công!');
      } else {
        // Create new post
        const { error } = await cmsService.createPost(input, userId);
        if (error) throw error;
        triggerAlert('Tạo bài viết mới thành công!');
      }
      setEditingDbPost(null);
      await fetchDbData();
    } catch (err: any) {
      console.error('Error saving post:', err);
      triggerAlert('Có lỗi xảy ra: ' + (err.message || 'Lỗi không định danh'));
    } finally {
      setIsLoadingDb(false);
    }
  };

  const handleDeleteDbPost = async (id: number) => {
    if (!confirm('Em có chắc chắn muốn xóa bài viết này không?')) return;

    setIsLoadingDb(true);
    try {
      const { error } = await cmsService.deletePost(id);
      if (error) throw error;
      triggerAlert('Đã xóa bài viết thành công!');
      await fetchDbData();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      triggerAlert('Có lỗi xảy ra khi xóa bài viết.');
    } finally {
      setIsLoadingDb(false);
    }
  };

  // 2. School Info Configuration Form
  const saveSchoolSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const { success, error } = await updateSettings(settingsFormData);
      if (success) {
        triggerAlert('Cập nhật cấu hình thông tin hệ thống thành công!');
        // Keep parent prop states in sync for any legacy components using them
        setSchoolName(settingsFormData.school_name || '');
        setSchoolSlogan(settingsFormData.slogan || '');
      } else {
        triggerAlert('Lỗi: ' + (error?.message || 'Không thể lưu cấu hình.'));
      }
    } catch (err: any) {
      console.error('Error saving settings:', err);
      triggerAlert('Lỗi: ' + (err.message || 'Có lỗi xảy ra.'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // 3. News CRUD handlers
  const handleSaveNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews?.title || !editingNews?.content) return;

    if (editingNews.id) {
      // Edit mode
      setNews(prev => prev.map(n => n.id === editingNews.id ? { ...n, ...editingNews as NewsItem } : n));
      triggerAlert('Đã cập nhật bài viết thành công!');
    } else {
      // Create mode
      const newItem: NewsItem = {
        id: `news-${Date.now()}`,
        title: editingNews.title,
        category: editingNews.category || 'Sự kiện',
        date: new Date().toISOString().split('T')[0],
        summary: editingNews.summary || '',
        content: editingNews.content,
        image: editingNews.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
        views: 0,
        featured: editingNews.featured || false
      };
      setNews(prev => [newItem, ...prev]);
      triggerAlert('Đã tạo bài viết mới thành công!');
    }
    setEditingNews(null);
  };

  const handleDeleteNews = (id: string) => {
    if (confirm('Em có chắc chắn muốn xóa bài viết này không?')) {
      setNews(prev => prev.filter(n => n.id !== id));
      triggerAlert('Đã xóa bài viết khỏi cơ sở dữ liệu!');
    }
  };

  // 4. Activities CRUD handlers
  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity?.title || !editingActivity?.description) return;

    if (editingActivity.id) {
      setActivities(prev => prev.map(a => a.id === editingActivity.id ? { ...a, ...editingActivity as ActivityItem } : a));
      triggerAlert('Đã cập nhật phong trào thành công!');
    } else {
      const newItem: ActivityItem = {
        id: `act-${Date.now()}`,
        title: editingActivity.title,
        status: editingActivity.status || 'ongoing',
        date: editingActivity.date || '2026-11-01',
        description: editingActivity.description,
        requirements: editingActivity.requirements || '',
        benefits: editingActivity.benefits || '',
        image: editingActivity.image || 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80',
        participantsCount: 0
      };
      setActivities(prev => [newItem, ...prev]);
      triggerAlert('Đã khởi động phong trào mới!');
    }
    setEditingActivity(null);
  };

  const handleDeleteActivity = (id: string) => {
    if (confirm('Xóa phong trào thi đua này?')) {
      setActivities(prev => prev.filter(a => a.id !== id));
      triggerAlert('Đã hủy phong trào thành công!');
    }
  };

  // 5. Photos CRUD handlers
  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto?.title || !editingPhoto?.imageUrl) return;

    if (editingPhoto.id) {
      setPhotos(prev => prev.map(p => p.id === editingPhoto.id ? { ...p, ...editingPhoto as PhotoItem } : p));
      triggerAlert('Đã sửa ảnh thành công!');
    } else {
      const newItem: PhotoItem = {
        id: `photo-${Date.now()}`,
        title: editingPhoto.title,
        category: editingPhoto.category || 'Hoạt động',
        imageUrl: editingPhoto.imageUrl,
        date: new Date().toISOString().split('T')[0],
        description: editingPhoto.description || ''
      };
      setPhotos(prev => [newItem, ...prev]);
      triggerAlert('Đã tải lên ảnh mới vào thư viện!');
    }
    setEditingPhoto(null);
  };

  const handleDeletePhoto = (id: string) => {
    if (confirm('Xóa ảnh này khỏi thư viện?')) {
      setPhotos(prev => prev.filter(p => p.id !== id));
      triggerAlert('Đã xóa ảnh thành công!');
    }
  };

  // 6. Documents CRUD handlers
  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc?.title || !editingDoc?.code) return;

    if (editingDoc.id) {
      setDocuments(prev => prev.map(d => d.id === editingDoc.id ? { ...d, ...editingDoc as DocumentItem } : d));
      triggerAlert('Đã cập nhật văn bản hướng dẫn!');
    } else {
      const newItem: DocumentItem = {
        id: `doc-${Date.now()}`,
        title: editingDoc.title,
        code: editingDoc.code,
        category: editingDoc.category || 'Kế hoạch',
        date: new Date().toISOString().split('T')[0],
        issuingBody: editingDoc.issuingBody || 'Ban chỉ huy Liên đội',
        fileUrl: '#',
        fileSize: editingDoc.fileSize || '1.2 MB'
      };
      setDocuments(prev => [newItem, ...prev]);
      triggerAlert('Đã xuất bản văn bản mới lên cổng thông tin!');
    }
    setEditingDoc(null);
  };

  const handleDeleteDoc = (id: string) => {
    if (confirm('Hủy bỏ tài liệu hướng dẫn này?')) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      triggerAlert('Đã xóa văn bản lưu trữ!');
    }
  };

  // Supabase Documents CRUD handlers
  const handleSaveDbDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDbDoc || !editingDbDoc.title || !editingDbDoc.category_id || !editingDbDoc.file_url) {
      triggerAlert('Vui lòng điền đầy đủ các thông tin bắt buộc và tải lên tệp tin.');
      return;
    }

    setIsLoadingDocs(true);
    try {
      const input: CmsDocumentInput = {
        category_id: Number(editingDbDoc.category_id),
        title: editingDbDoc.title,
        description: editingDbDoc.description || '',
        file_url: editingDbDoc.file_url,
        file_name: editingDbDoc.file_name || 'tai-lieu',
        file_type: editingDbDoc.file_type || 'application/octet-stream',
        file_size: editingDbDoc.file_size || 0,
        status: editingDbDoc.status || 'DRAFT',
        is_featured: !!editingDbDoc.is_featured,
        slug: editingDbDoc.slug || undefined,
        published_at: editingDbDoc.published_at || null,
        document_number: editingDbDoc.document_number || null,
        issuing_unit: editingDbDoc.issuing_unit || null,
        issued_date: editingDbDoc.issued_date || null
      };

      if (editingDbDoc.id) {
        // Update existing document
        const { error } = await documentService.updateDocument(editingDbDoc.id, input, userId);
        if (error) throw error;
        triggerAlert('Cập nhật văn bản thành công!');
      } else {
        // Create new document
        const { error } = await documentService.createDocument(input, userId);
        if (error) throw error;
        triggerAlert('Đăng tải văn bản mới thành công!');
      }
      setEditingDbDoc(null);
      await fetchDocumentsData();
    } catch (err: any) {
      console.error('Error saving document:', err);
      triggerAlert('Lỗi: ' + (err.message || 'Không thể lưu văn bản.'));
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleDeleteDbDoc = async (id: number) => {
    if (!confirm('Em có chắc chắn muốn xóa văn bản này khỏi hệ thống?')) return;

    setIsLoadingDocs(true);
    try {
      const { error } = await documentService.deleteDocument(id);
      if (error) throw error;
      triggerAlert('Đã xóa văn bản thành công!');
      await fetchDocumentsData();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      triggerAlert('Lỗi: ' + (err.message || 'Không thể xóa văn bản.'));
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // Home Banner CRUD handlers
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.image_url) {
      triggerAlert('Vui lòng chọn hình ảnh cho banner.');
      return;
    }

    setIsLoadingBanners(true);
    try {
      const input: HomeBannerInput = {
        title: editingBanner.title || null,
        subtitle: editingBanner.subtitle || null,
        description: editingBanner.description || null,
        image_url: editingBanner.image_url,
        button_text: editingBanner.button_text || null,
        button_url: editingBanner.button_url || null,
        sort_order: Number(editingBanner.sort_order ?? 0),
        is_active: editingBanner.is_active !== false,
        status: editingBanner.status || 'DRAFT'
      };

      if (editingBanner.id) {
        // Update existing banner
        const { error } = await bannerService.updateBanner(editingBanner.id, input, userId);
        if (error) throw error;
        triggerAlert('Cập nhật banner thành công!');
      } else {
        // Create new banner
        const { error } = await bannerService.createBanner(input, userId);
        if (error) throw error;
        triggerAlert('Tạo banner mới thành công!');
      }
      setEditingBanner(null);
      await fetchBannersData();
    } catch (err: any) {
      console.error('Error saving banner:', err);
      triggerAlert('Lỗi: ' + (err.message || 'Không thể lưu banner.'));
    } finally {
      setIsLoadingBanners(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Em có chắc chắn muốn xóa banner này khỏi hệ thống?')) return;

    setIsLoadingBanners(true);
    try {
      const { success, error } = await bannerService.deleteBanner(id);
      if (!success || error) throw error || new Error('Không thể xóa banner');
      triggerAlert('Đã xóa banner thành công!');
      await fetchBannersData();
    } catch (err: any) {
      console.error('Error deleting banner:', err);
      triggerAlert('Lỗi: ' + (err.message || 'Không thể xóa banner.'));
    } finally {
      setIsLoadingBanners(false);
    }
  };

  // 7. Feedback/Contact logs handlers
  const handleToggleContactRead = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'unread' ? 'read' : 'unread' } : c));
    triggerAlert('Đã chuyển đổi trạng thái đọc phản hồi!');
  };

  const handleDeleteContact = (id: string) => {
    if (confirm('Em có chắc muốn xóa phản hồi góp ý này không?')) {
      setContacts(prev => prev.filter(c => c.id !== id));
      triggerAlert('Đã dọn dẹp hòm thư!');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-24 font-sans text-xs">
      
      {/* Alert Overlay Banner */}
      <AnimatePresence>
        {cmsAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 px-5 py-3 shadow-2xl flex items-center space-x-2 font-bold"
          >
            <Check className="h-5 w-5 bg-emerald-500/10 rounded-full p-0.5" />
            <span>{cmsAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section with logout and defaults reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
            <Settings className="h-6 w-6 animate-spin" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white leading-tight">Hệ Thống CMS Quản Trị</h1>
            <div className="mt-1 text-slate-500 dark:text-slate-400 font-semibold space-y-0.5">
              <p>Xin chào, <span className="text-blue-600 dark:text-blue-400 font-bold">{profile?.full_name || 'Quản trị viên'}</span></p>
              <p>Vai trò: <span className="text-red-500 dark:text-red-400 font-bold">{primaryRole?.name || primaryRole?.code || 'Quản trị hệ thống'}</span></p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Reset database */}
          <button
            onClick={() => { if(confirm('Sẽ xóa sạch mọi chỉnh sửa để khôi phục dữ liệu Liên đội mặc định ban đầu?')) { onResetDefaults(); triggerAlert('Đã khôi phục dữ liệu Liên đội mặc định!'); } }}
            className="flex items-center space-x-1 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold text-slate-600 dark:text-slate-300 transition-colors"
            title="Khôi phục gốc"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Khôi phục gốc</span>
          </button>

          {/* Logout */}
          <LogoutButton />
        </div>
      </div>

      {/* Grid Menu & Tabs Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side menu list */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-none border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800/80 lg:pr-4">
          {[
            { id: 'dashboard', label: 'Bảng điều khiển', icon: FolderSync },
            { id: 'contacts', label: 'Ý kiến góp ý', icon: MessageSquare, badge: contacts.filter(c => c.status === 'unread').length },
            { id: 'news', label: 'Sửa Tin tức', icon: FileText },
            { id: 'activities', label: 'Sửa Hoạt động', icon: Calendar },
            { id: 'photos', label: 'Sửa Ảnh đội', icon: ImageIcon },
            { id: 'documents', label: 'Sửa Văn bản', icon: FileCode },
            { id: 'banners', label: 'Banner trang chủ', icon: Sparkles },
            { id: 'settings', label: 'Thông tin chung', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CMSTab)}
                className={`flex items-center justify-between w-full rounded-xl px-4 py-3.5 text-xs font-bold whitespace-nowrap lg:whitespace-normal transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <Icon className="h-4.5 w-4.5" />
                  <span>{tab.label}</span>
                </span>
                {!!tab.badge && tab.badge > 0 && (
                  <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[9px] font-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Side Content Pane */}
        <div className="lg:col-span-9">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <span className="block text-slate-400 font-bold">Thư góp ý mới</span>
                  <span className="block text-3xl font-black text-slate-900 dark:text-white mt-1">
                    {contacts.filter(c => c.status === 'unread').length} / {contacts.length}
                  </span>
                </div>
                <div className="p-5 border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <span className="block text-slate-400 font-bold">Tổng tin bài</span>
                  <span className="block text-3xl font-black text-slate-900 dark:text-white mt-1">{news.length}</span>
                </div>
                <div className="p-5 border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <span className="block text-slate-400 font-bold">Tổng phong trào</span>
                  <span className="block text-3xl font-black text-slate-900 dark:text-white mt-1">{activities.length}</span>
                </div>
                <div className="p-5 border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <span className="block text-slate-400 font-bold">Thư viện ảnh</span>
                  <span className="block text-3xl font-black text-slate-900 dark:text-white mt-1">{photos.length} ảnh</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Kiểm duyệt Góp ý/Hiến kế Mới nhận</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {contacts.slice(0, 3).map((item) => (
                    <div key={item.id} className="py-3.5 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white">{item.fullName}</span>
                          <span className="text-[10px] text-slate-400">{item.date}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            item.status === 'unread' ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.status === 'unread' ? 'Chưa đọc' : 'Đã duyệt'}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium italic">"{item.message}"</p>
                      </div>

                      <button 
                        onClick={() => handleToggleContactRead(item.id)}
                        className="text-blue-500 font-bold hover:underline"
                      >
                        {item.status === 'unread' ? 'Duyệt đọc' : 'Đánh dấu chưa đọc'}
                      </button>
                    </div>
                  ))}
                  {contacts.length === 0 && (
                    <p className="text-slate-400 italic text-center py-4">Hiện không có bức thư góp ý nào.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUGGESTIONS LOG LIST */}
          {activeTab === 'contacts' && (
            <div className="space-y-6 fade-in">
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Danh sách hòm thư góp ý Liên đội ({contacts.length})</h2>
              
              <div className="space-y-4">
                {contacts.map((c) => (
                  <div key={c.id} className={`p-4 border rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4 transition-colors ${
                    c.status === 'unread' ? 'border-l-4 border-l-red-500' : ''
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{c.fullName}</span>
                          <span className="text-[10px] text-slate-400">{c.date}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span>SĐT: {c.phone}</span>
                          <span>Email: {c.email}</span>
                          <strong className="text-blue-600 dark:text-blue-400">Chủ đề: {c.subject}</strong>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleContactRead(c.id)}
                          className={`p-1.5 rounded-lg border text-[11px] font-bold ${
                            c.status === 'unread' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {c.status === 'unread' ? 'Duyệt đọc' : 'Chưa đọc'}
                        </button>
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>

                    <p className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl italic font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                      "{c.message}"
                    </p>
                  </div>
                ))}

                {contacts.length === 0 && (
                  <p className="text-slate-400 italic text-center py-12">Hiện không có hòm thư góp ý nào cần duyệt.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NEWS CONTENT CMS */}
          {activeTab === 'news' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Danh sách tin tức măng non</h2>
                  <p className="text-[11px] text-slate-500">Dữ liệu kết nối trực tiếp với Supabase</p>
                </div>
                <button
                  onClick={() => {
                    const tinTucCat = dbCategories.find(c => c.slug === 'tin-tuc');
                    setEditingDbPost({
                      category_id: tinTucCat?.id || (dbCategories[0]?.id ?? 0),
                      status: 'DRAFT',
                      title: '',
                      content: '',
                      cover_image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
                      excerpt: '',
                      is_featured: false,
                      activeTabContext: 'news'
                    });
                  }}
                  className="flex items-center space-x-1.5 bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Viết tin bài mới</span>
                </button>
              </div>

              {isLoadingDb ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 font-bold text-slate-600 dark:text-slate-400">Đang tải tin tức từ hệ thống...</span>
                </div>
              ) : dbError ? (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl text-red-600 dark:text-red-400">
                  {dbError}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dbPosts
                      .filter((item) => item.categories?.slug === 'tin-tuc')
                      .map((item) => (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <div className="flex items-center space-x-3.5">
                            <img src={item.cover_image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'} className="h-10 w-16 object-cover rounded-md" referrerPolicy="no-referrer" />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="block font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</span>
                                {item.is_featured && (
                                  <span className="bg-amber-100 text-amber-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">Nổi bật</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.created_at).toLocaleDateString('vi-VN')} • Chuyên mục: {item.categories?.name || 'Tin tức'} • <span className={`font-bold ${item.status === 'PUBLISHED' ? 'text-emerald-600' : 'text-amber-600'}`}>{item.status}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingDbPost({
                                id: item.id,
                                category_id: item.category_id,
                                title: item.title,
                                excerpt: item.excerpt,
                                content: item.content,
                                cover_image_url: item.cover_image_url,
                                status: item.status,
                                is_featured: item.is_featured,
                                published_at: item.published_at,
                                slug: item.slug,
                                activeTabContext: 'news'
                              })}
                              className="p-2 border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDbPost(item.id)}
                              className="p-2 border border-slate-200 text-red-500 dark:border-slate-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    {dbPosts.filter((item) => item.categories?.slug === 'tin-tuc').length === 0 && (
                      <p className="p-8 text-center text-slate-400 italic">Chưa có bài viết tin tức nào được tạo.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACTIVITIES PLAN CMS */}
          {activeTab === 'activities' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Sửa đổi kế hoạch thi đua</h2>
                  <p className="text-[11px] text-slate-500">Dữ liệu kết nối trực tiếp với Supabase</p>
                </div>
                <button
                  onClick={() => {
                    const hoatDongCat = dbCategories.find(c => c.slug === 'hoat-dong');
                    setEditingDbPost({
                      category_id: hoatDongCat?.id || (dbCategories[0]?.id ?? 0),
                      status: 'DRAFT',
                      title: '',
                      content: '',
                      cover_image_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80',
                      excerpt: '',
                      is_featured: false,
                      activeTabContext: 'activities'
                    });
                  }}
                  className="flex items-center space-x-1.5 bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Phát động phong trào</span>
                </button>
              </div>

              {isLoadingDb ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 font-bold text-slate-600 dark:text-slate-400">Đang tải phong trào từ hệ thống...</span>
                </div>
              ) : dbError ? (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl text-red-600 dark:text-red-400">
                  {dbError}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dbPosts
                      .filter((item) => item.categories?.slug === 'hoat-dong')
                      .map((act) => (
                        <div key={act.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <div className="flex items-center space-x-3.5">
                            <img src={act.cover_image_url || 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80'} className="h-10 w-16 object-cover rounded-md" referrerPolicy="no-referrer" />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="block font-bold text-slate-900 dark:text-white line-clamp-1">{act.title}</span>
                                {act.is_featured && (
                                  <span className="bg-amber-100 text-amber-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">Nổi bật</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {new Date(act.created_at).toLocaleDateString('vi-VN')} • Chuyên mục: {act.categories?.name || 'Hoạt động'} • <span className={`font-bold ${act.status === 'PUBLISHED' ? 'text-emerald-600' : 'text-amber-600'}`}>{act.status}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingDbPost({
                                id: act.id,
                                category_id: act.category_id,
                                title: act.title,
                                excerpt: act.excerpt,
                                content: act.content,
                                cover_image_url: act.cover_image_url,
                                status: act.status,
                                is_featured: act.is_featured,
                                published_at: act.published_at,
                                slug: act.slug,
                                activeTabContext: 'activities'
                              })}
                              className="p-2 border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDbPost(act.id)}
                              className="p-2 border border-slate-200 text-red-500 dark:border-slate-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    {dbPosts.filter((item) => item.categories?.slug === 'hoat-dong').length === 0 && (
                      <p className="p-8 text-center text-slate-400 italic">Chưa có kế hoạch hoạt động nào được tạo.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: GALLERY CONTENT CMS */}
          {activeTab === 'photos' && (
            <div className="space-y-8 fade-in text-xs">
              {/* ALBUM MANAGEMENT SECTION */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div>
                    <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Danh sách Album Thư viện ảnh</h2>
                    <p className="text-[10px] text-slate-500">Quản lý các album ảnh lưu trữ trên Supabase</p>
                  </div>
                  <button
                    onClick={() => setEditingAlbum({
                      title: '',
                      description: '',
                      cover_image_url: '',
                      sort_order: 0,
                      is_featured: false,
                      status: 'DRAFT'
                    })}
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-colors w-fit text-xs"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Tạo Album mới</span>
                  </button>
                </div>

                {isLoadingAlbums ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-3 font-bold text-slate-500">Đang tải danh sách album...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dbAlbums.map((album) => {
                      const isSelected = selectedAlbumId === album.id;
                      return (
                        <div 
                          key={album.id} 
                          onClick={() => setSelectedAlbumId(album.id)}
                          className={`border p-4 rounded-2xl bg-white dark:bg-slate-900 relative flex flex-col justify-between transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-blue-500 ring-2 ring-blue-500/10 dark:border-blue-400' 
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <img 
                              src={album.cover_image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=120&auto=format&fit=crop&q=80'} 
                              className="h-14 w-20 object-cover rounded-lg bg-slate-100 dark:bg-slate-950" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="space-y-1">
                              <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{album.title}</h4>
                              <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{album.description || 'Không có mô tả.'}</p>
                              <div className="flex flex-wrap gap-1 items-center pt-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                                  album.status === 'PUBLISHED' 
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                    : album.status === 'DRAFT' 
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                      : 'bg-slate-50 text-slate-700 dark:bg-slate-950/20 dark:text-slate-400'
                                }`}>
                                  {album.status}
                                </span>
                                {album.is_featured && (
                                  <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                                    Nổi bật
                                  </span>
                                )}
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-sm">
                                  Thứ tự: {album.sort_order}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="text-[10px] text-slate-400">
                              Ngày tạo: {new Date(album.created_at).toLocaleDateString('vi-VN')}
                            </span>
                            <div className="flex space-x-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setEditingAlbum(album)}
                                className="p-1.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Sửa album"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAlbum(album.id)}
                                className="p-1.5 border border-slate-200 dark:border-slate-800 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/10"
                                title="Xóa album"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {dbAlbums.length === 0 && (
                      <p className="col-span-full py-8 text-center text-slate-400 italic">Chưa có album ảnh nào được tạo.</p>
                    )}
                  </div>
                )}
              </div>

              {/* IMAGES IN ALBUM MANAGEMENT SECTION */}
              {selectedAlbumId !== '' && (
                <div className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div>
                      <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                        Quản lý ảnh của Album: <span className="text-blue-600 dark:text-blue-400">
                          {dbAlbums.find(a => a.id === selectedAlbumId)?.title || ''}
                        </span>
                      </h2>
                      <p className="text-[10px] text-slate-500">Tải lên và quản lý các ảnh thuộc album đang chọn</p>
                    </div>
                  </div>

                  <MultiImageUploadField
                    albumId={Number(selectedAlbumId)}
                    onUploaded={() => fetchAlbumImagesData(Number(selectedAlbumId))}
                  />

                  {isLoadingImages ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-3 font-bold text-slate-500">Đang tải ảnh của album...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {dbAlbumImages.map((img) => (
                        <div key={img.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden p-3 relative group flex flex-col justify-between h-full">
                          <div className="space-y-2">
                            <div className="relative aspect-square overflow-hidden bg-slate-50 dark:bg-slate-950 rounded-xl">
                              <img 
                                src={img.image_url} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                                alt={img.alt_text || img.title || 'Hình ảnh'}
                              />
                              {img.is_featured && (
                                <span className="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide shadow-xs">
                                  Nổi bật
                                </span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1 text-[11px]">{img.title || 'Không có tiêu đề'}</h4>
                              <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight mt-0.5">{img.description || 'Không có mô tả.'}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                            <span className="text-[9px] text-slate-400 font-semibold">Thứ tự: {img.sort_order}</span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => setEditingAlbumImage(img)}
                                className="p-1 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteAlbumImage(img.id)}
                                className="p-1 border border-slate-200 dark:border-slate-800 text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {dbAlbumImages.length === 0 && (
                        <p className="col-span-full py-8 text-center text-slate-400 italic">Album này chưa có ảnh nào. Hãy thêm ảnh mới!</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DOCUMENTS PLAN CMS */}
          {activeTab === 'documents' && (
            <div className="space-y-6 fade-in text-xs font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Quản lý kho văn bản chỉ đạo</h2>
                  <p className="text-[10px] text-slate-500">Quản lý các tài liệu, quyết định, hướng dẫn và kế hoạch trên hệ thống</p>
                </div>
                <button
                  onClick={() => setEditingDbDoc({
                    category_id: dbDocCategories[0]?.id || 0,
                    title: '',
                    description: '',
                    file_url: '',
                    file_name: '',
                    file_type: '',
                    file_size: 0,
                    status: 'DRAFT',
                    is_featured: false,
                    document_number: '',
                    issuing_unit: '',
                    issued_date: ''
                  })}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs text-xs transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Đăng tải văn bản</span>
                </button>
              </div>

              {isLoadingDocs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
                  <span className="ml-3 font-bold text-slate-500">Đang tải danh sách văn bản...</span>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                          <th className="px-4 py-3">Tiêu đề / Tên văn bản</th>
                          <th className="px-4 py-3">Danh mục</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Tài liệu đính kèm</th>
                          <th className="px-4 py-3">Ngày tạo</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {dbDocuments.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900 dark:text-white line-clamp-2 max-w-sm" title={doc.title}>
                                {doc.title}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                {doc.is_featured && (
                                  <span className="bg-amber-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase">
                                    Nổi bật
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-slate-600 dark:text-slate-400">
                              {doc.category?.name || <span className="text-slate-400 italic">Không rõ</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              {doc.status === 'PUBLISHED' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                                  Đã xuất bản
                                </span>
                              ) : doc.status === 'DRAFT' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                                  Bản nháp
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                                  Lưu trữ
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center space-x-1.5 max-w-xs">
                                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                <div className="min-w-0">
                                  <a 
                                    href={doc.file_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block"
                                    title={doc.file_name}
                                  >
                                    {doc.file_name}
                                  </a>
                                  {doc.file_size > 0 && (
                                    <span className="text-[9px] text-slate-400 font-medium block">
                                      {(doc.file_size / (1024 * 1024)).toFixed(2)} MB
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 font-medium">
                              {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => setEditingDbDoc(doc)}
                                className="p-1.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDbDoc(doc.id)}
                                className="p-1.5 border border-slate-200 dark:border-slate-800 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {dbDocuments.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                              Chưa có văn bản nào trong danh sách. Hãy thêm văn bản mới!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: BANNER TRANG CHỦ CMS */}
          {activeTab === 'banners' && (
            <div className="space-y-6 fade-in text-xs font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Quản lý Banner / Slide trang chủ</h2>
                  <p className="text-[10px] text-slate-500">Thiết lập các hình ảnh, khẩu hiệu, liên kết hành động nổi bật nhất ở trang chủ qua Supabase</p>
                </div>
                <button
                  onClick={() => setEditingBanner({
                    title: '',
                    subtitle: '',
                    description: '',
                    image_url: '',
                    button_text: '',
                    button_url: '',
                    sort_order: dbBanners.length > 0 ? Math.max(...dbBanners.map(b => b.sort_order)) + 10 : 10,
                    is_active: true,
                    status: 'DRAFT'
                  })}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs text-xs transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm Banner mới</span>
                </button>
              </div>

              {isLoadingBanners ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
                  <span className="ml-3 font-bold text-slate-500">Đang tải danh sách banner...</span>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                          <th className="py-3 px-4">Hình ảnh</th>
                          <th className="py-3 px-4">Thông tin Banner</th>
                          <th className="py-3 px-4 text-center">Trạng thái</th>
                          <th className="py-3 px-4 text-center">Thứ tự</th>
                          <th className="py-3 px-4 text-center">Hoạt động</th>
                          <th className="py-3 px-4 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {dbBanners.map((banner) => (
                          <tr key={banner.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                            <td className="py-3.5 px-4">
                              <div className="h-14 w-28 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 dark:border-slate-800">
                                <img
                                  src={banner.image_url}
                                  alt={banner.title || 'Banner'}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                              <div className="space-y-1">
                                <div className="font-bold text-slate-900 dark:text-white text-[13px] line-clamp-1">
                                  {banner.title || <span className="text-slate-400 italic font-normal">Không có tiêu đề</span>}
                                </div>
                                {banner.subtitle && (
                                  <div className="text-[11px] text-blue-600 dark:text-blue-400 italic line-clamp-1">
                                    {banner.subtitle}
                                  </div>
                                )}
                                {banner.description && (
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                                    {banner.description}
                                  </p>
                                )}
                                {(banner.button_text || banner.button_url) && (
                                  <div className="flex items-center space-x-2 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-md inline-block w-fit mt-1">
                                    <span>Nút: {banner.button_text || 'Chưa đặt'}</span>
                                    <span>➔</span>
                                    <span className="truncate max-w-[150px]">{banner.button_url || '/'}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block rounded-full px-2.5 py-1 text-[9px] font-extrabold ${
                                banner.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                banner.status === 'DRAFT' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' :
                                'bg-slate-100 text-slate-500 dark:bg-slate-800'
                              }`}>
                                {banner.status === 'PUBLISHED' ? 'Đã đăng' :
                                 banner.status === 'DRAFT' ? 'Bản nháp' : 'Lưu trữ'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                              {banner.sort_order}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full ${
                                banner.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                              }`}>
                                {banner.is_active ? '✓' : '✗'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setEditingBanner(banner)}
                                  className="p-1.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Chỉnh sửa"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBanner(banner.id)}
                                  className="p-1.5 border border-slate-200 dark:border-slate-800 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                  title="Xóa"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {dbBanners.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                              Chưa có banner nào trong danh sách. Hãy thêm banner mới!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: GENERAL SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 fade-in text-slate-800 dark:text-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Cấu hình thông tin Liên đội & Website</h2>
                  <p className="text-slate-500 text-xs mt-1">Quản lý toàn bộ thông tin chung, Header, Footer, Trang chủ Hero và phần liên hệ của trường qua Supabase.</p>
                </div>
              </div>

              {!settingsFormData ? (
                <div className="flex flex-col items-center justify-center p-12 border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                  <p className="text-slate-500 font-medium text-xs">Đang tải cấu hình site_settings...</p>
                </div>
              ) : (
                <form onSubmit={saveSchoolSettings} className="space-y-8">
                  {/* Section 1: Brand & Names */}
                  <div className="rounded-3xl border border-slate-200/80 p-6 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
                    <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">1. Thông tin Tên thương hiệu & Slogan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block font-bold">Tên Website (site_name):</label>
                        <input
                          type="text"
                          required
                          value={settingsFormData.site_name || ''}
                          onChange={(e) => setSettingsFormData({ ...settingsFormData, site_name: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block font-bold">Tên Trường (school_name):</label>
                        <input
                          type="text"
                          required
                          value={settingsFormData.school_name || ''}
                          onChange={(e) => setSettingsFormData({ ...settingsFormData, school_name: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-bold">Slogan Hành động chính thức (slogan):</label>
                      <input
                        type="text"
                        value={settingsFormData.slogan || ''}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, slogan: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Section 2: Branding Logos */}
                  <div className="rounded-3xl border border-slate-200/80 p-6 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
                    <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">2. Hình ảnh Nhận diện Logo & Favicon</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ImageUploadField
                        label="Đường dẫn Logo Trường (logo_url):"
                        value={settingsFormData.logo_url || ''}
                        onChange={(url) => setSettingsFormData({ ...settingsFormData, logo_url: url })}
                        folder="branding"
                        placeholder="Chọn ảnh hoặc nhập URL logo trường..."
                      />
                      <ImageUploadField
                        label="Đường dẫn Favicon Trang (favicon_url):"
                        value={settingsFormData.favicon_url || ''}
                        onChange={(url) => setSettingsFormData({ ...settingsFormData, favicon_url: url })}
                        folder="branding"
                        placeholder="Chọn ảnh hoặc nhập URL favicon..."
                      />
                    </div>
                  </div>

                  {/* Section 3: Contact & Address details */}
                  <div className="rounded-3xl border border-slate-200/80 p-6 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
                    <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">3. Thông tin Liên hệ & Địa chỉ văn phòng</h3>
                    <div className="space-y-1.5">
                      <label className="block font-bold">Địa chỉ chi tiết (address):</label>
                      <input
                        type="text"
                        value={settingsFormData.address || ''}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, address: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block font-bold">Số điện thoại (phone):</label>
                        <input
                          type="text"
                          value={settingsFormData.phone || ''}
                          onChange={(e) => setSettingsFormData({ ...settingsFormData, phone: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block font-bold">Email liên lạc (email):</label>
                        <input
                          type="email"
                          value={settingsFormData.email || ''}
                          onChange={(e) => setSettingsFormData({ ...settingsFormData, email: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-bold">Lời dẫn/Hướng dẫn góp ý Liên đội (contact_intro):</label>
                      <textarea
                        rows={3}
                        value={settingsFormData.contact_intro || ''}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, contact_intro: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none resize-none text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-bold">Đường dẫn Bản đồ nhúng (Google Maps map_url):</label>
                      <input
                        type="text"
                        value={settingsFormData.map_url || ''}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, map_url: e.target.value })}
                        placeholder="Nhập link src của iframe Google Maps..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* Section 4: Social Media accounts */}
                  <div className="rounded-3xl border border-slate-200/80 p-6 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
                    <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">4. Tài khoản Mạng xã hội</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="block font-bold">Link Facebook chính thức:</label>
                        <input
                          type="text"
                          value={settingsFormData.facebook_url || ''}
                          onChange={(e) => setSettingsFormData({ ...settingsFormData, facebook_url: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block font-bold">Kênh Youtube chính thức:</label>
                        <input
                          type="text"
                          value={settingsFormData.youtube_url || ''}
                          onChange={(e) => setSettingsFormData({ ...settingsFormData, youtube_url: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block font-bold">Link nhóm Zalo (zalo_url):</label>
                        <input
                          type="text"
                          value={settingsFormData.zalo_url || ''}
                          onChange={(e) => setSettingsFormData({ ...settingsFormData, zalo_url: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Footer configs */}
                  <div className="rounded-3xl border border-slate-200/80 p-6 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
                    <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">5. Cấu hình tiêu đề & nội dung chân trang (Footer)</h3>
                    <div className="space-y-1.5">
                      <label className="block font-bold">Tiêu đề Footer (footer_title):</label>
                      <input
                        type="text"
                        value={settingsFormData.footer_title || ''}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, footer_title: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-bold">Mô tả tóm tắt chân trang (footer_description):</label>
                      <textarea
                        rows={2}
                        value={settingsFormData.footer_description || ''}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, footer_description: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none resize-none text-xs"
                      />
                    </div>
                  </div>

                  {/* Section 6: Homepage Hero custom settings */}
                  <div className="rounded-3xl border border-slate-200/80 p-6 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
                    <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">6. Cấu hình Banner Trang chủ (Hero Section)</h3>
                    <div className="space-y-1.5">
                      <label className="block font-bold">Tiêu đề Banner Trang chủ (home_hero_title):</label>
                      <textarea
                        rows={2}
                        value={settingsFormData.home_hero_title || ''}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, home_hero_title: e.target.value })}
                        placeholder="Để trống sẽ dùng tiêu đề chào mừng mặc định..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none resize-none text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block font-bold">Tiêu đề phụ khẩu hiệu (home_hero_subtitle):</label>
                        <input
                          type="text"
                          value={settingsFormData.home_hero_subtitle || ''}
                          onChange={(e) => setSettingsFormData({ ...settingsFormData, home_hero_subtitle: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block font-bold">Lời kêu gọi trên nút CTA (home_hero_button_text):</label>
                        <input
                          type="text"
                          value={settingsFormData.home_hero_button_text || ''}
                          onChange={(e) => setSettingsFormData({ ...settingsFormData, home_hero_button_text: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block font-bold">Đường dẫn liên kết khi nhấn nút CTA (home_hero_button_url):</label>
                        <input
                          type="text"
                          value={settingsFormData.home_hero_button_url || ''}
                          onChange={(e) => setSettingsFormData({ ...settingsFormData, home_hero_button_url: e.target.value })}
                          placeholder="Ví dụ: /activities"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        {/* We use ImageUploadField to easily upload backgrounds to hero! */}
                        <ImageUploadField
                          label="Đường dẫn ảnh nền đầu trang (home_hero_background_url):"
                          value={settingsFormData.home_hero_background_url || ''}
                          onChange={(url) => setSettingsFormData({ ...settingsFormData, home_hero_background_url: url })}
                          folder="branding"
                          placeholder="Chọn hình ảnh hoặc nhập link ảnh nền..."
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-bold">Mô tả chi tiết banner trang chủ (home_hero_description):</label>
                      <textarea
                        rows={3}
                        value={settingsFormData.home_hero_description || ''}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, home_hero_description: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 bg-white dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500 focus:outline-none resize-none font-sans text-xs"
                      />
                    </div>
                  </div>

                  {/* Submission row */}
                  <div className="flex items-center justify-end space-x-3 border-t border-slate-200 dark:border-slate-800 pt-6">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer text-xs active:scale-95"
                    >
                      {isSavingSettings ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      <span>Lưu cấu hình hệ thống</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

      </div>

      {/* MODAL EDIT SUPABASE POST */}
      {editingDbPost !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setEditingDbPost(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSaveDbPost}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4 text-slate-800 dark:text-slate-200"
            >
              <h3 className="font-display font-bold text-base border-b border-slate-100 pb-2 dark:border-slate-800 text-slate-900 dark:text-white">
                {editingDbPost.id ? 'Cập nhật bài viết' : 'Đăng bài viết mới'} (Supabase)
              </h3>

              <div className="space-y-3 font-sans text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tiêu đề bài viết:</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tiêu đề bài viết..."
                    value={editingDbPost.title || ''}
                    onChange={(e) => setEditingDbPost({ ...editingDbPost, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Chuyên mục:</label>
                    <select
                      value={editingDbPost.category_id || ''}
                      onChange={(e) => setEditingDbPost({ ...editingDbPost, category_id: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="" disabled>-- Chọn chuyên mục --</option>
                      {dbCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Trạng thái xuất bản:</label>
                    <select
                      value={editingDbPost.status || 'DRAFT'}
                      onChange={(e) => setEditingDbPost({ ...editingDbPost, status: e.target.value as CmsPostStatus })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="DRAFT">Nháp (DRAFT)</option>
                      <option value="PUBLISHED">Xuất bản công khai (PUBLISHED)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1 flex items-center">
                    <label className="flex items-center space-x-2 font-bold cursor-pointer text-slate-700 dark:text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={editingDbPost.is_featured || false}
                        onChange={(e) => setEditingDbPost({ ...editingDbPost, is_featured: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Đánh dấu bài viết nổi bật</span>
                    </label>
                  </div>
                </div>

                <ImageUploadField
                  label="Đường dẫn ảnh bìa (Cover Image):"
                  value={editingDbPost.cover_image_url || ''}
                  onChange={(url) => setEditingDbPost({ ...editingDbPost, cover_image_url: url })}
                  folder="cms"
                  placeholder="Nhập link hình ảnh hoặc bấm Chọn ảnh..."
                />

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tóm tắt ngắn (Excerpt):</label>
                  <textarea
                    rows={2}
                    placeholder="Viết một đoạn tóm tắt ngắn cho bài viết..."
                    value={editingDbPost.excerpt || ''}
                    onChange={(e) => setEditingDbPost({ ...editingDbPost, excerpt: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nội dung chi tiết bài viết (Hỗ trợ Markdown):</label>
                  <textarea
                    required
                    rows={8}
                    placeholder="Nhập nội dung chi tiết bài viết..."
                    value={editingDbPost.content || ''}
                    onChange={(e) => setEditingDbPost({ ...editingDbPost, content: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none font-sans"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isLoadingDb}
                  onClick={() => setEditingDbPost(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoadingDb}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl shadow-md flex items-center space-x-1"
                >
                  {isLoadingDb && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1"></div>
                  )}
                  <span>Lưu bài viết</span>
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      )}

      {/* MODAL EDIT ALBUM */}
      {editingAlbum !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto text-xs">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setEditingAlbum(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSaveAlbum}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100"
            >
              <h3 className="font-display font-bold text-base border-b border-slate-100 pb-2 dark:border-slate-800">
                {editingAlbum.id ? 'Sửa thông tin Album' : 'Tạo Album mới'}
              </h3>

              <div className="space-y-3 font-sans">
                <div className="space-y-1">
                  <label className="font-bold">Tiêu đề Album:</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên Album ảnh..."
                    value={editingAlbum.title || ''}
                    onChange={(e) => setEditingAlbum({ ...editingAlbum, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Đường dẫn tĩnh (Slug - Để trống tự tạo):</label>
                  <input
                    type="text"
                    placeholder="vi-du-album-anh-dai-hoi"
                    value={editingAlbum.slug || ''}
                    onChange={(e) => setEditingAlbum({ ...editingAlbum, slug: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>

                <ImageUploadField
                  label="Đường dẫn ảnh bìa (Cover Image):"
                  value={editingAlbum.cover_image_url || ''}
                  onChange={(url) => setEditingAlbum({ ...editingAlbum, cover_image_url: url })}
                  folder="gallery/albums"
                  placeholder="Nhập link hình ảnh hoặc bấm Chọn ảnh..."
                />

                <div className="space-y-1">
                  <label className="font-bold">Mô tả Album:</label>
                  <textarea
                    rows={3}
                    placeholder="Viết một đoạn giới thiệu ngắn cho album này..."
                    value={editingAlbum.description || ''}
                    onChange={(e) => setEditingAlbum({ ...editingAlbum, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Thứ tự sắp xếp:</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingAlbum.sort_order ?? 0}
                      onChange={(e) => setEditingAlbum({ ...editingAlbum, sort_order: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">Trạng thái:</label>
                    <select
                      value={editingAlbum.status || 'DRAFT'}
                      onChange={(e) => setEditingAlbum({ ...editingAlbum, status: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none text-xs"
                    >
                      <option value="DRAFT">DRAFT (Nháp)</option>
                      <option value="PUBLISHED">PUBLISHED (Công khai)</option>
                      <option value="ARCHIVED">ARCHIVED (Lưu trữ)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="album-is-featured"
                    checked={editingAlbum.is_featured || false}
                    onChange={(e) => setEditingAlbum({ ...editingAlbum, is_featured: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="album-is-featured" className="font-bold cursor-pointer select-none">Đánh dấu Album nổi bật</label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAlbum(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl shadow-md flex items-center space-x-1"
                >
                  {isLoadingAlbums && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1"></div>
                  )}
                  <span>Lưu Album</span>
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      )}

      {/* MODAL EDIT ALBUM IMAGE */}
      {editingAlbumImage !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto text-xs">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setEditingAlbumImage(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSaveAlbumImage}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100"
            >
              <h3 className="font-display font-bold text-base border-b border-slate-100 pb-2 dark:border-slate-800">
                {editingAlbumImage.id ? 'Sửa thông tin ảnh' : 'Thêm ảnh mới vào Album'}
              </h3>

              <div className="space-y-3 font-sans">
                <ImageUploadField
                  label="Đường dẫn ảnh (Image URL):"
                  value={editingAlbumImage.image_url || ''}
                  onChange={(url) => setEditingAlbumImage({ ...editingAlbumImage, image_url: url })}
                  folder="gallery/images"
                  placeholder="Nhập đường dẫn URL ảnh hoặc bấm Chọn ảnh..."
                />

                <div className="space-y-1">
                  <label className="font-bold">Tiêu đề ảnh / Tên khoảnh khắc:</label>
                  <input
                    type="text"
                    placeholder="Nhập tiêu đề hoặc chú thích ảnh..."
                    value={editingAlbumImage.title || ''}
                    onChange={(e) => setEditingAlbumImage({ ...editingAlbumImage, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Mô tả cụ thể:</label>
                  <textarea
                    rows={2}
                    placeholder="Nhập mô tả thêm..."
                    value={editingAlbumImage.description || ''}
                    onChange={(e) => setEditingAlbumImage({ ...editingAlbumImage, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Văn bản thay thế (Alt Text - Để hỗ trợ SEO):</label>
                  <input
                    type="text"
                    placeholder="Ảnh hoạt động văn nghệ học sinh..."
                    value={editingAlbumImage.alt_text || ''}
                    onChange={(e) => setEditingAlbumImage({ ...editingAlbumImage, alt_text: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Thứ tự sắp xếp:</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingAlbumImage.sort_order ?? 0}
                      onChange={(e) => setEditingAlbumImage({ ...editingAlbumImage, sort_order: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1 flex items-center pt-5">
                    <input
                      type="checkbox"
                      id="img-is-featured"
                      checked={editingAlbumImage.is_featured || false}
                      onChange={(e) => setEditingAlbumImage({ ...editingAlbumImage, is_featured: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="img-is-featured" className="font-bold cursor-pointer select-none ml-2 text-slate-700 dark:text-slate-300">Nổi bật</label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAlbumImage(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl shadow-md flex items-center space-x-1"
                >
                  {isLoadingImages && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1"></div>
                  )}
                  <span>Lưu ảnh</span>
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      )}

      {/* MODAL EDIT DOCUMENT */}
      {editingDbDoc !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setEditingDbDoc(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSaveDbDoc}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4 text-slate-900 dark:text-white"
            >
              <h3 className="font-display font-bold text-base border-b border-slate-100 pb-2 dark:border-slate-800">
                {editingDbDoc.id ? 'Sửa văn bản chỉ đạo' : 'Đăng tải văn bản mới'}
              </h3>

              <div className="space-y-3 font-sans text-xs">
                <div className="space-y-1">
                  <label className="font-bold">Tên / Tiêu đề văn bản cụ thể:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Kế hoạch tổ chức Hội thi Nghi thức Đội..."
                    value={editingDbDoc.title || ''}
                    onChange={(e) => setEditingDbDoc({ ...editingDbDoc, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Số ký hiệu văn bản:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 12/KH-LĐ"
                      value={editingDbDoc.document_number || ''}
                      onChange={(e) => setEditingDbDoc({ ...editingDbDoc, document_number: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">Ngày ban hành:</label>
                    <input
                      type="date"
                      value={editingDbDoc.issued_date || ''}
                      onChange={(e) => setEditingDbDoc({ ...editingDbDoc, issued_date: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Đơn vị ban hành:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Ban Chỉ huy Liên đội"
                    value={editingDbDoc.issuing_unit || ''}
                    onChange={(e) => setEditingDbDoc({ ...editingDbDoc, issuing_unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Danh mục:</label>
                    <select
                      value={editingDbDoc.category_id || ''}
                      onChange={(e) => setEditingDbDoc({ ...editingDbDoc, category_id: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none"
                    >
                      {dbDocCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">Trạng thái:</label>
                    <select
                      value={editingDbDoc.status || 'DRAFT'}
                      onChange={(e) => setEditingDbDoc({ ...editingDbDoc, status: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none"
                    >
                      <option value="DRAFT">Bản nháp (Draft)</option>
                      <option value="PUBLISHED">Xuất bản (Published)</option>
                      <option value="ARCHIVED">Lưu trữ (Archived)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Mô tả tóm tắt văn bản:</label>
                  <textarea
                    rows={2}
                    placeholder="Nhập mô tả tóm tắt nội dung chính hoặc ý nghĩa của văn bản..."
                    value={editingDbDoc.description || ''}
                    onChange={(e) => setEditingDbDoc({ ...editingDbDoc, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <DocumentUploadField
                    label="Tài liệu tải lên (PDF, Word, Excel, PowerPoint tối đa 20MB):"
                    value={editingDbDoc.file_url || ''}
                    fileName={editingDbDoc.file_name || ''}
                    fileType={editingDbDoc.file_type || ''}
                    fileSize={editingDbDoc.file_size || 0}
                    onChange={(data) => setEditingDbDoc({
                      ...editingDbDoc,
                      file_url: data.file_url,
                      file_name: data.file_name,
                      file_type: data.file_type,
                      file_size: data.file_size,
                    })}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="doc-is-featured"
                    checked={editingDbDoc.is_featured || false}
                    onChange={(e) => setEditingDbDoc({ ...editingDbDoc, is_featured: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="doc-is-featured" className="font-bold cursor-pointer select-none text-slate-700 dark:text-slate-300">
                    Đánh dấu là tài liệu nổi bật (Ghim lên trang đầu)
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDbDoc(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoadingDocs}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-5 py-2 rounded-xl shadow-md flex items-center space-x-1"
                >
                  {isLoadingDocs && (
                    <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                  )}
                  <span>{editingDbDoc.id ? 'Cập nhật' : 'Đăng tải'}</span>
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      )}

      {/* MODAL EDIT BANNER */}
      {editingBanner !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setEditingBanner(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSaveBanner}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4 text-slate-900 dark:text-white"
            >
              <h3 className="font-display font-bold text-base border-b border-slate-100 pb-2 dark:border-slate-800">
                {editingBanner.id ? 'Sửa Banner / Slide trang chủ' : 'Tạo Banner mới'}
              </h3>

              <div className="space-y-3 font-sans text-xs">
                <ImageUploadField
                  label="Hình ảnh banner (Image URL) *:"
                  value={editingBanner.image_url || ''}
                  onChange={(url) => setEditingBanner({ ...editingBanner, image_url: url })}
                  folder="home/banners"
                  placeholder="Chọn ảnh tải lên cho banner hoặc nhập URL..."
                />

                <div className="space-y-1">
                  <label className="font-bold">Tiêu đề chính (Title):</label>
                  <input
                    type="text"
                    placeholder="Nhập tiêu đề chính của banner..."
                    value={editingBanner.title || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Tiêu đề phụ (Subtitle):</label>
                  <input
                    type="text"
                    placeholder="Nhập tiêu đề phụ của banner..."
                    value={editingBanner.subtitle || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Mô tả cụ thể (Description):</label>
                  <textarea
                    rows={2}
                    placeholder="Nhập mô tả thêm chi tiết..."
                    value={editingBanner.description || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Nhãn nút (Button Text):</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Đăng ký ngay, Xem thêm..."
                      value={editingBanner.button_text || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, button_text: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">Đường dẫn nút (Button URL):</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: /tin-tuc, /phong-trao..."
                      value={editingBanner.button_url || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, button_url: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Thứ tự sắp xếp (Sort Order):</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingBanner.sort_order ?? 0}
                      onChange={(e) => setEditingBanner({ ...editingBanner, sort_order: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">Trạng thái phát hành (Status):</label>
                    <select
                      value={editingBanner.status || 'DRAFT'}
                      onChange={(e) => setEditingBanner({ ...editingBanner, status: e.target.value as HomeBannerStatus })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                    >
                      <option value="DRAFT">Bản nháp (DRAFT)</option>
                      <option value="PUBLISHED">Xuất bản (PUBLISHED)</option>
                      <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="banner-is-active"
                    checked={editingBanner.is_active !== false}
                    onChange={(e) => setEditingBanner({ ...editingBanner, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="banner-is-active" className="font-bold cursor-pointer select-none text-slate-700 dark:text-slate-300">
                    Kích hoạt hiển thị (is_active)
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoadingBanners}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-5 py-2 rounded-xl shadow-md flex items-center space-x-1 cursor-pointer"
                >
                  {isLoadingBanners && (
                    <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                  )}
                  <span>{editingBanner.id ? 'Cập nhật' : 'Tạo mới'}</span>
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      )}

    </div>
  );
}
