const { SmsClient } = require('@azure/communication-sms')

function jsonResponse(status, body) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body,
  }
}

module.exports = async function sendSms(context, req) {
  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING
  const senderNumber = process.env.AZURE_COMMUNICATION_SENDER_NUMBER

  if (!connectionString || !senderNumber) {
    context.res = jsonResponse(500, {
      error:
        'Azure Communication Services is not configured. Set AZURE_COMMUNICATION_CONNECTION_STRING and AZURE_COMMUNICATION_SENDER_NUMBER in the Static Web App API settings.',
    })
    return
  }

  const { phoneNumber, message } = req.body || {}

  if (!phoneNumber || !message) {
    context.res = jsonResponse(400, {
      error: 'Provide a phoneNumber and message in the request body.',
    })
    return
  }

  try {
    const smsClient = new SmsClient(connectionString)
    const result = await smsClient.send({
      from: senderNumber,
      to: [phoneNumber],
      message: message.slice(0, 320),
    })

    const sent = result[0]
    if (!sent.successful) {
      context.res = jsonResponse(502, {
        error: `SMS failed: ${sent.errorMessage || 'Unknown error'}`,
      })
      return
    }

    context.res = jsonResponse(200, {
      messageId: sent.messageId,
      status: 'sent',
    })
  } catch (error) {
    context.log.error('SMS send failed.', error)
    context.res = jsonResponse(502, {
      error: error instanceof Error ? error.message : 'Could not send SMS.',
    })
  }
}
