type CuratorMessage = {
  user_email?: string;
  session_id?: string;
  [key: string]: unknown;
};

export function ownedCuratorMessages(rows: unknown, email: string, sessionId = ''): CuratorMessage[] {
  if (!Array.isArray(rows)) throw new Error('Curator message query returned an invalid response');
  return rows.filter((row): row is CuratorMessage =>
    Boolean(row && row.user_email === email && (!sessionId || row.session_id === sessionId))
  );
}
