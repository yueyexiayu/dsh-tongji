/**
 * tongji v0.1.39
 * DSH 会话可观测性面板：统计、上下文、编队与跨会话洞察。
 * @author yueyexiayu <yueyexiayu@users.noreply.github.com>
 * @license Apache-2.0
 * @homepage https://github.com/yueyexiayu/dsh-tongji#readme
 * @built 2026-11-24T18:09:33+08:00
 * @commit e21cc42bf24b (dirty working tree) on main
 * @commit-date 2026-11-24T17:11:35+08:00
 */

/**
 * Host half for the tongji plugin.
 *
 * Two capability sets live here:
 *   - the panel host under ../ui/host (context timeline, detail, overview, fleet, skills);
 *   - tongji's own usage route, which folds per-turn/per-step token usage.
 *
 * Both share one `apply`, so the plugin stays a single Cordis row.
 */
import { MessagePort } from "node:worker_threads";
import { FileAttachmentRef, ImageAttachmentRef, ImageRequestTarget } from "@deepseek-ai/dsh-attachment";
import { LocalizedText } from "@deepseek-ai/dsh-package-manifest";
declare function isArrayBufferLike(value: any): value is ArrayBufferLike;
declare function isArrayBufferSource(value: any): value is Binary.Source;
/** Binary source detection and base64/hex conversion helpers. */
declare namespace Binary {
  type Source<T extends ArrayBufferLike = ArrayBufferLike> = T | ArrayBufferView<T>;
  const is: typeof isArrayBufferLike;
  const isSource: typeof isArrayBufferSource;
  function fromSource<T extends ArrayBufferLike>(source: Source<T>): T;
  function toBase64(source: Source): string;
  function fromBase64(source: string): ArrayBuffer | Uint8Array<ArrayBuffer>;
  function toHex(source: Source): string;
  function fromHex(source: string): ArrayBuffer;
}
/** String/symbol keyed dictionary type. */
type Dict<T = any, K extends string | symbol = string> = { [key in K]: T; };
/** Wrap a value in `Promise`, preserving the resolved type of existing promises. */
type Promisify<T> = Promise<T extends Promise<infer S> ? S : T>;
/** Accept a value or promise unless the value type is already promise-like. */
type Awaitable<T> = [T] extends [Promise<unknown>] ? T : T | Promise<T>;
/** Shared config references used by schema validators and plugin runtimes. */
/** Recursively readonly data returned by a volatile config reference. */
type VolatileSnapshot<T> = T extends object ? { readonly [K in keyof T]: VolatileSnapshot<T[K]>; } : T;
/** A stable reference; keep the reference, or capture its value for one operation only. */
interface Volatile<T> {
  /** @returns the current immutable snapshot, including undefined for an absent value. */
  get(): VolatileSnapshot<T>;
}
/** The Standard Typed interface. This is a base type extended by other specs. */
interface StandardTypedV1<Input = unknown, Output = Input> {
  /** The Standard properties. */
  readonly "~standard": StandardTypedV1.Props<Input, Output>;
}
declare namespace StandardTypedV1 {
  /** The Standard Typed properties interface. */
  interface Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1;
    /** The vendor name of the schema library. */
    readonly vendor: string;
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input, Output> | undefined;
  }
  /** The Standard Typed types interface. */
  interface Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input;
    /** The output type of the schema. */
    readonly output: Output;
  }
  /** Infers the input type of a Standard Typed. */
  type InferInput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["input"];
  /** Infers the output type of a Standard Typed. */
  type InferOutput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["output"];
}
/** The Standard Schema interface. */
interface StandardSchemaV1<Input = unknown, Output = Input> {
  /** The Standard Schema properties. */
  readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}
declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
    /** Validates unknown input values. */
    readonly validate: (value: unknown, options?: StandardSchemaV1.Options | undefined) => Result<Output> | Promise<Result<Output>>;
  }
  /** The result interface of the validate function. */
  type Result<Output> = SuccessResult<Output> | FailureResult;
  /** The result interface if validation succeeds. */
  interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output;
    /** A falsy value for `issues` indicates success. */
    readonly issues?: undefined;
  }
  interface Options {
    /** Explicit support for additional vendor-specific parameters, if needed. */
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }
  /** The result interface if validation fails. */
  interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>;
  }
  /** The issue interface of the failure output. */
  interface Issue {
    /** The error message of the issue. */
    readonly message: string;
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }
  /** The path segment interface of the issue. */
  interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey;
  }
  /** The Standard types interface. */
  interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {}
  /** Infers the input type of a Standard. */
  type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
  /** Infers the output type of a Standard. */
  type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
declare const kSchema: unique symbol;
declare global {
  namespace Schemastery {
    /** Convert primitive constructors, constants, and existing schemas into a schema type. */
    type From<X> = X extends string | number | boolean ? Schema<X> : X extends Schema<any, any, SchemaMode> ? X : X extends typeof String ? Schema<string> : X extends typeof Number ? Schema<number> : X extends typeof Boolean ? Schema<boolean> : X extends typeof Function ? Schema<Function, (...args: any[]) => any> : X extends Constructor<infer S> ? Schema<S> : never;
    type TypeS1<X> = X extends Schema<infer S, infer _T, infer _M> ? S : never;
    type Inverse<X> = X extends Schema<infer _S, infer T, infer M> ? (arg: SchemaOutput<T, M>) => void : never;
    /** Input type accepted by a schema-like value. */
    type TypeS<X> = TypeS1<From<X>>;
    /** Output type returned by a schema-like value after validation. */
    type TypeT<X> = ReturnType<From<X>>;
    /** Resolver callback used by custom schema types registered with `Schema.extend()`. */
    type Resolve = (data: any, schema: Schema, options: Options, strict?: boolean) => [any, any?];
    /** Input type accepted by one schema in an intersection. */
    type IntersectS<X> = From<X> extends Schema<infer S, infer _T, infer _M> ? S : never;
    /** Output type returned by one schema in an intersection. */
    type IntersectT<X> = Inverse<From<X>> extends ((arg: infer T) => void) ? T : never;
    type TupleS<X extends readonly any[]> = X extends readonly [infer L, ...infer R] ? [TypeS<L>?, ...TupleS<R>] : any[];
    type TupleT<X extends readonly any[]> = X extends readonly [infer L, ...infer R] ? [TypeT<L>?, ...TupleT<R>] : any[];
    type ObjectS<X extends Dict> = { [K in keyof X]?: TypeS<X[K]> | null; } & Dict;
    type ObjectT<X extends Dict> = { [K in keyof X]: TypeT<X[K]>; } & Dict;
    type Constructor<T = any> = new (...args: any[]) => T;
    /** Static constructor and factory methods exposed by the default `Schema` export. */
    interface Static {
      <T = any>(options: Partial<Schema<T>>): Schema<T>;
      new <T = any>(options: Partial<Schema<T>>): Schema<T>;
      prototype: Schema;
      /** Validate a value against a schema node and return `[output, adaptedInput?]`. */
      resolve: Resolve;
      /** Infer a schema from a primitive value, constructor, or existing schema. */
      from<X = any>(source?: X): From<X>;
      /** Register a resolver for a custom schema `type`. */
      extend(type: string, resolve: Resolve): void;
      /** Accept any value without validation. */
      any<T = any>(): Schema<T>;
      /** Accept only nullable input. */
      never(): Schema<never>;
      /** Accept exactly one constant value. */
      const<const T>(value: T): Schema<T>;
      /** Accept strings, with optional metadata constraints added by instance methods. */
      string(): Schema<string>;
      /** Accept numbers, with optional range and step constraints. */
      number(): Schema<number>;
      /** Accept non-negative integer numbers. */
      natural(): Schema<number>;
      /** Accept a number between 0 and 1 and mark it as a slider. */
      percent(): Schema<number>;
      /** Accept booleans. */
      boolean(): Schema<boolean>;
      /** Accept `Date` instances or parse datetime strings into `Date` objects. */
      date(): Schema<string | Date, Date>;
      /** Accept `RegExp` instances or parse strings into regular expressions. */
      regExp(flag?: string): Schema<string | RegExp, RegExp>;
      /** Accept binary sources and normalize them to `ArrayBufferLike`. */
      arrayBuffer(): Schema<Binary.Source, ArrayBufferLike>;
      arrayBuffer(encoding: 'hex' | 'base64'): Schema<Binary.Source | string, ArrayBufferLike>;
      /** Accept a numeric bitset or string keys and normalize to a number. */
      bitset<K extends string>(bits: Partial<Record<K, number>>): Schema<number | readonly K[], number>;
      /** Accept functions. */
      function(): Schema<Function, (...args: any[]) => any>;
      /** Accept instances of a constructor or objects whose constructor name matches. */
      is(constructor: string): Schema;
      is<T>(constructor: Constructor<T>): Schema<T>;
      /** Accept arrays whose elements match `inner`. */
      array<X>(inner: X): Schema<TypeS<X>[], TypeT<X>[]>;
      /** Accept plain objects with values matching `inner` and optional key schema. */
      dict<X, Y extends Schema<any, string> = Schema<string>>(inner: X, sKey?: Y): Schema<Dict<TypeS<X>, TypeS<Y>>, Dict<TypeT<X>, TypeT<Y>>>;
      /** Accept tuple arrays where each index matches the corresponding schema. */
      tuple<const X extends readonly any[]>(list: X): Schema<TupleS<X>, TupleT<X>>;
      /** Accept plain objects; infer fields from the dictionary, not the enclosing schema's output type. */
      object<X extends Dict>(dict: X): Schema<ObjectS<NoInfer<X>>, ObjectT<NoInfer<X>>>;
      /** Accept values matching at least one schema in `list`. */
      union<const X>(list: readonly X[]): Schema<TypeS<X>, TypeT<X>>;
      /** Accept values matching every schema in `list`, merging object outputs. */
      intersect<const X>(list: readonly X[]): Schema<IntersectS<X>, IntersectT<X>>;
      /** Validate with `inner`, then convert the result with `callback`. */
      transform<X, T>(inner: X, callback: (value: TypeS<X>, options: Schemastery.Options) => T, preserve?: boolean): Schema<TypeS<X>, T>;
      /** Defer construction of a recursive schema until validation or serialization. */
      lazy<X extends Schema<any, any, SchemaMode>>(callback: () => X): X;
      ValidationError: typeof ValidationError;
    }
    /** Runtime validation options shared by all schema calls. */
    interface Options {
      /** Remove invalid object properties instead of throwing when possible. */
      autofix?: boolean;
      /** Skip validation for selected values and schema nodes. */
      ignore?(data: any, schema: Schema): boolean;
      /** Path used to format nested validation errors. */
      path?: (keyof any)[];
    }
    /** UI and validation metadata attached by schema builder methods. */
    interface Meta<T = any> {
      default?: T extends {} ? Partial<T> : T;
      required?: boolean;
      /** Parse this node as a stable config reference; its type and UI metadata remain unchanged. */
      volatile?: boolean;
      disabled?: boolean;
      collapse?: boolean;
      badges?: {
        text: string;
        type: string;
      }[];
      hidden?: boolean;
      loose?: boolean;
      role?: string;
      extra?: any;
      link?: string;
      description?: string | Dict<string>;
      comment?: string;
      pattern?: {
        source: string;
        flags?: string;
      };
      max?: number;
      min?: number;
      step?: number;
    }
  }
  /** Callable schema instance that validates input and returns normalized output. */
  interface Schemastery<S = any, T = S, Mode extends SchemaMode = 'plain'> {
    (data?: S | null, options?: Schemastery.Options): SchemaOutput<T, Mode>;
    new (data?: S | null, options?: Schemastery.Options): SchemaOutput<T, Mode>;
    [kSchema]: true;
    uid: number;
    meta: Schemastery.Meta<T>;
    type: string;
    sKey?: Schema;
    inner?: Schema;
    list?: Schema[];
    dict?: Dict<Schema>;
    bits?: Dict<number>;
    callback?: Function;
    constructor?: string | Function;
    builder?: Function;
    value?: T;
    refs?: Dict<Schema>;
    preserve?: boolean;
    '~standard': StandardSchemaV1.Props;
    /** Format this schema as a compact TypeScript-like type string. */
    toString(inline?: boolean): string;
    /** Serialize this schema, preserving shared and recursive references. */
    toJSON(): Schema<S, T, Mode>;
    /** Mark nullable input as invalid unless a default supplies a fallback. */
    required<R extends boolean = true>(value?: R): Schema<S, T, SetRequired<Mode, R>>;
    /**
     * Parse this config field as a stable reference containing immutable data.
     * @returns a schema whose output supports get(), including when the field is absent.
     */
    volatile(): Schema<NoInfer<S>, NoInfer<T>, Mode extends 'defined' | 'volatile-defined' ? 'volatile-defined' : 'volatile'>;
    /** Hide this schema node from UI renderers. */
    hidden(value?: boolean): Schema<S, T, Mode>;
    /** Return the default value instead of throwing when validation fails. */
    loose(value?: boolean): Schema<S, T, Mode>;
    /** Attach a renderer role and optional role-specific metadata. */
    role(text: string, extra?: any): Schema<S, T, Mode>;
    /** Attach an external documentation link. */
    link(link: string): Schema<S, T, Mode>;
    /** Set the fallback value used for nullable input. */
    default(value: T | NoInfer<Partial<S>>): Schema<S, T, SetRequired<Mode, true>>;
    /** Attach an auxiliary comment for documentation or form UIs. */
    comment(text: string): Schema<S, T, Mode>;
    /** Attach a localized or plain description for documentation or form UIs. */
    description(text: string): Schema<S, T, Mode>;
    /** Mark this schema node as disabled for form UIs. */
    disabled(value?: boolean): Schema<S, T, Mode>;
    /** Request collapsed rendering for nested form UIs. */
    collapse(value?: boolean): Schema<S, T, Mode>;
    /** Add a deprecated badge to this schema node. */
    deprecated(): Schema<S, T, Mode>;
    /** Add an experimental badge to this schema node. */
    experimental(): Schema<S, T, Mode>;
    /** Require strings to match a regular expression. */
    pattern(regexp: RegExp): Schema<S, T, Mode>;
    /** Set an inclusive maximum for numbers or collection lengths. */
    max(value: number): Schema<S, T, Mode>;
    /** Set an inclusive minimum for numbers or collection lengths. */
    min(value: number): Schema<S, T, Mode>;
    /** Set the numeric increment constraint. */
    step(value: number): Schema<S, T, Mode>;
    /** Add or replace an object property schema. */
    set(key: string, value: Schema): Schema<S, T, Mode>;
    /** Append a tuple, union, or intersection member schema. */
    push(value: Schema): Schema<S, T, Mode>;
    /** Remove values equal to schema defaults from normalized output. */
    simplify(value?: any): any;
    /** Return a schema clone with descriptions merged from locale messages. */
    i18n(messages: Dict): Schema<S, T, Mode>;
    /** Attach arbitrary metadata consumed by form renderers and downstream tools. */
    extra<K extends keyof Schemastery.Meta>(key: K, value: Schemastery.Meta[K]): Schema<S, T, Mode>;
  }
}
declare class ValidationError extends TypeError {
  options: Schemastery.Options;
  name: string;
  constructor(message: string, options: Schemastery.Options);
  static is(error: any): error is ValidationError;
}
type SchemaMode = 'plain' | 'defined' | 'volatile' | 'volatile-defined';
type SchemaOutput<T, M extends SchemaMode> = M extends 'volatile' ? Volatile<T | undefined> : M extends 'volatile-defined' ? Volatile<T> : T;
type SetRequired<M extends SchemaMode, R extends boolean> = M extends 'volatile' | 'volatile-defined' ? R extends true ? 'volatile-defined' : 'volatile' : R extends true ? 'defined' : 'plain';
type Schema<S = any, T = S, Mode extends SchemaMode = 'plain'> = Schemastery<S, T, Mode>;
declare const Schema: Schemastery.Static;
/** Ordered collection of disposable values with O(1) deletion by value. */
declare class DisposableList<T extends WeakKey> {
  private sn;
  private map;
  private weak;
  get length(): number;
  push(value: T): () => boolean;
  delete(value: T): boolean;
  clear(): T[];
  [Symbol.iterator](): MapIterator<T>;
}
/** Shared symbols used to avoid public property-name collisions. */
declare const symbols: {
  shadow: symbol;
  caller: symbol;
  receiver: symbol;
  original: symbol;
  metadata: symbol;
  initHooks: symbol;
  checkProto: symbol;
  effect: typeof Context.effect;
  filter: typeof Context.filter;
  isolate: typeof Context.isolate;
  intercept: typeof Context.intercept;
  init: typeof Service.init;
  check: typeof Service.check;
  config: typeof Service.config;
  invoke: typeof Service.invoke;
  extend: typeof Service.extend;
  tracker: typeof Service.tracker;
  resolveConfig: typeof Service.resolveConfig;
};
/**
 * Service dependency declaration accepted by plugins and the `@Inject`
 * decorator.
 *
 * Array form requests services without intercept config. Object form maps each
 * service name to optional intercept config for the plugin context.
 */
type Inject<M = Dict> = (keyof M)[] | { [K in keyof M]?: M[K]; };
/** Context keys that correspond to services with typed intercept config. */
type InjectKey = keyof { [K in keyof Context & string as Context[K] extends {
  [symbols.config]: any;
} ? K : never]: any; };
/**
 * Decorator for declaring service dependencies on classes or class methods.
 *
 * On classes it contributes to the plugin's static `inject` map. On methods it
 * delays the method call until the declared services are available.
 */
/**
 * @param name — the required service name.
 * @param config — optional intercept config applied for that service.
 * @returns the class or method decorator.
 */
declare function Inject<K extends InjectKey>(name: K, config?: Context[K] extends {
  [symbols.config]: infer T;
} ? T : never): (value: any, decorator: ClassDecoratorContext<any> | ClassMethodDecoratorContext<any>) => void;
/** Utilities for normalizing plugin dependency declarations. */
declare namespace Inject {
  /**
   * Convert array/object/class-inherited inject metadata into a plain map.
   *
   * @param inject — the declaration to normalize; `null`/`undefined` add nothing.
   * @param result — the map to fill (service name → intercept config or `null`).
   * @returns `result`.
   */
  function resolve(inject: Inject | null | undefined, result?: Dict): Dict;
}
/** Supported plugin entrypoint shapes. */
type Plugin<T = any> = Plugin.Function<T> | Plugin.Constructor<T> | Plugin.Object<T>;
/** Types associated with plugin entrypoints and runtime records. */
declare namespace Plugin {
  /** Shared metadata understood by the plugin registry and related tooling. */
  interface Base<T = any> {
    /** Display name used for fiber diagnostics and logger names. */
    name?: string;
    /** Standard-schema validator applied to config before the plugin starts. */
    Config?: StandardSchemaV1<any, T>;
    /** Services the plugin requires; it only loads while all are available. */
    inject?: Inject;
    /** Service name(s) the plugin provides (read by `Service` and by loaders). */
    provide?: string | string[];
    /** Service names whose intercept config the plugin declares it consumes. */
    intercept?: Dict<boolean>;
  }
  interface Transform<S, T> {
    /** Marks the transform object as a schema/config transform. */
    schema?: true;
    /** Convert user-facing config to runtime config. */
    Config: (config: S) => T;
  }
  /** Function plugin called with `(ctx, config)`. */
  interface Function<T = any> extends Base<T> {
    (ctx: Context, config: T): any;
  }
  /** Class plugin constructed with `(ctx, config)`. */
  interface Constructor<T = any> extends Base<T> {
    new (ctx: Context, config: T): any;
  }
  /** Object plugin with an `apply(ctx, config)` method. */
  interface Object<T = any> extends Base<T> {
    apply(ctx: Context, config: T): any;
  }
  /** Mutable registry record shared by all fibers of one plugin callback. */
  interface Runtime {
    /** Display name copied from the first registered plugin shape. */
    name?: string;
    /** Every live fiber of this plugin (one per `ctx.plugin()` call). */
    fibers: DisposableList<Fiber>;
    /** The executable entrypoint all fibers share (registry identity key). */
    callback: globalThis.Function;
    /** Standard-schema validator applied to each fiber's config. */
    Config?: StandardSchemaV1;
  }
}
type Spread<T> = undefined extends T ? [config?: T] : [config: T];
type GetPluginParameters<P> = P extends ((ctx: Context, ...args: infer R) => any) ? R : P extends (new (ctx: Context, ...args: infer R) => any) ? R : P extends {
  apply(ctx: Context, ...args: infer R): any;
} ? R : never;
type GetPluginConfig<P> = P extends Plugin.Transform<infer S, any> ? S : GetPluginParameters<P>[0];
declare module './context.ts' {
  interface Context {
    /**
     * Run a callback once the requested services are available.
     *
     * Shorthand for `ctx.plugin({ inject, apply: callback })`: the callback
     * is unloaded and re-run whenever a required service changes.
     *
     * @param deps — required services, as an array or a name → config map.
     * @param callback — plugin body called with `(ctx, config)`.
     * @returns the fiber; awaiting it settles once loading finished.
     */
    inject(deps: Inject, callback: Plugin.Function<void>): Fiber & PromiseLike<Fiber>;
    /**
     * Load a plugin in the current context.
     *
     * @param plugin — a function, class, or `{ apply }` object plugin.
     * @param args — the plugin config, validated against its `Config` schema.
     * @returns the fiber; awaiting it settles once loading finished
     * (rejecting on config or startup errors).
     */
    plugin<P extends Plugin>(plugin: P, ...args: Spread<GetPluginConfig<P>>): Fiber & PromiseLike<Fiber>;
  }
}
/**
 * Plugin registry installed as `ctx.registry` and mixed into every context.
 *
 * It normalizes plugin shapes, tracks plugin runtimes, starts fibers, and
 * exposes map-like inspection over active plugin callbacks.
 */
declare class RegistryService {
  ctx: Context;
  private _counter;
  private _internal;
  constructor(ctx: Context);
  /** Allocate the next fiber uid (increments on every read). */
  get counter(): number;
  /** Number of registered plugin runtimes. */
  get size(): number;
  /**
   * Resolve a supported plugin shape to its executable callback.
   *
   * @param plugin — a function, class, or `{ apply }` object plugin.
   * @returns the callback identifying the plugin, or `undefined` if invalid.
   */
  resolve(plugin: Plugin): Function | undefined;
  /**
   * Look up the runtime record for a plugin.
   *
   * @param plugin — any supported plugin shape.
   * @returns the runtime, or `undefined` when the plugin is not registered.
   */
  get(plugin: Plugin): Plugin.Runtime | undefined;
  /**
   * Check whether a plugin has a registered runtime.
   *
   * @param plugin — any supported plugin shape.
   * @returns `true` when at least one fiber of the plugin exists.
   */
  has(plugin: Plugin): boolean;
  /**
   * Dispose every running fiber for a plugin and remove its runtime record.
   *
   * @param plugin — any supported plugin shape.
   * @returns the removed runtime, or `undefined` when none was registered.
   */
  delete(plugin: Plugin): Plugin.Runtime | undefined;
  /** Iterate the registered plugin callbacks. */
  keys(): MapIterator<Function>;
  /** Iterate the registered plugin runtimes. */
  values(): MapIterator<Plugin.Runtime>;
  /** Iterate `[callback, runtime]` pairs. */
  entries(): MapIterator<[Function, Plugin.Runtime]>;
  /**
   * Visit every registered runtime.
   *
   * @param callback — receives each runtime and its identifying callback.
   */
  forEach(callback: (value: Plugin.Runtime, key: Function) => void): void;
  /**
   * Start a callback once the requested dependencies are available.
   *
   * @param inject — required services, as an array or a name → config map.
   * @param callback — plugin body called with `(ctx, config)`.
   * @returns the fiber; awaiting it settles once loading finished.
   */
  inject(inject: Inject, callback: Plugin.Function<void>): Fiber & PromiseLike<Fiber>;
  /**
   * Start a plugin in the current context and return its fiber.
   *
   * Creates (or reuses) the plugin's runtime record, then starts a new fiber
   * under the current context. Throws if `plugin` is not a supported shape or
   * if the current fiber is already disposed.
   *
   * @param plugin — a function, class, or `{ apply }` object plugin.
   * @param config — the plugin config, validated against its `Config` schema.
   * @param getOuterStack — captures the caller stack for effect diagnostics.
   * @returns the fiber; awaiting it settles once loading finished.
   */
  plugin(plugin: Plugin, config?: any, getOuterStack?: () => string[]): Fiber & PromiseLike<Fiber>;
}
declare module './context.ts' {
  interface Context {
    /**
     * Read a service from the store without the inject requirement.
     *
     * @param name — the service name.
     * @param strict — when `true` (default), only return implementations
     * whose providing fiber is currently active.
     * @returns the service value, or `undefined` when not (yet) provided.
     */
    get<K extends string & keyof this>(name: K, strict?: boolean): undefined | this[K];
    /** Same as above for service names outside the typed `Context` surface. */
    get(name: string, strict?: boolean): any;
    /**
     * Overwrite a provided service's value.
     *
     * Only the fiber that provided the service may set it; setting an
     * unprovided name throws.
     *
     * @param name — the service name.
     * @param value — the new service value.
     */
    set<K extends string & keyof this>(name: K, value: undefined | this[K]): void;
    /** Same as above for service names outside the typed `Context` surface. */
    set(name: string, value: any): void;
    /**
     * Register a service implementation owned by the current fiber.
     *
     * The service becomes visible to dependents in the same isolation scope
     * once the fiber is active; it is unregistered (waking dependents) when
     * the returned disposer runs or the fiber unloads. Throws if the name is
     * already provided in this scope or declared as an accessor.
     *
     * @param name — the service name.
     * @param value — the service value.
     * @returns a disposer that unregisters the service.
     */
    provide<K extends string & keyof this>(name: K, value: undefined | this[K]): () => void;
    /** Same as above for service names outside the typed `Context` surface. */
    provide(name: string, value?: any): () => void;
    /**
     * Define a computed context property backed by get/set hooks.
     *
     * The accessor is removed when the current fiber unloads. Throws if the
     * name is already declared.
     *
     * @param name — the context property name.
     * @param options — the `get` hook and optional `set` hook.
     */
    accessor(name: string, options: Omit<Property.Accessor, 'type'>): void;
    /**
     * Expose selected members of a service directly on `ctx`.
     *
     * Each mixed-in key becomes an accessor that forwards to the service
     * (binding methods to it), so e.g. `ctx.on` forwards to `ctx.events.on`.
     * Mixins are removed when the current fiber unloads.
     *
     * @param name — the context property holding the source service.
     * @param mixins — keys to forward, or a source-key → ctx-key map.
     */
    mixin<K extends string & keyof this>(name: K, mixins: (keyof this & keyof this[K])[] | Dict<string>): void;
    /** Same as above with a source object instead of a context property name. */
    mixin<T extends {}>(source: T, mixins: (keyof this & keyof T)[] | Dict<string>): void;
  }
}
/** Context property definition known by the reflection service. */
type Property = Property.Service | Property.Accessor;
/** Property definition variants understood by `ReflectService`. */
declare namespace Property {
  /** Service property backed by a provided implementation. */
  interface Service {
    /** Discriminator. */
    type: 'service';
  }
  /** Computed context property backed by custom get/set hooks. */
  interface Accessor {
    /** Discriminator. */
    type: 'accessor';
    /** Compute the property value; `error` carries the caller stack for diagnostics. */
    get: (this: Context, receiver: any, error: Error) => any;
    /** Optional setter; return `false` to reject the write. */
    set?: (this: Context, value: any, receiver: any, error: Error) => boolean;
  }
}
/** Concrete service implementation record stored in the root reflect service. */
interface Impl {
  /** Unique identity of this provision. */
  uid: number;
  /** The service name. */
  name: string;
  /** The providing context, including its service isolation. */
  ctx: Context;
  /** Fibers retaining this implementation until their teardown finishes. */
  dependents: Set<Fiber>;
  /** Wake a provision disposer after its final dependent unloads. */
  release?: () => void;
  /** The current service value. */
  value?: any;
  /** Optional availability predicate consulted before dependents may load. */
  check?: () => boolean;
  isolate: symbol;
}
/**
 * Reflection and service-resolution layer installed as `ctx.reflect`.
 *
 * This service powers the context proxy, service registration, accessors, and
 * the mixins that expose core service methods directly on `ctx`.
 */
declare class ReflectService {
  ctx: Context;
  /** Proxy traps implementing service resolution for every context object. */
  static handler: ProxyHandler<Context>;
  /** Service implementations, keyed by isolation label. */
  store: Dict<Impl, symbol>;
  /** Declared context properties (services and accessors), by name. */
  props: Dict<Property>;
  private _implCounter;
  constructor(ctx: Context);
  /**
   * Read a service from the store without the inject requirement.
   *
   * @param name — the service name.
   * @param strict — when `true`, only return implementations whose providing
   * fiber is currently active.
   * @returns the service value, or `undefined` when not (yet) provided.
   */
  get(name: string, strict?: boolean): any;
  _getImpl(name: string, strict?: boolean): Impl | undefined;
  /**
   * Overwrite a provided service's value.
   *
   * @param name — the service name.
   * @param value — the new service value.
   * @param error — carrier for the caller stack in diagnostics.
   * @returns `true` on success.
   * @throws when `name` was never provided, or was provided by another fiber.
   */
  set(name: string, value: any, error?: Error): boolean;
  /**
   * Register a service implementation owned by the current fiber.
   *
   * See the `ctx.provide()` overload above for the full contract.
   *
   * @param name — the service name.
   * @param value — the service value.
   * @param check — optional availability predicate for dependents.
   * @returns a disposer that unregisters the service.
   */
  provide(name: string, value?: any, check?: () => boolean): Disposable$1<Promise<void>>;
  /**
   * Re-evaluate every fiber that requires one of the given services.
   *
   * @param names — the service names that changed.
   * @param filter — restricts notification to matching isolation scopes.
   */
  notify(names: string[], filter?: (ctx: Context, name: string) => boolean): void;
  /**
   * Define a computed context property backed by get/set hooks.
   *
   * @param name — the context property name.
   * @param options — the `get` hook and optional `set` hook.
   * @returns a disposer that removes the accessor.
   */
  accessor(name: string, options: Omit<Property.Accessor, 'type'>): Disposable$1<Promise<void>>;
  /**
   * Expose selected members of a service directly on `ctx`.
   *
   * See the `ctx.mixin()` overload above for the full contract.
   *
   * @param source — a context property name or a source object.
   * @param mixins — keys to forward, or a source-key → ctx-key map.
   * @returns a disposer that removes all created accessors.
   */
  mixin(source: any, mixins: string[] | Dict<string>): Disposable$1<Promise<void>>;
  /**
   * Attach this context's tracing wrapper to a value.
   *
   * @param value — the value to wrap.
   * @returns the traceable wrapper (or the value itself when not applicable).
   */
  trace<T>(value: T): T;
  /**
   * Wrap a callback so calls trace `this` and arguments to this context.
   *
   * @param callback — the function to wrap.
   * @returns a proxy delegating to `callback` with traced values.
   */
  bind<T extends Function>(callback: T): T;
}
declare module './context.ts' {
  interface Context extends Pick<Fiber, 'effect'> {
    /** The fiber (plugin runtime instance) that owns this context. */
    fiber: Fiber;
  }
}
interface AsyncDisposable<T extends Awaitable<void> = Awaitable<void>> extends PromiseLike<() => T> {
  (): T;
}
/**
 * Function returned by an effect to release resources during disposal.
 *
 * Disposers run in reverse registration order when the owning fiber unloads;
 * they may be async, in which case unloading awaits them.
 */
type Disposable$1<T = any> = () => T;
/**
 * Effect body result accepted by `ctx.effect()` and plugin startup.
 *
 * Either a single disposer, a promise of one, or a (possibly async) iterable
 * yielding several — generator effects register each yielded disposer as it
 * is produced.
 */
type Effect<T = any> = SyncEffect<T> | AsyncEffect<T>;
type SyncEffect<T = any> = Disposable$1<T> | Iterable<Disposable$1<T>, void, void>;
type AsyncEffect<T = any> = Promise<Disposable$1<T>> | AsyncIterable<Disposable$1<T>, void, void>;
/** Tree node used to expose nested effect labels for diagnostics. */
interface EffectMeta {
  /** Human-readable effect label, e.g. `ctx.on("event")` or `ctx.provide("name")`. */
  label: string;
  /** Metadata of nested effects registered while this effect ran. */
  children: EffectMeta[];
}
/**
 * Lifecycle state for one plugin fiber.
 *
 * `PENDING` — waiting for required services; `LOADING` — the plugin callback
 * is running; `ACTIVE` — loaded and providing; `FAILED` — the callback or its
 * config threw; `UNLOADING` — disposers are running; `DISPOSED` — the fiber
 * was removed and cannot restart.
 */
declare const enum FiberState {
  PENDING = 0,
  LOADING = 1,
  ACTIVE = 2,
  FAILED = 3,
  DISPOSED = 4,
  UNLOADING = 5
}
/**
 * Runtime instance of one plugin application.
 *
 * A fiber tracks dependency state, raw and effective config, lifecycle effects, and
 * cleanup for the plugin context returned by `ctx.plugin()`.
 */
declare class Fiber {
  parent: Context;
  inject: Dict<any>;
  runtime: Plugin.Runtime | null;
  /** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
  uid: number | null;
  /** The context this fiber's plugin runs in (extends the parent context). */
  readonly ctx: Context;
  /** Raw plugin input retained for the next activation. */
  config: any;
  /** Current lifecycle state; transitions emit `internal/status`. */
  state: FiberState;
  /** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
  readonly dispose: () => Promise<void>;
  /** Required implementations retained through dependent teardown. */
  committed: Readonly<Dict<Impl>> | undefined;
  /** Service implementations owned by this fiber, including isolated provisions. */
  readonly provisions: Set<Impl>;
  /** The in-flight load/unload transition, if one is currently running. */
  inertia: Promise<void> | undefined;
  readonly _hooks: Dict<DisposableList<Function>>;
  readonly _disposables: DisposableList<Disposable$1<any>>;
  protected context: Context;
  private _error;
  private _revision;
  private _configRevision;
  private _effectiveConfig;
  private _runner;
  private _store;
  private _release;
  /**
   * Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
   * rather than constructing them directly.
   *
   * @param parent — the context the plugin was loaded from.
   * @param config — raw config, validated against the runtime's schema.
   * @param inject — resolved dependency map (service name → intercept config).
   * @param runtime — the shared plugin runtime, or `null` for the root fiber.
   * @param getOuterStack — captures the caller stack for effect diagnostics.
   */
  constructor(parent: Context, config: any, inject: Dict<any>, runtime: Plugin.Runtime | null, getOuterStack: () => string[]);
  /** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
  get name(): string;
  /**
   * Throw if the fiber has already been disposed.
   *
   * @returns nothing when the fiber is still active.
   * @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
   */
  assertActive(): void;
  private _execute;
  /**
   * Register a cleanup-aware effect on this fiber.
   *
   * `execute` runs immediately; the disposers it produces are collected and
   * run (in reverse order) either when the returned disposer is called or
   * when the fiber unloads, whichever comes first. Calling the disposer twice
   * is a no-op. Throws `CordisError('INACTIVE_EFFECT')` if the fiber is
   * already disposed, and `TypeError` if `execute` returns an invalid shape.
   *
   * @param execute — the effect body; see {@link Effect} for accepted shapes.
   * @param label — effect label shown in `getEffects()` diagnostics.
   * @returns a disposer that tears the effect down and settles once done.
   */
  effect(execute: () => SyncEffect, label?: string): Disposable$1<Promise<void>>;
  /** Same as above for async effects; the disposer is also awaitable. */
  effect(execute: () => Effect, label?: string): AsyncDisposable<Promise<void>>;
  /**
   * Return metadata for currently registered effects.
   *
   * @returns one {@link EffectMeta} tree per labeled live effect.
   */
  getEffects(): EffectMeta[];
  private _getState;
  private _updateState;
  _checkImpl(name: string): boolean | undefined;
  _refresh(): void;
  private _setEpoch;
  /** Raw input retained for the next activation, without evaluating expressions or validating it. */
  get rawConfig(): unknown;
  /** Retain raw input without changing the running config or triggering an update. */
  set rawConfig(config: unknown);
  /**
   * The object passed to plugin activation or the latest successful update that retained the instance.
   * Candidate resolution does not publish it; volatile updates retain its references.
   * Undefined before activation and readable after unload; callers requiring a live instance check `state`.
   */
  get effectiveConfig(): unknown;
  /**
   * Evaluate and validate a candidate using this fiber's `internal/config` hooks and runtime schema.
   * Does not publish the result, replace raw input, or commit running volatile references.
   * Required injections must be available when a hook uses them.
   * @param config Raw candidate input.
   * @returns The candidate's resolved config, retaining the schema's result identity.
   * @throws {ValidationError} when the runtime schema rejects the candidate; hook errors propagate.
   */
  resolveConfig(config: unknown): unknown;
  private _reload;
  private _unload;
  /**
   * Wait for current lifecycle work and rethrow startup errors.
   *
   * @returns this fiber, once it has settled into a stable state.
   * @throws the config-validation or plugin-startup error, if any.
   */
  await(): Promise<this>;
  /**
   * Dispose and immediately reload this plugin with its current config.
   *
   * @returns a promise resolving once the reload settled.
   * @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
   */
  restart(): Promise<void>;
  /**
   * Resolve a candidate, retain its raw config and apply it through the update waterfall.
   * @param config Raw config; pending fibers defer resolution until activation.
   * @param noSave Suppress the persistence notification when true.
   * @returns The awaited update/restart result, or undefined when a synchronous listener handles it.
   * @throws {ValidationError} when an active fiber's candidate is invalid.
   */
  update(config: any, noSave?: boolean): Awaitable<void>;
}
/** Extract the parameter tuple from a function type. */
type Parameters<F> = F extends ((...args: infer P) => any) ? P : never;
/** Extract the return type from a function type. */
type ReturnType$1<F> = F extends ((...args: any) => infer R) ? R : never;
/** Extract the explicit `this` type from a function type. */
type ThisType<F> = F extends ((this: infer T, ...args: any) => any) ? T : never;
/**
 * Event dispatch strategy used by the event service.
 *
 * `emit` runs synchronous listeners without awaiting them, `parallel` awaits
 * all listeners together, `serial` awaits them in order until one bails,
 * `bail` stops on the first synchronous bail value, and `waterfall` composes
 * listeners around a final `next` callback.
 */
type DispatchMode = 'emit' | 'parallel' | 'serial' | 'bail' | 'waterfall';
declare module './context.ts' {
  interface Context {
    /**
     * Dispatch an event, running all listeners concurrently.
     *
     * @param name — the event name.
     * @param args — arguments passed to every listener.
     * @returns a promise resolving once every listener has settled.
     */
    parallel<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): Promise<void>;
    /** Same as above, with an explicit `this` for listeners (also used for filtering). */
    parallel<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): Promise<void>;
    /**
     * Dispatch an event synchronously, ignoring listener return values.
     *
     * @param name — the event name.
     * @param args — arguments passed to every listener.
     */
    emit<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): void;
    /** Same as above, with an explicit `this` for listeners (also used for filtering). */
    emit<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): void;
    /**
     * Dispatch an event, awaiting listeners in order until one bails.
     *
     * @param name — the event name.
     * @param args — arguments passed to each listener.
     * @returns the first bail value (non-null, non-false, non-undefined), if any.
     */
    serial<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): Promisify<ReturnType$1<Events[K]>>;
    /** Same as above, with an explicit `this` for listeners (also used for filtering). */
    serial<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): Promisify<ReturnType$1<Events[K]>>;
    /**
     * Dispatch an event, calling listeners in order until one bails.
     *
     * @param name — the event name.
     * @param args — arguments passed to each listener.
     * @returns the first bail value (non-null, non-false, non-undefined), if any.
     */
    bail<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): ReturnType$1<Events[K]>;
    /** Same as above, with an explicit `this` for listeners (also used for filtering). */
    bail<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): ReturnType$1<Events[K]>;
    /**
     * Dispatch an event whose last argument is a `next` continuation.
     *
     * Each listener wraps the rest of the chain: calling `next()` invokes the
     * next listener (finally the built-in behavior); not calling it vetoes.
     *
     * @param name — the event name.
     * @param args — listener arguments; the final one is the innermost `next`.
     * @returns the outermost listener's return value.
     */
    waterfall<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): ReturnType$1<Events[K]>;
    /** Same as above, with an explicit `this` for listeners (also used for filtering). */
    waterfall<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): ReturnType$1<Events[K]>;
    /**
     * Register an event listener owned by the current fiber.
     *
     * @param name — the event name to listen for.
     * @param listener — called with the dispatch arguments.
     * @param options — listener options; a boolean is shorthand for `prepend`.
     * @returns a disposer removing the listener; `true` if it was still registered.
     */
    on<K extends keyof Events>(name: K, listener: Events[K], options?: boolean | EventOptions): () => boolean;
    /**
     * Same as `on()`, but the listener disposes itself after its first call.
     *
     * @param name — the event name to listen for.
     * @param listener — called at most once with the dispatch arguments.
     * @param options — listener options; a boolean is shorthand for `prepend`.
     * @returns a disposer removing the listener; `true` if it was still registered.
     */
    once<K extends keyof Events>(name: K, listener: Events[K], options?: boolean | EventOptions): () => boolean;
  }
}
/** Options accepted by `ctx.on()` and `ctx.once()`. */
interface EventOptions {
  /** Add the listener before existing listeners for the same event. */
  prepend?: boolean;
  /** Receive the event regardless of context filter checks. */
  global?: boolean;
}
/** Registered listener record stored by the event service. */
interface Hook extends EventOptions {
  ctx: Context;
  callback: (...args: any[]) => any;
}
/**
 * Event bus installed as `ctx.events` and mixed into every context.
 *
 * The service supports concurrent, synchronous, serial, bail, and waterfall
 * dispatch and automatically disposes listeners with their owning fiber.
 */
declare class EventsService {
  private ctx;
  _hooks: Record<keyof any, Hook[]>;
  constructor(ctx: Context);
  private _resolve;
  /**
   * Resolve bound callbacks using the event's context filter.
   * @param type Dispatch mode reported to observers.
   * @param args Dispatch arguments, consumed through the event name.
   * @returns Matching callbacks bound to the dispatch receiver.
   * DSH retains callback enumeration for per-listener error containment.
   */
  dispatch(type: string, args: any[]): ((...args: any[]) => any)[];
  /**
   * Run listeners concurrently and wait for all of them.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   * @returns a promise resolving once every listener has settled.
   */
  parallel(...args: any[]): Promise<void>;
  /**
   * Run listeners synchronously without waiting for returned promises.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   */
  emit(...args: any[]): void;
  /**
   * Run listeners in order, awaiting each, until one returns a bail value.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   * @returns the first bail value (see {@link isBailed}), if any.
   */
  serial(...args: any[]): Promise<any>;
  /**
   * Run listeners synchronously until one returns a bail value.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   * @returns the first bail value (see {@link isBailed}), if any.
   */
  bail(...args: any[]): any;
  /**
   * Compose listeners around the final `next` callback.
   *
   * The last dispatch argument is treated as the innermost `next`. Listeners
   * run outermost-first; a listener that does not call `next()` vetoes the
   * rest of the chain, including the built-in behavior.
   *
   * @param args — optional `this`, the event name, listener arguments, then `next`.
   * @returns the outermost listener's return value.
   */
  waterfall(...args: any[]): any;
  private register;
  private unregister;
  /**
   * Register an event listener owned by the current fiber.
   *
   * The listener is removed automatically when the fiber unloads. Throws
   * `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
   *
   * @param name — the event name to listen for.
   * @param listener — called with the dispatch arguments.
   * @param options — listener options; a boolean is shorthand for `prepend`.
   * @returns a disposer removing the listener; `true` if it was still registered.
   */
  on(name: string | symbol, listener: (...args: any) => any, options?: boolean | EventOptions): any;
  /**
   * Register an event listener that disposes itself after the first call.
   *
   * @param name — the event name to listen for.
   * @param listener — called at most once with the dispatch arguments.
   * @param options — listener options; a boolean is shorthand for `prepend`.
   * @returns a disposer removing the listener; `true` if it was still registered.
   */
  once(name: string | symbol, listener: (...args: any) => any, options?: boolean | EventOptions): any;
}
/**
 * Built-in framework events used by core services and extension points.
 *
 * Plugin and status events track fiber lifecycle, service events observe
 * dependency registration, update/get/set/listener events allow core services
 * to intercept runtime operations, and `internal/dispatch` exposes event-bus
 * diagnostics before public events are delivered.
 */
interface Events {
  [key: symbol]: (...args: any[]) => any;
  /** A plugin fiber was created or its uid was cleared on disposal. */
  'internal/plugin'(fiber: Fiber): void;
  /** A fiber changed lifecycle state; receives the fiber and its previous state. */
  'internal/status'(fiber: Fiber, oldValue: FiberState): void;
  /** A service binding was refreshed in the matching isolation scope. */
  'internal/service'(this: Context, name: string, value: any): void;
  /**
   * Apply resolved config; omitting `next()` keeps the current instance.
   * @param resolvedConfig - the evaluated and validated candidate.
   * @param next - restarts the fiber and waits for its lifecycle work.
   * @mode waterfall
   */
  'internal/update'(this: Fiber, resolvedConfig: any, next: () => Awaitable<void>): Awaitable<void>;
  /**
   * Persist original config from a programmatic update, before its lifecycle transition.
   * @param fiber - the updated fiber.
   * @param originalConfig - the raw candidate; omitted when update uses noSave.
   * @mode emit
   */
  'internal/commit'(fiber: Fiber, originalConfig: any): void;
  /**
   * Resolve plugin config after injections are active; candidate resolution does not publish it.
   * @param fiber - the fiber whose candidate is being resolved.
   * @param next - obtains the raw candidate from inner listeners.
   * @mode waterfall
   */
  'internal/config'(fiber: Fiber, next: () => any): any;
  /** Waterfall: a service is being read through the context proxy. */
  'internal/get'(ctx: Context, name: string, error: Error, next: () => any): any;
  /** Waterfall: a service is being written through the context proxy. */
  'internal/set'(ctx: Context, name: string, value: any, error: Error, next: () => boolean): boolean;
  /** Bail: a listener is being registered; a non-null result replaces registration. */
  'internal/listener'(this: Context, name: string, listener: any, prepend: boolean): void;
  /** An event is being dispatched to listeners (fired for non-internal events only). */
  'internal/dispatch'(mode: DispatchMode, name: string | symbol, args: any[], thisArg: any): void;
}
declare module './context.ts' {
  interface Intercept {
    logger: LoggerService.Intercept;
  }
}
/** Logger method name and severity category. */
type LoggerType = 'error' | 'info' | 'warn' | 'debug';
/** Callable shape for one logger severity method. */
type LoggerMethod = (format: any, ...param: any[]) => void;
/** Formatter used to resolve a printf-style placeholder. */
type Formatter = (value: any, exporter: Exporter, message: Message$1) => any;
/** Structured log record delivered to exporters. */
interface Message$1 {
  sn: number;
  ts: number;
  name: string;
  type: LoggerType;
  level: number;
  args: any[];
  fiber?: WeakRef<Fiber>;
}
/** Sink that receives structured log messages. */
interface Exporter {
  colors?: number | false;
  maxLength?: number;
  levels?: Record<string, number>;
  formatters?: Record<string, Formatter>;
  export(message: Message$1): void;
}
/** Options used when creating a named logger facade. */
interface LoggerOptions {
  /** The logger name shown with each message. */
  name: string;
  /** Message fields merged into every record from this logger. */
  meta?: Partial<Message$1>;
  /** Default maximum level exported when an exporter has no own threshold. */
  level?: number;
}
/** Logger facade identity, inherited message metadata, and optional minimum level. */
interface Logger extends LoggerOptions {}
/** Logger facade severity methods. */
interface Logger extends Record<LoggerType, LoggerMethod> {}
/** Logger facade for one named subsystem. */
declare class Logger {
  private service;
  static color(exporter: Exporter, code: number, value: any, decoration?: string): string;
  static code(name: string, level?: false | number): number;
  static format(exporter: Exporter, message: Message$1): string;
  constructor(options: LoggerOptions, service: LoggerService);
  private _method;
}
/** Logger service configuration merged from context intercepts. */
declare namespace LoggerService {
  interface Intercept {
    name?: string;
    level?: number;
  }
}
/** Callable `ctx.logger` service shape. */
interface LoggerService extends Record<LoggerType, LoggerMethod> {
  (name?: string): Logger;
}
/**
 * Built-in logging service.
 *
 * Call `ctx.logger()` to create a named logger, or call `ctx.logger.info()`
 * directly to log with the current fiber-derived name.
 */
declare class LoggerService {
  bufferSize: number;
  buffer: Message$1[];
  ctx: Context;
  _snMessage: number;
  _snExporter: number;
  exporters: Map<number, Exporter>;
  constructor(ctx: Context);
  /**
   * Register an exporter and dispose it with the current fiber.
   *
   * @param exporter — the sink that receives structured log messages.
   * @returns a disposer that removes the exporter.
   */
  exporter(exporter: Exporter): Disposable$1<Promise<void>>;
  private _resolveConfig;
  [symbols.invoke](name?: string): Logger;
}
/**
 * Public shape of a Cordis context.
 *
 * The concrete `Context` class is proxied at runtime, so this interface is
 * augmented by core services and plugins to describe the properties that may
 * be read from `ctx`.
 */
interface Context {
  /** Isolation map: service name → scope label. Lookups for a name resolve within its label. */
  [symbols.isolate]: Dict<symbol>;
  /** Intercept map: service name → config merged into that service's per-plugin config. */
  [symbols.intercept]: Dict;
  /** The root context of the application (every child context shares it). @experimental */
  root: this;
  /** Base URL used to resolve relative plugin/module specifiers, if the runtime sets one. */
  baseUrl?: string | undefined;
  /** The event bus. Its methods are also mixed onto `ctx` (`ctx.on`, `ctx.emit`, ...). */
  events: EventsService;
  /** The logging service. Call `ctx.logger(name)` for a named logger. */
  logger: LoggerService;
  /** The reflection layer backing the context proxy (`ctx.get`, `ctx.provide`, ...). */
  reflect: ReflectService;
  /** The plugin registry. Its methods are mixed onto `ctx` (`ctx.plugin`, `ctx.inject`). */
  registry: RegistryService;
}
/**
 * Root and child dependency containers for Cordis plugins.
 *
 * A context is a proxy: normal property reads go through the service resolver,
 * while `extend()`, `isolate()`, and `intercept()` create scoped child
 * contexts without mutating their parent.
 */
declare class Context {
  /** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
  static readonly effect: unique symbol;
  /** Symbol key for a context's listener filter, consulted on every event dispatch. */
  static readonly filter: unique symbol;
  /** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
  static readonly isolate: unique symbol;
  /** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
  static readonly intercept: unique symbol;
  /**
   * Returns true for Cordis context proxies and context prototypes.
   *
   * Works across realms and across multiple copies of cordis, because the
   * brand is keyed by a global symbol rather than by `instanceof`.
   *
   * @param value — the value to test.
   * @returns `true` if `value` is a Cordis context, narrowing its type.
   */
  static is(value: any): value is Context;
  /** Create the root context and install the built-in services. */
  constructor();
  /**
   * Create a child context with extra metadata on top of the current scope.
   *
   * The child prototypally inherits every property of this context; own
   * properties of `meta` shadow the inherited ones. The parent is not mutated.
   *
   * @param meta — own properties (including symbol keys) to define on the child.
   * @returns a child context inheriting from this one.
   */
  extend(meta?: {}): this;
  /**
   * Create a child context with an independent service scope for `name`.
   *
   * Below the returned context, reads and writes of the service `name`
   * resolve against the new label instead of the parent's, so a different
   * implementation can be provided without affecting the parent scope.
   * Passing the same `label` to two `isolate()` calls joins their scopes.
   *
   * @param name — the service name to isolate.
   * @param label — scope label to join; defaults to a fresh unique symbol.
   * @returns a child context whose `name` service resolves in the new scope.
   */
  isolate(name: string, label?: symbol): this;
  /**
   * Add service-specific intercept config for plugins started below this
   * context.
   *
   * Plugins loaded under the returned context see `config` merged into the
   * service's resolved config (ancestor entries first; see
   * `Service[symbols.resolveConfig]`). The parent context is not affected.
   *
   * @param name — the service name whose config to intercept.
   * @param config — the intercept config to merge for that service.
   * @returns a child context carrying the additional intercept entry.
   */
  intercept<K extends InjectKey>(name: K, config: Context[K] extends {
    [symbols.config]: infer T;
  } ? T : never): this;
  intercept(name: string, config: any): this;
}
/**
 * Base class for services that expose a named API on `ctx`.
 *
 * Subclasses call `super(ctx, name)` from their constructor. The service is
 * registered immediately and is automatically removed with the owning fiber.
 */
declare abstract class Service<out T = never> {
  protected ctx: Context;
  /** Symbol key of an instance method run after construction (class plugins). */
  static readonly init: unique symbol;
  /** Symbol key of the availability predicate passed to `ctx.provide()`. */
  static readonly check: unique symbol;
  /** Symbol key of the phantom intercept-config type parameter. */
  static readonly config: unique symbol;
  /** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
  static readonly invoke: unique symbol;
  /** Symbol key of the helper deriving an extended service instance. */
  static readonly extend: unique symbol;
  /** Symbol key of the tracker metadata used for context tracing. */
  static readonly tracker: unique symbol;
  /** Symbol key of the intercept-config resolution helper below. */
  static readonly resolveConfig: unique symbol;
  [symbols.config]: T;
  /** The service name this instance is registered under. */
  name: string;
  /**
   * Register this instance as `name` in the current context.
   *
   * Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
   * service is unregistered automatically when the owning fiber unloads.
   * Services with a `[Service.invoke]` body return a callable instance.
   *
   * @param ctx — the context to register in (stored as `this.ctx`).
   * @param name — the service name; defaults to the static `provide` field.
   */
  constructor(ctx: Context, name: string);
  protected [symbols.filter](ctx: Context): boolean;
  protected [symbols.extend](props?: any): any;
  /**
   * Merge intercept config from ancestors with optional base and head values.
   *
   * Entries added closer to the root apply first; `base` is prepended and
   * `head` appended. Uses `Config.merge` when the service declares one,
   * otherwise a shallow `Object.assign`.
   *
   * @param base — lowest-precedence config merged before all intercepts.
   * @param head — highest-precedence config merged after all intercepts.
   * @returns the merged config.
   */
  [symbols.resolveConfig](base?: T, head?: T): T;
  static [Symbol.hasInstance](instance: any): boolean;
}
declare const ScopedBrand: unique symbol;
/**
 * A routing-only event receiver built by {@link scopeTarget}. The type
 * parameter records the subject type for dispatch checking; the carrier does
 * not expose the subject's properties. Event payloads carry the real subject.
 */
type Scoped<T extends object> = object & {
  readonly [ScopedBrand]: T;
};
/**
 * Duplicate-install-safe nominal primitive helpers.
 *
 * A brand makes structurally identical strings or numbers non-interchangeable
 * at the type level: a `SessionId` cannot be passed where a `ToolCallId` is
 * expected, and an event sequence cannot be passed as a log offset. Comparison,
 * logging, and serialization retain the underlying primitive behavior.
 *
 * This package owns no concrete domain value and keeps no runtime identity or mutable
 * state, so independently installed copies produce interchangeable values.
 *
 * @module @deepseek-ai/dsh-brand
 */
declare const BRAND: unique symbol;
/** A string carrying a compile-time-only brand `B`. */
type Branded<B extends string> = string & {
  readonly [BRAND]: B;
};
/** A number carrying a compile-time-only brand `B`. */
type BrandedNumber<B extends string> = number & {
  readonly [BRAND]: B;
};
/** Generic invocation-owned values returned by synchronous Client Context resolvers. */
/** Shared identity across independently bundled Context providers and Gateway. */
declare const TYPERT_OWNED_VALUE: unique symbol;
/** A borrowed payload paired with the invocation owner's idempotent cleanup. */
interface TypertOwnedValue<Value> extends Disposable {
  readonly [TYPERT_OWNED_VALUE]: true;
  readonly value: Value;
}
declare const LOOKUP_HOST: unique symbol;
declare const LOOKUP_WIRE: unique symbol;
declare const CONTEXT_WIRE: unique symbol;
declare const RESOURCE_ID: unique symbol;
/** Type-level association between a Host object and its wire identity. */
interface TypertLookup<Host, Wire> {
  readonly [LOOKUP_HOST]: Host;
  readonly [LOOKUP_WIRE]: Wire;
}
/** Extract the Host object associated with one lookup declaration. */
type TypertLookupHost<Lookup> = Lookup extends TypertLookup<infer Host, infer _Wire> ? Host : never;
/** Extract the wire identity associated with one lookup declaration. */
type TypertLookupWire<Lookup> = Lookup extends TypertLookup<infer _Host, infer Wire> ? Wire : never;
/** Type-level association between a scoped Context kind and its wire identity. */
interface TypertContext<Wire> {
  readonly [CONTEXT_WIRE]: Wire;
}
/** Extract the wire identity associated with one scoped Context declaration. */
type TypertContextWire<ContextType> = ContextType extends TypertContext<infer Wire> ? Wire : never;
/** Merge-extensible Host object lookup declarations. */
interface TypertLookupMap {}
/** Merge-extensible scoped Context declarations. */
interface TypertContextMap {}
/** Type-level association between a resource kind and its identity type. */
interface TypertResource<Id> {
  readonly [RESOURCE_ID]: Id;
}
/** Extract the identity type associated with one resource declaration. */
type TypertResourceId<Resource> = Resource extends TypertResource<infer Id> ? Id : never;
/**
 * Merge-extensible resource kinds whose identities a Remote call or forwarded
 * event may carry. The package that owns an identity type declares its kind;
 * the value is that kind's identity type, a string type such as a branded id.
 * `global` names the built-in identity-less resource and is never a kind here.
 */
interface TypertResourceMap {}
/** One declared resource kind. */
type TypertResourceKind = Extract<keyof TypertResourceMap, string>;
/** Awaitable disposer returned by Cordis-owned Typert registrations. */
type TypertDisposer = () => Promise<void>;
type StringKeyOf<Value> = Extract<keyof Value, string>;
/** Minimal runtime-schema capability carried by strict generated codecs. */
interface TypertSchema<Output = unknown> {
  /**
   * Parse and validate one boundary value.
   * @param value - untrusted boundary value.
   * @returns the validated value.
   */
  parse(value: unknown): Output;
}
/** Codec attached to one invocation parameter or result. */
type TypertCodec<Value = unknown> = (TypertRemoteValue<Value> & {
  readonly mode: 'strict';
  readonly typeSymbol: string;
  /**
   * Decode a unary result whose fields require type-specific handling.
   * @param value - result reconstructed by the RPC carrier.
   * @returns the validated result, retaining native byte views.
   */
  readonly decode?: ((value: unknown) => unknown) | undefined;
  /**
   * Project typed binary fields into RPC result attachments.
   * @param value - native unary result.
   * @param writeBytes - records a byte view at its result-relative path and returns its JSON placeholder.
   * @returns JSON metadata with untouched JSON subtrees retained.
   */
  readonly encode?: ((value: unknown, writeBytes: (bytes: Uint8Array, path: readonly (string | number)[]) => null) => unknown) | undefined;
}) | {
  readonly mode: 'src-json';
};
/** One ordered business parameter in a Remote invocation. */
interface InvocationParameterDescriptor {
  /** Source-level parameter name. */
  readonly name: string;
  /** Source parameter documentation, independent of JSON Schema support. */
  readonly description?: string;
  /** Required key in the wire `args` object. */
  readonly wire: string;
  /** Whether the value is JSON or requires a registered Host lookup. */
  readonly source: 'json' | 'lookup';
  /** Lookup key when `source` is `lookup`. */
  readonly lookup?: string;
  /** Boundary codec for the wire representation. */
  readonly codec: TypertCodec;
  /** Missing wire fields decode to `undefined` only for an explicitly declared `T | undefined`. */
  readonly acceptsUndefined?: true;
}
/** Source position retained for diagnostics from generated definitions. */
interface InvocationSourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}
/** Carrier-independent description of one exported method invocation. */
interface InvocationDescriptor {
  /** Globally stable generated identity. */
  readonly id: string;
  /** Cordis service key owning the method. */
  readonly service: string;
  /** Wire namespace, defaulting to the service key. */
  readonly namespace: string;
  /** Public instance method name. */
  readonly method: string;
  /** Service member invoked when the exported method name is an alias. */
  readonly implementation?: string;
  /** Absent for unary calls; stream calls deliver every yielded item as the Host produced it. */
  readonly mode?: 'stream';
  /** Receiver selection mode. */
  readonly invocation: {
    readonly kind: 'direct';
  } | {
    readonly kind: 'context';
    readonly context: string;
    readonly wire: string;
    readonly codec: TypertCodec;
  };
  /** Optional consuming-Context projection for one direct lookup parameter. */
  readonly scope?: {
    /** Context kind whose Client adapter supplies the identity. */
    readonly context: string;
    /** Lookup parameter wire field replaced by the Context identity. */
    readonly wire: string;
  };
  /** Ordered business parameters. */
  readonly parameters: readonly InvocationParameterDescriptor[];
  /**
   * Client-to-Host items of the same logical stream, generated from the `In`
   * type argument of the method's `RemoteStream<Out, In>` return type; absent
   * when `In` is `never`. The method reads the items through
   * `RemoteInvocation.uplink()`, so nothing enters the parameter list.
   */
  readonly uplink?: {
    /** Codec validating every uplink item before `uplink()` delivers it. */
    readonly codec: TypertCodec;
  };
  /** Transport cancellation injected after business parameters instead of entering wire args. */
  readonly cancellation?: {
    /** Reserved final Host method parameter. */
    readonly parameter: 'signal';
  };
  /** Codec for the unary result or each yielded stream item. */
  readonly result: TypertCodec;
  /** Source-owned method documentation; ordinary methods need not have JSDoc. */
  readonly description?: string;
  /** Source declaration used only for diagnostics. */
  readonly sourceLocation?: InvocationSourceLocation;
}
/**
 * Opaque identity of one Peer: a party admitted to this Host by the connection
 * layer. "Peer" is a connection-layer word; the browser application keeps the
 * word "Client".
 */
type PeerId = Branded<'PeerId'>;
/**
 * Merge-extensible caller identities. Each driver declares its own entry.
 * Every entry is a JSON value with a unique literal `kind`, carries no
 * credential, and is safe to persist in a Session log.
 */
interface PrincipalMap {
  /** The local user who owns this Host. */
  owner: {
    readonly kind: 'owner';
  };
}
/** One caller identity; the authorization layer reads only this. */
type Principal = PrincipalMap[keyof PrincipalMap];
/**
 * One Peer's session on this Host. Its creator owns it: `ctx` is the Cordis
 * scope that owns connection-lifetime registrations and is disposed with the
 * Peer, and `principal` is the caller identity fixed when the Peer was created.
 */
interface PeerScope {
  readonly id: PeerId;
  /** Connection-lifetime registrations; disposed with the Peer. */
  readonly ctx: Context;
  /** Caller identity fixed at creation by in-process Host code; no wire field can set it. */
  readonly principal: Principal;
  /** Aborted once the Peer is disposed; Remote streams that speak for the Peer end with it. */
  readonly signal: AbortSignal;
  /** Whether the Peer may open a forwarded-event stream; this does not grant business permissions. */
  readonly interactions: 'answer' | 'none';
  /**
   * Tear down every registration made through `ctx`.
   * @returns settles once the scope has quiesced; racing calls share one completion.
   */
  dispose(): Promise<void>;
}
/** Carrier capacity for buffered uplink frames of one logical stream. */
interface RemoteUplinkWindow {
  /** Maximum complete encoded frame bytes waiting for the Host consumer. */
  readonly maxBytes: number;
  /** UTF-8 envelope bytes added to a compact JSON item with a present value field. */
  readonly frameOverheadBytes: number;
}
/**
 * The context of one Remote call, reachable inside the receiving method as
 * `this.ctx.invocation`. The Gateway derives the receiver from a Context that
 * carries it, so no parameter is injected and nothing crosses the wire.
 */
interface RemoteInvocation {
  readonly request: {
    readonly namespace: string;
    readonly method: string;
    readonly args: Readonly<Record<string, unknown>>;
  };
  /** Cordis service key of the receiving Service. */
  readonly service: string;
  /** Peer the call speaks for; every carrier names it explicitly. */
  readonly peer: PeerScope;
  /** Carrier cancellation: Client cancel, socket close, or an uplink failure. */
  readonly signal: AbortSignal;
  /** Carrier frame capacity; absent when the carrier imposes no encoded-frame inbox limit. */
  readonly uplinkWindow?: RemoteUplinkWindow | undefined;
  /**
   * The Client's uplink items for this call. Available once; a second call
   * throws. With an uplink codec on the descriptor every item is decoded to
   * `In`; without one items arrive as `unknown` after a JSON-safety check.
   * Iteration ends when the Client ends its uplink; when the method finishes
   * its downlink the Gateway calls the iterator's `return()` and unread items
   * are dropped. `In` is the caller's assertion: the runtime decodes by the
   * descriptor and does not cross-check it.
   * @template In - item type the caller reads; the descriptor codec decides what arrives.
   * @returns the single-consumer uplink iterable.
   */
  uplink<In = unknown>(): AsyncIterable<In>;
}
/** Generated Host contract selected explicitly by a Client assembly. */
interface TypertRemoteContribution {
  /** npm package that owns the Remote methods. */
  readonly package: string;
  /** Consumer-side invocation descriptors generated from that package. */
  readonly descriptors: readonly InvocationDescriptor[];
}
/** Generated parser and optional lossless tool-schema projection of one Remote value. */
interface TypertRemoteValue<Value = unknown> {
  /** Materialize the generated parser without loading the owning Service. */
  readonly create: () => TypertSchema<Value>;
  /** Source-owned value documentation, independent of tool projection support. */
  readonly description?: string | undefined;
  /** Present when the value is representable in the tool-schema subset without losing constraints; may be derived lazily. */
  readonly jsonSchema?: Readonly<Record<string, unknown>> | undefined;
  /** Projection failure for consumers that require JSON Schema; parsing remains available. */
  readonly jsonSchemaError?: string | undefined;
}
/**
 * Resolve one validated wire identity, synchronously or asynchronously.
 * @param id - validated wire identity.
 * @returns the Host object, or `undefined` when unavailable.
 */
type TypertLookupResolver<Host = unknown, Wire = unknown> = (id: Wire) => Host | undefined | Promise<Host | undefined>;
/** Resource kinds whose identity type is a wire identity; every kind for a type-erased provider. */
type TypertResourceKindFor<Wire> = unknown extends Wire ? TypertResourceKind : { [Kind in TypertResourceKind]: [Wire] extends [TypertResourceId<TypertResourceMap[Kind]>] ? Kind : never; }[TypertResourceKind];
/** Runtime provider for one declared Host object lookup. */
interface TypertLookupProvider<Host = unknown, Wire = unknown> {
  /** Source parameter name recognized by the SRC weak parser. */
  readonly parameter: string;
  /** Wire field replacing the Host object parameter. */
  readonly wire: string;
  /** Resource kind the wire identity names; a parameter of this lookup carries that resource. */
  readonly resource?: TypertResourceKindFor<Wire>;
  /** Canonical Host type symbol used by strict generation. */
  readonly hostTypeSymbol: string;
  /** Canonical wire type symbol used by strict generation. */
  readonly wireTypeSymbol: string;
  /**
   * Resolve a wire identity through the provider's default policy.
   * @param id - validated wire identity.
   * @returns the object, `undefined` when unavailable, or either asynchronously.
   */
  resolve(id: Wire): Host | undefined | Promise<Host | undefined>;
}
/** Stable wire declaration retained after a lookup provider unloads. */
interface TypertLookupDefinition {
  /** Merge-declared lookup key. */
  readonly key: string;
  /** Source parameter name recognized by the SRC weak parser. */
  readonly parameter: string;
  /** Wire field replacing the Host object parameter. */
  readonly wire: string;
  /** Canonical Host type symbol used by strict generation. */
  readonly hostTypeSymbol: string;
  /** Canonical wire type symbol used by strict generation. */
  readonly wireTypeSymbol: string;
}
/** Host wire-to-Context resolver plus the declaration used by strict Remote methods. */
interface TypertHostContextAdapter<Wire = unknown> {
  /** Wire field carrying the Context identity. */
  readonly wire: string;
  /** Canonical wire type symbol used by strict generation. */
  readonly wireTypeSymbol: string;
  /** Resource kind the wire identity names; a call scoped to this Context carries that resource. */
  readonly resource?: TypertResourceKindFor<Wire>;
  /**
   * Resolve a validated wire identity to a live Host Context.
   * @param id - validated wire identity.
   * @returns the Context, or `undefined` when it is unavailable.
   */
  resolve(id: Wire): Context | undefined | Promise<Context | undefined>;
}
/** Composition-owned resolver replacing one Host Context adapter's default lookup policy. */
type TypertHostContextResolver<Wire = unknown> = (id: Wire) => Context | undefined | Promise<Context | undefined>;
/** Client-side bidirectional Context adapter. */
interface TypertClientContextAdapter<Wire = unknown> {
  /**
   * Read the identity represented by a live Client Context.
   * @param ctx - Client Context inspected by a scoped Remote caller.
   * @returns the wire identity, or `undefined` for another Context kind.
   */
  identity(ctx: Context): Wire | undefined;
  /**
   * Resolve a validated identity synchronously for one Client invocation.
   * @param id - validated wire identity.
   * @returns a borrowed or invocation-owned Client Context, or undefined when unavailable.
   */
  resolve(id: Wire): Context | TypertOwnedValue<Context> | undefined;
}
/** Notification emitted after a Typert runtime registry changes. */
interface TypertRegistryChange {
  readonly kind: 'local' | 'remote' | 'lookup' | 'host-context' | 'client-context' | 'resource';
  readonly key: string;
}
/** Listener for one Typert runtime registry. */
type TypertRegistryListener = (change: TypertRegistryChange) => void;
/** Current-environment invocation definitions. */
interface TypertLocalRegistry {
  /**
   * Look up one invocation by `<namespace>/<method>`.
   * @param endpoint - canonical endpoint.
   * @returns the live descriptor, or `undefined` when absent.
   */
  get(endpoint: string): InvocationDescriptor | undefined;
  /**
   * Report whether a strict definition has existed during this Typert Service lifetime.
   * @param endpoint - canonical endpoint.
   * @returns `true` after the endpoint has been registered at least once, even if withdrawn.
   */
  hasSeen(endpoint: string): boolean;
  /** @returns a registration-order snapshot of local descriptors. */
  list(): readonly InvocationDescriptor[];
  /**
   * Observe later local-definition changes.
   * @param listener - synchronous contained observer.
   * @returns disposer for this subscription.
   */
  subscribe(listener: TypertRegistryListener): TypertDisposer;
}
/** Consumer-selected Remote contribution registry. */
interface TypertRemoteRegistry {
  /**
   * Register one generated contribution for the calling Cordis fiber.
   * @param contribution - generated Remote descriptors.
   * @returns disposer withdrawing the exact contribution.
   */
  register(contribution: TypertRemoteContribution): TypertDisposer;
  /**
   * Look up one Remote descriptor by endpoint.
   * @param endpoint - canonical endpoint.
   * @returns the descriptor, or `undefined` when unmounted.
   */
  get(endpoint: string): InvocationDescriptor | undefined;
  /** @returns a registration-order snapshot of Remote descriptors. */
  list(): readonly InvocationDescriptor[];
  /**
   * Observe later Remote contribution changes.
   * @param listener - synchronous contained observer.
   * @returns disposer for this subscription.
   */
  subscribe(listener: TypertRegistryListener): TypertDisposer;
}
/** Runtime registry for Host object lookup providers. */
interface TypertLookupRegistry {
  /**
   * Register one provider under its merge-declared key.
   * @param key - lookup key.
   * @param provider - owning package's live resolver.
   * @returns disposer withdrawing the exact provider.
   */
  register<K extends StringKeyOf<TypertLookupMap>>(key: K, provider: TypertLookupProvider<TypertLookupHost<TypertLookupMap[K]>, TypertLookupWire<TypertLookupMap[K]>>): TypertDisposer;
  /**
   * Replace one provider's default resolution policy while this contribution is active.
   * Configuration may precede provider registration; without a live provider, `get()` remains unavailable.
   * @param key - lookup key whose wire declaration remains provider-owned.
   * @param resolver - composition-owned resolver used by every lookup of this key.
   * @returns disposer restoring the provider's default resolver.
   */
  configure<K extends StringKeyOf<TypertLookupMap>>(key: K, resolver: TypertLookupResolver<TypertLookupHost<TypertLookupMap[K]>, TypertLookupWire<TypertLookupMap[K]>>): TypertDisposer;
  /**
   * Look up one provider by runtime key.
   * @param key - descriptor lookup key.
   * @returns the live provider, or `undefined` when absent.
   */
  get(key: string): TypertLookupProvider | undefined;
  /** @returns lookup declarations observed during this Typert Service lifetime. */
  definitions(): readonly TypertLookupDefinition[];
  /** @returns a snapshot of registered provider keys. */
  keys(): readonly string[];
  /**
   * Observe later lookup changes.
   * @param listener - synchronous contained observer.
   * @returns disposer for this subscription.
   */
  subscribe(listener: TypertRegistryListener): TypertDisposer;
}
/** Runtime registry for the Host and Client adapters of each Context kind. */
interface TypertContextRegistry {
  /**
   * Register a Host Context adapter.
   * @param key - merge-declared Context key.
   * @param adapter - owning package's Host resolver and wire declaration.
   * @returns disposer withdrawing the exact adapter.
   */
  registerHost<K extends StringKeyOf<TypertContextMap>>(key: K, adapter: TypertHostContextAdapter<TypertContextWire<TypertContextMap[K]>>): TypertDisposer;
  /**
   * Override one Host Context key's resolution policy for the calling fiber.
   * Configuration may precede provider registration and restores the provider's default resolver on disposal.
   * @param key - merge-declared Context key.
   * @param resolver - composition-owned resolver used by every Host Context lookup of this key.
   * @returns disposer restoring the provider's default resolver.
   */
  configureHost<K extends StringKeyOf<TypertContextMap>>(key: K, resolver: TypertHostContextResolver<TypertContextWire<TypertContextMap[K]>>): TypertDisposer;
  /**
   * Register a Client Context adapter.
   * @param key - merge-declared Context key.
   * @param adapter - owning package's bidirectional Client projection.
   * @returns disposer withdrawing the exact adapter.
   */
  registerClient<K extends StringKeyOf<TypertContextMap>>(key: K, adapter: TypertClientContextAdapter<TypertContextWire<TypertContextMap[K]>>): TypertDisposer;
  /**
   * Look up a Host Context adapter; a configured resolver keeps the adapter's declaration and `resource`.
   * @param key - descriptor Context key.
   * @returns the adapter, or `undefined` when absent.
   */
  getHost(key: string): TypertHostContextAdapter | undefined;
  /**
   * Look up a Client Context adapter.
   * @param key - descriptor Context key.
   * @returns the adapter, or `undefined` when absent.
   */
  getClient(key: string): TypertClientContextAdapter | undefined;
  /**
   * Observe later Context adapter changes.
   * @param listener - synchronous contained observer.
   * @returns disposer for this subscription.
   */
  subscribe(listener: TypertRegistryListener): TypertDisposer;
}
/** Validated wire values and their ordered business parameters for resource extraction. */
interface TypertResourceResolveInput {
  /** Wire field to its validated value, including lookup and Context identities as wire values. */
  readonly args: Readonly<Record<string, unknown>>;
  /** Declared parameters in call order, so a resolver can match a name or an aliased wire field. */
  readonly parameters: readonly Pick<InvocationParameterDescriptor, 'name' | 'wire'>[];
}
/** Default identity extraction for one resource kind; exactly one of `field` and `resolve` is declared. */
type TypertResourceDeclaration = {
  readonly field: string;
  readonly resolve?: never;
} | {
  readonly field?: never;
  /**
   * Called once before lookups resolve. It takes no receiver, so it reads only its
   * input. Returns one identity, or undefined when absent; throws or returns an
   * array to reject the call.
   */
  resolve(this: void, input: TypertResourceResolveInput): string | undefined;
};
/** One registered resource kind with its default identity extraction. */
type TypertResourceEntry = TypertResourceDeclaration & {
  /** Resource kind contributed by its owning domain. */
  readonly kind: string;
};
/** Runtime registry of resource kinds' default identity extraction. */
interface TypertResourceRegistry {
  /**
   * Register one kind's default identity extraction for the calling fiber. Only the
   * domain that owns the kind registers it.
   * @param kind - merge-declared resource kind.
   * @param declaration - either a default wire field or a resolver, never both.
   * @returns disposer withdrawing the exact registration.
   * @throws Error when the kind is already registered or is `global`, the built-in resource kind.
   */
  register(kind: TypertResourceKind, declaration: TypertResourceDeclaration): TypertDisposer;
  /**
   * Look up one kind's declaration.
   * @param kind - resource kind.
   * @returns the live declaration, or `undefined` when unregistered.
   */
  get(kind: string): TypertResourceDeclaration | undefined;
  /** @returns a registration-order snapshot of registered kinds with their extraction declarations. */
  entries(): readonly TypertResourceEntry[];
  /**
   * Observe later resource-kind changes.
   * @param listener - synchronous contained observer.
   * @returns disposer for this subscription.
   */
  subscribe(listener: TypertRegistryListener): TypertDisposer;
}
/** Minimal Typert runtime consumed through dependency inversion. */
interface TypertRegistryContract {
  readonly local: TypertLocalRegistry;
  readonly remotes: TypertRemoteRegistry;
  readonly lookups: TypertLookupRegistry;
  readonly contexts: TypertContextRegistry;
  readonly resources: TypertResourceRegistry;
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    typert: TypertRegistryContract;
    /**
     * The Remote call this Context was derived for, or `undefined` on a
     * Context no Remote call derived. A Service method reads it as
     * `this.ctx.invocation`.
     */
    readonly invocation: RemoteInvocation | undefined;
  }
}
/** Options for an explicit Service-to-Gateway binding. */
interface TypertGatewayBindingOptions {
  /** Wire namespace; defaults to the Cordis service key. */
  readonly namespace?: string;
}
/** Visible declaration that one Service participates in Typert Gateway export. */
interface TypertGatewayBinding<Service extends object = object> {
  readonly service: Service;
  readonly serviceKey: string;
  readonly namespace: string;
}
/** Cordis Service base that exposes its registered name through Typert Gateway. */
declare abstract class TypertRemoteService<out T = never> extends Service<T> {
  /** Visible binding consumed by the Gateway's source-mode discovery. */
  readonly typertRemote: TypertGatewayBinding<this>;
  /**
   * Register the Service and bind the same key to Typert Gateway.
   * @param ctx - owning Cordis Context.
   * @param serviceKey - exact Cordis service key and default wire namespace.
   * @param options - optional wire namespace.
   */
  protected constructor(ctx: Context, serviceKey: string, options?: TypertGatewayBindingOptions);
}
/** Stable identity carried by one message across inbox, log, and model-request boundaries. */
type MessageId = Branded<'MessageId'>;
/**
 * Brand a message identifier.
 * @param id - the opaque message identifier.
 * @returns the same string with the message-id brand.
 */
declare function MessageId(id: string): MessageId;
/**
 * Correlates a model-issued tool call with its result. Provider-issued for
 * real adapters; synthesized by mocks/assembler fallbacks.
 */
type ToolCallId = Branded<'ToolCallId'>;
/**
 * Brand a string as a {@link ToolCallId}.
 * @param id - the provider-issued or synthesized call id.
 * @returns the same string with the tool-call-id brand.
 */
declare function ToolCallId(id: string): ToolCallId;
/** Provider-issued request identifier retained for diagnostics across package boundaries. */
type ProviderRequestId = Branded<'ProviderRequestId'>;
/**
 * Brand a provider-issued request identifier.
 * @param id - the opaque provider-issued string.
 * @returns the same string, branded; no validation is performed.
 */
declare function ProviderRequestId(id: string): ProviderRequestId;
/** Adapter-owned identifier for one model's selectable reasoning effort. */
type ReasoningEffortId = Branded<'ReasoningEffortId'>;
/**
 * Brand an adapter-owned reasoning-effort identifier.
 * @param id - the opaque identifier exposed by one model capability.
 * @returns the same string, branded; no validation is performed.
 */
declare function ReasoningEffortId(id: string): ReasoningEffortId;
/** Provider/model identity and adapter-private replay data for an assistant message. */
interface AssistantProviderMetadata {
  /** Provider route that produced the message. */
  provider: string;
  /** Provider model id that produced the message. */
  model: string;
  /**
   * Lossless-JSON adapter state needed to replay the provider response.
   * `LlmRuntime` exposes it to a target adapter only when that adapter instance
   * currently owns both this historical provider and the target provider.
   */
  replayState?: unknown;
}
/** Required source of an assistant message produced by a routed model. */
interface ModelMessageSource extends AssistantProviderMetadata {
  kind: 'model';
}
/** Required source of a tool-role message carrying one tool result. */
interface ToolMessageSource {
  kind: 'tool';
  callId: ToolCallId;
}
/** Required source of a system-role message produced by the system-prompt plugin. */
interface SystemPromptMessageSource {
  kind: 'system-prompt';
}
/**
 * Where a message (or injected content) came from, in the harness's own
 * vocabulary. Merge-extensible sum type — each producer declares its own
 * `kind` in its own module; there is no shared catch-all `plugin` kind.
 * Model and tool sources answer their role messages; user messages carry any
 * producer's kind, and consumers fall through unknown kinds.
 */
interface MessageSourceMap {
  user: {
    kind: 'user';
  };
  model: ModelMessageSource;
  tool: ToolMessageSource;
  'system-prompt': SystemPromptMessageSource;
}
/** Any known message source, derived from {@link MessageSourceMap}; switch on `kind` and fall through unknowns (merge-extensible). */
type MessageSource = MessageSourceMap[keyof MessageSourceMap];
/** Shared immutable fields of every conversation message. */
interface MessageBase {
  /** Stable identity preserved across every representation boundary. */
  readonly id: MessageId;
  /** Exact model-facing blocks. */
  readonly content: readonly ContentBlock[];
  /** Required source fields supplied by the producer.
   * @persistenceSource user developer
   */
  readonly source: MessageSource;
}
/** A rendered system prompt attributed to the system-prompt producer; empty content sends no prompt. */
interface SystemMessage extends MessageBase {
  readonly role: 'system';
  readonly source: MessageSourceMap['system-prompt'];
}
/** Incremental agent session changes in conversation order, currently tool additions and removals. */
interface DeveloperMessage extends MessageBase {
  readonly role: 'developer';
}
/** A user-role specialization of the shared message representation. */
interface UserMessage extends MessageBase {
  readonly role: 'user';
}
/** A model-produced assistant specialization of the shared message representation. */
interface AssistantMessage extends MessageBase {
  readonly role: 'assistant';
  readonly source: ModelMessageSource;
}
/** A first-class tool-role message carrying the result of one tool invocation. */
interface ToolResultMessage extends MessageBase {
  readonly role: 'tool';
  readonly source: ToolMessageSource;
  /** Provider-issued id of the tool call this message answers. */
  readonly toolCallId: ToolCallId;
  /** Whether the tool invocation failed. */
  readonly isError?: boolean;
}
/**
 * The conversation messages persisted by Session, keyed by role. This map is
 * closed because every model-visible role must have a durable Session event
 * and an adapter projection.
 */
interface MessageRoleMap {
  system: SystemMessage;
  developer: DeveloperMessage;
  user: UserMessage;
  assistant: AssistantMessage;
  tool: ToolResultMessage;
}
/** Any persisted conversation message, discriminated by its `role`. */
type Message = MessageRoleMap[keyof MessageRoleMap];
declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * The provider topology changed: an adapter registered or unregistered
     * routes, or the configurable-provider directory gained or lost entries.
     * This payload-free registry notification fires at each commit point
     * (including registration disposal); consumers re-read `listProviders()`,
     * `listModels()`, or `listConfigurableProviders()` for the new state.
     * Observer failures are contained and cannot veto the registry mutation.
     * @mode emit
     */
    'llm/adapters-updated'(): void;
    /**
     * A provider's advertised models or display metadata changed; consumers reload `listModels()`.
     * @mode emit
     * @param provider - route whose model catalog changed.
     */
    'llm/models-updated'(provider: string): void;
  }
}
/** Serializable provider or transport failure facts; policy decides whether they are retryable. */
interface LlmFailure {
  /** Human-readable provider or transport failure. */
  readonly message: string;
  /** Stable provider-neutral machine-routing code. */
  readonly code: string;
  /** HTTP status returned by the provider, when available. */
  readonly status?: number;
  /** Provider-requested delay in milliseconds, when valid and available. */
  readonly providerRetryAfterMs?: number;
  /** Opaque provider-issued request identifier for diagnostics. */
  readonly requestId?: ProviderRequestId;
  /**
   * With code `IMAGE_OFFLOAD_REQUIRED`: how many more of the oldest retained
   * image occurrences the route needs offloaded before the same request fits
   * its exact byte accounting. `dsh-compaction-image-offload` records the
   * selected occurrences in an `image/offload` event and retries the step.
   */
  readonly offloadImages?: number;
}
/** Plain text visible to the end user. */
interface TextBlock {
  type: 'text';
  text: string;
}
/** Reasoning / thinking content, distinct from visible text. */
interface ReasoningBlock {
  type: 'reasoning';
  text: string;
}
/**
 * A durable raster image reference, valid in user or assistant content. The
 * block is deliberately role-neutral; assistant-side rendering is forward
 * compatibility — the current production adapters declare text-only output,
 * so only user messages may carry images.
 */
interface ImageBlock {
  type: 'image';
  /** Immutable bytes and intrinsic display metadata owned by the attachment service. */
  attachment: ImageAttachmentRef;
  /**
   * Derived from a durable image-offload decision or preserved by a message
   * rewrite. Every route sends placeholder text naming the image and its
   * available read-only path instead of image bytes.
   */
  offloaded?: true;
}
/**
 * A durable verbatim file reference, valid in user content. Files never reach
 * a provider natively: request assembly projects every occurrence to
 * deterministic handle text (name, byte size, and the read-only saved path),
 * so adapters and providers see text in its place while the durable log keeps
 * the structured reference for presentation and authorization.
 */
interface FileBlock {
  type: 'file';
  /** Immutable verbatim bytes and display metadata owned by the attachment service. */
  attachment: FileAttachmentRef;
}
/** A tool invocation requested by the model. */
interface ToolCallBlock {
  type: 'tool-call';
  /** Provider-issued call id; correlates with the matching tool result. */
  id: ToolCallId;
  name: string;
  /** Raw JSON string as produced by the model. */
  arguments: string;
}
/** Activates a tool definition from the developer event's referenced request header. */
interface ToolAdditionBlock {
  type: 'tool-addition';
  /** Name of exactly one tool in the referenced historical header. */
  toolName: string;
  /**
   * Reserved against inline definitions; the historical request header owns the schema.
   * @persistenceReserved
   */
  tool?: never;
}
/** Records the dynamic removal of a tool identified by its session-local name. */
interface ToolRemovalBlock {
  type: 'tool-removal';
  toolName: string;
}
/**
 * Merge-extensible content blocks keyed by `type`. New core blocks must land
 * with adapter, UI, and compaction support. Tool-change blocks belong to
 * developer messages; `projectToolUpdates` selects what each route receives.
 */
interface ContentBlockMap {
  'text': TextBlock;
  'reasoning': ReasoningBlock;
  'image': ImageBlock;
  'file': FileBlock;
  'tool-call': ToolCallBlock;
  'tool-addition': ToolAdditionBlock;
  'tool-removal': ToolRemovalBlock;
}
/** The block `type` tag vocabulary; widens as plugins add entries to {@link ContentBlockMap}. */
type ContentBlockType = keyof ContentBlockMap;
/** Any known content block, derived from {@link ContentBlockMap}; switch on `type` and fall through unknowns (merge-extensible). */
type ContentBlock = ContentBlockMap[ContentBlockType];
/**
 * Why a model response stopped.
 * Merge-extensible so adapters can surface provider-specific reasons.
 */
interface FinishReasonMap {
  'stop': {
    kind: 'stop';
  };
  'tool-calls': {
    kind: 'tool-calls';
  };
  'max-tokens': {
    kind: 'max-tokens';
  };
  'aborted': {
    kind: 'aborted';
    failure: LlmFailure;
  };
  'error': {
    kind: 'error';
    failure: LlmFailure;
  };
}
/** Any known finish reason, derived from {@link FinishReasonMap}; switch on `kind` and fall through unknowns (merge-extensible). */
type FinishReason = FinishReasonMap[keyof FinishReasonMap];
/**
 * Token accounting for one model call (cache fields are optional).
 *
 * Counts are DISJOINT: `inputTokens` is uncached input only; cached input is
 * reported separately as `cacheReadTokens`/`cacheWriteTokens` (billed input =
 * sum of the three). Adapters whose providers fold cache hits into a total
 * prompt count (DeepSeek's `prompt_tokens`) subtract them out.
 */
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  /**
   * Exact full-call total including aggregate prompt and output tokens.
   *
   * Adapters preserve a provider total or derive it from authoritative
   * aggregate prompt/output counters; they omit it when unavailable or
   * inconsistent.
   */
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
}
/**
 * Request price of one ordered image occurrence under one exact model route's
 * request projection. Every occurrence resolves to the pair the wire actually
 * carries: provider visual tokens for a retained image, plus the model-visible
 * text sent with or instead of it (request-preview handle, offload placeholder,
 * or text-only substitution). The caller prices `text` with its own text
 * estimator so provider pricing never fixes a text tokenization.
 */
interface LlmImageRequestPrice {
  /** Provider visual tokens for the retained request image; 0 when only text represents this occurrence. */
  visualTokens: number;
  /** Model-visible text sent for this occurrence, to be priced by the caller's text estimator. */
  text: string;
}
/**
 * Provider-side request-image pricing for one exact model route. Implemented
 * by adapters whose provider charges visual tokens; consumers (the token
 * meter) resolve it synchronously per measurement, so implementations must not
 * perform I/O.
 */
interface LlmImageRequestPricing {
  /**
   * Price every image occurrence of one request projection.
   * @param images - surface image blocks in request order, one entry per occurrence; an `offloaded` block
   *   is priced as its placeholder text.
   * @returns one price per occurrence, aligned by index with `images`.
   */
  priceImages(images: readonly ImageBlock[]): readonly LlmImageRequestPrice[];
}
/** Display metadata for one registered provider route. */
interface LlmProviderInfo {
  /** Provider route key used by {@link GenerateOptions.provider}. */
  id: string;
  /** Human-readable provider name for selectors and diagnostics. */
  name: string;
}
/** Merge-extensible provider model modality vocabulary. */
interface ModelModalityMap {
  text: 'text';
  image: 'image';
}
/** Any declared provider model modality. */
type ModelModality = ModelModalityMap[keyof ModelModalityMap];
/**
 * One provider route an adapter plugin can activate through configuration,
 * whether or not the route is currently registered. Configuration surfaces
 * merge this directory with `listProviders()` to offer every configurable
 * provider alongside its live/dormant state.
 */
interface LlmConfigurableProvider {
  /** Provider route key this entry activates when configured. */
  provider: string;
  /** Human-readable provider name for configuration surfaces. */
  displayName: string;
  /** User-settings namespace whose section configures this provider. */
  settingsNs: string;
  /**
   * Path from that namespace's section root to this provider's profile
   * object; empty when the whole section is the profile.
   */
  settingsPath: readonly string[];
  /**
   * Whether the owning adapter knows this route only because configuration
   * declared it — a gateway or self-hosted server it ships nothing about.
   * Absent means the adapter draws no such distinction; false means it does
   * and this route is one of its own. Only the adapter can answer: a stored
   * profile is how a user-added route AND a corrected shipped one both look
   * from outside.
   */
  declared?: boolean;
  /**
   * Route endpoint the adapter uses when the profile sets no `baseURL`; the
   * adapter may still send an individual model to that model's own endpoint.
   * Absent when the route has no fixed endpoint.
   */
  defaultBaseURL?: string;
  /** Environment variables used to construct a provider endpoint; absent when none are reported. */
  baseURLEnv?: readonly string[];
  /** Authentication the adapter performs when the profile names no credential reference; absent when it reports none. */
  nativeAuth?: LlmNativeAuth;
  /** Configuration diagnostic for repair; unaffected models may remain serviceable. */
  error?: string;
}
/** Authentication a provider route performs without a credential reference in its profile. */
interface LlmNativeAuth {
  /** Environment variables the route's authentication reads, in lookup order; empty when it reads none. */
  env: readonly string[];
  /** Whether a stored OAuth sign-in can authenticate the route. */
  oauth: boolean;
}
/**
 * One interrogation of a provider endpoint that configuration has not stored
 * yet. Configuration surfaces send the draft a user is still editing, so the
 * request carries the endpoint and credential directly instead of naming a
 * route: a provider being added has no route to name.
 */
interface LlmModelDiscoveryRequest {
  /**
   * Route the draft is editing, when it edits an existing one. A route whose
   * adapter already knows its models answers from that knowledge instead of
   * asking the endpoint — the adapter's own registry is the better answer, and
   * it costs no network call.
   */
  provider?: string;
  /**
   * Endpoint to interrogate. Optional because a route the adapter already
   * describes needs none; a route it does not must supply one.
   */
  baseURL?: string;
  /** Wire protocol the endpoint speaks, when the draft names one. */
  api?: string;
  /** Credential for this interrogation alone; the harness never stores it. */
  apiKey?: string;
}
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** A draft provider interrogation refused or failed. */
    'llm/model-discovery-rejected': {
      readonly settingsNs: string;
      readonly baseURL?: string;
    };
  }
}
/**
 * One model an endpoint reports about itself. Every field but the id is
 * optional because most provider listings disclose an id and nothing else;
 * a surface adopting one of these still owes the capacities its adapter needs.
 */
interface LlmDiscoveredModel {
  /** Model id the endpoint accepts. */
  id: string;
  /** Human-readable name when the endpoint supplies one. */
  name?: string;
  /** Maximum combined request and response context, when disclosed. */
  contextWindow?: number;
  /** Maximum output tokens, when disclosed. */
  maxTokens?: number;
  /** Accepted input types when disclosed by the catalog or endpoint; absent means unknown. */
  inputModalities?: readonly ModelModality[];
}
/**
 * Emphasis of a model badge: `neutral` states a plain fact, `info` highlights
 * the model, `success` marks a benefit, and `warning` asks for attention.
 */
type LlmModelBadgeTone = 'neutral' | 'info' | 'success' | 'warning';
/** Short provider-authored label a selector shows beside one advertised model name. */
interface LlmModelBadge {
  /** One literal, or translations keyed by lowercase language id with a required English entry. */
  text: LocalizedText;
  /** Emphasis of the label. */
  tone: LlmModelBadgeTone;
}
/** One adapter-discovered model; catalog membership is advisory, not request validation. */
interface LlmModelInfo {
  /** Provider route that owns this model entry. */
  provider: string;
  /** Model id passed to {@link GenerateOptions.model}. */
  id: string;
  /** Human-readable model name for selectors. */
  name: string;
  /** Optional user-facing distinction from otherwise similar models. */
  description?: string;
  /** Accepted request modalities; absent means unknown, while an explicit omission is negative capability. */
  inputModalities?: readonly ModelModality[];
  /**
   * Selector label advertised by catalog discovery; exact-route resolution
   * omits it, and no model request or Session event carries it.
   */
  badge?: LlmModelBadge;
}
/** Provider-owned context capacity for one exact provider/model route. */
interface LlmModelContext {
  /** Maximum combined request and response context in tokens. */
  contextWindow: number;
}
/** Display metadata for one adapter-owned reasoning effort. */
interface LlmReasoningEffortInfo {
  /** Opaque stable value accepted by {@link GenerateOptions.reasoningEffort}. */
  id: ReasoningEffortId;
  /** Human-readable effort name for selectors and diagnostics. */
  name: string;
  /** Optional user-facing distinction from otherwise similar efforts. */
  description?: string;
}
/** Selectable reasoning efforts for one exact provider/model route. */
interface LlmModelReasoningInfo {
  /** Supported efforts from least to greatest selectable reasoning effort, not predicted token use or latency. */
  efforts: readonly LlmReasoningEffortInfo[];
  /**
   * Adapter-configured default materialized into requests when callers omit
   * an effort. Absence preserves the provider's own default.
   */
  defaultEffort?: ReasoningEffortId;
}
/**
 * How a model applies a system prompt that changes mid-conversation.
 * `'in-history'`: the model reads the latest `system` message at any position
 * of `messages` as the complete effective system prompt, so a changed prompt
 * can follow the cached history instead of rewriting message 0.
 */
type SystemPromptUpdate = 'in-history';
/**
 * How a model accepts native tool declarations that change mid-conversation.
 * `'addition-only'`: the model reads a `tool-addition` block in a later
 * developer message as activating a tool declared with `deferLoading`, so an
 * added tool follows the cached history instead of rewriting the declaration
 * list. `'in-history'`: the model additionally reads `tool-removal` blocks,
 * so a removed tool keeps its declaration and the removal follows the history.
 * Absent means every request declares the complete current tool list.
 */
type ToolUpdate = 'in-history' | 'addition-only';
/** Exact-route model metadata resolved by its owning adapter. */
interface LlmResolvedModelInfo extends LlmModelInfo {
  /** Provider-owned context capacity when known. */
  context?: LlmModelContext;
  /** Adapter-configured per-request output cap materialized when callers omit one. */
  defaultMaxTokens?: number;
  /** Adapter-owned selectable reasoning levels when exposed. */
  reasoning?: LlmModelReasoningInfo;
  /** Declared mid-conversation system prompt handling; absent means only a leading system message is read. */
  systemPromptUpdate?: SystemPromptUpdate;
  /** Declared mid-conversation tool declaration handling; absent means every request declares the complete tool list. */
  toolUpdate?: ToolUpdate;
}
/**
 * Adapter-private lossless-JSON state for replaying a successful response,
 * carried by a terminal `finish` chunk and stored on the assembled assistant
 * message's model source. Both halves stay opaque to the harness; only the
 * split is shared vocabulary, so assembly can keep stored metadata aligned
 * with stored content without reading either half.
 */
interface ReplayEnvelope {
  /** Response-level adapter-private metadata (ids, native stop reason). */
  response: unknown;
  /**
   * Per-block adapter-private metadata, one entry per emitted block in
   * first-seen stream order. When assembly drops a block it drops the entry at
   * the same position; entries whose length does not match the emitted block
   * count discard the whole envelope. An adapter whose metadata is independent
   * of block structure omits this field and the envelope passes through
   * assembly unchanged.
   */
  blocks?: readonly unknown[];
}
/**
 * Raw streaming protocol emitted by adapters.
 * Block indexes correlate interleaved deltas, and `block-end` carries the
 * assembled block. Adapters emit usage before the terminal finish and nothing
 * afterward; tool arguments remain raw JSON strings. An adapter implementation
 * may throw, but `LlmRuntime.stream()` normalizes that failure to a terminal
 * `error` or `aborted` finish before exposing it to consumers.
 */
type StreamChunk = {
  type: 'block-start';
  index: number;
  blockType: ContentBlockType;
} | {
  type: 'text-delta';
  index: number;
  text: string;
} | {
  type: 'reasoning-delta';
  index: number;
  text: string;
} | {
  type: 'tool-call-delta';
  index: number;
  id: ToolCallId;
  name?: string;
  argumentsDelta: string;
} | {
  type: 'block-end';
  index: number;
  block: ContentBlock;
} | {
  type: 'usage';
  usage: TokenUsage;
} | {
  type: 'finish';
  reason: FinishReason;
  /** Replay metadata for a successful response; see {@link ReplayEnvelope}. */
  replayState?: ReplayEnvelope;
};
/**
 * JSON-schema description of a tool, as sent to the model.
 *
 * Declared here (not in dsh-tools) because it is part of {@link GenerateOptions};
 * dsh-tools' ToolDefinition and dsh-system-prompt's PromptAssembly both import
 * it from this package.
 */
interface ToolSchema {
  /**
   * Requests deferred loading of the tool definition into model context,
   * independently of whether a tool-addition block records the tool.
   * Uses Anthropic's defer_loading terminology.
   */
  deferLoading?: true;
  name: string;
  description: string;
  /** JSON Schema object for the arguments. */
  parameters: Record<string, unknown>;
}
/** User input for one LLM request; it has no durable Session identity or source. */
interface RequestUserInput {
  readonly role: 'user';
  readonly content: UserMessage['content'];
  readonly id?: never;
  readonly source?: never;
}
/** A durable conversation message or a user input used only for one request. */
type RequestMessage = Message | RequestUserInput;
/** Logged tool declarations and update identities since the last declaration reset. */
interface ToolHistory {
  /** Complete active declarations at the start of this history. */
  readonly tools: readonly ToolSchema[];
  /** Ordered developer messages, with additions resolved from their historical headers. */
  readonly updates: readonly {
    /** Identity used to locate this update in the derived request history. */
    readonly messageId: MessageId;
    /** Added definitions resolved from the event's referenced request header. */
    readonly additions: readonly ToolSchema[];
  }[];
}
/** Auxiliary request purposes declared by their producer packages. */
interface LlmRequestPurposeMap {}
/** Declared auxiliary request purpose; ordinary conversation requests leave it absent. */
type LlmRequestPurpose = Extract<keyof LlmRequestPurposeMap, string>;
/**
 * A single model request, fully assembled.
 * @typeParam Purpose - declared purpose keys for callers; forwarding adapters may accept `string`.
 */
interface GenerateOptions<Purpose extends string = LlmRequestPurpose> {
  /** Registered provider route selecting the adapter instance. */
  provider: string;
  model: string;
  /** Adapter-owned reasoning effort selected for this exact model. */
  reasoningEffort?: ReasoningEffortId;
  /**
   * Ordered conversation messages, exactly as the provider sees them. A
   * loop-built request passes the derived history (dsh-agent-loop), whose
   * leading system-role message carries the system prompt; a hand-built
   * one-shot may include identity-free user inputs.
   */
  messages: RequestMessage[];
  /**
   * System prompt text for one-shot callers; adapters map it to the provider's
   * system slot ahead of `messages`. Loop-built requests leave it undefined.
   */
  system?: string;
  /** Tool schemas (adapters map to the provider's `tools` field). */
  tools?: ToolSchema[];
  /** Session-folded tool history used for route projection; omission sends complete declarations without tool updates. */
  toolHistory?: ToolHistory;
  temperature?: number;
  maxTokens?: number;
  /**
   * Stop sequences: generation halts as soon as the model produces any one of
   * these strings (adapters map to the provider's stop field, e.g. OpenAI
   * `stop`). The stop string itself is not included in the output.
   */
  stop?: string[];
  signal?: AbortSignal;
  /**
   * Session identity stamped by the loop for request routing. Replay uses it
   * to separate cursors; adapters may map it to model-hidden transport metadata.
   */
  sessionId?: Branded<'SessionId'>;
  /**
   * Provider-neutral classification for an auxiliary model call. Adapters may
   * map the purpose to model-hidden transport metadata. Ordinary conversation
   * requests leave it unset.
   */
  purpose?: Purpose;
}
/** Fully resolved backoff shared by both retry modes. */
interface ResolvedRetryBackoff {
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitterRatio: number;
}
/** Fully resolved bounded transient retry policy. */
interface ResolvedNormalRetryPolicy extends ResolvedRetryBackoff {
  readonly mode: 'normal';
  readonly maxRetries: number;
  readonly retryableCodes: readonly string[];
}
/** Fully resolved unbounded retry policy. */
interface ResolvedAlwaysRetryPolicy extends ResolvedRetryBackoff {
  readonly mode: 'always';
}
/** Immutable provider policy captured when its adapter route is registered. */
type ResolvedRetryPolicy = ResolvedNormalRetryPolicy | ResolvedAlwaysRetryPolicy;
/** Concrete generation settings; omitted controls use the selected route's defaults. */
interface LlmCallControls {
  reasoningEffort?: ReasoningEffortId;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}
/**
 * Provider, model, reasoning effort, and sampling scalars of one conversation's
 * requests. Every field maps 1:1 onto the same-named `GenerateOptions` field;
 * the loop builds requests from the logged header rather than accepting these
 * per call.
 */
interface LlmCallConfig extends LlmCallControls {
  provider: string;
  model: string;
}
/**
 * Synchronous, pure configuration of one call before defaults and validation.
 * Compose functions in the desired order; later writes replace earlier ones.
 * The returned controls cannot change the captured route. Errors reject
 * preparation before dispatch; only the resolved configuration is recordable.
 * @param controls - detached, deeply frozen proposed controls, without defaults.
 * @param model - detached, deeply frozen metadata from the captured adapter generation.
 * @returns concrete controls; omitted fields receive the route's defaults.
 */
type ConfigureCall = (controls: Readonly<LlmCallControls>, model: Readonly<LlmResolvedModelInfo>) => LlmCallControls;
/**
 * Effective config fields supplied by exact-model adapter resolution rather
 * than by the caller's request proposal.
 */
interface LlmCallConfigAdapterDefaults {
  reasoningEffort?: true;
  maxTokens?: true;
}
/** Lossless compact records embedded in durable Assistant attempt events. */
type AssistantStreamRecord = {
  readonly type: 'text-chunks';
  readonly time0: number;
  readonly index: number;
  readonly dt: readonly number[];
  readonly texts: readonly string[];
} | {
  readonly type: 'reasoning-chunks';
  readonly time0: number;
  readonly index: number;
  readonly dt: readonly number[];
  readonly texts: readonly string[];
} | {
  readonly type: 'tool-call-chunks';
  readonly time0: number;
  readonly index: number;
  readonly dt: readonly number[];
  readonly id: ToolCallId;
  readonly name?: string;
  readonly args: readonly string[];
} | {
  readonly type: 'chunk';
  readonly time: number;
  readonly chunk: StreamChunk;
};
declare module '@deepseek-ai/cordis' {
  interface Context {
    llm: LlmRuntime;
  }
  interface Events {
    /**
     * Waterfall around every streaming model call (retry, replay, routing).
     * Bound to the {@link LlmRuntime}; call `next()` to reach the resolved
     * adapter's stream, or yield your own chunks to short-circuit.
     * @param options - the full request. A LOOP-built request carries the
     *   process-local {@link markAgentLoopRequest} identity and arrives deep-frozen
     *   (mutation throws): its content is a pure function of the session log (the
     *   reconstructability Agent Note), so listeners read it, never rewrite it.
     *   Hand-built calls do not carry that marker; callers own their request
     *   inputs and must keep them unchanged until the stream settles.
     * @mode waterfall
     */
    'llm/stream'(this: LlmRuntime, options: GenerateOptions, next: () => AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk>;
  }
}
/** One model call whose config and adapter registration were resolved together. */
interface PreparedLlmCall {
  /** Detached, deep-frozen config with any adapter-owned default materialized. */
  readonly config: LlmCallConfig;
  /** Immutable retry policy captured with the adapter registration. */
  readonly retryPolicy: ResolvedRetryPolicy;
  /** Detached context metadata resolved with the registration-bound call. */
  readonly context?: LlmModelContext;
  /** Exact model modalities captured with the adapter dispatch generation. */
  readonly inputModalities?: readonly ModelModality[];
  /** Exact model system prompt update mode captured with the adapter dispatch generation. */
  readonly systemPromptUpdate?: SystemPromptUpdate;
  /** Exact model tool update mode captured with the adapter dispatch generation. */
  readonly toolUpdate?: ToolUpdate;
  /** Config fields materialized by the captured adapter rather than proposed by the caller. */
  readonly adapterDefaults: LlmCallConfigAdapterDefaults;
  /**
   * Dispatch this call once through the registration captured during
   * preparation. The request's call-config fields must match {@link config};
   * reuse or mismatch fails with `INVALID_PREPARED_CALL`.
   * @param options - fully assembled request carrying the prepared config.
   * @returns the chunk stream, including the `llm/stream` waterfall.
   */
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
/** One adapter-owned model-resolution generation bound to its eventual stream call. */
interface PreparedAdapterCall {
  /** Exact model metadata from the same adapter generation as {@link stream}. */
  readonly model: LlmResolvedModelInfo;
  /** Dispatch through that generation without re-reading dynamic connection facts. */
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
/**
 * Provider-wire adapter for the harness message and stream vocabulary. Register implementations
 * with `ctx.llm.registerAdapter(providers, adapter)`. Every provider HTTP request must include
 * `attributionHeaders()`; prove the headers are added in the wire request or library header hook. The direct-fetch
 * DeepSeek and library-backed pi-ai adapters meet this contract through different internals.
 */
declare abstract class LlmAdapter {
  /**
   * Describe one provider route owned by this adapter.
   * @param provider - a route passed to `registerAdapter()` for this instance.
   * @returns detached display metadata whose id must equal `provider`.
   */
  providerInfo(provider: string): LlmProviderInfo;
  /**
   * Return the provider-owned retry policy captured with this route.
   * @param _provider - a route passed to `registerAdapter()` for this instance.
   * @returns a resolved policy, or `undefined` to use the normal defaults.
   */
  providerRetryPolicy(_provider: string): ResolvedRetryPolicy | undefined;
  /**
   * Resolve provider-side request-image pricing for one exact model route.
   * The default declares none, so consumers fall back to their own neutral
   * estimate. Implementations must answer synchronously without I/O; the
   * token meter resolves this per measurement.
   * @param _provider - a route passed to `registerAdapter()` for this instance.
   * @param _model - exact model id passed to {@link GenerateOptions.model}.
   * @returns route-owned image pricing, or `undefined` when the route declares none.
   */
  imageRequestPricing(_provider: string, _model: string): LlmImageRequestPricing | undefined;
  /**
   * Resolve the image dimensions and byte target this adapter sends to the model.
   * The default preserves normalized images; adapters that resize must override it.
   * @param _provider - registered provider route.
   * @param _model - exact model id.
   * @param image - normalized image whose request projection is being resolved.
   * @returns the same target used by request serialization, before provider-internal processing.
   */
  imageRequestTarget(_provider: string, _model: string, image: ImageAttachmentRef): ImageRequestTarget;
  /**
   * List models this adapter can currently advertise for one owned provider.
   * Core routing accepts unlisted model ids; catalog-driven entry points such
   * as the GUI may require membership. Adapters used there must advertise
   * their available models; the base empty catalog offers no GUI selection.
   * @param _provider - one provider route owned by this adapter.
   * @returns discoverable models in adapter-preferred order.
   */
  listModels(_provider: string): Promise<readonly LlmModelInfo[]>;
  /**
   * Resolve all metadata available for one exact model. This query is
   * independent of the advisory catalog and does not validate request routing.
   * @param provider - one provider route owned by this adapter.
   * @param model - exact model id passed to {@link GenerateOptions.model}.
   * @param _signal - cancellation for this exact-model lookup; asynchronous
   *   implementations must settle promptly after it aborts.
   * @returns provider/model identity plus any context, call-default, and reasoning metadata.
   */
  resolveModel(provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
  /**
   * Bind exact model metadata and the eventual request dispatch to one adapter generation.
   * Dynamic adapters override this so settings changes between preparation and
   * dispatch cannot combine one generation's capabilities with another's endpoint.
   * @param provider - registered provider route.
   * @param model - exact model id.
   * @param signal - cancellation for model resolution.
   * @returns model metadata and a one-generation stream entry point.
   */
  prepareCall(provider: string, model: string, signal?: AbortSignal): Promise<PreparedAdapterCall>;
  /**
   * Stream one model call as raw chunks. The only required method.
   * @param options - the fully-assembled request; implementations must honor `options.signal`.
   * @returns the chunk stream, obeying the adapter contract documented on `StreamChunk`.
   */
  abstract stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
/**
 * What {@link LlmRuntime.registerAdapter} returns: the disposer, plus an
 * atomic route replacement for the same adapter instance.
 */
interface AdapterRegistrationHandle {
  /** Release every route this registration currently holds. */
  (): void;
  /**
   * Replace this registration's routes with `providers`, keeping the same
   * adapter instance. The candidate set is validated in full first — a
   * conflict with another adapter, an invalid name, or bad provider metadata
   * throws and leaves the current routes untouched — and the swap itself is
   * one synchronous section, so no request can observe a gap. An empty array
   * is legal here (a settings section that emptied holds zero routes while
   * staying registered), unlike an empty initial registration.
   *
   * Throws `LlmError` with code `REGISTRATION_DISPOSED` once the registration
   * has been released: its routes are gone and its disposer has already run,
   * so anything registered afterwards would have no owner left to release it.
   * @param providers - the complete next route set for this registration.
   */
  replace(providers: string[]): void;
}
/**
 * A live configurable-provider registration, disposable and atomically
 * replaceable — the directory counterpart of {@link AdapterRegistrationHandle}.
 */
interface DirectoryRegistrationHandle {
  /** Withdraw every entry this registration currently holds. */
  (): void;
  /**
   * Replace this registration's entries with `entries`. The candidate set is
   * validated in full first — an entry another registration already declares,
   * a duplicate within the set, or invalid metadata throws and leaves the
   * current entries untouched — and the swap is one synchronous section, so no
   * reader observes a gap. An empty array is legal here, unlike an empty
   * initial registration.
   *
   * Throws `LlmError` with code `REGISTRATION_DISPOSED` once the registration
   * has been disposed.
   */
  replace(entries: readonly LlmConfigurableProvider[]): void;
}
/**
 * The abstract `llm` service: an adapter registry plus a streaming model-call
 * API, interceptable via the `llm/stream` waterfall.
 */
declare class LlmRuntime extends TypertRemoteService {
  private adapters;
  private directory;
  private discoveries;
  constructor(ctx: Context);
  /** Notify topology observers without letting one broken listener veto the commit. */
  private emitAdaptersUpdated;
  /** Contained-listener diagnostic shared by the sync and async failure paths. */
  private warnAdaptersListenerFailure;
  /**
   * Register an adapter for the given provider routes. Throws `LlmError` with code
   * `DUPLICATE_ADAPTER` if any provider already has an adapter (all-or-nothing).
   * Disposed with the fiber.
   * @param providers - every provider route this adapter should serve.
   * @param adapter - the adapter that streams calls for those providers.
   * @returns the disposer, carrying {@link AdapterRegistrationHandle.replace}.
   */
  registerAdapter(providers: string[], adapter: LlmAdapter): AdapterRegistrationHandle;
  /**
   * Validate one candidate route set for `adapter`, treating routes this
   * registration already holds as available. Nothing is mutated: a rejected
   * candidate leaves the registry exactly as it was.
   */
  private prepareRoutes;
  /**
   * Swap this registration's routes for the prepared ones in one synchronous
   * section, so no observer can see the registry between the release and the
   * re-registration. The route set's one mutation point is also where
   * `llm/adapters-updated` is published, so a `replace` announces itself
   * exactly like a first registration.
   */
  private commitRoutes;
  /**
   * Describe provider routes with a registered adapter.
   * @returns detached provider metadata in registration order.
   */
  listProviders(): LlmProviderInfo[];
  /**
   * Declare provider routes an adapter plugin can activate through
   * configuration. Registration is all-or-nothing: an empty list, invalid
   * entry, or a provider already declared by any registration throws
   * `LlmError` without registering the rest. Disposed with the fiber.
   * @param entries - every configurable provider this plugin owns.
   * @returns a handle that withdraws all of them, and can atomically replace them.
   */
  registerConfigurableProviders(entries: readonly LlmConfigurableProvider[]): DirectoryRegistrationHandle;
  /**
   * List every declared configurable provider, registered or dormant.
   * @returns detached directory entries in declaration order.
   */
  listConfigurableProviders(): LlmConfigurableProvider[];
  /**
   * Offer to interrogate provider endpoints on behalf of the settings
   * namespace this plugin owns. The namespace is the key because that is what
   * a configuration surface already holds from the configurable-provider
   * directory, and because a provider being *added* has no route to name yet.
   * Disposed with the fiber.
   * @param settingsNs - the namespace whose profiles this discovery serves.
   * @param discover - interrogates one endpoint and must honor the supplied signal.
   * @returns the disposer that withdraws the offer.
   */
  registerModelDiscovery(settingsNs: string, discover: (request: LlmModelDiscoveryRequest, signal?: AbortSignal) => Promise<readonly LlmDiscoveredModel[]>): () => void;
  /**
   * Interrogate one provider endpoint for the models it advertises. The
   * request describes a draft, not a stored route, so nothing here reads or
   * writes settings or credentials — the caller owns both, and the reply is
   * candidate metadata a surface may offer for adoption.
   * @param settingsNs - namespace whose registered discovery serves this draft.
   * @param request - the endpoint, protocol, and one-shot credential to use.
   * @param signal - caller cancellation.
   * @returns the advertised models, deduplicated in endpoint order.
   */
  discoverModels(settingsNs: string, request: LlmModelDiscoveryRequest, signal?: AbortSignal): Promise<LlmDiscoveredModel[]>;
  /**
   * Remote adapter for one draft provider interrogation.
   * @param settingsNs - namespace whose registered discovery serves this draft.
   * @param request - endpoint, protocol, and one-shot credential to use.
   * @param signal - caller cancellation supplied by the Remote carrier.
   * @returns advertised models in endpoint order.
   * @throws RemoteError with `llm/model-discovery-rejected` when discovery refuses or fails.
   */
  remoteDiscoverModels(settingsNs: string, request: LlmModelDiscoveryRequest, signal: AbortSignal): Promise<LlmDiscoveredModel[]>;
  /**
   * Resolve the retry policy captured when one provider route was registered.
   * @param provider - registered provider route to inspect.
   * @returns the provider-owned policy, with normal defaults already resolved.
   */
  providerRetryPolicy(provider: string): ResolvedRetryPolicy;
  /**
   * Resolve provider-side request-image pricing for one exact route, or
   * `undefined` when the provider is unregistered or declares none. Unknown
   * providers degrade to `undefined` rather than throwing because callers
   * price durable history whose route may no longer be mounted.
   * @param provider - provider route named by a request header.
   * @param model - exact model id named by the same header.
   * @returns the owning adapter's image pricing for the route, when declared.
   */
  imageRequestPricing(provider: string, model: string): LlmImageRequestPricing | undefined;
  /**
   * Resolve the image projection for an exact registered model route.
   * @param provider - registered provider route.
   * @param model - exact model id.
   * @param image - normalized image reference.
   * @returns dimensions and byte target used by the adapter's request serializer.
   */
  imageRequestTarget(provider: string, model: string, image: ImageAttachmentRef): ImageRequestTarget;
  /**
   * Resolve the exact text one durable file occurrence contributes to every
   * provider request in the current execution environment.
   * @param ref - durable verbatim file reference from model history.
   * @returns the same deterministic handle text used at adapter dispatch.
   */
  fileRequestText(ref: FileAttachmentRef): string;
  /** Detach typed adapter-owned modality metadata. */
  private detachedModalities;
  /**
   * Discover models advertised by one registered provider. Catalog membership
   * does not constrain core routing. Catalog-driven entry points may restrict
   * selection and submission to the advertised models.
   * @param provider - registered provider route to inspect.
   * @returns detached model metadata in adapter-preferred order.
   */
  listModels(provider: string): Promise<LlmModelInfo[]>;
  /**
   * Resolve and validate all metadata from the adapter that owns one exact
   * route. The result is detached from adapter-owned objects; catalog
   * membership remains advisory and does not control request routing.
   * @param provider - registered provider route to inspect.
   * @param model - exact model id passed to the adapter.
   * @param signal - optional cancellation for adapter-owned asynchronous lookup.
   * @returns exact model identity plus available context and reasoning metadata.
   */
  resolveModelInfo(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
  private resolveModelInfoFor;
  /** Validate and detach one adapter-returned exact model result. */
  private normalizeModelInfo;
  /**
   * Validate a conversation call config against its exact model capability and
   * materialize adapter-configured defaults. Unsupported explicit efforts
   * reject before provider I/O; no clamping or aliasing is performed. This
   * standalone query does not bind a later dispatch; use {@link prepareCall}
   * when logging and streaming must share one adapter registration.
   * @param config - provider/model route and optional request controls.
   * @param signal - optional cancellation for adapter-owned capability lookup.
   * @returns a detached config only when a default must be materialized.
   */
  resolveCallConfig(config: LlmCallConfig, signal?: AbortSignal): Promise<LlmCallConfig>;
  private resolveCallFor;
  /** Validate request controls against one already-bound exact model result. */
  private resolveCallWithInfo;
  /**
   * Resolve one call under its current adapter registration. The returned
   * one-shot handle keeps that registration across header logging and dispatch,
   * so HMR cannot combine one adapter's capability result with another adapter.
   * An optional synchronous callback selects concrete controls using captured
   * model metadata. Defaults and validation apply to its result. Callback
   * failures and cancellation reject preparation before dispatch.
   * @param config - provider/model route and optional concrete request controls.
   * @param signal - optional cancellation for adapter-owned capability lookup.
   * @param configure - pure control selection, called once before defaults and validation.
   * @returns a prepared config and its registration-bound stream entry point.
   */
  prepareCall(config: LlmCallConfig, signal?: AbortSignal, configure?: ConfigureCall): Promise<PreparedLlmCall>;
  private registration;
  /** Remove replay state whose historical route is owned by another adapter. */
  private forAdapter;
  /**
   * Resolve the current execution-world read path of one durable file
   * reference through the mounted attachment and filesystem providers.
   */
  private fileReadPath;
  /**
   * Final adapter boundary. Adapter selection, dispatch, iterator construction,
   * and iteration failures become one terminal failure chunk. Middleware and
   * downstream consumer failures remain thrown plugin or consumer errors.
   */
  private adapterStream;
  /**
   * Stream one model call as raw chunks (token-level deltas). Replay state is
   * retained only when the same adapter instance owns its historical provider
   * and the target provider. Final adapter selection remains fixed through
   * asynchronous exact-model resolution and dispatch. Adapter selection,
   * dispatch, and iteration failures become terminal `error` or `aborted`
   * finish chunks; middleware, nested-call, cleanup, and consumer failures
   * remain thrown.
   * @param options - the full request; `options.provider` selects the adapter.
   * @returns the chunk stream, possibly wrapped by `llm/stream` listeners.
   */
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
  private streamWithRegistration;
}
/** Duplicate-install-safe JSON and immutable-value helpers. @module @deepseek-ai/dsh-util-values */
/** A value that round-trips through JSON without loss. */
type JsonValue = null | boolean | number | string | JsonValue[] | {
  [key: string]: JsonValue;
};
/** Identifies one session in the store (and its persistence artifacts). */
type SessionId = Branded<'SessionId'>;
/**
 * Brand a string as a {@link SessionId}.
 * @param id - the raw session id string.
 * @returns the same string with the session-id brand.
 */
declare function SessionId(id: string): SessionId;
/** Sequence number of one existing event in a Session log. */
type SessionSeq = BrandedNumber<'SessionSeq'>;
/**
 * Admit a numeric value as an existing Session event position.
 * @param value - non-negative safe integer admitted by the owning log operation.
 * @returns the same number with the Session-sequence brand.
 */
declare function SessionSeq(value: number): SessionSeq;
/** A Session log gap, prefix length, or read offset, which may equal the event count. */
type SessionLogOffset = BrandedNumber<'SessionLogOffset'>;
/**
 * Admit a numeric value as a Session log offset.
 * @param value - non-negative safe integer used as a gap or prefix length.
 * @returns the same number with the Session-log-offset brand.
 */
declare function SessionLogOffset(value: number): SessionLogOffset;
/**
 * Current logical Session format version, stamped into every newly written
 * {@link SessionHeader}. Current Session and persistence code accept only this
 * value; header-only readers classify supported historical formats, while an
 * event-body read composes the build-static adjacent chain and publishes only
 * this final generation before constructing a Session.
 *
 * The version is a single monotonic integer with no major/minor split. Retain
 * it when older readers resume correctly, preserve safely ignorable records,
 * or refuse required features before execution, mutation, or tail repair.
 * New readers must preserve historical meanings, including logs mixing old
 * and new record representations. Bump when an existing discriminator cannot
 * prevent unsafe interpretation; a structural difference alone is insufficient.
 * Unknown fields and values require evidence of the released reader's actual
 * admission behavior. The per-event {@link SessionEvent.ignorable} marker
 * governs unknown event types, not arbitrary nested payload changes.
 * Same-version readers retain earlier representations: the adjacent migration
 * chain does not run when stored and current versions match. A subsequent
 * migration must account for all supported representations of its source.
 * Compatibility review and the retained migration obligations are recorded in
 * `.agents/notes/implemented/process/2026-10-08-session-reader-compatibility-review.md`.
 */
declare const SESSION_FORMAT_VERSION = 4;
/**
 * Immutable validated storage metadata, kept outside the conversation event log.
 */
interface SessionHeader {
  /**
   * Current logical format version, stamped from {@link SESSION_FORMAT_VERSION}.
   * Historical physical headers are translated before entering this interface.
   */
  readonly version: typeof SESSION_FORMAT_VERSION;
  /** The session's id (mirrors the {@link Session}'s id). */
  readonly id: SessionId;
  /** Non-negative safe-integer Unix epoch milliseconds when the session was created. */
  readonly createdAt: number;
  /** Absolute working directory the session was created in (if any). */
  readonly cwd?: string;
  /**
   * Direct creator of a subagent Session. Ordinary forks omit this field;
   * historical ordinary forks may retain their source id here. Presence alone
   * does not classify a Session as a subagent; use `origin` for that distinction.
   */
  readonly parentSession?: SessionId;
  /**
   * Whether this Session contains a fork-inherited event prefix. The exact prefix
   * length is Session state rather than ordinary header metadata.
   */
  readonly isSeeded: boolean;
  /**
   * Coarse product classification for a session created as a subagent child.
   * This is presentation metadata, not proof that the child is continuable.
   */
  readonly origin?: 'subagent';
  /**
   * Delegation depth: absent (zero) for a top-level session, parent depth + 1
   * for a subagent child. Persisted so a recursion budget survives restart and
   * resume — a runtime-only depth would reset a resumed child to top-level.
   */
  readonly delegationDepth?: number;
  /**
   * Id of the agent preset this session's agent was composed from, when the
   * deployment composes per session. Durable because the preset decides the
   * session's tools and prompt: a resume that restored a different composition
   * would replay history the model can no longer act on.
   */
  readonly agentPreset?: string;
}
/**
 * Options for creating a {@link Session} via the store. `seed` replays/forks
 * an existing event log; `meta` carries the caller-supplied storage fields the
 * store folds into a {@link SessionHeader}.
 */
interface CreateSessionOptions {
  /** Initial replay or fork history supplied at construction. */
  readonly seed?: readonly SessionEvent[];
  /**
   * Exact fork-inherited prefix length when `meta.isSeeded` is true. The
   * constructor appends the child-owned tagged marker at the cut unless
   * the seed already includes it followed by child-owned fork closers.
   */
  readonly inheritedEventCount?: SessionLogOffset;
  /**
   * Storage metadata read once before publication. `isSeeded` marks fork
   * lineage; supplying replay history alone does not make it inherited.
   */
  readonly meta?: {
    readonly cwd?: string;
    readonly parentSession?: SessionId;
    readonly createdAt?: number;
    readonly isSeeded?: boolean;
    readonly origin?: 'subagent';
    readonly delegationDepth?: number;
    readonly agentPreset?: string;
  };
}
/**
 * Aliasing state of an adoptable Session seed. `shared-frozen` permits deeply
 * frozen aliases plus independently owned unfrozen values in the same seed.
 */
type SessionSeedEventState = 'detached' | 'shared-frozen';
/**
 * Adoptable storage values transferred to {@link SessionStore.prepare}
 * without another copy or freeze pass.
 */
interface RestoredSessionOptions {
  /** Events that are independently owned or already deeply frozen. */
  readonly seed: SessionEvent[];
  /** Independently owned storage metadata to validate and freeze in place. */
  readonly meta: SessionHeader;
  /** Exact number of fork-inherited leading events decoded from storage. */
  readonly inheritedEventCount: SessionLogOffset;
  /** Aliasing state carried from the operation that produced the seed. */
  readonly eventState: SessionSeedEventState;
}
/** Inputs accepted while constructing an unpublished Session. */
type PrepareSessionOptions = (CreateSessionOptions & {
  readonly eventState?: undefined;
}) | RestoredSessionOptions;
/** Why an active agent driver was cancelled. */
type AgentCancelCause = {
  readonly kind: 'user';
} | {
  readonly kind: 'parent';
} | {
  readonly kind: 'hook';
  readonly reason: string;
} | {
  readonly kind: 'disposed';
};
/** Durable cancellation cause, including imports whose original coarse record carried no cause. */
type TurnEndCancelCause = AgentCancelCause | {
  readonly kind: 'legacy';
};
/**
 * Why a turn ended. Merge-extensible sum type.
 */
interface TurnEndReasonMap {
  completed: {
    kind: 'completed';
  };
  /** A cancellation request interrupted the live turn. */
  aborted: {
    kind: 'aborted';
    reason: TurnEndCancelCause;
  };
  blocked: {
    kind: 'blocked';
  };
  /**
   * The turn failed. `error` is always a structured failure: the `LlmError`
   * facts verbatim, or `{ message: errorChain(error), code }` flattened from
   * any other error, where `code` is `TOOL_ACTIVATION_FAILED` for a failed
   * tool condition and `UNKNOWN` otherwise.
   */
  error: {
    kind: 'error';
    error: LlmFailure;
  };
  /** At least one step reached its output-token ceiling, even if a plugin continued the turn. */
  'max-tokens': {
    kind: 'max-tokens';
  };
  /**
   * A crash-orphaned turn was closed after the fact: agent-loop resume appends
   * this closer for a stored log whose last turn never ended, and session-query
   * synthesizes it on cold reads. The loop never emits this marker live, and
   * the events recorded before the crash remain intact.
   */
  interrupted: {
    kind: 'interrupted';
  };
  /**
   * Fork-seed construction closed a turn that was still open at the fork
   * boundary in the source session. Only fork seeds carry this marker — the
   * loop never emits it — and the source events before the boundary remain
   * intact in the child.
   */
  forked: {
    kind: 'forked';
  };
}
/** The union over {@link TurnEndReasonMap} — why a turn ended; plugins extend it by merging variants into the map. */
type TurnEndReason = TurnEndReasonMap[keyof TurnEndReasonMap];
/**
 * Logged request state outside derived history: call config and tools. The
 * system prompt is derived history — surface node 0, a `system/message` event.
 * The latest full `request/header` snapshot reconstructs the header; canonical
 * empty optional fields are absent.
 */
interface EpochHeader {
  /** The conversation's call configuration (provider, model, reasoning effort, and sampling scalars). */
  config: LlmCallConfig;
  /** Effective config fields materialized from the exact adapter rather than proposed by a caller. */
  adapterDefaults?: LlmCallConfigAdapterDefaults;
  /** Assembled tool schemas; absent for a tool-less request. */
  tools?: ToolSchema[];
  /** Retired request text; system prompts belong to system/message events.
   * @persistenceReserved
   */
  system?: never;
}
/** Registration-bound metadata for one resolved model route. */
interface RequestContext {
  /** Registered provider route the metadata belongs to. */
  provider: string;
  /** Provider-owned model id the metadata belongs to. */
  model: string;
  /** Maximum combined request and response context in tokens, when advertised. */
  contextWindow?: number;
  /** `'in-history'` when the route reads the latest `system` message at any position as the effective system prompt. */
  systemPromptUpdate?: SystemPromptUpdate;
}
/**
 * Why a `request/header` snapshot was appended: `'initial'` — the log's first
 * header (a new conversation); `'resume'` — a loop instance's first request
 * over a log that already has header events (process restart, fork seed);
 * `'change'` — a later request used a different header; `'series'` — an unchanged
 * header began an explicitly distinct message series or followed a surface
 * replacement. Other reasons carry `startsSeries` when a new series coincides.
 */
type RequestHeaderReason = 'initial' | 'resume' | 'change' | 'series';
/**
 * The merge-extensible, append-only source of truth for an agent interaction.
 * Message history is derived from this log. Every event is lossless JSON and
 * sequence numbers stay contiguous. Assistant attempt events embed their exact
 * compact raw streams so persistence stores one durable settlement per attempt.
 */
interface SessionEventMap {
  /**
   * Opens turn `turn` before the loop claims queued input or runs pre-step.
   * Rejection, empty input, cancellation, or failure may close it with no
   * step; otherwise the following identified `user/message` event or batch
   * records the messages entering the step.
   */
  'turn/start': {
    turn: number;
  };
  /**
   * Closes turn `turn` with the {@link TurnEndReason} that ended it. A turn
   * with no entered step has no `step/start` or `step/end`. The loop does not await a
   * flush at turn boundaries: `dsh-session-checkpoint-policy` owns the
   * per-request durability checkpoint, and consumers that read storage after
   * `whenIdle()` flush themselves. Success commits the turn; rejection is
   * reported live and does not prevent later work.
   */
  'turn/end': {
    turn: number;
    reason: TurnEndReason;
  };
  /** Opens step `step` of turn `turn` — one model call plus the tool executions it requested. */
  'step/start': {
    turn: number;
    step: number;
  };
  /** Closes step `step` of turn `turn`. */
  'step/end': {
    turn: number;
    step: number;
  };
  /**
   * A user-role message on the model-visible surface: a direct human prompt
   * (the queued message claimed for this turn), a synthetic `agent.inject()`
   * context (file-change notices, subdir AGENTS.md, skill content, cron
   * notifications, …), or an entered goal continuation round. All three
   * project their `content` verbatim; `source` tells them apart.
   */
  'user/message': UserMessage;
  /** An incremental agent session change admitted at the named turn and step. */
  'developer/message': {
    turn: number;
    step: number;
    message: DeveloperMessage;
    /** Earlier request/header defining every tool addition; required exactly when additions are present. */
    headerSeq?: SessionSeq;
  };
  /**
   * The rendered system prompt on the model-visible surface. The loop appends
   * the first one as surface node 0 before the step's first `user/message`.
   * A prepared in-history route can append nonempty changes in a continuing
   * series. An incapable route, or a new series whose effective text differs,
   * normalizes text to the first system node; a series start whose latest
   * surviving node already holds the rendering leaves it in place.
   * Normalization empties nonempty later nodes, then rewrites the head if
   * needed, through logged per-node replacements. An empty rendering always
   * clears all active system nodes, leaving no older instructions model-visible.
   * Empty later nodes are dormant and project to no message; an empty head with
   * no active later node records "no system prompt". Restored nonempty text follows
   * the same route and series rule; empty nodes never restore older text.
   */
  'system/message': {
    turn: number;
    step: number;
    message: SystemMessage;
  };
  /**
   * Assembled assistant message for one step (derived history uses this).
   * Carries the step's `usage` when the adapter reported token accounting, so
   * the model output and its accounting travel together (there is no separate
   * usage record). `usage` is absent when the adapter reported none. A turn
   * cancelled mid-stream finalizes its delivered text/reasoning prefix as this
   * event with `interrupted: true`; undispatched tool calls are absent. The
   * marker distinguishes that prefix without re-deriving interruption from turn
   * boundaries. An aborted turn with no such event streamed no visible content.
   */
  'assistant/message': {
    turn: number;
    step: number;
    message: AssistantMessage;
    /** Exact timed model stream, compacted without joining delta boundaries. */
    stream: AssistantStreamRecord[];
    usage?: TokenUsage;
    interrupted?: true;
  };
  /**
   * One model attempt that committed no surface message. The embedded stream
   * preserves a failed, retried, cancelled, or stream-error attempt that
   * reached settlement without fabricating model-visible history.
   */
  'assistant/attempt': {
    turn: number;
    step: number;
    stream: AssistantStreamRecord[];
  };
  /**
   * The model requested one tool invocation: `name` with the raw `arguments`
   * JSON string exactly as the model produced it (unparsed). `callId` pairs the
   * call with its `tool/result`.
   */
  'tool/call': {
    turn: number;
    step: number;
    callId: ToolCallId;
    name: string;
    arguments: string;
  };
  /**
   * A completed tool call's model-facing result, optional internal failure
   * identity and user-facing reason, and optional tool-private `meta`
   * presentation payload. The reason remains outside the model-facing message.
   * `meta` is
   * opaque to the core (the producing tool owns its shape and reads it back in
   * `presentResult`) but MUST be JSON-serializable: `Session.append`
   * runtime-validates all event data with `isJsonValue`, so a non-serializable
   * `meta` is rejected at the source, and the durable log reproduces the
   * identical card on replay. Absent
   * unless the tool attaches one (e.g. `dsh-tool-fs` carries its result-time
   * contextual diff here).
   */
  'tool/result': {
    turn: number;
    step: number;
    message: ToolResultMessage;
    /**
     * Optional failure identity and raw user-facing reason, outside model content;
     * allowed only when the message has `isError: true`.
     */
    error?: {
      name: string;
      code: string;
      reason?: string;
    };
    meta?: JsonValue;
  };
  /**
   * Full header for the next request, appended inside its step before dispatch.
   * It is log-only; the latest snapshot reconstructs the request header.
   */
  'request/header': {
    header: EpochHeader;
    reason: RequestHeaderReason;
    /** This request begins a distinct model-message series, independently of the header reason. */
    startsSeries?: true;
  };
  /**
   * Route metadata for the next request, logged only when the route, capacity,
   * or system prompt update mode changes. It does not participate in request
   * reconstruction or header equality. Prompt admission uses the bound prepared
   * call's capability, not this snapshot from an earlier request.
   */
  'request/context': RequestContext;
  /**
   * Separates inherited or restored history from later lifecycle-owned work.
   * This log-only marker need not be at {@link Session.firstLiveSeq}: a fork
   * seed can already contain its tagged marker and child-owned synthetic
   * closers before construction.
   *
   * A fresh fork child owns one `{ inherited: true }` marker at its exact
   * inherited-prefix cut, even when that prefix ends in an ancestor marker.
   * `buildForkSeed` appends that marker before any synthetic closers; the
   * `Session` constructor supplies it when given only the inherited prefix.
   * The last tagged marker is the current Session's cut; untagged markers
   * keep ordinary restore and replay lifecycle boundaries.
   *
   * Only the `Session` constructor and `buildForkSeed` may create this marker.
   * Session append does not reject other writers, so a plugin appending one
   * would silently classify every live bracket before it as seed history.
   *
   * An owner of a standalone open/close bracket (`compaction/start` …
   * `compaction/end`) reads it because seed history and live work are otherwise
   * byte-identical: an unmatched opening marker before this event belongs to
   * an ended lifecycle, whatever ended it. NOT a liveness signal about other
   * writers — a concurrently live session holds its own boundary elsewhere,
   * so tolerating concurrent writers needs a signal beyond the log.
   */
  'session/end-seed': {
    inherited?: true;
  };
}
/** The appendable event-type keys of {@link SessionEventMap}, plugin-merged extensions included. */
type SessionEventType = keyof SessionEventMap;
/**
 * The subset of {@link SessionEventType} values whose events produce LLM
 * messages and are eligible to appear on the ordered surface. Only these
 * event types may carry {@link SurfaceOp}; system, user, and tool events may also cite
 * earlier sources through {@link SessionEvent.sourceEventSeqs}.
 */
type SurfaceEventType = 'system/message' | 'developer/message' | 'user/message' | 'assistant/message' | 'tool/result';
/**
 * How a session event entered the ordered surface. Only valid on
 * {@link SurfaceEventType} events.
 *
 * - `'append'`: added to the tail — normal path for user/assistant/tool
 *   messages.
 * - `{ op: 'replace', startSeq, endSeq }`: replaces surface nodes from `startSeq`
 *   (inclusive) through `endSeq` (inclusive) with this node. Both must exist as
 *   surface nodes in the current surface. `startSeq === endSeq` replaces a single
 *   node. The node's {@link SessionEvent.sourceEventSeqs} must include every
 *   shadowed surface node. Used by compaction; any surface-replacing producer
 *   may use it.
 */
type SurfaceOp = 'append' | {
  op: 'replace';
  startSeq: SessionSeq;
  endSeq: SessionSeq;
};
/**
 * Surface placement and cited source-event seqs for {@link Session.append}. Required on
 * message-producing events and forbidden on log-only events.
 */
type SurfaceIntent<T extends SurfaceEventType = SurfaceEventType> = {
  surfaceOp: SurfaceOp;
} & (T extends 'assistant/message' ? {
  /** Assistant messages embed their provider stream instead of citing source events. */
  sourceEventSeqs?: never;
} : {
  /** Complete non-empty set of known earlier source-event seqs. */
  sourceEventSeqs?: SessionSeq[];
});
/** One positional event call proposed for append, without assigned sequence or time. */
type SessionEventInput = { [K in SessionEventType]: readonly [type: K, data: SessionEventMap[K], ...opts: K extends SurfaceEventType ? [opts: SurfaceIntent<K>] : []]; }[SessionEventType];
/**
 * One immutable entry in the session log.
 *
 * A proper discriminated union over `type` (not independent `type`/`data`
 * unions), so `switch (event.type)` narrows `event.data` without casts.
 *
 * The {@link sourceEventSeqs} and {@link surfaceOp} fields are conditional:
 * they only exist on {@link SurfaceEventType} variants (`system/message`, `user/message`,
 * `assistant/message`, `tool/result`).
 * Non-surface events (boundary markers, attempts, errors) never carry
 * surface metadata — the compiler enforces this at `Session.append()`
 * call sites.
 */
type SessionEvent<T extends SessionEventType = SessionEventType> = { [K in SessionEventType]: {
  type: K;
  /** Monotonic sequence number within the session. */
  seq: SessionSeq;
  /** Unix epoch milliseconds. */
  time: number;
  data: SessionEventMap[K];
  /**
   * Marks an event a reader may safely skip when it does not recognize
   * `type`. Absent means required: a reader meeting an unrecognized type
   * without this marker MUST refuse to reconstruct the session instead of
   * silently dropping the event, because an unrecognized required event may
   * change how the rest of the log is interpreted. A writer sets `true` only
   * on purely informational records whose loss cannot affect reconstruction;
   * defaulting to required means a forgotten marker over-refuses (an
   * inconvenience) rather than silently resuming a gutted session.
   */
  ignorable?: true;
} & (K extends SurfaceEventType ? SurfaceIntent<K> : {
  surfaceOp?: never;
  sourceEventSeqs?: never;
}); }[T];
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertResourceMap {
    /** One Session; the Session Controller registers its default `sessionId` wire field. */
    session: TypertResource<SessionId>;
  }
  interface RemoteErrorDetailsMap {
    /** The named Session does not exist; produced by every layer that resolves a SessionId. */
    'session/not-found': {
      readonly sessionId: SessionId;
    };
  }
}
/** Readonly history immediately before a message-projection event. */
interface SessionMessageProjectionContext {
  /** Current message-producing event sequences in model-visible order. */
  nodes: readonly SessionSeq[];
  /** Contiguous event window; entries at or beyond the candidate seq are not committed inputs. */
  events: readonly SessionEvent[];
  /** Absolute sequence of the window's first event. */
  baseSeq: SessionLogOffset;
  /** Previously projected messages keyed by their original event sequences. */
  messages: ReadonlyMap<SessionSeq, Message>;
}
/** Pure interpretation of one plugin-owned event that changes existing message content. */
interface SessionMessageProjection<T extends SessionEventType = SessionEventType> {
  /** Event interpreted by this definition; declare it with `@messageProjection` in SessionEventMap. */
  type: T;
  /**
   * Validate the complete durable decision before returning any updates. Preserve
   * message identities and publish immutable copies without mutating the input.
   * @param event - candidate event, not yet applied to the supplied history.
   * @param context - history preceding this decision.
   * @returns changed current messages keyed by their original sequences.
   * @throws when the durable decision cannot be applied to this history.
   */
  project(event: SessionEvent<T>, context: SessionMessageProjectionContext): ReadonlyMap<SessionSeq, Message>;
}
/** Readonly live projection of the message-producing session events. */
interface SessionSurface {
  /** Current surface event sequences in model-visible order. */
  readonly nodes: readonly SessionSeq[];
  /** Monotonic count of committed positional replacements. */
  readonly replaceGeneration: number;
  /** Monotonic count of committed replacements and plugin-owned message changes. */
  readonly contentGeneration: number;
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    sessions: SessionStore;
  }
  interface Events {
    /**
     * Read-only creation announcement after store entry.
     * New events reject until every synchronous listener has returned successfully.
     * A synchronous throw vetoes creation and rolls back with a paired disposal;
     * detach requested during dispatch is deferred.
     * A returned-promise rejection is logged but cannot retroactively veto this
     * synchronous boundary.
     * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners
     * receive only sessions entered through that agent's context.
     * @param session - the session just entered and announced.
     * @mode emit
     */
    'session/created'(this: Scoped<Session>, session: Session): void;
    /**
     * Emitted once when an announced session leaves the store, including
     * publication rollback, but never for an entry whose creation announcement
     * did not begin. Listener failures are logged and contained.
     * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`) reuses the owner scope.
     * @param session - the session that is no longer live in the store.
     * @mode emit
     */
    'session/disposed'(this: Scoped<Session>, session: Session): void;
    /**
     * Post-commit, fire-and-forget append feed. The listener snapshot resolves
     * before the log push, but callbacks run after it; observer failures are
     * logged and contained without making the committed append fail.
     * Array append commits every member before publishing them in order;
     * `session.seq` and `session.surface` already include the complete batch.
     * `session.currentBatchPublication` identifies the member being delivered.
     * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners
     * receive only events from sessions entered through that agent's context.
     * @param session - the session whose log grew.
     * @param event - the appended event, exactly as recorded.
     * @mode emit
     */
    'session/event'(this: Scoped<Session>, session: Session, event: SessionEvent): void;
    /**
     * Awaited parallel durability checkpoint: every listener runs and the
     * caller awaits all of them, with no waterfall veto. Scope-filtered dispatch
     * (`@deepseek-ai/dsh-scope`) reuses the session's owner scope.
     * @param session - the session whose buffered events must reach durable storage.
     * @mode parallel
     */
    'session/flush'(this: Scoped<Session>, session: Session): Promise<void> | void;
  }
}
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertLookupMap {
    session: TypertLookup<Session, SessionId>;
  }
}
/**
 * An event-sourced session: an append-only log of {@link SessionEvent}s.
 *
 * Plain class (not a Service) — create live instances via
 * `ctx.sessions.create()` and detached instances via {@link create}.
 * Seeding with an existing event log replays/forks a session.
 * @typert object
 */
declare class Session {
  #private;
  private log;
  private batchPublication;
  /** Single incremental owner of surface acceptance and projection state. */
  private readonly surfaceManager;
  /** The ordered surface over this session's event log. */
  get surface(): SessionSurface;
  /**
   * Detached, deep-frozen creation metadata (format version, cwd, lineage,
   * and whether fork history exists). Supplied by the store via `ctx.sessions.create()`. When a
   * `Session` is created without a store-owned header, a minimal header is
   * synthesized (stamped with the current {@link SESSION_FORMAT_VERSION}) so
   * `session.header` is always present. Kept out of the event log — it is a
   * storage concern, not replayable conversation state.
   */
  readonly header: SessionHeader;
  /** Number of leading events inherited from this Session's fork parent. */
  readonly inheritedEventCount: SessionLogOffset;
  /** The session identity, derived from its durable header's single copy. */
  get id(): SessionId;
  /**
   * The constructor seed length (0 without one), before any marker appended
   * during construction. Seed events never publish on `session/event`. A
   * marker appended before the store attaches occupies this seq without
   * publishing either; otherwise this seq is available for the next append.
   *
   * This in-process offset is not persisted. A fork seed can already contain
   * the child's inherited marker and synthetic closers, so its child-owned
   * history starts at {@link inheritedEventCount}, before this offset. A
   * resumed Session's seed contains its full stored log, while its inherited
   * count keeps the durable fork cut. Consumers needing complete canonical
   * history start at seq 0.
   */
  readonly firstLiveSeq: SessionLogOffset;
  /**
   * First event produced for this object lifecycle. A new fork includes its
   * child-owned seed marker and closers; a restored Session starts after its
   * complete stored prefix. This in-process capture offset is not persisted.
   */
  readonly firstLifecycleSeq: SessionLogOffset;
  /**
   * Create a detached session by validating and snapshotting borrowed seed
   * events and storage metadata.
   * @param id - session identity.
   * @param seed - optional borrowed replay or fork events.
   * @param header - optional borrowed storage metadata.
   * @param inheritedEventCount - exact fork-inherited prefix length for a seeded header.
   * @param projections - pure interpreters for plugin-owned message changes.
   * @returns a detached session.
   * @throws when a seed event requires a missing message interpreter or fails validation.
   */
  static create(id: SessionId, seed?: readonly SessionEvent[], header?: SessionHeader, inheritedEventCount?: SessionLogOffset, projections?: readonly SessionMessageProjection[]): Session;
  /**
   * Restore a detached session by adopting an independently owned or deeply frozen seed.
   * Runtime-required event fields, event envelopes, sequence continuity, surface
   * transitions, and header fields are validated without copying or freezing events.
   * Embedded Assistant streams remain opaque until a stream consumer or storage
   * verifier reads them.
   * @param id - restored session identity.
   * @param seed - independently owned or deeply frozen events.
   * @param header - independently owned storage metadata.
   * @param inheritedEventCount - exact fork-inherited prefix length decoded from storage.
   * @param eventState - aliasing state carried from the operation that produced the seed.
   * @param projections - pure interpreters for plugin-owned message changes.
   * @returns a restored detached session.
   * @throws when a seed event requires a missing message interpreter or fails validation.
   */
  static fromRestore(id: SessionId, seed: readonly SessionEvent[], header: SessionHeader, inheritedEventCount: SessionLogOffset, eventState: SessionSeedEventState, projections?: readonly SessionMessageProjection[]): Session;
  private constructor();
  /** Cached immutable full snapshot of the private append-only log. */
  private eventsSnapshot;
  /**
   * Return the immutable event stored at one exact sequence number.
   * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
   * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
   * @param seq - event sequence number.
   * @returns the accepted event, or undefined when the log does not contain it.
   */
  eventAt(seq: SessionSeq): SessionEvent | undefined;
  /**
   * Materialize an immutable snapshot of a half-open event sequence range.
   * A full current snapshot is reused until the next append; every previously
   * returned snapshot remains stable after later appends.
   * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
   * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
   * @param fromSeq - non-negative inclusive sequence number; defaults to the log start.
   * @param toSeqExclusive - non-negative exclusive sequence number; defaults to the current end.
   * @returns a frozen array of the selected deeply frozen events.
   */
  snapshotEvents(fromSeq?: SessionLogOffset, toSeqExclusive?: SessionLogOffset): readonly SessionEvent[];
  /**
   * Return this Session's events after its fork-inherited prefix.
   * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
   * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
   * @returns a fresh array containing child-owned events in log order.
   */
  ownEvents(): readonly SessionEvent[];
  /**
   * Whether one existing event position is outside the fork-inherited prefix.
   * @param seq - event position in this Session.
   * @returns true when the event belongs to this Session rather than its parent.
   */
  isOwnSeq(seq: SessionSeq): boolean;
  /** The next event's sequence number — always the log length (the `seq = log.length` contiguity contract). */
  get seq(): SessionLogOffset;
  /** Current event while synchronously notifying a batch's observers. */
  get currentBatchPublication(): SessionEvent | undefined;
  /**
   * Append consecutive events together after validating every candidate and dispatch.
   * Observers read the complete committed log and final message surface.
   * Listener registration changes during publication take effect on the next append.
   * Persistence listeners retain their own durability rules.
   * @param inputs - event payloads and surface intents in commit order. An empty array records no events.
   * @returns immutable committed events in the same order.
   * @throws if the Session cannot accept writes, including an empty append, or any candidate or synchronous dispatch validation fails.
   */
  append(inputs: readonly SessionEventInput[]): readonly SessionEvent[];
  /**
   * Append one typed event to the log and synchronously notify observers via
   * the store-owned, module-private publication hooks. The hot path never blocks
   * on I/O — persistence plugins buffer asynchronously. Once the event enters
   * the log, the append is committed: observer failures are logged and
   * contained per listener, so they do not change the return value or prevent
   * later listeners from observing the same accepted event.
   * Independent Sessions append without notifying store observers. Once a store
   * prepares or enters the instance, writes require a completed creation
   * announcement and remain disabled after removal.
   *
   * @param type - The event type (key of {@link SessionEventMap}).
   * @param data - The event payload; must be JSON-serializable.
   * @param opts - Surface metadata: `surfaceOp` controls how the event enters
   *   the ordered surface; `sourceEventSeqs` lists the seq numbers of earlier
   *   events this one derives from. REQUIRED for
   *   {@link SurfaceEventType} events (every message-producing event must
   *   declare how it joins the surface, the sole source of derived model
   *   history) and
   *   rejected by the compiler for non-surface types like `turn/start` or
   *   `assistant/attempt`. Assistant messages embed their exact provider
   *   stream and cannot cite top-level source events.
   * @returns the logged event — its assigned `seq`/`time` plus the SNAPSHOT of
   *   `data` that entered the log, so reading `event.data` back sees the logged
   *   value, never the caller's still-mutable input.
   * @throws if a store-owned Session is unentered or its creation announcement
   *   has not completed, or if `data` or surface
   *   metadata is not losslessly JSON-serializable
   *   (BigInt, function, symbol, undefined, negative zero, non-finite number,
   *   circular reference, sparse array, or an exotic object such as
   *   Map/Set/Date/class instance), or when the candidate violates the
   *   request-header empty-field or tool-error consistency rules, or the
   *   canonical surface contract (marker shape and eligibility, unique
   *   earlier source-event references, positional replacement validity, and complete
   *   shadowed-node coverage). One iterative pass reads, validates, and
   *   copies each nested value once, so a stateful getter cannot supply one value
   *   to validation and another to storage. The event log is the durable source
   *   of truth, so a bad event fails at the append site rather than later during
   *   a backend flush. A synchronous internal dispatch validation failure or an
   *   append reentered while this acceptance/publication boundary is open also
   *   rejects before the log changes.
   */
  append<T extends SessionEventType>(type: T, data: SessionEventMap[T], ...opts: T extends SurfaceEventType ? [opts: SurfaceIntent<T>] : []): SessionEvent<T>;
  /**
   * Require announced membership for store-owned Sessions and refuse reentrant publication.
   * @returns the current store attachment, or undefined for an independent Session.
   */
  private publicationEntry;
  /**
   * Accept one frozen candidate at the next sequence number, enter it into the
   * log, and notify `session/event` observers with per-listener containment.
   * @param event - the candidate built at the current log length.
   * @param entry - the attachment read before the candidate was built.
   */
  private commit;
  /** Cached fold of the request-header events — see {@link requestHeader}. */
  private headerFold;
  /** Log position (events consumed) the header fold has reached. */
  private headerFoldSeq;
  /**
   * The {@link EpochHeader} in force after the log's last header event — the
   * header the NEXT request will be compared against — or undefined before
   * the first `request/header` snapshot. The live, incrementally-maintained
   * form of `foldRequestHeader(session.snapshotEvents())`: each header event is folded
   * once, when first seen, so a per-step read costs O(new events).
   * @returns the folded header, or undefined when no header event exists yet.
   */
  requestHeader(): EpochHeader | undefined;
  /** Cached fold of `request/context` events. */
  private contextFold;
  private contextFoldSeq;
  /**
   * Return the latest resolved route metadata, or `undefined` before the first
   * `request/context` event. Each event is folded once.
   * @returns the latest immutable route metadata.
   */
  requestContext(): RequestContext | undefined;
  /** Cached historical tool definitions and updates for request projection. */
  private readonly toolHistoryProjection;
  /** Index of the next committed event not yet consumed by the tool-history fold. */
  private toolHistorySeq;
  /**
   * Fold unseen committed events into capability-independent tool history.
   * Initial access reconstructs inherited history; later reads consume only new events.
   * @returns an immutable snapshot for LLM request projection, including historical addition definitions.
   */
  toolHistory(): ToolHistory;
  /** The derived-message cache: frozen projections, extended per unseen node. */
  private derived;
  /** Surface position (nodes projected) the cache has reached. */
  private derivedNodes;
  /** {@link SurfaceManager.contentGeneration} the cache was built under. */
  private derivedGeneration;
  /**
   * Derive the LLM message history by walking the ordered sequences of
   * message-producing events maintained by `surfaceOp` markers. The
   * surface is the single source of derived history: every message-producing
   * append records its `surfaceOp`, so a raw event with no marker (a chunk, a
   * turn boundary) is correctly absent, and a compaction `replace` deletes the
   * shadowed nodes from the derivation. The projection rules are
   * {@link deriveEventMessage}, with logged message projections applied
   * without changing node membership or message identity.
   *
   * CACHED: pure tail growth costs O(new nodes); a replacement or message projection
   * ({@link SessionSurface.contentGeneration}) rebuilds. The returned array is
   * a fresh snapshot per call (later appends never grow an array a caller
   * already holds); the `Message` objects in it are SHARED and **deep-frozen**.
   * Unchanged content reuses frozen event data; projected blocks are frozen
   * derived copies. Consumers cannot mutate the log through either form.
   * @returns a fresh array of the shared, frozen derived history.
   */
  deriveMessages(): Message[];
  /**
   * Project one event with all committed message projections applied.
   * The original durable event remains unchanged.
   * @param event - the event to project.
   * @returns the derived message, or null when the event produces none.
   */
  deriveEventMessage(event: SessionEvent): Message | null;
}
/** A fork source: either the live session object or its live store id. */
type SessionForkSource = Session | SessionId;
/**
 * In-memory session store (`ctx.sessions`).
 *
 * Persistence is intentionally not implemented here — the agent lifecycle
 * attaches a session-log writer to each published session's write handle;
 * a session published outside that lifecycle persists nothing.
 */
declare class SessionStore extends Service {
  private store;
  private counter;
  private readonly projections;
  /** Borrowed definitions for detached replay; contributions live until their registering fibers unload. */
  get messageProjections(): readonly SessionMessageProjection[];
  /**
   * Register one event interpreter for live creation, restore, and fork.
   * Disposing the contribution makes sessions that used it refuse further derivation.
   * @param projection - pure definition owned by the event's plugin.
   * @returns the fiber-owned disposer.
   * @throws when another definition already owns this event type.
   */
  registerMessageProjection(projection: SessionMessageProjection): () => Promise<void>;
  constructor(ctx: Context);
  /**
   * Create a session owned by the calling fiber: disposing that fiber stops
   * event notification and removes the session from the store. `options.seed`
   * populates the session with a copy of those events (replay/fork);
   * `options.meta` attaches creation metadata (validated absolute `cwd`, seed
   * and parent lineage, and delegation depth) as the immutable
   * {@link SessionHeader} (the store fills `version`/`id`/`createdAt`).
   *
   * For an agent whose session must be torn down IN ORDER with its loop (so the
   * loop's final events are published before the store attachment ends), do NOT use this
   * — fold the session lifecycle into the agent's own effect via
   * {@link prepare} + {@link enter} + {@link announce} (see
   * `dsh-agent-loop`'s creation transaction).
   *
   * @param id - the session id; omitted, the store mints `session-<n>`.
   * @param options - seed events and/or creation metadata for the header.
   * @returns the live session, already entered and announced.
   * @throws if a session with `id` already exists, metadata is not a plain
   *   lossless-JSON record with valid scalar fields, or `meta.cwd` is a
   *   non-absolute path (storage backends key directories off it).
   */
  create(id?: SessionId, options?: CreateSessionOptions): Session;
  /**
   * Build a session WITHOUT entering it into the store — validate the id/cwd and
   * construct the {@link Session} (with its immutable {@link SessionHeader}).
   * Pairs with {@link enter} + {@link announce}: a caller that owns a composite
   * `ctx.effect` (the agent factory) folds the session lifecycle into that ONE
   * effect so a fiber unload tears the session + agent down as a single ORDERED
   * chain rather than as racing sibling effects — which would remove the publication hooks
   * before the driver's closing events commit, dropping them.
   *
   * @param id - the session id; omitted, the store mints `session-<n>`.
   * @param options - seed events and/or creation metadata for the header. With
   *   `eventState`, every seed event is either independently owned or any
   *   shared value is deeply frozen; {@link Session.fromRestore} validates and
   *   adopts those values without copying or freezing them.
   * @returns the store-owned session, not yet entered and read-only until announced.
   * @throws if a session with `id` already exists, metadata is not a plain
   *   lossless-JSON record with valid scalar fields, or `meta.cwd` is a
   *   non-absolute path.
   */
  prepare(id?: SessionId, options?: PrepareSessionOptions): Session;
  /**
   * Enter a session into the store: install the module-private
   * append publication hooks and add it to the store. Writes remain disabled
   * until {@link announce} completes successfully. Returns the DETACH
   * disposer (hooks + store removal). Does NOT emit `session/created` —
   * the caller yields this disposer inside its effect and THEN calls
   * {@link announce}, so a throwing `session/created` listener rolls the attach
   * back instead of leaking it.
   *
   * Re-checks the id for a duplicate: `prepare` and `enter` are public
   * cross-package primitives and a caller may interleave arbitrary work (or
   * another create) between them, so a stale prepared session must NOT overwrite
   * a live store entry of the same id — its detach disposer would later delete
   * the REAL session. The {@link create} convenience and the agent factory call
   * the two back-to-back so they never trip this, but the public API cannot
   * assume that.
   *
   * @param session - an unentered session; independent instances become store-owned.
   * @returns the detach disposer (publication hooks + store removal). When called from
   *   a synchronous `session/created` listener, removal and disposal wait until
   *   that creation dispatch unwinds.
   * @throws if a session with this id is already in the store.
   */
  enter(session: Session): () => void;
  /** Remove one exact entered session and emit its paired disposal when announced. */
  private detachEntered;
  /** Emit `session/created` exactly once for an {@link enter}ed session (with
   * the carrier {@link enter} captured). Separate from {@link enter} so the
   * caller can yield the detach disposer first (rollback safety — see
   * {@link enter}). The Session remains read-only throughout synchronous
   * dispatch; successful completion enables appends. A failed announcement
   * leaves it read-only and cannot be retried.
   * @param session - the entered session to announce to listeners.
   * @throws if the session is not live or its announcement already began,
   *   including a reentrant call from a creation listener. */
  announce(session: Session): void;
  /** Emit the paired teardown notification with per-listener containment. */
  private emitDisposed;
  /**
   * Dispatch the awaited `session/flush` durability checkpoint for `session`,
   * with the carrier captured at {@link enter}. THE flush entry point: the
   * store owns the carrier, so callers (the checkpoint policy's per-request
   * barrier, goal-round-driver's idle checkpoint, teardown drains, and consumers
   * that flush themselves before reading storage) must come through here
   * rather than dispatch a raw `ctx.parallel('session/flush', …)` — one owner
   * and one spelling.
   * @param session - the session whose buffered events must reach durable storage.
   * @returns whether at least one durability listener participated, after every
   *   listener has settled successfully.
   * @throws the first registered listener failure after every listener settles.
   */
  flush(session: Session): Promise<boolean>;
  /** Return the exact live entry; detached/prepared objects reject. */
  private liveEntryFor;
  /**
   * Look up a live session.
   * @param id - the session id to look up.
   * @returns the session, or undefined when no live session has that id.
   */
  get(id: SessionId): Session | undefined;
  /**
   * All live sessions, in creation order.
   * @returns a fresh array; mutating it does not affect the store.
   */
  list(): Session[];
  /**
   * Create an independent live session from an exact prefix of a live source.
   * `boundary` is an inclusive source event seq; omitted means the source's
   * current last event. An open tail receives synthetic tool results and
   * step/turn closers with the forked cause. Closed steps and turns remain
   * unchanged, including any failed tool calls already missing results.
   * `inheritedEventCount` counts only copied source events, excluding these closers.
   *
   * @param source - Live source session object or id.
   * @param boundary - Inclusive source event seq to fork through; omitted means
   *   the source's current last event, and omitted on an empty source forks an
   *   empty child.
   * @param childSessionId - Optional child session id; omitted delegates to
   *   `SessionStore`'s id policy.
   * @returns The created live child session.
   */
  fork(source: SessionForkSource, boundary?: SessionSeq, childSessionId?: SessionId): Session;
  private _forkBoundary;
  private _resolveForkSource;
}
interface ToolStart {
  start: number;
  day: string;
  name?: string;
  transport?: true;
}
interface ActivityState {
  days: Record<string, ActivityDay>;
  model?: string;
  provider?: string;
  stepStart?: number;
  lastTurn?: number;
  toolStarts?: Record<string, ToolStart | undefined>;
  skillCalls?: string[];
  /** Leading fork-inherited events: their day buckets belong to the parent. */
  seedCut?: number;
}
export declare function applyActivity(state: ActivityState, event: SessionEvent): ActivityState;
export declare function createActivityState(seedCut?: number): ActivityState;
interface StoredHeaderTool {
  name: string;
  tokens: number;
  description?: string;
  plugin?: string;
  schema?: unknown;
}
interface StoredHeaderRecord {
  seq: number;
  time: number;
  system?: string;
  systemTokens?: number;
  tools: StoredHeaderTool[];
}
interface HeadersState {
  headers: StoredHeaderRecord[];
}
interface CommandStateRecord extends CommandRecord {
  call?: string;
}
type JobStateRecord = JobRecord;
interface TimelineEvent {
  type: string;
  seq: number;
  time: number;
  data?: Record<string, unknown>;
  surfaceOp?: unknown;
}
interface AgentAlias {
  catalogName?: string;
  memberName?: string;
  catalogLabel?: string;
}
interface TimelineState {
  surface: SurfaceNode[];
  sums: Record<Category, number>;
  assistantReasoning: number;
  assistantAnswerTokens: number;
  assistantCallTokens: number;
  systemTokens: number;
  systems?: SystemPromptNode[];
  toolsTokens: number;
  model?: string;
  provider?: string;
  reasoningEffort?: string;
  lastModel?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  requests: SlimRequestRecord[];
  turnRuns?: number;
  totals?: CumulativeTotals;
  events: ContextEventRecord[];
  archived: SurfaceNode[];
  cost?: SessionCostUsage;
  generatedReasoning?: number;
  generatedAnswerTokens?: number;
  generatedCallTokens?: number;
  humanInputs?: number;
  answers?: number;
  lastUser?: string;
  archiveFloor?: number;
  detailRev?: number;
  timing?: TimingTotals;
  /** Leading fork-inherited events: surfaced in the panel, never billed to this session. */
  seedCut?: number;
  stepStart?: {
    time: number;
    firstToken?: number;
  };
  stepWaits?: {
    start: number;
    end: number;
  }[];
  stepApprovals?: Record<string, number>;
  stepRequestSeq?: number;
  stepBeats?: number[];
  stepBeatsFull?: boolean;
  spans: TimingSpan[];
  stepSpans?: TimingSpan[];
  callNames: Record<string, {
    name: string;
    start: number;
    argsRaw?: string;
    transport?: true;
  }>;
  pendingShadowedSeqs?: number[];
  pendingShadowEventSeq?: number;
  fileOps: FileOpRecord[];
  fileOpsFloor?: number;
  commands: CommandStateRecord[];
  commandsFloor?: number;
  commandStats?: CommandStats;
  jobs?: JobStateRecord[];
  toolTally?: Record<string, number>;
  programTally?: Record<string, number>;
  commandCalls?: string[];
  commandCallsOverflow?: boolean;
  agents?: Record<string, AgentAlias>;
  /** Subagent sessions whose settle notice reported an error. */
  failedAgents?: Record<string, boolean>;
  pendingCodeCmds?: Record<string, CommandStateRecord[]>;
  pendingCodeOps?: Record<string, FileOpRecord[]>;
  pendingCodeStarts?: Record<string, number>;
}
interface CumulativeTotals {
  turns: number;
  steps: number;
  injects: number;
  compactions: number;
  prunes: number;
  skills: Record<string, true>;
  lastTurn?: number;
}
export declare function createTimelineState(seedCut?: number): TimelineState;
declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    contextTimeline: ContextTimeline;
    contextHeaders: ContextHeaders;
    contextActivity: ContextActivity;
  }
  interface SessionProjectionStateMap {
    contextTimeline: TimelineState;
    contextHeaders: HeadersState;
    contextActivity: ActivityState;
  }
}
type Category = 'user' | 'inject' | 'skill' | 'assistant' | 'tool';
interface SystemPromptNode {
  seq: number;
  time: number;
  tokens: number;
}
interface TimelineCounts {
  turns: number;
  steps: number;
  injects: number;
  compactions: number;
  prunes: number;
  skills?: number;
}
interface TimelineLast {
  seq: number;
  total: number;
  prompt?: number;
}
interface ActivityTally {
  n: number;
  last: number;
}
interface ActivityDay {
  tokens: number;
  requests: number;
  cost?: SessionCostUsage;
  turns?: number;
  toolCalls?: number;
  toolsMs?: number;
  wallMs?: number;
  skills?: Record<string, ActivityTally>;
  tools?: Record<string, ActivityTally>;
  cmds?: Record<string, ActivityTally>;
}
interface ContextActivity {
  days: Record<string, ActivityDay>;
}
type DefaultGranularity = 'step' | 'turn';
type DefaultTrendMode = 'total' | 'delta';
type DefaultDeltaBase = 'step' | 'turn';
type DefaultFileSort = 'count' | 'lines' | 'latest' | 'path' | 'name';
type DefaultToolSort = 'size' | 'count' | 'name';
type DefaultPlacement = 'show' | 'hide';
type InsightsEntry = 'show' | 'hide';
type DefaultDurationCurve = 'show' | 'hide';
type OverviewAutoSteps = 'off' | '100' | '200' | '300';
type DefaultOverviewRange = 'today' | '7d' | '30d';
type FleetTab = 'show' | 'hide';
type StatsSection = 'show' | 'hide';
interface PluginSettings {
  defaultPlacement: DefaultPlacement;
  defaultGranularity: DefaultGranularity;
  defaultTrendMode: DefaultTrendMode;
  defaultDeltaBase: DefaultDeltaBase;
  defaultToolSort: DefaultToolSort;
  defaultFileSort: DefaultFileSort;
  insightsEntry: InsightsEntry;
  defaultDurationCurve: DefaultDurationCurve;
  overviewAutoSteps: OverviewAutoSteps;
  defaultOverviewRange: DefaultOverviewRange;
  fleetTab: FleetTab;
  statsSection: StatsSection;
  statsDock: StatsSection;
  promptPrefix: string;
  promptSuffix: string;
}
interface SurfaceNodeWindow {
  nodes: SurfaceNode[];
  droppedNodes: number;
  archive: SurfaceNode[];
  surfaceFloor?: number;
  archiveFloor?: number;
}
interface Snapshot extends SurfaceNodeWindow {
  ok: boolean;
  cwd?: string;
  unsupported?: {
    current: string;
    minimum: string;
  };
  model?: string;
  provider?: string;
  reasoningEffort?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  current: {
    system: number;
    tools: number;
    user: number;
    inject: number;
    skill: number;
    assistant: number;
    assistantReasoning?: number;
    assistantAnswerTokens?: number;
    assistantCallTokens?: number;
    tool: number;
    total: number;
  };
  images?: number;
  generatedReasoning?: number;
  generatedAnswerTokens?: number;
  generatedCallTokens?: number;
  toolCalls?: number;
  toolTally?: Record<string, number>;
  programTally?: Record<string, number>;
  humanInputs?: number;
  answers?: number;
  lastUser?: string;
  counts?: TimelineCounts;
  last?: TimelineLast;
  detailRev?: number;
  /** Subagent sessions whose settle notice reported an error. */
  failedAgents?: Record<string, boolean>;
  requests: RequestRecord[];
  events: ContextEventRecord[];
  cost?: SessionCostUsage;
  timing?: TimingTotals;
  systems?: SystemPromptNode[];
  fileOps?: FileOpRecord[];
  fileOpsFloor?: number;
  commands?: CommandRecord[];
  commandsFloor?: number;
  commandStats?: CommandStats;
  jobs?: JobRecord[];
  spans?: TimingSpan[];
}
type CommandStatus = 'running' | 'completed' | 'failed' | 'killed';
interface CommandRecord {
  seq: number;
  resultSeq?: number;
  time: number;
  tool: string;
  cmd?: string;
  cmdTruncated?: true;
  description?: string;
  cwd?: string;
  timeoutMs?: number;
  background?: true;
  sandbox?: string;
  codeMode?: true;
  parent?: number;
  turn?: number;
  step?: number;
  start: number;
  end?: number;
  status: CommandStatus;
  exit?: number;
  exitInferred?: true;
  signal?: string;
  timedOut?: true;
  stopped?: true;
  denied?: true;
  err: boolean;
  outChars?: number;
  outTruncated?: true;
  stderr?: true;
  derived?: true;
  gone?: number;
}
interface CommandStats {
  runs: number;
  failed: number;
  ms: number;
  bg: number;
}
type JobStatus = CommandStatus;
interface JobRecord {
  id: string;
  seq: number;
  kind: string;
  label?: string;
  start: number;
  end?: number;
  status: JobStatus;
  detail?: string;
  cause?: string;
  background?: true;
  returned?: true;
  turn?: number;
  step?: number;
  /** Host state only: the tool call that registered this job. Stripped from the wire. */
  call?: string;
}
interface FileOpRecord {
  seq: number;
  path: string;
  kind: 'read' | 'write' | 'search';
  tool: string;
  time?: number;
  err: boolean;
  added: number;
  removed: number;
  detail?: string;
  hits?: number;
  read?: {
    start: number;
    count: number;
  } | {
    count: number;
    est: true;
  };
  parent?: number;
  program?: string;
  pattern?: true;
  gone?: number;
}
type ContextTimeline = Snapshot;
interface TimingSpan {
  kind: 'ttft' | 'reasoning' | 'text' | 'toolarg' | 'tools' | 'other';
  start: number;
  end: number;
}
interface CostBucketTotals {
  uncached: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
}
interface ToolTimingTotals {
  calls: number;
  ms: number;
}
interface TimingTotals {
  wallMs: number;
  ttftMs: number;
  genMs: number;
  reasoningMs?: number;
  reasoningBlocks?: number;
  textMs?: number;
  textBlocks?: number;
  toolArgMs?: number;
  toolArgBlocks?: number;
  speedTokens?: number;
  speedMs?: number;
  calls: number;
  toolsMs: number;
  toolBusyMs?: number;
  idleMs?: number;
  toolCalls: number;
  tools: Record<string, ToolTimingTotals>;
}
interface CostModelUsage {
  peak?: CostBucketTotals;
  off?: CostBucketTotals;
}
interface SessionCostUsage {
  [provider: string]: {
    [model: string]: CostModelUsage;
  };
}
interface SurfaceNode {
  seq: number;
  time?: number;
  cat: Category;
  tokens: number;
  reasoning?: number;
  answerTokens?: number;
  callTokens?: number;
  imgs?: number;
  gone?: number;
  form?: string;
  name?: string;
  text?: string;
  tool?: string;
  err?: boolean;
  skill?: string;
  calls?: string[];
  agent?: string;
}
interface SlimRequestRecord {
  turn?: number;
  step?: number;
  time: number;
  seq: number;
  total: number;
  prompt?: number;
  activeMs?: number;
}
interface RequestRecord extends SlimRequestRecord {
  system: number;
  tools: number;
  user: number;
  inject: number;
  assistant: number;
  tool: number;
  skill?: number;
  cacheRead?: number;
  output?: number;
  stepCount?: number;
  net?: number;
}
interface ContextEventRecord {
  seq: number;
  time: number;
  kind: 'compaction' | 'prune' | 'inject' | 'model' | 'mode';
  form?: string;
  tokens?: number;
  grossTokens?: number;
  count?: number;
  sub?: string;
  name?: string;
  agent?: string;
  detail?: string;
  from?: string;
  to?: string;
  fromTurn?: number;
  fromStep?: number;
  turn?: number;
  step?: number;
}
interface HeaderTool {
  name: string;
  tokens: number;
  plugin?: string;
}
interface HeaderRecord {
  seq: number;
  time: number;
  systemTokens?: number;
  tools: HeaderTool[];
}
interface ContextHeaders {
  headers: HeaderRecord[];
}
export declare const DEFAULT_BOUNDS: {
  maxRequestSteps: number;
  maxKeptTurns: number;
  maxEvents: number;
  maxNodes: number;
  maxArchiveNodes: number;
  maxFileOps: number;
  maxCommands: number;
  maxCommandChars: number;
};
type FoldBounds = typeof DEFAULT_BOUNDS & {
  headOnly?: boolean;
};
type Config$1 = Partial<FoldBounds> & Partial<PluginSettings>;
declare const Config$1: Schema<Schemastery.ObjectS<NoInfer<{
  maxRequestSteps: Schema<number, number, "defined">;
  maxKeptTurns: Schema<number, number, "defined">;
  maxEvents: Schema<number, number, "defined">;
  maxNodes: Schema<number, number, "defined">;
  maxArchiveNodes: Schema<number, number, "defined">;
  maxFileOps: Schema<number, number, "defined">;
  maxCommands: Schema<number, number, "defined">;
  maxCommandChars: Schema<number, number, "defined">;
  defaultPlacement: Schema<"show" | "hide" | "all" | "tab" | "sidebar", "show" | "hide" | "all" | "tab" | "sidebar", "defined">;
  defaultGranularity: Schema<"step" | "turn", "step" | "turn", "defined">;
  defaultTrendMode: Schema<"total" | "delta", "total" | "delta", "defined">;
  defaultDeltaBase: Schema<"step" | "turn", "step" | "turn", "defined">;
  defaultToolSort: Schema<"size" | "count" | "name", "size" | "count" | "name", "defined">;
  defaultFileSort: Schema<"count" | "name" | "lines" | "latest" | "path", "count" | "name" | "lines" | "latest" | "path", "defined">;
  insightsEntry: Schema<"show" | "hide", "show" | "hide", "defined">;
  defaultDurationCurve: Schema<"show" | "hide", "show" | "hide", "defined">;
  overviewAutoSteps: Schema<"100" | "200" | "300" | "off", "100" | "200" | "300" | "off", "defined">;
  defaultOverviewRange: Schema<"today" | "7d" | "30d", "today" | "7d" | "30d", "defined">;
  fleetTab: Schema<"show" | "hide", "show" | "hide", "defined">;
  statsSection: Schema<"show" | "hide", "show" | "hide", "defined">;
  statsDock: Schema<"show" | "hide", "show" | "hide", "defined">;
  promptPrefix: Schema<string, string, "defined">;
  promptSuffix: Schema<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
  maxRequestSteps: Schema<number, number, "defined">;
  maxKeptTurns: Schema<number, number, "defined">;
  maxEvents: Schema<number, number, "defined">;
  maxNodes: Schema<number, number, "defined">;
  maxArchiveNodes: Schema<number, number, "defined">;
  maxFileOps: Schema<number, number, "defined">;
  maxCommands: Schema<number, number, "defined">;
  maxCommandChars: Schema<number, number, "defined">;
  defaultPlacement: Schema<"show" | "hide" | "all" | "tab" | "sidebar", "show" | "hide" | "all" | "tab" | "sidebar", "defined">;
  defaultGranularity: Schema<"step" | "turn", "step" | "turn", "defined">;
  defaultTrendMode: Schema<"total" | "delta", "total" | "delta", "defined">;
  defaultDeltaBase: Schema<"step" | "turn", "step" | "turn", "defined">;
  defaultToolSort: Schema<"size" | "count" | "name", "size" | "count" | "name", "defined">;
  defaultFileSort: Schema<"count" | "name" | "lines" | "latest" | "path", "count" | "name" | "lines" | "latest" | "path", "defined">;
  insightsEntry: Schema<"show" | "hide", "show" | "hide", "defined">;
  defaultDurationCurve: Schema<"show" | "hide", "show" | "hide", "defined">;
  overviewAutoSteps: Schema<"100" | "200" | "300" | "off", "100" | "200" | "300" | "off", "defined">;
  defaultOverviewRange: Schema<"today" | "7d" | "30d", "today" | "7d" | "30d", "defined">;
  fleetTab: Schema<"show" | "hide", "show" | "hide", "defined">;
  statsSection: Schema<"show" | "hide", "show" | "hide", "defined">;
  statsDock: Schema<"show" | "hide", "show" | "hide", "defined">;
  promptPrefix: Schema<string, string, "defined">;
  promptSuffix: Schema<string, string, "defined">;
}>>, "plain">;
type FoldPort = Pick<MessagePort, 'on' | 'postMessage'>;
export declare function startFoldWorkerChannel(port?: FoldPort | null): void;
type ResolveUrl = (specifier: string) => string;
/**
 * The version the last {@link detectHarnessVersion} call settled on, so routes
 * and diagnostics can report what the guard actually sees instead of guessing.
 */
export declare function detectedHarnessVersion(): string | undefined;
export declare function detectHarnessVersion(ctx: Context, resolveUrl?: ResolveUrl, pluginRoot?: string): string | undefined;
interface HostTimeline {
  current: Snapshot['current'] | null;
  total: number;
  contextWindow?: number;
  maxOutputTokens?: number;
  model?: string;
  turns: number;
  steps?: number;
  timing?: TimingTotals;
  lastUser?: string;
  generatedReasoning?: number;
  generatedAnswerTokens?: number;
  generatedCallTokens?: number;
}
interface HostSession {
  id: string;
  title: string;
  cwd?: string;
  updatedAt: number;
  blank: boolean;
  parentSession?: string;
  origin?: 'subagent';
  timeline: HostTimeline | null;
  activity: ContextActivity | null;
  signature: string;
}
interface CacheFileInfo {
  size: number;
  mtimeMs: number;
}
interface CacheFs {
  stat(path: string): Promise<CacheFileInfo>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  rm?(path: string): Promise<void>;
}
interface DurableIdentity {
  path: string;
  sizeBytes: number;
  mtimeMs: number;
}
interface CachedSession {
  session: HostSession;
  identity: DurableIdentity | null;
}
interface OverviewCacheLoad {
  sessions: Map<string, HostSession>;
  identities: Map<string, DurableIdentity | null>;
  rebuild: Set<string>;
}
interface OverviewCacheRefresh {
  identities: Map<string, DurableIdentity | null>;
  changed: Set<string>;
}
interface StatHost {
  stat?(id: string): Promise<unknown>;
}
interface OverviewCacheOptions {
  path?: string;
  fs?: CacheFs;
  now?: () => number;
  debounceMs?: number;
  statConcurrency?: number;
  captureConcurrency?: number;
  maxEntries?: number;
  maxBytes?: number;
}
/** `replace` rewrites the cache as the caller's complete set; `merge` overlays. */
type CacheSaveMode = 'merge' | 'replace';
interface OverviewCache {
  load(currentIds: ReadonlySet<string>, known?: ReadonlyMap<string, DurableIdentity | null>): Promise<OverviewCacheLoad>;
  refresh(currentIds: ReadonlySet<string>, known: ReadonlyMap<string, DurableIdentity | null>): Promise<OverviewCacheRefresh>;
  capture(ids: readonly string[], host: StatHost): Promise<Map<string, DurableIdentity | null>>;
  save(records: readonly CachedSession[], mode?: CacheSaveMode): void;
  flush(): Promise<void>;
  dispose(): void;
}
export declare function createOverviewCache(options?: OverviewCacheOptions): OverviewCache;
export declare function applyTimeline(state: TimelineState, event: TimelineEvent, bounds: FoldBounds): TimelineState;
/**
 * SSH facts shared by the host route and the client card.
 *
 * Two independent sources feed the card: the aliases the user configured in
 * `~/.ssh/config`, and the hosts this conversation actually reached with
 * ssh/scp/sftp. Both parsers are dependency free so the host can reuse them
 * without pulling React into a route module.
 */
interface SshHostConfig {
  alias: string;
  hostName: string;
  user: string;
  port: string;
}
interface SshConnection {
  host: string;
  ok: boolean;
  count: number;
  turn: number;
  seq: number;
}
/**
 * Concrete host aliases of an OpenSSH client configuration.
 *
 * Wildcard and negated entries describe a rule rather than a destination, so
 * they never reach the card; options other than HostName/User/Port are ignored
 * (keys and identities are never read). As in OpenSSH, the first value of an
 * option wins.
 */
export declare function parseSshConfig(text: unknown): SshHostConfig[];
/**
 * Destinations of the ssh, scp and sftp invocations in one shell command.
 *
 * Only the command text is read: no process is started and no host is
 * contacted. Options that take a value are skipped so `-p 2222 host` and
 * `-p2222 host` both name `host`; for scp only `host:path` operands count.
 */
export declare function sshDestinations(command: unknown): string[];
/** `user@host:port` for a configured alias, or '' when it adds nothing. */
export declare function sshEndpoint(config: SshHostConfig | undefined): string;
/** A non-interactive check the user can paste in the shell that owns the keys. */
export declare function sshCheckCommand(host: string, shell?: 'posix' | 'powershell'): string;
/** Connection details for a remote client that takes host, port and user itself. */
export declare function sshConnectDetails(host: string, config: SshHostConfig | undefined, userFallback: string): string;
interface SshPayload {
  client: string;
  hosts: SshHostConfig[];
  connections: SshConnection[];
  events: number;
}
interface SshRouteOptions {
  /** Overridden by the tests to prove each request re-reads the configuration. */
  readConfig?: () => SshHostConfig[];
  readClient?: () => string;
}
export declare function registerSshRoute(ctx: Context, options?: SshRouteOptions): void;
export declare const name = "tongji";
export declare const inject: string[];
export declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
  maxRequestSteps: Schema<number, number, "defined">;
  maxKeptTurns: Schema<number, number, "defined">;
  maxEvents: Schema<number, number, "defined">;
  maxNodes: Schema<number, number, "defined">;
  maxArchiveNodes: Schema<number, number, "defined">;
  maxFileOps: Schema<number, number, "defined">;
  maxCommands: Schema<number, number, "defined">;
  maxCommandChars: Schema<number, number, "defined">;
  defaultPlacement: Schema<"show" | "hide" | "all" | "tab" | "sidebar", "show" | "hide" | "all" | "tab" | "sidebar", "defined">;
  defaultGranularity: Schema<"step" | "turn", "step" | "turn", "defined">;
  defaultTrendMode: Schema<"total" | "delta", "total" | "delta", "defined">;
  defaultDeltaBase: Schema<"step" | "turn", "step" | "turn", "defined">;
  defaultToolSort: Schema<"size" | "count" | "name", "size" | "count" | "name", "defined">;
  defaultFileSort: Schema<"count" | "name" | "lines" | "latest" | "path", "count" | "name" | "lines" | "latest" | "path", "defined">;
  insightsEntry: Schema<"show" | "hide", "show" | "hide", "defined">;
  defaultDurationCurve: Schema<"show" | "hide", "show" | "hide", "defined">;
  overviewAutoSteps: Schema<"100" | "200" | "300" | "off", "100" | "200" | "300" | "off", "defined">;
  defaultOverviewRange: Schema<"today" | "7d" | "30d", "today" | "7d" | "30d", "defined">;
  fleetTab: Schema<"show" | "hide", "show" | "hide", "defined">;
  statsSection: Schema<"show" | "hide", "show" | "hide", "defined">;
  statsDock: Schema<"show" | "hide", "show" | "hide", "defined">;
  promptPrefix: Schema<string, string, "defined">;
  promptSuffix: Schema<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
  maxRequestSteps: Schema<number, number, "defined">;
  maxKeptTurns: Schema<number, number, "defined">;
  maxEvents: Schema<number, number, "defined">;
  maxNodes: Schema<number, number, "defined">;
  maxArchiveNodes: Schema<number, number, "defined">;
  maxFileOps: Schema<number, number, "defined">;
  maxCommands: Schema<number, number, "defined">;
  maxCommandChars: Schema<number, number, "defined">;
  defaultPlacement: Schema<"show" | "hide" | "all" | "tab" | "sidebar", "show" | "hide" | "all" | "tab" | "sidebar", "defined">;
  defaultGranularity: Schema<"step" | "turn", "step" | "turn", "defined">;
  defaultTrendMode: Schema<"total" | "delta", "total" | "delta", "defined">;
  defaultDeltaBase: Schema<"step" | "turn", "step" | "turn", "defined">;
  defaultToolSort: Schema<"size" | "count" | "name", "size" | "count" | "name", "defined">;
  defaultFileSort: Schema<"count" | "name" | "lines" | "latest" | "path", "count" | "name" | "lines" | "latest" | "path", "defined">;
  insightsEntry: Schema<"show" | "hide", "show" | "hide", "defined">;
  defaultDurationCurve: Schema<"show" | "hide", "show" | "hide", "defined">;
  overviewAutoSteps: Schema<"100" | "200" | "300" | "off", "100" | "200" | "300" | "off", "defined">;
  defaultOverviewRange: Schema<"today" | "7d" | "30d", "today" | "7d" | "30d", "defined">;
  fleetTab: Schema<"show" | "hide", "show" | "hide", "defined">;
  statsSection: Schema<"show" | "hide", "show" | "hide", "defined">;
  statsDock: Schema<"show" | "hide", "show" | "hide", "defined">;
  promptPrefix: Schema<string, string, "defined">;
  promptSuffix: Schema<string, string, "defined">;
}>>, "plain">;
export declare function apply(ctx: Context, config: Config$1): void;
export type { CacheSaveMode, SshPayload };