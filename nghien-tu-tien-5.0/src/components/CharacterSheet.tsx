/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PlayerCharacter, GameItem, EquipmentSlot, ItemRarity, BaseStats, Skill } from '../types';
import {
  REALMS,
  createEquipment,
  playSound,
  getEnhancedStatsBonus,
  getConsumableBonus,
  consumableCultivationBase,
  ITEM_QUALITY_MULTIPLIER,
  getRarityMultiplier 
} from "../utils/gameData";
import { getItemStackKey } from '../utils/inventory';
import { Shield, Sparkles, User, Hammer, Trash2, ArrowUpCircle, BookOpen, AlertCircle, Edit, Check, Minus, Plus } from 'lucide-react';
import { useConfirm } from "./ConfirmProvider";
import CharacterPortraitStudio from './CharacterPortraitStudio';
import { ITEM_DATABASE } from "../data/items";

interface CharacterSheetProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
  skills?: Skill[];
  setSkills?: React.Dispatch<React.SetStateAction<Skill[]>>;
  onUpdateStats: () => void;
}

export default function CharacterSheet({
  player,
  setPlayer,
  inventory,
  setInventory,
  skills = [],
  setSkills,
  onUpdateStats
}: CharacterSheetProps) {
  const confirm = useConfirm(); // phải ở đây
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(player.name);
  const [showTribulation, setShowTribulation] = useState(false);
  const [breakthroughStatus, setBreakthroughStatus] = useState<{
    msg: string;
    success?: boolean;
  } | null>(null);

  // --- NEW FORGE & SOCKETING STATE ENGINE ---
  const [sheetTab, setSheetTab] = useState<"info" | "forge" | "skills">("info");
  const [selectedForgeItem, setSelectedForgeItem] = useState<GameItem | null>(
    null,
  );
  const [selectedGemSlot, setSelectedGemSlot] = useState<number | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);

  const rarityOrder: Record<ItemRarity, number> = {
    Trắng: 1,
    Lục: 2,
    Lam: 3,
    Tím: 4,
    Cam: 5,
    Đỏ: 6,
    "Thần Thoại": 7,
    "Tiên Khí": 8,
  };

  const getFallbackSellPriceByRarity = (rarity?: ItemRarity) => {
    if (rarity === "Thần Thoại" || rarity === "Tiên Khí") return 1200;
    if (rarity === "Đỏ") return 600;
    if (rarity === "Cam") return 300;
    if (rarity === "Tím") return 150;
    if (rarity === "Lam") return 75;
    if (rarity === "Lục") return 40;
    return 20;
  };

  const getItemSellPrice = (item: GameItem) => {
    const dataSell = Number((item as any)?.price?.sell);
    if (Number.isFinite(dataSell) && dataSell >= 0) return dataSell;
    return getFallbackSellPriceByRarity(item.rarity as ItemRarity);
  };

  const getItemStackKey = (
    item?: Pick<
      GameItem,
      "id" | "rarity" | "quality" | "type" | "equipmentSlot" | "enhancementLevel"
    > | null,
  ) => {
    if (!item) return "__empty__";
    return [
      item.id,
      item.quality ?? "",
      item.rarity ?? "Trắng",
      item.type ?? "unknown",
      item.equipmentSlot ?? "",
      item.enhancementLevel ?? 0,
    ].join("::");
  };

  const sameItemStack = (
    a?: Pick<
      GameItem,
      "id" | "rarity" | "quality" | "type" | "equipmentSlot" | "enhancementLevel"
    > | null,
    b?: Pick<
      GameItem,
      "id" | "rarity" | "quality" | "type" | "equipmentSlot" | "enhancementLevel"
    > | null,
  ) => getItemStackKey(a) === getItemStackKey(b);

  const addStackItem = (items: GameItem[], incoming: GameItem, qty = 1) => {
    const next = items.map((it) => ({ ...it }));
    const idx = next.findIndex((it) => sameItemStack(it, incoming));
    if (idx >= 0) {
      next[idx] = { ...next[idx], count: next[idx].count + qty };
      return next;
    }
    next.push({ ...incoming, count: qty });
    return next;
  };

  const removeStackItem = (
    items: GameItem[],
    target: GameItem | string,
    qty = 1,
  ) => {
    const next = items.map((it) => ({ ...it }));
    let remaining = qty;

    for (let i = 0; i < next.length && remaining > 0; i += 1) {
      const current = next[i];
      const match =
        typeof target === "string"
          ? current.id === target
          : sameItemStack(current, target);
      if (!match) continue;

      const take = Math.min(current.count, remaining);
      const nextCount = current.count - take;
      remaining -= take;

      if (nextCount <= 0) {
        next.splice(i, 1);
        i -= 1;
      } else {
        next[i] = { ...current, count: nextCount };
      }
    }

    return next;
  };

  const findBestInventoryItemById = (items: GameItem[], id: string) => {
    const matches = items.filter((it) => it.id === id);
    if (matches.length === 0) return null;
    return [...matches].sort(
      (a, b) =>
        (rarityOrder[b.rarity as ItemRarity] || 0) -
        (rarityOrder[a.rarity as ItemRarity] || 0),
    )[0];
  };

  const getUpgradeCost = (item: GameItem) => {
    const level = item.enhancementLevel || 0;
    return 150 + level * 75;
  };

  const getUpgradeStoneId = (item: GameItem) => {
    const level = item.enhancementLevel || 0;
    if (level < 5) return "da_cuong_hoa";
    if (level < 10) return "da_tinh_luyen";
    return "da_dot_pha_item";
  };

  const getUpgradeSuccessRate = (item: GameItem) => {
    const level = item.enhancementLevel || 0;
    return Math.max(20, 100 - level * 6);
  };

  const handleEnhanceItem = (item: GameItem) => {
    const level = item.enhancementLevel || 0;
    if (level >= 15) {
      alert("Trang bị này đã đạt cấp cường hóa tối đa +15!");
      return;
    }

    const stoneId = getUpgradeStoneId(item);
    const cost = getUpgradeCost(item);

    if (player.spiritStones < cost) {
      alert(`Đạo hữu cần ${cost} Linh thạch để thực hiện rèn đúc!`);
      return;
    }

    const stoneItem = inventory.find((i) => i.id === stoneId && i.count > 0);
    if (!stoneItem) {
      const stoneName =
        stoneId === "da_cuong_hoa"
          ? "Đá Cường Hóa"
          : stoneId === "da_tinh_luyen"
            ? "Đá Tinh Luyện"
            : "Đá Đột Phá";
      alert(
        `Ngươi không có ${stoneName} để thăng phẩm! Hãy mua tại Cửa Hàng Hệ Thống.`,
      );
      return;
    }

    // Deduct stone count
    setInventory((prev) => removeStackItem(prev, stoneId, 1));

    // Deduct spirit stones
    setPlayer((prev) => ({
      ...prev,
      spiritStones: prev.spiritStones - cost,
    }));

    // Success Roll
    const rate = getUpgradeSuccessRate(item);
    const roll = Math.random() * 100;
    const isSuccess = roll <= rate;

    if (isSuccess) {
      playSound("success");
      const nextLevel = level + 1;

      const updateItemProperties = (target: GameItem): GameItem => {
        const baseStatsBonus = target.baseStatsBonus || target.statsBonus || {};
        const updated = {
          ...target,
          baseStatsBonus,
          enhancementLevel: nextLevel,
        };
        return {
          ...updated,
          statsBonus: getEnhancedStatsBonus(updated),
        };
      };

      // If item is equipped, update player.equippedItems
      const equippedSlotEntry = Object.entries(player.equippedItems).find(
        ([, eq]) => eq && sameItemStack(eq, item),
      );
      if (equippedSlotEntry) {
        const slotKey = equippedSlotEntry[0] as EquipmentSlot;
        setPlayer((prev) => ({
          ...prev,
          equippedItems: {
            ...prev.equippedItems,
            [slotKey]: updateItemProperties(prev.equippedItems[slotKey]!),
          },
        }));
      } else {
        // Update in inventory
        setInventory((prev) =>
          prev.map((i) =>
            sameItemStack(i, item) ? updateItemProperties(i) : i,
          ),
        );
      }

      // Sync active view item
      setSelectedForgeItem((prev) =>
        prev ? updateItemProperties(prev) : null,
      );
      alert(
        `🎉 CƯỜNG HÓA THÀNH CÔNG!\n\nChúc mừng đạo hữu rèn đúc thành công ${item.name} lên +${nextLevel}!`,
      );
    } else {
      playSound("failure");
      alert(
        `⚡ RÈN ĐÚC THẤT BẠI!\n\nLôi hỏa bộc phát đột ngột phá hủy kết giới lò! Hao tổn 1x nguyên liệu rèn cùng ${cost} Linh thạch.`,
      );
    }

    setTimeout(() => onUpdateStats(), 50);
  };

  const handleSocketGem = (
    item: GameItem,
    slotIndex: number,
    gemId: string,
  ) => {
    const gemItem = inventory.find((i) => i.id === gemId && i.count > 0);
    if (!gemItem) {
      alert("Không đủ Linh ngọc tương thích trong túi hành trang!");
      return;
    }

    playSound("success");

    // Deduct 1 gem from inventory
    setInventory((prev) => removeStackItem(prev, gemId, 1));

    const updateItemProperties = (target: GameItem): GameItem => {
      const currentSlots = target.gemSlots
        ? [...target.gemSlots]
        : [{ filled: false }, { filled: false }, { filled: false }];
      while (currentSlots.length < 3) {
        currentSlots.push({ filled: false });
      }
      currentSlots[slotIndex] = {
        filled: true,
        gemName: gemItem.name,
        bonus:
          gemId === "hong_ngoc"
            ? "Công +50"
            : gemId === "lam_ngoc"
              ? "HP +300"
              : gemId === "tu_ngoc"
                ? "Bạo +8%"
                : "Công +80, HP +500",
      };
      return {
        ...target,
        gemSlots: currentSlots,
      };
    };

    // If item is equipped
    const equippedSlotEntry = Object.entries(player.equippedItems).find(
      ([, eq]) => eq && sameItemStack(eq, item),
    );
    if (equippedSlotEntry) {
      const slotKey = equippedSlotEntry[0] as EquipmentSlot;
      setPlayer((prev) => ({
        ...prev,
        equippedItems: {
          ...prev.equippedItems,
          [slotKey]: updateItemProperties(prev.equippedItems[slotKey]!),
        },
      }));
    } else {
      setInventory((prev) =>
        prev.map((i) => (sameItemStack(i, item) ? updateItemProperties(i) : i)),
      );
    }

    setSelectedForgeItem((prev) => (prev ? updateItemProperties(prev) : null));
    setSelectedGemSlot(null);

    alert(
      `🔴 KHẢM LINH NGỌC THÀNH CÔNG!\n\nĐã khảm nạm thành công ${gemItem.name} trợ lực linh căn võ khí!`,
    );
    setTimeout(() => onUpdateStats(), 50);
  };

  const handleUnsocketGem = (item: GameItem, slotIndex: number) => {
    const slots = item.gemSlots ? [...item.gemSlots] : [];
    const slot = slots[slotIndex];
    if (!slot || !slot.filled || !slot.gemName) return;

    playSound("success");
    const gemName = slot.gemName;
    let gemId = "hong_ngoc";
    if (gemName.includes("Lam Ngọc")) gemId = "lam_ngoc";
    else if (gemName.includes("Tử Ngọc")) gemId = "tu_ngoc";
    else if (gemName.includes("Tiên Ngọc Gem")) gemId = "tien_ngoc_gem";

    // Put gem back to inventory
    const newGem: GameItem = {
      id: gemId,
      name: gemName,
      type: "gem",
      rarity: "Cam",
      desc: "Linh bảo khảm nạm bổ trợ cực phẩm.",
      count: 1,
    };

    setInventory((prev) => addStackItem(prev, newGem, 1));

    const updateItemProperties = (target: GameItem): GameItem => {
      const currentSlots = target.gemSlots
        ? [...target.gemSlots]
        : [{ filled: false }, { filled: false }, { filled: false }];
      currentSlots[slotIndex] = { filled: false };
      return {
        ...target,
        gemSlots: currentSlots,
      };
    };

    // If item is equipped
    const equippedSlotEntry = Object.entries(player.equippedItems).find(
      ([, eq]) => eq && sameItemStack(eq, item),
    );
    if (equippedSlotEntry) {
      const slotKey = equippedSlotEntry[0] as EquipmentSlot;
      setPlayer((prev) => ({
        ...prev,
        equippedItems: {
          ...prev.equippedItems,
          [slotKey]: updateItemProperties(prev.equippedItems[slotKey]!),
        },
      }));
    } else {
      setInventory((prev) =>
        prev.map((i) => (sameItemStack(i, item) ? updateItemProperties(i) : i)),
      );
    }

    setSelectedForgeItem((prev) => (prev ? updateItemProperties(prev) : null));
    alert(
      `✨ THÁO NGỌC THÀNH CÔNG!\n\nThu hồi hoàn hảo 1x ${gemName} về túi đồ của ngươi.`,
    );
    setTimeout(() => onUpdateStats(), 50);
  };

  // Equipment slots
  const slotsList: { slot: EquipmentSlot; name: string }[] = [
    { slot: "weapon", name: "Vũ khí" },
    { slot: "head", name: "Mũ/Nón" },
    { slot: "armor", name: "Linh Giáp" },
    { slot: "boots", name: "Hài Di Thần" },
    { slot: "ring", name: "Nhẫn Không Gian" },
    { slot: "necklace", name: "Dây Chuyền" },
    { slot: "artifact", name: "Pháp Bảo" },
    { slot: "wings", name: "Cánh Tiên" },
  ];

  // Helper stats labels
  const statsLabels: {
    key: keyof BaseStats;
    label: string;
    desc: string;
    isPct?: boolean;
  }[] = [
    {
      key: "hp",
      label: "Sinh lực (HP)",
      desc: "Sinh mệnh hiện tại / tối đa của bản thân",
    },
    {
      key: "mana",
      label: "Linh lực (MP)",
      desc: "Linh lực dồi dào dùng thi triển thần thông pháp học",
    },
    {
      key: "atk",
      label: "Sát Thương (Công)",
      desc: "Lực sát thương cốt lõi gây lên kẻ thù dã ngoại",
    },
    {
      key: "def",
      label: "Phòng Thủ (Thủ)",
      desc: "Giảm trực tiếp sát thương sát cốt nhận vào",
    },
    {
      key: "atkSpeed",
      label: "Tốc độ đánh",
      desc: "Tần suất dội quyền ra kiếm mỗi giây",
      isPct: true,
    },
    {
      key: "evasion",
      label: "Né tránh (%)",
      desc: "Tỉ lệ né tránh hoàn toàn đòn bạo kích của địch",
      isPct: true,
    },
    {
      key: "crit",
      label: "Tỉ lệ Bạo Kích (%)",
      desc: "Khả năng xuất hiện sát thương chí mạng nhân bội",
      isPct: true,
    },
    {
      key: "critDamage",
      label: "ST Chí Mạng",
      desc: "Lượng sát thương bạo kích được bồi thêm",
      isPct: true,
    },
    {
      key: "resistance",
      label: "Kháng thuộc tính (%)",
      desc: "Giảm thiểu hiệu ứng độc, lôi tà ám muội",
      isPct: true,
    },
    {
      key: "movementSpeed",
      label: "Tốc độ chạy",
      desc: "Tốc di chuyển vượt dã ngoại và bí cảnh dồn dập",
    },
    {
      key: "penetration",
      label: "Xuyên giáp (%)",
      desc: "Bỏ qua một phần phòng ngự của kẻ thù tôn tộc",
      isPct: true,
    },
    {
      key: "lifesteal",
      label: "Hút máu (%)",
      desc: "Hồi phục sinh lực dựa trên sát thương gây ra",
      isPct: true,
    },
    {
      key: "cooldownReduction",
      label: "Giảm hồi chiêu (%)",
      desc: "Thời gian tĩnh tâm chờ kỹ năng dồn dập nhanh hơn",
      isPct: true,
    },
    {
      key: "block",
      label: "Đỡ đòn (%)",
      desc: "Cản đỡ trực tiếp một nửa sát thương bạo cường",
      isPct: true,
    },
  ];

  const inferEquipmentSlot = (item: GameItem): EquipmentSlot | null => {
    if (item.equipmentSlot) return item.equipmentSlot;
    const hay = `${item.id} ${item.name}`.toLowerCase();
    if (
      hay.includes("kiem") ||
      hay.includes("dao") ||
      hay.includes("sword") ||
      hay.includes("blade")
    )
      return "weapon";
    if (hay.includes("mu") || hay.includes("non") || hay.includes("hat"))
      return "head";
    if (
      hay.includes("giap") ||
      hay.includes("ao") ||
      hay.includes("robe") ||
      hay.includes("armor")
    )
      return "armor";
    if (
      hay.includes("giay") ||
      hay.includes("hài") ||
      hay.includes("boots") ||
      hay.includes("phi_phong")
    )
      return "boots";
    if (hay.includes("nhan") || hay.includes("ring")) return "ring";
    if (hay.includes("day_chuyen") || hay.includes("necklace"))
      return "necklace";
    if (hay.includes("can") || hay.includes("wing")) return "wings";
    return "artifact";
  };

  // Handle Equipment change
  const handleEquipItem = (item: GameItem) => {
    if (item.type !== "equipment" && item.type !== "artifact") return;
    const slot = inferEquipmentSlot(item);
    if (!slot) return;

    playSound("click");

    // Remove from inventory
    let updatedInv = removeStackItem(inventory, item, 1);

    // If already has equipped item in slot, unequip and put back to inventory
    const currentlyEquipped = player.equippedItems[slot];
    if (currentlyEquipped) {
      updatedInv = addStackItem(
        updatedInv,
        { ...currentlyEquipped, count: 1 } as GameItem,
        1,
      );
    }

    setInventory(updatedInv);
    setPlayer((prev) => {
      const nextEquipped = {
        ...prev.equippedItems,
        [slot]: { ...item, count: 1 },
      };
      return {
        ...prev,
        equippedItems: nextEquipped,
      };
    });

    // setTimeout(() => onUpdateStats(), 50);
  };

  const handleUnequipItem = (slot: EquipmentSlot) => {
    const currentlyEquipped = player.equippedItems[slot];
    if (!currentlyEquipped) return;

    playSound("click");

    setInventory((prev) =>
      addStackItem(prev, { ...currentlyEquipped, count: 1 } as GameItem, 1),
    );

    setPlayer((prev) => {
      const nextEquipped = { ...prev.equippedItems, [slot]: null };
      return {
        ...prev,
        equippedItems: nextEquipped,
      };
    });

    // setTimeout(() => onUpdateStats(), 50);
  };

  // --- TRUNG THỰC INVENTORY SYSTEM HOOKS ---
  const [bagTab, setBagTab] = useState<
    "all" | "equipment" | "consumables" | "herbs" | "materials"
  >("all");
  const [selectedBagItem, setSelectedBagItem] = useState<GameItem | null>(null);

  const refreshSelectedBagItem = (
    targetId: string,
    nextInventory: GameItem[],
  ) => {
    const stillExists =
      typeof targetId === "string"
        ? nextInventory.find((i) => i.id === targetId)
        : nextInventory.find((i) => sameItemStack(i, targetId));
    if (stillExists) {
      setSelectedBagItem(stillExists);
    } else {
      setSelectedBagItem(null);
    }
  };

  useEffect(() => {
    setSellQuantity((prev) => {
      if (!selectedBagItem) return 1;
      return Math.max(1, Math.min(prev, selectedBagItem.count));
    });
  }, [selectedBagItem]);

  // Consume đan dược
  const handleUseConsumable = (item: GameItem) => {
    if (item.count <= 0) return;
    playSound("success");

    const rarityScale = getRarityMultiplier(item.rarity);

    let nextSelectedCount = item.count - 1;
    let bonusCultivation = 0;
    let restoreHp = false;
    let msg = "";

    const isCultivationDan = [
      "tu_khi_dan",
      "truc_co_dan",
      "kim_dan_dan",
      "nguyen_anh_dan",
      "hoa_than_dan",
      "tien_linh_dan",
    ].includes(item.id);

    if (isCultivationDan) {
      bonusCultivation = getConsumableBonus(item);
      msg = `💊 Nuốt chửng ${item.name} (${(item as any).quality ?? "Hạ phẩm"})! Nhận +${bonusCultivation.toLocaleString()} Tu vi!`;
    } else if (item.id === "hoi_huyet_dan" || item.id === "sinh_co_dan") {
      restoreHp = true;
      msg = `🩸 Nuốt chửng đan dược, HP hồi phục 100%!`;
    } else if (item.id === "ve_quay_thuong") {
      msg = `🎟️ Vé Quay Thưởng phẩm chất ${item.rarity} được dùng ở Cửa hàng -> Vòng quay.`;
    } else if (item.id === "ngo_dao_tra") {
      msg = `🍵 Ngộ Đạo Trà phẩm chất ${item.rarity}: tốc độ ngộ đạo tăng +${Math.round(10 * rarityScale)}% vĩnh viễn!`;
    } else {
      msg = `📦 Sử dụng thành công ${item.name} (${item.rarity})!`;
    }

    setInventory((prev) => {
      const nextInv = removeStackItem(prev, item, 1);
      refreshSelectedBagItem(item, nextInv);
      return nextInv;
    });

    if (item.id === "ngo_dao_tra") {
      setPlayer((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          xpRate: (prev.stats.xpRate || 1) + 0.1 * rarityScale,
        },
      }));
    } else {
      setPlayer((prev) => ({
        ...prev,
        cultivation: prev.cultivation + bonusCultivation,
        stats: {
          ...prev.stats,
          hp: restoreHp ? prev.stats.maxHp : prev.stats.hp,
        },
      }));
    }

    alert(msg);

    if (nextSelectedCount <= 0) {
      setSelectedBagItem(null);
    } else {
      setSelectedBagItem({
        ...item,
        count: nextSelectedCount,
      });
    }
  };

  // Sell item for spirit stones
  const handleSellItem = async (item: GameItem, qtyOverride?: number) => {
    const itemData = ITEM_DATABASE[item.id];
    // hoặc ITEM_DATA[item.id]
    if (item.count <= 0) return;
    playSound("success");

    const sellPrice = itemData?.price?.sell ?? 0;
    const qualityMul = ITEM_QUALITY_MULTIPLIER[item.quality ?? "Hạ phẩm"] ?? 1;
    const qty = Math.max(1, Math.min(item.count, qtyOverride ?? sellQuantity));
    const total = Math.round(sellPrice * qty * qualityMul);

    const ok = await confirm({
      title: "Bán vật phẩm",
      message: `Bán ${qty}x ${item.name} (${item.rarity}) với giá ${total} Linh thạch?`,
    });

    if (!ok) return;

    setInventory((prev) => {
      const nextInv = removeStackItem(prev, item, qty);
      refreshSelectedBagItem(item, nextInv);
      return nextInv;
    });

    setPlayer((prev) => ({
      ...prev,
      spiritStones: prev.spiritStones + total,
    }));

    setSellQuantity(1);
    alert(
      `💰 Đã bán ${qty}x ${item.name} (${item.rarity}), nhận +${total} Linh thạch.`,
    );
  };

  // Change character name using "Vé Đổi Tên"
  const handleRename = () => {
    if (!newName.trim()) return;

    // Check if player has Name Changer item
    const renameTicket = inventory.find((i) => i.id === "ve_doi_ten");
    if (!renameTicket || renameTicket.count < 1) {
      alert('Ngươi không có "Vé Đổi Tên"! Hãy mua tại Hệ thống cửa hàng.');
      return;
    }

    playSound("success");

    // Deduct ticket
    setInventory((prev) => removeStackItem(prev, "ve_doi_ten", 1));

    setPlayer((prev) => ({
      ...prev,
      name: newName.trim(),
    }));

    setIsEditingName(false);
  };

  // Cảnh Giới Breakthrough (Đột Phá) Mechanics
  const canBreakthrough = player.cultivation >= player.cultivationNeeded;

  const handleBreakthrough = () => {
    if (player.cultivation < player.cultivationNeeded) {
      setBreakthroughStatus({
        msg: "Tu vi của ngươi chưa đủ chín muồi để đột phá cảnh giới!",
      });
      return;
    }

    // Success rate formula (drops slightly as realms increase)
    // Base is 95% at Luyện Khí and drops down to 30% at high realms
    const baseRate = Math.max(0.3, 0.95 - player.realmIndex * 0.05);

    // Check if player has helper breakthrough items in inventory
    // 1. Breakthrough Pills (Trúc Cơ Đan for realm 0, Kim Đan Đan for 1, etc.)
    let pillId = "tu_khi_dan";
    if (player.realmIndex === 0) pillId = "truc_co_dan";
    else if (player.realmIndex === 1) pillId = "kim_dan_dan";
    else if (player.realmIndex === 2) pillId = "nguyen_anh_dan";
    else if (player.realmIndex === 3) pillId = "hoa_than_dan";
    else if (player.realmIndex >= 4) pillId = "do_kiep_dan";

    const hasPill = findBestInventoryItemById(inventory, pillId);
    const hasHophu = findBestInventoryItemById(inventory, "ho_phu_do_kiep");

    // Add bonuses
    let finalRate = baseRate;
    if (hasPill && hasPill.count > 0)
      finalRate += 0.15 * getRarityMultiplier(hasPill.rarity);
    if (hasHophu && hasHophu.count > 0)
      finalRate += 0.2 * getRarityMultiplier(hasHophu.rarity);

    finalRate = Math.min(1.0, finalRate);
    const roll = Math.random();

    if (roll < finalRate) {
      // SUCCESS!
      playSound("success");

      // Consume breakthrough pill & guardian amulet if exists
      setInventory((prev) => {
        let next = removeStackItem(prev, pillId, 1);
        next = removeStackItem(next, "ho_phu_do_kiep", 1);
        return next;
      });

      let isMajorBreakthrough = false;

      setPlayer((prev) => {
        let nextLvl = prev.realmLevel + 1;
        let nextIdx = prev.realmIndex;
        if (nextLvl > 10) {
          nextLvl = 1;
          nextIdx = Math.min(REALMS.length - 1, prev.realmIndex + 1);
          if (nextIdx > prev.realmIndex) {
            isMajorBreakthrough = true;
          }
        }

        // Boost core stats permanently
        const statMultiplier = 1.25;
        const nextStats = {
          ...prev.stats,
          maxHp: Math.round(prev.stats.maxHp * statMultiplier),
          hp: Math.round(prev.stats.maxHp * statMultiplier),
          maxMana: Math.round(prev.stats.maxMana * statMultiplier),
          mana: Math.round(prev.stats.maxMana * statMultiplier),
          atk: Math.round(prev.stats.atk * statMultiplier),
          def: Math.round(prev.stats.def * statMultiplier),
          crit: Math.min(50, prev.stats.crit + 1),
          evasion: Math.min(30, prev.stats.evasion + 1),
        };

        // Next needed experience (increases geometrically)
        const nextNeeded = Math.round(
          1000 * Math.pow(2.8, nextIdx) * (1 + nextLvl * 0.2),
        );

        return {
          ...prev,
          realmLevel: nextLvl,
          realmIndex: nextIdx,
          cultivation: Math.max(0, prev.cultivation - prev.cultivationNeeded), // Carry over leftover experience
          cultivationNeeded: nextNeeded,
          progressionStats: {
            ...((prev as any).progressionStats || {}),
            maxHp:
              ((prev as any).progressionStats?.maxHp || 0) +
              Math.round(prev.stats.maxHp * 0.25),
            atk:
              ((prev as any).progressionStats?.atk || 0) +
              Math.round(prev.stats.atk * 0.25),
            def:
              ((prev as any).progressionStats?.def || 0) +
              Math.round(prev.stats.def * 0.25),
          },
          stats: nextStats,
        };
      });

      if (isMajorBreakthrough) {
        setShowTribulation(true);
        setTimeout(() => setShowTribulation(false), 4000);
      }

      setBreakthroughStatus({
        msg: `🎉 Chúc mừng! Ngươi đã Nghịch Thiên Đột Phá thành công lên [${REALMS[player.realmIndex]} - Tầng ${player.realmLevel + 1 > 10 ? 1 : player.realmLevel + 1}]!`,
        success: true,
      });
      setTimeout(() => onUpdateStats(), 50);
    } else {
      // FAILURE
      playSound("failure");

      // Check if player has "Cửu Chuyển Tiên Đan" or safety check
      const hasSafety = findBestInventoryItemById(
        inventory,
        "cuu_chuyen_tien_dan",
      );
      let penaltyLoss = Math.round(player.cultivation * 0.5); // lose 50% cultivation

      if (hasSafety && hasSafety.count > 0) {
        penaltyLoss = 0; // Protected!
        setInventory((prev) => removeStackItem(prev, "cuu_chuyen_tien_dan", 1));
        setBreakthroughStatus({
          msg: `❌ Đột phá THẤT BẠI! Lôi Kiếp cực mạnh đánh rách kinh mạch, nhưng Cửu Chuyển Tiên Đan đã kích hoạt bảo vệ an toàn cho tu vi của ngươi!`,
          success: false,
        });
      } else {
        setInventory((prev) => {
          let next = removeStackItem(prev, pillId, 1);
          next = removeStackItem(next, "ho_phu_do_kiep", 1);
          return next;
        });

        setPlayer((prev) => ({
          ...prev,
          cultivation: Math.max(0, prev.cultivation - penaltyLoss),
        }));

        setBreakthroughStatus({
          msg: `❌ Đột phá THẤT BẠI! Thiên địa lôi điện bạo bùng làm tổn hao gân cốt. Khấu trừ ${penaltyLoss} tu vi tích lũy.`,
          success: false,
        });
      }
    }
  };

  // Check if player has Name Changer item
  const renameTicket = inventory.find((i) => i.id === "ve_doi_ten");

  return (
    <div
      className="flex flex-col gap-4 p-4 text-stone-200"
      id="character_sheet_pane"
    >
      {/* Tribulation Fullscreen Animation */}
      {showTribulation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-blue-900/20 animate-pulse"></div>
          {/* Lightning strikes */}
          <div className="absolute w-2 h-full bg-cyan-200 left-[30%] rotate-[15deg] opacity-0 animate-[flash_2s_ease-in-out_infinite_0.1s] shadow-[0_0_40px_10px_#0ff]"></div>
          <div className="absolute w-3 h-full bg-white left-[50%] -rotate-[5deg] opacity-0 animate-[flash_2s_ease-in-out_infinite_0.5s] shadow-[0_0_50px_20px_#fff]"></div>
          <div className="absolute w-2 h-full bg-blue-300 left-[70%] rotate-[20deg] opacity-0 animate-[flash_2s_ease-in-out_infinite_0.9s] shadow-[0_0_40px_10px_#00f]"></div>

          <div className="relative z-10 flex flex-col items-center justify-center animate-bounce">
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)] tracking-widest uppercase">
              ĐỘ KIẾP THÀNH CÔNG
            </h1>
            <p className="mt-4 text-xl font-bold text-stone-200 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              Phá Toái Hư Không - Đạp Tiên Lộ
            </p>
          </div>
          <style>{`
            @keyframes flash {
              0% { opacity: 0; }
              10% { opacity: 1; }
              20% { opacity: 0; }
              30% { opacity: 1; }
              40% { opacity: 0; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Sub-tab Swapping Bar */}
      <div
        className="flex bg-stone-950 rounded-xl p-1 border border-stone-850"
        id="sheet_tab_bar"
      >
        <button
          onClick={() => {
            playSound("click");
            setSheetTab("info");
          }}
          className={`flex-1 py-2 text-xs font-black uppercase rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            sheetTab === "info"
              ? "bg-amber-600 text-stone-950 font-black shadow"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          ⚖️ THÔNG TIN & HÀNH TRANG
        </button>
        <button
          onClick={() => {
            playSound("click");
            setSheetTab("forge");
            setSelectedForgeItem(null);
          }}
          className={`flex-1 py-2 text-xs font-black uppercase rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            sheetTab === "forge"
              ? "bg-amber-600 text-stone-950 font-black shadow"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          🔥 LÒ RÈN & KHẢM LINH NGỌC
        </button>
        <button
          onClick={() => {
            playSound("click");
            setSheetTab("skills");
          }}
          className={`flex-1 py-2 text-xs font-black uppercase rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            sheetTab === "skills"
              ? "bg-amber-600 text-stone-950 font-black shadow"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          📜 KỸ NĂNG TÔNG MÔN
        </button>
      </div>

      {sheetTab === "info" && (
        <>
          {/* Upper info: Identity Card */}
          <div
            className="bg-stone-900 border border-amber-900/40 rounded-lg p-3.5 shadow-lg relative overflow-hidden"
            id="identity_card"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-start gap-4" id="identity_content">
              <div
                className="w-16 h-16 rounded-full bg-stone-800 border-2 border-amber-600/60 flex items-center justify-center relative shadow-inner"
                id="avatar_host"
              >
                <User
                  size={30}
                  className={
                    player.gender === "Nam" ? "text-blue-400" : "text-pink-400"
                  }
                />
                <span className="absolute -bottom-1 bg-amber-600 text-[9px] text-stone-950 font-bold px-1 rounded font-sans uppercase">
                  {player.gender}
                </span>
              </div>

              <div className="flex-1 space-y-1" id="name_info">
                <div
                  className="flex items-center gap-1.5"
                  id="name_changer_field"
                >
                  {isEditingName ? (
                    <div className="flex items-center gap-1" id="editing_box">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        maxLength={15}
                        className="bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 text-xs text-white max-w-[120px] focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={handleRename}
                        className="p-1 text-green-400 hover:text-green-300 active:scale-90"
                        title="Xác nhận"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold text-stone-100">
                        {player.name}
                      </h3>
                      {renameTicket && renameTicket.count > 0 && (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="p-1 text-amber-500/70 hover:text-amber-400 active:scale-90"
                          title="Sử dụng Vé Đổi Tên"
                        >
                          <Edit size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>

                <p className="text-[10px] text-stone-400">
                  Khởi đầu:{" "}
                  <span className="text-amber-500/90 font-medium">
                    {player.origin}
                  </span>
                </p>
                <p
                  className="text-xs flex items-center gap-1 font-semibold text-cyan-400"
                  id="realm_indicator"
                >
                  Cảnh giới:{" "}
                  <span>
                    {REALMS[player.realmIndex]} - Tầng {player.realmLevel}/10
                  </span>
                </p>
              </div>
            </div>
          </div>

          <CharacterPortraitStudio player={player} setPlayer={setPlayer} />

          {/* Breakthrough / Đột Phá Cảnh Giới Panel */}
          <div
            className="bg-stone-900 border border-cyan-900/30 rounded-lg p-3.5 space-y-3"
            id="breakthrough_panel"
          >
            <div
              className="flex justify-between items-center"
              id="break_header"
            >
              <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1 uppercase">
                <ArrowUpCircle size={14} /> Tu luyện Đột phá Cảnh giới
              </h4>
              <span className="text-[10px] bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 text-cyan-300 rounded font-mono">
                {Math.round(
                  (player.cultivation / player.cultivationNeeded) * 100,
                )}
                %
              </span>
            </div>

            {/* Exp Progress Bar */}
            <div className="space-y-1" id="exp_meter">
              <div
                className="w-full h-2.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800"
                id="meter_bar"
              >
                <div
                  className="bg-cyan-500 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (player.cultivation / player.cultivationNeeded) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-stone-400 font-mono text-right">
                Tu vi: {player.cultivation.toLocaleString()} /{" "}
                {player.cultivationNeeded.toLocaleString()}
              </p>
            </div>

            {/* Breakthrough button */}
            <div className="space-y-2" id="breakthrough_action">
              <button
                onClick={handleBreakthrough}
                className={`w-full py-2.5 rounded text-xs font-bold transition-all ${
                  canBreakthrough
                    ? "bg-cyan-600 hover:bg-cyan-500 text-stone-950 shadow-md shadow-cyan-500/20 active:scale-98 cursor-pointer"
                    : "bg-stone-950 border border-stone-800 text-stone-600 cursor-not-allowed"
                }`}
              >
                {canBreakthrough
                  ? "⚡ KHỞI ĐỘNG ĐỘT PHÁ CẢNH GIỚI"
                  : "CHƯA ĐỦ TU VI ĐỂ ĐỘT PHÁ"}
              </button>

              {breakthroughStatus && (
                <div
                  className={`p-2 rounded text-[10px] border flex gap-1.5 ${
                    breakthroughStatus.success === true
                      ? "bg-green-950/20 border-green-800/40 text-green-300"
                      : breakthroughStatus.success === false
                        ? "bg-red-950/20 border-red-900/30 text-red-300"
                        : "bg-stone-950 border-stone-800 text-stone-300"
                  }`}
                  id="breakthrough_result_note"
                >
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <p>{breakthroughStatus.msg}</p>
                </div>
              )}
            </div>

            {/* Information help about chances */}
            <div
              className="bg-stone-950 p-2 rounded text-[10px] text-stone-400 space-y-1"
              id="break_tips"
            >
              <p className="text-amber-500/90 font-medium flex items-center gap-1">
                <Sparkles size={10} /> Mẹo Nghịch Thiên:
              </p>
              <p>
                • Đột phá có tỉ lệ thất bại. Thất bại sẽ bị phạt trừ 15% tu vi
                tích lũy.
              </p>
              <p>
                • Mang theo <b>Hộ Phù Độ Kiếp (+20% tỉ lệ)</b> hoặc đan dược đột
                phá cảnh giới tương thích để gia tăng tỉ lệ đột phá thành công.
              </p>
              <p>
                • Sử dụng <b>Cửu Chuyển Tiên Đan</b> giúp bảo lưu 100% tu vi an
                toàn khi lôi kiếp bạo phát thất bại.
              </p>
            </div>
          </div>

          {/* Equipment Slots and Equipped stats Grid */}
          <div className="grid grid-cols-2 gap-4" id="gear_stats_grid">
            {/* Left Side: Equipped items slots */}
            <div className="space-y-2" id="equipment_column">
              <h4 className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-1">
                <Hammer size={12} /> Pháp bảo & Giáp mặc
              </h4>
              <div className="space-y-1.5" id="equipped_slots_list">
                {slotsList.map(({ slot, name }) => {
                  const item = player.equippedItems[slot];
                  return (
                    <div
                      key={slot}
                      className={`p-2 rounded border text-left flex justify-between items-center transition-all ${
                        item
                          ? "bg-stone-800 border-amber-600/40 hover:bg-stone-755"
                          : "bg-stone-950 border-stone-900"
                      }`}
                      id={`slot_wrapper_${slot}`}
                    >
                      <div
                        className="truncate flex-1 space-y-0.5"
                        id={`slot_info_${slot}`}
                      >
                        <p className="text-[8px] text-stone-500 font-bold uppercase">
                          {name}
                        </p>
                        <p
                          className={`text-[10px] font-medium truncate flex items-center gap-1 ${
                            item
                              ? item.rarity === "Tiên Khí"
                                ? "text-emerald-400"
                                : item.rarity === "Đỏ"
                                  ? "text-red-400"
                                  : item.rarity === "Cam"
                                    ? "text-orange-400"
                                    : "text-stone-200"
                              : "text-stone-600"
                          }`}
                        >
                          {item ? item.name : "Trống"}
                          {item &&
                          item.enhancementLevel &&
                          item.enhancementLevel > 0 ? (
                            <span className="text-cyan-400 font-mono font-extrabold text-[9px]">
                              +{item.enhancementLevel}
                            </span>
                          ) : null}
                        </p>
                      </div>

                      {item && (
                        <button
                          onClick={() => handleUnequipItem(slot)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-stone-950 rounded transition-all active:scale-90"
                          title="Tháo gỡ trang bị"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Detailed Player statistics */}
            <div className="space-y-2" id="stats_column">
              <h4 className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-1">
                <Shield size={12} /> Chi tiết Chỉ số thuộc tính
              </h4>
              <div
                className="bg-stone-950 rounded-lg p-2.5 border border-stone-900 divide-y divide-stone-900 max-h-[460px] overflow-y-auto space-y-1 scrollbar-thin"
                id="stats_list_wrapper"
              >
                {statsLabels.map(({ key, label, desc, isPct }) => {
                  let val = player.stats[key];
                  return (
                    <div
                      key={key}
                      className="py-1.5 flex flex-col gap-0.5 text-left"
                      id={`stat_row_${key}`}
                    >
                      <div
                        className="flex justify-between items-center text-[10px]"
                        id={`stat_val_row_${key}`}
                      >
                        <span
                          className="text-stone-300 font-medium"
                          title={desc}
                        >
                          {label}
                        </span>
                        <span className="text-amber-400 font-mono font-bold">
                          {isPct
                            ? `${val.toLocaleString()}`
                            : val.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[8px] text-stone-500 leading-tight">
                        {desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* --- REALISTIC INVENTORY GRID & DETAILS CARD --- */}
          <div
            className="bg-stone-900 border border-stone-800 rounded-xl p-3.5 space-y-3"
            id="realistic_inventory_system"
          >
            <div className="flex justify-between items-center border-b border-stone-850 pb-2">
              <h4 className="text-xs font-black text-amber-500 uppercase flex items-center gap-1.5">
                🎒 TÚI HÀNH LÝ CHÂN THẬT (
                {inventory.reduce((acc, i) => acc + i.count, 0)} món)
              </h4>
              <span className="text-[10px] text-stone-500 font-mono">
                Chạm để chọn xem chi tiết
              </span>
            </div>

            {/* Bag sub-tabs */}
            <div
              className="flex gap-1 overflow-x-auto scrollbar-none pb-1 text-[9px]"
              id="bag_sub_tabs"
            >
              {[
                { id: "all", label: "🎒 Tất Cả" },
                { id: "equipment", label: "⚔️ Trang Bị" },
                { id: "consumables", label: "💊 Đan Dược" },
                { id: "herbs", label: "🌿 Linh Thảo" },
                { id: "materials", label: "💎 Nguyên Liệu" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    playSound("click");
                    setBagTab(tab.id as any);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border font-bold whitespace-nowrap transition-all cursor-pointer ${
                    bagTab === tab.id
                      ? "bg-amber-600 border-amber-500 text-stone-950 font-black shadow-inner shadow-black/20"
                      : "bg-stone-950 border-stone-900 text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              id="bag_main_area"
            >
              {/* Grid View */}
              <div className="space-y-2">
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider text-left">
                  Hàng hóa sở hữu:
                </p>
                {(() => {
                  const filtered = inventory.filter((item) => {
                    if (bagTab === "all") return true;
                    if (bagTab === "equipment")
                      return (
                        item.type === "equipment" || item.type === "artifact"
                      );
                    if (bagTab === "consumables")
                      return item.type === "consumable" || item.type === "key";
                    if (bagTab === "herbs") return item.type === "herb";
                    if (bagTab === "materials")
                      return (
                        item.type === "material" ||
                        item.type === "ore" ||
                        item.type === "gem" ||
                        item.type === "enhancement"
                      );
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-[10px] text-stone-600 bg-stone-950/60 rounded-xl border border-stone-950 border-dashed">
                        Chưa có vật phẩm thuộc loại này trong túi hành lý.
                      </div>
                    );
                  }

                  return (
                    <div
                      className="grid grid-cols-4 gap-1.5 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin"
                      id="bag_grid_scroller"
                    >
                      {filtered.map((item, idx) => {
                        const isSelected = sameItemStack(selectedBagItem, item);
                        const isEquipped = Object.values(
                          player.equippedItems,
                        ).some((eq) => eq && sameItemStack(eq, item));

                        // Color code rarity
                        const rarityColors: Record<ItemRarity, string> = {
                          Trắng:
                            "border-stone-700 bg-stone-900/40 text-stone-300",
                          Lục: "border-emerald-900 bg-emerald-950/10 text-emerald-400",
                          Lam: "border-blue-900 bg-blue-950/10 text-blue-400",
                          Tím: "border-purple-900 bg-purple-950/10 text-purple-400",
                          Cam: "border-orange-500 bg-orange-950/10 text-orange-400",
                          Đỏ: "border-red-500 bg-red-950/10 text-red-400",
                          "Thần Thoại":
                            "border-pink-500 bg-pink-950/10 text-pink-400 animate-pulse",
                          "Tiên Khí":
                            "border-cyan-400 bg-cyan-950/10 text-cyan-300 shadow-inner",
                        };

                        const borderClass =
                          rarityColors[item.rarity as ItemRarity] ||
                          "border-stone-800 bg-stone-950";

                        return (
                          <button
                            key={`${getItemStackKey(item)}_${idx}`}
                            onClick={() => {
                              playSound("click");
                              setSelectedBagItem(item);
                            }}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center relative aspect-square transition-all cursor-pointer ${borderClass} ${
                              isSelected
                                ? "ring-2 ring-amber-500 scale-105"
                                : "hover:scale-98"
                            }`}
                            id={`bag_slot_${item.id}`}
                          >
                            {/* Item symbol preview */}
                            <span className="text-xl">
                              {item.type === "equipment"
                                ? "⚔️"
                                : item.type === "consumable"
                                  ? "💊"
                                  : item.type === "herb"
                                    ? "🌿"
                                    : item.type === "ore"
                                      ? "🪨"
                                      : item.type === "key"
                                        ? "🔑"
                                        : "🎒"}
                            </span>

                            <span className="text-[8px] font-bold text-center leading-tight truncate w-full mt-1 flex items-center justify-center gap-0.5">
                              {item.name}
                              {item.enhancementLevel &&
                              item.enhancementLevel > 0 ? (
                                <span className="text-cyan-400 font-mono font-black">
                                  +{item.enhancementLevel}
                                </span>
                              ) : null}
                            </span>

                            {/* Amount Badge */}
                            <span className="absolute bottom-1 right-1.5 text-[8px] font-mono bg-stone-950/95 text-stone-300 px-1 rounded font-bold">
                              x{item.count}
                            </span>

                            {isEquipped && (
                              <span className="absolute top-0.5 left-0.5 text-[7px] font-bold bg-amber-500 text-stone-950 px-1 rounded">
                                E
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Details Card */}
              <div className="space-y-2">
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider text-left">
                  Thông tin vật phẩm:
                </p>
                {selectedBagItem ? (
                  <div
                    className="bg-stone-950 p-3 rounded-xl border border-stone-850 flex flex-col justify-between h-[190px] text-left relative overflow-hidden"
                    id="selected_item_card_detail"
                  >
                    <div className="space-y-1.5 flex-1 min-h-0">
                      <div className="flex justify-between items-start gap-1">
                        <h5 className="text-xs font-black text-amber-400 tracking-wide uppercase leading-tight">
                          {selectedBagItem.name} {selectedBagItem?.quality}{" "}
                          {selectedBagItem.enhancementLevel &&
                          selectedBagItem.enhancementLevel > 0
                            ? `+${selectedBagItem.enhancementLevel}`
                            : ""}
                        </h5>
                        <span className="text-[8px] font-mono bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded text-stone-400 shrink-0">
                          {selectedBagItem.rarity}
                        </span>
                      </div>

                      <p className="text-[8px] font-mono text-stone-500 uppercase tracking-widest">
                        Loại:{" "}
                        {selectedBagItem.type === "equipment"
                          ? `Trang bị (${selectedBagItem.equipmentSlot})`
                          : selectedBagItem.type === "consumable"
                            ? "Đan Dược"
                            : selectedBagItem.type === "herb"
                              ? "Linh Thảo"
                              : "Nguyên liệu"}
                      </p>

                      <p className="text-[9px] text-stone-300 leading-relaxed max-h-16 overflow-y-auto pr-1">
                        {selectedBagItem.desc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-900 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setSellQuantity((q) => Math.max(1, q - 1))
                          }
                          className="w-7 h-7 rounded-lg bg-stone-800 text-stone-100 flex items-center justify-center active:scale-95"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-[10px] font-black text-stone-200 min-w-10 text-center">
                          x{sellQuantity}
                        </span>
                        <button
                          onClick={() =>
                            setSellQuantity((q) =>
                              Math.min(selectedBagItem.count, q + 1),
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-stone-800 text-stone-100 flex items-center justify-center active:scale-95"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                      <span className="text-[9px] text-stone-500">
                        Tối đa {selectedBagItem.count}
                      </span>
                    </div>

                    {/* Actions bottom */}
                    <div
                      className="flex gap-1.5 pt-2 border-t border-stone-900 shrink-0"
                      id="item_detail_actions"
                    >
                      {(selectedBagItem.type === "equipment" ||
                        selectedBagItem.type === "artifact") && (
                        <button
                          onClick={() => handleEquipItem(selectedBagItem)}
                          className="flex-1 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-[9px] rounded-lg tracking-wider active:scale-95 transition-all cursor-pointer uppercase"
                        >
                          Trang bị
                        </button>
                      )}

                      {selectedBagItem.type === "consumable" && (
                        <button
                          onClick={() => handleUseConsumable(selectedBagItem)}
                          className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] rounded-lg tracking-wider active:scale-95 transition-all cursor-pointer uppercase"
                        >
                          Sử dụng
                        </button>
                      )}

                      {selectedBagItem.type !== "equipment" && (
                        <button
                          onClick={() =>
                            handleSellItem(selectedBagItem, sellQuantity)
                          }
                          className="flex-1 py-1 bg-stone-850 hover:bg-stone-800 text-stone-400 border border-stone-800 text-[9px] font-bold rounded-lg tracking-wider active:scale-95 transition-all cursor-pointer uppercase"
                        >
                          Thanh Lý
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-950/30 p-4 rounded-xl border border-stone-900 border-dashed h-[190px] flex flex-col items-center justify-center text-center text-stone-600 gap-1.5">
                    <span className="text-3xl filter saturate-50">📦</span>
                    <p className="text-[10px] italic">
                      Hãy bấm chọn một vật phẩm trong danh sách hành lý bên trái
                      để xem thuộc tính cụ thể, mặc thử pháp bảo, nuốt dược đan,
                      hoặc đem bán thanh lý.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {sheetTab === "forge" && (
        <div
          className="grid grid-cols-1 md:grid-cols-12 gap-4"
          id="forge_system_panel"
        >
          {/* Left panel: List of forgeable equipment (5 cols on md) */}
          <div
            className="md:col-span-5 bg-stone-900 border border-stone-850 p-3.5 rounded-xl space-y-3"
            id="forge_item_selector_panel"
          >
            <h4 className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1">
              🛠️ DANH SÁCH LINH BINH & GIÁP BẢO
            </h4>
            <p className="text-[10px] text-stone-500">
              Chọn trang bị trong rương hoặc đang mặc để bồi dưỡng:
            </p>

            <div
              className="space-y-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin"
              id="forge_items_scroller"
            >
              {/* Combine equipped items and unequipped items of type equipment/artifact */}
              {(() => {
                const equippedList = Object.entries(player.equippedItems)
                  .filter(([slot, item]) => item !== null)
                  .map(([slot, item]) => ({
                    ...item!,
                    isEquipped: true,
                    slotName: slot,
                  }));

                const unequippedList = inventory
                  .filter(
                    (i) => i.type === "equipment" || i.type === "artifact",
                  )
                  .map((i) => ({ ...i, isEquipped: false, slotName: "" }));

                const allItems = [...equippedList, ...unequippedList];

                if (allItems.length === 0) {
                  return (
                    <div className="p-8 text-center text-[10px] text-stone-600 bg-stone-950/40 rounded-xl border border-stone-850 border-dashed">
                      Đạo hữu hiện không sở hữu bất kỳ linh khí, giáp bảo hay
                      pháp bảo nào để rèn đúc.
                    </div>
                  );
                }

                return allItems.map((item, idx) => {
                  const isSelected = sameItemStack(selectedForgeItem, item);

                  return (
                    <button
                      key={`${item.id}_${idx}`}
                      onClick={() => {
                        playSound("click");
                        setSelectedForgeItem(item);
                        setSelectedGemSlot(null);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-950/20 border-amber-500/80 shadow"
                          : "bg-stone-950 border-stone-850 hover:bg-stone-900"
                      }`}
                    >
                      <div className="space-y-1 truncate flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-stone-200 truncate">
                            {item.name}
                          </span>
                          {item.enhancementLevel &&
                          item.enhancementLevel > 0 ? (
                            <span className="text-[10px] font-mono text-cyan-400 font-extrabold">
                              +{item.enhancementLevel}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 text-[8px] uppercase font-black tracking-wider">
                          <span className="text-stone-500">{item.rarity}</span>
                          {item.isEquipped ? (
                            <span className="text-amber-500 bg-amber-950/60 px-1.5 py-0.5 rounded">
                              Đang Mặc
                            </span>
                          ) : (
                            <span className="text-stone-600 bg-stone-900 px-1.5 py-0.5 rounded">
                              Trong Rương
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Gems preview indicators */}
                      <div className="flex gap-1">
                        {[0, 1, 2].map((sIdx) => {
                          const slot = item.gemSlots?.[sIdx];
                          const isFilled = slot && slot.filled;
                          let gemDot = "border-stone-800 bg-stone-900";
                          if (isFilled) {
                            if (slot.gemName?.includes("Hồng Ngọc"))
                              gemDot =
                                "bg-red-500 border-red-400 shadow-sm shadow-red-500/50";
                            else if (slot.gemName?.includes("Lam Ngọc"))
                              gemDot =
                                "bg-blue-500 border-blue-400 shadow-sm shadow-blue-500/50";
                            else if (slot.gemName?.includes("Tử Ngọc"))
                              gemDot =
                                "bg-purple-500 border-purple-400 shadow-sm shadow-purple-500/50";
                            else
                              gemDot =
                                "bg-cyan-400 border-cyan-300 shadow-sm shadow-cyan-400/50 animate-pulse";
                          }
                          return (
                            <div
                              key={sIdx}
                              className={`w-2.5 h-2.5 rounded-full border ${gemDot}`}
                            />
                          );
                        })}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Right panel: Workspace (7 cols on md) */}
          <div
            className="md:col-span-7 bg-stone-900 border border-stone-850 p-3.5 rounded-xl flex flex-col justify-between min-h-[480px]"
            id="forge_workspace_panel"
          >
            {selectedForgeItem ? (
              <div
                className="space-y-4 text-left"
                id="forge_workspace_has_item"
              >
                {/* Item Details Block */}
                <div
                  className="bg-stone-950 p-3.5 rounded-xl border border-stone-850 space-y-1.5 relative overflow-hidden"
                  id="forge_item_preview_header"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-amber-400 uppercase tracking-wide flex items-center gap-1">
                        {selectedForgeItem.name}{" "}
                        {selectedForgeItem.enhancementLevel &&
                        selectedForgeItem.enhancementLevel > 0
                          ? `+${selectedForgeItem.enhancementLevel}`
                          : ""}
                      </h4>
                      <p className="text-[9px] text-stone-500 uppercase tracking-widest font-mono">
                        Phẩm chất: {selectedForgeItem.rarity}
                      </p>
                    </div>
                    <span className="text-[10px] bg-stone-900 text-amber-500/80 px-2 py-0.5 rounded-lg border border-stone-800 uppercase font-black">
                      {selectedForgeItem.equipmentSlot || "Pháp Bảo"}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-300 italic leading-relaxed pt-1">
                    {selectedForgeItem.desc}
                  </p>

                  {/* Stats comparison before/after */}
                  <div
                    className="grid grid-cols-2 gap-2 border-t border-stone-900 pt-2 text-[10px]"
                    id="forge_item_stats_compare"
                  >
                    <div>
                      <span className="text-stone-500">Sát Thương (Công):</span>
                      <p className="font-mono font-bold text-stone-300 flex items-center gap-1">
                        {(
                          selectedForgeItem.statsBonus?.atk || 0
                        ).toLocaleString()}
                        {selectedForgeItem.enhancementLevel ? (
                          <span className="text-cyan-400 font-extrabold">
                            (+
                            {Math.round(
                              (selectedForgeItem.statsBonus?.atk || 0) *
                                (selectedForgeItem.enhancementLevel * 0.15),
                            ).toLocaleString()}
                            )
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div>
                      <span className="text-stone-500">Phòng Thủ (Thủ):</span>
                      <p className="font-mono font-bold text-stone-300 flex items-center gap-1">
                        {(
                          selectedForgeItem.statsBonus?.def || 0
                        ).toLocaleString()}
                        {selectedForgeItem.enhancementLevel ? (
                          <span className="text-cyan-400 font-extrabold">
                            (+
                            {Math.round(
                              (selectedForgeItem.statsBonus?.def || 0) *
                                (selectedForgeItem.enhancementLevel * 0.15),
                            ).toLocaleString()}
                            )
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sub-section 1: Cường Hóa Lò Rèn */}
                <div
                  className="bg-stone-950 p-3 rounded-xl border border-stone-850 space-y-2.5"
                  id="forge_workspace_enhance_section"
                >
                  <div className="flex justify-between items-center border-b border-stone-900 pb-1.5">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                      🔥 CƯỜNG HÓA RÈN ĐÚC PHÁP KHÍ
                    </span>
                    <span className="text-[9px] text-stone-500">
                      Cấp tối đa +15
                    </span>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-3 text-[10px]"
                    id="forge_enhance_requirements"
                  >
                    <div className="space-y-1">
                      <span className="text-stone-500">Nguyên Liệu Cần:</span>
                      {(() => {
                        const stoneId = getUpgradeStoneId(selectedForgeItem);
                        const stoneName =
                          stoneId === "da_cuong_hoa"
                            ? "Đá Cường Hóa"
                            : stoneId === "da_tinh_luyen"
                              ? "Đá Tinh Luyện"
                              : "Đá Đột Phá";
                        const countInBag =
                          inventory.find((i) => i.id === stoneId)?.count || 0;
                        return (
                          <p
                            className={`font-medium flex items-center gap-1 ${countInBag > 0 ? "text-stone-300" : "text-red-400 font-bold"}`}
                          >
                            🪨 1x {stoneName} ({countInBag} sở hữu)
                          </p>
                        );
                      })()}
                    </div>

                    <div className="space-y-1">
                      <span className="text-stone-500">
                        Linh Thạch Chi Phí:
                      </span>
                      <p
                        className={`font-mono font-bold flex items-center gap-0.5 ${player.spiritStones >= getUpgradeCost(selectedForgeItem) ? "text-amber-400" : "text-red-400"}`}
                      >
                        💎 {getUpgradeCost(selectedForgeItem).toLocaleString()}{" "}
                        Linh thạch
                      </p>
                    </div>
                  </div>

                  <div className="bg-stone-900/60 p-2 rounded border border-stone-850/60 flex justify-between items-center text-[10px]">
                    <div>
                      <span className="text-stone-500">Tỉ lệ thành công:</span>
                      <span className="font-mono text-green-400 font-bold ml-1.5">
                        {getUpgradeSuccessRate(selectedForgeItem)}%
                      </span>
                    </div>
                    <span className="text-[8px] text-stone-500 italic">
                      Thất bại sẽ mất linh thạch & nguyên liệu
                    </span>
                  </div>

                  <button
                    onClick={() => handleEnhanceItem(selectedForgeItem)}
                    className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-stone-950 text-xs font-black uppercase rounded-lg shadow-md shadow-cyan-500/10 active:scale-98 transition-all cursor-pointer"
                  >
                    BẮT ĐẦU CƯỜNG HÓA (+15% Chỉ Số)
                  </button>
                </div>

                {/* Sub-section 2: Khảm Nạm Linh Ngọc */}
                <div
                  className="bg-stone-950 p-3 rounded-xl border border-stone-850 space-y-2.5"
                  id="forge_workspace_socket_section"
                >
                  <div className="flex justify-between items-center border-b border-stone-900 pb-1.5">
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      🔴 KHẢM NẠM LINH NGỌC CỔ ĐẠI
                    </span>
                    <span className="text-[9px] text-stone-500">
                      Tối đa 3 Linh Ngọc
                    </span>
                  </div>

                  {/* Sockets display */}
                  <div
                    className="grid grid-cols-3 gap-2"
                    id="forge_gem_slots_grid"
                  >
                    {[0, 1, 2].map((sIdx) => {
                      const slot = selectedForgeItem.gemSlots?.[sIdx];
                      const isFilled = slot && slot.filled;

                      return (
                        <div
                          key={sIdx}
                          className={`p-2 rounded-lg border text-center flex flex-col justify-between gap-1 min-h-[75px] ${
                            isFilled
                              ? "bg-rose-950/10 border-rose-900/40"
                              : "bg-stone-900 border-stone-850 border-dashed"
                          }`}
                        >
                          <span className="text-[8px] text-stone-500 font-mono">
                            LỖ KHẢM {sIdx + 1}
                          </span>

                          {isFilled ? (
                            <>
                              <div className="truncate space-y-0.5">
                                <p className="text-[9px] font-bold text-rose-400 truncate leading-tight">
                                  {slot.gemName}
                                </p>
                                <p className="text-[8px] text-stone-400 font-mono leading-tight">
                                  {slot.bonus}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  handleUnsocketGem(selectedForgeItem, sIdx)
                                }
                                className="w-full py-0.5 bg-stone-850 hover:bg-red-950/20 text-stone-400 hover:text-red-400 text-[8px] font-bold rounded border border-stone-800 transition-all cursor-pointer"
                              >
                                THÁO NGỌC
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-[9px] text-stone-600 italic">
                                Trống
                              </span>
                              <button
                                onClick={() => {
                                  playSound("click");
                                  setSelectedGemSlot(
                                    selectedGemSlot === sIdx ? null : sIdx,
                                  );
                                }}
                                className={`w-full py-0.5 text-[8px] font-bold rounded transition-all cursor-pointer border ${
                                  selectedGemSlot === sIdx
                                    ? "bg-amber-600 border-amber-500 text-stone-950 font-black"
                                    : "bg-stone-950 hover:bg-stone-800 border-stone-800 text-stone-400"
                                }`}
                              >
                                KHẢM NGỌC
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Gem selection list when slot is clicked */}
                  {selectedGemSlot !== null && (
                    <div
                      className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800 space-y-2"
                      id="gem_select_panel"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-stone-400 font-bold uppercase">
                          Linh ngọc khả dụng trong túi:
                        </span>
                        <button
                          onClick={() => setSelectedGemSlot(null)}
                          className="text-stone-500 hover:text-stone-400 text-[9px] font-black"
                        >
                          HỦY BỎ
                        </button>
                      </div>

                      {(() => {
                        const gemsInBag = inventory.filter(
                          (i) => i.type === "gem" && i.count > 0,
                        );
                        if (gemsInBag.length === 0) {
                          return (
                            <p className="text-[9px] text-stone-600 italic py-1.5">
                              Đạo hữu không có Linh ngọc nào để khảm. Hãy mua
                              Hồng Ngọc, Lam Ngọc, Tử Ngọc trong mục Cửa hàng!
                            </p>
                          );
                        }

                        return (
                          <div
                            className="grid grid-cols-2 gap-1.5"
                            id="available_gems_grid"
                          >
                            {gemsInBag.map((gem) => (
                              <button
                                key={gem.id}
                                onClick={() =>
                                  handleSocketGem(
                                    selectedForgeItem,
                                    selectedGemSlot,
                                    gem.id,
                                  )
                                }
                                className="p-1.5 rounded bg-stone-950 border border-stone-800 hover:border-amber-600/50 flex justify-between items-center text-left text-[9px] transition-all cursor-pointer"
                              >
                                <div>
                                  <p className="font-bold text-stone-200 truncate">
                                    {gem.name}
                                  </p>
                                  <p className="text-[7px] text-stone-500">
                                    Hàng x{gem.count}
                                  </p>
                                </div>
                                <span className="text-xs">🔴</span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="m-auto text-center space-y-2.5 max-w-xs"
                id="forge_workspace_empty"
              >
                <div className="w-16 h-16 bg-stone-950 rounded-full border border-stone-850 flex items-center justify-center m-auto shadow-inner text-2xl">
                  🛠️
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-500 uppercase">
                    TIÊN LÒ RÈN & KHẢM NGỌC
                  </h4>
                  <p className="text-[10px] text-stone-500 leading-relaxed pt-1">
                    Hãy lựa chọn linh binh, giáp bảo ở danh sách bên trái để mở
                    phong ấn, tiến hành rèn đúc thăng sao cường hóa (+15% chỉ số
                    cốt lõi mỗi cấp) hoặc khảm nạm Linh Ngọc cổ đại bổ trợ.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom help note */}
            <div
              className="bg-stone-950/40 border border-stone-900/60 p-2.5 rounded-lg text-[9px] text-stone-500 flex items-center gap-1.5 mt-4"
              id="forge_workspace_help"
            >
              <span className="text-xs">💡</span>
              <p>
                Mẹo rèn đúc: Tỉ lệ cường hóa giảm dần khi thăng cao. Vật phẩm
                rèn hay khảm xong có thể tháo gỡ an toàn, hoàn trả 100% Linh
                ngọc nguyên trạng.
              </p>
            </div>
          </div>
        </div>
      )}

      {sheetTab === "skills" && (
        <div
          className="bg-stone-900 border border-stone-850 p-4 rounded-xl space-y-4"
          id="skills_system_panel"
        >
          <div className="text-left space-y-1">
            <h4 className="text-sm font-black text-amber-500 uppercase flex items-center gap-2">
              📜 TÀN KINH CÁC (VÕ KỸ & CÔNG PHÁP)
            </h4>
            <p className="text-[10px] text-stone-400">
              Tuyệt học võ kĩ đã lĩnh ngộ. Võ kỹ sẽ tự động kích hoạt khi đánh
              quái, công pháp tăng vĩnh viễn chỉ số.
            </p>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            id="skills_grid"
          >
            {skills.length === 0 ? (
              <div className="col-span-full p-8 text-center text-[10px] text-stone-600 bg-stone-950/40 rounded-xl border border-stone-850 border-dashed">
                Đạo hữu chưa lĩnh ngộ bất kỳ tuyệt học nào. Hãy đến Tông Môn để
                đổi bí kíp!
              </div>
            ) : (
              skills.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-stone-950 p-3 rounded-lg border border-stone-800 flex flex-col justify-between text-left gap-2 hover:border-amber-500/50 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h5 className="text-xs font-bold text-amber-400 uppercase">
                        {skill.name}
                      </h5>
                      <span className="text-[9px] bg-stone-900 px-1.5 py-0.5 rounded text-stone-400 font-mono">
                        Lvl {skill.level}
                      </span>
                    </div>
                    <span className="text-[8px] uppercase tracking-wider text-cyan-500 mt-1 inline-block">
                      {skill.type}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-1.5 leading-relaxed">
                      {skill.desc}
                    </p>
                  </div>
                  <div className="border-t border-stone-900 pt-2 flex justify-between items-center mt-2">
                    <span className="text-[9px] text-stone-500">
                      Thuộc tính cường hóa:
                    </span>
                    <span className="text-[10px] text-stone-300 font-bold font-mono text-right">
                      {skill.statBuff?.atk
                        ? `Công +${Math.round(skill.statBuff.atk * 100 - 100)}% `
                        : ""}
                      {skill.statBuff?.hp
                        ? `HP +${Math.round(skill.statBuff.hp * 100 - 100)}% `
                        : ""}
                      {skill.statBuff?.crit
                        ? `Crit +${Math.round(skill.statBuff.crit * 100 - 100)}% `
                        : ""}
                      {skill.statBuff?.evasion
                        ? `Né +${Math.round(skill.statBuff.evasion * 100 - 100)}% `
                        : ""}
                      {skill.effectMultiplier
                        ? `Sát thương x${skill.effectMultiplier}`
                        : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
