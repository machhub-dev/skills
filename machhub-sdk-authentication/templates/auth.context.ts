// filepath: src/contexts/auth.context.ts
import { authService, type User } from '../services/auth.service';

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export class AuthContext {
    private state: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: true
    };

    private listeners: Array<(state: AuthState) => void> = [];

    /**
     * Initialize auth context
     */
    async initialize(): Promise<void> {
        this.setState({ isLoading: true });

        try {
            const user = await authService.getCurrentUser();
            this.setState({
                user,
                isAuthenticated: user !== null,
                isLoading: false
            });
        } catch (error) {
            console.error('Auth initialization failed:', error);
            this.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false
            });
        }
    }

    /**
     * Login
     */
    async login(username: string, password: string): Promise<void> {
        try {
            const user = await authService.login(username, password);
            this.setState({
                user,
                isAuthenticated: true,
                isLoading: false
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Logout
     */
    async logout(): Promise<void> {
        try {
            await authService.logout();
            this.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false
            });
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    /**
     * Get current state
     */
    getState(): AuthState {
        return { ...this.state };
    }

    /**
     * Subscribe to state changes
     */
    subscribe(listener: (state: AuthState) => void): () => void {
        this.listeners.push(listener);

        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Set state and notify listeners
     */
    private setState(updates: Partial<AuthState>): void {
        this.state = { ...this.state, ...updates };
        this.notifyListeners();
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }
}

export const authContext = new AuthContext();
