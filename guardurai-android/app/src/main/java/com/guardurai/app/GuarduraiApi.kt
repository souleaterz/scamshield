package com.guardurai.app

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Result of a scam check, mirroring the web app's verdict. */
data class Verdict(
    val riskLevel: String, // "safe" | "suspicious" | "likely_scam"
    val summary: String,
    val detectedType: String,
    val confidence: Int,
    val redFlags: List<String>,
    val advice: List<String>,
)

/** Thin client over the existing Guardurai backend. Anonymous = free tier. */
object GuarduraiApi {
    private const val BASE_URL = "https://guardurai.com"

    private val client = OkHttpClient.Builder()
        .callTimeout(45, TimeUnit.SECONDS)
        .build()

    private val JSON = "application/json; charset=utf-8".toMediaType()

    suspend fun check(text: String): Result<Verdict> = withContext(Dispatchers.IO) {
        try {
            val payload = JSONObject().put("text", text).toString().toRequestBody(JSON)
            val request = Request.Builder()
                .url("$BASE_URL/api/analyze")
                .post(payload)
                .build()

            client.newCall(request).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()

                if (resp.code == 429) {
                    return@withContext Result.failure(
                        Exception("You've used today's free checks. Upgrade at guardurai.com for unlimited."),
                    )
                }
                if (!resp.isSuccessful) {
                    val msg = runCatching { JSONObject(raw).optString("error") }.getOrNull()
                    return@withContext Result.failure(
                        Exception(msg?.ifBlank { "Something went wrong." } ?: "Something went wrong."),
                    )
                }

                val json = JSONObject(raw)
                Result.success(
                    Verdict(
                        riskLevel = json.optString("risk_level", "suspicious"),
                        summary = json.optString("summary", ""),
                        detectedType = json.optString("detected_type", ""),
                        confidence = json.optInt("confidence", 0),
                        redFlags = json.optJSONArray("red_flags").toStringList(),
                        advice = json.optJSONArray("advice").toStringList(),
                    ),
                )
            }
        } catch (_: Exception) {
            Result.failure(Exception("Couldn't reach Guardurai. Check your connection."))
        }
    }

    private fun JSONArray?.toStringList(): List<String> {
        if (this == null) return emptyList()
        return (0 until length()).map { optString(it) }.filter { it.isNotBlank() }
    }
}
