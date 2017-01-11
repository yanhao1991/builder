/*
 * @file transform to loader & config
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')
const update = require('immutability-helper')

const paths = require('../../paths')
const utils = require('../../utils')
const transforms = require('../../constants/transforms')

const makeExtensionPattern = extension => new RegExp(`\\.${extension}\$`)

const makeLoaderName = name => (
  /\-loader$/.test(name) ? name : `${name}-loader`
)

// 修改 babel-loader 的配置以适配 webpack2
// 找到 ES2015 这个 preset，添加 { "modules": false }
// 注意后续可能要修改这边逻辑，考虑会对 import / export 进行转换的不一定只有 ES2015 这个 preset
const adaptBabelLoaderOptions = options => {
  if (!options || !options.presets) {
    return options
  }
  return update(options, {
    presets: {
      $set: options.presets.map(
        preset => {
          if (preset === 'ES2015') {
            return ['ES2015', { 'modules': false }]
          }
          if (preset && preset[0] === 'ES2015') {
            return ['ES2015', utils.extend({}, preset[1], { 'modules': false })]
          }
          return preset
        }
      )
    }
  })
}

const makeRule = (extension, ...loaderList) => {
  const rule = {
    test: makeExtensionPattern(extension),
    use: loaderList.map(
      ({ loader, options }) => {
        loader = makeLoaderName(loader)
        options = loader === 'babel-loader' ? adaptBabelLoaderOptions(options) : options
        return { loader, options }
      }
    )
  }

  // 针对后缀为 js 的 transform，控制范围（不对依赖做转换）
  if (extension === 'js') {
    rule.exclude = /(node_modules)/
  }

  return rule
}

const addDefaultExtension = (config, extension) => {
  extension = extension && ('.' + extension)
  if (config.resolve.extensions.indexOf(extension) >= 0) {
    return config
  }
  return update(config, {
    resolve: {
      extensions: {
        $push: [extension]
      }
    }
  })
}

const makeReactBabelOptions = config => utils.extend(
  {
    presets: ['es2015', 'react'],
    plugins: ['react-hot-loader/babel']
  },
  config && config.options
)

module.exports = (config, extension, transform) => {
  if (!extension || typeof extension !== 'string') {
    throw new TypeError(`Invalid extension: ${JSON.stringify(extension)}`)
  }

  if (typeof transform === 'string') {
    transform = {
      transformer: transform
    }
  }

  if (!transform || !transform.transformer || typeof transform.transformer !== 'string') {
    throw new TypeError(`Invalid transform info: ${JSON.stringify(transform)}`)
  }

  switch(transform.transformer) {
    case transforms.css:
    case transforms.less:
    case transforms.sass:
    case transforms.stylus:
      const loaders = [
        { loader: 'style-loader' },
        { loader: 'css-loader' },
        { loader: 'postcss-loader' }
      ]
      if (transform.transformer !== 'css') {
        loaders.push({ loader: transform.transformer, options: transform.config })
      }
      config = update(config, {
        module: { rules: {
          $push: [makeRule(extension, ...loaders)]
        } }
      })
      break

    case transforms.babel:
      config = addDefaultExtension(config, extension)
      config = update(config, {
        module: { rules: {
          $push: [makeRule(extension, { loader: 'babel', options: transform.config })]
        } }
      })
      break

    case transforms.jsx:
      config = addDefaultExtension(config, extension)
      config = update(config, {
        module: { rules: {
          $push: [makeRule(extension, {
            loader: 'babel',
            options: makeReactBabelOptions(transform.config)
          })]
        } }
      })
      break

    case transforms.ts:
    case transforms.tsx:
      const babelOptions = (
        transform.transformer === transforms.tsx
        ? makeReactBabelOptions(transform.config)
        : transform.config
      )

      config = addDefaultExtension(config, extension)
      config = update(config, {
        module: { rules: {
          $push: [makeRule(
            extension,
            { loader: 'babel', options: babelOptions },
            { loader: 'ts' }
          )]
        } }
      })
      break

    case transforms.flow:
      config = addDefaultExtension(config, extension)
      config = update(config, {
        module: { rules: {
          $push: [makeRule(extension, { loader: transform.transformer, options: transform.config })]
        } }
      })
      break

    case transforms.file:
      config = update(config, {
        module: { rules: {
          $push: [
            makeRule(extension, {
              loader: 'file',
              options: { name: 'static/[name]-[hash].[ext]' } 
            })
          ]
        } }
      })
      break

    default:
      config = update(config, {
        module: { rules: {
          $push: [makeRule(extension, { loader: transform.transformer, options: transform.config })]
        } }
      })
  }

  return config
}