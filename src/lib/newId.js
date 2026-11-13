// A new record id that stays unique even when two records are made in the same
// millisecond (bulk adds) or on two phones at once. Starts with the time so lists
// still sort by age.
export const newId = () => Date.now().toString() + Math.random().toString(36).slice(2, 6)
