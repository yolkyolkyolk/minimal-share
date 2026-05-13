import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    if (!adminDb) return new NextResponse('Firebase Admin not initialized', { status: 500 });

    try {
        const usersSnap = await adminDb.collection('users').get();
        const userNames: Record<string, string> = {};
        usersSnap.docs.forEach(doc => {
            userNames[doc.id] = doc.data().name || "";
        });

        const householdsSnap = await adminDb.collection('households').get();
        let deletedMembersFromHousehold = 0;

        for (const doc of householdsSnap.docs) {
            const data = doc.data();
            const members = data.members || [];
            
            // Keep members who have a name (not the empty "メンバー")
            const newMembers = members.filter((uid: string) => {
                const name = userNames[uid] || "";
                return name !== ""; 
            });

            if (newMembers.length !== members.length) {
                await doc.ref.update({ members: newMembers });
                deletedMembersFromHousehold += (members.length - newMembers.length);
            }

            // Delete their statuses as well
            const statusesRef = doc.ref.collection('statuses');
            const statusesSnap = await statusesRef.get();
            for (const statusDoc of statusesSnap.docs) {
                const sData = statusDoc.data();
                if ((userNames[sData.userId] || "") === "") {
                    await statusDoc.ref.delete();
                }
            }
        }

        let deletedUsers = 0;
        for (const uid of Object.keys(userNames)) {
            if (userNames[uid] === "") {
                await adminDb.collection('users').doc(uid).delete();
                deletedUsers++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Removed ${deletedMembersFromHousehold} unknown members from households and deleted ${deletedUsers} unknown user records.` 
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
