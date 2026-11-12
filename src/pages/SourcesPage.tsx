import { APP_NAME } from '../config'
import PageFrame from '../components/PageFrame'
import { SOURCES } from '../data/sources'

export default function SourcesPage() {
  return (
    <PageFrame sheet="05" title="Quellen" meta="Lizenzen · Attribution" intro={`${APP_NAME} nutzt ausschliesslich freie Karten- und Datendienste. Danke an alle, die sie betreiben und pflegen.`}>
      <ul className="space-y-3">
        {SOURCES.map((s) => (
          <li key={s.id} className="card p-3">
            <h2 className="font-semibold">
              <a href={s.url} target="_blank" rel="noopener" className="underline">
                {s.name}
              </a>
            </h2>
            <p className="mt-1 text-sm text-muted">{s.usage}</p>
            <p className="mt-2 text-sm">
              Lizenz:{' '}
              <a href={s.licenseUrl} target="_blank" rel="noopener" className="underline">
                {s.license}
              </a>
            </p>
            <p className="label mt-2 normal-case! tracking-normal! text-muted [&_a]:underline" dangerouslySetInnerHTML={{ __html: s.attribution }} />
          </li>
        ))}
      </ul>
    </PageFrame>
  )
}
