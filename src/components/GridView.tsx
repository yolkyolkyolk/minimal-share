"use client";

import { Fragment } from "react";
import { StatusData, HouseholdData } from "@/lib/db";
import { StatusToggle } from "./StatusToggle";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface GridViewProps {
  dates: Date[];
  statuses: StatusData[];
  household: HouseholdData;
  currentUserId: string;
  onStatusChange: (userId: string, dateStr: string, field: string, value: number | string) => void;
}

const ITEMS = [
  { key: "work", label: "💼" },
  { key: "eatOut", label: "🍽️❌" },
  { key: "stayOut", label: "🛏️❌" },
  { key: "invite", label: "👥☀️" },
  { key: "guestStay", label: "👥🌃" },
] as const;

export function GridView({ dates, statuses, household, currentUserId, onStatusChange }: GridViewProps) {
  const getStatus = (userId: string, dateStr: string) => {
    return statuses.find((s) => s.userId === userId && s.date === dateStr) || {
      userId,
      date: dateStr,
      work: 0,
      eatOut: 0,
      stayOut: 0,
      invite: 0,
      guestStay: 0,
      memo: "",
    };
  };

  return (
    <div className="overflow-auto bg-card border border-line rounded-2xl shadow-sm max-h-[70vh]">
      <table className="w-max border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-card shadow-[0_1px_0_var(--line)]">
          <tr>
            <th className="sticky left-0 z-30 bg-card p-2 min-w-[80px] border-r border-line border-b">
              日付
            </th>
            {household.members.map((memberId) => {
              const isMe = memberId === currentUserId;
              return (
                <th key={memberId} colSpan={ITEMS.length + 1} className={`p-2 border-b border-line border-r last:border-r-0 ${isMe ? 'bg-highlight' : ''}`}>
                  {isMe ? "あなた" : `メンバー`}
                </th>
              );
            })}
          </tr>
          <tr>
            <th className="sticky left-0 z-30 bg-card border-r border-line border-b"></th>
            {household.members.map((memberId) => {
              const isMe = memberId === currentUserId;
              return (
                <Fragment key={`${memberId}-headers`}>
                  {ITEMS.map((item) => (
                    <th key={`${memberId}-${item.key}`} className={`w-[48px] h-[48px] p-1 font-normal text-sm text-gray-600 border-b border-line ${isMe ? 'bg-highlight' : ''}`}>
                      <div className="w-[40px] flex items-center justify-center mx-auto">
                        {item.label}
                      </div>
                    </th>
                  ))}
                  <th key={`${memberId}-memo`} className={`w-[140px] h-[48px] p-1 font-normal text-xs text-gray-500 border-b border-line border-r last:border-r-0 ${isMe ? 'bg-highlight' : ''}`}>
                    Memo
                  </th>
                </Fragment>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const dayStr = format(date, "d日(E)", { locale: ja });

            return (
              <tr key={dateStr} className="h-[48px] hover:bg-gray-50 transition-colors">
                <td className="sticky left-0 z-10 bg-card border-r border-b border-line p-2 text-center font-medium shadow-[1px_0_0_var(--line)] whitespace-nowrap">
                  {dayStr}
                </td>
                {household.members.map((memberId) => {
                  const isMe = memberId === currentUserId;
                  const status = getStatus(memberId, dateStr);

                  return (
                    <Fragment key={`${memberId}-cells`}>
                      {ITEMS.map((item) => (
                        <td key={`${memberId}-${item.key}`} className={`border-b border-line p-1 ${isMe ? 'bg-highlight' : ''}`}>
                          <div className="w-[40px] h-[40px] mx-auto flex items-center justify-center">
                            <StatusToggle
                              value={status[item.key as keyof typeof status] as number}
                              onChange={(val) => onStatusChange(memberId, dateStr, item.key, val)}
                              disabled={!isMe}
                            />
                          </div>
                        </td>
                      ))}
                      <td key={`${memberId}-memo`} className={`border-b border-line border-r last:border-r-0 p-1 px-2 ${isMe ? 'bg-highlight' : ''}`}>
                        <input
                          type="text"
                          maxLength={20}
                          value={status.memo || ""}
                          onChange={(e) => onStatusChange(memberId, dateStr, "memo", e.target.value)}
                          disabled={!isMe}
                          className="w-full text-xs rounded border border-transparent hover:border-line focus:border-line bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 p-1 transition-all disabled:opacity-50"
                        />
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
