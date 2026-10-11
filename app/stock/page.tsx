'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Item = {
  id: string
  name: string
  price: number
  cost: number
  stock: number
  sold_count: number
}

export default function StockPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // 編集中のアイテムIDと一時的な入力値
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempPrice, setTempPrice] = useState<number>(0)
  const [tempCost, setTempCost] = useState<number>(0)

  // 在庫データの取得関数
  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('price', { ascending: false })

    if (error) {
      console.error('在庫データ取得エラー:', error)
    } else if (data) {
      setItems(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      await fetchItems()
    }
    init()

    // Supabase Realtime で他の端末の更新もリアルタイム反映
    const channel = supabase
      .channel('public:items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => {
          fetchItems()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchItems])

  // 在庫数・販売数の更新関数
  const updateStock = async (item: Item, deltaStock: number, deltaSold: number) => {
    const newStock = Math.max(0, item.stock + deltaStock)
    const newSold = Math.max(0, item.sold_count + deltaSold)

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, stock: newStock, sold_count: newSold } : i
      )
    )

    const { error } = await supabase
      .from('items')
      .update({ stock: newStock, sold_count: newSold })
      .eq('id', item.id)

    if (error) {
      console.error('更新エラー:', error)
      fetchItems()
    }
  }

  // 直接在庫数を変更する処理
  const setExactStock = async (item: Item, newStock: number) => {
    if (newStock < 0) return

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, stock: newStock } : i))
    )

    const { error } = await supabase
      .from('items')
      .update({ stock: newStock })
      .eq('id', item.id)

    if (error) {
      console.error('更新エラー:', error)
      fetchItems()
    }
  }

  // 編集モードに入る
  const startEditing = (item: Item) => {
    setEditingId(item.id)
    setTempPrice(item.price)
    setTempCost(item.cost)
  }

  // 価格（売値・仕入値）の保存
  const savePriceAndCost = async (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, price: tempPrice, cost: tempCost } : i))
    )
    setEditingId(null)

    const { error } = await supabase
      .from('items')
      .update({ price: tempPrice, cost: tempCost })
      .eq('id', id)

    if (error) {
      console.error('価格更新エラー:', error)
      fetchItems()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="animate-pulse text-purple-400 text-lg font-bold">読み込み中...</p>
      </div>
    )
  }

  // 総売上・総仕入コスト・純利益の計算
  const totalSales = items.reduce((sum, item) => sum + item.price * item.sold_count, 0)
  const totalCost = items.reduce((sum, item) => sum + item.cost * item.sold_count, 0)
  const totalProfit = totalSales - totalCost

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 font-sans pb-12">
      <div className="max-w-md mx-auto space-y-6">
        {/* ヘッダー */}
        <header className="text-center py-4 border-b border-purple-500/30">
          <p className="text-xs font-bold text-pink-400 tracking-widest">2年3組 GALAXY DISCO</p>
          <h1 className="text-2xl font-black tracking-wider text-white mt-1">
            📦 クラス内 在庫・売上管理
          </h1>
        </header>

        {/* 売上・利益サマリーボード */}
        <div className="bg-slate-900 border-2 border-purple-600/50 rounded-3xl p-5 shadow-[0_0_20px_rgba(168,85,247,0.2)] space-y-3">
          <div className="text-center">
            <p className="text-xs font-bold text-purple-300">現在の見込み総売上</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">
              ¥{totalSales.toLocaleString()}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400">総原価</p>
              <p className="text-lg font-bold text-slate-300">¥{totalCost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400">推定利益</p>
              <p className="text-lg font-black text-pink-400">¥{totalProfit.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* アイテム一覧 */}
        <div className="space-y-4">
          {items.map((item) => {
            const isSoldOut = item.stock === 0
            const isEditing = editingId === item.id

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border-2 rounded-3xl p-5 transition relative overflow-hidden ${
                  isSoldOut
                    ? 'border-red-500/60 opacity-85'
                    : 'border-slate-700 shadow-lg'
                }`}
              >
                {/* 完売バッジ */}
                {isSoldOut && (
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full animate-pulse shadow-md">
                    完売 (SOLD OUT)
                  </div>
                )}

                <div className="mb-3 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black text-white">{item.name}</h2>
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => startEditing(item)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold transition"
                    >
                      ✏️ 価格変更
                    </button>
                  ) : (
                    <button
                      onClick={() => savePriceAndCost(item.id)}
                      className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg font-bold transition shadow"
                    >
                      💾 保存
                    </button>
                  )}
                </div>

                {/* 価格・仕入れ値の表示 / 編集エリア */}
                {!isEditing ? (
                  <div className="flex gap-4 text-xs font-bold text-slate-300 mb-4 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div>売値: <span className="text-white text-sm">¥{item.price}</span></div>
                    <div>仕入値(原価): <span className="text-slate-200">¥{item.cost}</span></div>
                    <div>利益/個: <span className="text-pink-400">¥{item.price - item.cost}</span></div>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4 bg-slate-950 p-3 rounded-xl border border-purple-500/50">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-400">売値 (円):</label>
                      <input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-white px-3 py-1 rounded-lg w-28 text-right font-bold text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-400">仕入値/原価 (円):</label>
                      <input
                        type="number"
                        value={tempCost}
                        onChange={(e) => setTempCost(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-white px-3 py-1 rounded-lg w-28 text-right font-bold text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* 数値表示グリッド */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                    <p className="text-xs font-bold text-slate-400">現在庫数</p>
                    <p
                      className={`text-3xl font-black mt-1 ${
                        isSoldOut ? 'text-red-400' : 'text-purple-300'
                      }`}
                    >
                      {item.stock} <span className="text-sm font-normal">個</span>
                    </p>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                    <p className="text-xs font-bold text-slate-400">販売済み数</p>
                    <p className="text-3xl font-black text-emerald-400 mt-1">
                      {item.sold_count} <span className="text-sm font-normal">個</span>
                    </p>
                  </div>
                </div>

                {/* 操作ボタン */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 mb-1">クイック操作（販売時・補填時）</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateStock(item, -1, 1)}
                      disabled={isSoldOut}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 px-3 rounded-xl transition active:scale-95 text-sm shadow"
                    >
                      🛒 1個販売 (-1個)
                    </button>
                    <button
                      onClick={() => updateStock(item, 1, -1)}
                      disabled={item.sold_count === 0}
                      className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold py-2.5 px-3 rounded-xl transition active:scale-95 text-sm border border-slate-700"
                    >
                      ↩️ 1個取消 (+1個)
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setExactStock(item, item.stock + 10)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold py-2 px-2 rounded-xl text-xs border border-slate-700"
                    >
                      ＋10個補填
                    </button>
                    <button
                      onClick={() => setExactStock(item, 0)}
                      className="bg-red-950 hover:bg-red-900 text-red-300 font-bold py-2 px-3 rounded-xl text-xs border border-red-800/60"
                    >
                      完売に設定
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* フッター */}
        <footer className="text-center text-xs text-slate-500 font-bold pt-4">
          Powered By 2338 長谷川皓一
        </footer>
      </div>
    </main>
  )
}