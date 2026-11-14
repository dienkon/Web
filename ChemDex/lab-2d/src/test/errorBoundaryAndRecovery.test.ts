import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ErrorBoundary,
  resetLabStateForRecovery,
} from '../components/layout/ErrorBoundary';
import { useLabStore } from '../store/useLabStore';

describe('ErrorBoundary & Crash Recovery', () => {
  beforeEach(() => {
    useLabStore.getState().resetWorkbench();
  });

  it('captures rendering faults in state and renders localized recovery controls', () => {
    const derived = ErrorBoundary.getDerivedStateFromError(new Error('Simulated canvas fault'));
    expect(derived.hasError).toBe(true);
    expect(derived.errorMessage).toBe('Simulated canvas fault');

    const boundary = new ErrorBoundary({
      scope: 'workbench',
      language: 'vi',
      children: React.createElement('div', null, 'healthy'),
    });
    boundary.state = {
      hasError: true,
      errorMessage: 'Simulated canvas fault',
      statusNote: null,
      busy: false,
    };

    const html = renderToStaticMarkup(boundary.render() as React.ReactElement);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Khôi phục phiên tự lưu');
    expect(html).toContain('Đặt lại bàn thí nghiệm');
    expect(html).toContain('Tải lại trang');
    expect(html).toContain('Simulated canvas fault');
  });

  it('resets modal state without wiping bench vessels on modal scope recovery, and resets bench on workbench scope', () => {
    const store = useLabStore.getState();
    const id = store.addEquipment('beaker');
    store.toggleReactionLibrary(true);
    expect(useLabStore.getState().isReactionLibraryOpen).toBe(true);

    const onModalRecover = vi.fn();
    resetLabStateForRecovery('modal', onModalRecover);
    expect(onModalRecover).toHaveBeenCalledTimes(1);
    expect(useLabStore.getState().isReactionLibraryOpen).toBe(false);
    expect(useLabStore.getState().equipment[id]).toBeDefined();

    const onBenchRecover = vi.fn();
    resetLabStateForRecovery('workbench', onBenchRecover);
    expect(onBenchRecover).toHaveBeenCalledTimes(1);
    expect(Object.keys(useLabStore.getState().equipment)).toHaveLength(0);
  });
});
