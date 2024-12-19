/**
 * 对API路由进行分类的异步函数。
 * 该函数接收一个API列表，根据API的路径将其分类到一个嵌套的对象结构中。
 * 每个路径段都会在分类对象中创建一个新的层级，最后一层包含完整的API对象。
 *
 * @param {Array} apiList - 包含API对象的数组，每个API对象应包含`path`和可选的`key`属性。
 * @returns {Object} - 分类后的API对象，嵌套结构反映了API路径的层级。
 */
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
