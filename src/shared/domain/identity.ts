/** Nom de l'église, affiché dans l'app et plus tard dans les impressions et reçus. */
export const CHURCH_NAME = 'FJKM Ambatondrazaka Fitiavana'

/**
 * Nom du logiciel = nom de l'église. Doit rester identique à `productName` (package.json et
 * electron-builder.yml) : il détermine les dossiers de données (%APPDATA%) et de sauvegardes.
 * Ne plus le changer une fois installé chez l'utilisateur (les données ne suivraient pas).
 */
export const APP_NAME = CHURCH_NAME

/** Forme fichier du nom (exe, installeur, exports). */
export const APP_SLUG = 'fjkm-ambatondrazaka-fitiavana'
