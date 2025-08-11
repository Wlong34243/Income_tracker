// js/auth/AuthService.js
// Authentication Service - Firebase/Demo Mode

import { AppConfig } from '../config/AppConfig.js';

import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from "firebase/auth";

export class AuthService {
    constructor() {
        this.currentUser = null;
        this.onStateChangeCallbacks = [];
        this.auth = getAuth();
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
            'auth/email-already-in-use': 'Email already registered',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/invalid-email': 'Invalid email address',
            'auth/too-many-requests': 'Too many failed attempts. Try again later.'
        };
        
        return errorMessages[errorCode] || 'Authentication error occurred';
    }
}