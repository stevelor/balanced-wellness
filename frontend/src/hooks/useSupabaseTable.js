import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Generic hook for reading a Supabase table with fetch-on-mount,
 * loading/error state, and a `refetch` you can call after a mutation
 * (insert/update/delete) instead of copy-pasting the same fetch function
 * into every admin component.
 *
 * options:
 *   select    - columns to select, e.g. '*' or a nested select string (default '*')
 *   orderBy   - column to order by
 *   ascending - sort direction (default true)
 *   eq        - { column, value } to filter with .eq(column, value).
 *               If value is null/undefined, the fetch is skipped — handy
 *               when you're waiting on something like the current user's id.
 *
 * Returns: { data, setData, loading, error, refetch }
 */
export function useSupabaseTable(table, options = {}) {
  const { select = '*', orderBy, ascending = true, eq } = options
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    // Skip fetching until a required filter value (e.g. a user id) is ready.
    if (eq && (eq.value === null || eq.value === undefined)) {
      setLoading(false)
      return
    }

    setLoading(true)
    let query = supabase.from(table).select(select)

    if (eq) query = query.eq(eq.column, eq.value)
    if (orderBy) query = query.order(orderBy, { ascending })

    const { data, error } = await query

    if (error) {
      console.error(`Error fetching ${table}:`, error)
      setError(error)
    } else {
      setData(data)
      setError(null)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, orderBy, ascending, eq?.column, eq?.value])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, setData, loading, error, refetch: fetchData }
}
