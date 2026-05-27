import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  if (!adminDb) return new NextResponse('Firebase Admin not initialized', { status: 500 });

  try {
    const params = await props.params;
    const hhId = params.id;
    const hhRef = adminDb.collection('households').doc(hhId);
    const hhSnap = await hhRef.get();
    
    if (!hhSnap.exists) {
      return new NextResponse('Household not found', { status: 404 });
    }

    const data = hhSnap.data();
    const currentMembers = data?.members || [];

    // Get all statuses ever created in this household
    const statusesSnap = await hhRef.collection('statuses').get();
    const activeUserIds = Array.from(new Set(statusesSnap.docs.map(d => d.data().userId)));

    const missingMembers = activeUserIds.filter(uid => !currentMembers.includes(uid));
    
    if (missingMembers.length === 0) {
      return NextResponse.json({ restored: 0, members: currentMembers });
    }

    const usersToRestore = [];
    for (const uid of missingMembers) {
      const userSnap = await adminDb.collection('users').doc(uid as string).get();
      if (userSnap.exists) {
        const name = userSnap.data()?.name || "";
        // Only restore users who have a name set (so we don't restore the empty 'メンバー')
        if (name !== "") {
          usersToRestore.push(uid);
        }
      }
    }

    if (usersToRestore.length > 0) {
      const newMembers = [...currentMembers, ...usersToRestore];
      await hhRef.update({ members: newMembers });
      return NextResponse.json({ restored: usersToRestore.length, members: newMembers });
    }

    return NextResponse.json({ restored: 0, members: currentMembers });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
