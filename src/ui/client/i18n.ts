import { DICT_ZH } from './i18nZh'

export type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * 界面只有中文，词典也只有一份（i18nZh）。
 *
 * 这里把 en 指向同一份中文词典，而不是只注册 zh：DSH 语言服务的回退链固定以 en 收尾
 * （FALLBACK_LOCALE = 'en'），只注册 zh 的话，界面语言一旦是英文就会露出
 * `turnusage.title` 这类键名。指向同一个对象不增加任何体积。
 *
 * 这不是多语言支持——没有第二份文案；改文案只改 i18nZh.ts。
 */
export const DICTS = { en: DICT_ZH, zh: DICT_ZH }

export { DICT_ZH }
export type { DictKey } from './i18nZh'
