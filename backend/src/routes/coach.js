import { Router } from 'express';
import Groq from 'groq-sdk';

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const buildFallbackCoachReply = ({ message, goal, currentWeek, currentStreak, spiralScore }) => {
  const goalLine = goal ? `Your goal is still the center: ${goal}.` : 'Your goal is not clearly set yet, so tighten that first.';
  const weekLine = `Week ${currentWeek || 1}/26, streak ${currentStreak || 0}, spiral score ${spiralScore ?? 'unknown'}%.`;
  const promptLine = message ? `You said: "${String(message).slice(0, 220)}"` : 'You have not given the coach much context yet.';
  return `${goalLine} ${weekLine} ${promptLine} Pick one concrete action for the next 24 hours and do it before you negotiate with yourself. What is the smallest proof you can create today?`;
};

router.post('/api/coach', async (req, res) => {
  try {
    const { message, goal, currentWeek, currentStreak, weeksActive, weeksMissed, spiralScore, recentCheckIns } = req.body;

    const checkInSummary = recentCheckIns && recentCheckIns.length > 0
      ? recentCheckIns.map((ci) => `- Week ${ci.week_number || 'unknown'}: Effort ${ci.effort_score || 'N/A'}/10 - ${ci.log_text || 'No notes'}`).join('\n')
      : 'No check-ins yet.';

    const systemPrompt = `You are the Spiral Coach — a brutally honest, direct, no-nonsense accountability partner built into the Spiral app. Spiral is a 26-week goal tracking platform where users log weekly check-ins, rate their effort 1-10, and track momentum.

Your personality:
- Raw and direct, zero corporate speak
- Reference their actual data (goal, week, streak, effort scores)
- Tactical and specific, never generic
- Call out patterns honestly but stay supportive
- Short responses only: 2-3 sentences, max 120 words
- Never say "as an AI" or any preamble
- Sometimes ask a follow-up question to understand the user better
- Only give an action when the user seems ready for one
- If they're venting, acknowledge it first before giving advice
- Feel like a real back-and-forth conversation, not a lecture

User context:
- Goal: ${goal || 'Not set yet'}
- Week: ${currentWeek || 1}/26
- Streak: ${currentStreak || 0} consecutive weeks
- Weeks active: ${weeksActive || 0}
- Weeks missed: ${weeksMissed || 0}
- Spiral score: ${spiralScore || 0}%
- Recent check-ins:
${checkInSummary}`;

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message || 'What should I focus on?' }
        ],
        max_tokens: 150,
        temperature: 0.85,
      });

      const text = completion.choices[0]?.message?.content || buildFallbackCoachReply({ message, goal, currentWeek, currentStreak, spiralScore });
      res.json({ text });
    } catch (groqError) {
      console.error('Groq failed, using fallback:', groqError.message);
      res.json({ text: buildFallbackCoachReply({ message, goal, currentWeek, currentStreak, spiralScore }) });
    }
  } catch (error) {
    console.error('Coach API error:', error);
    res.status(500).json({ error: error.message || 'Failed to get coach response' });
  }
});

router.post('/api/coach/weekly-reflection', async (req, res) => {
  try {
    const { goalText, currentWeek, currentStreak, checkIns } = req.body;

    const checkInSummary = checkIns && checkIns.length > 0
      ? checkIns.map((ci) => `- Week ${ci.week_number}: Effort ${ci.effort_score}/10 - ${ci.log_text}`).join('\n')
      : 'No check-ins yet.';

    const prompt = `Generate exactly 3 weekly reflection questions for someone on Spiral, a 26-week goal tracking app.

Goal: ${goalText || 'Not set'}
Week: ${currentWeek}/26
Streak: ${currentStreak} weeks
Check-ins:
${checkInSummary}

Return ONLY valid JSON, no markdown, no backticks, no explanation:
{"focus":"one short theme sentence","questions":["question 1","question 2","question 3"]}`;

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json(parsed);
      } else {
        throw new Error('No JSON in response');
      }
    } catch {
      const recentThemes = Array.isArray(checkIns) && checkIns.length > 0
        ? checkIns.slice(-3).map((ci) => ci.log_text || 'a recent check-in').join(' / ')
        : 'no check-ins yet';
      res.json({
        focus: currentStreak > 1 ? 'Protect the streak with proof, not vibes' : 'Restart with one honest action',
        questions: [
          `What did Week ${currentWeek || 1} prove about your real commitment to ${goalText || 'this goal'}?`,
          `Where did you create friction for yourself, and what is one thing you can remove before the next check-in?`,
          `Looking at ${recentThemes}, what is the smallest visible win you can deliver in the next 24 hours?`,
        ],
      });
    }
  } catch (error) {
    console.error('Weekly reflection error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate reflection' });
  }
});

export default router;