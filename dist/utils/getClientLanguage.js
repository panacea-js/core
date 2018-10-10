"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { accepts, i18n } = Panacea.container;
/**
 * Get the client's preferred language based on the request's
 * PANACEA-LANGUAGE cookie value. Falls back to the client's Accept-Language
 * header using the accepts module.
 */
const getClientLanguage = function (req) {
    const availableLanguages = Object.keys(i18n.messages);
    let cookieLanguage = '';
    if (typeof req.headers.cookie !== 'undefined') {
        const extractCookieLanguage = (cookieArray) => {
            cookieArray.map((cookie) => {
                const [key, value] = cookie.split('=');
                if (key === 'PANACEA-LANGUAGE') {
                    cookieLanguage = value;
                }
            });
        };
        if (typeof req.headers.cookie === 'string') {
            extractCookieLanguage(req.headers.cookie.split('; '));
        }
        if (Array.isArray(req.headers.cookie)) {
            extractCookieLanguage(req.headers.cookie);
        }
        // Ensure language is available as a translation key.
        if (cookieLanguage.length > 0 && i18n.messages.hasOwnProperty(cookieLanguage)) {
            return cookieLanguage;
        }
    }
    // Fallback to client's Accept-Language header.
    return accepts(req).language(availableLanguages);
};
exports.getClientLanguage = getClientLanguage;
//# sourceMappingURL=getClientLanguage.js.map