export function callIfFunction(target, methodName, ...args) {
    if (!target || typeof target[methodName] !== 'function') {
        return undefined;
    }
    return target[methodName](...args);
}

export function callSceneMethod(scene, methodName, ...args) {
    return callIfFunction(scene, methodName, ...args);
}

export function callSceneManagerMethod(scene, managerKey, methodName, ...args) {
    if (!scene || !scene[managerKey]) {
        return undefined;
    }
    return callIfFunction(scene[managerKey], methodName, ...args);
}
