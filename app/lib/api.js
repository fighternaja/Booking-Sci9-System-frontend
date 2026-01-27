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
    return `${API_URL}/storage/${path}`.replace(/([^:]\/)\/+/g, "$1"); // Normalize slashes
};
