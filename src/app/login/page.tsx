"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-line p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold">
          {isLogin ? "ログイン" : "新規登録"}
        </h1>
        {error && <p className="mb-4 text-sm text-red-500 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">メールアドレス</label>
            <input
              type="email"
              className="w-full rounded-lg border border-line p-3 focus:outline-none focus:ring-2 focus:ring-highlight bg-background"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">パスワード</label>
            <input
              type="password"
              className="w-full rounded-lg border border-line p-3 focus:outline-none focus:ring-2 focus:ring-highlight bg-background"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground text-background py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "処理中..." : (isLogin ? "ログイン" : "登録する")}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-foreground"
          >
            {isLogin ? "アカウントをお持ちでない方はこちら" : "すでにアカウントをお持ちの方はこちら"}
          </button>
        </div>
      </div>
    </div>
  );
}
