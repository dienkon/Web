import {afterEach,describe,it,expect} from 'vitest';
import {useQualityStore,getQualitySettings} from '../src/vfx/quality';
import {summarizeFrames} from '../src/render/FrameTelemetry';
const original=useQualityStore.getState();
afterEach(()=>useQualityStore.setState(original));
describe('Renderer-aware visual quality',()=>{
 it('starts software rendering at the lightest automatic tier and prevents escalation',()=>{useQualityStore.setState({preference:'auto',effectiveTier:'medium',rendererClass:'unknown'});useQualityStore.getState().configureRenderer('ANGLE SwiftShader Device');expect(useQualityStore.getState().effectiveTier).toBe('potato');useQualityStore.getState().handlePerformanceIncline();expect(useQualityStore.getState().effectiveTier).toBe('potato');const settings=getQualitySettings('potato');expect(settings.glassTransmission).toBe(false);expect(settings.usePostFX).toBe(false);expect(settings.shadowBudget).toBe(0);});
 it('preserves an explicit user preference on software renderers',()=>{useQualityStore.setState({preference:'high',effectiveTier:'high'});useQualityStore.getState().configureRenderer('llvmpipe');expect(useQualityStore.getState().effectiveTier).toBe('high');useQualityStore.getState().setPreference('auto');expect(useQualityStore.getState().effectiveTier).toBe('potato');});
 it('retains automatic adaptation on hardware GPUs',()=>{useQualityStore.setState({preference:'auto',effectiveTier:'medium',rendererClass:'unknown'});useQualityStore.getState().configureRenderer('ANGLE NVIDIA GeForce');useQualityStore.getState().handlePerformanceIncline();expect(useQualityStore.getState().effectiveTier).toBe('high');});
 it('reports slow visible frames instead of silently dropping their duration',()=>{expect(summarizeFrames([1000,1000,1000]).fps).toBe(1);expect(summarizeFrames([1000/60,1000/60,1000/60]).fps).toBe(60);});
});
