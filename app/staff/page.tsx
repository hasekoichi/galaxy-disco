'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Ticket = {
  id: string
  ticket_number: number
  party_size: number
  status: 'waiting' | 'called' | 'entered'
  created_at: string
}

export default function StaffPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  // チケット一覧の取得
  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('ticket_number', { ascending: true })

    if (error) {
      console.error('データ取得エラー:', error)
    } else if (data) {
      setTickets(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTickets()

    // リアルタイムで変更を同期
    const channel = supabase
      .channel('staff:tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          fetchTickets()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ステータスを更新する
  const updateStatus = async (id: string, newStatus: 'waiting' | 'called' | 'entered') => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      console.error('ステータス更新エラー:', error)
      alert('更新に失敗しました')
    }
  }

  // 個別の整理券を削除
  const deleteTicket = async (id: string, ticketNumber: number) => {
    if (!confirm(`整理券 No. ${ticketNumber} を削除してもよろしいですか？`)) return

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  // 全ての整理券を削除（全リセット）
  const deleteAllTickets = async () => {
    if (!confirm('⚠️ 本当に全ての整理券データを削除しますか？\n（文化祭の1日目終了時やリセット時に使用します）')) return

    const { error } = await supabase
      .from('tickets')
      .delete()
      .neq('ticket_number', 0)

    if (error) {
      console.error('全削除エラー:', error)
      alert('全削除に失敗しました')
    } else {
      setTickets([])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="animate-pulse text-purple-400 font-bold">読み込み中...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* ヘッダー ＆ 全削除ボタン */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              STAFF MANAGEMENT
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">80's GALAXY DISCO 整理券コントロールパネル</p>
          </div>

          <button
            onClick={deleteAllTickets}
            className="w-full sm:w-auto px-4 py-2.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition shadow-lg border border-red-500/50"
          >
            🗑️ 全データ削除（リセット）
          </button>
        </div>

        {/* チケット一覧 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>発券済み一覧</span>
            <span className="text-xs bg-purple-950 text-purple-300 px-2.5 py-1 rounded-full border border-purple-800">
              合計: {tickets.length} 件
            </span>
          </h2>

          {tickets.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">現在発券されている整理券はありません</p>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div 
                  key={t.id} 
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner"
                >
                  {/* 番号と人数 */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-pink-400">No. {t.ticket_number}</span>
                      <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                        {t.party_size}名様
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      発行日時: {new Date(t.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* ステータス変更 ＆ 個別削除ボタン */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                    <button
                      onClick={() => updateStatus(t.id, 'waiting')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        t.status === 'waiting' 
                          ? 'bg-yellow-500 text-slate-950 shadow-md' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      待ち
                    </button>
                    <button
                      onClick={() => updateStatus(t.id, 'called')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        t.status === 'called' 
                          ? 'bg-pink-600 text-white shadow-md shadow-pink-600/40 animate-pulse' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      呼び出し中
                    </button>
                    <button
                      onClick={() => updateStatus(t.id, 'entered')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        t.status === 'entered' 
                          ? 'bg-emerald-600 text-white shadow-md' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      完了
                    </button>

                    {/* 個別削除ボタン */}
                    <button
                      onClick={() => deleteTicket(t.id, t.ticket_number)}
                      title="この整理券を削除"
                      className="p-1.5 bg-slate-800 hover:bg-red-950/80 hover:text-red-400 text-slate-400 rounded-lg transition border border-slate-700 hover:border-red-800"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}