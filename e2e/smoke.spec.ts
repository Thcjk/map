import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

/**
 * Planen > Speichern > Export. Karten- und Routingdienste sind nachgebildet, damit der Test
 * ohne Netz läuft und keine fremden Server belastet.
 */
test('Route planen, speichern und als GPX exportieren', async ({ page, context }) => {
  // Kartenkacheln, Höhen, Overlays und Katalogfotos: blockiert
  await context.route(/tiles\.openfreemap\.org|elevation-tiles-prod|waymarkedtrails|geo\.admin\.ch|wikimedia\.org/, (r) => r.abort())
  let routingCalls = 0
  await context.route(/brouter\.de/, async (route) => {
    routingCalls++
    // langsamer Dienst: Der dritte Wegpunkt kommt, während die erste Anfrage noch läuft
    await new Promise((r) => setTimeout(r, 700))
    const [a, b] = new URL(route.request().url()).searchParams.get('lonlats')!.split('|').map((s) => s.split(',').map(Number))
    const coordinates = Array.from({ length: 21 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / 20, a[1] + ((b[1] - a[1]) * i) / 20, 1000 + i * 10])
    const end = coordinates[20]
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            geometry: { coordinates },
            properties: {
              messages: [
                ['Longitude', 'Latitude', 'Elevation', 'Distance', 'CostPerKm', 'ElevCost', 'TurnCost', 'NodeCost', 'InitialCost', 'WayTags', 'NodeTags', 'Time', 'Energy'],
                [String(Math.round(end[0] * 1e6)), String(Math.round(end[1] * 1e6)), '0', '0', '', '', '', '', '', 'highway=path sac_scale=mountain_hiking', '', '', ''],
              ],
            },
          },
        ],
      }),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Route planen' }).click()
  const map = page.getByRole('region', { name: 'Karte' })
  await map.click({ position: { x: 120, y: 320 } })
  await map.click({ position: { x: 240, y: 420 } })
  await page.waitForTimeout(600)
  await map.click({ position: { x: 280, y: 300 } })

  // Kennzahlen erscheinen, sobald beide Teilstücke geroutet sind
  const planning = page.getByRole('region', { name: 'Routenplanung' })
  await expect(planning.getByText('Route wird berechnet')).toHaveCount(0, { timeout: 15_000 })
  await expect(planning.locator('dd').first()).toContainText('km')
  // Eine laufende Anfrage darf nicht abgebrochen und wiederholt werden.
  expect(routingCalls).toBe(2)

  // Rückgängig entfernt den letzten Punkt, Wiederholen bringt ihn zurück (ohne neue Anfrage)
  await planning.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.locator('.waypoint-marker')).toHaveCount(2)
  await planning.getByRole('button', { name: 'Wiederholen' }).click()
  await expect(page.locator('.waypoint-marker')).toHaveCount(3)
  expect(routingCalls).toBe(2)

  // Fertig: Die Route zeigt Kennzahlen in Höhenmetern (Hm), nicht als «m»
  await planning.getByRole('button', { name: 'Fertig' }).click()
  const routePanel = page.getByRole('region', { name: 'Route', exact: true })
  await expect(routePanel.locator('dd').nth(1)).toContainText('Hm')

  // Speichern
  await routePanel.getByRole('button', { name: 'Speichern' }).click()
  await page.getByLabel('Name der Tour').fill('Smoke-Tour')
  await page.getByLabel('Name der Tour').press('Enter')
  await expect(page.getByText('Tour gespeichert')).toBeVisible()

  // Export über «Weitere Aktionen»
  await routePanel.getByRole('button', { name: 'Weitere Aktionen' }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Als GPX exportieren' }).click()])
  expect(download.suggestedFilename()).toBe('smoke-tour.gpx')
  const gpx = await readFile(await download.path(), 'utf8')
  expect(gpx).toContain('<name>Smoke-Tour</name>')
  expect((gpx.match(/<trkpt /g) ?? []).length).toBe(41)
  expect((gpx.match(/<wpt /g) ?? []).length).toBe(3)

  // Tour steht in der Liste und bleibt nach dem Neuladen einer Unterseite erhalten
  await page.getByRole('link', { name: 'Touren' }).click()
  await expect(page.getByRole('heading', { name: 'Smoke-Tour' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Smoke-Tour' })).toBeVisible()

  // Zurück zur Karte: Die Route ist sofort wieder da (die Karte bleibt geladen)
  await page.getByRole('link', { name: 'Auf Karte' }).click()
  await expect(page.getByRole('region', { name: 'Route', exact: true })).toContainText('Smoke-Tour')
})
