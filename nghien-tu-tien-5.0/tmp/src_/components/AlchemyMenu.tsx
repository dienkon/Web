/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { PlayerCharacter, GameItem } from "../types";
import {
  ALCHEMY_RECIPES,
  CRAFTING_RECIPES,
  getItemTemplate,
  createEquipment,
  playSound,
} from "../utils/gameData";
import {
  addInventoryItem,
  removeInventoryItem,
  normalizeInventoryItems,
} from "../utils/inventory";
import { Flame, Star, Zap, Layers, Sparkles, Plus, Check } from "lucide-react";

interface AlchemyMenuProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
  alchemyLevel: number;
  setAlchemyLevel: React.Dispatch<React.SetStateAction<number>>;
  alchemyExp: number;
  setAlchemyExp: React.Dispatch<React.SetStateAction<number>>;
  craftingLevel: number;
  setCraftingLevel: React.Dispatch<React.SetStateAction<number>>;
  craftingExp: number;
  setCraftingExp: React.Dispatch<React.SetStateAction<number>>;
}

export default function AlchemyMenu({
  player,
  setPlayer,
  inventory,
  setInventory,
  alchemyLevel,
  setAlchemyLevel,
  alchemyExp,
  setAlchemyExp,
  craftingLevel,
  setCraftingLevel,
  craftingExp,
  setCraftingExp,
}: AlchemyMenuProps) {
  const [activeTab, setActiveTab] = useState<"alchemy" | "crafting">("alchemy");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");

  // Progress states
  const [isRefining, setIsRefining] = useState(false);
  const [refineProgress, setRefineProgress] = useState(0);
  const [refineLog, setRefineLog] = useState<string[]>([]);
  const [autoRefine, setAutoRefine] = useState(false);

  const autoRefineRef = useRef(autoRefine);
  const isRefiningRef = useRef(isRefining);
  const inventoryRef = useRef(inventory);

  const refineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refineFinishLockRef = useRef(false);

  useEffect(() => {
    autoRefineRef.current = autoRefine;
  }, [autoRefine]);

  useEffect(() => {
    isRefiningRef.current = isRefining;
  }, [isRefining]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  // Set default recipe when switching tabs
  useEffect(() => {
    if (activeTab === "alchemy") {
      setSelectedRecipeId(ALCHEMY_RECIPES[0].id);
    } else {
      setSelectedRecipeId(CRAFTING_RECIPES[0].id);
    }
  }, [activeTab]);

  const recipes = activeTab === "alchemy" ? ALCHEMY_RECIPES : CRAFTING_RECIPES;
  const activeRecipe =
    recipes.find((r) => r.id === selectedRecipeId) || recipes[0];

  // Helper to check if player has all ingredients
  const getIngredientStatus = (itemId: string, needed: number) => {
    const item = inventory.find((i) => i.id === itemId);
    const count = item ? item.count : 0;
    return { count, hasEnough: count >= needed };
  };

  const hasAllIngredients = activeRecipe?.ingredients.every(
    (ing) => getIngredientStatus(ing.itemId, ing.count).hasEnough,
  );

  const inventoryHasRecipeMaterials = (
    items: GameItem[],
    recipe = activeRecipe,
  ) => {
    if (!recipe) return false;
    return recipe.ingredients.every((ing) => {
      const item = items.find((i) => i.id === ing.itemId);
      return (item?.count || 0) >= ing.count;
    });
  };

  // Core refining action trigger
  const handleRefine = () => {
    if (isRefiningRef.current || refineFinishLockRef.current) return;
    if (!hasAllIngredients) {
      alert("Không đủ nguyên liệu để khởi động lò luyện!");
      return;
    }

    const reqLevel = activeRecipe.reqSkillLevel;
    const currentLevel = activeTab === "alchemy" ? alchemyLevel : craftingLevel;
    if (currentLevel < reqLevel) {
      alert(
        `Đòi hỏi cấp độ kỹ năng tối thiểu Lvl ${reqLevel} để lĩnh ngộ bí truyền này!`,
      );
      return;
    }

    setIsRefining(true);
    setRefineProgress(0);

    if (refineIntervalRef.current) clearInterval(refineIntervalRef.current);

    refineIntervalRef.current = setInterval(() => {
      setRefineProgress((prev) => {
        if (prev >= 100) {
          if (refineIntervalRef.current) {
            clearInterval(refineIntervalRef.current);
            refineIntervalRef.current = null;
          }
          finishRefine();
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  const finishRefine = () => {
    if (refineFinishLockRef.current) return;
    refineFinishLockRef.current = true;

    try {
      if (!inventoryHasRecipeMaterials(inventoryRef.current)) {
        playSound("failure");
        setIsRefining(false);
        setAutoRefine(false);
        setRefineLog((prev) => [
          `[Tá»± Ä‘á»™ng] ÄÃ£ dá»«ng: nguyÃªn liá»‡u khÃ´ng cÃ²n Ä‘á»§, khÃ´ng táº¡o váº­t pháº©m áº£o.`,
          ...prev,
        ]);
        return;
      }

      let nextInventory = inventoryRef.current;
      activeRecipe.ingredients.forEach((ing) => {
        nextInventory = removeInventoryItem(
          nextInventory,
          ing.itemId,
          ing.count,
        );
      });
      inventoryRef.current = normalizeInventoryItems(nextInventory);
      setInventory(inventoryRef.current);

      const currentLevel =
        activeTab === "alchemy" ? alchemyLevel : craftingLevel;
      const levelBonus = (currentLevel - activeRecipe.reqSkillLevel) * 0.02;
      const finalRate = Math.min(0.99, activeRecipe.successRate + levelBonus);

      const roll = Math.random();
      if (roll < finalRate) {
        playSound("success");

        const qRoll = Math.random();
        let quality: ItemQuality = "Hạ phẩm";
        let countAwarded = 1;

        if (qRoll < 0.05) {
          quality = "Cực phẩm";
          countAwarded = activeTab === "alchemy" ? 3 : 1;
        } else if (qRoll < 0.3) {
          quality = "Trung phẩm";
          countAwarded = activeTab === "alchemy" ? 2 : 1;
        }

        setInventory((prevInv) => {
          const nextInv = prevInv;

          if (activeRecipe.type === "alchemy") {
            const template = getItemTemplate(activeRecipe.resultId);
            if (template) {
              return normalizeInventoryItems(
                addInventoryItem(
                  nextInv,
                  {
                    ...template,
                    count: countAwarded,
                    quality: quality as ItemQuality,
                  } as GameItem,
                  countAwarded,
                ),
              );
            }
          } else {
            let slot: any = "weapon";
            if (activeRecipe.resultId === "phi_kiem") slot = "weapon";
            else if (activeRecipe.resultId === "ho_lo") slot = "artifact";
            else if (activeRecipe.resultId === "bao_thap") slot = "artifact";
            else if (activeRecipe.resultId === "ngoc_boi") slot = "necklace";
            else if (activeRecipe.resultId === "dong_hoang_chung")
              slot = "artifact";

            let gearRarity: any = "Lam";
            if (quality === "Cực phẩm") gearRarity = "Cam";
            else if (quality === "Trung phẩm") gearRarity = "Tím";

            const newGear = createEquipment(
              Math.random().toString(),
              `${getItemTemplate(activeRecipe.resultId)?.name || "Vật phẩm"}`,
              slot,
              gearRarity,
              player.realmIndex * 10 + player.realmLevel,
            );
            newGear.quality = quality as ItemQuality;

            return normalizeInventoryItems(
              addInventoryItem(nextInv, newGear, 1),
            );
          }

          return nextInv;
        });

        const xpGained = activeRecipe.reqSkillLevel * 15;
        if (activeTab === "alchemy") {
          const nextExp = alchemyExp + xpGained;
          const xpNeeded = alchemyLevel * 100;
          if (nextExp >= xpNeeded) {
            setAlchemyLevel(alchemyLevel + 1);
            setAlchemyExp(0);
            setRefineLog((prev) => [
              `🎉 Chúc mừng! Cấp độ Luyện Đan đã thăng lên Lvl ${alchemyLevel + 1}!`,
              ...prev,
            ]);
          } else {
            setAlchemyExp(nextExp);
          }
        } else {
          const nextExp = craftingExp + xpGained;
          const xpNeeded = craftingLevel * 100;
          if (nextExp >= xpNeeded) {
            setCraftingLevel(craftingLevel + 1);
            setCraftingExp(0);
            setRefineLog((prev) => [
              `🎉 Chúc mừng! Cấp độ Luyện Khí đã thăng lên Lvl ${craftingLevel + 1}!`,
              ...prev,
            ]);
          } else {
            setCraftingExp(nextExp);
          }
        }

        setRefineLog((prev) => [
          `✅ Luyện thành công: [${getItemTemplate(activeRecipe.resultId)?.name || "Vật phẩm"}] - Phẩm chất: ${quality}! (+${xpGained} EXP kỹ năng)`,
          ...prev,
        ]);
      } else {
        playSound("failure");
        setRefineLog((prev) => [
          `❌ Ôi không! Lò luyện thất bại, nguyên liệu bị tiêu hao một lần duy nhất.`,
          ...prev,
        ]);
      }

      setIsRefining(false);

      setTimeout(() => {
        if (autoRefineRef.current && !isRefiningRef.current) {
          const updatedRecipe =
            recipes.find((r) => r.id === selectedRecipeId) || recipes[0];
          const canContinue = inventoryHasRecipeMaterials(
            inventoryRef.current,
            updatedRecipe,
          );

          if (canContinue) {
            handleRefine();
          } else {
            setAutoRefine(false);
            setRefineLog((prev) => [
              `[Tự động] Đã dừng luyện do cạn nguyên liệu.`,
              ...prev,
            ]);
          }
        }
      }, 300);
    } finally {
      setTimeout(() => {
        refineFinishLockRef.current = false;
      }, 150);
    }
  };

  return (
    <div
      className="flex flex-col gap-4 p-4 text-stone-200"
      id="alchemy_menu_pane"
    >
      {/* Category Tabs: Alchemy vs Crafting */}
      <div className="flex border-b border-stone-800" id="tabs_bar">
        <button
          onClick={() => {
            playSound("click");
            setActiveTab("alchemy");
            setAutoRefine(false);
          }}
          className={`flex-1 py-2.5 font-bold text-xs uppercase flex items-center justify-center gap-1 border-b-2 transition-all ${
            activeTab === "alchemy"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-stone-400 hover:text-stone-300"
          }`}
          id="tab_alchemy_btn"
        >
          <Flame size={14} /> Luyện Đan Thuật
        </button>
        <button
          onClick={() => {
            playSound("click");
            setActiveTab("crafting");
            setAutoRefine(false);
          }}
          className={`flex-1 py-2.5 font-bold text-xs uppercase flex items-center justify-center gap-1 border-b-2 transition-all ${
            activeTab === "crafting"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-stone-400 hover:text-stone-300"
          }`}
          id="tab_crafting_btn"
        >
          <Layers size={14} /> Thần Binh Luyện Khí
        </button>
      </div>

      {/* Level indicators progress */}
      <div
        className="bg-stone-900 border border-stone-800 p-3 rounded-lg flex justify-between items-center text-xs text-left"
        id="skill_xp_panel"
      >
        <div>
          <p className="text-stone-400 font-medium">Cấp kỹ năng hiện tại:</p>
          <p className="text-amber-400 font-bold uppercase tracking-wider">
            {activeTab === "alchemy"
              ? `Luyện Đan Sư - Lvl ${alchemyLevel}`
              : `Luyện Khí Sư - Lvl ${craftingLevel}`}
          </p>
        </div>
        <div className="text-right font-mono" id="xp_progress_fraction">
          <p className="text-stone-500">Kinh nghiệm:</p>
          <p className="text-cyan-400 font-bold">
            {activeTab === "alchemy"
              ? `${alchemyExp}/${alchemyLevel * 100}`
              : `${craftingExp}/${craftingLevel * 100}`}{" "}
            XP
          </p>
        </div>
      </div>

      {/* Recipes & Refining Column layout */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        id="refining_panel_grid"
      >
        {/* Left Side: Recipe list selector */}
        <div className="space-y-2" id="recipe_selection_column">
          <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wide text-left">
            Sách công thức chế tạo:
          </h4>
          <div
            className="space-y-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin"
            id="recipes_list_scroll"
          >
            {recipes.map((rec) => {
              const reqLvl = rec.reqSkillLevel;
              const curLvl =
                activeTab === "alchemy" ? alchemyLevel : craftingLevel;
              const isLocked = curLvl < reqLvl;

              return (
                <button
                  key={rec.id}
                  id={`recipe_btn_${rec.id}`}
                  onClick={() => {
                    playSound("click");
                    setSelectedRecipeId(rec.id);
                    setAutoRefine(false);
                  }}
                  className={`w-full p-2.5 rounded border text-left transition-all ${
                    isLocked
                      ? "bg-stone-950 border-stone-900 text-stone-600 cursor-not-allowed"
                      : selectedRecipeId === rec.id
                        ? "bg-amber-950/20 border-amber-600 text-amber-400"
                        : "bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800"
                  }`}
                >
                  <div
                    className="flex justify-between items-center"
                    id={`recipe_item_row_${rec.id}`}
                  >
                    <span className="text-xs font-bold">{rec.name}</span>
                    {isLocked ? (
                      <span className="text-[9px] text-red-500 font-mono">
                        Y/c Lvl {reqLvl}
                      </span>
                    ) : (
                      <span className="text-[9px] text-stone-500 font-mono">
                        Tỉ lệ: {Math.round(rec.successRate * 100)}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Refining chamber, Ingredients and auto saving */}
        <div
          className="bg-stone-900 border border-stone-800 rounded-lg p-3.5 text-left space-y-3"
          id="refine_chamber_column"
        >
          <h4 className="text-xs font-bold text-amber-500 uppercase flex items-center gap-1">
            <Sparkles size={13} /> Thần khí lò luyện
          </h4>

          <div
            className="p-3 bg-stone-950 rounded border border-stone-900 text-center space-y-2"
            id="selected_recipe_meta"
          >
            <p className="text-xs font-bold text-stone-100">
              {activeRecipe?.name}
            </p>
            <p className="text-[10px] text-stone-400 leading-relaxed">
              {getItemTemplate(activeRecipe?.resultId)?.desc ||
                "Nguyên liệu rèn đúc đặc phẩm."}
            </p>

            {activeTab === "crafting" && (
              <div className="mt-2 text-[9px] text-cyan-400 border border-cyan-900/30 bg-cyan-950/20 p-2 rounded">
                <p>Chi tiết chế tạo:</p>
                <p className="text-stone-300">
                  Phẩm chất (Trắng - Cam) ngẫu nhiên. Chỉ số (Công/Thủ/HP) tăng
                  mạnh theo phẩm chất và Cảnh Giới hiện tại của ngươi.
                </p>
              </div>
            )}

            {activeTab === "alchemy" && (
              <div className="mt-2 text-[9px] text-amber-400 border border-amber-900/30 bg-amber-950/20 p-2 rounded">
                <p>Chi tiết đan dược:</p>
                <p className="text-stone-300">
                  Đan dược sẽ có công năng hỗ trợ đột phá, hoặc tăng trực tiếp
                  tu vi. Phẩm chất tốt nhất phụ thuộc vào cấp Luyện Đan.
                </p>
              </div>
            )}
          </div>

          {/* List ingredients checklist */}
          <div className="space-y-1.5" id="ingredients_checklist">
            <p className="text-[10px] text-stone-500 font-bold uppercase">
              Yêu cầu nguyên vật liệu thảo quặng:
            </p>

            <div className="space-y-1" id="ingredients_list_wrapper">
              {activeRecipe?.ingredients.map((ing) => {
                const status = getIngredientStatus(ing.itemId, ing.count);
                const itemName =
                  getItemTemplate(ing.itemId)?.name || "Vật liệu";
                return (
                  <div
                    key={ing.itemId}
                    className="flex justify-between items-center text-xs p-1.5 bg-stone-950/50 rounded border border-stone-900"
                    id={`ing_row_${ing.itemId}`}
                  >
                    <span className="text-stone-300 flex items-center gap-1">
                      • {itemName}
                    </span>
                    <span
                      className={`font-mono font-bold text-[11px] ${status.hasEnough ? "text-green-400" : "text-red-400"}`}
                    >
                      {status.count} / {ing.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress bar and active button */}
          <div className="space-y-2 pt-2" id="refining_trigger_panel">
            {isRefining && (
              <div className="space-y-1" id="refine_progress_holder">
                <div
                  className="w-full h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800"
                  id="progress_meter"
                >
                  <div
                    className="bg-amber-500 h-full transition-all duration-100"
                    style={{ width: `${refineProgress}%` }}
                  />
                </div>
                <p className="text-[9px] text-amber-500 font-mono text-center">
                  Đang đốt lửa nung luyện đan khí... {refineProgress}%
                </p>
              </div>
            )}

            {/* Auto refine checkbox */}
            <div
              className="flex items-center gap-1.5 px-0.5 py-1"
              id="auto_refine_toggle"
            >
              <input
                type="checkbox"
                id="checkbox_auto_refine"
                checked={autoRefine}
                onChange={(e) => setAutoRefine(e.target.checked)}
                className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-0 focus:ring-offset-0"
              />
              <label
                htmlFor="checkbox_auto_refine"
                className="text-[11px] text-stone-400 cursor-pointer font-medium select-none"
              >
                🔁 Tự động lặp lại (Auto-refine cho đến khi cạn dược)
              </label>
            </div>

            <button
              onClick={handleRefine}
              disabled={isRefining || !hasAllIngredients}
              className={`w-full py-2.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                hasAllIngredients && !isRefining
                  ? "bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
                  : "bg-stone-950 border border-stone-800 text-stone-600 cursor-not-allowed"
              }`}
            >
              🔥 KHỞI ĐỘNG LỰA LÒ LUYỆN
            </button>
          </div>
        </div>
      </div>

      {/* Craft Logs / Luyện Chế Thống Kê */}
      <div
        className="bg-stone-900 border border-stone-800 p-3 rounded-lg text-left"
        id="alchemy_log_box"
      >
        <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
          Nhật ký Lò Luyện:
        </h4>
        <div
          className="mt-1.5 h-28 overflow-y-auto font-mono text-[9px] text-stone-400 space-y-1 bg-stone-950 p-2 rounded border border-stone-900 scrollbar-thin"
          id="alchemy_log_list"
        >
          {refineLog.length === 0 ? (
            <p className="text-stone-600 text-center py-8">
              Chưa có mẻ đan dược hay kỳ kiếm nào được đúc xuất xưởng trong
              phiên này.
            </p>
          ) : (
            refineLog.map((log, idx) => (
              <p
                key={idx}
                className="leading-relaxed border-b border-stone-900 pb-1 last:border-0"
              >
                {log}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
