import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import coachRouter from "./routes/coach.js";

const app = express();
const PORT = process.env.PORT || 8000;
const rawSql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const DB_QUERY_TIMEOUT_MS = 8000;
const sql = rawSql
  ? (strings, ...values) =>
      Promise.race([
        rawSql(strings, ...values),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Database query timed out after ${DB_QUERY_TIMEOUT_MS}ms`)), DB_QUERY_TIMEOUT_MS),
        ),
      ])
  : null;
const JWT_SECRET = process.env.JWT_SECRET || crypto.createHash("sha256").update(process.env.DATABASE_URL || "spiral-dev-secret").digest("hex");

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const signJwt = (payload) => {
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 };
  const unsigned = `${base64url(header)}.${base64url(body)}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
};

const verifyJwt = (token) => {
  const [encodedHeader, encodedBody, signature] = String(token || "").split(".");
  if (!encodedHeader || !encodedBody || !signature) return null;

  const unsigned = `${encodedHeader}.${encodedBody}`;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(unsigned).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const payload = JSON.parse(Buffer.from(encodedBody, "base64url").toString("utf8"));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
};

const allowedOrigins = new Set([
  "https://spiralchaosbgrj.prettiflow.com",
  "https://www.spiralchaosbgrj.prettiflow.com",
  "https://3000-ijv3f6kbjc42spen63n2m.prettiflow.com",
  "https://3000-ijv3f6kbjc42spen63n2m.e2b.app",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || origin?.includes("prettiflow") || origin?.includes("e2b")) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  if (req.path === "/api/auth/login") {
    const startedAt = Date.now();
    const requestId = crypto.randomUUID();
    req.authLog = { requestId, startedAt };

    console.info("[auth/login] request received", {
      requestId,
      method: req.method,
      email: typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : null,
      hasPassword: typeof req.body?.password === "string" && req.body.password.length > 0,
      origin: req.headers.origin || null,
      userAgent: req.headers["user-agent"] || null,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
    });

    res.on("finish", () => {
      console.info("[auth/login] response sent", {
        requestId,
        statusCode: res.statusCode,
        elapsedMs: Date.now() - startedAt,
      });
    });
  }

  next();
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON body. Send valid JSON and try again." });
  }

  next(error);
});

// Auth is stateless: JWT verification is the source of truth, so backend restarts
// and redeploys do not invalidate users by wiping an in-memory session registry.

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash = "") => {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const attempted = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempted, "hex"));
};

const requireDatabase = () => {
  if (!sql) {
    const error = new Error("Auth database is missing. DATABASE_URL is not set, so nobody gets in.");
    error.status = 500;
    throw error;
  }
};

let authTablesReadyPromise = null;
const ensureAuthTables = async () => {
  requireDatabase();
  if (!authTablesReadyPromise) {
    authTablesReadyPromise = sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.catch((error) => {
      authTablesReadyPromise = null;
      throw error;
    });
  }
  return authTablesReadyPromise;
};

let shareSnapshotsTableReadyPromise = null;
const ensureShareSnapshotsTable = async () => {
  requireDatabase();
  if (!shareSnapshotsTableReadyPromise) {
    shareSnapshotsTableReadyPromise = sql`
      CREATE TABLE IF NOT EXISTS share_snapshots (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.catch((error) => {
      shareSnapshotsTableReadyPromise = null;
      throw error;
    });
  }
  return shareSnapshotsTableReadyPromise;
};

let coachMessagesTableReadyPromise = null;
const ensureCoachMessagesTable = async () => {
  requireDatabase();
  if (!coachMessagesTableReadyPromise) {
    coachMessagesTableReadyPromise = sql`
      CREATE TABLE IF NOT EXISTS coach_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_key TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        goal_text TEXT,
        current_week INTEGER,
        current_streak INTEGER,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(async () => {
      await sql`CREATE INDEX IF NOT EXISTS coach_messages_conversation_created_idx ON coach_messages (conversation_key, created_at)`;
    }).catch((error) => {
      coachMessagesTableReadyPromise = null;
      throw error;
    });
  }
  return coachMessagesTableReadyPromise;
};

const formatCoachCheckIns = (checkIns = []) => {
  if (!Array.isArray(checkIns) || checkIns.length === 0) return "No check-ins yet.";
  return checkIns
    .slice(-10)
    .map((checkIn) => {
      const week = checkIn.week_number || checkIn.week || checkIn.weekNumber || "unknown";
      const note = checkIn.log_text || checkIn.note || checkIn.notes || checkIn.text || checkIn.message || "No notes";
      const effort = checkIn.effort_score || checkIn.effortScore || checkIn.effort;
      return `- Week ${week}${effort ? `, effort ${effort}/10` : ""}: ${note}`;
    })
    .join("\n");
};

const formatPreviousCoachMessages = (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) return "No previous coach messages in this conversation.";
  return messages
    .slice(-8)
    .map((item) => `${item.role === "assistant" ? "Coach" : "User"}: ${item.content || item.message || ""}`)
    .join("\n");
};

const getCoachConversationKey = (body) => {
  const raw = body.conversationId || body.conversationKey || body.goalId || body.goal_id || body.userId || body.user_id || body.goalText || "default";
  return String(raw).slice(0, 180);
};

const buildCoachSystemPrompt = ({ message, goalText, currentWeek, currentStreak, checkIns, previousMessages }) => `You are the AI Spiral Coach. Be honest, direct, no corporate speak.

User's goal: ${goalText || "Not set yet"}
Week: ${currentWeek || 1}/26
Streak: ${currentStreak || 0} weeks
Past check-ins:
${formatCoachCheckIns(checkIns)}

Recent coach conversation:
${formatPreviousCoachMessages(previousMessages)}

They just said: ${message}

Give real feedback. Keep it under 150 words. Raw and honest.`;

const getAnthropicClient = async () => {
  const AnthropicModule = await import("@anthropic-ai/sdk");
  const Anthropic = AnthropicModule.default;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
};

app.post("/api/coach/message", async (req, res) => {
  try {
    const { message, goalText, currentWeek, currentStreak, checkIns } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("Coach API error: ANTHROPIC_API_KEY not configured");
      return res.status(500).json({ error: "Coach is thinking..." });
    }

    const conversationKey = getCoachConversationKey(req.body || {});
    let previousMessages = [];

    if (sql) {
      await ensureCoachMessagesTable();
      previousMessages = await sql`
        SELECT role, content, created_at
        FROM coach_messages
        WHERE conversation_key = ${conversationKey}
        ORDER BY created_at ASC
        LIMIT 12
      `;

      await sql`
        INSERT INTO coach_messages (conversation_key, role, content, goal_text, current_week, current_streak, metadata)
        VALUES (${conversationKey}, 'user', ${message.trim()}, ${goalText || ""}, ${Number(currentWeek || 1)}, ${Number(currentStreak || 0)}, ${JSON.stringify({ checkIns: Array.isArray(checkIns) ? checkIns.slice(-10) : [] })}::jsonb)
      `;
    }

    const response = await getAnthropicClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: buildCoachSystemPrompt({ message: message.trim(), goalText, currentWeek, currentStreak, checkIns, previousMessages }),
      messages: [{ role: "user", content: message.trim() }],
    });

    const coachResponse = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim() || "Coach is thinking...";

    if (sql) {
      await sql`
        INSERT INTO coach_messages (conversation_key, role, content, goal_text, current_week, current_streak, metadata)
        VALUES (${conversationKey}, 'assistant', ${coachResponse}, ${goalText || ""}, ${Number(currentWeek || 1)}, ${Number(currentStreak || 0)}, ${JSON.stringify({ source: "anthropic" })}::jsonb)
      `;
    }

    res.json({ response: coachResponse });
  } catch (error) {
    console.error("Coach message API error:", error);
    res.status(500).json({ error: "Coach is thinking..." });
  }
});

app.post("/api/share", async (req, res, next) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  console.info("[share/post] request received", {
    requestId,
    method: req.method,
    path: req.path,
    origin: req.headers.origin || null,
    contentType: req.headers["content-type"] || null,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    bodyKeys: req.body && typeof req.body === "object" ? Object.keys(req.body) : [],
    id: typeof req.body?.id === "string" ? req.body.id.trim() : null,
    hasData: Boolean(req.body?.data),
    hasSnapshot: Boolean(req.body?.snapshot),
  });

  res.on("finish", () => {
    console.info("[share/post] response sent", {
      requestId,
      statusCode: res.statusCode,
      elapsedMs: Date.now() - startedAt,
    });
  });

  try {
    await ensureShareSnapshotsTable();
    console.info("[share/post] share_snapshots table ready", { requestId });

    const id = typeof req.body?.id === "string" ? req.body.id.trim() : "";
    const data = req.body?.data ?? req.body?.snapshot;

    if (!id) {
      return res.status(400).json({ error: "Share snapshot id is required." });
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return res.status(400).json({ error: "Share snapshot data must be an object." });
    }

    console.info("[share/post] writing snapshot", {
      requestId,
      id,
      dataType: typeof data,
      dataKeys: data && typeof data === "object" ? Object.keys(data) : [],
      serializedBytes: Buffer.byteLength(JSON.stringify(data), "utf8"),
    });

    const [savedSnapshot] = await sql`
      INSERT INTO share_snapshots (id, data)
      VALUES (${id}, ${JSON.stringify(data)}::jsonb)
      ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data
      RETURNING id, data, created_at
    `;

    console.info("[share/post] snapshot written", {
      requestId,
      id: savedSnapshot?.id || id,
      createdAt: savedSnapshot?.created_at || null,
      savedDataKeys: savedSnapshot?.data && typeof savedSnapshot.data === "object" ? Object.keys(savedSnapshot.data) : [],
    });

    const [persistedSnapshot] = await sql`
      SELECT id, data, created_at
      FROM share_snapshots
      WHERE id = ${id}
      LIMIT 1
    `;

    console.info("[share/post] persistence verification", {
      requestId,
      requestedId: id,
      persisted: Boolean(persistedSnapshot),
      persistedId: persistedSnapshot?.id || null,
      persistedCreatedAt: persistedSnapshot?.created_at || null,
      persistedDataKeys: persistedSnapshot?.data && typeof persistedSnapshot.data === "object" ? Object.keys(persistedSnapshot.data) : [],
      persistedSerializedBytes: persistedSnapshot?.data ? Buffer.byteLength(JSON.stringify(persistedSnapshot.data), "utf8") : 0,
      usingServerDatabase: Boolean(process.env.DATABASE_URL),
      localStorageUsed: false,
    });

    if (!persistedSnapshot) {
      return res.status(500).json({ error: "Share snapshot write could not be verified in the database." });
    }

    return res.status(201).json({
      id: persistedSnapshot.id,
      data: persistedSnapshot.data,
      createdAt: persistedSnapshot.created_at,
    });
  } catch (error) {
    console.error("[share/post] failed", {
      requestId,
      message: error.message,
      stack: error.stack,
      elapsedMs: Date.now() - startedAt,
    });
    next(error);
  }
});

app.get("/api/share/:id", async (req, res, next) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const id = typeof req.params?.id === "string" ? req.params.id.trim() : "";

  console.info("[share/get] request received", {
    requestId,
    method: req.method,
    path: req.path,
    origin: req.headers.origin || null,
    id,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  });

  res.on("finish", () => {
    console.info("[share/get] response sent", {
      requestId,
      id,
      statusCode: res.statusCode,
      elapsedMs: Date.now() - startedAt,
    });
  });

  try {
    await ensureShareSnapshotsTable();
    console.info("[share/get] share_snapshots table ready", { requestId, id });

    if (!id) {
      console.warn("[share/get] missing snapshot id", { requestId });
      return res.status(400).json({ error: "Share snapshot id is required." });
    }

    console.info("[share/get] reading snapshot", { requestId, id });

    const [snapshot] = await sql`
      SELECT id, data, created_at
      FROM share_snapshots
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!snapshot) {
      console.warn("[share/get] snapshot not found", { requestId, id });
      return res.status(404).json({ error: "Share snapshot not found." });
    }

    console.info("[share/get] snapshot read", {
      requestId,
      id: snapshot.id,
      createdAt: snapshot.created_at || null,
      dataKeys: snapshot.data && typeof snapshot.data === "object" ? Object.keys(snapshot.data) : [],
      serializedBytes: Buffer.byteLength(JSON.stringify(snapshot.data), "utf8"),
    });

    return res.json({
      id: snapshot.id,
      data: snapshot.data,
      createdAt: snapshot.created_at,
    });
  } catch (error) {
    console.error("[share/get] failed", {
      requestId,
      id,
      message: error.message,
      stack: error.stack,
      elapsedMs: Date.now() - startedAt,
    });
    next(error);
  }
});

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  createdAt: user.created_at,
});

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? verifyJwt(token) : null;

  if (!payload?.sub) {
    return res.status(401).json({ error: "You are not logged in. The gate is closed, annoyingly." });
  }

  req.user = { id: payload.sub, email: payload.email };
  next();
};

const monthOneFor = (goal) => {
  const normalized = goal.toLowerCase();

  if (normalized.includes("instagram") || normalized.includes("followers")) {
    return {
      monthOne: "500 followers, 30 posts shipped, and one ugly repeatable content format discovered.",
      weekOne: "Post 5 reels this week no matter what, even bad ones. Track every hook, comment, and cringe spike.",
    };
  }

  if (normalized.includes("startup") || normalized.includes("$10k") || normalized.includes("business")) {
    return {
      monthOne: "Talk to 25 potential buyers, ship a paid offer page, and get the first stranger to say yes or no clearly.",
      weekOne: "DM or email 40 target customers with a painfully specific problem statement. No logo tweaking until the messages are sent.",
    };
  }

  if (normalized.includes("novel") || normalized.includes("book")) {
    return {
      monthOne: "Draft 18,000 messy words and define the ending badly enough that it can be fixed later.",
      weekOne: "Write 4,000 words across any four days. Do not reread chapter one like a haunted perfectionist.",
    };
  }

  if (normalized.includes("marathon") || normalized.includes("run")) {
    return {
      monthOne: "Complete 12 runs, survive one long run, and build the boring base your ego wants to skip.",
      weekOne: "Run 3 times this week: two short shameless jogs and one longer uncomfortable slog. Log the excuses too.",
    };
  }

  return {
    monthOne: "Create the first visible proof that this goal is real: shipped, posted, pitched, measured, or sweated into existence.",
    weekOne: "Spend 5 focused hours making one concrete artifact you can point at. Ugly counts. Invisible planning does not.",
  };
};

function generateBreakdown(goalText, category = "Other") {
  const { monthOne, weekOne } = monthOneFor(goalText);
  const monthly = [
    monthOne,
    `Month 2: double the first signal for ${category.toLowerCase()} — more reps, more public output, more uncomfortable asks.`,
    "Month 3: find the one tactic that worked and repeat it until it gets boring, then repeat it five more times.",
    "Month 4: raise the stakes: bigger audience, heavier weight, harder customers, scarier deadline. No hiding in setup mode.",
    "Month 5: compress everything into a visible sprint. Ship the version people can judge, buy, read, follow, or reject.",
    `Month 6: make the unrealistic goal real enough to leave evidence: ${goalText}. Archive the chaos, keep the receipts.`,
  ];

  const weekly = [
    weekOne,
    "Publish or perform the work 3 times this week and write down exactly what people ignored.",
    "Ask 10 humans for a reaction, sale, share, critique, race pace, or proof. Make rejection measurable.",
    "Review the wreckage, pick one lever, and overdo it next week. Delete one fake task that made you feel productive.",
  ];

  return {
    monthly: monthly.map((milestone_text, index) => ({
      type: "monthly",
      month_number: index + 1,
      week_number: null,
      milestone_text,
    })),
    weekly: weekly.map((milestone_text, index) => ({
      type: "weekly",
      month_number: 1,
      week_number: index + 1,
      milestone_text,
    })),
  };
}

app.get("/", (req, res) => {
  res.json({ status: "ok", app: "Spiral", message: "Backend is awake. Chaos may continue." });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", app: "Spiral" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Spiral" });
});

app.get("/api/health/db", async (req, res) => {
  const startedAt = Date.now();

  try {
    requireDatabase();
    const rows = await sql`SELECT 1 AS ok, NOW() AS checked_at`;

    res.json({
      status: "ok",
      database: "neon",
      databaseUrlConfigured: true,
      responding: rows[0]?.ok === 1,
      checkedAt: rows[0]?.checked_at,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[Health/DB] Neon database check failed", {
      elapsedMs: Date.now() - startedAt,
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      message: error.message,
      stack: error.stack,
    });

    res.status(error.status || 503).json({
      status: "error",
      database: "neon",
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      responding: false,
      error: error.message || "Database health check failed.",
      elapsedMs: Date.now() - startedAt,
    });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    await ensureAuthTables();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email.includes("@") || password.length < 6) {
      return res.status(400).json({ error: "Use a real-ish email and at least 6 password characters. Tiny passwords are how the raccoons get in." });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing.length) {
      return res.status(409).json({ error: "That email already has an account. Login. The past is still here." });
    }

    const created = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${hashPassword(password)})
      RETURNING id, email, created_at
    `;
    console.log("[Signup] User created:", created[0].email);
    const token = signJwt({ sub: created[0].id, email: created[0].email });
    const user = publicUser(created[0]);
    console.log("[Signup] Token issued for:", user.email);

    res.status(201).json({ token, user });
  } catch (error) {
    console.error("Signup failed", error);
    res.status(error.status || 500).json({ error: error.message || "Signup broke. Not your personality, just the server." });
  }
});

const loginHandler = async (req, res) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const email = String(req.body?.email || "").trim().toLowerCase();

  console.log("[Login] Request received", {
    requestId,
    email: email || "<missing>",
    hasPassword: Boolean(req.body?.password),
    origin: req.headers.origin || "<none>",
    userAgent: req.headers["user-agent"] || "<none>",
    path: req.path,
  });

  try {
    requireDatabase();
    console.log("[Login] Database configured; skipping schema DDL in hot login path", { requestId, elapsedMs: Date.now() - startedAt });

    const password = String(req.body?.password || "");

    const rows = await sql`SELECT id, email, password_hash, created_at FROM users WHERE email = ${email} LIMIT 1`;
    const userRow = rows[0];
    console.log("[Login] User lookup completed", {
      requestId,
      email: email || "<missing>",
      found: Boolean(userRow),
      elapsedMs: Date.now() - startedAt,
    });

    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      console.warn("[Login] Authentication rejected", {
        requestId,
        email: email || "<missing>",
        found: Boolean(userRow),
        elapsedMs: Date.now() - startedAt,
      });
      return res.status(401).json({ error: "Wrong email or password. The door did not open." });
    }

    console.log("[Login] User authenticated", { requestId, email: userRow.email, elapsedMs: Date.now() - startedAt });
    const token = signJwt({ sub: userRow.id, email: userRow.email });
    const user = publicUser(userRow);
    console.log("[Login] Token issued", { requestId, email: user.email, elapsedMs: Date.now() - startedAt });

    res.json({ token, user });
  } catch (error) {
    console.error("[Login] Authentication error", {
      requestId,
      email: email || "<missing>",
      elapsedMs: Date.now() - startedAt,
      message: error.message,
      stack: error.stack,
      status: error.status,
    });
    res.status(error.status || 500).json({ error: error.message || "Login face-planted. Try again in a second." });
  }
};

app.post("/api/auth/login", loginHandler);
app.post("/auth/login", loginHandler);

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/logout", authMiddleware, (req, res) => {
  res.json({ ok: true, message: "Logged out. Vanished responsibly." });
});

const ensureGoalTables = async () => {
  requireDatabase();
  await ensureAuthTables();
  await sql`
    CREATE TABLE IF NOT EXISTS goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      goal_text TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      start_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS milestones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      month_number INTEGER,
      week_number INTEGER,
      milestone_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      log_text TEXT NOT NULL,
      effort_score INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.get("/api/goals/active", authMiddleware, async (req, res) => {
  try {
    await ensureGoalTables();
    const rows = await sql`
      SELECT id, user_id, goal_text, category, start_date::text AS start_date, status, created_at
      FROM goals
      WHERE user_id = ${req.user.id} AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return res.json(rows[0] || null);
  } catch (error) {
    console.error("Active goal lookup failed", error);
    return res.status(error.status || 500).json({
      error: error.message || "Could not load your active goal.",
    });
  }
});

app.get("/api/goals/archived", authMiddleware, asyncRoute(async (req, res) => {
  await ensureGoalTables();
  const rows = await sql`
    SELECT id, user_id, goal_text, category, start_date::text AS start_date, status, created_at
    FROM goals
    WHERE user_id = ${req.user.id} AND status = 'archived'
    ORDER BY created_at DESC
  `;
  res.json(rows);
}));

app.post("/api/goals", authMiddleware, asyncRoute(async (req, res) => {
  await ensureGoalTables();
  const { goal_text, category = "Other", start_date } = req.body || {};
  if (!goal_text || !start_date) {
    return res.status(400).json({ error: "goal_text and start_date are required." });
  }

  await sql`
    UPDATE goals
    SET status = 'archived'
    WHERE user_id = ${req.user.id} AND status = 'active'
  `;
  const rows = await sql`
    INSERT INTO goals (user_id, goal_text, category, start_date, status)
    VALUES (${req.user.id}, ${goal_text}, ${category}, ${start_date}, 'active')
    RETURNING id, user_id, goal_text, category, start_date::text AS start_date, status, created_at
  `;
  res.status(201).json(rows[0]);
}));

app.patch("/api/goals/:goalId/archive", authMiddleware, asyncRoute(async (req, res) => {
  await ensureGoalTables();
  const rows = await sql`
    UPDATE goals
    SET status = 'archived'
    WHERE id = ${req.params.goalId} AND user_id = ${req.user.id}
    RETURNING id, user_id, goal_text, category, start_date::text AS start_date, status, created_at
  `;
  if (!rows[0]) return res.status(404).json({ error: "Goal not found." });
  res.json(rows[0]);
}));

app.post("/api/milestones", authMiddleware, asyncRoute(async (req, res) => {
  await ensureGoalTables();
  const rows = Array.isArray(req.body) ? req.body : [];
  if (!rows.length) return res.status(400).json({ error: "At least one milestone is required." });

  const inserted = [];
  for (const row of rows) {
    const allowed = await sql`SELECT id FROM goals WHERE id = ${row.goal_id} AND user_id = ${req.user.id} LIMIT 1`;
    if (!allowed[0]) return res.status(404).json({ error: "Goal not found for milestone." });
    const result = await sql`
      INSERT INTO milestones (goal_id, type, month_number, week_number, milestone_text)
      VALUES (${row.goal_id}, ${row.type}, ${row.month_number ?? null}, ${row.week_number ?? null}, ${row.milestone_text})
      RETURNING id, goal_id, type, month_number, week_number, milestone_text, created_at
    `;
    inserted.push(result[0]);
  }
  res.status(201).json(inserted);
}));

app.get("/api/goals/:goalId/milestones", authMiddleware, asyncRoute(async (req, res) => {
  await ensureGoalTables();
  const allowed = await sql`SELECT id FROM goals WHERE id = ${req.params.goalId} AND user_id = ${req.user.id} LIMIT 1`;
  if (!allowed[0]) return res.status(404).json({ error: "Goal not found." });
  const rows = await sql`
    SELECT id, goal_id, type, month_number, week_number, milestone_text, created_at
    FROM milestones
    WHERE goal_id = ${req.params.goalId}
    ORDER BY COALESCE(month_number, 999), COALESCE(week_number, 999), created_at ASC
  `;
  res.json(rows);
}));

app.get("/api/goals/:goalId/checkins", authMiddleware, asyncRoute(async (req, res) => {
  await ensureGoalTables();
  const allowed = await sql`SELECT id FROM goals WHERE id = ${req.params.goalId} AND user_id = ${req.user.id} LIMIT 1`;
  if (!allowed[0]) return res.status(404).json({ error: "Goal not found." });
  const rows = await sql`
    SELECT id, goal_id, week_number, log_text, effort_score, created_at
    FROM checkins
    WHERE goal_id = ${req.params.goalId}
    ORDER BY week_number DESC, created_at DESC
  `;
  res.json(rows);
}));

app.post("/api/checkins", authMiddleware, asyncRoute(async (req, res) => {
  await ensureGoalTables();
  const { goal_id, week_number, log_text, effort_score } = req.body || {};
  if (!goal_id || !week_number || !log_text || effort_score === undefined) {
    return res.status(400).json({ error: "goal_id, week_number, log_text, and effort_score are required." });
  }
  const allowed = await sql`SELECT id FROM goals WHERE id = ${goal_id} AND user_id = ${req.user.id} LIMIT 1`;
  if (!allowed[0]) return res.status(404).json({ error: "Goal not found." });
  const rows = await sql`
    INSERT INTO checkins (goal_id, week_number, log_text, effort_score)
    VALUES (${goal_id}, ${week_number}, ${log_text}, ${effort_score})
    RETURNING id, goal_id, week_number, log_text, effort_score, created_at
  `;
  res.status(201).json(rows[0]);
}));

app.patch("/api/goals/:id", authMiddleware, asyncRoute(async (req, res) => {
  requireDatabase();

  const { id } = req.params;
  const { goal_text } = req.body || {};
  const nextGoalText = typeof goal_text === "string" ? goal_text.trim() : "";

  if (!nextGoalText) {
    return res.status(400).json({ error: "goal_text is required." });
  }

  const updated = await sql`
    UPDATE goals
    SET goal_text = ${nextGoalText}
    WHERE id = ${id} AND user_id = ${req.user.id}
    RETURNING *
  `;

  if (!updated.length) {
    return res.status(404).json({ error: "Goal not found." });
  }

  return res.json(updated[0]);
}));

app.post("/api/goals/breakdown", (req, res) => {
  const { goalText, category } = req.body || {};

  if (!goalText || typeof goalText !== "string" || goalText.trim().length < 3) {
    return res.status(400).json({ error: "Give Spiral a real absurd goal first. Three characters is not a destiny." });
  }

  res.json(generateBreakdown(goalText.trim(), category));
});

// Register AI coach endpoints before the server starts.
app.use(coachRouter);

app.listen(PORT, () => {
  console.log(`Spiral API running on port ${PORT}`);
});

export default app;
