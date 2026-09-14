'use client';

import { useState } from 'react';
import { Mail, MessageCircle, Phone, CheckCircle2 } from 'lucide-react';
type Category = 'general' | 'listing' | 'payment' | 'account' | 'dealer' | 'other';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'general', label: '一般的なお問い合わせ' },
  { value: 'listing', label: '出品・掲載について' },
  { value: 'payment', label: '決済・エスクローについて' },
  { value: 'account', label: 'アカウント・ログインについて' },
  { value: 'dealer', label: '加盟店申請について' },
  { value: 'other', label: 'その他' },
];

const FAQ = [
  {
    q: '個人間での車の売買は安全ですか？',
    a: 'BUYMOでは代金をエスクロー（第三者保全）で管理します。買主が現車確認を済ませた後に売主へ送金されるため、詐欺リスクを大幅に低減しています。',
  },
  {
    q: '名義変更はどうすればよいですか？',
    a: '名義変更代行サービスをご利用いただけます。行政書士が書類作成から陸運局手続きまでを代行します。遠隔地のお取引でも対応可能です。',
  },
  {
    q: '出品手数料はいくらですか？',
    a: '個人間取引の出品は無料です。成約時に成約額の3%（税別）の手数料をいただきます。加盟店は別途プランをご確認ください。',
  },
  {
    q: 'ローンは利用できますか？',
    a: 'BUYMO提携ローンがご利用いただけます。最短即日審査・最長120回払い・金利3.5%〜に対応しています。ダッシュボードからお申し込みください。',
  },
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-black">お問い合わせ</h1>
        <p className="mt-1 text-sm text-slate-500">
          ご不明な点はお気軽にお問い合わせください。通常2営業日以内にご返信します。
        </p>
      </div>

      {/* 連絡手段 */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Mail, label: 'メール', value: 'support@buymo.me', note: '2営業日以内に返信' },
          { icon: MessageCircle, label: 'チャット', value: 'アプリ内AIチャット', note: '24時間対応（AI）' },
          { icon: Phone, label: '電話', value: '03-XXXX-XXXX', note: '平日 10:00〜18:00' },
        ].map(({ icon: Icon, label, value, note }) => (
          <div key={label} className="card flex items-start gap-3 p-4">
            <div className="rounded-lg bg-navy-50 p-2">
              <Icon className="h-4 w-4 text-navy-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">{label}</p>
              <p className="font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-400">{note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* よくある質問 */}
      <div>
        <h2 className="mb-4 text-lg font-black">よくある質問</h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="card p-4">
              <p className="font-bold text-navy-700">Q. {q}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* お問い合わせフォーム */}
      <div className="card p-6">
        <h2 className="mb-4 font-black">フォームからのお問い合わせ</h2>
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="font-bold">お問い合わせを受け付けました</p>
            <p className="text-sm text-slate-500">2営業日以内にご登録のメールアドレスへご返信します。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">お名前</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="input"
                  placeholder="山田 太郎"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input"
                  placeholder="taro@example.com"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">お問い合わせ種別</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
                className="input"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">お問い合わせ内容</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={5}
                className="input"
                placeholder="ご質問・ご要望をできるだけ詳しくご記入ください。"
              />
            </div>
            <button type="submit" className="btn-accent w-full">送信する</button>
          </form>
        )}
      </div>
    </div>
  );
}
