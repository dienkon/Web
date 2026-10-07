import React from 'react';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { Slider, Switch } from '../../ui/Controls';
import { useStore } from '../../store/useStore';
import { vi } from '../../i18n/vi';
import { Volume2, Monitor, Eye, Play, BookOpen, RotateCcw, LogOut } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const show = useStore((s) => s.showSettings);
  const setShow = useStore((s) => s.setShowSettings);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const setShowRulesList = useStore((s) => s.setShowRulesList);
  const startGame = useStore((s) => s.startGame);
  const setView = useStore((s) => s.setView);

  const handleRestart = () => {
    setShow(false);
    startGame();
  };

  const handleQuit = () => {
    setShow(false);
    setView('start');
  };

  return (
    <Sheet
      isOpen={show}
      onClose={() => setShow(false)}
      title={vi.settings.title}
      subtitle="Tùy chỉnh trải nghiệm âm thanh, đồ họa và trợ năng"
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Graphics Quality */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            <Monitor className="w-4 h-4 text-[var(--primary)]" />
            <span>{vi.settings.graphics}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(['auto', 'high', 'medium', 'low'] as const).map((lvl) => {
              const labels = {
                auto: vi.settings.graphicsAuto,
                high: vi.settings.graphicsHigh,
                medium: vi.settings.graphicsMedium,
                low: vi.settings.graphicsLow,
              };
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => updateSettings({ graphicsQuality: lvl })}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                    settings.graphicsQuality === lvl
                      ? 'bg-[var(--primary-50)] text-[var(--primary-600)] border-[var(--primary)] shadow-xs'
                      : 'bg-white text-slate-600 border-[var(--line)] hover:bg-slate-50'
                  }`}
                >
                  {labels[lvl]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio Volume Sliders */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            <Volume2 className="w-4 h-4 text-[var(--primary)]" />
            <span>{vi.settings.sound}</span>
          </div>
          <Slider
            label={vi.settings.sfxVol}
            value={settings.sfxVolume}
            onChange={(val) => updateSettings({ sfxVolume: val })}
          />
          <Slider
            label={vi.settings.musicVol}
            value={settings.musicVolume}
            onChange={(val) => updateSettings({ musicVolume: val })}
          />
          <Slider
            label={vi.settings.voiceVol}
            value={settings.voiceVolume}
            onChange={(val) => updateSettings({ voiceVolume: val })}
          />
        </div>

        {/* Accessibility & Input Toggles */}
        <div className="space-y-3 pt-2 border-t border-[var(--line)]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            <Eye className="w-4 h-4 text-[var(--primary)]" />
            <span>Tương tác & Trợ năng</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-semibold text-[var(--ink)]">{vi.settings.vibration}</span>
            <Switch
              checked={settings.vibration}
              onChange={(v) => updateSettings({ vibration: v })}
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-semibold text-[var(--ink)]">{vi.settings.reduceMotion}</span>
            <Switch
              checked={settings.reduceMotion}
              onChange={(v) => updateSettings({ reduceMotion: v })}
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-semibold text-[var(--ink)]">{vi.settings.leftHanded}</span>
            <Switch
              checked={settings.leftHanded}
              onChange={(v) => updateSettings({ leftHanded: v })}
            />
          </div>
        </div>

        {/* Action Buttons: Resume, Handbook, Restart, Quit */}
        <div className="pt-4 border-t border-[var(--line)] grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            icon={<BookOpen className="w-4 h-4 text-[var(--primary)]" />}
            onClick={() => {
              setShow(false);
              setShowRulesList(true);
            }}
          >
            {vi.settings.handbook}
          </Button>

          <Button
            variant="primary"
            icon={<Play className="w-4 h-4" />}
            onClick={() => setShow(false)}
          >
            {vi.settings.resume}
          </Button>

          <Button
            variant="secondary"
            icon={<RotateCcw className="w-4 h-4 text-amber-500" />}
            onClick={handleRestart}
          >
            {vi.settings.restart}
          </Button>

          <Button
            variant="danger"
            icon={<LogOut className="w-4 h-4" />}
            onClick={handleQuit}
          >
            {vi.settings.quit}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
