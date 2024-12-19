export async function categorizeApiRoutes (apiList) {
  const categorizedApis = {}

  apiList.forEach(api => {
    const pathSegments = api.path.split('/').filter(segment => segment !== '')

    let currentCategory = categorizedApis

    pathSegments.forEach((segment, index) => {
      if (!currentCategory[segment]) {
        currentCategory[segment] = index === pathSegments.length - 1 ? { ...api } : {}
      }
      currentCategory = currentCategory[segment]
    })

    if (api.key && api.key.length > 0) {
      currentCategory.key = api.key
    }
  })

  return categorizedApis
}
