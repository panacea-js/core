const { accepts, i18n } = Panacea.container

/**
 * Get the client's preferred language based on the request's
 * PANACEA-LANGUAGE cookie value. Falls back to the client's Accept-Language
 * header using the accepts module.
 */
const getClientLanguage = function (req: express$Request) : string | boolean {
  const availableLanguages = Object.keys(i18n.messages)

  let cookieLanguage = ''

  if (typeof req.headers.cookie !== 'undefined') {
    req.headers.cookie.split('; ').map(cookie => {
      const [ key, value ] = cookie.split('=')
      if (key === 'PANACEA-LANGUAGE') {
        cookieLanguage = value
      }
    })

    if (cookieLanguage.length > 0 && i18n.messages.hasOwnProperty(cookieLanguage)) {
      return cookieLanguage
    }
  }

  // Fallback to client's Accept-Language header.
  return accepts(req).language(availableLanguages)
}

export { getClientLanguage }
