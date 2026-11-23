export type Token<T = unknown> = (new (...args: never[]) => T) & {
  readonly inject?: InjectSpec;
  readonly name: string;
};

export type InjectSpec = { readonly [key: string]: Token };

/**
 * Per-app composition root. Root tokens (`DbService`, `AuthService`) are
 * `bind`ed; everything else is constructed from `static inject`.
 */
export class Container {
  private readonly instances = new Map<Token, unknown>();
  private readonly factories = new Map<Token, (container: Container) => unknown>();

  bind<T>({ token, factory }: { token: Token<T>; factory: (container: Container) => T }) {
    this.factories.set(token, factory);
  }

  resolve<T>({ token }: { token: Token<T> }): T {
    const cached = this.instances.get(token);
    if (cached !== undefined) return cached as T;

    const factory = this.factories.get(token);
    const instance = factory ? (factory(this) as T) : this.constructFromInject({ token });
    this.instances.set(token, instance);
    return instance;
  }

  private constructFromInject<T>({ token }: { token: Token<T> }): T {
    const spec = token.inject;
    if (spec === undefined) {
      if (token.length > 0) {
        throw new Error(`No provider for ${token.name}`);
      }
      return instantiate({ token });
    }

    const deps: Record<string, unknown> = {};
    for (const key of Object.keys(spec)) {
      const dep = spec[key];
      if (dep === undefined) {
        throw new Error(`Missing inject token ${token.name}.${key}`);
      }
      deps[key] = this.resolve({ token: dep });
    }
    return instantiate({ token, deps });
  }
}

function instantiate<T>({ token, deps }: { token: Token<T>; deps?: object }): T {
  if (deps === undefined) {
    return new (token as unknown as new () => T)();
  }
  return new (token as unknown as new (deps: object) => T)(deps);
}
