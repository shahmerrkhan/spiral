import { NextResponse } from "next/server";

function localPepTalk(logText: string, effortScore: number): string {
  const trimmed = logText.trim();
  const long = trimmed.length > 120;
  const namedPain = /fail|miss|hard|stuck|tired|scared|avoid|procrast|stress|bad|rough|exhaust|overwhelm/i.test(trimmed);
  const namedWin = /finish|complete|ship|launch|publish|hit|beat|done|win|sold|landed/i.test(trimmed);

  if (effortScore === 10) {
    return "That is the chaos we needed. Whatever you did this week — it was the spiral eating itself in the best way. Do not wait for permission to keep that pressure on.";
  }
  if (effortScore === 1) {
    return "You showed up. The log exists. In a world of people who ghost their own goals at week three, that is not nothing — it is actually the whole game.";
  }
  if (effortScore <= 3) {
    const opener = long
      ? "You gave the ugly details. That is more useful than a clean lie."
      : "The log is thin, but it is a footprint, not a disappearance.";
    const middle = namedPain
      ? "The friction has a name now. Stop moralizing it and design next week around the constraint that actually exists."
      : "Something throttled the engine this week. Name it before it quietly becomes week three's excuse too.";
    return `${opener} ${middle} Next week needs one action so small it would be embarrassing to dodge.`;
  }
  if (effortScore >= 8) {
    const opener = namedWin
      ? "There is a real win in this log. Do not let it become a trophy you stop moving."
      : long
        ? "Detailed log, high effort — you are not performing productivity, you are doing it."
        : "Short log, loud signal. You moved and you know it.";
    return `${opener} This is where momentum becomes ego if you are not careful. Keep it measurable, keep it weird, keep receipts.`;
  }
  const opener = long
    ? "You brought enough evidence to see what is actually happening."
    : "Not heroic, not nothing. That is the exact weight of the middle weeks.";
  const closer = namedPain
    ? "The mess is data. Pull the sharpest sentence from what you wrote and make it an action before your brain negotiates it down."
    : "Pick the one thing from this week that was almost working, and go at it again before the week cools down.";
  return `${opener} The middle weeks are where most people quietly disappear. You did not. ${closer}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { logText?: string; effortScore?: number };
    const logText = typeof body.logText === "string" ? body.logText : "";
    const effortScore = Number(body.effortScore);
    if (!logText.trim() || !Number.isFinite(effortScore)) {
      return NextResponse.json({ error: "Missing log text or effort score." }, { status: 400 });
    }
    return NextResponse.json({ pepTalk: localPepTalk(logText, effortScore) });
  } catch {
    return NextResponse.json({ error: "Could not generate pep talk." }, { status: 500 });
  }
}