'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type IssuedTicket = {
  id: string
  ticket_number: number
  party_size: number
}

export default function TicketPage() {
  const [partySize, setPartySize] = useState(2)
  const [loading, setLoading] = useState(false)
  const [issuedTicket, setIssuedTicket] = useState<IssuedTicket | null>(null)
  const router = useRouter()

  const handleDecrease = () => {
    if (partySize > 1) {
      setPartySize(partySize - 1)
    }
  }

  const handleIncrease = () => {
    setPartySize(partySize + 1)
  }

  const handleIssueTicket = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert([{ party_size: partySize, status: 'waiting' }])
        .select()
        .single()

      if (error) throw error

      if (data) {
        setIssuedTicket(data)
      }
    } catch (err) {
      console.error('発券エラー:', err)
      alert('発券に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  // すでに発券完了している場合（QRコード表示画面）
  if (issuedTicket) {
    const statusUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/status/${issuedTicket.id}` 
      : `/status/${issuedTicket.id}`

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(statusUrl)}&color=0-0-0&bgcolor=255-255-255`

    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-pink-400 bg-pink-950/60 px-4 py-1.5 rounded-full border border-pink-800">
              2年3組 GALAXY DISCO
            </span>
          </div>
          
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-200 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              整理券発行完了
            </span>
            <div className="text-5xl font-black text-white mt-4">
              No. <span className="text-pink-400">{issuedTicket.ticket_number}</span>
            </div>
            <p className="text-base text-slate-300 mt-2 font-medium">人数: {issuedTicket.party_size}名様</p>
          </div>

          {/* QRコード表示ボックス */}
          <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto border-4 border-pink-500/30">
            <img 
              src={qrCodeUrl} 
              alt="ステータス確認用QRコード" 
              className="w-48 h-48 mx-auto block"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIssuedTicket(null)}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition"
            >
              ← 新しく発券するに戻る
            </button>
          </div>
        </div>
      </main>
    )
  }

  // 通常の発券画面（文字サイズを大きく見やすく調整）
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center">
        {/* クラス名・タイトル部分 */}
        <div className="mb-2">
          <span className="text-base sm:text-lg font-bold tracking-widest text-pink-400 bg-pink-950/50 px-4 py-1 rounded-full border border-pink-800/60 inline-block mb-3">
            2年3組
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent mb-3 leading-tight">
          GALAXY DISCO
        </h1>
        <p className="text-slate-300 text-base sm:text-lg mb-8 font-medium">
          整理券を発行して順番をお待ちください
        </p>

        <div className="mb-8">
          <label className="block text-base sm:text-lg font-bold text-slate-200 mb-4">
            ご利用人数を選択してください
          </label>
          
          {/* 人数増減カウンターUI */}
          <div className="flex items-center justify-center gap-6 bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-inner">
            <button
              onClick={handleDecrease}
              disabled={partySize <= 1}
              className="w-14 h-14 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-3xl font-bold rounded-2xl transition flex items-center justify-center shadow"
            >
              -
            </button>
            <div className="text-center min-w-[100px]">
              <span className="text-5xl font-black text-pink-500">{partySize}</span>
              <span className="text-base text-slate-300 ml-1.5 font-bold">名様</span>
            </div>
            <button
              onClick={handleIncrease}
              className="w-14 h-14 bg-slate-800 hover:bg-slate-700 text-white text-3xl font-bold rounded-2xl transition flex items-center justify-center shadow"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={handleIssueTicket}
          disabled={loading}
          className="w-full py-4.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-lg font-bold rounded-2xl shadow-lg shadow-pink-900/30 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? '発券中...' : '整理券を発行する'}
        </button>
      </div>
    </main>
  )
}