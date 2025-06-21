import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Enhanced Firebase Service with API Key Management
 * Handles all Firebase Firestore operations including secure API key storage
 */
export class FirebaseService {
    /**
     * Validate user ID before making queries
     * @param {string} userId - User ID to validate
     * @throws {Error} If user ID is invalid
     */
    static validateUserId(userId) {
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
            throw new Error('Valid user ID is required');
        }
    }

    /**
     * Clean object of undefined values for Firebase
     * Firebase doesn't allow undefined values in documents
     * @param {object} obj - Object to clean
     * @returns {object} Clean object without undefined values
     */
    static cleanUndefinedValues(obj) {
        if (obj === null || obj === undefined) {
            return {};
        }

        if (typeof obj !== 'object' || obj instanceof Date || Array.isArray(obj)) {
            return obj;
        }

        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                if (value && typeof value === 'object' && value.constructor === Object) {
                    // Recursively clean nested objects
                    const cleanedNested = this.cleanUndefinedValues(value);
                    if (Object.keys(cleanedNested).length > 0) {
                        cleaned[key] = cleanedNested;
                    }
                } else {
                    cleaned[key] = value;
                }
            }
        }
        return cleaned;
    }

    /**
     * Deep clean and validate data before saving to Firebase
     * @param {object} data - Data to clean and validate
     * @returns {object} Clean data safe for Firebase
     */
    static deepCleanForFirebase(data) {
        // First pass: remove undefined values
        let cleaned = this.cleanUndefinedValues(data);

        // Second pass: ensure all values are valid for Firebase
        const validateValue = (value) => {
            if (value === undefined) {
                return null; // Convert undefined to null
            }
            if (value === '') {
                return null; // Convert empty strings to null if desired, or keep as ''
            }
            if (typeof value === 'object' && value !== null && !(value instanceof Date) && !Array.isArray(value)) {
                // Recursively clean nested objects
                const nestedCleaned = {};
                for (const [key, val] of Object.entries(value)) {
                    const cleanedVal = validateValue(val);
                    if (cleanedVal !== undefined) {
                        nestedCleaned[key] = cleanedVal;
                    }
                }
                return Object.keys(nestedCleaned).length > 0 ? nestedCleaned : null;
            }
            return value;
        };

        const finalCleaned = {};
        for (const [key, value] of Object.entries(cleaned)) {
            const cleanedValue = validateValue(value);
            if (cleanedValue !== undefined) {
                finalCleaned[key] = cleanedValue;
            }
        }

        return finalCleaned;
    }

    /**
     * Create or update a document in a collection
     * @param {string} collectionName - Firestore collection name
     * @param {string} userId - User ID for data isolation
     * @param {object} data - Document data
     * @param {string|null} existingDocId - ID of existing document to update
     * @returns {Promise<string>} Document ID
     */
    static async saveOrUpdateDocument(collectionName, userId, data, existingDocId = null) {
        try {
            this.validateUserId(userId);

            // Deep clean the data to ensure no undefined values
            const cleanData = this.deepCleanForFirebase(data);

            // Ensure essential fields are present
            const docData = {
                ...cleanData,
                userId,
                updatedAt: new Date()
            };

            // Final safety check - remove any undefined values that might have slipped through
            const safeDocData = {};
            for (const [key, value] of Object.entries(docData)) {
                if (value !== undefined) {
                    safeDocData[key] = value;
                }
            }

            if (existingDocId) {
                await updateDoc(doc(db, collectionName, existingDocId), safeDocData);
                return existingDocId;
            } else {
                const docRef = await addDoc(collection(db, collectionName), {
                    ...safeDocData,
                    createdAt: new Date()
                });
                return docRef.id;
            }
        } catch (error) {
            console.error(`Error saving/updating document in ${collectionName}:`, error);

            // Log more details for debugging
            console.error('Data that failed to save:', {
                collectionName,
                userId,
                data,
                existingDocId
            });

            throw new Error(`Failed to save data: ${error.message}`);
        }
    }

    /**
     * Get all documents for a user from a collection
     * @param {string} collectionName - Firestore collection name
     * @param {string} userId - User ID for data isolation
     * @param {string|null} orderByField - Field to order by
     * @param {string} orderDirection - 'asc' or 'desc'
     * @param {number|null} limitCount - Limit number of documents
     * @returns {Promise<Array>} Array of documents with IDs
     */
    static async getUserDocuments(
        collectionName,
        userId,
        orderByField = null,
        orderDirection = 'desc',
        limitCount = null
    ) {
        try {
            this.validateUserId(userId);

            let q = query(collection(db, collectionName), where('userId', '==', userId));

            if (orderByField) {
                q = query(q, orderBy(orderByField, orderDirection));
            }

            if (limitCount) {
                q = query(q, limit(limitCount));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Convert Firestore timestamps to JavaScript dates
                    createdAt: data.createdAt?.toDate?.() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                    date: data.date?.toDate?.() || data.date
                };
            });
        } catch (error) {
            console.error(`Error fetching documents from ${collectionName}:`, error);
            throw new Error(`Failed to fetch data: ${error.message}`);
        }
    }

    /**
     * Get a single document by ID
     * @param {string} collectionName - Firestore collection name
     * @param {string} docId - Document ID
     * @returns {Promise<object|null>} Document data or null if not found
     */
    static async getDocumentById(collectionName, docId) {
        try {
            if (!docId || typeof docId !== 'string') {
                throw new Error('Valid document ID is required');
            }

            const docRef = doc(db, collectionName, docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                    date: data.date?.toDate?.() || data.date
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching document ${docId} from ${collectionName}:`, error);
            throw new Error(`Failed to fetch document: ${error.message}`);
        }
    }

    /**
     * Delete a document from a collection
     * @param {string} collectionName - Firestore collection name
     * @param {string} docId - Document ID to delete
     * @returns {Promise<void>}
     */
    static async deleteDocument(collectionName, docId) {
        try {
            if (!docId || typeof docId !== 'string') {
                throw new Error('Valid document ID is required');
            }

            await deleteDoc(doc(db, collectionName, docId));
        } catch (error) {
            console.error(`Error deleting document ${docId} from ${collectionName}:`, error);
            throw new Error(`Failed to delete document: ${error.message}`);
        }
    }

    /**
     * Get documents with pagination
     * @param {string} collectionName - Firestore collection name
     * @param {string} userId - User ID for data isolation
     * @param {string} orderByField - Field to order by
     * @param {number} limitCount - Number of documents per page
     * @param {object|null} lastDoc - Last document from previous page
     * @returns {Promise<object>} Documents and pagination info
     */
    static async getPaginatedDocuments(collectionName, userId, orderByField, limitCount, lastDoc = null) {
        try {
            this.validateUserId(userId);

            let q = query(
                collection(db, collectionName),
                where('userId', '==', userId),
                orderBy(orderByField, 'desc'),
                limit(limitCount)
            );

            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            const documents = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                    date: data.date?.toDate?.() || data.date
                };
            });

            return {
                documents,
                lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
                hasMore: snapshot.docs.length === limitCount
            };
        } catch (error) {
            console.error(`Error fetching paginated documents from ${collectionName}:`, error);
            throw new Error(`Failed to fetch paginated data: ${error.message}`);
        }
    }

    /**
     * Get documents within a date range
     * @param {string} collectionName - Firestore collection name
     * @param {string} userId - User ID for data isolation
     * @param {Date} startDate - Start date for range
     * @param {Date} endDate - End date for range
     * @param {string} dateField - Field name containing the date
     * @returns {Promise<Array>} Array of documents within date range
     */
    static async getDocumentsByDateRange(collectionName, userId, startDate, endDate, dateField = 'date') {
        try {
            this.validateUserId(userId);

            const q = query(
                collection(db, collectionName),
                where('userId', '==', userId),
                where(dateField, '>=', startDate),
                where(dateField, '<=', endDate),
                orderBy(dateField, 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                    date: data.date?.toDate?.() || data.date
                };
            });
        } catch (error) {
            console.error(`Error fetching documents by date range from ${collectionName}:`, error);
            throw new Error(`Failed to fetch data by date range: ${error.message}`);
        }
    }

    /**
     * Batch delete multiple documents
     * @param {string} collectionName - Firestore collection name
     * @param {Array<string>} docIds - Array of document IDs to delete
     * @returns {Promise<void>}
     */
    static async batchDeleteDocuments(collectionName, docIds) {
        try {
            if (!Array.isArray(docIds) || docIds.length === 0) {
                throw new Error('Valid array of document IDs is required');
            }

            const deletePromises = docIds.map(docId =>
                this.deleteDocument(collectionName, docId)
            );
            await Promise.all(deletePromises);
        } catch (error) {
            console.error(`Error batch deleting documents from ${collectionName}:`, error);
            throw new Error(`Failed to batch delete documents: ${error.message}`);
        }
    }

    /**
     * Search documents by field value
     * @param {string} collectionName - Firestore collection name
     * @param {string} userId - User ID for data isolation
     * @param {string} fieldName - Field to search in
     * @param {any} searchValue - Value to search for
     * @returns {Promise<Array>} Array of matching documents
     */
    static async searchDocuments(collectionName, userId, fieldName, searchValue) {
        try {
            this.validateUserId(userId);

            const q = query(
                collection(db, collectionName),
                where('userId', '==', userId),
                where(fieldName, '==', searchValue)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                    date: data.date?.toDate?.() || data.date
                };
            });
        } catch (error) {
            console.error(`Error searching documents in ${collectionName}:`, error);
            throw new Error(`Failed to search documents: ${error.message}`);
        }
    }

    // ============================================
    // API KEY MANAGEMENT METHODS
    // ============================================

    /**
     * Validate OpenAI API key format
     * @param {string} apiKey - API key to validate
     * @returns {boolean} True if format is valid
     */
    static validateOpenAIApiKey(apiKey) {
        return typeof apiKey === 'string' && apiKey.startsWith('sk-') && apiKey.length > 20;
    }

    /**
     * Simple encryption for API keys (client-side)
     * Note: This is basic obfuscation, not true encryption
     * For production, consider server-side encryption
     * @param {string} text - Text to encrypt
     * @param {string} key - Encryption key (user ID)
     * @returns {string} Encrypted text
     */
    static simpleEncrypt(text, key) {
        try {
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            return btoa(result); // Base64 encode
        } catch (error) {
            console.error('Error encrypting API key:', error);
            throw new Error('Failed to encrypt API key');
        }
    }

    /**
     * Simple decryption for API keys (client-side)
     * @param {string} encryptedText - Encrypted text
     * @param {string} key - Decryption key (user ID)
     * @returns {string} Decrypted text
     */
    static simpleDecrypt(encryptedText, key) {
        try {
            const decoded = atob(encryptedText); // Base64 decode
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            return result;
        } catch (error) {
            console.error('Error decrypting API key:', error);
            return '';
        }
    }

    /**
     * Save or update user's OpenAI API key
     * @param {string} userId - User ID
     * @param {string} apiKey - OpenAI API key
     * @param {string|null} label - Optional label for the API key
     * @returns {Promise<string>} Document ID
     */
    static async saveApiKey(userId, apiKey, label = 'Default') {
        try {
            this.validateUserId(userId);

            if (!this.validateOpenAIApiKey(apiKey)) {
                throw new Error('Invalid OpenAI API key format');
            }

            // Check if user already has an API key with this label
            const existingKeys = await this.getUserDocuments('apiKeys', userId);
            const existingKey = existingKeys.find(key => key.label === label);

            // Encrypt the API key using user ID as the key
            const encryptedKey = this.simpleEncrypt(apiKey, userId);

            // Create masked version for display
            const maskedKey = `${apiKey.substring(0, 7)}${'•'.repeat(apiKey.length - 11)}${apiKey.substring(apiKey.length - 4)}`;

            const keyData = {
                encryptedKey,
                maskedKey,
                label: label || 'Default',
                keyType: 'openai',
                isActive: true,
                lastUsed: null,
                usageCount: 0
            };

            const docId = await this.saveOrUpdateDocument(
                'apiKeys',
                userId,
                keyData,
                existingKey?.id || null
            );

            return docId;
        } catch (error) {
            console.error('Error saving API key:', error);
            throw new Error(`Failed to save API key: ${error.message}`);
        }
    }

    /**
     * Get user's OpenAI API key
     * @param {string} userId - User ID
     * @param {string} label - API key label (default: 'Default')
     * @returns {Promise<string|null>} Decrypted API key or null if not found
     */
    static async getApiKey(userId, label = 'Default') {
        try {
            this.validateUserId(userId);

            const apiKeys = await this.getUserDocuments('apiKeys', userId);
            const keyDoc = apiKeys.find(key => key.label === label && key.isActive);

            if (!keyDoc) {
                return null;
            }

            // Decrypt the API key
            const decryptedKey = this.simpleDecrypt(keyDoc.encryptedKey, userId);

            // Update last used timestamp (async, don't wait for it)
            this.updateApiKeyUsage(keyDoc.id).catch(error => {
                console.warn('Failed to update API key usage:', error);
            });

            return decryptedKey;
        } catch (error) {
            console.error('Error retrieving API key:', error);
            throw new Error(`Failed to retrieve API key: ${error.message}`);
        }
    }

    /**
     * Get all API keys for a user (without decrypting)
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of API key documents (encrypted)
     */
    static async getUserApiKeys(userId) {
        try {
            this.validateUserId(userId);

            const apiKeys = await this.getUserDocuments('apiKeys', userId, 'createdAt', 'desc');

            // Return keys without the encrypted data for security
            return apiKeys.map(key => ({
                id: key.id,
                label: key.label,
                keyType: key.keyType,
                isActive: key.isActive,
                lastUsed: key.lastUsed,
                usageCount: key.usageCount,
                createdAt: key.createdAt,
                updatedAt: key.updatedAt,
                // Use stored masked key or create a default one
                maskedKey: key.maskedKey || '••••••••••••••••'
            }));
        } catch (error) {
            console.error('Error fetching user API keys:', error);
            throw new Error(`Failed to fetch API keys: ${error.message}`);
        }
    }

    /**
     * Update API key usage statistics
     * @param {string} keyDocId - API key document ID
     * @returns {Promise<void>}
     */
    static async updateApiKeyUsage(keyDocId) {
        try {
            if (!keyDocId || typeof keyDocId !== 'string') {
                throw new Error('Valid key document ID is required');
            }

            const keyDoc = await this.getDocumentById('apiKeys', keyDocId);
            if (keyDoc) {
                const updateData = {
                    lastUsed: new Date(),
                    usageCount: (keyDoc.usageCount || 0) + 1,
                    updatedAt: new Date()
                };

                await updateDoc(doc(db, 'apiKeys', keyDocId), updateData);
            }
        } catch (error) {
            console.error('Error updating API key usage:', error);
            // Don't throw error for usage tracking failures
        }
    }

    /**
     * Delete an API key
     * @param {string} keyDocId - API key document ID
     * @returns {Promise<void>}
     */
    static async deleteApiKey(keyDocId) {
        try {
            if (!keyDocId || typeof keyDocId !== 'string') {
                throw new Error('Valid key document ID is required');
            }

            await this.deleteDocument('apiKeys', keyDocId);
        } catch (error) {
            console.error('Error deleting API key:', error);
            throw new Error(`Failed to delete API key: ${error.message}`);
        }
    }

    /**
     * Deactivate an API key (soft delete)
     * @param {string} keyDocId - API key document ID
     * @returns {Promise<void>}
     */
    static async deactivateApiKey(keyDocId) {
        try {
            if (!keyDocId || typeof keyDocId !== 'string') {
                throw new Error('Valid key document ID is required');
            }

            const updateData = {
                isActive: false,
                updatedAt: new Date()
            };

            await updateDoc(doc(db, 'apiKeys', keyDocId), updateData);
        } catch (error) {
            console.error('Error deactivating API key:', error);
            throw new Error(`Failed to deactivate API key: ${error.message}`);
        }
    }

    /**
     * Test API key validity by making a simple API call
     * @param {string} apiKey - API key to test
     * @returns {Promise<boolean>} True if key is valid
     */
    static async testApiKey(apiKey) {
        try {
            if (!this.validateOpenAIApiKey(apiKey)) {
                return false;
            }

            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error testing API key:', error);
            return false;
        }
    }
}