// Utility functions for error handling
import { isSupabaseConfigured } from '../services/supabaseClient';

export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error?.message || '';
  const errorCode = error?.code || '';
  
  return (
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
    errorMessage.includes('ERR_QUIC_PROTOCOL_ERROR') ||
    errorMessage.includes('QUIC_NETWORK_IDLE_TIMEOUT') ||
    errorMessage.includes('QUIC_PROTOCOL_ERROR') ||
    errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('DNS_PROBE_FINISHED') ||
    errorMessage.includes('placeholder.supabase.co') ||
    errorMessage.includes('timeout') ||
    errorCode === 'ERR_INTERNET_DISCONNECTED' ||
    errorCode === 'ERR_QUIC_PROTOCOL_ERROR' ||
    errorCode === 'QUIC_NETWORK_IDLE_TIMEOUT' ||
    errorCode === 'ERR_NAME_NOT_RESOLVED' ||
    errorCode === 'ENOTFOUND' ||
    !navigator.onLine
  );
};

export const getErrorMessage = (error: any): string => {
  // Kiểm tra xem Supabase có được cấu hình không
  if (!isSupabaseConfigured()) {
    return 'Supabase chưa được cấu hình. Vui lòng tạo file .env.local với VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY. Xem README.md để biết thêm chi tiết.';
  }
  
  if (isNetworkError(error)) {
    // DNS / offline / transient network errors
    return 'Không thể kết nối tới Supabase (lỗi mạng/DNS). Vui lòng kiểm tra Internet, DNS/VPN và cấu hình Supabase.';
  }
  
  return error?.message || 'Đã xảy ra lỗi không xác định.';
};

// Retry function with exponential backoff for network errors
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if it's not a network error or if we've exhausted retries
      if (!isNetworkError(error) || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff (1000ms, 2000ms, 4000ms)
      const delay = initialDelay * Math.pow(2, attempt);
      console.warn(`⚠️ Network error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, error);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};
