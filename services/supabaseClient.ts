import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const env = import.meta.env;

let supabaseUrl = (
  env.VITE_SUPABASE_URL || 
  env.SUPABASE_URL || 
  ''
).trim();

const supabaseAnonKey = (
  env.VITE_SUPABASE_ANON_KEY || 
  env.SUPABASE_ANON_KEY || 
  ''
).trim();

// Tự động sửa lỗi nếu user paste nhầm URL có chứa /rest/v1 hoặc dấu gạch chéo cuối
try {
  // Loại bỏ /rest/v1 (và có thể có trailing slash) nếu tồn tại ở cuối chuỗi
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/i, '');
  // Loại bỏ slash ở cuối nếu có
  supabaseUrl = supabaseUrl.replace(/\/+$/, '');
  console.log("Supabase URL initialized as:", supabaseUrl);
} catch(e) {
  console.error("Error parsing supabase url", e);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Thiếu cấu hình VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong Settings.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
