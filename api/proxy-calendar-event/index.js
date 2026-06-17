function jsonResponse(status, body) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body,
  }
}

module.exports = async function proxyCalendarEvent(context, req) {
  const flowUrl = process.env.POWER_AUTOMATE_FLOW_URL

  if (!flowUrl) {
    context.res = jsonResponse(500, {
      error:
        'Power Automate flow URL is not configured. Set POWER_AUTOMATE_FLOW_URL in the Static Web App API settings.',
    })
    return
  }

  const { subject, startDateTime, endDateTime, body, categories } = req.body || {}

  if (!subject || !startDateTime || !endDateTime) {
    context.res = jsonResponse(400, {
      error: 'Provide subject, startDateTime, and endDateTime.',
    })
    return
  }

  try {
    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        startDateTime,
        endDateTime,
        body: body || '',
        categories: categories || ['FocusPlanner'],
        timeZone: 'UTC',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      context.res = jsonResponse(response.status, {
        error: `Power Automate flow failed: ${errorText}`,
      })
      return
    }

    context.res = jsonResponse(200, { status: 'created' })
  } catch (error) {
    context.log.error('Power Automate proxy failed.', error)
    context.res = jsonResponse(502, {
      error: error instanceof Error ? error.message : 'Could not reach Power Automate flow.',
    })
  }
}
