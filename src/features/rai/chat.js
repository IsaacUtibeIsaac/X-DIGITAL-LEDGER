// The conversation layer: greetings, thanks, "what can you do", and follow-up questions.
// Facts and numbers still come only from raiEngine (recorded data). Nothing here invents data.

const SCOPE = {
  Cashier: 'sales, item and stock checks, and reminders such as charging your phone',
  Manager: 'stock, restocking, expiry, slow items and your tasks',
  Owner: 'sales, profit, stock, staff performance and your tasks'
}

export function converse(role, q) {
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|how far|how are you|how you dey)\b/.test(q)) {
    return [`Hello! I'm RAI. As ${role} I can help with ${SCOPE[role]}. What would you like to know?`]
  }
  if (/^(thanks|thank you|thank u|ok thanks|great|nice one|well done)\b/.test(q)) {
    return ["You're welcome. I'm here whenever you need me."]
  }
  if (/(who are you|what are you|your name|what is rai)/.test(q)) {
    return ["I'm RAI, Digital Ledger's Role-Aware Intelligence. I answer from your shop's recorded data, and I only share what your role is allowed to see."]
  }
  if (/(what can you do|what do you do|how can you help)/.test(q)) {
    return [`As ${role} I can help with ${SCOPE[role]}. You can type or speak your question, and I will say which records my answer is based on.`]
  }
  return null
}

// "And this month?" after "Sales this week" becomes "Sales this month".
export function followUp(prev, q) {
  if (!prev) return null
  if (!/^(and|what about|how about|then|now)\b/.test(q)) return null
  const m = q.match(/\b(today|week|month)\b/)
  if (!m) return null
  const base = prev
    .replace(/\b(today|this week|last week|week|this month|last month|month)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!base) return null
  return base + (m[1] === 'today' ? ' today' : ' this ' + m[1])
}
