import { DICT_EN } from './i18nEn'
import { DICT_ZH } from './i18nZh'

export type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * 界面只维护中文与英文。DSH 的语言服务以 zh/en 为基线（LOCALE_IDS），其余界面语言由它
 * 回退到 en（FALLBACK_LOCALE），所以这里只注册这两份词典，避免保留没人维护的翻译。
 */
export const DICTS = { en: DICT_EN, zh: DICT_ZH }

export { DICT_EN, DICT_ZH }
export type { DictKey } from './i18nZh'
