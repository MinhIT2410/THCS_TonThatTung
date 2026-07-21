/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, ArrowRight, Sparkles } from 'lucide-react';
import EditableBlock from '../editable/EditableBlock';
import { RADIO_PROGRAM_DEFAULT, RadioProgramConfig } from '../../config/defaults/home.defaults';

interface RadioProgramBannerProps {
  data: RadioProgramConfig;
  overrideData: any;
  onSave: (blockKey: string, data: any) => Promise<void>;
  onReset: (blockKey: string) => Promise<void>;
  error?: string | null;
  onListenClick: () => void;
}

export default function RadioProgramBanner({
  data,
  overrideData,
  onSave,
  onReset,
  error,
  onListenClick,
}: RadioProgramBannerProps) {
  if (!data.enabled) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <EditableBlock
        pageKey="home"
        blockKey="radioProgram"
        title="Phát thanh măng non"
        defaultData={RADIO_PROGRAM_DEFAULT}
        overrideData={overrideData}
        onSave={onSave}
        onReset={onReset}
        error={error}
      >
        <div className="flex flex-col md:flex-row items-center justify-between rounded-[2rem] bg-gradient-to-r from-red-600 via-purple-700 to-blue-700 p-[18px] sm:p-6 md:p-8 text-white shadow-2xl relative overflow-hidden group border border-white/10">
          {/* Animated Glowing Orbs Background */}
          <div className="absolute -top-12 -right-12 w-72 h-72 bg-blue-500/10 rounded-full pointer-events-none blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute -bottom-12 -left-12 w-72 h-72 bg-red-500/10 rounded-full pointer-events-none blur-3xl group-hover:scale-110 transition-transform duration-700" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 mb-5 md:mb-0 relative z-10 text-center sm:text-left w-full md:w-auto">
            {/* Animated Loudspeaker Icon */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner border border-white/10 group-hover:scale-105 active:scale-95 transition-all duration-300">
              <Volume2 className="h-7 w-7 text-yellow-300 animate-[bounce_2s_infinite]" />
            </div>
            
            <div className="space-y-1.5 max-w-full sm:max-w-2xl min-w-0">
              <span className="inline-flex items-center space-x-1 text-[10px] uppercase font-extrabold bg-white/15 px-3 py-1 rounded-full tracking-wider text-yellow-200 border border-white/5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
                <span>{data.eyebrow || "PHÁT THANH MĂNG NON"}</span>
              </span>
              <h3 className="text-base sm:text-lg font-extrabold font-sans leading-snug tracking-tight drop-shadow-sm group-hover:text-yellow-50 transition-colors break-words">
                {data.title || "Chương trình phát thanh kỳ này..."}
              </h3>
              {data.description && (
                <p className="text-xs text-slate-200/85 leading-relaxed font-sans font-medium line-clamp-1 break-words">
                  {data.description}
                </p>
              )}
            </div>
          </div>

          <button 
            onClick={data.audioUrl ? onListenClick : undefined}
            disabled={!data.audioUrl}
            title={data.audioUrl ? undefined : "Chương trình chưa có tệp âm thanh."}
            className="flex items-center justify-center space-x-2 rounded-2xl bg-white text-purple-800 px-6 py-3.5 text-xs font-bold shadow-xl shadow-purple-950/20 hover:bg-yellow-100 hover:text-purple-950 hover:shadow-yellow-400/10 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-purple-800 disabled:shadow-none transition-all duration-300 relative z-10 shrink-0 select-none cursor-pointer border border-white/50 w-full sm:w-auto"
          >
            <span>{data.buttonLabel || "Nghe chương trình"}</span>
            <ArrowRight className="h-4 w-4 transition-transform enabled:group-hover:translate-x-1" />
          </button>
        </div>
      </EditableBlock>
    </section>
  );
}
