import AuthGuard from "@buildingai/ui/components/auth/auth-guard";
import GlobalError from "@buildingai/ui/components/exception/global-error";
import NotFoundPage from "@buildingai/ui/components/exception/not-found-page";
import ExtensionConsoleLayout from "@buildingai/ui/layouts/extension/console/index";
import type { ExtensionMenuItem } from "@buildingai/ui/layouts/extension/console/types";
import { useEffect, useRef } from "react";
import {
    createBrowserRouter,
    Outlet,
    type RouteObject,
    useLocation,
    useNavigate,
} from "react-router-dom";

/** Strip extension URL prefix so parent /apps/:id routes receive relative paths only. */
export function normalizeExtensionPathForParent(pathname: string, base: string): string {
    const baseWithSlash = base.startsWith("/") ? base : `/${base}`;
    const normalizedBase = baseWithSlash.replace(/\/+$/, "");
    const path = pathname.replace(/\/+$/, "") || "/";
    if (path === normalizedBase) {
        return "/";
    }
    if (path.startsWith(`${normalizedBase}/`)) {
        const rest = path.slice(normalizedBase.length);
        return rest || "/";
    }
    return pathname;
}

export type RouteOption = {
    base: string;
    routes?: RouteObject[];
    /** Routes placed inside the console layout (admin pages) */
    consoleRoutes?: RouteObject[];
    /** Static menu items rendered in the console sidebar */
    consoleMenus?: ExtensionMenuItem[];
    /** Extension identifier for fetching extension details */
    identifier?: string;
};

/**
 * Syncs extension iframe route changes with the parent window.
 * - Extension → Parent: posts navigation message on route change
 * - Parent → Extension: listens for navigation commands from parent
 */
function createParentFrameSync(base: string) {
    return function ParentFrameSync() {
    const location = useLocation();
    const navigate = useNavigate();
    const isParentNavigatingRef = useRef(false);

    // Extension → Parent: notify parent of route changes
    useEffect(() => {
        if (window.parent === window) return;
        if (isParentNavigatingRef.current) {
            isParentNavigatingRef.current = false;
            return;
        }

        window.parent.postMessage(
            {
                type: "extension-navigate",
                path: normalizeExtensionPathForParent(location.pathname, base),
                search: location.search,
                hash: location.hash,
            },
            "*",
        );
    }, [location.pathname, location.search, location.hash, base]);

    // Parent → Extension: handle browser back/forward from parent
    useEffect(() => {
        if (window.parent === window) return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type !== "parent-navigate") return;

            const rawPath = event.data.path ?? "/";
            const search = event.data.search ?? "";
            const hash = event.data.hash ?? "";
            const pathname =
                rawPath === "/" || rawPath === ""
                    ? "/"
                    : rawPath.startsWith("/")
                      ? rawPath
                      : `/${rawPath}`;
            const targetPath = normalizeExtensionPathForParent(location.pathname, base);

            if (pathname !== targetPath || search !== location.search || hash !== location.hash) {
                isParentNavigatingRef.current = true;
                navigate({ pathname, search, hash }, { replace: true });
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [location.pathname, location.search, location.hash, navigate, base]);

    return <Outlet />;
    };
}

function createExtensionNotFoundPage(base: string) {
    return function ExtensionNotFoundPage() {
    const location = useLocation();

    useEffect(() => {
        if (window.parent === window) return;

        const path = normalizeExtensionPathForParent(location.pathname, base);
        // Only notify parent for non-root 404s (parent maps root to /apps/:id which must not 404).
        if (path === "/" || path === "") {
            return;
        }

        window.parent.postMessage(
            {
                type: "extension-not-found",
                path,
                search: location.search,
                hash: location.hash,
            },
            "*",
        );
    }, [location.pathname, location.search, location.hash, base]);

    return <NotFoundPage />;
    };
}

/**
 * Build a standard application router from a simplified route option.
 * Encapsulates the common route skeleton so each project only needs
 * to provide its own pages, guards, and business routes.
 */
export function defineRouteOption(option: RouteOption) {
    const { routes = [], consoleRoutes = [], consoleMenus = [], identifier } = option;
    const ParentFrameSync = createParentFrameSync(option.base);
    const ExtensionNotFoundPage = createExtensionNotFoundPage(option.base);

    return createBrowserRouter(
        [
            {
                element: <ParentFrameSync />,
                errorElement: <GlobalError />,
                children: [
                    ...routes,
                    {
                        element: <AuthGuard />,
                        children: [
                            {
                                path: "/console/*",
                                element: (
                                    <ExtensionConsoleLayout
                                        menus={consoleMenus}
                                        identifier={identifier}
                                    />
                                ),
                                errorElement: (
                                    <ExtensionConsoleLayout
                                        menus={consoleMenus}
                                        identifier={identifier}
                                    >
                                        <GlobalError />
                                    </ExtensionConsoleLayout>
                                ),
                                children: consoleRoutes,
                            },
                        ],
                    },
                    {
                        path: "*",
                        element: <ExtensionNotFoundPage />,
                    },
                ],
            },
        ],
        {
            basename: option.base,
        },
    );
}
