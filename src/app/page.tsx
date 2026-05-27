"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { getOrInitializeHousehold, getStatusesForMonth, updateStatus, cleanupOldStatuses, StatusData, HouseholdData, getUserName, updateUserName } from "@/lib/db";
import { CardView } from "@/components/CardView";
import { GridView } from "@/components/GridView";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { auth } from "@/lib/firebase";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<StatusData[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"card" | "grid">("card");
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const loadData = async (date: Date) => {
    if (!user) return;
    setLoading(true);
    try {
      const hh = await getOrInitializeHousehold(user.uid);
      setHouseholdId(hh.id);
      setHousehold({ name: "Household", members: hh.members });

      // Clean up old data in the background
      cleanupOldStatuses(hh.id).catch(console.error);

      const name = await getUserName(user.uid);
      setUserName(name);

      try {
        const namesRes = await fetch(`/api/household/${hh.id}/names`);
        if (namesRes.ok) {
          const names = await namesRes.json();
          setMemberNames(names);
        }
      } catch (e) {
        console.warn("Failed to fetch member names via API", e);
      }

      const yearMonth = format(date, "yyyy-MM");
      const st = await getStatusesForMonth(hh.id, yearMonth);
      
      // Auto-restore any missing members who have statuses
      const activeUserIds = Array.from(new Set(st.map(s => s.userId)));
      const missingMembers = activeUserIds.filter(uid => !hh.members.includes(uid));
      if (missingMembers.length > 0) {
        const newMembers = [...hh.members, ...missingMembers];
        setHousehold({ name: hh.name, members: newMembers });
        
        // Fetch names for restored members
        try {
          const namesRes = await fetch(`/api/household/${hh.id}/names`);
          if (namesRes.ok) {
            setMemberNames(await namesRes.json());
          }
        } catch (e) {}
      }
      
      setStatuses(st);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData(currentDate);
    }
  }, [user, currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleStatusChange = async (userId: string, dateStr: string, field: string, value: number | string) => {
    if (!householdId) return;

    // Optimistic update
    setStatuses((prev) => {
      const existingIdx = prev.findIndex(s => s.userId === userId && s.date === dateStr);
      if (existingIdx >= 0) {
        const newStatuses = [...prev];
        newStatuses[existingIdx] = { ...newStatuses[existingIdx], [field]: value };
        return newStatuses;
      } else {
        const newStatus: any = { userId, date: dateStr, work: 0, eatOut: 0, stayOut: 0, invite: 0, guestStay: 0, memo: "", [field]: value };
        return [...prev, newStatus];
      }
    });

    try {
      await updateStatus(householdId, userId, dateStr, field as any, value);
    } catch (err) {
      console.error("Failed to update status", err);
      // Revert in real app
    }
  };

  if (authLoading || !user) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const datesInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-line px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Minimal Share</h1>
          <div className="flex items-center gap-4">
            <input 
              type="text" 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)} 
              onBlur={() => updateUserName(user.uid, userName)}
              placeholder="表示名を設定"
              className="text-sm bg-transparent border-b border-line focus:outline-none focus:border-gray-400 w-24 px-1"
            />
            <button onClick={() => auth.signOut()} className="text-sm text-gray-500 hover:text-foreground">ログアウト</button>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition">◀</button>
            <span className="text-lg font-semibold min-w-[100px] text-center">
              {format(currentDate, "yyyy年 M月", { locale: ja })}
            </span>
            <button onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition">▶</button>
            
            <button 
              onClick={handleToday}
              disabled={isSameMonth(currentDate, new Date())}
              className="ml-2 px-3 py-1.5 text-sm font-medium bg-card border border-line rounded-full disabled:opacity-50 hover:bg-gray-50 transition shrink-0"
            >
              今月へ戻る
            </button>
          </div>

          <div className="flex bg-line/30 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode("card")}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${viewMode === "card" ? "bg-card shadow-sm text-foreground" : "text-gray-500 hover:text-gray-700"}`}
            >
              カード
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-gray-500 hover:text-gray-700"}`}
            >
              グリッド
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="text-center py-20 text-gray-500">データを読み込み中...</div>
        ) : !household ? (
          <div className="text-center py-20 text-gray-500">設定が見つかりません</div>
        ) : viewMode === "card" ? (
          <CardView 
            dates={datesInMonth}
            statuses={statuses}
            household={household}
            currentUserId={user.uid}
            memberNames={memberNames}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <GridView 
            dates={datesInMonth}
            statuses={statuses}
            household={household}
            currentUserId={user.uid}
            memberNames={memberNames}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>
    </div>
  );
}
