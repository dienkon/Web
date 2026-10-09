/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MapLegendModal: Visual Map Symbols & States Guide
 */

import React from "react";
import { X, Info, Check, Play, Lock, ShieldCheck, Award, Sparkles, Compass } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function MapLegendModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              Chú Giải Bản Đồ 3D (Map Legend)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">1. Các loại hòn đảo</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                </div>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">Đảo Thường</span>
                  <span className="text-[10px] text-slate-400">Màn rèn luyện kiến thức</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">Trạm Kiểm Soát</span>
                  <span className="text-[10px] text-slate-400">Mốc 10, 25, 40</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center gap-2.5 col-span-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">Đỉnh Cao Chinh Phục (Màn 50)</span>
                  <span className="text-[10px] text-slate-400">Thử thách tổng hợp VDC mở khóa Cúp Vàng</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">2. Trạng thái & Màu sắc</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white">Xanh ngọc:</span>
                <span className="text-slate-500">Đã vượt qua và ghi nhận điểm số</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 shrink-0 animate-ping" />
                <span className="font-bold text-slate-900 dark:text-white">Xanh tím phát sáng:</span>
                <span className="text-slate-500">Đích đến hiện tại đang chờ bạn làm</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white">Xám đen:</span>
                <span className="text-slate-500">Đang khóa (cần vượt các màn trước)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
