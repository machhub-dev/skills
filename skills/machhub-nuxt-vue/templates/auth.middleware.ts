// filepath: middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
    const auth = useAuth();

    await auth.checkAuth();

    if (!auth.isAuthenticated.value) {
        return navigateTo({
            path: '/login',
            query: { redirect: to.fullPath }
        });
    }
});
