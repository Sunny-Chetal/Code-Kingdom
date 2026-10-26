// React-side event helpers. Call subscriptions from useEffect and return their cleanup.
// Subscribe before sending get-state, so mounting after scene-ready is supported.
// Example:
// useEffect(() => {
//   const unsubscribe = onKingdomDialogue(({ npcId }) => {
//     setDialogueNpc(npcId)
//     sendKingdomCommand({ type: 'set-controls', enabled: false })
//   })
//   return unsubscribe
// }, [])
// When dialogue closes, send set-controls with enabled: true.
// Commands: set-controls {enabled}, update-building {building: {id, level, branch?}},
// apply-state {state: {player?: {x,y}, buildings?: [...] }}, get-state.
// Every command emits a result with its requestId, ok/error(s), and current state.
// React owns saving that state to its backend/storage; this module does not persist it.

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
