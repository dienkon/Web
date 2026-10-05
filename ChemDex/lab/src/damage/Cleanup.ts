/**
 * CHEMDEX LAB - Hazardous Shards & Spills Cleanup (K4.4)
 * Tool-driven decontamination: dustpan & brush, tweezers, paper towels,
 * neutralizers (baking soda / vinegar), sharps bin, and bare-hand injury checks.
 */

import { shardManager } from './Shards';
import { puddleSimulator } from './Puddle';
import { ppeService } from '../safety/Ppe';

export type CleanupTool = 'brush_dustpan' | 'tweezers' | 'paper_towel' | 'baking_soda' | 'vinegar' | 'bare_hands';

export interface CleanupResult {
  success: boolean;
  toolUsed: CleanupTool;
  shardsRemoved: number;
  puddlesNeutralized: number;
  cutInjury: boolean;
  message_en: string;
  message_vi: string;
}

export function performBenchCleanup(
  tool: CleanupTool,
  targetPuddleId?: string
): CleanupResult {
  const ppe = ppeService.getState();

  // 1. Shards handling
  if (tool === 'brush_dustpan' || tool === 'tweezers') {
    const { cleanedCount } = shardManager.cleanShards(tool);
    return {
      success: true,
      toolUsed: tool,
      shardsRemoved: cleanedCount,
      puddlesNeutralized: 0,
      cutInjury: false,
      message_en: `Safely swept ${cleanedCount} glass shards into sharps bin.`,
      message_vi: `Đã dọn an toàn ${cleanedCount} mảnh vỡ thủy tinh vào thùng rác sắc nhọn.`
    };
  }

  // 2. Bare hands hazard!
  if (tool === 'bare_hands') {
    const { cleanedCount, cutInjury } = shardManager.cleanShards('bare_hands');
    if (cutInjury && !ppe.gloves) {
      return {
        success: false,
        toolUsed: 'bare_hands',
        shardsRemoved: cleanedCount,
        puddlesNeutralized: 0,
        cutInjury: true,
        message_en: `Injury warning! Picking up sharp broken glass with bare hands caused a cut. Always use a dustpan or tweezers.`,
        message_vi: `Cảnh báo chấn thương! Nhặt mảnh thủy tinh bằng tay trần gây đứt tay. Hãy luôn dùng chổi hót rác hoặc kẹp gắp.`
      };
    }
  }

  // 3. Liquid puddle absorption with paper towel
  if (tool === 'paper_towel') {
    if (targetPuddleId) {
      puddleSimulator.clearPuddle(targetPuddleId);
    } else {
      puddleSimulator.clearAll();
    }
    return {
      success: true,
      toolUsed: 'paper_towel',
      shardsRemoved: 0,
      puddlesNeutralized: 1,
      cutInjury: false,
      message_en: 'Spill absorbed cleanly with paper towel.',
      message_vi: 'Đã thấm sạch dung dịch tràn bằng khăn lau chuyên dụng.'
    };
  }

  // 4. Acid neutralization with baking soda (bicarbonate)
  if (tool === 'baking_soda') {
    if (targetPuddleId) {
      puddleSimulator.clearPuddle(targetPuddleId);
    }
    return {
      success: true,
      toolUsed: 'baking_soda',
      shardsRemoved: 0,
      puddlesNeutralized: 1,
      cutInjury: false,
      message_en: 'Acid spill neutralized safely with sodium bicarbonate.',
      message_vi: 'Đã trung hòa axit an toàn bằng bột baking soda.'
    };
  }

  return {
    success: true,
    toolUsed: tool,
    shardsRemoved: 0,
    puddlesNeutralized: 0,
    cutInjury: false,
    message_en: 'Cleanup completed.',
    message_vi: 'Đã hoàn tất dọn dẹp.'
  };
}
