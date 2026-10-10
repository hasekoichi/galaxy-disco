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
        <p className="animate-pulse text-purple-400 text-lg font-bold">読み込み中...</p>
      </div>
    )
  }

  if (!myTicket) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-red-400 mb-2">チケットが見つかりません</h1>
        <p className="text-slate-200 text-base">URLが正しいかご確認ください。</p>
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
      {/* 濃いめのオーバーレイをかけて文字を絶対に見やすくする */}
      <div className="absolute inset-0 bg-slate-950/90 z-0"></div>

      {/* --- コンテンツレイヤー --- */}
      <div className="relative z-10">
        {/* ヘッダー（文字がハッキリ見えるように背景をしっかり敷いて、白＆ピンクの単色＋影に変更） */}
        <header className="bg-slate-900 border-b-2 border-purple-500/50 py-5 px-3 text-center sticky top-0 z-20 shadow-2xl w-full">
          <p className="text-sm sm:text-base font-black tracking-widest text-pink-400 mb-1">
            2年3組
          </p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-wider text-white drop-shadow-[0_2px_10px_rgba(236,72,153,0.8)] w-full">
            GALAXY DISCO
          </h1>
        </header>

        <div className="max-w-md mx-auto p-4 space-y-6">
          {/* ステータスカード */}
          <div className="bg-slate-900/95 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.7)]"></div>

            <div className="mb-6">
              <span className="text-sm font-bold uppercase tracking-wider text-purple-100 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-600">
                あなたの整理券番号
              </span>
              <div className="text-7xl font-black text-white mt-4 tracking-tight drop-shadow-md">
                No. <span className="text-pink-400">{myTicket.ticket_number}</span>
              </div>
              <p className="text-lg text-slate-100 font-bold mt-2">ご利用人数: {myTicket.party_size}名様</p>
            </div>

            {/* ステータス表示ボックス */}
            <div className="mb-6">
              <p className="text-sm font-bold text-slate-200 mb-2">現在のステータス</p>
              
              {myTicket.status === 'waiting' && (
                <div className="bg-slate-950 border-2 border-yellow-500/60 rounded-2xl p-5 shadow-inner">
                  <p className="text-2xl font-black text-yellow-300 animate-pulse tracking-wide">順番待ち中です</p>
                </div>
              )}
              {myTicket.status === 'called' && (
                <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl p-5 shadow-xl shadow-pink-600/50 animate-bounce">
                  <p className="text-2xl font-black tracking-wider">まもなくご案内です！</p>
                  <p className="text-base mt-1.5 font-bold text-pink-100">受付にお越しください</p>
                </div>
              )}
              {myTicket.status === 'entered' && (
                <div className="bg-slate-950 border-2 border-emerald-500/60 rounded-2xl p-5 shadow-inner">
                  <p className="text-2xl font-black text-emerald-300 tracking-wide">ご案内完了しました</p>
                </div>
              )}
            </div>

            {/* 現在の呼び出し中番号 */}
            <div className="text-left bg-purple-950/80 border-2 border-purple-700/80 rounded-2xl p-4 shadow-inner">
              <span className="text-sm font-bold text-purple-200 block mb-2">📢 現在の呼び出し状況</span>
              {currentCalled.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {currentCalled.map((t) => (
                    <span key={t.id} className="bg-purple-600 text-white font-black text-lg px-4 py-1.5 rounded-xl shadow border border-purple-400">
                      No. {t.ticket_number}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-200 font-medium">現在呼び出し中の番号はありません</p>
              )}
            </div>
          </div>

          {/* --- セクション1: 限定バブルスイーツ＆ドリンク --- */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-md">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-lg font-black text-pink-400 flex items-center gap-2">
                🍰 限定バブルスイーツ＆ドリンク
              </h2>
            </div>

            <div className="space-y-4 text-base">
              {/* ワッフルカード */}
              <div className="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                <div className="w-full h-48 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  <img 
                    src="/wuffle.jpg" 
                    alt="ギャラクシー・ワッフル" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-pink-300 text-lg mb-1">🧇 ギャラクシー・ワッフル</h3>
                  <p className="text-slate-100 text-sm leading-relaxed font-medium">
                    チョコソース＆ホイップをたっぷりトッピングした特製ワッフル！
                  </p>
                </div>
              </div>

              {/* ドリンクカード */}
              <div className="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                <div className="w-full h-48 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  <img 
                    src="/fanta.jpg" 
                    alt="コスモ・ソーダ" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-purple-300 text-lg mb-1">🥤 コスモ・ソーダ</h3>
                  <p className="text-slate-100 text-sm leading-relaxed font-medium">
                    シュワシュワの炭酸に濃厚グレープ＆ブルーベリー、ホイップを重ねた爽快ドリンク！
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* --- セクション2: 見どころ＆コンセプト --- */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-md">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-lg font-black text-purple-400 flex items-center gap-2">
                ✨ 80's GALAXY DISCOの見どころ
              </h2>
            </div>

            <div className="space-y-4 text-base">
              <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 shadow-inner">
                <h3 className="font-bold text-indigo-300 text-lg mb-1">🌌 宇宙×80's ディスコ空間</h3>
                <p className="text-slate-100 text-sm leading-relaxed font-medium">
                  宇宙をイメージした空間にミラーボールやネオンライトが輝く、ギラギラでポップな80年代ディスコを再現！
                </p>
              </div>

              <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 shadow-inner">
                <h3 className="font-bold text-pink-300 text-lg mb-1">🎧 特設DJブース & フォトスポット</h3>
                <p className="text-slate-100 text-sm leading-relaxed font-medium">
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
        <p className="animate-pulse text-purple-400 text-lg font-bold">読み込み中...</p>
      </div>
    }>
      <StatusContent />
    </Suspense>
  )
}