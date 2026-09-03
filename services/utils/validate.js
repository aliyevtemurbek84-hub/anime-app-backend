// Umumiy validatsiya yordamchi funksiyalari

// Matn maydoni: bo'sh emas, ortiqcha probel olib tashlangan, uzunlik chegarasida
export function validateText(value, { fieldName = "Matn", minLength = 1, maxLength = 2000 } = {}) {
  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} matn ko'rinishida bo'lishi kerak` };
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} bo'sh bo'lmasligi kerak` };
  }
  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} ${maxLength} belgidan oshmasligi kerak` };
  }
  return { valid: true, value: trimmed };
}

// Ixtiyoriy matn maydoni (null/undefined bo'lishi mumkin, lekin berilsa tekshiriladi)
export function validateOptionalText(value, opts = {}) {
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: null };
  }
  return validateText(value, opts);
}

// URL formatini tekshirish (ixtiyoriy maydon uchun)
export function validateOptionalUrl(value, { fieldName = "Havola" } = {}) {
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: null };
  }
  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} matn ko'rinishida bo'lishi kerak` };
  }
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      return { valid: false, error: `${fieldName} http yoki https bilan boshlanishi kerak` };
    }
    return { valid: true, value: value.trim() };
  } catch {
    return { valid: false, error: `${fieldName} formati noto'g'ri` };
  }
}

// Majburiy URL maydoni
export function validateUrl(value, { fieldName = "URL" } = {}) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} kerak` };
  }
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      return { valid: false, error: `${fieldName} http yoki https bilan boshlanishi kerak` };
    }
    return { valid: true, value: value.trim() };
  } catch {
    return { valid: false, error: `${fieldName} formati noto'g'ri` };
  }
}

// Son maydoni: berilgan oraliqda
export function validateNumberInRange(value, { fieldName = "Qiymat", min, max } = {}) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return { valid: false, error: `${fieldName} raqam bo'lishi kerak` };
  }
  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} ${min} dan kichik bo'lmasligi kerak` };
  }
  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} ${max} dan katta bo'lmasligi kerak` };
  }
  return { valid: true, value: num };
}

// ID/userId kabi maydonlar: bo'sh bo'lmagan string
export function validateId(value, { fieldName = "ID" } = {}) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} kerak` };
  }
  return { valid: true, value: value.trim() };
}