/**
 * Form validation utilities for onboarding forms
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => boolean | string;
    message?: string;
  };
}

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format (basic)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-+()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate IP address
 */
export const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
};

/**
 * Validate time format HH:MM
 */
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Validate form data against schema
 */
export const validateForm = (
  data: Record<string, unknown>,
  schema: ValidationSchema,
): ValidationError[] => {
  const errors: ValidationError[] = [];

  Object.entries(schema).forEach(([field, rules]) => {
    const value = data[field];

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: rules.message || `${field} is required`,
      });
      return;
    }

    // Skip if not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return;
    }

    // Check minLength
    if (rules.minLength && String(value).length < rules.minLength) {
      errors.push({
        field,
        message: rules.message || `${field} must be at least ${rules.minLength} characters`,
      });
    }

    // Check maxLength
    if (rules.maxLength && String(value).length > rules.maxLength) {
      errors.push({
        field,
        message: rules.message || `${field} must not exceed ${rules.maxLength} characters`,
      });
    }

    // Check pattern
    if (rules.pattern && !rules.pattern.test(String(value))) {
      errors.push({
        field,
        message: rules.message || `${field} format is invalid`,
      });
    }

    // Check custom validator
    if (rules.custom) {
      const result = rules.custom(value);
      if (result !== true) {
        errors.push({
          field,
          message: typeof result === 'string' ? result : rules.message || `${field} is invalid`,
        });
      }
    }
  });

  return errors;
};

/**
 * Validation schemas for common fields
 */
export const VALIDATION_SCHEMAS = {
  companyProfile: {
    company_name: {
      required: true,
      minLength: 2,
      maxLength: 255,
      message: 'Company name must be between 2-255 characters',
    },
    primary_contact_email: {
      custom: (value: unknown) => !value || isValidEmail(String(value)) || 'Invalid email format',
    },
    primary_contact_phone: {
      custom: (value: unknown) => !value || isValidPhone(String(value)) || 'Invalid phone format',
    },
    timezone: {
      required: true,
      message: 'Timezone is required',
    },
  },

  adminUser: {
    email: {
      required: true,
      custom: (value: unknown) => isValidEmail(String(value)) || 'Invalid email format',
    },
    name: {
      required: true,
      minLength: 2,
      maxLength: 255,
    },
    role: {
      required: true,
      custom: (value: unknown) => ['super_admin', 'admin'].includes(String(value)) || 'Invalid role',
    },
  },

  accessPoint: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 255,
    },
    type: {
      required: true,
      custom: (value: unknown) => ['door', 'reader', 'gate'].includes(String(value)) || 'Invalid type',
    },
    building_id: {
      required: true,
    },
    is_restricted: {
      required: true,
    },
    status: {
      required: true,
      custom: (value: unknown) => ['active', 'inactive', 'maintenance'].includes(String(value)) || 'Invalid status',
    },
    ip_address: {
      custom: (value: unknown) => !value || isValidIP(String(value)) || 'Invalid IP address',
    },
  },

  accessPolicy: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 255,
    },
    time_start: {
      required: true,
      custom: (value: unknown) => isValidTime(String(value)) || 'Invalid time format (use HH:MM)',
    },
    time_end: {
      required: true,
      custom: (value: unknown) => isValidTime(String(value)) || 'Invalid time format (use HH:MM)',
    },
    allowed_days: {
      required: true,
      custom: (value: unknown) => Array.isArray(value) && value.length > 0 || 'At least one day must be selected',
    },
  },
};

/**
 * Get field error message
 */
export const getFieldError = (errors: ValidationError[], field: string): string | null => {
  const error = errors.find(e => e.field === field);
  return error?.message || null;
};

/**
 * Check if form has errors
 */
export const hasErrors = (errors: ValidationError[]): boolean => {
  return errors.length > 0;
};

/**
 * Get all error messages as array
 */
export const getAllErrorMessages = (errors: ValidationError[]): string[] => {
  return errors.map(e => e.message);
};
