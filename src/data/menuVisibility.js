function canSeeMenuItem(item, { isSuperAdmin, isLoggedIn, superAdminGate }) {
  if (item?.requiresAuth && !isLoggedIn) {
    return false
  }

  if (item?.requiresSuperAdmin) {
    if (!superAdminGate) {
      return true
    }

    return Boolean(isSuperAdmin)
  }

  return true
}

/**
 * Hide menu entries the viewer must not see.
 * requiresAuth: logged-in members only.
 * requiresSuperAdmin: super admin only while superAdminGate is on.
 */
export function filterVisibleMenuItems(
  items,
  { isSuperAdmin = false, isLoggedIn = false, superAdminGate = true } = {},
) {
  const context = { isSuperAdmin, isLoggedIn, superAdminGate }

  return (items ?? [])
    .filter((item) => canSeeMenuItem(item, context))
    .map((item) => {
      if (!item.children) {
        return item
      }

      return {
        ...item,
        children: item.children.filter((child) => canSeeMenuItem(child, context)),
      }
    })
}
