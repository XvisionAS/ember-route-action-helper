import Helper from '@ember/component/helper'
import { get, computed } from '@ember/object'
import { getOwner } from '@ember/application'
import { run } from '@ember/runloop'
import { runInDebug, assert } from '@ember/debug'
import { ACTION } from '../-private/internals'

function getCurrentRouteInfos(router) {
  const routerLib = router._routerMicrolib || router.router
  return routerLib.currentRouteInfos || routerLib.currentHandlerInfos
}

function getRouteInfos(router) {
  return getCurrentRouteInfos(router).toArray().reverse()
}

function getRouteWithAction(router, actionName, startIndex = 0) {
  const routeInfos = getRouteInfos(router)
  for (let index = startIndex; index < routeInfos.length; ++index) {
    const route = routeInfos[index].route
    const actions = route.actions || route._actions
    const action = actions[actionName]
    if (typeof(action) === 'function') {
      return {action, handler:route, nextIndex:index + 1}
    }
  }
  return {handler:undefined, action:undefined}
}

export default Helper.extend({
  router: computed(function() {
    return getOwner(this).lookup('router:main')
  }).readOnly(),

  compute([actionName, ...params]) {
    const router = get(this, 'router')
    assert('[ember-route-action-helper] Unable to lookup router', router)

    const routeAction = function(...invocationArgs) {
      let startIndex = 0
      let cont       = true
      while (cont) {
        const { action, handler, nextIndex} = getRouteWithAction(router, actionName, startIndex)

        if (!handler) {
          runInDebug( () => {
            console.warn(`[ember-route-action-helper] Unable to find action ${actionName}`)
          })
          break
        }

        const args = params.concat(invocationArgs)
        const ret  = run.join(handler, action, ...args)

        if (ret !== true) {
          return ret
        }
        startIndex = nextIndex
      }
    }

    routeAction[ACTION] = true

    return routeAction
  }
})
