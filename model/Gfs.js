/**
 * 获取指定群组的文件使用情况和文件数量信息。
 *
 * @async
 * @function df
 * @param {number} groupId - 群号。
 * @returns {Promise<{
*     free: number;       // 剩余可用空间大小（字节）
*     total: number;      // 总空间大小（字节）
*     used: number;       // 已使用空间大小（字节）
* } & {
*     file_count: number; // 当前文件数量
*     max_file_count: number; // 最大允许文件数量
* }>} 返回一个 Promise，解析为包含群文件使用情况和文件数量信息的对象。
*/
export async function df (groupId) {
  return await Bot.pickGroup(groupId).fs.df()
}
/**
 * 获取指定群组的文件信息。
 *
 * @async
 * @function stat
 * @param {number} groupId - 群号。
 * @param {string} path - 文件路径。
 * @returns {Promise<GfsFileStat>} 返回一个 Promise，解析为文件信息对象。
 */
export async function dir (groupId, pid = '/', start = 0, limit = 100) {
  return await Bot.pickGroup(groupId).fs.dir(pid, start, limit)
}

/**
 * 从指定群组下载文件。
 *
 * @async
 * @function download
 * @param {number} groupId - 群号。
 * @param {string} fid - 文件FID。
 * @returns {Promise<Buffer>} 返回一个 Promise，解析为文件的二进制数据。
 */
export async function download (groupId, fid) {
  return await Bot.pickGroup(groupId).fs.download(fid)
}

/**
 * 将指定文件从一个群组转发到另一个群组。
 *
 * @async
 * @function forward
 * @param {number} groupId - 目标群号。
 * @param {GfsFileStat} stat - 文件的信息。
 * @param {string} [pid='/'] - 文件在目标群组中的父目录PID。
 * @param {string} [name] - 文件在目标群组中的新名称。
 * @returns {Promise<GfsFileStat>} 返回一个Promise，解析为转发后的文件状态信息。
 */
export async function forward (groupId, stat, pid = '/', name) {
  return await Bot.pickGroup(groupId).fs.forward(stat, pid, name)
}

/**
 * 将指定的离线文件转发到群组。
 *
 * @async
 * @function forwardOfflineFile
 * @param {number} groupId - 目标群号。
 * @param {string} fid - 离线文件的FID。
 * @param {string} name - 离线文件在目标群组中的新名称。
 * @returns {Promise<GfsFileStat>} 返回一个Promise，解析为转发后的文件状态信息。
 */
export async function forwardOfflineFile (groupId, fid, name) {
  return await Bot.pickGroup(groupId).fs.forwardOfflineFile(fid, name)
}

/**
 * 在指定群组中创建新的目录,仅支持根目录
 *
 * @async
 * @function mkdir
 * @param {number} groupId - 目标群号。
 * @param {string} name - 要创建的目录名称。
 * @returns {Promise<GfsFileStat>} 返回一个Promise，解析为创建后的目录状态信息。
 */
export async function mkdir (groupId, name) {
  return await Bot.pickGroup(groupId).fs.mkdir(name)
}

/**
 * 将指定文件移动到指定群组的指定目录。
 *
 * @async
 * @function mv
 * @param {number} groupId - 目标群号。
 * @param {string} fid - 要移动的文件FID。
 * @param {string} pid - 目标目录的PID。
 * @returns {Promise<GfsFileStat>} 返回一个Promise，解析为移动后的文件状态信息。
 */
export async function mv (groupId, fid, pid) {
  return await Bot.pickGroup(groupId).fs.move(fid, pid)
}

/**
 * 重命名指定群组中的文件。
 *
 * @async
 * @function rename
 * @param {number} groupId - 目标群号。
 * @param {string} fid - 要重命名的文件/目录FID。
 * @param {string} name - 新名称。
 * @returns {Promise<GfsFileStat>} 返回一个Promise，解析为重命名后的文件状态信息。
 */
export async function rename (groupId, fid, name) {
  return await Bot.pickGroup(groupId).fs.rename(fid, name)
}

/**
 * 删除指定群组中的文件或目录(删除目录会删除下面的所有文件)
 *
 * @async
 * @function rm
 * @param {number} groupId - 目标群号。
 * @param {string} fid - 要删除的文件或目录的FID。
 * @returns {Promise<GfsFileStat>} 返回一个Promise，解析为删除后的文件或目录状态信息。
 */
export async function rm (groupId, fid) {
  return await Bot.pickGroup(groupId).fs.rm(fid)
}

/**
 * 获取指定群组中文件的详细信息。
 *
 * @async
 * @function stat
 * @param {number} groupId - 目标群号。
 * @param {string} fid - 文件FID。
 * @returns {Promise<GfsFileStat>} 返回一个Promise，解析为文件的详细信息对象。
 */
export async function stat (groupId, fid) {
  return await Bot.pickGroup(groupId).fs.stat(fid)
}
