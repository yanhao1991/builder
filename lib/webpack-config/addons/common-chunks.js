/*
 * @file config for common-chunks
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')
const chunks = require('../../constants/chunks')

module.exports = (config, optimization) => {
  const optCommon = optimization.extractCommon
  const optVendor = optimization.extractVendor

  const cacheGroups = {}

  if (optVendor) {
    cacheGroups[optVendor] = {
      name: optVendor,
      chunks: 'all',
      minSize: Infinity
    }
  }

  const splitChunksOptions = optCommon
    ? { chunks: 'all', name: chunks.common, cacheGroups }
    : { chunks: 'all', name: chunks.common, minSize: Infinity, cacheGroups }

  return update(config, { optimization: { splitChunks: { $set: splitChunksOptions } } })
}
