import { APP_NAME } from '../config'
import { SOURCES } from '../data/sources'

export default function SourcesPage() {
  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Quellen & Lizenzen</h1>
        <p className="mt-2 text-muted">
          {APP_NAME} nutzt ausschliesslich freie Karten- und Datendienste. Danke an alle, die sie
          betreiben und pflegen.
        </p>
        <ul className="mt-6 space-y-4">
          {SOURCES.map((s) => (
            <li key={s.id} className="rounded-xl border border-line bg-surface p-4">
              <h2 className="text-lg font-semibold">
                <a href={s.url} target="_blank" rel="noopener" className="hover:text-accent">
                  {s.name}
                </a>
              </h2>
              <p className="mt-1 text-sm text-muted">{s.usage}</p>
              <p className="mt-2 text-sm">
                Lizenz:{' '}
                <a href={s.licenseUrl} target="_blank" rel="noopener" className="text-accent underline">
                  {s.license}
                </a>
              </p>
              <p
                className="mt-2 text-sm text-muted [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: s.attribution }}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
