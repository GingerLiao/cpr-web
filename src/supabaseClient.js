// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// 替換成你自己的 Supabase URL 和 anon key
const supabaseUrl = 'https://vzvosharxrgtniuasrbn.supabase.co'
const supabaseAnonKey = 'sb_publishable__QZC454srC8fICmO63SuRg_RdKn45YV'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)