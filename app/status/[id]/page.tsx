'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
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
  const [soundEnabled, setSoundEnabled] = useState(false)

  // 前回のステータスを保持して、'called' に変化した瞬間を検知する
  const prevStatusRef = useRef<string | null>(null)

  // 🔔 音とバイブレーションを鳴らす関数
  const playNotification = () => {
    // 1. バイブレーション (500ms鳴る -> 200ms休み -> 500ms鳴る...)
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 200, 500, 200, 500])
      } catch (e) {
        console.log('Vibration error:', e)
      }
    }

    // 2. Web Audio API で「ピポーン！」音を生成して鳴らす
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + duration)
      }

      // 「ピ（880Hz）ー ポーン（1760Hz）」
      playTone(880, 0, 0.25)
      playTone(1760, 0.25, 0.6)
    } catch (e) {
      console.log('Audio error:', e)
    }
  }

  // 通知を有効化するボタンが押されたとき
  const enableSound = () => {
    setSoundEnabled(true)
    playNotification() // 起動確認用のダミー再生
  }

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
      } else if (ticketData) {
        // 待ち状態から「called（呼び出し）」に変わった瞬間に通知！
        if (prevStatusRef.current === 'waiting' && ticketData.status === 'called') {
          playNotification()
        }
        prevStatusRef.current = ticketData.status
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
    <main className="min-h-screen relative text-white pb-16 bg-slate-950 font-sans">
      {/* --- 背景画像レイヤー (galaxy.jpg) --- */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0"
        style={{ backgroundImage: `url('/galaxy.jpg')` }}
      ></div>
      {/* 濃いめのオーバーレイをかけて文字を絶対に見やすくする */}
      <div className="absolute inset-0 bg-slate-950/90 z-0"></div>

      {/* --- コンテンツレイヤー --- */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ヘッダー */}
        <header className="bg-slate-900 border-b-2 border-purple-500/50 py-5 px-3 text-center sticky top-0 z-20 shadow-[0_0_20px_rgba(168,85,247,0.4)] w-full">
          <p className="text-sm sm:text-base font-black tracking-widest text-pink-400 mb-1 drop-shadow-[0_0_3px_rgba(244,114,182,0.8)]">
            2年3組
          </p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-wider text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] w-full">
            GALAXY <span className="drop-shadow-[0_0_10px_rgba(236,72,153,1)]">DISCO</span>
          </h1>
        </header>

        <div className="max-w-md mx-auto p-4 space-y-6 flex-grow w-full">
          
          {/* 🔔 通知許可ボタンエリア */}
          {!soundEnabled ? (
            <button
              onClick={enableSound}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-4 rounded-2xl shadow-[0_0_15px_rgba(236,72,153,0.5)] border border-pink-400/50 flex items-center justify-center gap-2 animate-bounce transition transform active:scale-95"
            >
              <span className="text-xl">🔔</span>
              <span>タップして「呼び出し音＆バイブ」をONにする</span>
            </button>
          ) : (
            <div className="bg-slate-900/80 border border-emerald-500/50 text-emerald-400 font-bold text-center py-2 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-inner">
              <span>✅ 呼び出し通知（音・振動）が有効です</span>
            </div>
          )}

          {/* ステータスカード */}
          <div className="bg-slate-900/95 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] text-center relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 shadow-[0_0_15px_rgba(236,72,153,0.9)]"></div>

            <div className="mb-6 pt-2">
              <span className="text-sm font-bold uppercase tracking-wider text-purple-100 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-600 shadow-inner">
                あなたの整理券番号
              </span>
              <div className="text-7xl font-black text-white mt-4 tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
                No. <span className="text-pink-400 drop-shadow-[0_0_12px_rgba(236,72,153,1)]">{myTicket.ticket_number}</span>
              </div>
              <p className="text-lg text-slate-100 font-bold mt-2">ご利用人数: {myTicket.party_size}名様</p>
            </div>

            {/* ステータス表示ボックス */}
            <div className="mb-6">
              <p className="text-sm font-bold text-slate-200 mb-2">現在のステータス</p>
              
              {myTicket.status === 'waiting' && (
                <div className="bg-slate-950 border-2 border-yellow-500/60 rounded-2xl p-5 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                  <p className="text-2xl font-black text-yellow-300 animate-pulse tracking-wide drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]">順番待ち中です</p>
                </div>
              )}
              {myTicket.status === 'called' && (
                <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl p-5 shadow-[0_0_20px_rgba(236,72,153,0.6)] animate-bounce border-2 border-pink-400/50">
                  <p className="text-2xl font-black tracking-wider drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">まもなくご案内です！</p>
                  <p className="text-base mt-1.5 font-bold text-pink-100">受付にお越しください</p>
                </div>
              )}
              {myTicket.status === 'entered' && (
                <div className="bg-slate-950 border-2 border-emerald-500/60 rounded-2xl p-5 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <p className="text-2xl font-black text-emerald-300 tracking-wide drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]">ご案内完了しました</p>
                </div>
              )}
            </div>

            {/* 現在の呼び出し中番号 */}
            <div className="text-left bg-purple-950/80 border-2 border-purple-700/80 rounded-2xl p-4 shadow-inner">
              <span className="text-sm font-bold text-purple-200 block mb-2">📢 現在の呼び出し状況</span>
              {currentCalled.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {currentCalled.map((t) => (
                    <span key={t.id} className="bg-purple-600 text-white font-black text-lg px-4 py-1.5 rounded-xl border border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]">
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
              <h2 className="text-lg font-black text-pink-400 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(244,114,182,0.7)]">
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
                  <h3 className="font-bold text-pink-300 text-lg mb-1 drop-shadow-[0_0_3px_rgba(244,114,182,0.6)]">🧇 ギャラクシー・ワッフル</h3>
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
                  <h3 className="font-bold text-purple-300 text-lg mb-1 drop-shadow-[0_0_3px_rgba(168,85,247,0.6)]">🥤 コスモ・ソーダ</h3>
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
              <h2 className="text-lg font-black text-purple-400 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(168,85,247,0.7)]">
                ✨ 80's GALAXY DISCOの見どころ
              </h2>
            </div>

            <div className="space-y-4 text-base">
              <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 shadow-inner">
                <h3 className="font-bold text-indigo-300 text-base sm:text-lg mb-1 tracking-tight break-keep drop-shadow-[0_0_3px_rgba(129,140,248,0.6)]">
                  🌌 宇宙×80's ディスコ空間
                </h3>
                <p className="text-slate-100 text-sm leading-relaxed font-medium">
                  宇宙をイメージした空間にミラーボールやネオンライトが輝く、ギラギラでポップな80年代バブル期ディスコを再現！
                </p>
              </div>

              <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 shadow-inner">
                <h3 className="font-bold text-pink-300 text-base sm:text-lg mb-1 tracking-tight break-keep drop-shadow-[0_0_3px_rgba(244,114,182,0.6)]">
                  🎧 DJブース & フォトスポット
                </h3>
                <p className="text-slate-100 text-sm leading-relaxed font-medium">
                  DJブースをはじめ、店内にはインスタ映え間違いなしのフォトスポットをたくさんご用意しています！
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- フッター（開発者クレジット） --- */}
        <footer className="mt-auto py-8 text-center text-slate-400 text-xs sm:text-sm font-bold tracking-wider">
          Powered By 2338 長谷川皓一
        </footer>
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