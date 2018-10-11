/**
 * Resolves path for a plugin to force the basis of path.resolve
 * to check the running process node_module directory first.
 *
 * @param {*} pluginPath
 */
const resolvePluginPath = function (pluginPath: string) {
  const { path, fs } = Panacea.container

  // First try to find plugin directly in the process path, otherwise try to resolve an absolute or relative path..
  const processRelativeNodeModulePluginPath = path.resolve(process.cwd(), 'node_modules', pluginPath)
  if (fs.existsSync(processRelativeNodeModulePluginPath)) {
    return processRelativeNodeModulePluginPath
  } else if (fs.existsSync(path.resolve(pluginPath))) {
    return path.resolve(pluginPath)
  }
  return false
}

export { resolvePluginPath }
