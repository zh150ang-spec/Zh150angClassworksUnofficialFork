/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

// Plugins
import vuetify from '@/plugins/vuetify'
import pinia from '@/stores'
import router from '@/router'

export function registerPlugins(app) {
  app.use(vuetify).use(router).use(pinia)
}
