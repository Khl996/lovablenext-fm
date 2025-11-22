interface ApiError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function parseSupabaseError(error: unknown): ApiError {
  if (!error) {
    return { message: 'Unknown error occurred' };
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    
    // Supabase error format
    if (err.message) {
      return {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
      };
    }

    // PostgreSQL error
    if (err.error) {
      return parseSupabaseError(err.error);
    }
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: String(error) };
}

export function getErrorMessage(error: ApiError, language: 'ar' | 'en'): string {
  const messages: Record<string, { en: string; ar: string }> = {
    '23505': {
      en: 'This record already exists',
      ar: 'هذا السجل موجود بالفعل',
    },
    '23503': {
      en: 'Cannot delete: record is referenced by other data',
      ar: 'لا يمكن الحذف: السجل مرتبط ببيانات أخرى',
    },
    'PGRST116': {
      en: 'Not found',
      ar: 'غير موجود',
    },
    'permission_denied': {
      en: 'You do not have permission to perform this action',
      ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
    },
  };

  if (error.code && messages[error.code]) {
    return messages[error.code][language];
  }

  // Custom error messages
  if (error.message.includes('permission')) {
    return language === 'ar' 
      ? 'ليس لديك صلاحية لتنفيذ هذا الإجراء'
      : 'You do not have permission to perform this action';
  }

  if (error.message.includes('not found')) {
    return language === 'ar' ? 'غير موجود' : 'Not found';
  }

  return error.message;
}

export function handleApiError(
  error: unknown,
  toast: (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void,
  language: 'ar' | 'en' = 'en'
) {
  console.error('API Error:', error);

  const parsedError = parseSupabaseError(error);
  const errorMessage = getErrorMessage(parsedError, language);

  toast({
    title: language === 'ar' ? 'خطأ' : 'Error',
    description: errorMessage,
    variant: 'destructive',
  });
}

export function handleSuccess(
  message: string,
  toast: (props: { title: string; description?: string }) => void,
  language: 'ar' | 'en' = 'en'
) {
  toast({
    title: language === 'ar' ? 'نجح' : 'Success',
    description: message,
  });
}
