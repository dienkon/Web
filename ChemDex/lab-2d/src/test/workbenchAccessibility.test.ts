import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildLiveAnnouncementText,
  formatEquipmentAriaLabel,
  handleEquipmentKeyboardAction,
} from '../components/workspace/equipmentA11y';
import { CatalogLoadingBadge } from '../components/layout/WorkbenchToolbar';
import { useLabStore } from '../store/useLabStore';

describe('Phase 6 UX: Catalog Loading Indicator & Keyboard/A11y Controls', () => {
  beforeEach(() => {
    useLabStore.getState().resetWorkbench();
  });

  it('shows catalog loading badge only while catalogReady is false', () => {
    useLabStore.getState().setCatalogReady(false);
    expect(useLabStore.getState().catalogReady).toBe(false);
    const loadingHtml = renderToStaticMarkup(
      React.createElement(CatalogLoadingBadge, {
        loading: !useLabStore.getState().catalogReady,
        language: 'vi',
      })
    );
    expect(loadingHtml).toContain('Đang tải thư viện 1 300 phản ứng…');

    useLabStore.getState().setCatalogReady(true);
    expect(useLabStore.getState().catalogReady).toBe(true);
    const readyHtml = renderToStaticMarkup(
      React.createElement(CatalogLoadingBadge, {
        loading: !useLabStore.getState().catalogReady,
        language: 'vi',
      })
    );
    expect(readyHtml).toBe('');
  });

  it('formats accessible equipment aria-labels and live announcements', () => {
    const store = useLabStore.getState();
    const beakerId = store.addEquipment('beaker', 120, 140);
    store.addChemicalToEquipment(beakerId, 'chem-naoh', 25);

    const beaker = useLabStore.getState().equipment[beakerId];
    const labelVi = formatEquipmentAriaLabel(beaker, 'vi');
    expect(labelVi).toContain(beaker.name_vi);
    expect(labelVi).toContain('25 mL');
    expect(labelVi).toContain('NaOH');

    const msg = buildLiveAnnouncementText(
      [
        {
          id: 'log-1',
          timestamp: 100,
          actionType: 'REACTION',
          details_vi: 'Phản ứng NaOH + HCl đã xảy ra',
          details_en: 'Reaction NaOH + HCl occurred',
        },
      ],
      [],
      'vi'
    );
    expect(msg).toBe('Phản ứng NaOH + HCl đã xảy ra');
  });

  it('handles arrow nudge (10px / Shift+40px), Enter/Space menu, Delete removal, and Escape deselection', () => {
    const selectEquipment = vi.fn();
    const updatePosition = vi.fn();
    const removeEquipment = vi.fn();
    const openRadialMenu = vi.fn();
    const handlers = { selectEquipment, updatePosition, removeEquipment, openRadialMenu };

    const item = { id: 'eq-1', x: 100, y: 120 };

    expect(handleEquipmentKeyboardAction('ArrowRight', false, item, false, handlers)).toBe(true);
    expect(updatePosition).toHaveBeenLastCalledWith('eq-1', 110, 120);

    expect(handleEquipmentKeyboardAction('ArrowDown', true, item, false, handlers)).toBe(true);
    expect(updatePosition).toHaveBeenLastCalledWith('eq-1', 100, 160);

    expect(handleEquipmentKeyboardAction('Enter', false, item, false, handlers)).toBe(true);
    expect(selectEquipment).toHaveBeenCalledWith('eq-1');
    expect(openRadialMenu).toHaveBeenCalledWith('eq-1');

    expect(handleEquipmentKeyboardAction('Escape', false, item, true, handlers)).toBe(true);
    expect(selectEquipment).toHaveBeenLastCalledWith(null);

    expect(handleEquipmentKeyboardAction('Delete', false, item, true, handlers)).toBe(true);
    expect(removeEquipment).toHaveBeenCalledWith('eq-1');
  });
});
