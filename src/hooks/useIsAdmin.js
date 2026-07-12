import { useBoardAdmin } from '@/hooks/useBoardAdmin'

export function useIsAdmin() {
  const { canManageBoard, loading } = useBoardAdmin()

  return { isAdmin: canManageBoard, loading }
}
