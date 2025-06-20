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
 * Firebase Service - Single Responsibility Principle
 * Handles all Firebase Firestore operations
 */
export class FirebaseService {
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
            const docData = {
                ...data,
                userId,
                updatedAt: new Date()
            };

            if (existingDocId) {
                await updateDoc(doc(db, collectionName, existingDocId), docData);
                return existingDocId;
            } else {
                const docRef = await addDoc(collection(db, collectionName), {
                    ...docData,
                    createdAt: new Date()
                });
                return docRef.id;
            }
        } catch (error) {
            console.error(`Error saving/updating document in ${collectionName}:`, error);
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
            let q = query(collection(db, collectionName), where('userId', '==', userId));

            if (orderByField) {
                q = query(q, orderBy(orderByField, orderDirection));
            }

            if (limitCount) {
                q = query(q, limit(limitCount));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convert Firestore timestamps to JavaScript dates
                createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
                updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
                date: doc.data().date?.toDate?.() || doc.data().date
            }));
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
            const documents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
                updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
                date: doc.data().date?.toDate?.() || doc.data().date
            }));

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
            const q = query(
                collection(db, collectionName),
                where('userId', '==', userId),
                where(dateField, '>=', startDate),
                where(dateField, '<=', endDate),
                orderBy(dateField, 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
                updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
                date: doc.data().date?.toDate?.() || doc.data().date
            }));
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
            const q = query(
                collection(db, collectionName),
                where('userId', '==', userId),
                where(fieldName, '==', searchValue)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
                updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
                date: doc.data().date?.toDate?.() || doc.data().date
            }));
        } catch (error) {
            console.error(`Error searching documents in ${collectionName}:`, error);
            throw new Error(`Failed to search documents: ${error.message}`);
        }
    }
}