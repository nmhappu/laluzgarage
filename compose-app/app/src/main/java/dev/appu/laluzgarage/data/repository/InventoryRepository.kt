package dev.appu.laluzgarage.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import dev.appu.laluzgarage.data.model.Part
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InventoryRepository @Inject constructor(
    private val firestore: FirebaseFirestore
) {
    /**
     * Real-time stream of all inventory parts ordered by name ascending
     */
    fun partsFlow(): Flow<List<Part>> = callbackFlow {
        val query = firestore.collection("parts").orderBy("name", Query.Direction.ASCENDING)
        val registration = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    doc.toObject(Part::class.java)?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }

    suspend fun addPart(part: Part): String {
        val data = hashMapOf(
            "name" to part.name.trim().uppercase(),
            "category" to part.category.trim(),
            "price" to part.price,
            "stockQuantity" to part.stockQuantity,
            "minStockLevel" to part.minStockLevel,
            "location" to part.location.trim().uppercase(),
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        val docRef = firestore.collection("parts").add(data).await()
        return docRef.id
    }

    suspend fun updatePart(part: Part) {
        val data = hashMapOf<String, Any?>(
            "name" to part.name.trim().uppercase(),
            "category" to part.category.trim(),
            "price" to part.price,
            "stockQuantity" to part.stockQuantity,
            "minStockLevel" to part.minStockLevel,
            "location" to part.location.trim().uppercase(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        firestore.collection("parts").document(part.id).update(data).await()
    }

    suspend fun deletePart(partId: String) {
        firestore.collection("parts").document(partId).delete().await()
    }
}
