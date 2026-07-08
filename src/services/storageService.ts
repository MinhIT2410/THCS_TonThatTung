import { supabase } from '../lib/supabase/client';

const STORAGE_BUCKET = 'school-media';

/**
 * Loại bỏ dấu tiếng Việt và khoảng trắng để tạo tên file an toàn
 */
function getSafeFileName(originalName: string): string {
  const extIndex = originalName.lastIndexOf('.');
  const ext = extIndex !== -1 ? originalName.slice(extIndex).toLowerCase() : '';
  let nameWithoutExt = extIndex !== -1 ? originalName.slice(0, extIndex) : originalName;

  // Loại bỏ dấu tiếng Việt
  nameWithoutExt = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  // Chỉ giữ ký tự chữ, số, gạch ngang, gạch dưới. Thay thế các ký tự khác bằng gạch ngang.
  let safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-') // Gom nhiều gạch ngang liên tiếp thành 1
    .replace(/^-+|-+$/g, ''); // Loại bỏ gạch ngang ở đầu và cuối

  if (!safeName) {
    safeName = 'file';
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${safeName}-${timestamp}-${randomStr}${ext}`;
}

/**
 * Kiểm tra file ảnh hợp lệ: định dạng (jpeg, png, webp, gif) và dung lượng (<10MB)
 */
export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận các file định dạng JPEG, PNG, WEBP, GIF.';
  }

  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeInBytes) {
    return 'Dung lượng ảnh vượt quá giới hạn cho phép (Tối đa 10MB).';
  }

  return null;
}

/**
 * Upload ảnh lên Supabase Storage và trả về public URL
 */
export async function uploadImage(file: File, folder?: string): Promise<string> {
  // Validate file
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const currentYear = new Date().getFullYear();
  const folderPath = folder ? `${folder}/${currentYear}` : `uploads/${currentYear}`;
  const safeName = getSafeFileName(file.name);
  const path = `${folderPath}/${safeName}`;

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Tải ảnh lên Supabase thất bại: ${error.message}`);
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    if (!data || !data.publicUrl) {
      throw new Error('Không thể lấy public URL cho file vừa upload.');
    }

    return data.publicUrl;
  } catch (err: any) {
    console.error('Error during uploadImage:', err);
    throw new Error(err.message || 'Có lỗi xảy ra khi tải ảnh lên hệ thống.');
  }
}

/**
 * Xóa file ảnh dựa trên public URL
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  if (!url) return;
  
  const bucketMarker = `/${STORAGE_BUCKET}/`;
  const markerIndex = url.indexOf(bucketMarker);
  
  if (markerIndex !== -1) {
    const path = url.substring(markerIndex + bucketMarker.length);
    try {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      if (error) {
        console.error('Lỗi khi xóa file cũ từ Storage:', error);
      }
    } catch (err) {
      console.error('Error deleting image by URL:', err);
    }
  }
}

export const DOCUMENT_STORAGE_BUCKET = 'school-document';

/**
 * Kiểm tra file tài liệu hợp lệ: định dạng (pdf, doc, docx, xls, xlsx, ppt, pptx) và dung lượng (<20MB)
 */
export function validateDocumentFile(file: File): string | null {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  if (!allowedTypes.includes(file.type)) {
    return 'Định dạng tệp không hợp lệ. Chỉ chấp nhận các file PDF, Word (DOC/DOCX), Excel (XLS/XLSX), hoặc PowerPoint (PPT/PPTX).';
  }

  const maxSizeInBytes = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSizeInBytes) {
    return 'Dung lượng tệp vượt quá giới hạn cho phép (Tối đa 20MB).';
  }

  return null;
}

/**
 * Upload tài liệu lên Supabase Storage và trả về thông tin file
 */
export async function uploadDocument(file: File, folder: string = 'documents'): Promise<{
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}> {
  const validationError = validateDocumentFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const currentYear = new Date().getFullYear();
  const folderPath = `${folder}/${currentYear}`;
  const safeName = getSafeFileName(file.name);
  const path = `${folderPath}/${safeName}`;

  try {
    const { error } = await supabase.storage
      .from(DOCUMENT_STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase document upload error:', error);
      throw new Error(`Tải tài liệu lên Supabase thất bại: ${error.message}`);
    }

    const { data } = supabase.storage
      .from(DOCUMENT_STORAGE_BUCKET)
      .getPublicUrl(path);

    if (!data || !data.publicUrl) {
      throw new Error('Không thể lấy public URL cho tài liệu vừa upload.');
    }

    return {
      url: data.publicUrl,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
    };
  } catch (err: any) {
    console.error('Error during uploadDocument:', err);
    throw new Error(err.message || 'Có lỗi xảy ra khi tải tài liệu lên hệ thống.');
  }
}

export const storageService = {
  validateImageFile,
  uploadImage,
  deleteImageByUrl,
  validateDocumentFile,
  uploadDocument,
};
