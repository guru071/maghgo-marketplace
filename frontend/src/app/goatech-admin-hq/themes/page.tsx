import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const revalidate = 0; // Disable caching so new themes appear immediately

export default async function ThemesDashboard() {
  const supabase = createServerSupabaseClient();
  
  // Try fetching themes (Will return error or empty if table doesn't exist yet)
  const { data: themes, error } = await supabase
    .from('themes')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Themes</h1>
          <p className="text-gray-600 mt-1">Manage storefront themes and plan requirements.</p>
        </div>
        <Link 
          href="/goatech-admin-hq/themes/create" 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Theme
        </Link>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          <strong>Database Error:</strong> Make sure you have run the database migration script. ({error.message})
        </div>
      ) : !themes || themes.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-xl">
          <p className="text-gray-500 mb-4">No themes found. Run the seed script to generate 100 themes!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {themes.map((theme) => {
            const config = theme.config || {};
            const primaryColor = config.colors?.primary || '#000';
            const secondaryColor = config.colors?.secondary || '#ccc';
            const bgColor = config.colors?.background || '#fff';
            
            return (
              <div key={theme.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div 
                  className="h-32 w-full border-b border-gray-100 flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: bgColor }}
                >
                  <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white/10 to-black/10"></div>
                  <div className="flex gap-2 relative z-10">
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: primaryColor }}></div>
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: secondaryColor }}></div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 truncate">{theme.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      theme.plan_required === 'basic' ? 'bg-emerald-100 text-emerald-800' :
                      theme.plan_required === 'premium' ? 'bg-orange-100 text-orange-800' :
                      theme.plan_required === 'agency' ? 'bg-purple-100 text-purple-800' :
                      'bg-cyan-100 text-cyan-800'
                    }`}>
                      {theme.plan_required}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{theme.description}</p>
                  
                  <div className="flex justify-end border-t border-gray-100 pt-3">
                    <button className="text-sm text-blue-600 font-medium hover:text-blue-800">
                      Edit Theme
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
