import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const getAnthropicClient = () =>
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  });

const formatCheckIns = (checkIns: any[] = []) => {
  if (!Array.isArray(checkIns) || checkIns.length === 0) {
    return 'No check-ins yet.';
  }

  return checkIns
    .slice(-10)
    .map((checkIn: any) => {
      const week = checkIn.week_number || checkIn.week || checkIn.weekNumber || 'unknown';
      const note = checkIn.log_text || checkIn.note || checkIn.notes || checkIn.text || checkIn.message || 'No notes';
      const effort = checkIn.effort_score || checkIn.effortScore || checkIn.effort;
      return `- Week ${week}${effort ? `, effort ${effort}/10` : ''}: ${note}`;
    })
    .join('\n');
};

const formatCoachMessages = (messages: any[] = []) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'No previous coach messages in this conversation.';
  }

  return messages
    .slice(-8)
    .map((item: any) => `${item.role === 'assistant' ? 'Coach' : 'User'}: ${item.content || item.message || ''}`)
    .join('\n');
};

const buildCoachPrompt = ({
  message,
  goalText,
  currentWeek,
  currentStreak,
  checkIns,
  previousMessages,
}: {
  message: string;
  goalText?: string;
  currentWeek?: number;
  currentStreak?: number;
  checkIns?: any[];
  previousMessages?: any[];
}) => `You are the AI Spiral Coach. Be honest, direct, no corporate speak.

User's goal: ${goalText || 'Not set yet'}
Week: ${currentWeek || 1}/26
Streak: ${currentStreak || 0} weeks
Past check-ins:
${formatCheckIns(checkIns)}

Recent coach conversation:
${formatCoachMessages(previousMessages)}

They just said: ${message}

Give real feedback. Keep it under 150 words. Raw and honest.`;

type DailyQuoteRequest = {
  goalText?: string;
  currentStreak?: number;
  currentWeek?: number;
};

const quoteCache = new Map<string, { quote: string; author: string; generatedFor: string; streakTone: string }>();

const getDailyQuoteKey = (goalText?: string, currentStreak?: number) => {
  const day = new Date().toISOString().slice(0, 10);
  return `${day}:${String(goalText || 'general').toLowerCase().trim().slice(0, 80)}:${Number(currentStreak || 0)}`;
};

const getStreakTone = (currentStreak?: number) => {
  const streak = Number(currentStreak || 0);
  if (streak >= 12) return 'Inferno streak — protect the identity you have built.';
  if (streak >= 6) return 'Strong flame — keep stacking boring wins.';
  if (streak >= 2) return 'Flame building — do not negotiate with the old pattern.';
  return 'Spark stage — make the next action tiny enough to start now.';
};

const buildDailyQuotePrompt = ({ goalText, currentStreak, currentWeek }: DailyQuoteRequest) => `Generate one original motivational quote for a Spiral goal tracker user.

Goal: ${goalText || 'Build a better habit'}
Current week: ${currentWeek || 1}/26
Current streak: ${currentStreak || 0} weeks
Streak tone: ${getStreakTone(currentStreak)}

Return ONLY valid JSON with this exact shape:
{"quote":"one punchy quote under 24 words","author":"Spiral Coach"}

Make it specific to the goal and streak. No clichés. No markdown.`;

const fallbackDailyQuote = ({ goalText, currentStreak }: DailyQuoteRequest) => {
  const streak = Number(currentStreak || 0);
  const goal = goalText?.trim() || 'the goal';
  if (streak >= 8) return { quote: `Your streak is proof. Today, defend ${goal} like it already belongs to you.`, author: 'Spiral Coach' };
  if (streak >= 3) return { quote: `Momentum is fragile. One honest rep for ${goal} keeps the flame alive.`, author: 'Spiral Coach' };
  return { quote: `Do not wait to feel ready. Give ${goal} ten clean minutes today.`, author: 'Spiral Coach' };
};

type WeeklyReflectionRequest = {
  goalText?: string;
  currentWeek?: number;
  currentStreak?: number;
  checkIns?: any[];
};

const reflectionCache = new Map<string, { questions: string[]; focus: string; generatedFor: string; source: string }>();

const getWeeklyReflectionKey = ({ goalText, currentWeek, currentStreak, checkIns }: WeeklyReflectionRequest) => {
  const latest = Array.isArray(checkIns) && checkIns.length ? checkIns.slice(-1)[0] : {};
  const latestSignal = `${latest.week_number || latest.week || currentWeek || 1}:${latest.effort_score || latest.effortScore || latest.effort || 0}:${String(latest.log_text || latest.note || '').slice(0, 60)}`;
  return `${String(goalText || 'general').toLowerCase().trim().slice(0, 80)}:${currentWeek || 1}:${currentStreak || 0}:${latestSignal}`;
};

const buildWeeklyReflectionPrompt = ({ goalText, currentWeek, currentStreak, checkIns }: WeeklyReflectionRequest) => `Generate end-of-week reflection prompts for a Spiral goal tracker user.

Goal: ${goalText || 'Build a better habit'}
Week ending: ${currentWeek || 1}/26
Current streak: ${currentStreak || 0} weeks
Recent check-ins:
${formatCheckIns(checkIns)}

Return ONLY valid JSON with this exact shape:
{"focus":"one short theme for this week","questions":["question 1","question 2","question 3"]}

Questions should be specific, uncomfortable but useful, and include blockers/surprises/next adjustment. No markdown.`;

const fallbackWeeklyReflection = ({ goalText, currentWeek, currentStreak, checkIns }: WeeklyReflectionRequest) => {
  const latest = Array.isArray(checkIns) && checkIns.length ? checkIns.slice(-1)[0] : null;
  const effort = Number(latest?.effort_score || latest?.effortScore || latest?.effort || 0);
  const goal = goalText?.trim() || 'your goal';
  const focus = effort >= 7 ? 'Protect what worked' : effort > 0 ? 'Find the leak' : 'Restart without drama';
  return {
    focus,
    questions: [
      `What blocked ${goal} most during week ${currentWeek || 1}, and was it real or avoidable?`,
      `What surprised you about your effort${currentStreak ? ` after a ${currentStreak}-week streak` : ''}?`,
      `What is the smallest adjustment that would make next week easier to start?`,
    ],
  };
};

type CoachMessageRecord = {
  conversation_key: string;
  role: 'user' | 'assistant';
  content: string;
  goal_text?: string;
  current_week?: number;
  current_streak?: number;
  metadata?: Record<string, unknown>;
};

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
};

const getConversationKey = (body: any) => {
  const raw = body.conversationId || body.conversationKey || body.goalId || body.goal_id || body.userId || body.user_id || body.goalText || 'default';
  return String(raw).slice(0, 180);
};

const loadCoachMessages = async (conversationKey: string) => {
  const config = getSupabaseConfig();
  if (!config) return [];

  try {
    const url = `${config.url}/rest/v1/coach_messages?conversation_key=eq.${encodeURIComponent(conversationKey)}&select=role,content,created_at&order=created_at.asc&limit=12`;
    const response = await fetch(url, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
    });

    if (!response.ok) {
      console.error('Supabase coach message load failed', { status: response.status, body: await response.text() });
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Supabase coach message load error', error);
    return [];
  }
};

const storeCoachMessages = async (records: CoachMessageRecord[]) => {
  const config = getSupabaseConfig();
  if (!config || records.length === 0) return;

  try {
    const response = await fetch(`${config.url}/rest/v1/coach_messages`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(records),
    });

    if (!response.ok) {
      console.error('Supabase coach message store failed', { status: response.status, body: await response.text() });
    }
  } catch (error) {
    console.error('Supabase coach message store error', error);
  }
};

router.post('/api/coach/daily-quote', async (req: Request, res: Response) => {
  try {
    const { goalText, goal, currentStreak, currentWeek } = req.body || {};
    const request: DailyQuoteRequest = {
      goalText: goalText || goal,
      currentStreak: Number(currentStreak || 0),
      currentWeek: Number(currentWeek || 1),
    };
    const cacheKey = getDailyQuoteKey(request.goalText, request.currentStreak);
    const cached = quoteCache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    let quotePayload = fallbackDailyQuote(request);
    let source = 'fallback';

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 120,
          system: buildDailyQuotePrompt(request),
          messages: [{ role: 'user', content: 'Create today\'s motivational quote.' }],
        });
        const raw = response.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('')
          .trim();
        const parsed = JSON.parse(raw);
        if (parsed?.quote && typeof parsed.quote === 'string') {
          quotePayload = {
            quote: parsed.quote.trim().slice(0, 220),
            author: typeof parsed.author === 'string' && parsed.author.trim() ? parsed.author.trim().slice(0, 80) : 'Spiral Coach',
          };
          source = 'anthropic';
        }
      } catch (error: any) {
        console.error('Daily quote Claude generation failed; using fallback', {
          status: error?.status,
          message: error?.message,
        });
      }
    }

    const payload = {
      ...quotePayload,
      generatedFor: request.goalText || 'Build a better habit',
      streakTone: getStreakTone(request.currentStreak),
      source,
    };
    quoteCache.set(cacheKey, payload);
    return res.json(payload);
  } catch (error: any) {
    console.error('Daily quote API error:', error);
    return res.status(500).json({ error: 'Could not generate daily quote', details: error?.message || 'Unknown error' });
  }
});

router.post('/api/coach/weekly-reflection', async (req: Request, res: Response) => {
  try {
    const { goalText, goal, currentWeek, currentStreak, checkIns } = req.body || {};
    const request: WeeklyReflectionRequest = {
      goalText: goalText || goal,
      currentWeek: Number(currentWeek || 1),
      currentStreak: Number(currentStreak || 0),
      checkIns: Array.isArray(checkIns) ? checkIns : [],
    };
    const cacheKey = getWeeklyReflectionKey(request);
    const cached = reflectionCache.get(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    let reflectionPayload = fallbackWeeklyReflection(request);
    let source = 'fallback';

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 220,
          system: buildWeeklyReflectionPrompt(request),
          messages: [{ role: 'user', content: 'Create this week\'s reflection prompts.' }],
        });
        const raw = response.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('')
          .trim();
        const parsed = JSON.parse(raw);
        if (parsed?.focus && Array.isArray(parsed.questions) && parsed.questions.length) {
          reflectionPayload = {
            focus: String(parsed.focus).trim().slice(0, 100),
            questions: parsed.questions.slice(0, 4).map((question: unknown) => String(question).trim()).filter(Boolean),
          };
          source = 'anthropic';
        }
      } catch (error: any) {
        console.error('Weekly reflection Claude generation failed; using fallback', {
          status: error?.status,
          message: error?.message,
        });
      }
    }

    const payload = {
      ...reflectionPayload,
      generatedFor: request.goalText || 'Build a better habit',
      source,
    };
    reflectionCache.set(cacheKey, payload);
    return res.json(payload);
  } catch (error: any) {
    console.error('Weekly reflection API error:', error);
    return res.status(500).json({ error: 'Could not generate weekly reflection', details: error?.message || 'Unknown error' });
  }
});

router.post('/api/coach/message', async (req: Request, res: Response) => {
  try {
    const { message, goalText, currentWeek, currentStreak, checkIns } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Coach API error: ANTHROPIC_API_KEY not configured');
      return res.status(503).json({
        error: 'Claude API key is not configured',
        details: 'ANTHROPIC_API_KEY is missing from the backend environment.',
      });
    }

    const conversationKey = getConversationKey(req.body);
    const previousMessages = await loadCoachMessages(conversationKey);
    await storeCoachMessages([
      {
        conversation_key: conversationKey,
        role: 'user',
        content: message.trim(),
        goal_text: goalText || '',
        current_week: Number(currentWeek || 1),
        current_streak: Number(currentStreak || 0),
        metadata: { checkIns: Array.isArray(checkIns) ? checkIns.slice(-10) : [] },
      },
    ]);

    const anthropic = getAnthropicClient();
    const systemPrompt = buildCoachPrompt({ message, goalText, currentWeek, currentStreak, checkIns, previousMessages });
    const modelsToTry = ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'];
    let response: Awaited<ReturnType<typeof anthropic.messages.create>> | null = null;
    let lastAnthropicError: unknown = null;

    for (const model of modelsToTry) {
      try {
        response = await anthropic.messages.create({
          model,
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: message.trim() }],
        });
        console.log('Coach API Claude response received', { model, conversationKey });
        break;
      } catch (error: any) {
        lastAnthropicError = error;
        console.error('Coach API Claude call failed', {
          model,
          conversationKey,
          status: error?.status,
          type: error?.error?.type || error?.type,
          message: error?.message,
        });
      }
    }

    if (!response) {
      return res.status(502).json({
        error: 'Claude coach request failed',
        details: lastAnthropicError instanceof Error ? lastAnthropicError.message : 'Unknown Claude error',
      });
    }

    const text = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('')
      .trim();

    const coachResponse = text || 'Coach is thinking...';
    await storeCoachMessages([
      {
        conversation_key: conversationKey,
        role: 'assistant',
        content: coachResponse,
        goal_text: goalText || '',
        current_week: Number(currentWeek || 1),
        current_streak: Number(currentStreak || 0),
        metadata: { source: 'anthropic' },
      },
    ]);

    res.json({ response: coachResponse });
  } catch (error: any) {
    console.error('Coach message API error:', error);
    res.status(500).json({ error: 'Coach is thinking...' });
  }
});

router.post('/api/coach', async (req: Request, res: Response) => {
  try {
    const { message, goal, goalText, currentWeek, currentStreak, checkIns, recentCheckIns } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Coach API error: ANTHROPIC_API_KEY not configured');
      return res.status(503).json({
        error: 'Claude API key is not configured',
        details: 'ANTHROPIC_API_KEY is missing from the backend environment.',
      });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const anthropic = getAnthropicClient();
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: buildCoachPrompt({
        message,
        goalText: goalText || goal,
        currentWeek,
        currentStreak,
        checkIns: checkIns || recentCheckIns,
      }),
      messages: [{ role: 'user', content: message }],
      stream: true,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Coach API error:', error);
    res.status(500).json({ error: 'Coach is thinking...' });
  }
});

export default router;
