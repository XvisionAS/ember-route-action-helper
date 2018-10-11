import { A as emberArray } from '@ember/array';
import Helper from '@ember/component/helper';
import { get, computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { run } from '@ember/runloop';
import { assert } from '@ember/debug';
import { ACTION } from '../-private/internals';

function getCurrentHandlerInfos(router) {
  let routerLib = router._routerMicrolib || router.router;

  return routerLib.currentHandlerInfos;
}

function getRoutes(router) {
  return emberArray(getCurrentHandlerInfos(router))
    .mapBy('handler')
    .reverse();
}

function getRouteWithAction(router, actionName, startIndex = 0) {
  const routes = emberArray(getRoutes(router))
  for (let index = startIndex; index < routes.length; ++index) {
    const route = routes[index]
    const actions = route.actions || route._actions;
    const action = actions[actionName];
    if (typeof(action) === 'function') {
      return {action, handler:route, nextIndex:index + 1}
    }
  }
  return {handler:undefined, action:undefined}
}

export default Helper.extend({
  router: computed(function() {
    return getOwner(this).lookup('router:main');
  }).readOnly(),

  compute([actionName, ...params]) {
    const router = get(this, 'router');
    assert('[ember-route-action-helper] Unable to lookup router', router);

    let startIndex = 0
    const routeAction = function(...invocationArgs) {
      let cont = true
      while (cont) {
        const { action, handler, nextIndex} = getRouteWithAction(router, actionName, startIndex);
        if (!handler) {
          assert(`[ember-route-action-helper] Unable to find action ${actionName}`, handler);
          break;
        }
        const args = params.concat(invocationArgs);
        const ret  = run.join(handler, action, ...args);
        if (ret !== true) {
          return ret;
        }
        startIndex = nextIndex;
      }
    };

    routeAction[ACTION] = true;

    return routeAction;
  }
});
