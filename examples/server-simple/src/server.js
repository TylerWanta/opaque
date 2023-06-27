import cors from "cors";
import express from "express";
import * as opaque from "@serenity-kit/opaque";
import Database, { readDatabaseFile, writeDatabaseFile } from "./database.js";

/**
 * @type {Record<string, string>}
 */
const activeSessions = {};
const dbFile = "./data.json";
const enableJsonFilePersistence = !process.argv.includes("--no-fs");

/**
 * @param {string} filePath
 */
async function initDatabase(filePath) {
  await opaque.ready;
  if (!enableJsonFilePersistence) {
    return Database.empty(opaque.server.createServerSetup());
  }
  try {
    return readDatabaseFile(filePath);
  } catch (err) {
    console.log("failed to open database, initializing empty", err);
    const db = Database.empty(opaque.server.createServerSetup());
    return db;
  }
}

/**
 * @type {Database}
 */
let db;

/**
 * @type {string}
 */
let serverSetup;

async function setupDb() {
  db = await initDatabase(dbFile);
  serverSetup = db.serverSetup;

  if (enableJsonFilePersistence) {
    writeDatabaseFile(dbFile, db);
    db.addListener(() => {
      writeDatabaseFile(dbFile, db);
    });
  }
}

const app = express();
app.use(express.json());
app.use(cors());

/**
 *
 * @param {import("express").Response} res
 * @param {number} status
 * @param {string} error
 */
function sendError(res, status, error) {
  res.writeHead(status);
  res.end(JSON.stringify({ error }));
}

app.post("/register/start", (req, res) => {
  const { userIdentifier, registrationRequest } = req.body || {};

  if (!userIdentifier) return sendError(res, 400, "missing userIdentifier");
  if (!registrationRequest)
    return sendError(res, 400, "missing registrationRequest");
  if (db.hasUser(userIdentifier))
    return sendError(res, 400, "user already registered");

  const registrationResponse = opaque.server.startRegistration({
    serverSetup,
    userIdentifier,
    registrationRequest,
  });

  res.send({ registrationResponse });
  res.end();
});

app.post("/register/finish", (req, res) => {
  const { userIdentifier, registrationUpload } = req.body || {};
  if (!userIdentifier) return sendError(res, 400, "missing userIdentifier");
  if (!registrationUpload)
    return sendError(res, 400, "missing registrationUpload");
  const passwordFile = opaque.server.finishRegistration(registrationUpload);
  db.setUser(userIdentifier, passwordFile);
  res.writeHead(200);
  res.end();
});

app.post("/login/start", (req, res) => {
  const { userIdentifier, credentialRequest } = req.body || {};
  const passwordFile = userIdentifier && db.getUser(userIdentifier);

  if (!userIdentifier) return sendError(res, 400, "missing userIdentifier");
  if (!credentialRequest)
    return sendError(res, 400, "missing credentialRequest");
  if (!passwordFile) return sendError(res, 400, "user not registered");
  if (db.hasLogin(userIdentifier))
    return sendError(res, 400, "login already started");

  const { serverLogin, credentialResponse } = opaque.server.startLogin({
    serverSetup,
    userIdentifier,
    passwordFile,
    credentialRequest,
  });

  db.setLogin(userIdentifier, serverLogin);
  res.send({ credentialResponse });
  res.end();
});

app.post("/login/finish", (req, res) => {
  const { userIdentifier, credentialFinalization } = req.body || {};
  const serverLogin = userIdentifier && db.getLogin(userIdentifier);

  if (!userIdentifier) return sendError(res, 400, "missing userIdentifier");
  if (!credentialFinalization)
    return sendError(res, 400, "missing credentialFinalization");
  if (!serverLogin) return sendError(res, 400, "login not started");

  const sessionKey = opaque.server.finishLogin({
    credentialFinalization,
    serverLogin,
  });

  activeSessions[sessionKey] = userIdentifier;
  db.removeLogin(userIdentifier);
  res.writeHead(200);
  res.end();
});

app.post("/logout", (req, res) => {
  const auth = req.get("authorization");
  const userIdentifier = auth && activeSessions[auth];
  if (!auth) return sendError(res, 401, "missing authorization header");
  if (!userIdentifier) return sendError(res, 401, "no active session");

  delete activeSessions[userIdentifier];
  res.end();
});

app.get("/private", (req, res) => {
  const auth = req.get("authorization");
  const user = auth && activeSessions[auth];
  if (!auth) return sendError(res, 401, "missing authorization header");
  if (!user) return sendError(res, 401, "no active session");

  res.send({ message: `hello ${user} from opaque-authenticated world` });
  res.end();
});

async function main() {
  await setupDb();
  const port = 8089;
  app.listen(port, () => {
    console.log(`listening on port ${port}`);
  });
}

main();
