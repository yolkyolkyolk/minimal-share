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
    const hhSnap = await adminDb.collection('households').doc(hhId).get();
    if (!hhSnap.exists) {
      return new NextResponse('Household not found', { status: 404 });
    }

    const data = hhSnap.data();
    const members = data?.members || [];
    
    const names: Record<string, string> = {};
    for (const uid of members) {
      const userSnap = await adminDb.collection('users').doc(uid).get();
      if (userSnap.exists) {
        names[uid] = userSnap.data()?.name || "";
      }
    }

    return NextResponse.json(names);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
