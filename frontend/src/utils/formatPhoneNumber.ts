export function formatPhoneNumber(value: string | null | undefined): string {
  if (!value) return ''

  const raw = String(value).trim()
  if (!raw) return ''

  const hasPlus = raw.startsWith('+')
  const digits = raw.replace(/\D/g, '')
  if (!digits) return raw

  const groups = digits.match(/.{1,3}/g) ?? [digits]
  return `${hasPlus ? '+' : ''}${groups.join(' ')}`
}
