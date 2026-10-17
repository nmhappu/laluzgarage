package dev.appu.laluzgarage.data.sync

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query

/** The collections the app mirrors into the Firestore disk cache. */
object SyncCollections {
    const val SERVICE_RECORDS = "serviceRecords"
    const val VEHICLES = "vehicles"
    const val CUSTOMERS = "customers"
    const val PARTS = "parts"

    /** Newest N records streamed live; bounds read cost and parse time as history grows. */
    const val SERVICE_RECORD_LIMIT = 500L

    val all = listOf(SERVICE_RECORDS, VEHICLES, CUSTOMERS, PARTS)

    /**
     * The query behind each collection. Live listeners and sync fetches must share it: Firestore
     * caches results per query, so a different query would leave the listener cold when offline.
     */
    fun query(firestore: FirebaseFirestore, collection: String): Query = when (collection) {
        SERVICE_RECORDS -> firestore.collection(collection)
            .orderBy("date", Query.Direction.DESCENDING)
            .limit(SERVICE_RECORD_LIMIT)
        PARTS -> firestore.collection(collection).orderBy("name", Query.Direction.ASCENDING)
        else -> firestore.collection(collection)
    }
}
