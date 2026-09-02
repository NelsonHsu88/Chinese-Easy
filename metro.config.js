const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

/*
 * Stroke-data shards ride along as assets, not as source.
 *
 * `.json` is a *source* extension, so `import data from './x.json'` inlines the
 * whole file into the JS bundle — which is how 15.8MB of stroke data became
 * 25.8MB of Hermes bytecode and 59% of the bundle. Registering `.hanzishard` as
 * an asset extension makes `require()` return a reference instead, so the bytes
 * are packaged with the app and read at runtime for the characters actually
 * drawn. See scripts/buildHanziShards.mjs and lib/hanziStrokeData.ts.
 */
config.resolver.assetExts.push('hanzishard')

/*
 * The ad SDK does not exist on web, and must not be bundled there.
 *
 * `react-native-google-mobile-ads` imports `codegenNativeComponent`, which is
 * native-only, so Metro *fails the web build* rather than merely warning. That
 * is a bundling-time failure, which means the lazy `require` in
 * `lib/ads/nativeModule.ts` cannot save it — a try/catch runs far too late to
 * matter when the bundle itself will not build.
 *
 * Resolving it to an empty module on web keeps `npm run web` working and hands
 * `nativeAds()` an object with none of the fields it looks for, which it treats
 * as "no SDK" exactly like the Expo Go case. One disabled state, three causes.
 */
const blockedOnWeb = new Set(['react-native-google-mobile-ads'])
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && blockedOnWeb.has(moduleName)) {
    return { type: 'empty' }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './src/global.css' })
