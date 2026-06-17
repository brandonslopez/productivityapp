function jsonResponse(status, body) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body,
  }
}

module.exports = async function fetchIcs(context, req) {
  const icsUrl = req.body?.url

  if (!icsUrl || typeof icsUrl !== 'string') {
    context.res = jsonResponse(400, { error: 'Provide an ICS URL in the request body.' })
    return
  }

  // Only allow known Outlook/Office365 ICS URLs for safety
  try {
    const parsed = new URL(icsUrl)
    const allowedHosts = [
      'outlook.office365.com',
      'outlook.live.com',
      'calendar.google.com',
    ]
    if (!allowedHosts.some((host) => parsed.hostname.endsWith(host))) {
      context.res = jsonResponse(400, {
        error: 'Only Outlook and Google Calendar ICS URLs are supported.',
      })
      return
    }
  } catch {
    context.res = jsonResponse(400, { error: 'Invalid URL.' })
    return
  }

  try {
    const response = await fetch(icsUrl, {
      headers: { Accept: 'text/calendar' },
    })

    if (!response.ok) {
      context.res = jsonResponse(response.status, {
        error: `ICS fetch failed with status ${response.status}.`,
      })
      return
    }

    const icsText = await response.text()
    context.res = jsonResponse(200, { icsText })
  } catch (error) {
    context.log.error('ICS fetch failed.', error)
    context.res = jsonResponse(502, {
      error: error instanceof Error ? error.message : 'Could not fetch ICS feed.',
    })
  }
}
