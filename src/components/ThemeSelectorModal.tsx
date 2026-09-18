import React from 'react';
import { Palette, Check, X, Shield, Sparkles, RefreshCw } from 'lucide-react';
import { THEME_OPTIONS, DEFAULT_THEME_ID } from '../data/themes';
import { AppThemeId } from '../types';

interface ThemeSelectorModalProps {
  currentTheme: AppThemeId;
  onSelectTheme: (themeId: AppThemeId) => void;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  currentTheme,
  onSelectTheme,
  onClose,
}) => {
  return (
    <div
      id="theme-selector-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in print:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="theme-selector-dialog"
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-900 shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Pilihan Tema Aplikasi</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-900">
                  5 Tema
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Pilih nuansa warna aplikasi garansi kenyamanan visual produksi & PPIC
              </p>
            </div>
          </div>
          <button
            id="btn-close-theme-modal"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Theme List */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = currentTheme === theme.id;
            const isDefault = theme.id === DEFAULT_THEME_ID;

            return (
              <button
                key={theme.id}
                id={`theme-option-${theme.id}`}
                onClick={() => onSelectTheme(theme.id)}
                className={`w-full text-left rounded-xl p-4 transition-all duration-150 border flex items-center justify-between gap-4 group ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Theme Color Palette Preview circles */}
                  <div className="shrink-0 pt-0.5">
                    <div
                      className="h-10 w-10 rounded-xl border-2 border-white shadow-sm flex items-center justify-center transition group-hover:scale-105"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      <Shield className="w-5 h-5 text-white/90" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {theme.name}
                      </span>
                      {isDefault && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                          Default Utama
                        </span>
                      )}
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: theme.badgeBg,
                          color: theme.accentText,
                        }}
                      >
                        {theme.militaryTone}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {theme.tagline}
                    </p>

                    {/* Color Swatch Dots */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Palet:</span>
                      <span
                        className="h-3 w-3 rounded-full border border-black/10"
                        style={{ backgroundColor: theme.headerBg }}
                        title="Warna Header Gelap"
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/10"
                        style={{ backgroundColor: theme.primaryColor }}
                        title="Warna Tombol / Aksen Utama"
                      />
                      <span
                        className="h-3 w-3 rounded-full border border-black/10"
                        style={{ backgroundColor: theme.badgeBg }}
                        title="Warna Badge & Kontras Lembut"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Selection Indicator */}
                <div className="shrink-0">
                  {isSelected ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-200 group-hover:border-slate-400 transition" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 text-xs">
          <button
            id="btn-reset-theme-default"
            type="button"
            onClick={() => onSelectTheme(DEFAULT_THEME_ID)}
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Kembalikan ke Hijau Army (Default)</span>
          </button>

          <button
            id="btn-confirm-theme"
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 transition shadow-xs"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
