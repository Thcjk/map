import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

/**
 * Planen > Speichern > Export. Karten- und Routingdienste sind nachgebildet, damit der Test
 * ohne Netz läuft und keine fremden Server belastet.
 */
test('Route planen, speichern und als GPX exportieren', async ({ page, context }) => {
  // Kartenkacheln, Schriften, Höhen und Overlays: leer bzw. blockiert
  await context.route(/tiles\.openfreemap\.org|elevation-tiles-prod|waymarkedtrails|geo\.admin\.ch/, (r) => r.abort())
  let routingCalls = 0
  await context.route(/brouter\.de/, (route) => {
    routingCalls++
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
  await map.click({ position: { x: 280, y: 300 } })

  // Kennzahlen erscheinen, sobald beide Teilstücke geroutet sind
  const panel = page.getByRole('region', { name: 'Routenplanung' })
  await expect(panel.getByText('Route wird berechnet')).toHaveCount(0, { timeout: 15_000 })
  await expect(panel.locator('dd').first()).toContainText('km')
  expect(routingCalls).toBe(2)

  // Rückgängig entfernt den letzten Punkt, Wiederholen bringt ihn zurück (ohne neue Anfrage)
  await panel.getByRole('button', { name: 'Zurück' }).click()
  await expect(page.locator('.waypoint-marker')).toHaveCount(2)
  await panel.getByRole('button', { name: 'Vor' }).click()
  await expect(page.locator('.waypoint-marker')).toHaveCount(3)
  expect(routingCalls).toBe(2)

  // Speichern
  await panel.getByRole('button', { name: 'Speichern' }).click()
  await panel.getByLabel('Name der Tour').fill('Smoke-Tour')
  await panel.getByLabel('Name der Tour').press('Enter')
  await expect(page.getByText('Tour gespeichert.')).toBeVisible()

  // Export aus dem Panel
  const [download] = await Promise.all([page.waitForEvent('download'), panel.getByRole('button', { name: 'GPX' }).click()])
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
})
