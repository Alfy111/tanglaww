const PASS = 75;
const WEAK = 60;

const r = (v: any) => Math.round(Number(v));
const has = (v: any) =>
  v !== null && v !== undefined && !Number.isNaN(Number(v));
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function progressInsight(summary: any) {
  const c = r(summary?.completion ?? 0);
  if (c >= 100)
    return "You have finished every course. Keep reviewing your weak topics until the exam.";
  if (c >= 75)
    return `You are ${c}% through the review. Finish the remaining materials to complete the program.`;
  if (c >= 40)
    return `You are ${c}% through the review. Keep a steady pace by finishing at least one module or video on each study day.`;
  if (c > 0)
    return `You are ${c}% through the review. Small daily steps add up: try to finish one module or video each study day.`;
  return "Your progress will appear here once you start your first module, video or quiz.";
}

export function averageInsight(summary: any) {
  if (!summary?.quizzesTaken || !has(summary?.avgScore))
    return "Take your first quiz to see your average score.";
  const a = r(summary.avgScore);
  if (a >= PASS)
    return `Your average of ${a}% is above the ${PASS}% LEPT passing rate. Keep it steady.`;
  if (a >= WEAK)
    return `Your average of ${a}% is close to the ${PASS}% passing rate. Your Focus Next topics are the quickest way to close the gap.`;
  return `Your average of ${a}% is below passing. Review your Focus Next topics first, then retake those quizzes.`;
}

export function frequencyInsight(summary: any) {
  const d = Number(summary?.activeDays ?? 0);
  if (d === 0)
    return "You have not studied this week yet. Even a short session today keeps your review on track.";
  if (d <= 2)
    return `You studied ${plural(d, "day", "days")} this week. Short sessions on more days usually help you remember better than one long session.`;
  return `You studied ${d} days this week. Great habit, keep it going.`;
}

export function coursesInsight(courses: any[]) {
  if (!courses?.length) return null;
  const current = courses.find((c) => r(c.percent ?? 0) < 100);
  if (!current) return "You have completed every course.";
  return `Your current course is ${current.courseName} at ${r(current.percent ?? 0)}%. Courses open in order, so finishing it unlocks the next one.`;
}

export function recentInsight(recent: any[]) {
  if (!recent?.length) return null;
  const [latest, previous] = recent;
  const below = recent.filter((q) => has(q.pct) && Number(q.pct) < PASS).length;
  let text = "";
  if (previous && has(latest.pct) && has(previous.pct)) {
    const diff = r(latest.pct) - r(previous.pct);
    text =
      diff > 0
        ? `Your latest score (${r(latest.pct)}%) is ${diff} points higher than the one before. `
        : diff < 0
          ? `Your latest score (${r(latest.pct)}%) is ${-diff} points lower than the one before. `
          : `Your last two scores are the same (${r(latest.pct)}%). `;
  }
  text +=
    below === 0
      ? "All your recent results are at or above passing."
      : `${plural(below, "recent result is", "recent results are")} below ${PASS}%; retaking ${below === 1 ? "it" : "them"} after review can raise your scores.`;
  return text;
}

export function focusInsight(focus: any[], topics: any[]) {
  if (!topics?.length) return null;
  if (!focus?.length)
    return `All your topics are at ${PASS}% or higher. Keep practicing with new quizzes to stay sharp.`;
  const [first, ...rest] = focus;
  const gap = PASS - r(first.mastery);
  let text = `Start with ${first.topicName} (${r(first.mastery)}%), which is ${gap} points below passing. Review its handouts and sessions, then answer more questions on it.`;
  if (rest.length)
    text += ` After that: ${rest.map((t) => t.topicName).join(" and ")}.`;
  return text;
}

export function trendInsight(quizzes: any[]) {
  const scored = (quizzes ?? []).filter((q) => has(q.pct));
  if (scored.length === 0) return null;
  if (scored.length === 1)
    return `One quiz so far: ${r(scored[0].pct)}%. Take more quizzes in this course to see your trend.`;
  const first = r(scored[0].pct);
  const last = r(scored[scored.length - 1].pct);
  const below = scored.filter((q) => Number(q.pct) < PASS).length;
  const trend =
    last - first >= 5
      ? `Your scores are going up (${first}% → ${last}%).`
      : first - last >= 5
        ? `Your scores are going down (${first}% → ${last}%). Review before the next quiz.`
        : `Your scores are steady around ${last}%.`;
  return below
    ? `${trend} ${plural(below, "quiz is", "quizzes are")} below ${PASS}%; retakes count your latest attempt.`
    : `${trend} Every quiz is at or above passing.`;
}

export function courseTopicsInsight(topics: any[]) {
  if (!topics?.length) return null;
  const below = topics.filter((t) => Number(t.mastery) < PASS);
  if (!below.length)
    return `Every topic in this course is at ${PASS}% or higher.`;
  const low = below[0];
  return `${plural(below.length, "topic needs", "topics need")} review in this course. The lowest is ${low.topicName} at ${r(low.mastery)}%.`;
}

export function adminSummaryInsight(summary: any) {
  if (!summary) return null;
  const total = Number(summary.totalStudents ?? 0);
  const active = Number(summary.activeStudents ?? 0);
  if (!total) return "No approved students yet.";
  const inactive = total - active;
  let text = `${active} of ${total} students are active.`;
  if (inactive > 0)
    text += ` ${plural(inactive, "student has", "students have")} not opened a material or taken a quiz yet; a reminder may help.`;
  if (has(summary.passRate))
    text += ` ${r(summary.passRate)}% of quiz results reached their passing score.`;
  return text;
}

export function distributionInsight(d: any) {
  if (!d?.count) return null;
  const bins: number[] = d.bins ?? [];
  const peak = bins.indexOf(Math.max(...bins));
  const below70 = bins.slice(0, 7).reduce((s, n) => s + n, 0);
  let text = `Most results fall between ${peak * 10}% and ${peak * 10 + 9}%. `;
  if (has(d.median) && has(d.average)) {
    const gap = Number(d.median) - Number(d.average);
    text +=
      gap >= 3
        ? `The median (${r(d.median)}%) is higher than the average (${r(d.average)}%), so a few very low scores are pulling the average down. `
        : gap <= -3
          ? `The average (${r(d.average)}%) is higher than the median (${r(d.median)}%), so a few very high scores are pulling the average up. `
          : `The average and median are close (${r(d.average)}% and ${r(d.median)}%), so scores are fairly balanced. `;
  }
  text += `${Math.round((below70 / d.count) * 100)}% of results are below 70%.`;
  return text;
}

export function rankingInsight(rows: any[], overall: boolean) {
  if (!rows?.length) return null;
  const top = rows[0];
  const bottom = rows[rows.length - 1];
  const spread =
    has(top.pct) && has(bottom.pct) ? r(top.pct) - r(bottom.pct) : null;
  let text = `${top.name} leads at ${r(top.pct)}%.`;
  if (spread != null && rows.length > 1) {
    text +=
      spread >= 30
        ? ` There is a ${spread}-point gap between the top and bottom, so some students may need extra support.`
        : ` The gap between the top and bottom is ${spread} points, so the class is fairly even.`;
  }
  if (!overall)
    text +=
      " Rankings per quiz use the first attempt, so retakes give no advantage.";
  return text;
}

export function diagnosticInsight(diag: any) {
  if (!diag || diag.assessment_id == null || !diag.currentCount) return null;
  const share = Math.round(
    (Number(diag.flagged ?? 0) / diag.currentCount) * 100,
  );
  let text = "";
  if (has(diag.currentAvg) && has(diag.pastAvg)) {
    text +=
      Number(diag.currentAvg) >= Number(diag.pastAvg)
        ? "This batch started stronger than the past batch. "
        : "This batch started weaker than the past batch, so plan extra support early. ";
  }
  text += diag.flagged
    ? `${diag.flagged} of ${diag.currentCount} reviewees (${share}%) are below ${diag.cutoff}%. Follow up with them first; past reviewees below this line mostly did not reach ${PASS}% in Prof Ed.`
    : `No reviewee is below the ${diag.cutoff}% early-warning cutoff.`;
  return text;
}

export function atRiskInsight(atRisk: any[]) {
  if (!atRisk?.length) return "No student is at risk right now.";
  const warned = atRisk.filter((s) => s.earlyWarning).length;
  const inactive = atRisk.filter(
    (s) => has(s.completion) && Number(s.completion) < 50,
  ).length;
  let text = `${plural(atRisk.length, "student needs", "students need")} attention`;
  text += warned ? ` (${warned} with an early warning).` : ".";
  if (inactive)
    text += ` ${inactive} of them ${inactive === 1 ? "has" : "have"} completed less than half the materials, so low activity may be part of the problem.`;
  return text;
}

export function completionInsight(courses: any[]) {
  const list = (courses ?? []).filter((c) => has(c.completion));
  if (!list.length) return null;
  const sorted = [...list].sort(
    (a, b) => Number(a.completion) - Number(b.completion),
  );
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  if (list.length === 1)
    return `Students have completed ${r(low.completion)}% of ${low.courseName}.`;
  return `Progress is highest in ${high.courseName} (${r(high.completion)}%) and lowest in ${low.courseName} (${r(low.completion)}%). Since courses open in order, this shows where most students currently are or where they stop.`;
}

export function engagementInsight(items: any[]) {
  const parts = (items ?? [])
    .filter((e) => has(e.opened) && has(e.completed))
    .map((e) => {
      const gap = r(e.opened) - r(e.completed);
      return gap >= 20
        ? `${e.label}: ${r(e.opened)}% opened but only ${r(e.completed)}% completed, so students start but don't finish them.`
        : `${e.label}: most students who open them also finish them (${r(e.completed)}% completed).`;
    });
  return parts.length ? parts.join(" ") : null;
}

export function quizBreakdownInsight(quizzes: any[]) {
  const list = (quizzes ?? []).filter((q) => has(q.avgScore));
  if (!list.length) return null;
  const hardest = [...list].sort(
    (a, b) => Number(a.avgScore) - Number(b.avgScore),
  )[0];
  const below = list.filter((q) => Number(q.avgScore) < PASS).length;
  let text = `The hardest quiz is ${hardest.title} (average ${r(hardest.avgScore)}%`;
  text += has(hardest.passRate) ? `, ${r(hardest.passRate)}% passed).` : ").";
  text += below
    ? ` ${plural(below, "quiz has", "quizzes have")} a class average below ${PASS}%.`
    : " Every quiz has a class average at or above passing.";
  return text;
}

export function weakTopicsInsight(topics: any[]) {
  if (!topics?.length) return null;
  const t = topics[0];
  return `Reteach ${t.topicName} first: the class average is ${r(t.mastery)}% and ${r(t.weakShare)}% of ${t.students} students are below ${WEAK}%. The list is sorted by reteach priority, which weighs both.`;
}

export function missedInsight(questions: any[], total: number) {
  if (!total) return null;
  if (!questions?.length) return null;
  const withWrong = questions.filter((q) => q.topWrong);
  let text = `${plural(questions.length, "question was", "questions were")} answered correctly by fewer than half of the examinees.`;
  if (withWrong.length) {
    const q = withWrong[0];
    text += ` On question ${q.number}, ${r(q.topWrongShare)}% chose "${q.topWrong}", a sign of a shared misconception worth clearing up in class.`;
  }
  return text;
}

export function studentSummaryInsight(summary: any, name?: string) {
  if (!summary) return null;
  const who = name ? name.split(" ")[0] : "This student";
  if (!summary.quizzesTaken)
    return `${who} has not taken a quiz yet. Completion is ${r(summary.completion ?? 0)}%.`;
  const a = r(summary.avgScore);
  const c = r(summary.completion ?? 0);
  const level =
    a >= PASS
      ? "above passing"
      : a >= WEAK
        ? "close to passing"
        : "below passing";
  let text = `${who}'s average is ${a}% (${level}) with ${c}% of materials completed.`;
  if (a < PASS && c < 50)
    text +=
      " Low completion may explain the scores; encourage finishing the materials first.";
  else if (a < PASS && c >= 75)
    text +=
      " Materials are mostly done, so targeted topic review may help more than more reading.";
  return text;
}

export function recommendedFocusInsight(focus: any[], topics: any[]) {
  if (!topics?.length) return null;
  if (!focus?.length)
    return `Every topic is at ${PASS}% or higher. No extra focus needed right now.`;
  const t = focus[0];
  return `Suggest starting with ${t.topicName} (${r(t.mastery)}%). The student sees the same list as "Focus Next", so you can talk about the same topics.`;
}

export function strengthsInsight(topics: any[]) {
  const list = (topics ?? []).filter((t) => has(t.mastery));
  if (!list.length) return null;
  const sorted = [...list].sort(
    (a, b) => Number(b.mastery) - Number(a.mastery),
  );
  const strong = sorted[0];
  const weak = sorted[sorted.length - 1];
  const passed = list.filter((t) => Number(t.mastery) >= PASS).length;
  return `Strongest: ${strong.topicName} (${r(strong.mastery)}%). Weakest: ${weak.topicName} (${r(weak.mastery)}%). ${passed} of ${list.length} topics are at passing level.`;
}

export function historyInsight(courses: any[]) {
  const quizzes = (courses ?? []).flatMap((c) => c.quizzes ?? []);
  if (!quizzes.length) return null;
  const retaken = quizzes.filter((q) => Number(q.attempts) > 1).length;
  const below = quizzes.filter(
    (q) => has(q.pct) && Number(q.pct) < PASS,
  ).length;
  let text = `${plural(quizzes.length, "quiz", "quizzes")} taken, ${below} below ${PASS}%.`;
  if (retaken)
    text += ` ${plural(retaken, "quiz was", "quizzes were")} retaken, which shows effort to improve.`;
  return text;
}
