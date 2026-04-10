export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  const re = /^\+[1-9]\d{7,14}$/;
  return re.test(phone);
}

export function validateContact(contact: string): boolean {
  return validateEmail(contact) || validatePhone(contact);
}

export function validateAmountCents(cents: number): boolean {
  return Number.isInteger(cents) && cents >= 1 && cents <= 1_000_000;
}

export function validateNote(note: string): boolean {
  return note.length <= 280;
}
