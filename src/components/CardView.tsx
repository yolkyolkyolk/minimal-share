"use client";

import { StatusData, HouseholdData } from "@/lib/db";
import { StatusToggle } from "./StatusToggle";
import { TextToggle } from "./TextToggle";
import { format, isSaturday, isSunday } from "date-fns";
import { ja } from "date-fns/locale";

interface CardViewProps {
  dates: Date[];
  statuses: StatusData[];
  household: HouseholdData;
  currentUserId: string;
  memberNames: Record<string, string>;
  onStatusChange: (userId: string, dateStr: string, field: string, value: number | string) => void;
}

const ITEMS = [
  { key: "work", label: "Work", states: [0, 1, 2] },
  { key: "eatOut", label: "Eat Out", states: [0, 2] },
  { key: "stayOut", label: "Stay Out", states: [0, 2] },
  { key: "invite", label: "Guest Day", states: [0, 2] },
  { key: "guestStay", label: "Guest Night", states: [0, 2] },
];

export function CardView({ dates, statuses, household, currentUserId, memberNames, onStatusChange }: CardViewProps) {
  const getStatus = (userId: string, dateStr: string) => {
    return statuses.find((s) => s.userId === userId && s.date === dateStr) || {
      userId,
      date: dateStr,
      work: 1,
      backAt: "20-24",
      eatOut: 0,
      stayOut: 0,
      invite: 0,
      guestStay: 0,
      memo: "",
    };
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {dates.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayStr = format(date, "M月d日(E)", { locale: ja });
        const dayColor = isSaturday(date) ? "text-sky-500" : isSunday(date) ? "text-rose-500" : "";

        return (
          <div key={dateStr} className="bg-card border border-line rounded-2xl p-4 shadow-sm">
            <h3 className={`text-lg font-bold mb-4 border-b border-line pb-2 ${dayColor}`}>{dayStr}</h3>
            <div className="flex flex-col gap-6">
              {/* Only show the current user in Card View */}
              {[currentUserId].map((memberId) => {
                const status = getStatus(memberId, dateStr);
                const isMe = memberId === currentUserId;
                return (
                  <div key={memberId} className={`flex flex-col gap-3 ${isMe ? "bg-highlight p-3 rounded-xl" : "px-3"}`}>
                    <div className="text-sm font-semibold text-gray-500">
                      {isMe ? "あなた" : (memberNames[memberId] || "メンバー")}
                    </div>
                    <div className="flex items-center overflow-x-auto gap-4 pb-2">
                      {ITEMS.map((item) => (
                        <div key={item.key} className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-2 min-w-[60px] shrink-0">
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">{item.label}</span>
                            <StatusToggle
                              value={status[item.key as keyof typeof status] as number}
                              onChange={(val) => onStatusChange(memberId, dateStr, item.key, val)}
                              disabled={!isMe}
                              states={item.states}
                            />
                          </div>
                          {item.key === "work" && (
                            <div className="flex flex-col items-center gap-2 min-w-[60px] shrink-0">
                              <span className="text-[10px] text-gray-500 whitespace-nowrap">Back At</span>
                              <TextToggle
                                value={status.backAt || "20-24"}
                                onChange={(val) => onStatusChange(memberId, dateStr, "backAt", val)}
                                disabled={!isMe}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Memo Field */}
                      <div className="flex flex-col gap-1 min-w-[150px] shrink-0 ml-auto">
                        <span className="text-[10px] text-gray-500">Memo</span>
                        <input
                          type="text"
                          maxLength={20}
                          value={status.memo || ""}
                          onChange={(e) => onStatusChange(memberId, dateStr, "memo", e.target.value)}
                          disabled={!isMe}
                          placeholder="最大20文字"
                          className="w-full text-sm rounded-md border border-line bg-background p-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:opacity-50 disabled:bg-gray-50 h-[36px]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
