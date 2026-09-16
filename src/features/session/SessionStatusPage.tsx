type Props = {
  title: string;
  body: string;
  busy?: boolean;
};

export function SessionStatusPage({ title, body, busy = false }: Props) {
  return (
    <main className="public-status" aria-busy={busy || undefined}>
      <h1 className="public-status__title">{title}</h1>
      <p className="public-status__body">{body}</p>
    </main>
  );
}
