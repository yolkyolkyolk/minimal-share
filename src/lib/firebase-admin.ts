import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      // Handle the case where private_key might have escaped newlines
      const parsedKey = JSON.parse(serviceAccountKey);
      if (parsedKey.private_key) {
        parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(parsedKey)
      });
    } catch (e) {
      console.error('Firebase Admin init error', e);
    }
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
