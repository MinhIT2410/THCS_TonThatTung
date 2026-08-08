/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';

export interface CompetitionReportConfig {
  parent_organization: string;
  unit_name: string;
  report_title: string;
  table_section_title: string;
  summary_section_title: string;
  summary_placeholder: string;
  reporter_title: string;
  approver_title: string;
}

export const DEFAULT_COMPETITION_REPORT_CONFIG: CompetitionReportConfig = {
  parent_organization: 'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO',
  unit_name: 'BAN THI ĐƯA - ĐỘI GIÁM THỊ',
  report_title: 'BIÊN BẢN TỔNG KẾT VI PHẠM THI ĐƯA HÀNG TUẦN',
  table_section_title: 'I. BẢNG THỐNG KÊ CHI TIẾT LỖI VI PHẠM THEO LỚP',
  summary_section_title: 'II. NHẬN XÉT & TỔNG KẾT CỦA GIÁM THỊ',
  summary_placeholder: 'Nhập đánh giá nề nếp, tuyên dương/nhắc nhở cụ thể cho các lớp trong tuần...',
  reporter_title: 'NGƯỜI LẬP BÁO CÁO',
  approver_title: 'BAN GIÁM HIỆU / XÁC NHẬN',
};

const STORAGE_KEY = 'competition_report_config_v1';

export const competitionReportConfigService = {
  getReportConfig(): CompetitionReportConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_COMPETITION_REPORT_CONFIG,
          ...parsed,
        };
      }
    } catch (err) {
      console.warn('Error reading report config from localStorage:', err);
    }
    return { ...DEFAULT_COMPETITION_REPORT_CONFIG };
  },

  async fetchReportConfigFromDB(): Promise<CompetitionReportConfig> {
    const local = this.getReportConfig();
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('competition_report_config')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data?.competition_report_config) {
        const dbConfig = typeof data.competition_report_config === 'string' 
          ? JSON.parse(data.competition_report_config) 
          : data.competition_report_config;

        const merged = {
          ...DEFAULT_COMPETITION_REPORT_CONFIG,
          ...dbConfig,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {
          // ignore
        }
        return merged;
      }
    } catch (err) {
      console.warn('DB fetch error for competition report config, using cached local config', err);
    }
    return local;
  },

  async saveReportConfig(config: CompetitionReportConfig): Promise<{ success: boolean; error?: string }> {
    const cleanConfig: CompetitionReportConfig = {
      parent_organization: config.parent_organization?.trim() || DEFAULT_COMPETITION_REPORT_CONFIG.parent_organization,
      unit_name: config.unit_name?.trim() || DEFAULT_COMPETITION_REPORT_CONFIG.unit_name,
      report_title: config.report_title?.trim() || DEFAULT_COMPETITION_REPORT_CONFIG.report_title,
      table_section_title: config.table_section_title?.trim() || DEFAULT_COMPETITION_REPORT_CONFIG.table_section_title,
      summary_section_title: config.summary_section_title?.trim() || DEFAULT_COMPETITION_REPORT_CONFIG.summary_section_title,
      summary_placeholder: config.summary_placeholder?.trim() || DEFAULT_COMPETITION_REPORT_CONFIG.summary_placeholder,
      reporter_title: config.reporter_title?.trim() || DEFAULT_COMPETITION_REPORT_CONFIG.reporter_title,
      approver_title: config.approver_title?.trim() || DEFAULT_COMPETITION_REPORT_CONFIG.approver_title,
    };

    // 1. Save to localStorage immediately
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanConfig));
    } catch (e) {
      console.error('Error saving config to localStorage:', e);
    }

    // Dispatch DOM event for reactive updates across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('competition_report_config_updated', { detail: cleanConfig }));
    }

    // 2. Try persisting to site_settings in DB
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ competition_report_config: cleanConfig })
        .eq('id', 1);

      if (error) {
        console.warn('Could not persist report config to site_settings DB column (saved locally):', error.message);
      }
    } catch (err: any) {
      console.warn('DB update exception for report config (fallback to local):', err?.message || err);
    }

    return { success: true };
  }
};
