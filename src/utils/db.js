import { supabase } from '../supabase';

function client() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

/**
 * Fetch data for the current authenticated user
 * Automatically includes user_id filter for RLS
 */
export async function fetchUserData(table, options = {}) {
  try {
    const { data: { user } } = await client().auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    let query = client()
      .from(table)
      .select(options.select || '*')
      .eq('user_id', user.id);

    // Apply filters if provided
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Apply ordering if provided
    if (options.order) {
      query = query.order(options.order.column, { 
        ascending: options.order.ascending !== false 
      });
    }

    // Apply limit if provided
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error fetching from ${table}:`, err.message);
    throw err;
  }
}

/**
 * Insert data for the current authenticated user
 * Automatically includes user_id
 */
export async function insertUserData(table, record) {
  try {
    const { data: { user } } = await client().auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await client()
      .from(table)
      .insert([
        {
          ...record,
          user_id: user.id,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (err) {
    console.error(`Error inserting into ${table}:`, err.message);
    throw err;
  }
}

/**
 * Update user data
 * Automatically verifies ownership via user_id
 */
export async function updateUserData(table, id, updates) {
  try {
    const { data: { user } } = await client().auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await client()
      .from(table)
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select();

    if (error) throw error;
    
    if (data.length === 0) {
      throw new Error('Record not found or you do not have permission to update it');
    }

    return data[0];
  } catch (err) {
    console.error(`Error updating ${table}:`, err.message);
    throw err;
  }
}

/**
 * Delete user data
 * Automatically verifies ownership via user_id
 */
export async function deleteUserData(table, id) {
  try {
    const { data: { user } } = await client().auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await client()
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (err) {
    console.error(`Error deleting from ${table}:`, err.message);
    throw err;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const { data: { user } } = await client().auth.getUser();
    return user;
  } catch (err) {
    console.error('Error getting current user:', err.message);
    return null;
  }
}
