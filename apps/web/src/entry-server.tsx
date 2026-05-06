import { renderToString } from 'react-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import { createMemoryRouter } from 'react-router-dom'
import App from './App'
import { routes } from './router'

export function render(url: string) {
  const helmetContext: any = {}
  const router = createMemoryRouter(routes, { initialEntries: [url] })

  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <App router={router} />
    </HelmetProvider>,
  )

  const helmet = helmetContext.helmet
  return {
    appHtml,
    head: {
      title: helmet?.title?.toString() ?? '',
      meta: helmet?.meta?.toString() ?? '',
      link: helmet?.link?.toString() ?? '',
      script: helmet?.script?.toString() ?? '',
    },
  }
}

