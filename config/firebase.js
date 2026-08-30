import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Firebase Console > Project Settings > Service Accounts > Generate new private key
// Yuklab olingan JSON faylni serviceAccountKey.json deb saqlang (config papkasida)
// va uni .gitignore ga qo'shishni unutmang!
import { readFileSync } from "fs";
const serviceAccount = JSON.parse(
  readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const db = admin.firestore();
export const authAdmin = admin.auth();
export const FieldValue = admin.firestore.FieldValue;