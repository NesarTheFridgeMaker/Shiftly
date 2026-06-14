export type TimeEntry = {
  action: string;
  created_at: string;
};

export type WorkSession = {
  start: Date;
  end: Date;
};

export function buildWorkSessions(entries: TimeEntry[]): WorkSession[] {
  const sorted = [...entries].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );

  const sessions: WorkSession[] = [];
  let workStart: Date | null = null;

  for (const entry of sorted) {
    const date = new Date(entry.created_at);

    if (entry.action === "check_in") {
      workStart = date;
      continue;
    }

    if (entry.action === "break_start") {
      if (workStart && date > workStart) {
        sessions.push({
          start: workStart,
          end: date,
        });
      }

      workStart = null;
      continue;
    }

    if (entry.action === "break_end") {
      workStart = date;
      continue;
    }

    if (entry.action === "check_out") {
      if (workStart && date > workStart) {
        sessions.push({
          start: workStart,
          end: date,
        });
      }

      workStart = null;
      continue;
    }
  }

  return sessions;
}