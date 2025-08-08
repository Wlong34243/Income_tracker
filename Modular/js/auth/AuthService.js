// js/auth/AuthService.js
// Authentication Service - Firebase/Demo Mode

import { AppConfig } from '../config/AppConfig.js';

export class AuthService {
    constructor() {
        this.currentUser = null;
        this.onStateChangeCallbacks = [];
        this.auth = null;
        this.db = null;
        
        this.initializeAuth();
    }
    
    initializeAuth() {
        if (AppConfig.DEMO_MODE) {
            this.setupDemoAuth();
        } else {
            this.setupFirebaseAuth();
        }
    }
    
    setupDemoAuth() {
        console.log('🔧 Initializing Demo Authentication');
        
        this.auth = {
            onAuthStateChanged: (callback) => {
                setTimeout(() => {
                    const demoUser = { 
                        uid: 'demo-user', 
                        email: 'demo@example.com',
                        displayName: 'Demo User'
                    };
                    callback(demoUser);
                }, 100);
            },
            
            signInWithEmailAndPassword: (email, password) => {
                return Promise.resolve({ 
                    uid: 'demo-user', 
                    email: email,
                    displayName: 'Demo User'
                });
            },
            
            createUserWithEmailAndPassword: (email, password) => {
                return Promise.resolve({ 
                    uid: 'demo-user', 
                    email: email,
                    displayName: 'Demo User'
                });
            },
            
            signOut: () => {
                localStorage.clear();
                setTimeout(() => location.reload(), 100);
                return Promise.resolve();
            }
        };
    }
    
    setupFirebaseAuth() {
        console.log('🔧 Initializing Firebase Authentication');
        
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase not loaded. Please include Firebase SDK.');
        }
        
        firebase.initializeApp(AppConfig.FIREBASE_CONFIG);
        this.auth = firebase.auth();
        this.db = firebase.firestore();
    }
    
    onAuthStateChanged(callback) {
        this.onStateChangeCallbacks.push(callback);
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            callback(user);
        });
    }
    
    async signIn(email, password) {
        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            console.log('✅ User signed in:', result.user.email);
            return result;
        } catch (error) {
            console.error('❌ Sign in error:', error);
            throw new Error(this.getAuthErrorMessage(error.code));
        }
    }
    
    async signUp(email, password) {
        try {
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            console.log('✅ User created:', result.user.email);
            return result;
        } catch (error) {
            console.error('❌ Sign up error:', error);
            throw new Error(this.getAuthErrorMessage(error.code));
        }
    }
    
    async signOut() {
        try {
            await this.auth.signOut();
            console.log('✅ User signed out');
        } catch (error) {
            console.error('❌ Sign out error:', error);
            throw error;
        }
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getDatabase() {
        return this.db;
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