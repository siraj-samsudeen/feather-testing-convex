/**
 * TanStack React Query integration for feather-testing-convex.
 *
 * Provides test providers and render helpers for components that use
 * @tanstack/react-query + @convex-dev/react-query bridge (i.e.,
 * `useQuery(convexQuery(api.app.getUser, {}))` pattern).
 *
 * Architecture:
 *   - Custom queryFn intercepts ["convexQuery", funcName, args] keys
 *   - Uses makeFunctionReference to reconstruct FunctionReference from string name
 *   - Calls testClient.query(funcRef, args) on the convex-test in-memory backend
 *   - Auto-invalidates all convex queries after mutations/actions for reactive updates
 */
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { ConvexProvider, ConvexProviderWithAuth } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { QueryFunctionContext } from "@tanstack/react-query";
import type { ConvexTestClient } from "./ConvexTestProvider.js";

// @ts-expect-error — internal path not in package exports; works at runtime via bundler
import { ConvexAuthActionsContext } from "@convex-dev/auth/dist/react/client.js";

// ---------------------------------------------------------------------------
// queryFn / QueryClient factories
// ---------------------------------------------------------------------------

/**
 * Creates a TanStack Query `queryFn` that routes Convex query keys to the
 * convex-test in-memory backend.
 *
 * Handles:
 *   - ["convexQuery", funcName, args] → testClient.query(makeFunctionReference(funcName), args)
 *   - ["convexAction", funcName, args] → testClient.action(makeFunctionReference(funcName), args)
 *   - Other keys → returns undefined (non-Convex queries are not intercepted)
 */
export function createTestQueryFn(client: ConvexTestClient) {
  return async (context: QueryFunctionContext) => {
    const [tag, funcName, args] = context.queryKey;

    if (tag === "convexQuery") {
      const funcRef = makeFunctionReference<"query">(funcName as string);
      return await client.query(funcRef, args ?? {});
    }

    if (tag === "convexAction") {
      const funcRef = makeFunctionReference<"action">(funcName as string);
      return await client.action(funcRef, args ?? {});
    }

    // Non-Convex query key — don't intercept.
    // If the query has its own queryFn, TanStack Query will use that instead
    // of this global default. This fallback only fires for queries without
    // their own queryFn AND with a non-Convex key — likely a user error.
    return undefined;
  };
}

/**
 * Creates a TanStack QueryClient pre-configured for testing with Convex.
 *
 * - Default queryFn routes convexQuery/convexAction keys to the test backend
 * - retry: false (don't retry in tests)
 * - gcTime: Infinity (prevent garbage collection during test)
 */
export function createTestQueryClient(client: ConvexTestClient) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        queryFn: createTestQueryFn(client),
      },
    },
  });
}

// ---------------------------------------------------------------------------
// ConvexTestQueryProvider
// ---------------------------------------------------------------------------

/**
 * Wraps children in QueryClientProvider + ConvexProvider for testing components
 * that use @tanstack/react-query with @convex-dev/react-query bridge.
 *
 * Key features:
 * - useQuery(convexQuery(...)) receives real data from the convex-test backend
 * - useConvexMutation/useConvexAction work through ConvexProvider
 * - After mutations/actions, all convex queries are auto-invalidated so the UI updates
 *
 * When `authenticated` is provided, uses ConvexProviderWithAuth instead of ConvexProvider,
 * enabling <Authenticated>, <Unauthenticated>, and useConvexAuth() in tested components.
 */
export function ConvexTestQueryProvider({
  client,
  children,
  authenticated,
}: {
  client: ConvexTestClient;
  children: ReactNode;
  authenticated?: boolean;
}) {
  // Stable QueryClient — created once per mount, not on every render.
  const queryClientRef = useRef<QueryClient>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = createTestQueryClient(client);
  }
  const queryClient = queryClientRef.current;

  // Two-level cache for watchQuery (same as ConvexTestProvider).
  // Needed for components that use convex/react's useQuery directly.
  const cache = useRef(new Map<unknown, Map<string, unknown>>());

  // Ref for authenticated so fakeClient.setAuth reads the latest value
  // without needing authenticated in the useMemo dependency array.
  const authenticatedRef = useRef(authenticated);
  authenticatedRef.current = authenticated;

  // Build a fakeClient with auto-invalidation on mutations/actions.
  // We construct our own fakeClient rather than using ConvexTestProvider
  // because we need to wrap mutation/action to trigger query invalidation.
  const fakeClient = useMemo(() => {
    const invalidateConvexQueries = () => {
      queryClient.invalidateQueries({ queryKey: ["convexQuery"] });
    };

    return {
      watchQuery: (query: unknown, args: unknown) => {
        let queryCache = cache.current.get(query);
        if (!queryCache) {
          queryCache = new Map<string, unknown>();
          cache.current.set(query, queryCache);
        }
        const argsKey = JSON.stringify(args ?? {});
        let subscriber: (() => void) | null = null;

        client.query(query as never, args ?? {}).then((result) => {
          queryCache.set(argsKey, result);
          subscriber?.();
        });

        return {
          localQueryResult: () => queryCache.get(argsKey),
          onUpdate: (cb: () => void) => {
            subscriber = cb;
            return () => { subscriber = null; };
          },
        };
      },

      mutation: async (mutation: unknown, args: unknown) => {
        const result = await client.mutation(mutation as never, args ?? {});
        invalidateConvexQueries();
        return result;
      },

      action: async (action: unknown, args: unknown) => {
        const result = await client.action(action as never, args ?? {});
        invalidateConvexQueries();
        return result;
      },

      // Synchronous — safe because ConvexProviderWithAuth calls setAuth
      // inside useEffect (committed state).
      setAuth: (_fetchToken: unknown, onChange: (isAuth: boolean) => void) => {
        onChange(authenticatedRef.current ?? false);
      },
      clearAuth: () => {},
    };
  }, [client, queryClient]);

  // Stable fetchAccessToken — prevents setAuth/clearAuth cycling.
  const fetchAccessToken = useCallback(async () => null, []);

  // Only changes when authenticated changes.
  const useAuth = useCallback(() => ({
    isLoading: false,
    isAuthenticated: authenticated ?? false,
    fetchAccessToken,
  }), [authenticated, fetchAccessToken]);

  const convexProvider = authenticated === undefined
    ? (
      <ConvexProvider client={fakeClient as never}>
        {children}
      </ConvexProvider>
    )
    : (
      <ConvexProviderWithAuth client={fakeClient as never} useAuth={useAuth}>
        {children}
      </ConvexProviderWithAuth>
    );

  return (
    <QueryClientProvider client={queryClient}>
      {convexProvider}
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// ConvexTestQueryAuthProvider
// ---------------------------------------------------------------------------

/**
 * Auth-aware version of ConvexTestQueryProvider.
 *
 * Provides both auth state (ConvexProviderWithAuth) and auth actions
 * (ConvexAuthActionsContext), so components using <Authenticated>,
 * <Unauthenticated>, useConvexAuth(), and useAuthActions() all work.
 *
 * signIn/signOut are pure React state toggles — no backend calls.
 */
export function ConvexTestQueryAuthProvider({
  client,
  children,
  authenticated = true,
  signInError,
}: {
  client: ConvexTestClient;
  children: ReactNode;
  authenticated?: boolean;
  /** When set, signIn() rejects with this error instead of toggling state. */
  signInError?: Error;
}) {
  const [isAuth, setIsAuth] = useState(authenticated);

  const actions = {
    signIn: async () => {
      if (signInError) throw signInError;
      setIsAuth(true);
      return { signingIn: false as const };
    },
    signOut: async () => {
      setIsAuth(false);
    },
  };

  return (
    <ConvexTestQueryProvider client={client} authenticated={isAuth}>
      <ConvexAuthActionsContext.Provider value={actions}>
        {children}
      </ConvexAuthActionsContext.Provider>
    </ConvexTestQueryProvider>
  );
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

/**
 * Render a React element with QueryClientProvider + ConvexProvider.
 * For components using @tanstack/react-query with @convex-dev/react-query.
 */
export function renderWithConvexQuery(ui: ReactElement, client: unknown) {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ConvexTestQueryProvider client={client as ConvexTestClient}>
        {children}
      </ConvexTestQueryProvider>
    ),
  });
}

/**
 * Render a React element with QueryClientProvider + ConvexProviderWithAuth +
 * ConvexAuthActionsContext. For components using @tanstack/react-query with
 * @convex-dev/react-query that also need auth (useAuthActions, <Authenticated>, etc.).
 */
export function renderWithConvexQueryAuth(
  ui: ReactElement,
  client: unknown,
  options?: { authenticated?: boolean; signInError?: Error },
) {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ConvexTestQueryAuthProvider
        client={client as ConvexTestClient}
        authenticated={options?.authenticated ?? true}
        signInError={options?.signInError}
      >
        {children}
      </ConvexTestQueryAuthProvider>
    ),
  });
}
