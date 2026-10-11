
export const money = (value) =>
  '₹' + Math.round(Number(value) || 0).toLocaleString('en-IN')

export const dayLabel = (value) => `Day ${value}`
