import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    if (!adminDb) return new NextResponse('Admin not initialized', { status: 500 });
    try {
        const usersSnap = await adminDb.collection('users').get();
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const hhSnap = await adminDb.collection('households').get();
        const households = hhSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ users, households });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
