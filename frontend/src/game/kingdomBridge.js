export function sendKingdomCommand(command) {
    const requestId = command.requestId ?? crypto.randomUUID()
    window.dispatchEvent(new CustomEvent('codekingdom:command', {
        detail: { ...command, requestId }
    }))
    return requestId
}

function subscribe(name, handler) {
    const listener = event => handler(event.detail)
    window.addEventListener(`codekingdom:${name}`, listener)
    return () => window.removeEventListener(`codekingdom:${name}`, listener)
}

export function onKingdomDialogue(handler) {
    return subscribe('dialogue', handler)
}

export function onKingdomReady(handler) {
    return subscribe('ready', handler)
}

export function onKingdomResult(handler) {
    return subscribe('result', handler)
}
