export function handleApiError(
  error: unknown, 
  toast: (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void,
  language: 'ar' | 'en' = 'en'
) {
  console.error('API Error:', error);
  
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  toast({
    title: language === 'ar' ? 'خطأ' : 'Error',
    description: errorMessage,
    variant: 'destructive',
  });
}
