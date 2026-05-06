import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { format, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';

// Vercel cron calls this route
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!adminDb) {
      return new NextResponse('Firebase Admin not initialized', { status: 500 });
    }

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!discordWebhookUrl) {
      return new NextResponse('Discord webhook URL not configured', { status: 500 });
    }

    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    const datesToFetch = [
      format(today, 'yyyy-MM-dd'),
      format(tomorrow, 'yyyy-MM-dd')
    ];

    const householdsSnap = await adminDb.collection('households').get();
    
    if (householdsSnap.empty) {
      return NextResponse.json({ success: true, message: "No households found" });
    }

    let messageContent = "🏠 **本日の生活ステータス共有** 🏠\n\n";

    for (const householdDoc of householdsSnap.docs) {
      const statusesRef = householdDoc.ref.collection('statuses');
      
      for (const dateStr of datesToFetch) {
        const displayDate = format(new Date(dateStr), "M月d日(E)", { locale: ja });
        messageContent += `📅 **${displayDate}**\n`;

        const statusesSnap = await statusesRef.where('date', '==', dateStr).get();
        
        if (statusesSnap.empty) {
          messageContent += `> 記録がありません。\n\n`;
          continue;
        }

        statusesSnap.docs.forEach((doc, index) => {
          const data = doc.data();
          const workEmoji = data.work === 1 ? "💼 (Work)" : data.work === 2 ? "🏠 (Remote)" : "休み";
          const backAtStr = data.work === 1 || data.work === 2 ? ` 🕐 ${data.backAt || "---"}` : "";
          
          const eatOutStr = data.eatOut === 2 ? "🍽️ 外食あり" : "";
          const stayOutStr = data.stayOut === 2 ? "🛏️ 外泊あり" : "";
          const inviteStr = data.invite === 2 ? "👥☀️ 来客(昼)" : "";
          const guestStayStr = data.guestStay === 2 ? "👥🌃 来客(泊)" : "";
          const memoStr = data.memo ? `📝 ${data.memo}` : "";

          const extras = [eatOutStr, stayOutStr, inviteStr, guestStayStr, memoStr].filter(Boolean).join(" / ");
          
          messageContent += `> 👤 メンバー${index + 1}: ${workEmoji}${backAtStr}\n`;
          if (extras) {
            messageContent += `> └ ${extras}\n`;
          }
        });
        messageContent += "\n";
      }
    }

    // Send to Discord
    const response = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: messageContent }),
    });

    if (!response.ok) {
      console.error("Discord webhook failed", await response.text());
      return new NextResponse('Failed to send to Discord', { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in Discord cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
