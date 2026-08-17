import React, { useState, useEffect } from 'react';
import { PlayerCharacter, GameItem } from '../types';
import { playSound } from '../utils/gameData';
import { addInventoryItem, normalizeInventoryItems } from '../utils/inventory';
import { Gavel, Diamond, ArrowRightLeft, Clock, ShoppingBag } from 'lucide-react';

interface AuctionItem {
  id: string;
  item: GameItem;
  sellerName: string;
  price: number;
  expiresAt: number;
}

// Mock initial data
const MOCK_AUCTIONS: AuctionItem[] = [
  {
    id: 'auction_1',
    item: { id: 'da_tinh_luyen', name: 'Đá Tinh Luyện', type: 'material', count: 2, rarity: 'Cam', desc: 'Nguyên liệu rèn bảo vật' },
    sellerName: 'Vô Danh Tử',
    price: 300,
    expiresAt: Date.now() + 3600000
  },
  {
    id: 'auction_2',
    item: { id: 'huyen_linh_qua', name: 'Huyền Linh Quả', type: 'herb', count: 1, rarity: 'Tím', desc: 'Linh thảo hiếm có' },
    sellerName: 'Bạch Vân Thiên',
    price: 150,
    expiresAt: Date.now() + 1800000
  },
  {
    id: 'auction_3',
    item: { id: 'truc_co_dan', name: 'Trúc Cơ Đan', type: 'consumable', count: 1, rarity: 'Lục', desc: 'Dùng đột phá Trúc Cơ' },
    sellerName: 'Ma Tôn',
    price: 50,
    expiresAt: Date.now() + 800000
  }
];

interface AuctionHouseProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
}

export default function AuctionHouse({ player, setPlayer, inventory, setInventory }: AuctionHouseProps) {
  const [auctions, setAuctions] = useState<AuctionItem[]>(MOCK_AUCTIONS);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<GameItem | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(100);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [sellQuantity, setSellQuantity] = useState<number>(1);

  const handleBuy = (auction: AuctionItem, quantity: number) => {
    const qty = Math.max(1, Math.min(quantity, auction.item.count));
    const totalPrice = auction.price * qty;
    if (player.spiritStones < totalPrice) {
      alert('Đạo hữu không đủ Linh thạch để mua vật phẩm này!');
      return;
    }
    
    if (confirm(`Xác nhận mua ${qty}x [${auction.item.name}] với giá ${totalPrice} Linh thạch?`)) {
      playSound('success');
      
      setPlayer(prev => ({
        ...prev,
        spiritStones: prev.spiritStones - totalPrice
      }));
      
      setInventory(prev => {
        const nextItem = { ...auction.item, count: qty } as GameItem;
        return normalizeInventoryItems(addInventoryItem(prev, nextItem, qty));
      });
      
      if (qty >= auction.item.count) {
        setAuctions(prev => prev.filter(a => a.id !== auction.id));
      } else {
        setAuctions(prev => prev.map(a => a.id === auction.id ? { ...a, item: { ...a.item, count: a.item.count - qty } } : a));
      }
      setBuyQuantities(prev => ({ ...prev, [auction.id]: 1 }));
      
      alert(`Giao dịch thành công! Thu được ${qty}x ${auction.item.name}.`);
    }
  };

  const handleSell = () => {
    if (!selectedInventoryItem) return;
    if (sellPrice <= 0) {
      alert('Giá bán phải lớn hơn 0!');
      return;
    }

    const qty = Math.max(1, Math.min(selectedInventoryItem.count, sellQuantity));
    
    playSound('ping');
    
    const newAuction: AuctionItem = {
      id: `auction_${Date.now()}`,
      item: { ...selectedInventoryItem, count: qty },
      sellerName: player.name,
      price: sellPrice,
      expiresAt: Date.now() + 24 * 3600000 // 24 hours
    };
    
    setAuctions(prev => [newAuction, ...prev]);
    
    setInventory(prev => prev.map(i => i.id === selectedInventoryItem.id && i.count > 0 ? { ...i, count: i.count - qty } : i).filter(i => i.count > 0));
    
    setSelectedInventoryItem(null);
    setSellPrice(100);
    setSellQuantity(1);
    setActiveTab('buy');
    
    alert(`Đã niêm yết ${qty}x [${selectedInventoryItem.name}] lên Sàn Đấu Giá với giá ${sellPrice} Linh thạch.`);
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-stone-200 h-full max-h-[800px]">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 text-center relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Gavel size={64} />
        </div>
        <h2 className="text-xl font-black text-amber-500 uppercase tracking-widest flex items-center justify-center gap-2">
          <Gavel size={24} /> Vạn Giới Sàn Đấu Giá
        </h2>
        <p className="text-xs text-stone-400 mt-2">Nơi tu chân giả giao thương kỳ trân dị bảo. Dùng Linh Thạch để ngã giá.</p>
        <div className="mt-4 flex justify-center gap-4">
          <span className="text-xs font-bold bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 flex items-center gap-1.5 text-cyan-400">
            <Diamond size={14} className="text-cyan-500" /> Linh Thạch của bạn: {player.spiritStones.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800">
        <button
          onClick={() => { playSound('click'); setActiveTab('buy'); }}
          className={`flex-1 py-3 font-bold text-xs uppercase transition-all ${
            activeTab === 'buy' ? 'border-b-2 border-amber-500 text-amber-500' : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Mua Sắm Kỳ Trân
        </button>
        <button
          onClick={() => { playSound('click'); setActiveTab('sell'); }}
          className={`flex-1 py-3 font-bold text-xs uppercase transition-all ${
            activeTab === 'sell' ? 'border-b-2 border-amber-500 text-amber-500' : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Ký Gửi Vật Phẩm
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'buy' ? (
          <div className="space-y-3">
            {auctions.length === 0 ? (
              <div className="text-center py-12 text-stone-600">
                <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                <p>Sàn đấu giá hiện tại đang trống rỗng. Hãy quay lại sau.</p>
              </div>
            ) : (
              auctions.map(auction => (
                <div key={auction.id} className="bg-stone-900 border border-stone-850 p-4 rounded-xl flex items-center justify-between hover:border-amber-500/30 transition-all shadow-md">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                      {auction.item.name} 
                      <span className="text-[10px] bg-stone-950 px-2 py-0.5 rounded text-stone-300 border border-stone-800">x{auction.item.count}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold text-stone-950 ${
                        auction.item.rarity === 'Cam' ? 'bg-orange-500' : 
                        auction.item.rarity === 'Tím' ? 'bg-purple-500' : 
                        auction.item.rarity === 'Lam' ? 'bg-blue-500' : 
                        auction.item.rarity === 'Lục' ? 'bg-green-500' : 
                        auction.item.rarity === 'Đỏ' ? 'bg-red-500' : 'bg-gray-400'
                      }`}>
                        {auction.item.rarity}
                      </span>
                    </h3>
                    <p className="text-[10px] text-stone-400 mt-1">{auction.item.desc}</p>
                    <div className="mt-2 flex items-center gap-4 text-[9px] text-stone-500 font-mono">
                      <span>👤 Người bán: <span className="text-stone-300">{auction.sellerName}</span></span>
                      <span className="flex items-center gap-1"><Clock size={10} /> Hết hạn: 24h</span>
                    </div>
                  </div>
                  
                  <div className="pl-4 border-l border-stone-800 flex flex-col items-end gap-2 shrink-0">
                    <span className="text-sm font-black text-cyan-400 flex items-center gap-1">
                      {auction.price.toLocaleString()} <Diamond size={12} className="text-cyan-500" />
                    </span>
                    <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1">
                      <button onClick={() => setBuyQuantities(prev => ({ ...prev, [auction.id]: Math.max(1, (prev[auction.id] || 1) - 1) }))} className="w-6 h-6 rounded bg-stone-800 text-stone-100 text-xs">-</button>
                      <span className="text-[10px] font-black text-stone-200 min-w-6 text-center">x{buyQuantities[auction.id] || 1}</span>
                      <button onClick={() => setBuyQuantities(prev => ({ ...prev, [auction.id]: Math.min(auction.item.count, (prev[auction.id] || 1) + 1) }))} className="w-6 h-6 rounded bg-stone-800 text-stone-100 text-xs">+</button>
                    </div>
                    <button
                      onClick={() => handleBuy(auction, buyQuantities[auction.id] || 1)}
                      disabled={player.name === auction.sellerName}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold rounded-lg text-xs transition-all active:scale-95 shadow-lg shadow-amber-900/50"
                    >
                      MUA NGAY
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl">
              <h3 className="text-xs font-bold text-stone-300 uppercase mb-3">1. Chọn vật phẩm từ hành trang</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                {inventory.filter(i => !i.isEquipped && i.type !== 'currency').map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedInventoryItem(item)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      selectedInventoryItem?.id === item.id 
                        ? 'bg-amber-950/30 border-amber-500 shadow-md' 
                        : 'bg-stone-950 border-stone-850 hover:bg-stone-800'
                    }`}
                  >
                    <div className="font-bold text-[11px] text-stone-200 truncate">{item.name}</div>
                    <div className="flex justify-between items-center mt-1 text-[9px]">
                      <span className="text-stone-500">Sl: {item.count}</span>
                      <span className={item.rarity === 'Cam' ? 'text-orange-400' : item.rarity === 'Tím' ? 'text-purple-400' : 'text-stone-400'}>
                        {item.rarity}
                      </span>
                    </div>
                  </button>
                ))}
                {inventory.filter(i => !i.isEquipped && i.type !== 'currency').length === 0 && (
                  <div className="col-span-full text-center text-[10px] text-stone-600 py-4">Hành trang không có vật phẩm nào có thể bán.</div>
                )}
              </div>
            </div>

            {selectedInventoryItem && (
              <div className="bg-stone-900 border border-amber-900/50 p-4 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-amber-500 uppercase">2. Thiết lập giá bán</h3>
                <div className="flex items-center gap-4 bg-stone-950 p-3 rounded-lg border border-stone-800">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-stone-200">{selectedInventoryItem.name}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">{selectedInventoryItem.desc}</p>
                  </div>
                  <ArrowRightLeft className="text-stone-600" />
                  <div className="flex flex-col gap-1 items-end">
                    <label className="text-[9px] text-stone-400 uppercase">Giá bán (Linh thạch)</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={sellPrice}
                      onChange={(e) => setSellPrice(parseInt(e.target.value) || 0)}
                      className="w-24 px-2 py-1 bg-stone-900 border border-stone-700 rounded text-cyan-400 font-bold text-right focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center gap-1 pt-1">
                      <button onClick={() => setSellQuantity(q => Math.max(1, q - 1))} className="w-6 h-6 rounded bg-stone-800 text-stone-100 text-xs">-</button>
                      <span className="text-[10px] font-black text-stone-200 min-w-6 text-center">x{sellQuantity}</span>
                      <button onClick={() => setSellQuantity(q => Math.min(selectedInventoryItem.count, q + 1))} className="w-6 h-6 rounded bg-stone-800 text-stone-100 text-xs">+</button>
                    </div>
                    <span className="text-[9px] text-stone-500">Tối đa {selectedInventoryItem.count}</span>
                  </div>
                </div>
                
                <button
                  onClick={handleSell}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-lg text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <Gavel size={16} /> LÊN SÀN ĐẤU GIÁ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
