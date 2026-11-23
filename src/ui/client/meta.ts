declare const __DSH_TONGJI_VERSION__: string | undefined
declare const __DSH_TONGJI_REPO__: string | undefined

export const PLUGIN_NAME = 'tongji'
export const PLUGIN_VERSION: string =
  typeof __DSH_TONGJI_VERSION__ === 'string' ? __DSH_TONGJI_VERSION__ : '0.0.0-dev'
export const PLUGIN_REPO: string =
  typeof __DSH_TONGJI_REPO__ === 'string' && __DSH_TONGJI_REPO__ !== ''
    ? __DSH_TONGJI_REPO__
    : 'https://github.com/yueyexiayu/dsh-tongji'
export const PLUGIN_REPO_SHORT = PLUGIN_REPO.replace(/^https?:\/\/github\.com\//, '')
