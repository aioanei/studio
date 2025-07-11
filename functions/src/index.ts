import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";

admin.initializeApp();

// A simple function to generate a random 4-letter code
const generateGameId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createGame = onCall(async (request) => {
  // ...existing code...
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const gameId = generateGameId();
  const gameRef = admin.firestore().collection("games").doc(gameId);

  await gameRef.set({
    hostId: uid,
    status: "waiting",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(`Game ${gameId} created by user ${uid}`);

  return {gameId};
});

export const joinGame = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const {gameId, playerName} = request.data;
  if (!gameId || !playerName) {
    throw new HttpsError("invalid-argument", "Game ID / player name required.");
  }

  const gameRef = admin.firestore().collection("games").doc(gameId);
  const playerRef = gameRef.collection("players").doc(uid);

  const gameDoc = await gameRef.get();
  if (!gameDoc.exists || gameDoc.data()?.status !== "waiting") {
    throw new HttpsError("not-found", "Game not found / has already started.");
  }

  await playerRef.set({
    name: playerName,
    score: 0,
  });

  logger.info(`Player ${playerName} (${uid}) joined game ${gameId}`);
  return {success: true};
});
