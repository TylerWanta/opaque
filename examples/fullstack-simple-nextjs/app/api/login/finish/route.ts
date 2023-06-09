import * as opaque from "@serenity-kit/opaque";
import { NextRequest, NextResponse } from "next/server";
import database from "../../db";

export async function POST(request: NextRequest) {
  const { userIdentifier, finishLoginRequest } = await request.json();

  if (!userIdentifier)
    return NextResponse.json(
      { error: "missing userIdentifier" },
      { status: 400 }
    );

  if (!finishLoginRequest)
    return NextResponse.json(
      { error: "missing finishLoginRequest" },
      { status: 400 }
    );

  const db = await database;
  const serverLoginState = userIdentifier && db.getLogin(userIdentifier);

  if (!serverLoginState)
    return NextResponse.json({ error: "login not started" }, { status: 400 });

  const { sessionKey } = opaque.server.finishLogin({
    finishLoginRequest,
    serverLoginState,
  });

  await db.removeLogin(userIdentifier);
  return NextResponse.json({ success: true });
}