import { useEffect, useRef, useState } from 'react'
import { onKingdomDialogue, sendKingdomCommand } from './kingdomBridge'

const roles = {
  librarian: { title: 'Librarian', message: "I’m the librarian. I look after the kingdom’s library and help you find knowledge." },
  knight: { title: 'Knight', message: "I’m the knight. I guard the castle and protect the kingdom." },
  vendor: { title: 'Vendor', message: "I’m the vendor. I run the market and help keep the kingdom supplied." },
  farmer: { title: 'Farmer', message: "I’m the farmer. I tend the farm and grow food for the kingdom." },
  wizard: { title: 'Wizard', message: "I’m the wizard. I study magic in the tower and share what I learn." },
  artisan: { title: 'Artisan', message: "I’m the artisan. I work in the workshop, crafting and repairing things for the kingdom." }
}

export default function NPCRoleDialogue() {
  const [dialogue, setDialogue] = useState(null)
  const modal = useRef(null)

  useEffect(() => {
    const unsubscribe = onKingdomDialogue(({ npcId }) => {
      const role = roles[npcId]
      if (!role) return
      sendKingdomCommand({ type: 'set-controls', enabled: false })
      setDialogue(role)
    })
    return () => {
      unsubscribe()
      sendKingdomCommand({ type: 'set-controls', enabled: true })
    }
  }, [])

  useEffect(() => {
    if (dialogue && !modal.current.open) modal.current.showModal()
  }, [dialogue])

  function closeDialogue() {
    setDialogue(null)
    sendKingdomCommand({ type: 'set-controls', enabled: true })
  }

  return (
    <dialog
      ref={modal}
      aria-labelledby="npc-role-title"
      aria-describedby="npc-role-message"
      onClose={closeDialogue}
      style={{
        position: 'fixed', inset: 0, margin: 'auto',
        width: 'min(420px, calc(100vw - 32px))', boxSizing: 'border-box',
        padding: '24px', border: '3px solid #9c7847', borderRadius: '12px',
        background: '#fff8e8', color: '#302719',
        boxShadow: '0 12px 48px #0006'
      }}
    >
      <h2 id="npc-role-title" style={{ margin: '0 0 12px', fontSize: '24px' }}>
        {dialogue?.title}
      </h2>
      <p id="npc-role-message" style={{ margin: '0 0 20px', lineHeight: 1.6 }}>
        {dialogue?.message}
      </p>
      <button
        type="button"
        onClick={() => modal.current.close()}
        style={{ padding: '10px 18px', borderRadius: '6px', border: 0,
          background: '#405c36', color: '#fff', cursor: 'pointer' }}
      >
        Close
      </button>
      <span style={{ marginLeft: '12px', fontSize: '13px' }}>or press Esc</span>
    </dialog>
  )
}
