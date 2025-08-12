// js/auth/AuthService.js
// Authentication Service - Firebase/Demo Mode

import { AppConfig } from '../config/AppConfig.js';

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

export class AuthService {
    constructor(authInstance) {
        if (!authInstance) {
            throw new Error("AuthService requires a Firebase auth instance.");
        }
        this.auth = authInstance;
        this.currentUser = null;
        this.onStateChangeCallbacks = [];
        this._listenToAuthState();
    }

    _listenToAuthState() {
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            this.onStateChangeCallbacks.forEach(cb => cb(user));
        });
    }
    
    onAuthStateChanged(callback) {
        this.onStateChangeCallbacks.push(callback);
        // The listener is already active, so we might need to immediately call back
        // if the user is already authenticated.
        if (this.currentUser) {
            callback(this.currentUser);
        }
    }
    
    async signIn(email, password) {
        try {
            const result = await signInWithEmailAndPassword(this.auth, email, password);
            console.log('✅ User signed in:', result.user.email);
            return result;
        } catch (error) {
            console.error('❌ Sign in error:', error);
            throw new Error(this.getAuthErrorMessage(error.code));
        }
    }
    
    async signUp(email, password) {
        try {
            const result = await createUserWithEmailAndPassword(this.auth, email, password);
            console.log('✅ User created:', result.user.email);
            return result;
        } catch (error) {
            console.error('❌ Sign up error:', error);
            throw new Error(this.getAuthErrorMessage(error.code));
        }
    }
    
    async signOut() {
        try {
            await signOut(this.auth);
            console.log('✅ User signed out');
        } catch (error) {
            console.error('❌ Sign out error:', error);
            throw error;
        }
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/too-many-requests': 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.',
        };
        
        return errorMessages[errorCode] || 'An unknown authentication error occurred.';
    }

    renderAuthUI(container) {
        container.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50">
                <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
                    <h2 class="text-2xl font-bold mb-6 text-center">Welcome</h2>
                    <div id="auth-error" class="hidden text-red-500 text-sm mb-4 p-3 bg-red-100 rounded"></div>
                    <form id="loginForm" class="space-y-4">
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
                            <input type="email" id="email" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                            <input type="password" id="password" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <div>
                            <button type="submit" id="signInBtn" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                                Sign In
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const form = container.querySelector('#loginForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = form.email.value;
            const password = form.password.value;
            const errorDiv = container.querySelector('#auth-error');

            errorDiv.classList.add('hidden');
            errorDiv.textContent = '';

            try {
                await this.signIn(email, password);
                // onAuthStateChanged will handle UI switch
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
            }
        });
    }
}