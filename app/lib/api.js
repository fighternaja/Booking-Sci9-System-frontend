/**
 * Centralized API configuration and helper functions
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const getAuthHeaders = (token) => {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
};

// Helper to handle public/storage URLs if needed (e.g. images)
export const getStorageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    // Clean up the path: remove leading slashes and 'storage/' prefix if present
    // This handles cases where the backend might already prepend 'storage/'
    const cleanPath = path.replace(/^\/+/, '').replace(/^storage\//, '');

    return `${API_URL}/storage/${cleanPath}`;
};
