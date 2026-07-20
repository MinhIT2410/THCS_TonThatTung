/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../../services/supabaseClient';

export const MAX_AUDIO_SIZE_MB = 50;
export const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;

export const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'ogg'];
export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg',      // mp3
  'audio/mp3',       // mp3 alternative
  'audio/x-m4a',     // m4a
  'audio/m4a',       // m4a alternative
  'audio/wav',       // wav
  'audio/x-wav',     // wav alternative
  'audio/ogg',       // ogg
  'application/ogg'  // ogg alternative
];

const STORAGE_BUCKET = 'school-media';

export function validateAudioFile(file: File): string | null {
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !ALLOWED_AUDIO_EXTENSIONS.includes(fileExt)) {
    return `Định dạng âm thanh không được hỗ trợ. Chỉ chấp nhận các tệp: ${ALLOWED_AUDIO_EXTENSIONS.join(', ').toUpperCase()}.`;
  }

  // Some browsers might report empty type, but if type is present, validate MIME type.
  if (file.type && !ALLOWED_AUDIO_MIME_TYPES.includes(file.type)) {
    return 'Định dạng âm thanh không được hỗ trợ. Vui lòng tải lên tệp âm thanh hợp lệ.';
  }

  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return `Tệp âm thanh vượt quá dung lượng cho phép. Dung lượng tối đa là ${MAX_AUDIO_SIZE_MB} MB.`;
  }

  return null;
}

export function generateSafeAudioPath(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'mp3';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  let id = '';
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    id = crypto.randomUUID();
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Format bytes to UUID v4 format
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC4122
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    id = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  } else {
    throw new Error('Môi trường không hỗ trợ API mã hóa bảo mật (Web Crypto API) để tạo định danh tệp.');
  }
  
  return `radio/${year}/${month}/${id}.${ext}`;
}

export const radioAudioService = {
  validateAudioFile,
  
  async uploadAudio(file: File): Promise<string> {
    const errorMsg = validateAudioFile(file);
    if (errorMsg) {
      throw new Error(errorMsg);
    }
    
    const path = generateSafeAudioPath(file.name);
    
    try {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (error) {
        console.error('Supabase upload audio error:', error);
        throw new Error(`Không thể tải tệp âm thanh lên: ${error.message}`);
      }
      
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
        
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Không thể lấy public URL cho tệp âm thanh vừa tải lên.');
      }
      
      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error('Error in uploadAudio:', err);
      throw new Error(err.message || 'Không thể tải tệp âm thanh lên.');
    }
  },
  
  async deleteAudioByUrl(url: string): Promise<void> {
    if (!url) return;
    
    const bucketMarker = `/${STORAGE_BUCKET}/`;
    const markerIndex = url.indexOf(bucketMarker);
    
    if (markerIndex !== -1) {
      const path = url.substring(markerIndex + bucketMarker.length);
      // Only delete if it's within the radio/ folder to prevent deleting unrelated files
      if (path.startsWith('radio/')) {
        try {
          const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
          if (error) {
            console.error('Lỗi khi xóa tệp âm thanh cũ từ Storage:', error);
          }
        } catch (err) {
          console.error('Error deleting audio by URL:', err);
        }
      }
    }
  }
};
