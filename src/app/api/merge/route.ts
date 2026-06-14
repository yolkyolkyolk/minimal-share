import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    if (!adminDb) return new NextResponse('Admin not initialized', { status: 500 });

    try {
        const masterHouseholdId = "ebEUHgo2gP6EjmiRqmRW";
        const masterHhRef = adminDb.collection('households').doc(masterHouseholdId);
        
        // Find all users who are NOT the unknown member
        const usersSnap = await adminDb.collection('users').get();
        const validUsers = usersSnap.docs.filter(doc => doc.data().name !== "");

        const newMembers = validUsers.map(doc => doc.id);

        // Update master household with all valid members
        await masterHhRef.update({ members: newMembers });

        // Update each valid user's document to point ONLY to the master household
        for (const userDoc of validUsers) {
            await userDoc.ref.update({ households: [masterHouseholdId] });

            // If this user belonged to other households, copy their statuses to the master household
            const oldHouseholds = userDoc.data().households || [];
            for (const oldHhId of oldHouseholds) {
                if (oldHhId !== masterHouseholdId) {
                    const oldStatusesSnap = await adminDb.collection('households').doc(oldHhId).collection('statuses').where('userId', '==', userDoc.id).get();
                    
                    for (const statusDoc of oldStatusesSnap.docs) {
                        const statusData = statusDoc.data();
                        await masterHhRef.collection('statuses').doc(statusDoc.id).set(statusData);
                        // Delete the old status
                        await statusDoc.ref.delete();
                    }
                }
            }
        }

        return NextResponse.json({ success: true, message: "Households merged successfully", newMembers });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
