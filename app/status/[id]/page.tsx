'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Ticket = {
  id: string
  ticket_number: number
  party_size: number
  status: 'waiting' | 'called' | 'entered'
  created_at: string
}

function StatusContent() {
  const params = useParams()
  const id = params.id as string

  const [myTicket, setMyTicket] = useState<Ticket | null>(null)
  const [currentCalled, setCurrentCalled] = useState<Ticket[] | []>([])
  const [waitingCount, setWaitingCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // データの取得とリアルタイム購読の設定
  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      // 1. 自分のチケット情報を取得
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single()

      if (ticketError) {
        console.error('チケット取得エラー:', ticketError)
      } else {
        setMyTicket(ticketData)
      }

      // 2. 現在呼び出し中のチケットを取得
      const { data: calledData } = await supabase
        .from('tickets')
        .select('*')
        .eq('status', 'called')
        .order('ticket_number', { ascending: true })

      if (calledData) setCurrentCalled(calledData)

      // 3. 自分より前に待っている組数を計算するため、waitingのチケットを取得
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')

      if (count !== null) setWaitingCount(count)
      setLoading(false)
    }

    fetchData()

    // Supabase Realtimeでticketsテーブルの変更を監視
    const channel = supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          fetchData() // 変更があったらデータを再取得
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="animate-pulse text-purple-400 font-bold">読み込み中...</p>
      </div>
    )
  }

  if (!myTicket) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-red-400 mb-2">チケットが見つかりません</h1>
        <p className="text-slate-300 text-sm">URLが正しいかご確認ください。</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen relative text-white pb-16 bg-slate-950">
      {/* --- 背景画像レイヤー (galaxy.jpg) --- */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0"
        style={{ backgroundImage: `url('/galaxy.jpg')` }}
      ></div>
      {/* 暗めのオーバーレイをかけて文字を見やすくする */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/80 to-slate-950/90 z-0"></div>

      {/* --- コンテンツレイヤー --- */}
      <div className="relative z-10">
        {/* ヘッダー */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 text-center sticky top-0 z-20 shadow-xl">
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            80's GALAXY DISCO
          </h1>
          <p className="text-xs text-purple-200 font-medium mt-0.5">宇宙で一番ココが輝く！</p>
        </header>

        <div className="max-w-md mx-auto p-4 space-y-6">
          {/* ステータスカード */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl text-center relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>

            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-100 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                あなたの整理券番号
              </span>
              <div className="text-5xl font-black text-white mt-3 tracking-tight">
                No. <span className="text-pink-400">{myTicket.ticket_number}</span>
              </div>
              <p className="text-xs text-slate-200 font-medium mt-1">ご利用人数: {myTicket.party_size}名様</p>
            </div>

            {/* ステータス表示ボックス */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-300 mb-2">現在のステータス</p>
              
              {myTicket.status === 'waiting' && (
                <div className="bg-slate-950/90 border border-yellow-500/40 rounded-xl p-4 shadow-inner">
                  <p className="text-lg font-bold text-yellow-300 animate-pulse">順番待ち中です</p>
                </div>
              )}
              {myTicket.status === 'called' && (
                <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl p-4 shadow-lg shadow-pink-600/40 animate-bounce">
                  <p className="text-lg font-black">まもなくご案内です！</p>
                  <p className="text-xs mt-1 font-medium text-pink-100">受付にお越しください</p>
                </div>
              )}
              {myTicket.status === 'entered' && (
                <div className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-4 shadow-inner">
                  <p className="text-lg font-bold text-emerald-300">ご案内完了しました</p>
                </div>
              )}
            </div>

            {/* 現在の呼び出し中番号 */}
            <div className="text-left bg-purple-950/60 border border-purple-800/80 rounded-xl p-3 shadow-inner">
              <span className="text-xs font-bold text-purple-200 block mb-1">📢 現在の呼び出し状況</span>
              {currentCalled.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {currentCalled.map((t) => (
                    <span key={t.id} className="bg-purple-600 text-white font-bold text-sm px-3 py-1 rounded-lg shadow-sm border border-purple-500/50">
                      No. {t.ticket_number}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-200">現在呼び出し中の番号はありません</p>
              )}
            </div>
          </div>

          {/* --- セクション1: 限定バブルスイーツ＆ドリンク --- */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-md">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-extrabold text-pink-400 flex items-center gap-2">
                🍰 限定バブルスイーツ＆ドリンク
              </h2>
            </div>

            <div className="space-y-4 text-sm">
              {/* ワッフルカード (wuffle.jpg) */}
              <div className="bg-slate-950/90 rounded-xl border border-slate-800/80 overflow-hidden shadow-inner">
                <div className="w-full h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  <img 
                    src="/wuffle.jpg" 
                    alt="ギャラクシー・ワッフル" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-pink-300 text-base mb-1.5">🧇 ギャラクシー・ワッフル</h3>
                  <p className="text-slate-100 text-xs leading-relaxed font-normal">
                    チョコソース＆ホイップをたっぷりトッピングした特製ワッフル！
                  </p>
                </div>
              </div>

              {/* ドリンクカード (fanta.jpg) */}
              <div className="bg-slate-950/90 rounded-xl border border-slate-800/80 overflow-hidden shadow-inner">
                <div className="w-full h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  <img 
                    src="/fanta.jpg" 
                    alt="コスモ・ソーダ" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-purple-300 text-base mb-1.5">🥤 コスモ・ソーダ</h3>
                  <p className="text-slate-100 text-xs leading-relaxed font-normal">
                    シュワシュワの炭酸に濃厚グレープ＆ブルーベリー、ホイップを重ねた爽快ドリンク！
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* --- セクション2: 見どころ＆コンセプト --- */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-md">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-extrabold text-purple-400 flex items-center gap-2">
                ✨ 80's GALAXY DISCOの見どころ
              </h2>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800/80 shadow-inner">
                <h3 className="font-bold text-indigo-300 text-base mb-1.5">🌌 宇宙×80's ディスコ空間</h3>
                <p className="text-slate-100 text-xs leading-relaxed font-normal">
                  宇宙をイメージした空間にミラーボールやネオンライトが輝く、ギラギラでポップな80年代ディスコを再現！
                </p>
              </div>

              <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800/80 shadow-inner">
                <h3 className="font-bold text-pink-300 text-base mb-1.5">🎧 特設DJブース & フォトスポット</h3>
                <p className="text-slate-100 text-xs leading-relaxed font-normal">
                  DJブースをはじめ、店内にはインスタ映え間違いなしのフォトスポットをたくさんご用意しています！
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="animate-pulse text-purple-400 font-bold">読み込み中...</p>
      </div>
    }>
      <StatusContent />
    </Suspense>
  )
}
