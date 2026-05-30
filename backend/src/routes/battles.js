import { Router } from "express";
import { neon } from "@neondatabase/serverless";

const router = Router();

const sql = neon(process.env.DATABASE_URL);

async function initTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS battles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      battle_name TEXT NOT NULL,
      goal_text TEXT NOT NULL,
      user_1_id UUID NOT NULL,
      user_2_id UUID NOT NULL,
      user_1_score TEXT DEFAULT '0',
      user_2_score TEXT DEFAULT '0',
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS battle_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      battle_id UUID NOT NULL,
      user_id UUID NOT NULL,
      week_number TEXT NOT NULL,
      effort_score TEXT NOT NULL,
      log_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
    await sql`
    CREATE TABLE IF NOT EXISTS share_snapshots (
      id TEXT PRIMARY KEY,
      goal TEXT NOT NULL,
      summary TEXT,
      score INTEGER DEFAULT 0,
      streak TEXT,
      weeks_active INTEGER DEFAULT 0,
      timeline JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
console.log("Battle tables ready");

}

initTables().catch(console.error);

// Create a new battle
router.post("/api/battles/create", async (req, res) => {
  try {
    const { battle_name, goal_text, user_1_id, user_2_id } = req.body;
    if (!battle_name || !goal_text || !user_1_id || !user_2_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }


    const rows = await sql`
      INSERT INTO battles (battle_name, goal_text, user_1_id, user_2_id)
      VALUES (${battle_name}, ${goal_text}, ${user_1_id}, ${user_2_id})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get battle details + leaderboard
router.get("/api/battles/:battle_id", async (req, res) => {
  try {
    const { battle_id } = req.params;


    const battles = await sql`
      SELECT * FROM battles WHERE id = ${battle_id}
    `;
    if (!battles[0]) return res.status(404).json({ error: "Battle not found" });
    const battle = battles[0];



    const logs = await sql`
      SELECT * FROM battle_logs WHERE battle_id = ${battle_id} ORDER BY created_at DESC
    `;

    const user_1_effort = logs
      .filter((l) => l.user_id === battle.user_1_id)
      .reduce((sum, l) => sum + Number(l.effort_score || 0), 0);

    const user_2_effort = logs
      .filter((l) => l.user_id === battle.user_2_id)
      .reduce((sum, l) => sum + Number(l.effort_score || 0), 0);

    res.json({
      ...battle,
      user_1_total_effort: user_1_effort,
      user_2_total_effort: user_2_effort,
      user_1_weeks_logged: logs.filter((l) => l.user_id === battle.user_1_id).length,
      user_2_weeks_logged: logs.filter((l) => l.user_id === battle.user_2_id).length,
      logs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Log a week in a battle
router.post("/api/battles/:battle_id/log", async (req, res) => {
  try {
    const { battle_id } = req.params;
    const { user_id, week_number, effort_score, log_text } = req.body;
    if (!user_id || !week_number || !effort_score) {
      return res.status(400).json({ error: "Missing required fields" });
    }


    const rows = await sql`
      INSERT INTO battle_logs (battle_id, user_id, week_number, effort_score, log_text)
      VALUES (${battle_id}, ${user_id}, ${week_number}, ${String(effort_score)}, ${log_text || null})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's active battles
router.get("/api/users/:user_id/battles", async (req, res) => {
  try {
    const { user_id } = req.params;



    const userBattles = await sql`
      SELECT * FROM battles 
      WHERE (user_1_id = ${user_id} OR user_2_id = ${user_id}) AND status = 'active'
      ORDER BY created_at DESC
    `;
    res.json(userBattles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Lookup user by email
router.get("/api/users/lookup", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });


    const rows = await sql`
      SELECT id, email, display_name FROM users WHERE email = ${email}
    `;
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Save a share snapshot
router.post("/api/shares", async (req, res) => {
  try {
    const { id, goal, summary, score, streak, weeks_active, timeline } = req.body;
    if (!id || !goal) return res.status(400).json({ error: "Missing required fields" });

    const data = { goal, summary, score, streak, weeks_active, timeline };

    await sql`
      INSERT INTO share_snapshots (id, data)
      VALUES (${id}, ${JSON.stringify(data)})
      ON CONFLICT (id) DO NOTHING
    `;
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get a share snapshot
router.get("/api/shares/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await sql`SELECT id, data, created_at FROM share_snapshots WHERE id = ${id}`;
    if (!rows[0]) return res.status(404).json({ error: "Share not found" });
    const record = rows[0];
    res.json({ ...record.data, id: record.id, created_at: record.created_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get recent public spirals
router.get("/api/spirals/public", async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, data, created_at
      FROM share_snapshots
      ORDER BY created_at DESC
      
      `;
    res.json(rows.map(r => ({ ...r.data, id: r.id, created_at: r.created_at })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;